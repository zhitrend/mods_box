use crate::core::config;
use crate::core::conflict::ConflictStrategy;
use crate::core::installer::ModInstaller;
use crate::core::loader::ModLoader;
use crate::models::ModInfo;
use std::path::PathBuf;
use tauri::State;
use tokio::sync::Mutex;

pub struct AppState {
    pub mods: Mutex<Vec<ModInfo>>,
    pub game_dir: Mutex<Option<PathBuf>>,
    pub game_version: Mutex<Option<String>>,
}

#[tauri::command]
pub async fn install_mod(
    state: State<'_, AppState>,
    file_path: String,
    strategy: String,
) -> Result<ModInfo, String> {
    let game_dir = state.game_dir.lock().await.clone()
        .ok_or_else(|| "Game directory not configured".to_string())?;
    let game_version = state.game_version.lock().await.clone()
        .unwrap_or_else(|| "1.28.0.0".to_string());

    let conflict_strategy = match strategy.as_str() {
        "overwrite" => ConflictStrategy::Overwrite,
        "skip" => ConflictStrategy::Skip,
        "rename" => ConflictStrategy::Rename,
        "isolate" => ConflictStrategy::Isolate,
        _ => ConflictStrategy::SmartMerge,
    };

    let zip_path = PathBuf::from(&file_path);
    if !zip_path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let mod_info = ModInstaller::install_from_zip(
        &zip_path,
        &game_dir,
        &game_version,
        conflict_strategy,
        None,
    )
    .await
    .map_err(|e| e.to_string())?;

    let mut mods = state.mods.lock().await;
    mods.push(mod_info.clone());
    config::save_mods_db(&mods).await.map_err(|e| e.to_string())?;

    Ok(mod_info)
}

#[tauri::command]
pub async fn get_mods(state: State<'_, AppState>) -> Result<Vec<ModInfo>, String> {
    let mods = state.mods.lock().await;
    Ok(mods.clone())
}

#[tauri::command]
pub async fn toggle_mod(state: State<'_, AppState>, mod_id: String) -> Result<ModInfo, String> {
    let game_dir = state.game_dir.lock().await.clone()
        .ok_or_else(|| "Game directory not configured".to_string())?;
    let mut mods = state.mods.lock().await;

    let mod_idx = mods.iter().position(|m| m.id == mod_id)
        .ok_or_else(|| "Mod not found".to_string())?;
    let mod_info = &mods[mod_idx];

    if mod_info.enabled {
        ModLoader::disable_mod(mod_info, &game_dir)
            .await
            .map_err(|e| e.to_string())?;
    } else {
        ModLoader::enable_mod(mod_info, &game_dir)
            .await
            .map_err(|e| e.to_string())?;
    }

    mods[mod_idx].enabled = !mods[mod_idx].enabled;
    mods[mod_idx].status = if mods[mod_idx].enabled {
        crate::models::ModStatus::Enabled
    } else {
        crate::models::ModStatus::Disabled
    };

    let result = mods[mod_idx].clone();
    config::save_mods_db(&mods).await.map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
pub async fn uninstall_mod(state: State<'_, AppState>, mod_id: String) -> Result<(), String> {
    let game_dir = state.game_dir.lock().await.clone()
        .ok_or_else(|| "Game directory not configured".to_string())?;
    let mut mods = state.mods.lock().await;

    let mod_idx = mods.iter().position(|m| m.id == mod_id)
        .ok_or_else(|| "Mod not found".to_string())?;
    let mod_info = mods[mod_idx].clone();

    ModLoader::uninstall_mod(&mod_info, &game_dir)
        .await
        .map_err(|e| e.to_string())?;

    mods.remove(mod_idx);
    config::save_mods_db(&mods).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn batch_toggle_mods(
    state: State<'_, AppState>,
    mod_ids: Vec<String>,
    enable: bool,
) -> Result<Vec<ModInfo>, String> {
    let game_dir = state.game_dir.lock().await.clone()
        .ok_or_else(|| "Game directory not configured".to_string())?;
    let mut mods = state.mods.lock().await;
    let mut results = Vec::new();

    for mod_id in mod_ids {
        if let Some(mod_info) = mods.iter_mut().find(|m| m.id == mod_id) {
            if enable && !mod_info.enabled {
                ModLoader::enable_mod(mod_info, &game_dir).await.map_err(|e| e.to_string())?;
                mod_info.enabled = true;
                mod_info.status = crate::models::ModStatus::Enabled;
            } else if !enable && mod_info.enabled {
                ModLoader::disable_mod(mod_info, &game_dir).await.map_err(|e| e.to_string())?;
                mod_info.enabled = false;
                mod_info.status = crate::models::ModStatus::Disabled;
            }
            results.push(mod_info.clone());
        }
    }

    config::save_mods_db(&mods).await.map_err(|e| e.to_string())?;
    Ok(results)
}

#[tauri::command]
pub async fn get_mod_detail(state: State<'_, AppState>, mod_id: String) -> Result<ModInfo, String> {
    let mods = state.mods.lock().await;
    mods.iter()
        .find(|m| m.id == mod_id)
        .cloned()
        .ok_or_else(|| "Mod not found".to_string())
}

#[tauri::command]
pub async fn refresh_mods(state: State<'_, AppState>) -> Result<Vec<ModInfo>, String> {
    let mods = config::load_mods_db().await.map_err(|e| e.to_string())?;
    let mut current_mods = state.mods.lock().await;
    *current_mods = mods.clone();
    Ok(mods)
}
