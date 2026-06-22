use aes::cipher::{block_padding::Pkcs7, BlockDecryptMut, BlockEncryptMut, KeyIvInit};
use aes::Aes192;
use base64::{engine::general_purpose, Engine as _};
use cbc::{Decryptor as CbcDecryptor, Encryptor as CbcEncryptor};
use md5::{Digest, Md5};
use once_cell::sync::OnceCell;
use rand::RngCore;
use reqwest::Client;
use rsa::pkcs8::DecodePublicKey;
use rsa::{Pkcs1v15Encrypt, RsaPublicKey};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use chrono::{DateTime, Utc};
#[allow(unused_imports)]
use openssl::rsa::Rsa;

type Aes192CbcEnc = CbcEncryptor<Aes192>;
type Aes192CbcDec = CbcDecryptor<Aes192>;

const RSA_PUB_KEY: &str = "-----BEGIN PUBLIC KEY-----\n\
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC0DI2nxX5dZRtSOjtjeIWFoybv\n\
OT4wW/mjiVu1ny4FCp6WuE0GIQdPlvvLUKEk1AlejjwzxofdhhOkbi/tpL7GUl7e\n\
K8zclETBcivNTpNBxauxtg8+v+YRWpR5izuRiPnubmBSHAXYEl+tLaQYcdGDfPqq\n\
PdcZxLlgStdeUrZ6qQIDAQAB\n\
-----END PUBLIC KEY-----";

const API_URL: &str = "http://127.0.0.1:5000";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiConfig {
    pub base_url: String,
}

impl Default for ApiConfig {
    fn default() -> Self {
        Self {
            base_url: API_URL.to_string(),
        }
    }
}

pub struct ApiState {
    pub config: ApiConfig,
    pub client: Client,
    pub token: String,
    pub token_expire: i64,
    pub initialized: bool,
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
    pub expire_time: Option<String>,
    pub expire_ts: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeartbeatResult {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimpleResult {
    pub success: bool,
    pub message: String,
}

static API_STATE: OnceCell<Mutex<ApiState>> = OnceCell::new();

pub fn state() -> &'static Mutex<ApiState> {
    API_STATE.get_or_init(|| {
        Mutex::new(ApiState {
            config: ApiConfig::default(),
            client: Client::new(),
            token: String::new(),
            token_expire: 0,
            initialized: false,
        })
    })
}

pub async fn init_api() -> Result<(), String> {
    fn_init().await?;
    let mut state = state().lock().unwrap();
    state.initialized = true;
    Ok(())
}

pub async fn ensure_initialized() -> Result<(), String> {
    {
        let state = state().lock().unwrap();
        if state.initialized {
            return Ok(());
        }
    }
    init_api().await
}

async fn fn_init() -> Result<(), String> {
    let params = json!({
        "action": "getToken",
        "hwid": get_hwid(),
    });

    let result = call_api(params, false).await?;

    let token = result
        .get("token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Failed to get token: missing token in response".to_string())?;

    let expire = result
        .get("expire")
        .and_then(|v| v.as_i64())
        .unwrap_or_else(|| Utc::now().timestamp() + 3600);

    let mut state = state().lock().unwrap();
    state.token = token.to_string();
    state.token_expire = expire;
    Ok(())
}

pub fn get_hwid() -> String {
    let raw = get_raw_hwid();
    md5_hex(&raw)
}

fn get_raw_hwid() -> String {
    #[cfg(target_os = "windows")]
    {
        let output = std::process::Command::new("reg")
            .args(&[
                "query",
                "HKLM\\SOFTWARE\\Microsoft\\Cryptography",
                "/v",
                "MachineGuid",
            ])
            .output();
        if let Ok(output) = output {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    if line.contains("MachineGuid") {
                        if let Some(guid) = line.split_whitespace().last() {
                            return guid.to_string();
                        }
                    }
                }
            }
        }
        fallback_hwid()
    }
    #[cfg(target_os = "macos")]
    {
        let output = std::process::Command::new("ioreg")
            .args(&["-rd1", "-c", "IOPlatformExpertDevice"])
            .output();
        if let Ok(output) = output {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    if line.contains("IOPlatformUUID") {
                        if let Some(uuid) = line.split('=').nth(1) {
                            return uuid.trim().trim_matches('"').to_string();
                        }
                    }
                }
            }
        }
        fallback_hwid()
    }
    #[cfg(target_os = "linux")]
    {
        for path in &["/etc/machine-id", "/var/lib/dbus/machine-id"] {
            if let Ok(content) = std::fs::read_to_string(path) {
                let trimmed = content.trim().to_string();
                if !trimmed.is_empty() {
                    return trimmed;
                }
            }
        }
        fallback_hwid()
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        fallback_hwid()
    }
}

