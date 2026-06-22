use crate::error::Result;
use crate::models::*;
use crate::utils::hash;
use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ConflictStrategy {
    SmartMerge,
    Overwrite,
    Skip,
    Rename,
    Isolate,
}

pub struct ConflictDetector;

impl ConflictDetector {
    pub fn detect_conflicts(
        game_dir: &Path,
        mod_files: &[ModFile],
        _installed_mods: &[ModInfo],
    ) -> Vec<ConflictInfo> {
        let mut conflicts = Vec::new();
        for file in mod_files {
            let target_path = game_dir.join(&file.relative_path);
            if target_path.exists() {
                if let Ok(existing_hash) = hash::hash_file_sync(&target_path) {
                    if existing_hash != file.hash {
                        conflicts.push(ConflictInfo {
                            file_path: file.relative_path.clone(),
                            conflict_with: Vec::new(),
                            resolution: ConflictResolution::Pending,
                        });
                    }
                }
            }
        }
        conflicts
    }

    pub async fn resolve_conflicts(
        game_dir: &Path,
        mod_files: &[ModFile],
        conflicts: &[ConflictInfo],
        strategy: ConflictStrategy,
    ) -> Result<Vec<ConflictInfo>> {
        let mut resolved = conflicts.to_vec();

        for conflict in &mut resolved {
            match strategy {
                ConflictStrategy::SmartMerge => {
                    conflict.resolution = ConflictResolution::Merged;
                }
                ConflictStrategy::Overwrite => {
                    conflict.resolution = ConflictResolution::Overwritten;
                }
                ConflictStrategy::Skip => {
                    conflict.resolution = ConflictResolution::Skipped;
                }
                ConflictStrategy::Rename => {
                    conflict.resolution = ConflictResolution::Renamed;
                }
                ConflictStrategy::Isolate => {
                    conflict.resolution = ConflictResolution::Isolated;
                }
            }
        }

        if strategy == ConflictStrategy::Skip {
            for conflict in conflicts {
                let target_path = game_dir.join(&conflict.file_path);
                let mod_file = mod_files.iter().find(|f| f.relative_path == conflict.file_path);
                if let Some(_file) = mod_file {
                    if target_path.exists() {
                        let dest_path = std::env::temp_dir().join("wot_skipped").join(&conflict.file_path);
                        if let Some(parent) = dest_path.parent() {
                            let _ = std::fs::create_dir_all(parent);
                        }
                        let src_path = game_dir.join(&conflict.file_path);
                        if src_path.exists() {
                            let _ = std::fs::copy(&src_path, &dest_path);
                        }
                    }
                }
            }
        }

        Ok(resolved)
    }
}
