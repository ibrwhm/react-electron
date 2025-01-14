const { app } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
ffmpeg.setFfmpegPath(ffmpegPath);

class VideoManager {
  constructor() {
    this.videoDir = path.join(app.getPath("userData"), "uploads");
    this.storeDir = path.join(app.getPath("userData"), "store");
    this.compressedDir = path.join(app.getPath("userData"), "compressed");
    this.store = null;
    this.schedulerStatus = false;
    this.message = "";
    this.defaultTimes = ["09:00", "12:00", "15:00", "18:00", "21:00", "23:00"];
    this.mainWindow = null;

    this.initStore();
    this.ensureDirectories();
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  async initStore() {
    if (this.store) return;

    try {
      const { default: Store } = await import("electron-store");
      this.store = new Store({
        name: "video-manager",
        encryptionKey: "krishnay",
        cwd: this.storeDir,
        defaults: {
          videos: [],
          sendTimes: this.defaultTimes,
          schedulerStatus: false,
          message: "",
          telegramBot: {
            token: "",
            isEnabled: false,
            lastError: "",
            lastSuccess: "",
          },
        },
      });

      const currentTimes = this.store.get("sendTimes");
      const currentTelegramBot = this.store.get("telegramBot");

      if (!currentTimes) {
        this.store.set("sendTimes", this.defaultTimes);
      }

      if (!currentTelegramBot) {
        this.store.set("telegramBot", {
          token: "",
          isEnabled: false,
          lastError: "",
          lastSuccess: "",
        });
      }
    } catch (error) {
      throw error;
    }
  }

  async ensureDirectories() {
    await fs.ensureDir(this.videoDir);
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
      if (!channelLink) {
        throw new Error("Kanal linki gerekli");
      }

      let formattedChannelLink = channelLink;
      if (channelLink.startsWith("@")) {
        formattedChannelLink = `https://t.me/${channelLink.substring(1)}`;
      } else if (!channelLink.startsWith("https://t.me/")) {
        formattedChannelLink = `https://t.me/${channelLink}`;
      }

      if (!filePath || typeof filePath !== "string") {
        throw new Error("Geçerli bir dosya yolu gerekli");
      }

      if (!fs.existsSync(filePath)) {
        throw new Error("Dosya bulunamadı: " + filePath);
      }

      const stats = fs.statSync(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      let targetPath = path.join(
        this.videoDir,
        `${Date.now()}_${path.basename(filePath)}`
      );

      this.store.set("uploadProgress", {
        status: "başlıyor",
        percent: 0,
        fileName: path.basename(filePath),
        stage: "başlatılıyor",
      });

      if (fileSizeInMB > 50) {
        this.store.set("uploadProgress", {
          status: "sıkıştırılıyor",
          percent: 0,
          fileName: path.basename(filePath),
          stage: "sıkıştırma",
        });
        targetPath = await this.compressVideo(filePath);
      } else {
        this.store.set("uploadProgress", {
          status: "kopyalanıyor",
          percent: 50,
          fileName: path.basename(filePath),
          stage: "kopyalama",
        });
        await fs.promises.copyFile(filePath, targetPath);
      }

      this.store.set("uploadProgress", {
        status: "kaydediliyor",
        percent: 90,
        fileName: path.basename(filePath),
        stage: "kayıt",
      });

      const videos = this.store.get("videos", []);
      let channel = videos.find((c) => c.channelLink === formattedChannelLink);

      if (!channel) {
        channel = {
          _id: Date.now().toString(),
          channelLink: formattedChannelLink,
          videos: [],
        };
        videos.push(channel);
      }

      channel.videos.push({
        _id: Date.now().toString(),
        filename: path.basename(targetPath),
        originalPath: filePath,
        savedPath: targetPath,
        description: description || "",
        status: "pending",
        error: null,
        sentAt: null,
        createdAt: new Date().toISOString(),
        size: fs.statSync(targetPath).size,
        originalSize: stats.size,
        compressed: fileSizeInMB > 50,
      });

      this.store.set("videos", videos);

      this.store.set("uploadProgress", {
        status: "tamamlandı",
        percent: 100,
        fileName: path.basename(filePath),
        stage: "tamamlandı",
      });

      return { success: true };
    } catch (error) {
      this.store.set("uploadProgress", {
        status: "hata",
        percent: 0,
        fileName: path.basename(filePath),
        stage: "hata",
        error: error.message,
      });
      throw new Error("Video kaydedilemedi: " + error.message);
    }
  }

  async deleteVideo(channelId, videoId) {
    try {
      const videos = this.store.get("videos") || [];
      const channelIndex = videos.findIndex((c) => c._id === channelId);

      if (channelIndex === -1) {
        throw new Error("Kanal bulunamadı");
      }

      const videoIndex = videos[channelIndex].videos.findIndex(
        (v) => v._id === videoId
      );
      if (videoIndex === -1) {
        throw new Error("Video bulunamadı");
      }

      videos[channelIndex].videos.splice(videoIndex, 1);

      if (videos[channelIndex].videos.length === 0) {
        videos.splice(channelIndex, 1);
      }

      this.store.set("videos", videos);
      return { success: true };
    } catch (error) {
      throw error;
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

      let videoPath = video.savedPath;
      const stats = fs.statSync(videoPath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      if (fileSizeInMB > 50) {
        videoPath = await this.compressVideo(videoPath);
      }

      const TelegramBot = await import("node-telegram-bot-api");
      if (!this.telegramBot) {
        this.telegramBot = new TelegramBot.default(settings.token, {
          polling: false,
        });
      }

      const videoStream = fs.createReadStream(videoPath);
      await this.telegramBot.sendVideo(channelId, videoStream, {
        caption: video.description || "",
        contentType: "video/mp4",
      });

      if (videoPath !== video.savedPath) {
        fs.unlinkSync(videoPath);
      }

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

  async compressVideo(inputPath, targetSize = 45) {
    try {
      const stats = fs.statSync(inputPath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      const outputPath = path.join(
        this.compressedDir,
        `compressed_${Date.now()}_${path.basename(inputPath)}`
      );

      let targetBitrate, scale, preset;

      if (fileSizeInMB > 1024) {
        targetBitrate = Math.floor((targetSize * 8192) / 30);
        scale = "854x?";
        preset = "ultrafast";
      } else if (fileSizeInMB > 500) {
        targetBitrate = Math.floor((targetSize * 8192) / 45);
        scale = "1280x?";
        preset = "veryfast";
      } else {
        targetBitrate = Math.floor((targetSize * 8192) / 60);
        scale = "1280x?";
        preset = "veryfast";
      }

      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .videoBitrate(targetBitrate)
          .videoCodec("libx264")
          .size(scale)
          .audioCodec("aac")
          .audioBitrate("128k")
          .outputOptions([
            `-preset ${preset}`,
            "-crf 28",
            "-movflags +faststart",
            "-threads 0",
            "-tune fastdecode",
          ])
          .on("progress", (progress) => {
            if (progress.percent) {
              this.store.set("uploadProgress", {
                status: "sıkıştırılıyor",
                percent: Math.floor(progress.percent),
                fileName: path.basename(inputPath),
                stage: "sıkıştırma",
                fps: progress.currentFps,
                kbps: progress.currentKbps,
                targetSize: `${targetSize}MB`,
                processedDuration: progress.timemark,
              });
            }
          })
          .on("end", () => {
            const compressedSize = fs.statSync(outputPath).size / (1024 * 1024);
            if (compressedSize > targetSize * 1.5) {
              fs.unlinkSync(outputPath);
              this.compressVideo(inputPath, targetSize * 0.7)
                .then(resolve)
                .catch(reject);
            } else {
              resolve(outputPath);
            }
          })
          .on("error", (err) => {
            this.store.set("uploadProgress", {
              status: "hata",
              percent: 0,
              fileName: path.basename(inputPath),
              stage: "sıkıştırma-hata",
              error: err.message,
            });
            reject(new Error("Video sıkıştırma hatası: " + err.message));
          })
          .save(outputPath);
      });
    } catch (error) {
      throw new Error("Video sıkıştırma hatası: " + error.message);
    }
  }

  async getUploadProgress() {
    return (
      this.store.get("uploadProgress") || {
        status: "beklemede",
        percent: 0,
        fileName: "",
        stage: "başlatılmadı",
      }
    );
  }
}

const videoManager = new VideoManager();
module.exports = videoManager;
