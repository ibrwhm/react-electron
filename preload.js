const { contextBridge, ipcRenderer } = require("electron");
const path = require("path");

const notificationSoundPath = process.argv
  .find((arg) => arg.startsWith("--notification-sound-path="))
  .split("=")[1];

const validChannels = [
  "update-available",
  "update-error",
  "download-progress",
  "update-downloaded",
  "import-progress",
  "check-progress",
  "invite-progress",
  "invite-complete",
  "app-closing",
  "play-notification",
];

contextBridge.exposeInMainWorld("api", {
  validateLicense: (key) => ipcRenderer.invoke("validate-license", key),
  getLicense: () => ipcRenderer.invoke("get-license"),
  logout: () => ipcRenderer.invoke("logout"),
  storeLicense: (key) => ipcRenderer.invoke("store-license", key),
  createLicense: (type, months, customKey) =>
    ipcRenderer.invoke("create-license", type, months, customKey),
  getAllLicenses: () => ipcRenderer.invoke("get-all-licenses"),
  deleteLicense: (key) => ipcRenderer.invoke("delete-license", key),
  deactivateLicense: (key) => ipcRenderer.invoke("deactivate-license", key),

  maintainTray: () => ipcRenderer.send("maintain-tray"),
  recreateTray: () => ipcRenderer.send("recreate-tray"),
  isMaximized: () => ipcRenderer.sendSync("window-is-maximized"),
  windowMinimize: () => ipcRenderer.invoke("window-minimize"),
  windowMaximize: () => ipcRenderer.invoke("window-maximize"),
  windowHide: () => ipcRenderer.invoke("window-hide"),

  getSystemInfo: () => ipcRenderer.invoke("get-system-info"),
  getIpAddress: () => ipcRenderer.invoke("get-ip-address"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  startUpdate: () => ipcRenderer.invoke("start-update"),
  startUpdateDownload: () => ipcRenderer.invoke("start-update-download"),
  quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),

  loginWithSession: () => ipcRenderer.invoke("login-with-session"),
  getSessions: () => ipcRenderer.invoke("get-sessions"),
  deleteSession: (sessionId) => ipcRenderer.invoke("delete-session", sessionId),
  importSessions: (filePaths) =>
    ipcRenderer.invoke("import-sessions", filePaths),
  checkSessions: () => ipcRenderer.invoke("check-sessions"),

  fetchMembers: (targetGroup, sourceGroup, fetchMethod) =>
    ipcRenderer.invoke("fetch-members", targetGroup, sourceGroup, fetchMethod),
  startInvite: (targetGroup, members, limit) =>
    ipcRenderer.invoke("start-invite", targetGroup, members, limit),
  stopInvite: () => ipcRenderer.invoke("stop-invite"),
  getInviteProgress: () => ipcRenderer.invoke("get-invite-progress"),

  showOpenDialog: async (options) => {
    return await ipcRenderer.invoke("show-open-dialog", options);
  },

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

  saveVideo: async (data) => {
    return await ipcRenderer.invoke("save-video", data);
  },
  getAllVideos: async () => {
    return await ipcRenderer.invoke("get-all-videos");
  },
  deleteVideo: async (channelId, videoId) => {
    return await ipcRenderer.invoke("delete-video", channelId, videoId);
  },
  getUploadProgress: async () => {
    return await ipcRenderer.invoke("get-upload-progress");
  },
  saveTimes: async (times) => {
    return await ipcRenderer.invoke("save-scheduler-times", times);
  },
  getTimes: async () => {
    return await ipcRenderer.invoke("get-scheduler-times");
  },
  startScheduler: async () => {
    return await ipcRenderer.invoke("start-scheduler");
  },
  stopScheduler: async () => {
    return await ipcRenderer.invoke("stop-scheduler");
  },
  getSchedulerStatus: async () => {
    return await ipcRenderer.invoke("get-scheduler-status");
  },

  getTelegramSettings: () => ipcRenderer.invoke("get-telegram-settings"),
  saveTelegramSettings: (settings) =>
    ipcRenderer.invoke("save-telegram-settings", settings),

  joinChannel: (channelName) => ipcRenderer.invoke("join-channel", channelName),
  leaveChannel: (channelName) =>
    ipcRenderer.invoke("leave-channel", channelName),
  leaveAllChannels: () => ipcRenderer.invoke("leave-all-channels"),

  on: (channel, callback) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },
  removeListener: (channel, callback) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },
  removeAllListeners: (channel) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },

  getNotificationSoundPath: () => notificationSoundPath,
});
