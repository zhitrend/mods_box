use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ModStatus {
    Enabled,
    Disabled,
    Conflict,
    Outdated,
    Incompatible,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ModCategory {
    Aiming,
    Crosshair,
    DamagePanel,
    Garage,
    Minimap,
    Sound,
    Visual,
    Utility,
    XVM,
    Other,
}

impl ModCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            ModCategory::Aiming => "瞄准",
            ModCategory::Crosshair => "准星",
            ModCategory::DamagePanel => "伤害面板",
            ModCategory::Garage => "车库",
            ModCategory::Minimap => "小地图",
            ModCategory::Sound => "音效",
            ModCategory::Visual => "视觉",
            ModCategory::Utility => "实用工具",
            ModCategory::XVM => "XVM",
            ModCategory::Other => "其他",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "瞄准" | "Aiming" => ModCategory::Aiming,
            "准星" | "Crosshair" => ModCategory::Crosshair,
            "伤害面板" | "DamagePanel" => ModCategory::DamagePanel,
            "车库" | "Garage" => ModCategory::Garage,
            "小地图" | "Minimap" => ModCategory::Minimap,
            "音效" | "Sound" => ModCategory::Sound,
            "视觉" | "Visual" => ModCategory::Visual,
            "实用工具" | "Utility" => ModCategory::Utility,
            "XVM" => ModCategory::XVM,
            _ => ModCategory::Other,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModFile {
    pub relative_path: String,
    pub hash: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConflictResolution {
    Pending,
    Merged,
    Overwritten,
    Skipped,
    Renamed,
    Isolated,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ConflictGrade {
    High,
    Medium,
    Low,
}

impl ConflictGrade {
    pub fn as_str(&self) -> &'static str {
        match self {
            ConflictGrade::High => "high",
            ConflictGrade::Medium => "medium",
            ConflictGrade::Low => "low",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "high" => ConflictGrade::High,
            "medium" => ConflictGrade::Medium,
            "low" => ConflictGrade::Low,
            _ => ConflictGrade::Low,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictInfo {
    pub file_path: String,
    pub conflict_with: Vec<String>,
    pub resolution: ConflictResolution,
    pub grade: ConflictGrade,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: String,
    pub description: String,
    pub category: ModCategory,
    pub status: ModStatus,
    pub installed_at: String,
    pub install_path: PathBuf,
    pub file_size: u64,
    pub game_version: String,
    pub files: Vec<ModFile>,
    pub conflicts: Vec<ConflictInfo>,
    pub dependencies: Vec<String>,
    pub tags: Vec<String>,
    pub source: Option<String>,
    pub enabled: bool,
}
