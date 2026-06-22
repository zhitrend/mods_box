use crate::models::{GameConfig, GameRegion};
use crate::utils::registry;
use crate::core::config;
use std::path::PathBuf;
use tauri::State;
use crate::commands::mod_manager::AppState;

#[tauri::command]
pub async fn detect_game() -> Result<GameConfig, String> {
    let path = registry::detect_wot_path()
        .ok_or_else(|| "World of Tanks not found".to_string())?;

    let version = registry::detect_game_version(&path)
        .unwrap_or_else(|| "1.28.0.0".to_string());

    let res_mods_dir = registry::get_res_mods_dir(&path, &version);
    let mods_dir = registry::get_mods_dir(&path, &version);

    Ok(GameConfig {
        install_path: path,
        version,
        region: GameRegion::EU,
        mods_dir,
        res_mods_dir,
        auto_detect: true,
    })
}

#[tauri::command]
pub async fn set_game_path(
    state: State<'_, AppState>,
    path: String,
    region: String,
) -> Result<GameConfig, String> {
    let game_path = PathBuf::from(&path);
    if !game_path.exists() {
        return Err("Path does not exist".to_string());
    }

    let version = registry::detect_game_version(&game_path)
        .unwrap_or_else(|| "1.28.0.0".to_string());

    let game_region = GameRegion::from_str(&region);
    let res_mods_dir = registry::get_res_mods_dir(&game_path, &version);
    let mods_dir = registry::get_mods_dir(&game_path, &version);

    let config = GameConfig {
        install_path: game_path.clone(),
        version: version.clone(),
        region: game_region,
        mods_dir: mods_dir.clone(),
        res_mods_dir: res_mods_dir.clone(),
        auto_detect: false,
    };

    config::save_config(&config).await.map_err(|e| e.to_string())?;

    let mut game_dir = state.game_dir.lock().await;
    *game_dir = Some(game_path);
    let mut game_ver = state.game_version.lock().await;
    *game_ver = Some(version);

    Ok(config)
}

#[tauri::command]
pub async fn get_game_config() -> Result<GameConfig, String> {
    config::load_config().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn launch_game(state: State<'_, AppState>) -> Result<(), String> {
    let game_dir = state.game_dir.lock().await.clone()
        .ok_or_else(|| "Game directory not configured".to_string())?;

    let exe_path = game_dir.join("WorldOfTanks.exe");
    let launcher_path = game_dir.join("WoTLauncher.exe");

    if exe_path.exists() {
        std::process::Command::new(&exe_path)
            .spawn()
            .map_err(|e| format!("Failed to launch game: {}", e))?;
        Ok(())
    } else if launcher_path.exists() {
        std::process::Command::new(&launcher_path)
            .spawn()
            .map_err(|e| format!("Failed to launch launcher: {}", e))?;
        Ok(())
    } else {
        Err("Game executable not found".to_string())
    }
}