fn fallback_hwid() -> String {
    format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH)
}

pub async fn login_kami(kami: &str) -> Result<LoginResult, String> {
    ensure_initialized().await?;

    let params = json!({
        "action": "login",
        "kami": kami,
        "hwid": get_hwid(),
    });

    let result = call_api(params, true).await?;

    let success = result
        .get("code")
        .and_then(|v| v.as_i64())
        .map(|c| c == 200)
        .unwrap_or(false);

    let message = result
        .get("msg")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let expire_time = result
        .get("expire_time")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let expire_ts = result.get("expire_ts").and_then(|v| v.as_i64());

    Ok(LoginResult {
        success,
        message,
        expire_time,
        expire_ts,
    })
}

pub async fn heartbeat() -> Result<HeartbeatResult, String> {
    ensure_initialized().await?;

    let params = json!({
        "action": "heartbeat",
        "hwid": get_hwid(),
    });

    let result = call_api(params, true).await?;

    let success = result
        .get("code")
        .and_then(|v| v.as_i64())
        .map(|c| c == 200)
        .unwrap_or(false);

    let message = result
        .get("msg")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Ok(HeartbeatResult {
        success,
        message,
    })
}

pub async fn vip_data() -> Result<Value, String> {
    ensure_initialized().await?;

    let params = json!({
        "action": "vipData",
        "hwid": get_hwid(),
    });

    call_api(params, true).await
}

pub async fn delete_app_user_key(user: &str, password: &str) -> Result<SimpleResult, String> {
    ensure_initialized().await?;

    let params = json!({
        "action": "delete",
        "user": user,
        "password": password,
    });

    let result = call_api(params, true).await?;

    let success = result
        .get("code")
        .and_then(|v| v.as_i64())
        .map(|c| c == 200)
        .unwrap_or(false);

    let message = result
        .get("msg")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Ok(SimpleResult {
        success,
        message,
    })
}

pub fn rsa_encrypt(data: &[u8]) -> Vec<u8> {
    let pub_key =
        RsaPublicKey::from_public_key_pem(RSA_PUB_KEY).expect("Invalid RSA public key PEM");
    let mut rng = rand::thread_rng();
    pub_key
        .encrypt(&mut rng, Pkcs1v15Encrypt, data)
        .expect("RSA encryption failed")
}

pub fn rsa_decrypt(_data: &[u8]) -> Result<Vec<u8>, String> {
    Err("RSA decryption not available: no private key on client".to_string())
}

pub fn aes192_cbc_encrypt(data: &[u8], key: &[u8; 24], iv: &[u8; 16]) -> Vec<u8> {
    use aes::cipher::generic_array::GenericArray;

    let key_ga = GenericArray::from_slice(key);
    let iv_ga = GenericArray::from_slice(iv);

    let buf_len = data.len() + 16;
    let mut buf = vec![0u8; buf_len];
    buf[..data.len()].copy_from_slice(data);

    let encrypted = Aes192CbcEnc::new(key_ga, iv_ga)
        .encrypt_padded_mut::<Pkcs7>(&mut buf, data.len())
        .expect("AES encryption failed");

    encrypted.to_vec()
}

pub fn aes192_cbc_decrypt(data: &[u8], key: &[u8; 24], iv: &[u8; 16]) -> Result<Vec<u8>, String> {
    use aes::cipher::generic_array::GenericArray;

    let key_ga = GenericArray::from_slice(key);
    let iv_ga = GenericArray::from_slice(iv);

    let mut buf = data.to_vec();

    let decrypted = Aes192CbcDec::new(key_ga, iv_ga)
        .decrypt_padded_mut::<Pkcs7>(&mut buf)
        .map_err(|e| format!("AES decryption failed: {}", e))?;

    Ok(decrypted.to_vec())
}

