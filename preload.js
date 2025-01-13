const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  validateLicense: (key) => ipcRenderer.invoke("validate-license", key),
  getLicense: () => ipcRenderer.invoke("get-license"),
  logout: () => ipcRenderer.invoke("logout"),
  storeLicense: (key) => ipcRenderer.invoke("store-license", key),
  maintainTray: () => ipcRenderer.send("maintain-tray"),
  recreateTray: () => ipcRenderer.send("recreate-tray"),
  createLicense: (type, months, customKey) =>
    ipcRenderer.invoke("create-license", type, months, customKey),
  getAllLicenses: () => ipcRenderer.invoke("get-all-licenses"),
  deleteLicense: (key) => ipcRenderer.invoke("delete-license", key),
  deactivateLicense: (key) => ipcRenderer.invoke("deactivate-license", key),

  isMaximized: () => ipcRenderer.sendSync("window-is-maximized"),
  windowMinimize: () => ipcRenderer.invoke("window-minimize"),
  windowMaximize: () => ipcRenderer.invoke("window-maximize"),
  windowClose: () => ipcRenderer.invoke("window-close"),
  onAppClosing: (callback) => ipcRenderer.on("app-closing", callback),

  getSystemInfo: () => ipcRenderer.invoke("get-system-info"),
  getIpAddress: () => ipcRenderer.invoke("get-ip-address"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  startUpdate: () => ipcRenderer.invoke("start-update"),
  downloadUpdate: () => ipcRenderer.send("download-update"),
  onUpdateAvailable: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on("update-available", subscription);
    return () => {
      ipcRenderer.removeListener("update-available", subscription);
    };
  },
  onUpdateProgress: (callback) =>
    ipcRenderer.on("update-progress", (_, data) => callback(data)),
  removeUpdateProgressListener: () =>
    ipcRenderer.removeAllListeners("update-progress"),

  loginWithSession: () => ipcRenderer.invoke("login-with-session"),
  fetchMembers: (targetGroup, sourceGroup, fetchMethod) =>
    ipcRenderer.invoke("fetch-members", targetGroup, sourceGroup, fetchMethod),
  startInvite: async (targetGroup, members, limit, progressCallback) => {
    try {
      ipcRenderer.removeAllListeners("invite-progress");
      ipcRenderer.removeAllListeners("invite-complete");

      ipcRenderer.on("invite-progress", (_event, progress) => {
        if (typeof progressCallback === "function") {
          progressCallback(progress);
        }
      });

      const result = await ipcRenderer.invoke(
        "start-invite",
        targetGroup,
        members,
        limit
      );
      return result;
    } catch (error) {
      throw error;
    }
  },
  stopInvite: () => ipcRenderer.invoke("stop-invite"),
  getInviteProgress: () => ipcRenderer.invoke("get-invite-progress"),

  getSessions: () => ipcRenderer.invoke("get-sessions"),
  deleteSession: (sessionId) => ipcRenderer.invoke("delete-session", sessionId),
  importSessions: (filePaths) =>
    ipcRenderer.invoke("import-sessions", filePaths),
  checkSessions: () => ipcRenderer.invoke("check-sessions"),
  onImportProgress: (callback) =>
    ipcRenderer.on("import-progress", (_, progress) => callback(progress)),
  removeImportProgressListener: () =>
    ipcRenderer.removeAllListeners("import-progress"),
  onCheckProgress: (callback) =>
    ipcRenderer.on("check-progress", (_, progress) => callback(progress)),
  removeCheckProgressListener: () =>
    ipcRenderer.removeAllListeners("check-progress"),

  showOpenDialog: (options) => ipcRenderer.invoke("show-open-dialog", options),

  getChannelList: () => ipcRenderer.invoke("get-channel-list"),
  getEmojiList: () => ipcRenderer.invoke("get-emoji-list"),
  addEmoji: (emoji) => ipcRenderer.invoke("add-emoji", emoji),
  removeEmoji: (emoji) => ipcRenderer.invoke("remove-emoji", emoji),
  addChannel: (channelData) => ipcRenderer.invoke("add-channel", channelData),
  removeChannel: (channelId) => ipcRenderer.invoke("remove-channel", channelId),
  updateChannelStatus: (data) =>
    ipcRenderer.invoke("update-channel-status", data),
  startReactionSystem: (channels) =>
    ipcRenderer.invoke("start-reaction-system", channels),
  stopReactionSystem: () => ipcRenderer.invoke("stop-reaction-system"),

  getSystemStatus: () => ipcRenderer.invoke("get-system-status"),
  getReactionLog: () => ipcRenderer.invoke("get-reaction-log"),

  saveVideo: (data) => ipcRenderer.invoke("save-video", data),
  getUploadProgress: () => ipcRenderer.invoke("get-upload-progress"),
  getAllVideos: () => ipcRenderer.invoke("get-all-videos"),
  deleteVideo: (channelId, videoId) =>
    ipcRenderer.invoke("delete-video", channelId, videoId),
  getTimes: () => ipcRenderer.invoke("get-scheduler-times"),
  saveTimes: (times) => ipcRenderer.invoke("save-scheduler-times", times),
  getSchedulerStatus: () => ipcRenderer.invoke("get-scheduler-status"),
  startScheduler: () => ipcRenderer.invoke("start-scheduler"),
  stopScheduler: () => ipcRenderer.invoke("stop-scheduler"),

  getTelegramSettings: () => ipcRenderer.invoke("get-telegram-settings"),
  saveTelegramSettings: (settings) =>
    ipcRenderer.invoke("save-telegram-settings", settings),

  joinChannel: (channelName) => ipcRenderer.invoke("join-channel", channelName),
  leaveChannel: (channelName) =>
    ipcRenderer.invoke("leave-channel", channelName),
  leaveAllChannels: () => ipcRenderer.invoke("leave-all-channels"),
});

contextBridge.exposeInMainWorld("electron", {
  on: (channel, callback) => {
    const validChannels = [
      "update-available",
      "update-error",
      "download-progress",
      "update-downloaded",
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  invoke: (channel, ...args) => {
    const validChannels = [
      "start-update-download",
      "quit-and-install",
      // ... diğer kanallar ...
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
  },
});
