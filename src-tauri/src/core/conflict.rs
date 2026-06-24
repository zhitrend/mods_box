use crate::error::Result;
use crate::models::*;
use crate::utils::hash;
use std::collections::HashMap;
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
    /// Detect file conflicts between new mod files and already installed mods.
    ///
    /// Conflict grading:
    /// - High: same path, different hash, owned by different mod(s)
    /// - Medium: same path, different hash, owned by same mod (version conflict)
    /// - Low: same path, same hash (safe to overwrite, no data loss)
    pub fn detect_conflicts(
        game_dir: &Path,
        mod_files: &[ModFile],
        installed_mods: &[ModInfo],
    ) -> Vec<ConflictInfo> {
        // Build a reverse index: file_path -> list of mod IDs that own it
        let mut file_owners: HashMap<String, Vec<String>> = HashMap::new();
        for installed in installed_mods {
            for f in &installed.files {
                file_owners
                    .entry(f.relative_path.clone())
                    .or_default()
                    .push(installed.id.clone());
            }
        }

        let mut conflicts = Vec::new();
        for file in mod_files {
            let target_path = game_dir.join(&file.relative_path);

            if !target_path.exists() {
                continue;
            }

            let existing_hash = match hash::hash_file_sync(&target_path) {
                Ok(h) => h,
                Err(_) => continue,
            };

            let owners = file_owners.get(&file.relative_path).cloned().unwrap_or_default();

            let grade = if owners.is_empty() {
                // File exists but not tracked by any installed mod -> Low
                ConflictGrade::Low
            } else if existing_hash == file.hash {
                ConflictGrade::Low
            } else if owners.len() == 1 {
                // Only one owner: could be a version update of the same mod
                ConflictGrade::Medium
            } else {
                ConflictGrade::High
            };

            if existing_hash != file.hash || !owners.is_empty() {
                conflicts.push(ConflictInfo {
                    file_path: file.relative_path.clone(),
                    conflict_with: owners,
                    resolution: ConflictResolution::Pending,
                    grade,
                });
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
                let mod_file = mod_files
                    .iter()
                    .find(|f| f.relative_path == conflict.file_path);
                if let Some(_file) = mod_file {
                    let src_path = game_dir.join(&conflict.file_path);
                    let dest_path = std::env::temp_dir()
                        .join("wot_skipped")
                        .join(&conflict.file_path);
                    if let Some(parent) = dest_path.parent() {
                        let _ = std::fs::create_dir_all(parent);
                    }
                    if src_path.exists() {
                        let _ = std::fs::copy(&src_path, &dest_path);
                    }
                }
            }
        }

        Ok(resolved)
    }
}
