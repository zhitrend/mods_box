use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub description: String,
    pub mod_list: Vec<String>,
    pub size: u64,
    pub path: PathBuf,
}
