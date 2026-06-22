mod auth;
mod commands;
mod core;
mod error;
mod models;
mod utils;

use commands::mod_manager::AppState;
use std::path::PathBuf;
use tauri::Manager;
use tokio::sync::Mutex;

fn load_sync_config() -> (PathBuf, String, Vec<crate::models::ModInfo>) {
    let config_path = get_config_file_path("config.json");
    let db_path = get_config_file_path("mods_db.json");

    let install_path = if config_path.exists() {
        std::fs::read_to_string(&config_path)
            .ok()
            .and_then(|c| serde_json::from_str::<crate::models::GameConfig>(&c).ok())
            .map(|cfg| cfg.install_path)
            .unwrap_or_default()
    } else {
        PathBuf::new()
    };

    let version = if !install_path.as_os_str().is_empty() {
        crate::utils::registry::detect_game_version(&install_path)
            .unwrap_or_else(|| "1.28.0.0".to_string())
    } else {
        String::new()
    };

    let mods = if db_path.exists() {
        std::fs::read_to_string(&db_path)
            .ok()
            .and_then(|c| serde_json::from_str::<Vec<crate::models::ModInfo>>(&c).ok())
            .unwrap_or_default()
    } else {
        Vec::new()
    };

    (install_path, version, mods)
}

fn get_config_file_path(name: &str) -> PathBuf {
    let base = dirs_next::config_dir()
        .or_else(|| dirs_next::data_dir())
        .unwrap_or_else(|| PathBuf::from("."));
    base.join("wot-mods-manager").join(name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (install_path, version, mods) = load_sync_config();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            app.manage(AppState {
                mods: Mutex::new(mods),
                game_dir: Mutex::new(if install_path.as_os_str().is_empty() {
                    None
                } else {
                    Some(install_path.clone())
                }),
                game_version: Mutex::new(if version.is_empty() {
                    None
                } else {
                    Some(version)
                }),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::mod_manager::install_mod,
            commands::mod_manager::get_mods,
            commands::mod_manager::toggle_mod,
            commands::mod_manager::uninstall_mod,
            commands::mod_manager::batch_toggle_mods,
            commands::mod_manager::get_mod_detail,
            commands::mod_manager::refresh_mods,
            commands::game::detect_game,
            commands::game::set_game_path,
            commands::game::get_game_config,
            commands::game::launch_game,
            commands::backup::create_backup,
            commands::backup::list_backups,
            commands::backup::restore_backup,
            commands::backup::delete_backup,
            commands::conflict::detect_file_conflicts,
            commands::conflict::resolve_conflicts,
            auth::check_auth_status,
            auth::bind_kami,
            auth::unbind_kami,
            auth::load_kami_info_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
