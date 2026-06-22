use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum GameRegion {
    EU,
    NA,
    ASIA,
    RU,
    CN,
}

impl GameRegion {
    pub fn as_str(&self) -> &'static str {
        match self {
            GameRegion::EU => "EU",
            GameRegion::NA => "NA",
            GameRegion::ASIA => "ASIA",
            GameRegion::RU => "RU",
            GameRegion::CN => "CN",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "EU" => GameRegion::EU,
            "NA" => GameRegion::NA,
            "ASIA" => GameRegion::ASIA,
            "RU" => GameRegion::RU,
            "CN" => GameRegion::CN,
            _ => GameRegion::EU,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameConfig {
    pub install_path: PathBuf,
    pub version: String,
    pub region: GameRegion,
    pub mods_dir: PathBuf,
    pub res_mods_dir: PathBuf,
    pub auto_detect: bool,
}
