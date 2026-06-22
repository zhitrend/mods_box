use crate::error::{AppError, Result};
use crate::models::{GameConfig, GameRegion, ModInfo};
use std::path::PathBuf;
use tokio::fs;

const CONFIG_DIR: &str = "wot-mods-manager";

fn get_config_dir() -> Result<PathBuf> {
    let base = dirs_next::config_dir()
        .or_else(|| dirs_next::data_dir())
        .ok_or_else(|| AppError::Other("Cannot find config directory".to_string()))?;
    Ok(base.join(CONFIG_DIR))
}

pub async fn load_config() -> Result<GameConfig> {
    let config_dir = get_config_dir()?;
    let config_path = config_dir.join("config.json");

    if config_path.exists() {
        let content = fs::read_to_string(&config_path).await.map_err(AppError::Io)?;
        let config: GameConfig = serde_json::from_str(&content).map_err(AppError::Serde)?;
        return Ok(config);
    }

    let default_config = GameConfig {
        install_path: PathBuf::new(),
        version: String::new(),
        region: GameRegion::EU,
        mods_dir: PathBuf::new(),
        res_mods_dir: PathBuf::new(),
        auto_detect: true,
    };
    Ok(default_config)
}

pub async fn save_config(config: &GameConfig) -> Result<()> {
    let config_dir = get_config_dir()?;
    fs::create_dir_all(&config_dir).await.map_err(AppError::Io)?;
    let config_path = config_dir.join("config.json");
    let content = serde_json::to_string_pretty(config).map_err(AppError::Serde)?;
    fs::write(&config_path, content).await.map_err(AppError::Io)?;
    Ok(())
}

pub async fn load_mods_db() -> Result<Vec<ModInfo>> {
    let config_dir = get_config_dir()?;
    let db_path = config_dir.join("mods_db.json");

    if db_path.exists() {
        let content = fs::read_to_string(&db_path).await.map_err(AppError::Io)?;
        let mods: Vec<ModInfo> = serde_json::from_str(&content).map_err(AppError::Serde)?;
        return Ok(mods);
    }
    Ok(Vec::new())
}

pub async fn save_mods_db(mods: &[ModInfo]) -> Result<()> {
    let config_dir = get_config_dir()?;
    fs::create_dir_all(&config_dir).await.map_err(AppError::Io)?;
    let db_path = config_dir.join("mods_db.json");
    let content = serde_json::to_string_pretty(mods).map_err(AppError::Serde)?;
    fs::write(&db_path, content).await.map_err(AppError::Io)?;
    Ok(())
}
