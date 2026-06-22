use crate::core::conflict::{ConflictDetector, ConflictStrategy};
use crate::error::{AppError, Result};
use crate::models::*;
use crate::utils::file;
use crate::utils::hash;
use chrono::Local;
use std::io::Read;
use std::path::{Path, PathBuf};
use tokio::fs;
use uuid::Uuid;


const ZIP_PASSWORD: &str = "wotmods_box_2024";

struct ExtractedFile {
    relative_path: String,
    temp_path: PathBuf,
    hash: String,
    size: u64,
}

pub struct ModInstaller;

impl ModInstaller {
    pub async fn install_from_zip(
        zip_path: &Path,
        game_dir: &Path,
        game_version: &str,
        strategy: ConflictStrategy,
        mod_name: Option<String>,
    ) -> Result<ModInfo> {
        let temp_dir = std::env::temp_dir().join(format!("wot_mod_{}", Uuid::new_v4()));
        file::ensure_dir(&temp_dir).await?;

        let extracted = Self::extract_zip(zip_path, &temp_dir, game_version)?;

        let res_mods_dir = game_dir.join("res_mods").join(game_version);
        let installed_mods = Vec::new();
        let mod_files: Vec<ModFile> = extracted.mod_files;

        let conflicts =
            ConflictDetector::detect_conflicts(game_dir, &mod_files, &installed_mods);
        let has_conflicts = !conflicts.is_empty() && conflicts
            .iter()
            .any(|c| matches!(c.resolution, ConflictResolution::Pending));

        if has_conflicts {
            ConflictDetector::resolve_conflicts(
                game_dir,
                &mod_files,
                &conflicts,
                strategy,
            )
            .await?;
        }

        let backup_dir = game_dir.join(".wot_mods_backup");
        file::ensure_dir(&backup_dir).await?;

        for mod_file in &mod_files {
            let src_path = temp_dir.join(&mod_file.relative_path);
            let dest_path = game_dir.join(&mod_file.relative_path);

            if dest_path.exists() {
                let backup_path = backup_dir.join(format!(
                    "{}_{}",
                    Uuid::new_v4(),
                    mod_file.relative_path.replace(['\\', '/'], "_")
                ));
                if let Some(parent) = backup_path.parent() {
                    file::ensure_dir(parent).await?;
                }
                fs::copy(&dest_path, &backup_path).await.map_err(AppError::Io)?;
            }

            if let Some(parent) = dest_path.parent() {
                file::ensure_dir(parent).await?;
            }

            if strategy == ConflictStrategy::Rename && dest_path.exists() {
                let renamed = dest_path.with_extension(format!(
                    "{}.conflict_{}",
                    dest_path.extension().unwrap_or_default().to_string_lossy(),
                    Uuid::new_v4().to_string().split('-').next().unwrap_or("0")
                ));
                fs::copy(&src_path, &renamed).await.map_err(AppError::Io)?;
            } else {
                fs::copy(&src_path, &dest_path).await.map_err(AppError::Io)?;
            }
        }

        let total_size: u64 = mod_files.iter().map(|f| f.size).sum();

        file::remove_dir(&temp_dir).await?;

        let mod_info = ModInfo {
            id: Uuid::new_v4().to_string(),
            name: extracted.name,
            version: extracted.version,
            author: extracted.author,
            description: extracted.description,
            category: extracted.category,
            status: if has_conflicts {
                ModStatus::Conflict
            } else {
                ModStatus::Enabled
            },
            installed_at: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            install_path: PathBuf::from(&format!("res_mods/{}", game_version)),
            file_size: total_size,
            game_version: game_version.to_string(),
            files: mod_files,
            conflicts: vec![],
            dependencies: vec![],
            tags: extracted.tags,
            source: Some(zip_path.display().to_string()),
            enabled: true,
        };

        Ok(mod_info)
    }

    fn extract_zip(
        zip_path: &Path,
        temp_dir: &Path,
        game_version: &str,
    ) -> Result<ExtractResult> {
        let file = std::fs::File::open(zip_path).map_err(AppError::Io)?;
        let mut archive = zip::ZipArchive::new(file).map_err(AppError::Zip)?;

        let mut mod_files = Vec::new();
        let mut name = zip_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown")
            .to_string();
        let mut version = "1.0.0".to_string();
        let mut author = "Unknown".to_string();
        let mut description = String::new();
        let mut category = ModCategory::Other;
        let mut tags = Vec::new();

        for i in 0..archive.len() {
            let mut entry = archive.by_index_decrypt(i, ZIP_PASSWORD.as_bytes())
                .map_err(|e| AppError::Other(format!("ZIP读取失败(索引{}): {}", i, e)))?;
            let entry_path = entry.name().to_string();

            if entry.is_dir() {
                let dir_path = temp_dir.join(&entry_path);
                let _ = std::fs::create_dir_all(&dir_path);
                continue;
            }

            let file_path = temp_dir.join(&entry_path);
            if let Some(parent) = file_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }

            if entry_path.ends_with("manifest.json") || entry_path.ends_with("mod.json") {
                let mut content = String::new();
                if entry.read_to_string(&mut content).is_ok() {
                    if let Ok(manifest) =
                        serde_json::from_str::<serde_json::Value>(&content)
                    {
                        if let Some(n) = manifest.get("name").and_then(|v| v.as_str()) {
                            name = n.to_string();
                        }
                        if let Some(v) = manifest.get("version").and_then(|v| v.as_str()) {
                            version = v.to_string();
                        }
                        if let Some(a) = manifest.get("author").and_then(|v| v.as_str()) {
                            author = a.to_string();
                        }
                        if let Some(d) = manifest.get("description").and_then(|v| v.as_str()) {
                            description = d.to_string();
                        }
                        if let Some(c) = manifest.get("category").and_then(|v| v.as_str()) {
                            category = ModCategory::from_str(c);
                        }
                        if let Some(t) = manifest.get("tags").and_then(|v| v.as_array()) {
                            tags = t.iter().filter_map(|x| x.as_str().map(String::from)).collect();
                        }
                    }
                }
                continue;
            }

            let target_path = if entry_path.starts_with("res_mods/")
                || entry_path.starts_with("mods/")
                || entry_path.starts_with("scripts/")
                || entry_path.starts_with("gui/")
            {
                let relative = if entry_path.starts_with("res_mods/") {
                    entry_path.trim_start_matches("res_mods/")
                } else {
                    &entry_path
                };
                let versioned_path = format!("res_mods/{}/{}", game_version, relative);
                PathBuf::from(&versioned_path)
            } else {
                PathBuf::from(&entry_path)
            };

            let dest_path = temp_dir.join(target_path.display().to_string());
            if let Some(parent) = dest_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }

            let mut outfile = std::fs::File::create(&dest_path).map_err(AppError::Io)?;
            std::io::copy(&mut entry, &mut outfile).map_err(AppError::Io)?;

            let file_hash = hash::hash_file_sync(&dest_path)?;
            let file_size = dest_path.metadata().map_err(AppError::Io)?.len();

            mod_files.push(ModFile {
                relative_path: target_path.display().to_string(),
                hash: file_hash,
                size: file_size,
            });
        }

        Ok(ExtractResult {
            name,
            version,
            author,
            description,
            category,
            tags,
            mod_files,
        })
    }
}

struct ExtractResult {
    name: String,
    version: String,
    author: String,
    description: String,
    category: ModCategory,
    tags: Vec<String>,
    mod_files: Vec<ModFile>,
}
