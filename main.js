const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const log = require("electron-log");
const fs = require("fs");
const dotenv = require('dotenv');

log.transports.file.level = "debug";
log.transports.console.level = "debug";

const isDev = process.env.NODE_ENV === "development";
const os = require("os");

const envPath = isDev ? '.env' : path.join(process.resourcesPath, '.env');
dotenv.config({ path: envPath });

const PRELOAD_PATH = isDev
  ? path.join(__dirname, "preload.js")
  : path.join(process.resourcesPath, "preload.js");

const SPLASH_PATH = isDev
  ? path.join(__dirname, "splash.html")
  : path.join(process.resourcesPath, "splash.html");

const ICON_PATH = isDev
  ? path.join(__dirname, "src", "assets", "icon.ico")
  : path.join(process.resourcesPath, "build", "icon.ico");

let mainWindow = null;
let tray = null;
let splashWindow = null;

function createSplashWindow() {
  try {
    splashWindow = new BrowserWindow({
      width: 400,
      height: 400,
      frame: false,
      transparent: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      center: true,
      icon: ICON_PATH
    });

    splashWindow.loadFile(SPLASH_PATH).catch((err) => {
      log.error("Error loading splash window:", err);
    });

    return splashWindow;
  } catch (error) {
    log.error("Error in createSplashWindow:", error);
    return null;
  }
}

function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      frame: false,
      show: false,
      icon: ICON_PATH,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        enableRemoteModule: true,
        preload: PRELOAD_PATH,
        webSecurity: false,
      },
      backgroundColor: '#ffffff',
    });

    if (isDev) {
      mainWindow.loadURL("http://localhost:5173");
      mainWindow.webContents.openDevTools();
    } else {
      try {
        const indexPath = path.join(process.resourcesPath, 'dist', 'index.html');

        if (!fs.existsSync(indexPath)) {
          log.error("index.html not found at:", indexPath);
          throw new Error("index.html not found");
        }

        mainWindow.loadFile(indexPath).catch((err) => {
          log.error("Error loading index.html:", err);
          mainWindow.webContents.openDevTools();
        });
      } catch (err) {
        log.error("Error in production load:", err);
        mainWindow.webContents.openDevTools();
      }
    }

    return mainWindow;
  } catch (error) {
    log.error("Error in createWindow:", error);
    return null;
  }
}

function createTray() {
  try {
    if (tray) {
      return;
    }

    try {
      tray = new Tray(ICON_PATH);
    } catch (error) {
      console.error("[error] Failed to create tray:", error);
    }

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show App",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
          } else {
            log.error("mainWindow is null in tray show click");
          }
        },
      },
      {
        label: "Quit",
        click: () => {
          if (mainWindow) {
            mainWindow.destroy();
          }
          app.quit();
        },
      },
    ]);

    tray.setToolTip("Telegram Session Manager");
    tray.setContextMenu(contextMenu);

    tray.on("click", () => {
      if (mainWindow) {
        mainWindow.show();
      } else {
        log.error("mainWindow is null in tray click");
      }
    });

  } catch (error) {
    log.error("Error in createTray:", error);
  }
}

const databasePath = isDev
  ? path.join(__dirname, "src", "database")
  : path.join(__dirname, "src", "database");

const connectDB = require(databasePath);

const SessionImporter = require("./src/utils/SessionImporter");
const inviteManager = require("./src/utils/InviteManager");
const licenseManager = require("./src/utils/LicenseManager");
const videoManager = require("./src/utils/VideoManager");
const emojiManager = require("./src/utils/EmojiManager");
const sessionManager = require("./src/utils/SessionManager");

