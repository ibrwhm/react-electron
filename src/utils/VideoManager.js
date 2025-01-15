const { app } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
ffmpeg.setFfmpegPath(ffmpegPath);

class VideoManager {
  constructor() {
    this.storeDir = path.join(app.getPath("userData"), "store");
    this.compressedDir = path.join(app.getPath("userData"), "compressed");
    this.store = null;
    this.schedulerStatus = false;
    this.message = "";
    this.defaultTimes = ["09:00", "12:00", "15:00", "18:00", "21:00", "23:00"];
    this.mainWindow = null;
    this.uploadProgress = {
      status: "beklemede",
      current: 0,
      total: 0,
      filename: "",
      stage: "başlatılmadı",
    };

    (async () => {
      await this.initStore();
      await this.ensureDirectories();
    })();
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  async initStore() {
    if (this.store) return;

    try {
      const Store = (await import("electron-store")).default;

      this.store = new Store({
        name: "video-manager",
        cwd: this.storeDir,
        defaults: {
          videos: [],
          sendTimes: this.defaultTimes,
          schedulerStatus: false,
          message: "",
          uploadProgress: {
            status: "beklemede",
            current: 0,
            total: 0,
            filename: "",
            stage: "başlatılmadı",
          },
          telegramBot: {
            token: "",
            isEnabled: false,
            lastError: "",
            lastSuccess: "",
          },
        },
      });

      if (!this.store) {
        throw new Error("Store initialization failed");
      }

      const currentProgress = this.store.get("uploadProgress");
      if (!currentProgress) {
        this.store.set("uploadProgress", this.uploadProgress);
      } else {
        this.uploadProgress = currentProgress;
      }
    } catch (error) {
      throw error;
    }
  }

  async ensureDirectories() {
    await fs.ensureDir(this.storeDir);
    await fs.ensureDir(this.compressedDir);
  }

  async getTimes() {
    return this.store.get("sendTimes") || [];
  }

  async saveTimes(newTimes) {
    try {
      const sortedTimes = (
        Array.isArray(newTimes) ? newTimes : [newTimes]
      ).sort((a, b) => {
        const [aHours, aMinutes] = a.split(":").map(Number);
        const [bHours, bMinutes] = b.split(":").map(Number);
        return aHours * 60 + aMinutes - (bHours * 60 + bMinutes);
      });

      this.store.set("sendTimes", sortedTimes);
      return sortedTimes;
    } catch (error) {
      throw error;
    }
  }

  async getAllVideos() {
    try {
      const videos = this.store.get("videos", []);
      return Array.isArray(videos) ? videos : [];
    } catch (error) {
      return [];
    }
  }

  async saveVideo({ filePath, description, channelLink }) {
    try {
      if (!filePath) {
        throw new Error("Dosya yolu gerekli");
      }

      if (!channelLink) {
        throw new Error("Kanal linki gerekli");
      }

      let formattedChannelLink = channelLink;
      try {
        if (channelLink.startsWith("@")) {
          formattedChannelLink = `https://t.me/${channelLink.substring(1)}`;
        } else if (!channelLink.startsWith("https://t.me/")) {
          formattedChannelLink = `https://t.me/${channelLink}`;
        }
      } catch (error) {
        throw new Error("Kanal linki formatlanamadı");
      }

      try {
        if (typeof filePath !== "string") {
          throw new Error("Geçerli bir dosya yolu gerekli");
        }

        if (!fs.existsSync(filePath)) {
          throw new Error("Dosya bulunamadı: " + filePath);
        }
      } catch (error) {
        throw error;
      }

      let stats, fileSizeInMB, filename;
      try {
        stats = fs.statSync(filePath);
        fileSizeInMB = stats.size / (1024 * 1024);
        filename = path.basename(filePath);
      } catch (error) {
        throw new Error("Dosya bilgileri alınamadı");
      }

      try {
        const initialProgress = {
          status: "başlıyor",
          current: 0,
          total: stats.size,
          filename: filename,
          stage: "başlatılıyor",
        };
        this.updateProgress(initialProgress);
      } catch (error) {
        throw error;
      }

      let finalPath = filePath;
      let needsCompression = fileSizeInMB > 50;

      if (needsCompression) {
        try {
          const compressionStartProgress = {
            status: "sıkıştırılıyor",
            current: 0,
            total: stats.size,
            filename: filename,
            stage: "sıkıştırma",
          };
          this.updateProgress(compressionStartProgress);

          finalPath = await this.compressVideo(filePath, filename);
        } catch (error) {
          console.error("Sıkıştırma hatası:", error);
          finalPath = filePath;
          needsCompression = false;
        }
      }

      try {
        const videos = this.store.get("videos", []);
        let channel = videos.find(
          (c) => c.channelLink === formattedChannelLink
        );

        if (!channel) {
          channel = {
            _id: Date.now().toString(),
            channelLink: formattedChannelLink,
            videos: [],
          };
          videos.push(channel);
        }

        const existingVideo = channel.videos.find(
          (v) => v.savedPath === finalPath || v.originalPath === filePath
        );

        if (existingVideo) {
          throw new Error("Bu video zaten eklenmiş");
        }

        const finalStats = fs.statSync(finalPath);

        const videoEntry = {
          _id: Date.now().toString(),
          filename: filename,
          originalPath: filePath,
          savedPath: finalPath,
          description: description || "",
          status: "pending",
          error: null,
          sentAt: null,
          createdAt: new Date().toISOString(),
          originalSize: stats.size,
          size: finalStats.size,
          compressed: needsCompression,
        };

        channel.videos.push(videoEntry);
        this.store.set("videos", videos);

        const finalProgress = {
          status: "tamamlandı",
          current: finalStats.size,
          total: finalStats.size,
          filename: filename,
          stage: "tamamlandı",
        };
        this.updateProgress(finalProgress);

        return { success: true, video: videoEntry };
      } catch (error) {
        throw error;
      }
    } catch (error) {
      try {
        const errorProgress = {
          status: "hata",
          current: 0,
          total: 0,
          filename: path.basename(filePath),
          stage: "hata",
          error: error.message,
        };
        this.updateProgress(errorProgress);
      } catch (progressError) {
        throw progressError;
      }

      throw error;
    }
  }

  async deleteVideo(channelId, videoId) {
    try {
      const videos = this.store.get("videos") || [];
      const channelIndex = videos.findIndex((c) => c._id === channelId);

      if (channelIndex === -1) {
        return { success: false, error: "Kanal bulunamadı" };
      }

      const channel = videos[channelIndex];
      const videoIndex = channel.videos.findIndex((v) => v._id === videoId);

      if (videoIndex === -1) {
        return { success: false, error: "Video bulunamadı" };
      }

      channel.videos.splice(videoIndex, 1);

      if (channel.videos.length === 0) {
        videos.splice(channelIndex, 1);
      } else {
        videos[channelIndex] = channel;
      }

      this.store.set("videos", videos);
      return { success: true };
    } catch (error) {
      console.error("Video silme hatası:", error);
      return { success: false, error: error.message };
    }
  }

  async getSchedulerStatus() {
    try {
      return this.store.get("schedulerStatus", false);
    } catch (error) {
      return false;
    }
  }

  async startScheduler() {
    try {
      const status = this.store.get("schedulerStatus");

      if (status) {
        throw new Error("Zamanlayıcı zaten çalışıyor");
      }

      if (this.schedulerInterval) {
        clearInterval(this.schedulerInterval);
        this.schedulerInterval = null;
      }

      this.schedulerInterval = setInterval(
        () => this.checkAndSendVideos(),
        60000
      );
      this.store.set("schedulerStatus", true);

      return true;
    } catch (error) {
      throw error;
    }
  }

  async stopScheduler() {
    try {
      const status = this.store.get("schedulerStatus");

      if (!status) {
        throw new Error("Zamanlayıcı zaten durdurulmuş");
      }

      if (this.schedulerInterval) {
        clearInterval(this.schedulerInterval);
        this.schedulerInterval = null;
      }

      this.store.set("schedulerStatus", false);

      return false;
    } catch (error) {
      throw error;
    }
  }

  async checkAndSendVideos() {
    try {
      const now = new Date();
      const scheduledTimes = await this.getTimes();

      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

      for (const scheduledTime of scheduledTimes) {
        const [hours, minutes] = scheduledTime.split(":").map(Number);
        const scheduledMinutes = hours * 60 + minutes;

        const lastSendTimeStr = this.store.get(`lastSendTime_${scheduledTime}`);
        const lastSendDate = lastSendTimeStr ? new Date(lastSendTimeStr) : null;

        if (
          (!lastSendDate || !this.isSameDay(lastSendDate, now)) &&
          Math.abs(scheduledMinutes - currentTimeMinutes) <= 1
        ) {
          const videos = this.store.get("videos", []);
          let processedCount = 0;

          for (const channel of videos) {
            const pendingVideos = channel.videos.filter(
              (v) => v.status === "pending"
            );

            if (pendingVideos.length > 0) {
              const randomVideo =
                pendingVideos[Math.floor(Math.random() * pendingVideos.length)];

              try {
                await this.sendToTelegram(channel.channelLink, randomVideo);
                const videoToUpdate = channel.videos.find(
                  (v) => v._id === randomVideo._id
                );
                if (videoToUpdate) {
                  videoToUpdate.status = "sent";
                  videoToUpdate.sentAt = new Date().toISOString();
                }
                processedCount++;
              } catch (error) {
                const videoToUpdate = channel.videos.find(
                  (v) => v._id === randomVideo._id
                );
                if (videoToUpdate) {
                  videoToUpdate.status = "error";
                  videoToUpdate.error = error.message;
                }
              }
            }
          }

          if (processedCount > 0) {
            this.store.set("videos", videos);
            this.store.set(`lastSendTime_${scheduledTime}`, now.toISOString());
          }
        }
      }
    } catch (error) {
      throw new Error("Zamanlayıcı kontrolü yapılırken hata: " + error.message);
    }
  }

  isSameDay(date1, date2) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  async getTelegramSettings() {
    return (
      this.store.get("telegramBot") || {
        token: "",
        isEnabled: false,
        lastError: "",
        lastSuccess: "",
      }
    );
  }

  async saveTelegramSettings(settings) {
    try {
      const currentSettings = await this.getTelegramSettings();
      const newSettings = {
        ...currentSettings,
        token: settings.token || currentSettings.token,
        isEnabled: settings.isEnabled,
        lastSuccess: settings.isEnabled
          ? "Bot başarıyla aktifleştirildi"
          : "Bot durduruldu",
        lastError: "",
      };

      this.store.set("telegramBot", newSettings);
      return newSettings;
    } catch (error) {
      const errorSettings = {
        token: settings.token,
        isEnabled: false,
        lastError: error.message,
        lastSuccess: "",
      };
      this.store.set("telegramBot", errorSettings);
      return errorSettings;
    }
  }

  async testTelegramBot(token) {
    try {
      const TelegramBot = await import("node-telegram-bot-api");
      const bot = new TelegramBot.default(token, { polling: false });
      const me = await bot.getMe();
      return {
        success: true,
        botInfo: me,
      };
    } catch (error) {
      throw new Error("Bot token geçersiz veya bağlantı hatası");
    }
  }

  extractChannelId(channelLink) {
    try {
      const url = new URL(channelLink);
      if (url.hostname !== "t.me") {
        throw new Error("Geçersiz Telegram kanal linki");
      }
      return "@" + url.pathname.substring(1);
    } catch (error) {
      return channelLink.startsWith("@") ? channelLink : "@" + channelLink;
    }
  }

  async sendToTelegram(channelLink, video) {
    try {
      const settings = await this.getTelegramSettings();
      if (!settings.isEnabled || !settings.token) {
        throw new Error("Telegram bot aktif değil veya token ayarlanmamış");
      }

      const channelId = this.extractChannelId(channelLink);

      if (!fs.existsSync(video.savedPath)) {
        throw new Error("Video dosyası bulunamadı: " + video.savedPath);
      }

      const stats = fs.statSync(video.savedPath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      if (fileSizeInMB > 50) {
        throw new Error("Video boyutu 50MB'dan büyük");
      }

      const TelegramBot = await import("node-telegram-bot-api");
      if (!this.telegramBot) {
        this.telegramBot = new TelegramBot.default(settings.token, {
          polling: false,
        });
      }

      const videoStream = fs.createReadStream(video.savedPath);
      await this.telegramBot.sendVideo(channelId, videoStream, {
        caption: video.description || "",
        contentType: "video/mp4",
      });

      settings.lastSuccess = new Date().toISOString();
      settings.lastError = "";
      this.store.set("telegramBot", settings);

      return { success: true };
    } catch (error) {
      const settings = await this.getTelegramSettings();
      settings.lastError = error.message;
      this.store.set("telegramBot", settings);

      throw new Error("Telegram gönderimi başarısız: " + error.message);
    }
  }

  compressVideo(inputPath, filename) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.compressedDir, filename);
      let duration = 0;

      ffmpeg(inputPath)
        .outputOptions([
          "-c:v libx264",
          "-preset ultrafast",
          "-crf 30",
          "-vf scale=1280:720",
          "-b:v 800k",
          "-maxrate 1000k",
          "-bufsize 2000k",
          "-c:a aac",
          "-b:a 128k",
          "-ac 2",
          "-ar 44100",
          "-threads 0",
        ])
        .on("codecData", (data) => {
          duration = parseInt(data.duration.replace(/:/g, "")) || 0;
        })
        .on("progress", (progress) => {
          const currentProgress =
            Math.round(
              (progress.timemark.replace(/:/g, "") / duration) * 100
            ) || 0;
          const fps =
            progress.frames /
              progress.timemark
                .split(":")
                .reduce((acc, time) => 60 * acc + +time, 0) || 0;

          this.uploadProgress = {
            status: "sıkıştırılıyor",
            current: currentProgress,
            total: 100,
            filename,
            stage: "sıkıştırma",
            fps: Math.round(fps),
            kbps: Math.round(progress.currentKbps),
          };
        })
        .on("end", () => {
          resolve(outputPath);
        })
        .on("error", (err) => {
          console.error("Sıkıştırma hatası:", err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  updateProgress(progress) {
    try {
      this.uploadProgress = {
        ...progress,
        timestamp: Date.now(),
      };

      this.store.set("uploadProgress", this.uploadProgress);
    } catch (error) {
      throw error;
    }
  }

  async getUploadProgress() {
    return {
      success: true,
      data: this.uploadProgress || {
        status: "beklemede",
        current: 0,
        total: 0,
        filename: "",
        stage: "başlatılmadı",
      },
    };
  }
}

const videoManager = new VideoManager();
module.exports = videoManager;
