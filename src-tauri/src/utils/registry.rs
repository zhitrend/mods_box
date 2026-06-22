use std::path::PathBuf;

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

    let common_paths = vec![
        "C:\\Games\\World_of_Tanks",
        "C:\\Program Files\\World_of_Tanks",
        "C:\\Program Files (x86)\\World_of_Tanks",
        "C:\\Program Files (x86)\\Wargaming.net\\World_of_Tanks",
        "D:\\Games\\World_of_Tanks",
    ];
    for path_str in common_paths {
        let p = PathBuf::from(path_str);
        if p.join("WorldOfTanks.exe").exists() || p.join("wotlauncher.exe").exists() {
            return Some(p);
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