function setupIpcHandlers() {
  ipcMain.handle("get-system-info", () => {
    return {
      platform: os.platform(),
      arch: os.arch(),
      version: os.version(),
      release: os.release(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus(),
      hostname: os.hostname(),
      userInfo: os.userInfo(),
      uptime: os.uptime(),
    };
  });

  ipcMain.handle("get-ip-address", () => {
    const nets = os.networkInterfaces();
    let ip = "Bilinmiyor";

    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === "IPv4" && !net.internal) {
          ip = net.address;
          break;
        }
      }
    }

    return { ip };
  });

  ipcMain.handle("get-app-version", () => {
    return app.getVersion();
  });

  ipcMain.handle("check-for-updates", async () => {
    try {
      if (!app.isPackaged) {
        return {
          success: false,
          message: "Geliştirme modunda güncelleme kontrolü yapılamaz",
        };
      }
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (error) {
      log.error("Manuel güncelleme kontrolü hatası:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("start-update", async () => {
    return { success: true };
  });

  ipcMain.handle("window-minimize", () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
  });

  ipcMain.handle("window-maximize", () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.handle("window-close", () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.hide();
      win.webContents.send("app-closing");
      setTimeout(() => {
        win.close();
      }, 100);
    }
  });

  ipcMain.on("window-is-maximized", (event) => {
    event.returnValue = mainWindow.isMaximized();
  });

  ipcMain.handle("validate-license", async (_, key) => {
    return await licenseManager.validateLicense(key);
  });

  ipcMain.handle("get-license", async () => {
    try {
      const storedKey = licenseManager.store.get("currentLicense");

      if (!storedKey) {
        return null;
      }

      const result = await licenseManager.validateLicense(storedKey);

      if (!result.valid) {
        return null;
      }

      return result.license;
    } catch (error) {
      return null;
    }
  });

  ipcMain.handle("logout", async () => {
    licenseManager.store.delete("currentLicense");
    return true;
  });

  ipcMain.handle("create-license", async (_, type, months, customKey) => {
    return await licenseManager.createLicense(type, months, customKey);
  });

  ipcMain.handle("get-all-licenses", async () => {
    return await licenseManager.getAllLicenses();
  });

  ipcMain.handle("store-license", async (_, key) => {
    try {
      const result = await licenseManager.storeLicense(key);
      if (!result.success) {
        return { success: false, message: result.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("delete-license", async (_, key) => {
    try {
      await licenseManager.deleteLicense(key);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("deactivate-license", async (_, key) => {
    try {
      await licenseManager.deactivateLicense(key);
      await licenseManager.clearStoredLicense();

      return { success: true, message: "Lisans deaktif edildi" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("login-with-session", async () => {
    try {
      const result = await sessionManager.loginWithSessions();
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle(
    "fetch-members",
    async (_, targetGroup, sourceGroup, fetchMethod) => {
      try {
        await inviteManager.loginWithSessions();
        const result = await inviteManager.fetchMembers(
          targetGroup,
          sourceGroup,
          fetchMethod
        );
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  );

  ipcMain.handle("start-invite", async (_, targetGroup, members, limit) => {
    try {
      await inviteManager.loginWithSessions();
      const result = await inviteManager.inviteUsers(
        targetGroup,
        members,
        limit
      );

      mainWindow.webContents.send("invite-progress", {
        success: result.success,
        finished: true,
        message: result.message,
      });

      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("stop-invite", () => {
    try {
      inviteManager.stopInviteSystem();
      mainWindow.webContents.send("invite-progress", {
        success: true,
        finished: true,
        message: "Davet işlemi durduruldu",
      });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("get-sessions", async () => {
    try {
      const sessions = await sessionManager.getSessions();
      return { success: true, sessions };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("delete-session", async (_, sessionId) => {
    try {
      const result = await sessionManager.deleteSession(sessionId);

      if (result.success) {
        return { success: true };
      } else return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("import-sessions", async (event, filePaths) => {
    try {
      const sessionImporter = new SessionImporter();

      if (!Array.isArray(filePaths) || filePaths.length === 0) {
        throw new Error("Dosya seçilmedi");
      }

      if (filePaths.some((path) => !path || typeof path !== "string")) {
        throw new Error("Geçersiz dosya yolu");
      }

      const result = await sessionImporter.importMultipleSessions(
        filePaths,
        (progress) => {
          event.sender.send("import-progress", progress);
        }
      );

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("deleteSession", async (_, sessionId) => {
    try {
      await sessionManager.deleteSession(sessionId);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("startInvite", async (event, targetGroup, members, limit) => {
    try {
      await inviteManager.loginWithSessions();
      const progressCallback = (progress) => {
        event.sender.send("invite-progress", progress);

        if (progress.finished) {
          event.sender.send("invite-completed", {
            success: progress.success,
            fail: progress.fail,
          });
        }
      };

      const result = await inviteManager.inviteUsers(
        targetGroup,
        members,
        limit,
        progressCallback
      );
      return { success: true, ...result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("check-sessions", async () => {
    try {
      const sessions = await sessionManager.getSessions();
      const sessionImporter = new SessionImporter();

      const results = await sessionImporter.checkMultipleSessions(
        sessions,
        (progress) => {
          mainWindow.webContents.send("check-progress", progress);
        }
      );

      return {
        success: true,
        results,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  ipcMain.handle("show-open-dialog", async (_, options) => {
    const result = await dialog.showOpenDialog(options);

    return result;
  });

  ipcMain.handle("get-reaction-log", () => {
    try {
      return {
        success: true,
        log: emojiManager.getReactionLog(),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-system-status", () => {
    try {
      return {
        success: true,
        isRunning: emojiManager.isListening,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("getReactionChannels", async () => {
    try {
      const result = await emojiManager.getChannels();
      if (result.success) {
        return { success: true, channels: result.channels };
      } else return { success: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-emoji-list", async () => {
    try {
      const result = await emojiManager.getEmojiList();
      if (result.success) {
        return { success: true, emojis: result.emojis };
      } else return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("add-emoji", async (_, emoji) => {
    try {
      const result = await emojiManager.addEmoji(emoji);
      if (result.success) {
        return { success: true, emojis: result.emojis };
      } else return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("remove-emoji", async (_, emoji) => {
    try {
      const result = await emojiManager.removeEmoji(emoji);
      if (result.success) return { success: true, emojis: result.emojis };
      else return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("addReactionChannel", async (_, channelData) => {
    try {
      const result = await emojiManager.addChannel(channelData);
      if (result.success) return { success: true };
      else return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("removeReactionChannel", async (_, channelId) => {
    try {
      const result = await emojiManager.removeChannel(channelId);
      if (result) return { success: true };
      else return { success: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("updateChannelStatus", async (_, { channelId, active }) => {
    try {
      const result = await emojiManager.updateChannel(channelId, { active });

      if (!result) {
        throw new Error("Kanal bulunamadı");
      }

      const channels = await emojiManager.getChannels();
      await emojiManager.updateChannelStatus(channels);

      return { success: true, channels: channels.toObject() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("startReactionSystem", async (_, channels) => {
    try {
      const result = await emojiManager.startListening(channels);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("stopReactionSystem", async () => {
    try {
      const result = await emojiManager.stopListening();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("save-video", async (_, data) => {
    try {
      return await videoManager.saveVideo(data);
    } catch (error) {
      console.error("Video kaydetme hatası:", error);
      throw error;
    }
  });

  ipcMain.handle("get-all-videos", async () => {
    try {
      return await videoManager.getAllVideos();
    } catch (error) {
      console.error("Video listesi alma hatası:", error);
      throw error;
    }
  });

  ipcMain.handle("delete-video", async (_, channelId, videoId) => {
    try {
      return await videoManager.deleteVideo(channelId, videoId);
    } catch (error) {
      console.error("Video silme hatası:", error);
      throw error;
    }
  });

  ipcMain.handle("get-scheduler-times", async () => {
    try {
      const times = await videoManager.getTimes();
      return times;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle("save-scheduler-times", async (_, times) => {
    try {
      const savedTimes = await videoManager.saveTimes(times);
      return savedTimes;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle("get-scheduler-status", async () => {
    try {
      return await videoManager.getSchedulerStatus();
    } catch (error) {
      console.error("Zamanlayıcı durumu alma hatası:", error);
      throw error;
    }
  });

  ipcMain.handle("start-scheduler", async () => {
    try {
      return await videoManager.startScheduler();
    } catch (error) {
      console.error("Zamanlayıcı başlatma hatası:", error);
      throw error;
    }
  });

  ipcMain.handle("stop-scheduler", async () => {
    try {
      return await videoManager.stopScheduler();
    } catch (error) {
      console.error("Zamanlayıcı durdurma hatası:", error);
      throw error;
    }
  });

  ipcMain.handle("get-telegram-settings", async () => {
    try {
      return await videoManager.getTelegramSettings();
    } catch (error) {
      console.error("Error getting Telegram settings:", error);
      throw error;
    }
  });

  ipcMain.handle("save-telegram-settings", async (event, settings) => {
    try {
      return await videoManager.saveTelegramSettings(settings);
    } catch (error) {
      console.error("Error saving Telegram settings:", error);
      throw error;
    }
  });

  ipcMain.handle("get-invite-progress", async () => {
    try {
      return inviteManager.inviteSystem.progress;
    } catch (error) {
      console.error("Error getting invite progress:", error);
      return null;
    }
  });

  if (!isDev) {
    autoUpdater.autoDownload = false;
    autoUpdater.allowDowngrade = true;
    autoUpdater.allowPrerelease = false;

    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'ibrwhm',
      repo: 'react-electron',
      private: false
    });

    // Hata durumunda kullanıcıya bilgi ver
    autoUpdater.on('error', (error) => {
      log.error('Güncelleme hatası:', error);
      if (mainWindow) {
        mainWindow.webContents.send('update-error', {
          message: 'Güncelleme indirilirken bir hata oluştu',
          error: error.message
        });
      }
    });

    // İndirme başlamadan önce kontrol
    autoUpdater.on('update-available', async (info) => {
      try {
        // Release dosyasının varlığını kontrol et
        const releaseUrl = `https://github.com/ibrwhm/react-electron/releases/download/v${info.version}/Telegram.Manager.Setup.${info.version}.exe`;

        if (mainWindow) {
          mainWindow.webContents.send('update-available', {
            version: info.version,
            releaseNotes: info.releaseNotes,
            releaseUrl
          });
        }
      } catch (error) {
        log.error('Güncelleme kontrolü hatası:', error);
      }
    });

    // Her saat başı güncelleme kontrolü
    setInterval(() => {
      try {
        autoUpdater.checkForUpdates();
      } catch (error) {
        log.error('Periyodik güncelleme kontrolü hatası:', error);
      }
    }, 60 * 60 * 1000);

    autoUpdater.on('download-progress', (progressObj) => {
      if (mainWindow) {
        mainWindow.webContents.send('download-progress', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', () => {
      if (mainWindow) {
        mainWindow.webContents.send('update-downloaded');
      }
    });

    ipcMain.handle('start-update-download', () => {
      autoUpdater.downloadUpdate();
    });

    ipcMain.handle('quit-and-install', () => {
      autoUpdater.quitAndInstall();
    });
  }
};

app.whenReady().then(async () => {
  try {
    splashWindow = createSplashWindow();
    if (!splashWindow) {
      throw new Error("Failed to create splash window");
    }

    mainWindow = createWindow();
    if (!mainWindow) {
      throw new Error("Failed to create main window");
    }

    mainWindow.webContents.on('did-finish-load', async () => {
      if (!isDev) {
        autoUpdater.autoDownload = true;
        autoUpdater.allowDowngrade = true;
        autoUpdater.allowPrerelease = false;

        autoUpdater.setFeedURL({
          provider: 'github',
          owner: 'ibrwhm',
          repo: 'react-electron',
          private: false
        });

        autoUpdater.on('checking-for-update', () => {
          if (splashWindow) {
            splashWindow.webContents.send('update-status', 'Güncellemeler kontrol ediliyor...');
          }
        });

        autoUpdater.on('update-available', (info) => {
          if (splashWindow) {
            splashWindow.webContents.send('update-status', `Yeni sürüm bulundu: ${info.version}`);
          }
        });

        autoUpdater.on('update-not-available', () => {
          if (splashWindow) {
            splashWindow.webContents.send('update-status', 'Uygulama güncel');
            setTimeout(() => {
              splashWindow.destroy();
              if (mainWindow) mainWindow.show();
            }, 1000);
          }
        });

        autoUpdater.on('error', (err) => {
          log.error('Güncelleme hatası:', err);
          if (splashWindow) {
            splashWindow.webContents.send('update-status', 'Güncelleme hatası');
            setTimeout(() => {
              splashWindow.destroy();
              if (mainWindow) mainWindow.show();
            }, 1000);
          }
        });

        autoUpdater.on('download-progress', (progressObj) => {
          if (splashWindow) {
            splashWindow.webContents.send('update-status', `İndiriliyor... ${progressObj.percent.toFixed(2)}%`);
          }
        });

        autoUpdater.on('update-downloaded', () => {
          if (splashWindow) {
            splashWindow.webContents.send('update-status', 'Güncelleme hazır, yeniden başlatılıyor...');
            setTimeout(() => {
              autoUpdater.quitAndInstall();
            }, 1000);
          }
        });

        try {
          await autoUpdater.checkForUpdates();
        } catch (updateError) {
          log.error('Güncelleme kontrolü hatası:', updateError);
          if (splashWindow) splashWindow.destroy();
          if (mainWindow) mainWindow.show();
        }
      } else {
        setTimeout(() => {
          if (splashWindow) splashWindow.destroy();
          if (mainWindow) mainWindow.show();
        }, 1000);
      }
    });

    connectDB().catch((dbError) => {
      log.error("Database connection error:", dbError);
    });

    setupIpcHandlers();

    try {
      createTray();
    } catch (trayError) {
      log.error("Tray creation error:", trayError);
    }

  } catch (error) {
    log.error("Error in app.whenReady:", error);
    if (splashWindow) splashWindow.destroy();
    if (mainWindow) mainWindow.show();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (tray) {
    tray.destroy();
  }
});
