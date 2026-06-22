use once_cell::sync::OnceCell;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Mutex;
use std::time::Duration;
use rand::{RngCore, Rng};
use rand::distributions::Alphanumeric;
use aes::cipher::{block_padding::Pkcs7, BlockDecryptMut, BlockEncryptMut, KeyIvInit};
use cbc::{Encryptor, Decryptor};
use base64::{engine::general_purpose, Engine as _};
use md5::{Md5, Digest};
use rand::rngs::OsRng;
use rsa::{RsaPublicKey, Pkcs1v15Encrypt, pkcs1::DecodeRsaPublicKey, pkcs8::DecodePublicKey};
use openssl::rsa::Rsa;
use chrono::{DateTime, Utc};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

type Aes192CbcEnc = Encryptor<aes::Aes192>;
type Aes192CbcDec = Decryptor<aes::Aes192>;

const API_URL: &str = "https://wt.tankbot.pp.ua/Api?AppId=10004";
const RSA_PUB_KEY: &str = "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC0DI2nxX5dZRtSOjtjeIWFoybv\nOT4wW/mjiVu1ny4FCp6WuE0GIQdPlvvLUKEk1AlejjwzxofdhhOkbi/tpL7GUl7e\nK8zclETBcivNTpNBxauxtg8+v+YRWpR5izuRiPnubmBSHAXYEl+tLaQYcdGDfPqq\nPdcZxLlgStdeUrZ6qQIDAQAB\n-----END PUBLIC KEY-----";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ApiConfig {
    pub url: String,
    pub sid: String,
    pub crypto_type: u8,
    pub key: String,
    pub pub_key: String,
    pub token: String,
    pub crypto_key_aes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct KamiInfo {
    pub kami: String,
    pub expire_time: Option<String>,
    pub expire_ts: Option<i64>,
    pub last_check_time: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResult {
    pub success: bool,
    pub message: String,
    pub vip_time: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeartbeatResult {
    pub ok: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimpleResult {
    pub ok: bool,
    pub message: Option<String>,
}

static CONFIG: OnceCell<Mutex<ApiState>> = OnceCell::new();

#[derive(Debug)]
struct ApiState {
    cfg: ApiConfig,
    client: Client,
    initialized: bool,
}

fn state() -> &'static Mutex<ApiState> {
    CONFIG.get_or_init(|| {
        Mutex::new(ApiState {
            cfg: ApiConfig::default(),
            client: Client::builder()
                .danger_accept_invalid_certs(true)
                .timeout(Duration::from_secs(10))
                .connect_timeout(Duration::from_secs(5))
                .build()
                .unwrap_or_else(|_| Client::new()),
            initialized: false,
        })
    })
}

pub async fn init_api() -> Result<(), String> {
    {
        let s = state().lock().unwrap();
        if s.initialized {
            return Ok(());
        }
    }

    {
        let mut s = state().lock().unwrap();
        s.cfg.url = API_URL.to_string();
        s.cfg.crypto_type = 3;
        s.cfg.pub_key = RSA_PUB_KEY.to_string();
        s.cfg.key = String::new();
        println!("[API] Initialized with config");
    }

    fn_init().await?;

    {
        let mut s = state().lock().unwrap();
        s.initialized = true;
    }
    Ok(())
}

pub fn init_api_async() -> Result<(), String> {
    let mut s = state().lock().unwrap();
    s.cfg.url = API_URL.to_string();
    s.cfg.crypto_type = 3;
    s.cfg.pub_key = RSA_PUB_KEY.to_string();
    s.cfg.key = String::new();
    s.initialized = false;
    println!("[API] Async placeholder initialized");
    Ok(())
}

async fn fn_init() -> Result<(), String> {
    println!("[API] Calling GetToken...");
    let payload = json!({ "Api": "GetToken" });
    let val = call_api_internal(payload, false).await?;

    if let Some(code) = val.get("Code").and_then(|v| v.as_i64()) {
        if code != 0 && code != 200 {
            let msg = val.get("Msg").and_then(|v| v.as_str()).unwrap_or("GetToken failed");
            return Err(format!("GetToken failed: {}", msg));
        }
    }
    let data = val.get("Data").unwrap_or(&val);
    let token = data.get("Token").and_then(|v| v.as_str()).ok_or_else(|| "Missing Token")?;
    let crypto_key_aes = data.get("CryptoKeyAes").and_then(|v| v.as_str()).unwrap_or("");

    {
        let mut s = state().lock().unwrap();
        s.cfg.token = token.to_string();
        s.cfg.crypto_key_aes = crypto_key_aes.to_string();
        if !crypto_key_aes.is_empty() {
            s.cfg.key = crypto_key_aes.to_string();
        }
        println!("[API] Token acquired");
    }
    Ok(())
}

async fn ensure_initialized() -> Result<(), String> {
    let needs_init = {
        let s = state().lock().unwrap();
        !s.initialized
    };
    if needs_init {
        match fn_init().await {
            Ok(_) => {
                let mut s = state().lock().unwrap();
                s.initialized = true;
                Ok(())
            }
            Err(e) => {
                println!("[API] Token init failed: {}", e);
                init_api_async()
            }
        }
    } else {
        Ok(())
    }
}

static HWID: OnceCell<String> = OnceCell::new();

fn get_hwid() -> String {
    HWID.get_or_init(|| {
        let id = match get_platform_hwid() {
            Some(s) => s,
            None => {
                format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH)
            }
        };
        md5_hex(&id)
    }).clone()
}

fn get_platform_hwid() -> Option<String> {
    use std::process::Command;

    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("reg")
            .args(&["query", "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if line.contains("MachineGuid") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 3 {
                        return Some(parts[2].to_string());
                    }
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = Command::new("ioreg")
            .args(&["-rd1", "-c", "IOPlatformExpertDevice"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if line.contains("IOPlatformUUID") {
                    let parts: Vec<&str> = line.split('=').collect();
                    if parts.len() >= 2 {
                        return Some(parts[1].trim().trim_matches('"').to_string());
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(id) = std::fs::read_to_string("/etc/machine-id") {
            return Some(id.trim().to_string());
        }
        if let Ok(id) = std::fs::read_to_string("/var/lib/dbus/machine-id") {
            return Some(id.trim().to_string());
        }
    }

    None
}

pub async fn login_kami(kami: &str) -> LoginResult {
    if let Err(e) = ensure_initialized().await {
        return LoginResult { success: false, message: e, vip_time: None };
    }
    let hwid = get_hwid();
    let payload = json!({
        "Api": "UserLogin",
        "UserOrKa": kami,
        "PassWord": kami,
        "Key": hwid,
        "Tab": format!("{}/{}", std::env::consts::OS, std::env::consts::ARCH),
        "AppVer": "1.0.0",
    });
    match call_api(payload).await {
        Ok(val) => {
            let msg = val.get("Msg").and_then(|v| v.as_str()).unwrap_or("");
            let code = val.get("Code").and_then(|v| v.as_i64());
            let vip_time_ts = val.get("Data").and_then(|d| d.get("VipTime"))
                .and_then(|v| v.as_i64().or_else(|| v.as_str()?.parse::<i64>().ok()));

            let success = match code {
                Some(c) => c == 0 || c == 200,
                None => vip_time_ts.is_some() || msg.contains("已登陆") || msg.contains("无需重复登陆"),
            };

            LoginResult {
                success,
                message: if success { val.to_string() } else { if msg.is_empty() { val.to_string() } else { msg.to_string() } },
                vip_time: vip_time_ts,
            }
        }
        Err(e) => LoginResult { success: false, message: e, vip_time: None },
    }
}

pub async fn heartbeat() -> HeartbeatResult {
    if let Err(e) = ensure_initialized().await {
        return HeartbeatResult { ok: false, message: e };
    }
    match call_api(json!({ "Api": "HeartBeat" })).await {
        Ok(v) => HeartbeatResult { ok: true, message: v.to_string() },
        Err(e) => HeartbeatResult { ok: false, message: e },
    }
}

pub async fn vip_data() -> Value {
    if let Err(e) = ensure_initialized().await {
        return json!({ "error": e });
    }
    match call_api(json!({ "Api": "GetVipData" })).await {
        Ok(v) => v,
        Err(e) => json!({ "error": e }),
    }
}

pub async fn delete_app_user_key(user: &str, password: &str) -> SimpleResult {
    if let Err(e) = ensure_initialized().await {
        return SimpleResult { ok: false, message: Some(e) };
    }
    let payload = json!({ "Api": "DeleteAppUserKey", "User": user, "PassWord": password });
    match call_api(payload).await {
        Ok(v) => {
            let status_ok = v.get("Status").and_then(|s| s.as_u64()).map(|s| s == 200).unwrap_or(true);
            SimpleResult { ok: status_ok, message: Some(v.get("Msg").and_then(|m| m.as_str()).unwrap_or("ok").to_string()) }
        },
        Err(e) => SimpleResult { ok: false, message: Some(e) },
    }
}

async fn call_api(param: Value) -> Result<Value, String> {
    call_api_internal(param, true).await
}

async fn call_api_internal(param: Value, use_token: bool) -> Result<Value, String> {
    let (url, crypto_type, key, pub_key, token, crypto_key_aes, client) = {
        let s = state().lock().unwrap();
        (s.cfg.url.clone(), s.cfg.crypto_type, s.cfg.key.clone(), s.cfg.pub_key.clone(), s.cfg.token.clone(), s.cfg.crypto_key_aes.clone(), s.client.clone())
    };

    if url.is_empty() { return Err("Config missing".into()); }

    let mut payload = param.clone();
    payload["Time"] = json!(Utc::now().timestamp());
    payload["Status"] = json!(rand::thread_rng().next_u32() % 90000 + 10000);
    let req_status = payload.get("Status").and_then(|v| v.as_i64());
    let payload_str = payload.to_string();

    let mut body = json!({"a": "", "b": ""});
    let mut request_key = String::new();

    match crypto_type {
        1 => body = payload,
        2 => {
            let key_use = ensure_key24(key);
            request_key = key_use.clone();
            body["a"] = json!(aes_cbc_encrypt_str(&key_use, &payload_str)?);
            body["b"] = json!(md5_hex(&(body["a"].as_str().unwrap().to_string() + &key_use)));
        }
        3 => {
            let key_to_use: String = rand::thread_rng().sample_iter(&Alphanumeric).take(24).map(char::from).collect();
            request_key = key_to_use.clone();
            body["a"] = json!(aes_cbc_encrypt_str(&key_to_use, &payload_str)?);
            body["b"] = json!(rsa_encrypt(&pub_key, &key_to_use)?);
        }
        _ => return Err("Crypto error".into()),
    }

    let mut req = client.post(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; WOW64)")
        .json(&body);
    if use_token { req = req.header("Token", token); }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status_code = resp.status();
    let resp_text = resp.text().await.map_err(|e| e.to_string())?;

    let mut val: Value = serde_json::from_str(&resp_text).map_err(|e| e.to_string())?;
    if !status_code.is_success() { return Err(format!("HTTP {}", status_code)); }

    if crypto_type == 2 {
        if let (Some(ra), Some(rb)) = (val.get("a").and_then(|v| v.as_str()), val.get("b").and_then(|v| v.as_str())) {
            if md5_hex(&(ra.to_string() + &request_key)).to_uppercase() != rb.to_uppercase() { return Err("Sign error".into()); }
            val = serde_json::from_str(&aes_cbc_decrypt_str(&request_key, ra)?).map_err(|e| e.to_string())?;
        }
    } else if crypto_type == 3 {
        if let Some(ra) = val.get("a").and_then(|v| v.as_str()) {
            let api_name = param.get("Api").and_then(|v| v.as_str()).unwrap_or("");
            let rsa_list = ["GetToken", "UserLogin", "UserReduceMoney", "UserReduceVipNumber", "UserReduceVipTime", "GetVipData"];
            let dk = if rsa_list.contains(&api_name) {
                if let Some(rb) = val.get("b").and_then(|v| v.as_str()) { rsa_decrypt_with_public(&pub_key, rb)? }
                else if !crypto_key_aes.is_empty() { crypto_key_aes }
                else { request_key }
            } else { if !crypto_key_aes.is_empty() { crypto_key_aes } else { request_key } };
            val = serde_json::from_str(&aes_cbc_decrypt_str(&dk, ra)?).map_err(|e| e.to_string())?;
        }
    }

    if let Some(expected) = req_status {
        if let Some(rs) = val.get("Status").and_then(|v| v.as_i64()) {
            if rs != expected {
                let msg = val.get("Msg").and_then(|v| v.as_str()).unwrap_or("");
                if api_name_check(&val) && (rs == 200 || msg.contains("已登陆")) { return Ok(val); }
                return Err(format!("Status mismatch: {}/{}", rs, expected));
            }
        }
    }
    Ok(val)
}

fn api_name_check(val: &Value) -> bool {
    let name = val.get("Api").and_then(|v| v.as_str()).unwrap_or("");
    name == "UserLogin" || (val.get("Status").and_then(|v| v.as_i64()) == Some(200))
}

fn derive_aes_key24(key_str: &str) -> [u8; 24] {
    let utf8_bytes = key_str.as_bytes();
    let mut key = [0u8; 24];
    for i in 0..24 {
        if i < utf8_bytes.len() { key[i] = utf8_bytes[i]; }
        else { key[i] = 0; }
    }
    key
}

fn aes_cbc_encrypt_str(key_str: &str, plain: &str) -> Result<String, String> {
    let key = derive_aes_key24(key_str);
    let iv = [0u8; 16];
    let encryptor = Encryptor::<aes::Aes192>::new_from_slices(&key, &iv).map_err(|e| e.to_string())?;
    let plain_bytes = plain.as_bytes();
    let mut buf = vec![0u8; plain_bytes.len() + 16];
    buf[..plain_bytes.len()].copy_from_slice(plain_bytes);
    let ciphertext = encryptor.encrypt_padded_mut::<Pkcs7>(&mut buf, plain_bytes.len()).map_err(|e| e.to_string())?;
    Ok(general_purpose::STANDARD.encode(ciphertext))
}

fn aes_cbc_decrypt_str(key_str: &str, cipher_b64: &str) -> Result<String, String> {
    let key = derive_aes_key24(key_str);
    let mut data = general_purpose::STANDARD.decode(cipher_b64).map_err(|e| e.to_string())?;
    let iv = [0u8; 16];
    let decryptor = Decryptor::<aes::Aes192>::new_from_slices(&key, &iv).map_err(|e| e.to_string())?;
    let plain = decryptor.decrypt_padded_mut::<Pkcs7>(&mut data).map_err(|e| e.to_string())?;
    String::from_utf8(plain.to_vec()).map_err(|e| e.to_string())
}

fn md5_hex(s: &str) -> String {
    let mut hasher = Md5::new();
    hasher.update(s.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn rsa_encrypt(pub_pem: &str, data: &str) -> Result<String, String> {
    let key = RsaPublicKey::from_public_key_pem(pub_pem).or_else(|_| RsaPublicKey::from_pkcs1_pem(pub_pem))
        .map_err(|e| format!("RSA Key Parse Error: {}", e))?;
    let mut rng = OsRng;
    let enc = key.encrypt(&mut rng, Pkcs1v15Encrypt, data.as_bytes()).map_err(|e| e.to_string())?;
    Ok(general_purpose::STANDARD.encode(enc))
}

fn rsa_decrypt_with_public(pub_pem: &str, cipher_b64: &str) -> Result<String, String> {
    let encrypted_bytes = general_purpose::STANDARD.decode(cipher_b64).map_err(|e| e.to_string())?;
    let rsa = Rsa::public_key_from_pem(pub_pem.as_bytes()).map_err(|e| e.to_string())?;
    let mut buf = vec![0; rsa.size() as usize];
    let decrypted_len = rsa.public_decrypt(&encrypted_bytes, &mut buf, openssl::rsa::Padding::PKCS1).map_err(|e| e.to_string())?;
    let decrypted_bytes = &buf[..decrypted_len];
    match String::from_utf8(decrypted_bytes.to_vec()) {
        Ok(s) => Ok(if s.len() >= 24 { s[..24].to_string() } else { s }),
        Err(_) => Ok(general_purpose::STANDARD.encode(decrypted_bytes)),
    }
}

fn ensure_key24(mut key: String) -> String {
    if key.len() >= 24 { key.truncate(24); return key; }
    while key.len() < 24 { key.push('\0'); }
    key
}

pub fn ensure_storage_dir(app: &AppHandle) -> PathBuf {
    use tauri::Manager;
    let dir = app
        .path()
        .app_config_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    let _ = fs::create_dir_all(&dir);
    dir
}

pub fn kami_file_path(app: &AppHandle) -> PathBuf {
    ensure_storage_dir(app).join("kami_bind.json")
}

pub fn save_kami_info(app: &AppHandle, info: &KamiInfo) {
    let path = kami_file_path(app);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(info) {
        let _ = fs::write(&path, json);
    }
}

pub fn load_kami_info(app: &AppHandle) -> Option<KamiInfo> {
    let path = kami_file_path(app);
    if path.exists() {
        fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str::<KamiInfo>(&s).ok())
    } else {
        None
    }
}

pub fn format_vip_time(ts: i64) -> Option<String> {
    let dt = DateTime::from_timestamp(ts, 0)?;
    Some(dt.format("%Y-%m-%d %H:%M:%S").to_string())
}

pub fn get_check_interval(kami: &str) -> i64 {
    if kami.starts_with("ZC") {
        1200
    } else if kami.starts_with("D") {
        7200
    } else if kami.starts_with("W") {
        43200
    } else if kami.starts_with("M") {
        86400
    } else if kami.starts_with("S") {
        172800
    } else if kami.starts_with("BN") {
        345600
    } else if kami.starts_with("N") {
        518400
    } else if kami.starts_with("CQ") {
        1209600
    } else {
        3600
    }
}

#[tauri::command]
pub async fn check_auth_status(app_handle: AppHandle) -> Result<String, String> {
    if let Some(kami_info) = load_kami_info(&app_handle) {
        if let Some(expire_ts) = kami_info.expire_ts {
            let now = Utc::now().timestamp();
            let time_str = format_vip_time(expire_ts).unwrap_or_else(|| "unknown".to_string());
            if now >= expire_ts {
                return Ok(format!("expired:{}", time_str));
            }
            return Ok(format!("bound:{}", time_str));
        }
        Ok("bound:unknown".to_string())
    } else {
        Ok("unbound".to_string())
    }
}

#[tauri::command]
pub async fn bind_kami(app_handle: AppHandle, kami: String) -> Result<KamiInfo, String> {
    let result = login_kami(&kami).await;
    if result.success {
        let info = KamiInfo {
            kami: kami.clone(),
            expire_time: result.vip_time.and_then(format_vip_time),
            expire_ts: result.vip_time,
            last_check_time: Some(Utc::now().timestamp()),
        };
        save_kami_info(&app_handle, &info);
        Ok(info)
    } else {
        Err(result.message)
    }
}

#[tauri::command]
pub async fn unbind_kami(app_handle: AppHandle) -> Result<(), String> {
    let path = kami_file_path(&app_handle);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to remove kami file: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn load_kami_info_cmd(app_handle: AppHandle) -> Result<Option<KamiInfo>, String> {
    Ok(load_kami_info(&app_handle))
}
