const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require("electron");
const { autoUpdater } = require("electron-updater");
const { initialize, enable } = require("@electron/remote/main");
const path = require("path");
const log = require("electron-log");
const fs = require("fs");
const dotenv = require("dotenv");

initialize();

app.commandLine.appendSwitch("disable-http-cache", "true");
app.commandLine.appendSwitch("ignore-gpu-blacklist", "true");
app.commandLine.appendSwitch("enable-gpu-rasterization", "true");
app.commandLine.appendSwitch("enable-zero-copy", "true");

log.transports.file.level = "debug";
log.transports.console.level = "debug";

const isDev = process.env.NODE_ENV === "development";
const os = require("os");

const envPath = isDev ? ".env" : path.join(app.getAppPath(), ".env");
dotenv.config({ path: envPath });

const PRELOAD_PATH = isDev
  ? path.join(__dirname, "preload.js")
  : path.join(app.getAppPath(), "preload.js");

const SPLASH_PATH = isDev
  ? path.join(__dirname, "splash.html")
  : path.join(app.getAppPath(), "splash.html");

const ICON_PATH = isDev
  ? path.join(__dirname, "build", "icon.ico")
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
        backgroundThrottling: false,
      },
      center: true,
      icon: ICON_PATH,
      show: true,
    });

    enable(splashWindow.webContents);
    splashWindow.loadFile(SPLASH_PATH);

    return splashWindow;
  } catch (error) {
    log.error("Splash ekranı oluşturma hatası:", error);
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
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: true,
        preload: PRELOAD_PATH,
        webSecurity: false,
        backgroundThrottling: false,
        spellcheck: false,
        sandbox: false,
        additionalArguments: [
          `--notification-sound-path=${path.join(
            process.resourcesPath,
            "app",
            "notification.wav"
          )}`,
        ],
      },
      backgroundColor: "#1a1b1e",
    });

    enable(mainWindow.webContents);

    mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
    mainWindow.webContents.setZoomFactor(1);

    setInterval(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.session.clearCache();
      }
    }, 1000 * 60 * 30);

    if (isDev) {
      mainWindow.loadURL("http://localhost:5173");
      mainWindow.webContents.openDevTools();
    } else {
      try {
        const indexPath = path.join(process.resourcesPath, "app", "index.html");

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

    mainWindow.once("ready-to-show", () => {
      splashWindow?.destroy();
      mainWindow.show();
      mainWindow.focus();
    });

    return mainWindow;
  } catch (error) {
    log.error("Error in createWindow:", error);
    return null;
  }
}

function createTray() {
  try {
    if (tray && !tray.isDestroyed()) {
      tray.destroy();
    }

    const trayIconPath = ICON_PATH;
    if (!fs.existsSync(trayIconPath)) {
      return;
    }

    try {
      tray = new Tray(trayIconPath);
    } catch (error) {
      return;
    }

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Göster",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: "Çıkış",
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
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });

    tray.on("double-click", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    if (!tray || tray.isDestroyed()) {
      log.error("Tray creation failed or tray was destroyed");
      createTray();
    }
  } catch (error) {
    log.error("Error in createTray:", error);
  }
}

ipcMain.on("recreate-tray", () => {
  try {
    if (tray && !tray.isDestroyed()) {
      tray.destroy();
    }
    createTray();
  } catch (error) {
    log.error("Error recreating tray:", error);
  }
});

ipcMain.on("maintain-tray", () => {
  if (!tray || tray.isDestroyed()) {
    createTray();
  }
});

const databasePath = isDev
  ? path.join(__dirname, "src", "database")
  : path.join(__dirname, "src", "database");

const { connectDB } = require(databasePath);

const SessionImporter = require("./src/utils/SessionImporter");
const inviteManager = require("./src/utils/InviteManager");
const licenseManager = require("./src/utils/LicenseManager");
const videoManager = require("./src/utils/VideoManager");
const emojiManager = require("./src/utils/EmojiManager");
const sessionManager = require("./src/utils/SessionManager");
const channelManager = require("./src/utils/ChannelManager");

function setupAutoUpdater() {
  if (!isDev) {
    autoUpdater.autoDownload = true;
    autoUpdater.allowDowngrade = false;
    autoUpdater.allowPrerelease = false;

    autoUpdater.setFeedURL({
      provider: "github",
      owner: "ibrwhm",
      repo: "react-electron",
      private: false,
    });

    autoUpdater.on("checking-for-update", () => {
      log.info("Güncellemeler kontrol ediliyor...");
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send(
          "update-status",
          "Güncellemeler kontrol ediliyor..."
        );
      }
    });

    autoUpdater.on("update-available", (info) => {
      log.info("Yeni güncelleme bulundu:", info.version);
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send(
          "update-status",
          "Güncelleme indiriliyor..."
        );
      }
    });

    autoUpdater.on("download-progress", (progressObj) => {
      const message = `İndiriliyor ${progressObj.percent.toFixed(2)}%`;
      log.info(message);
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send("update-status", message);
      }
    });
  }
}

