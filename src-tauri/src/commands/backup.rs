use crate::error::{AppError, Result as AppResult};
use crate::models::BackupInfo;
use crate::utils::file;
use chrono::Local;
use std::path::PathBuf;
use tauri::State;
use uuid::Uuid;
use crate::commands::mod_manager::AppState;

const BACKUP_DIR: &str = "wot-mods-manager/backups";

fn get_backup_dir() -> AppResult<PathBuf> {
    let base = dirs_next::config_dir()
        .or_else(|| dirs_next::data_dir())
        .ok_or_else(|| AppError::Other("Cannot find config directory".to_string()))?;
    Ok(base.join(BACKUP_DIR))
}

#[tauri::command]
pub async fn create_backup(
    state: State<'_, AppState>,
    name: String,
    description: String,
) -> Result<BackupInfo, String> {
    let game_dir = state.game_dir.lock().await.clone()
        .ok_or_else(|| "Game directory not configured".to_string())?;
    let mods = state.mods.lock().await;

    let backup_dir = get_backup_dir().map_err(|e| e.to_string())?;
    let backup_id = Uuid::new_v4().to_string();
    let backup_path = backup_dir.join(&backup_id);
    file::ensure_dir(&backup_path).await.map_err(|e| e.to_string())?;

    let res_mods_dir = game_dir.join("res_mods");
    if res_mods_dir.exists() {
        let backup_res_mods = backup_path.join("res_mods");
        file::ensure_dir(&backup_res_mods).await.map_err(|e| e.to_string())?;
        copy_dir_recursive(&res_mods_dir, &backup_res_mods).await.map_err(|e| e.to_string())?;
    }

    let mod_list: Vec<String> = mods.iter().map(|m| m.id.clone()).collect();

    let backup_info = BackupInfo {
        id: backup_id,
        name,
        created_at: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        description,
        mod_list,
        size: 0,
        path: backup_path.clone(),
    };

    let info_path = backup_path.join("backup_info.json");
    let info_content = serde_json::to_string_pretty(&backup_info).map_err(|e| e.to_string())?;
    tokio::fs::write(&info_path, info_content).await.map_err(|e| e.to_string())?;

    Ok(backup_info)
}

async fn copy_dir_recursive(src: &PathBuf, dest: &PathBuf) -> AppResult<()> {
    if !src.exists() {
        return Ok(());
    }
    let mut entries = tokio::fs::read_dir(src).await.map_err(AppError::Io)?;
    while let Some(entry) = entries.next_entry().await.map_err(AppError::Io)? {
        let entry_path = entry.path();
        let relative = entry_path.strip_prefix(src).map_err(|e| AppError::Other(e.to_string()))?;
        let dest_path = dest.join(relative);

        if entry.file_type().await.map_err(AppError::Io)?.is_dir() {
            file::ensure_dir(&dest_path).await?;
            Box::pin(copy_dir_recursive(&entry_path, &dest_path)).await?;
        } else {
            tokio::fs::copy(&entry_path, &dest_path).await.map_err(AppError::Io)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn list_backups() -> Result<Vec<BackupInfo>, String> {
    let backup_dir = get_backup_dir().map_err(|e| e.to_string())?;
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    let mut backups = Vec::new();
    let mut entries = tokio::fs::read_dir(&backup_dir).await.map_err(|e| e.to_string())?;
    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        let info_path = entry.path().join("backup_info.json");
        if info_path.exists() {
            let content = tokio::fs::read_to_string(&info_path).await.map_err(|e| e.to_string())?;
            if let Ok(backup) = serde_json::from_str::<BackupInfo>(&content) {
                backups.push(backup);
            }
        }
    }

    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(backups)
}

#[tauri::command]
pub async fn restore_backup(
    state: State<'_, AppState>,
    backup_id: String,
) -> Result<(), String> {
    let game_dir = state.game_dir.lock().await.clone()
        .ok_or_else(|| "Game directory not configured".to_string())?;

    let backup_dir = get_backup_dir().map_err(|e| e.to_string())?;
    let backup_path = backup_dir.join(&backup_id);

    if !backup_path.exists() {
        return Err("Backup not found".to_string());
    }

    let backup_res_mods = backup_path.join("res_mods");
    let game_res_mods = game_dir.join("res_mods");

    if backup_res_mods.exists() && game_res_mods.exists() {
        tokio::fs::remove_dir_all(&game_res_mods).await.map_err(|e| e.to_string())?;
        copy_dir_recursive(&backup_res_mods, &game_res_mods).await.map_err(|e| e.to_string())?;
    }

    let info_path = backup_path.join("backup_info.json");
    if info_path.exists() {
        let content = tokio::fs::read_to_string(&info_path).await.map_err(|e| e.to_string())?;
        if let Ok(backup) = serde_json::from_str::<BackupInfo>(&content) {
            let mut mods = state.mods.lock().await;
            mods.retain(|m| backup.mod_list.contains(&m.id));
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_backup(backup_id: String) -> Result<(), String> {
    let backup_dir = get_backup_dir().map_err(|e| e.to_string())?;
    let backup_path = backup_dir.join(&backup_id);

    if backup_path.exists() {
        tokio::fs::remove_dir_all(&backup_path).await.map_err(|e| e.to_string())?;
    }

    Ok(())
}
