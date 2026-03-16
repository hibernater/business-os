use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;

struct SidecarState {
    java: Mutex<Option<CommandChild>>,
    python: Mutex<Option<CommandChild>>,
}

#[tauri::command]
fn is_desktop() -> bool {
    true
}

#[tauri::command]
fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[tauri::command]
fn get_services_status(state: tauri::State<'_, SidecarState>) -> (bool, bool) {
    let java_ok = state.java.lock().unwrap().is_some();
    let python_ok = state.python.lock().unwrap().is_some();
    (java_ok, python_ok)
}

fn start_backend_services(app: &tauri::App) {
    let handle = app.handle().clone();

    // Start Java backend
    std::thread::spawn(move || {
        let shell = handle.shell();
        let project_root = handle
            .path()
            .resource_dir()
            .unwrap_or_else(|_| std::path::PathBuf::from("."));

        // Look for the Java jar relative to the project
        let java_dir = project_root
            .ancestors()
            .find(|p| p.join("backend-java").exists())
            .map(|p| p.join("backend-java"))
            .unwrap_or_else(|| std::path::PathBuf::from("../../backend-java"));

        let jar_path = java_dir
            .join("target")
            .join("business-os-0.0.1-SNAPSHOT.jar");

        if jar_path.exists() {
            match shell
                .command("java")
                .args(["-jar", jar_path.to_str().unwrap_or("")])
                .spawn()
            {
                Ok((_rx, child)) => {
                    let state = handle.state::<SidecarState>();
                    *state.java.lock().unwrap() = Some(child);
                    println!("[Business OS] Java backend started");
                }
                Err(e) => eprintln!("[Business OS] Failed to start Java backend: {}", e),
            }
        } else {
            println!(
                "[Business OS] Java jar not found at {:?}, assuming backend runs externally",
                jar_path
            );
        }

        // Start Python AI engine
        let ai_dir = project_root
            .ancestors()
            .find(|p| p.join("ai-engine").exists())
            .map(|p| p.join("ai-engine"))
            .unwrap_or_else(|| std::path::PathBuf::from("../../ai-engine"));

        let main_py = ai_dir.join("main.py");

        if main_py.exists() {
            match shell
                .command("python3")
                .args(["-u", main_py.to_str().unwrap_or("")])
                .spawn()
            {
                Ok((_rx, child)) => {
                    let state = handle.state::<SidecarState>();
                    *state.python.lock().unwrap() = Some(child);
                    println!("[Business OS] Python AI engine started");
                }
                Err(e) => eprintln!("[Business OS] Failed to start Python AI engine: {}", e),
            }
        } else {
            println!(
                "[Business OS] Python main.py not found at {:?}, assuming AI engine runs externally",
                main_py
            );
        }
    });
}

fn kill_services(state: &SidecarState) {
    if let Some(child) = state.java.lock().unwrap().take() {
        let _ = child.kill();
        println!("[Business OS] Java backend stopped");
    }
    if let Some(child) = state.python.lock().unwrap().take() {
        let _ = child.kill();
        println!("[Business OS] Python AI engine stopped");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(SidecarState {
            java: Mutex::new(None),
            python: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            is_desktop,
            get_platform,
            get_services_status
        ])
        .setup(|app| {
            // Start backend services
            start_backend_services(app);

            // Build tray menu
            let show_i = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "退出 Business OS", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Business OS — 你的企业数字孪生")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => {
                        let state = app.state::<SidecarState>();
                        kill_services(&state);
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Business OS");
}
