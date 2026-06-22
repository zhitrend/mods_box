use crate::error::{AppError, Result};
use crate::models::ModInfo;
use std::path::Path;

pub struct ModLoader;

impl ModLoader {
    pub async fn enable_mod(mod_info: &ModInfo, game_dir: &Path) -> Result<()> {
        for file in &mod_info.files {
            let file_path = game_dir.join(&file.relative_path);
            let disabled_path = file_path.with_extension("wotmod.disabled");

            if disabled_path.exists() && !file_path.exists() {
                std::fs::rename(&disabled_path, &file_path).map_err(AppError::Io)?;
            }
        }
        Ok(())
    }

    pub async fn disable_mod(mod_info: &ModInfo, game_dir: &Path) -> Result<()> {
        for file in &mod_info.files {
            let file_path = game_dir.join(&file.relative_path);
            if file_path.exists() {
                let disabled_path = file_path.with_extension("wotmod.disabled");
                std::fs::rename(&file_path, &disabled_path).map_err(AppError::Io)?;
            }
        }
        Ok(())
    }

    pub async fn uninstall_mod(mod_info: &ModInfo, game_dir: &Path) -> Result<()> {
        for file in &mod_info.files {
            let file_path = game_dir.join(&file.relative_path);
            if file_path.exists() {
                std::fs::remove_file(&file_path).map_err(AppError::Io)?;
            }
            let disabled_path = file_path.with_extension("wotmod.disabled");
            if disabled_path.exists() {
                std::fs::remove_file(&disabled_path).map_err(AppError::Io)?;
            }
        }
        Ok(())
    }
}
