use crate::error::{AppError, Result};
use sha2::{Digest, Sha256};
use std::path::Path;
use tokio::fs;

pub async fn hash_file(path: &Path) -> Result<String> {
    let data = fs::read(path).await.map_err(AppError::Io)?;
    let mut hasher = Sha256::new();
    hasher.update(&data);
    Ok(hex::encode(hasher.finalize()))
}

pub fn hash_file_sync(path: &Path) -> Result<String> {
    let data = std::fs::read(path).map_err(AppError::Io)?;
    let mut hasher = Sha256::new();
    hasher.update(&data);
    Ok(hex::encode(hasher.finalize()))
}
