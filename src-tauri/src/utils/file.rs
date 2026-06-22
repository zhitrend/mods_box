use crate::error::{AppError, Result};
use std::path::Path;
use tokio::fs;
use walkdir::WalkDir;

pub async fn ensure_dir(path: &Path) -> Result<()> {
    fs::create_dir_all(path).await.map_err(AppError::Io)
}

pub async fn copy_file(src: &Path, dest: &Path) -> Result<u64> {
    fs::copy(src, dest).await.map_err(AppError::Io)
}

pub async fn remove_file(path: &Path) -> Result<()> {
    if path.exists() {
        fs::remove_file(path).await.map_err(AppError::Io)?;
    }
    Ok(())
}

pub async fn remove_dir(path: &Path) -> Result<()> {
    if path.exists() {
        fs::remove_dir_all(path).await.map_err(AppError::Io)?;
    }
    Ok(())
}

pub async fn list_files(dir: &Path) -> Result<Vec<std::path::PathBuf>> {
    let mut files = Vec::new();
    if !dir.exists() {
        return Ok(files);
    }
    let mut entries = fs::read_dir(dir).await.map_err(AppError::Io)?;
    while let Some(entry) = entries.next_entry().await.map_err(AppError::Io)? {
        files.push(entry.path());
    }
    Ok(files)
}

pub fn walk_files(dir: &Path) -> Vec<std::path::PathBuf> {
    let mut files = Vec::new();
    if !dir.exists() {
        return files;
    }
    for entry in WalkDir::new(dir).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            files.push(entry.path().to_path_buf());
        }
    }
    files
}

pub fn format_file_size(size: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB"];
    let mut size = size as f64;
    let mut unit_idx = 0;
    while size >= 1024.0 && unit_idx < UNITS.len() - 1 {
        size /= 1024.0;
        unit_idx += 1;
    }
    format!("{:.2} {}", size, UNITS[unit_idx])
}