pub fn md5_hex(data: &str) -> String {
    let mut hasher = Md5::new();
    hasher.update(data.as_bytes());
    hex::encode(hasher.finalize())
}

async fn call_api(params: Value, use_token: bool) -> Result<Value, String> {
    let (client, token) = {
        let state = state().lock().unwrap();
        (state.client.clone(), state.token.clone())
    };

    let url = {
        let state = state().lock().unwrap();
        format!("{}/api/v1/process", state.config.base_url)
    };

    let (aes_key, iv, body) = {
        let mut rng = rand::thread_rng();

        let mut aes_key = [0u8; 24];
        let mut iv = [0u8; 16];
        rng.fill_bytes(&mut aes_key);
        rng.fill_bytes(&mut iv);

        let plaintext =
            serde_json::to_string(&params).map_err(|e| format!("JSON serialization error: {}", e))?;

        let encrypted = aes192_cbc_encrypt(plaintext.as_bytes(), &aes_key, &iv);
        let data_b64 = general_purpose::STANDARD.encode(&encrypted);

        let encrypted_key = rsa_encrypt(&aes_key);
        let key_b64 = general_purpose::STANDARD.encode(&encrypted_key);

        let iv_b64 = general_purpose::STANDARD.encode(&iv);

        let mut body = json!({
            "data": data_b64,
            "key": key_b64,
            "iv": iv_b64,
            "crypto_type": 3,
        });

        if use_token {
            let sign_str = format!("{}{}{}", data_b64, key_b64, iv_b64);
            let sign = md5_hex(&sign_str);
            body["token"] = json!(token);
            body["sign"] = json!(sign);
        }

        (aes_key, iv, body)
    };

    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let resp_status = response.status();
    let resp_json: Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response JSON: {}", e))?;

    if !resp_status.is_success() {
        let msg = resp_json
            .get("msg")
            .and_then(|v| v.as_str())
            .unwrap_or("Request failed");
        return Err(msg.to_string());
    }

    if let Some(resp_data) = resp_json.get("data").and_then(|v| v.as_str()) {
        let encrypted_resp = general_purpose::STANDARD
            .decode(resp_data)
            .map_err(|e| format!("Base64 decode failed: {}", e))?;

        let decrypted = aes192_cbc_decrypt(&encrypted_resp, &aes_key, &iv)?;

        let dec_str =
            String::from_utf8(decrypted).map_err(|e| format!("UTF-8 decode failed: {}", e))?;

        let result: Value =
            serde_json::from_str(&dec_str).map_err(|e| format!("JSON parse failed: {}", e))?;

        Ok(result)
    } else {
        Ok(resp_json)
    }
}

pub fn ensure_storage_dir(app: &tauri::AppHandle) -> PathBuf {
    use tauri::Manager;
    let dir = app
        .path()
        .app_config_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    let _ = fs::create_dir_all(&dir);
    dir
}

pub fn kami_file_path(app: &tauri::AppHandle) -> PathBuf {
    ensure_storage_dir(app).join("kami_bind.json")
}

pub fn save_kami_info(app: &tauri::AppHandle, info: &KamiInfo) {
    let path = kami_file_path(app);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(info) {
        let _ = fs::write(&path, json);
    }
}

pub fn load_kami_info(app: &tauri::AppHandle) -> Option<KamiInfo> {
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
pub async fn check_auth_status(app_handle: tauri::AppHandle) -> Result<String, String> {
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
pub async fn bind_kami(app_handle: tauri::AppHandle, kami: String) -> Result<KamiInfo, String> {
    let result = login_kami(&kami).await?;
    if result.success {
        let info = KamiInfo {
            kami: kami.clone(),
            expire_time: result.expire_time.clone(),
            expire_ts: result.expire_ts,
            last_check_time: Some(Utc::now().timestamp()),
        };
        save_kami_info(&app_handle, &info);
        Ok(info)
    } else {
        Err(result.message)
    }
}

#[tauri::command]
pub async fn unbind_kami(app_handle: tauri::AppHandle) -> Result<(), String> {
    let path = kami_file_path(&app_handle);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to remove kami file: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn load_kami_info_cmd(app_handle: tauri::AppHandle) -> Result<Option<KamiInfo>, String> {
    Ok(load_kami_info(&app_handle))
}
