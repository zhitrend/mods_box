use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("ZIP error: {0}")]
    Zip(#[from] zip::result::ZipError),
    #[error("Serde error: {0}")]
    Serde(#[from] serde_json::Error),
    #[error("Game not found")]
    GameNotFound,
    #[error("Invalid path: {0}")]
    InvalidPath(String),
    #[error("Registry error: {0}")]
    Registry(String),
    #[error("Mod install error: {0}")]
    ModInstall(String),
    #[error("Backup error: {0}")]
    Backup(String),
    #[error("{0}")]
    Other(String),
}

impl From<AppError> for String {
    fn from(e: AppError) -> Self {
        e.to_string()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