function setupIpcHandlers() {
  const windowHandlers = {
    "window-minimize": () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win) win.minimize();
    },
    "window-maximize": () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
    },
    "window-hide": () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win) {
        win.hide();
      }
    },
  };

  const systemHandlers = {
    "get-system-info": async () => {
      try {
        const platform = os.platform();
        const osInfo =
          {
            win32: `Windows ${os.release()}`,
            darwin: `macOS ${os.release()}`,
            linux: `Linux ${os.release()}`,
          }[platform] || `${platform} ${os.release()}`;

        return {
          success: true,
          data: {
            os: osInfo,
            platform,
            arch: os.arch(),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            cpus: os.cpus(),
            uptime: os.uptime(),
          },
        };
      } catch (error) {
        log.error("Sistem bilgisi alınırken hata:", error);
        return { success: false, error: error.message };
      }
    },
    "get-ip-address": async () => {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        return { success: true, data: { ip: data.ip } };
      } catch (error) {
        log.error("IP adresi alınamadı:", error);
        return {
          success: false,
          data: { ip: "Bilinmiyor" },
          error: error.message,
        };
      }
    },
    "get-app-version": async () => {
      try {
        const version = app.getVersion();
        return { success: true, data: { version } };
      } catch (error) {
        log.error("Uygulama versiyonu alınamadı:", error);
        return { success: false, error: error.message };
      }
    },
  };

  const licenseHandlers = {
    "get-license": async () => {
      try {
        const storedKey = licenseManager.store.get("currentLicense");

        if (!storedKey) {
          return { success: false, message: "Kayıtlı lisans bulunamadı" };
        }

        const result = await licenseManager.validateLicense(storedKey);

        if (!result.success) {
          return {
            success: false,
            message: result.message || "Lisans doğrulanamadı",
          };
        }

        return {
          success: true,
          data: result.data,
        };
      } catch (error) {
        console.error("Lisans kontrol hatası:", error);
        return {
          success: false,
          message: error.message || "Lisans kontrolü sırasında bir hata oluştu",
        };
      }
    },
    "create-license": async (_, type, months, customKey) => {
      return await licenseManager.createLicense(type, months, customKey);
    },
    "get-all-licenses": async () => {
      return await licenseManager.getAllLicenses();
    },
    "validate-license": async (_, key) => {
      return await licenseManager.validateLicense(key);
    },
    "delete-license": async (_, key) => {
      try {
        await licenseManager.deleteLicense(key);
        return { success: true };
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    "deactive-license": async (_, key) => {
      try {
        await licenseManager.deactivateLicense(key);
        await licenseManager.clearStoredLicense();

        return { success: true, message: "Lisans deaktif edildi" };
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    "store-license": async (_, key) => {
      try {
        await licenseManager.initStore();

        const validationResult = await licenseManager.validateLicense(key);

        if (!validationResult.success) {
          return {
            success: false,
            message: validationResult.message || "Lisans doğrulanamadı",
          };
        }

        licenseManager.store.set("currentLicense", key);

        return {
          success: true,
          message: "Lisans başarıyla kaydedildi",
        };
      } catch (error) {
        console.error("Lisans kaydetme hatası:", error);
        return {
          success: false,
          message: error.message || "Lisans kaydedilirken bir hata oluştu",
        };
      }
    },
    "login-with-session": async () => {
      try {
        return await sessionManager.loginWithSessions();
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    logout: async () => {
      try {
        await licenseManager.store.delete("currentLicense");
        return true;
      } catch (error) {
        return false;
      }
    },
  };

  const emojiHandlers = {
    "get-reaction-log": () => ({
      success: true,
      log: emojiManager.getReactionLog(),
    }),
    "get-system-status": () => ({
      success: true,
      isRunning: emojiManager.isListening,
    }),
    "get-emoji-list": async () => {
      const result = await emojiManager.getEmojiList();
      return result.success
        ? { success: true, emojis: result.emojis }
        : { success: false, error: result.error };
    },
    "add-emoji": async (_, emoji) => {
      try {
        const result = await emojiManager.addEmoji(emoji);

        return result.success
          ? { success: true, emojis: result.emojis }
          : { success: false, error: result.error };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    "remove-emoji": async (_, emoji) => {
      try {
        const result = await emojiManager.removeEmoji(emoji);

        return result.success
          ? { success: true, emojis: result.emojis }
          : { success: false, error: result.error };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    "get-channel-list": async () => {
      try {
        const result = await emojiManager.getChannels();

        return result.success
          ? { success: true, channels: result.channels }
          : { success: false, error: result.error };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    "add-channel": async (_, channelData) => {
      try {
        const result = await emojiManager.addChannel(channelData);

        return result.success
          ? { success: true }
          : { success: false, error: result.error };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    "remove-channel": async (_, channelId) => {
      try {
        const result = await emojiManager.removeChannel(channelId);

        return result.success
          ? { success: true }
          : { success: false, error: result.error };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    "update-channel-status": async (_, { channelId, active }) => {
      try {
        const result = await emojiManager.updateChannelStatus({
          channelId,
          active,
        });

        return result.success
          ? { success: true, channels: result.channels }
          : { success: false, error: result.error };
      } catch (error) {
        return {
          success: false,
          error: error.message || "Kanal durumu güncellenirken bir hata oluştu",
        };
      }
    },
    "start-reaction-system": async (_, channels) => {
      try {
        return await emojiManager.startListening(channels);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    "stop-reaction-system": async () => {
      try {
        return await emojiManager.stopListening();
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  };

  const videoHandlers = {
    "save-video": async (_, data) => {
      try {
        const result = await videoManager.saveVideo(data);
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    "save-scheduler-times": async (_, times) => {
      try {
        return await videoManager.saveTimes(times);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    "get-all-videos": async () => {
      return await videoManager.getAllVideos();
    },
    "delete-video": async (_, channelId, videoId) => {
      return await videoManager.deleteVideo(channelId, videoId);
    },
    "get-scheduler-status": async () => {
      return await videoManager.getSchedulerStatus();
    },
    "get-scheduler-times": async () => {
      return await videoManager.getTimes();
    },
    "start-scheduler": async () => {
      return await videoManager.startScheduler();
    },
    "stop-scheduler": async () => {
      return await videoManager.stopScheduler();
    },
    "get-upload-progress": async () => {
      return await videoManager.getUploadProgress();
    },
    "get-telegram-settings": async () => {
      return await videoManager.getTelegramSettings();
    },
    "save-telegram-settings": async (_, settings) => {
      return await videoManager.saveTelegramSettings(settings);
    },
  };

  const updateHandlers = {
    "check-for-updates": async () => {
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
        return { success: false, message: error.message };
      }
    },
    "start-update": async () => {
      return { success: true };
    },
    "start-update-download": async () => {
      autoUpdater.downloadUpdate();
    },
    "quit-and-install": async () => {
      autoUpdater.quitAndInstall();
    },
  };

  const inviteHandlers = {
    "fetch-members": async (_, targetGroup, sourceGroup, fetchMethod) => {
      try {
        await inviteManager.loginWithSessions();
        return await inviteManager.fetchMembers(
          targetGroup,
          sourceGroup,
          fetchMethod
        );
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    "start-invite": async (_, targetGroup, members, limit) => {
      try {
        await inviteManager.loginWithSessions();
        await inviteManager.inviteUsers(targetGroup, members, limit);
        return { success: true };
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    "stop-invite": async () => {
      try {
        inviteManager.stopInviteSystem();
        return { success: true };
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    "get-invite-progress": async () => {
      try {
        return {
          success: inviteManager.inviteSystem.progress.success,
          fail: inviteManager.inviteSystem.progress.fail,
          finished: !inviteManager.inviteSystem.isActive,
          message: inviteManager.inviteSystem.message || "",
        };
      } catch (error) {
        return null;
      }
    },
  };

  const sessionHandler = {
    "get-sessions": async () => {
      try {
        const sessions = await sessionManager.getSessions();
        return { success: true, sessions };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    "delete-session": async (_, sessionId) => {
      try {
        const result = await sessionManager.deleteSession(sessionId);
        return result.success
          ? { success: true }
          : { success: false, error: result.error };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    "import-sessions": async (event, filePaths) => {
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
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("import-progress", progress);
            }
          }
        );

        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    "check-sessions": async () => {
      try {
        const sessionImporter = new SessionImporter();
        const sessions = await sessionManager.getSessions();

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
    },
  };

  const channelHandlers = {
    "join-channel": async (_, channelName) => {
      try {
        const results = await channelManager.joinChannel(channelName);

        if (results.failed > 0 && results.success === 0) {
          return {
            failed: results.failed,
            success: results.success,
            error: results.errors[0]?.error || "Bilinmeyen Hata!",
          };
        }

        return results;
      } catch (error) {
        throw error;
      }
    },
    "leave-channel": async (_, channelName) => {
      try {
        const results = await channelManager.leaveChannel(channelName);

        if (results.failed > 0 && results.success === 0) {
          return {
            failed: results.failed,
            success: results.success,
            error: results.errors[0]?.error || "Bilinmeyen Hata!",
          };
        }

        return results;
      } catch (error) {
        throw error;
      }
    },
    "leave-all-channels": async () => {
      try {
        const results = await channelManager.leaveAllChannels();

        if (results.failed > 0 && results.success === 0) {
          return {
            failed: results.failed,
            success: results.success,
            error: results.errors[0]?.error || "Bilinmeyen Hata!",
          };
        }

        return results;
      } catch (error) {
        throw error;
      }
    },
  };

  const handleIpcError = (channel, error) => {
    log.error(`Hata (${channel}):`, error);
    return {
      success: false,
      error: error.message || "Bilinmeyen bir hata oluştu",
    };
  };

  const registerHandlers = (handlers, category) => {
    Object.entries(handlers).forEach(([channel, handler]) => {
      ipcMain.handle(channel, async (...args) => {
        try {
          const result = await handler(...args);
          if (result && typeof result === "object" && "success" in result) {
            return result;
          }
          return { success: true, data: result };
        } catch (error) {
          return handleIpcError(`${category}:${channel}`, error);
        }
      });
    });
  };

  registerHandlers(windowHandlers, "window");
  registerHandlers(sessionHandler, "session");
  registerHandlers(systemHandlers, "system");
  registerHandlers(licenseHandlers, "license");
  registerHandlers(emojiHandlers, "emoji");
  registerHandlers(inviteHandlers, "invite");
  registerHandlers(updateHandlers, "update");
  registerHandlers(videoHandlers, "video");
  registerHandlers(channelHandlers, "channel");

  ipcMain.on("window-is-maximized", (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      event.returnValue = win ? win.isMaximized() : false;
    } catch (error) {
      log.error("Hata (window-is-maximized):", error);
      event.returnValue = false;
    }
  });

  ipcMain.handle("show-open-dialog", async (_, options) => {
    return await dialog.showOpenDialog(options);
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on("ready", async () => {
    try {
      splashWindow = createSplashWindow();

      if (!isDev) {
        setupAutoUpdater();
        splashWindow.webContents.send(
          "update-status",
          "Güncellemeler kontrol ediliyor..."
        );

        try {
          // Güncelleme kontrolü için Promise
          const updateCheck = new Promise((resolve, reject) => {
            autoUpdater.on("update-not-available", () => {
              log.info("Güncelleme yok");
              splashWindow.webContents.send(
                "update-status",
                "Güncelleme yok, uygulama başlatılıyor..."
              );
              resolve(false);
            });

            autoUpdater.on("update-downloaded", () => {
              log.info("Güncelleme indirildi, yükleniyor...");
              splashWindow.webContents.send(
                "update-status",
                "Güncelleme yükleniyor..."
              );
              setTimeout(() => {
                autoUpdater.quitAndInstall(true, true);
              }, 2000);
              resolve(true);
            });

            autoUpdater.on("error", (error) => {
              log.error("Güncelleme hatası:", error);
              splashWindow.webContents.send(
                "update-status",
                "Güncelleme hatası, devam ediliyor..."
              );
              resolve(false);
            });
          });

          await autoUpdater.checkForUpdates();
          const hasUpdate = await updateCheck;

          // Eğer güncelleme varsa, burada dur
          if (hasUpdate) return;
        } catch (error) {
          log.error("Güncelleme kontrolü hatası:", error);
          splashWindow.webContents.send(
            "update-status",
            "Güncelleme kontrolü başarısız, devam ediliyor..."
          );
        }
      }

      splashWindow.webContents.send(
        "update-status",
        "Veritabanına bağlanılıyor..."
      );

      try {
        await connectDB();
        splashWindow.webContents.send(
          "update-status",
          "MongoDB bağlantısı başarılı!"
        );
      } catch (error) {
        log.error("MongoDB bağlantı hatası:", error);
        dialog.showErrorBox(
          "Veritabanı Hatası",
          "MongoDB bağlantısı başarısız oldu. Uygulama kapatılıyor."
        );
        app.quit();
        return;
      }

      mainWindow = createWindow();
      mainWindow.hide();
      createTray();
      setupIpcHandlers();

      setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.destroy();
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
        }
      }, 1000);
    } catch (error) {
      log.error("Error in app ready:", error);
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.destroy();
      }
      app.quit();
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (tray) {
    tray.destroy();
  }
  app.isQuitting = true;
});
