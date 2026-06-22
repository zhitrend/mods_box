use crate::core::conflict::{ConflictDetector, ConflictStrategy};
use crate::models::{ConflictInfo, ModFile};
use std::path::PathBuf;
use tauri::State;
use crate::commands::mod_manager::AppState;

#[tauri::command]
pub async fn detect_file_conflicts(
    state: State<'_, AppState>,
    file_path: String,
) -> Result<Vec<ConflictInfo>, String> {
    let game_dir = state.game_dir.lock().await.clone()
        .ok_or_else(|| "Game directory not configured".to_string())?;
    let mods = state.mods.lock().await;
    let game_ver = state.game_version.lock().await.clone().unwrap_or_else(|| "1.28.0.0".to_string());

    let zip_path = PathBuf::from(&file_path);
    if !zip_path.exists() {
        return Err("File not found".to_string());
    }

    let file = std::fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    let mut mod_files = Vec::new();
    for i in 0..archive.len() {
        let entry = archive.by_index(i).map_err(|e| e.to_string())?;
        if !entry.is_dir() {
            let relative_path = format!("res_mods/{}/{}",
                game_ver,
                entry.name().trim_start_matches("res_mods/"));
            mod_files.push(ModFile {
                relative_path,
                hash: String::new(),
                size: 0,
            });
        }
    }

    drop(archive);
    drop(mods);

    let conflicts = ConflictDetector::detect_conflicts(&game_dir, &mod_files, &[]);
    Ok(conflicts)
}

#[tauri::command]
pub async fn resolve_conflicts(
    state: State<'_, AppState>,
    conflicts: Vec<ConflictInfo>,
    strategy: String,
) -> Result<Vec<ConflictInfo>, String> {
    let conflict_strategy = match strategy.as_str() {
        "overwrite" => ConflictStrategy::Overwrite,
        "skip" => ConflictStrategy::Skip,
        "rename" => ConflictStrategy::Rename,
        "isolate" => ConflictStrategy::Isolate,
        _ => ConflictStrategy::SmartMerge,
    };

    let game_dir = state.game_dir.lock().await.clone()
        .ok_or_else(|| "Game directory not configured".to_string())?;

    let resolved = ConflictDetector::resolve_conflicts(
        &game_dir,
        &[],
        &conflicts,
        conflict_strategy,
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(resolved)
}
