use std::path::PathBuf;
use walkdir::WalkDir;

pub fn detect_wot_path() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::HKEY_LOCAL_MACHINE;
        use winreg::RegKey;
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let path = r"SOFTWARE\Wargaming.net\WOT";
        if let Ok(key) = hklm.open_subkey(path) {
            if let Ok(install_path) = key.get_value::<String, _>("InstallDir") {
                let p = PathBuf::from(&install_path);
                if p.exists() {
                    return Some(p);
                }
            }
        }
    }

    let common_paths = [
        "C:\\Games\\WorldOfTanks",
        "D:\\Games\\WorldOfTanks",
        "E:\\Games\\WorldOfTanks",
        "F:\\Games\\WorldOfTanks",
        "G:\\Games\\WorldOfTanks",
        "C:\\Program Files\\WorldOfTanks",
        "C:\\Program Files (x86)\\WorldOfTanks",
        "D:\\Program Files\\WorldOfTanks",
        "D:\\Program Files (x86)\\WorldOfTanks",
        "C:\\Wargaming.net\\WorldOfTanks",
        "D:\\Wargaming.net\\WorldOfTanks",
        "E:\\Wargaming.net\\WorldOfTanks",
        "C:\\Games\\World_of_Tanks",
        "D:\\Games\\World_of_Tanks",
        "C:\\Program Files\\World_of_Tanks",
        "C:\\Program Files (x86)\\World_of_Tanks",
        "C:\\Games\\World_of_Tanks_CN",
        "D:\\Games\\World_of_Tanks_CN",
        "C:\\Program Files\\World_of_Tanks_CN",
        "C:\\Program Files (x86)\\World_of_Tanks_CN",
    ];
    for path_str in &common_paths {
        let p = PathBuf::from(path_str);
        if p.join("WorldOfTanks.exe").exists() || p.join("WoTLauncher.exe").exists() {
            return Some(p);
        }
    }

    // Deep scan: search Games/ and Wargaming.net/ directories on all drives
    let candidates = ["WorldOfTanks.exe", "WoTLauncher.exe", "tanki.exe"];
    let scan_roots = ["Games", "Wargaming.net"];

    for letter in b'C'..=b'Z' {
        let drive = format!("{}:\\", letter as char);
        let drive_path = std::path::Path::new(&drive);
        if !drive_path.exists() {
            continue;
        }
        for root in &scan_roots {
            let dir = drive_path.join(root);
            if !dir.exists() || !dir.is_dir() {
                continue;
            }
            for entry in WalkDir::new(&dir).max_depth(4).into_iter().filter_map(|e| e.ok()) {
                if !entry.file_type().is_file() {
                    continue;
                }
                if let Some(name) = entry.file_name().to_str() {
                    if candidates.iter().any(|c| name.eq_ignore_ascii_case(c)) {
                        if let Some(parent) = entry.path().parent() {
                            return Some(parent.to_path_buf());
                        }
                    }
                }
            }
        }
    }

    // Finally scan user home directory
    if let Ok(home) = std::env::var("USERPROFILE") {
        let user_games = std::path::Path::new(&home).join("Games");
        if user_games.exists() {
            for entry in WalkDir::new(&user_games).max_depth(3).into_iter().filter_map(|e| e.ok()) {
                if !entry.file_type().is_file() {
                    continue;
                }
                if let Some(name) = entry.file_name().to_str() {
                    if candidates.iter().any(|c| name.eq_ignore_ascii_case(c)) {
                        if let Some(parent) = entry.path().parent() {
                            return Some(parent.to_path_buf());
                        }
                    }
                }
            }
        }
    }

    None
}

pub fn detect_game_version(game_dir: &PathBuf) -> Option<String> {
    let version_xml = game_dir.join("version.xml");
    if version_xml.exists() {
        if let Ok(content) = std::fs::read_to_string(&version_xml) {
            if let Some(ver) = content.split("<version>").nth(1) {
                if let Some(v) = ver.split("</version>").next() {
                    return Some(v.trim().to_string());
                }
            }
        }
    }
    let version_file = game_dir.join("game_version");
    if version_file.exists() {
        if let Ok(content) = std::fs::read_to_string(&version_file) {
            let v = content.trim().to_string();
            if !v.is_empty() {
                return Some(v);
            }
        }
    }
    None
}

pub fn get_res_mods_dir(game_dir: &PathBuf, version: &str) -> PathBuf {
    game_dir.join("res_mods").join(version)
}

pub fn get_mods_dir(game_dir: &PathBuf, version: &str) -> PathBuf {
    game_dir.join("mods").join(version)
}
