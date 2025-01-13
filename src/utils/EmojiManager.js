const { app } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const { Api } = require("telegram/tl");
const { wait } = require("./helpers");
const SessionManager = require("./SessionManager");

class EmojiManager {
  constructor() {
    this.storeDir = path.join(app.getPath("userData"), "store");
    this.store = null;
    this.defaultEmojis = [
      "👍",
      "👎",
      "❤️",
      "🔥",
      "🎉",
      "👏",
      "🤔",
      "🤯",
      "😢",
      "😡",
      "🥱",
      "👌",
    ];
    this.isListening = false;
    this.eventHandlers = new Map();
    this.loggedInSessions = [];
    this.messageQueue = [];
    this.isProcessing = false;
    this.emojiCache = new Map();
    this.cacheTimeout = 60 * 60 * 1000;
    this.reactionLog = [];
    this.maxLogSize = 100;
    this.reactedMessages = new Set();

    this.initStore();
    this.ensureDirectories();
  }

  async initStore() {
    if (this.store) return;

    try {
      const { default: Store } = await import("electron-store");
      this.store = new Store({
        name: "emoji-manager",
        encryptionKey: "krishnay",
        cwd: this.storeDir,
        defaults: {
          emojis: this.defaultEmojis,
        },
      });

      const currentEmojis = this.store.get("emojis");
      const currentChannels = this.store.get("channels");

      if (!currentEmojis) {
        this.store.set("emojis", this.defaultEmojis);
      }

      if (!currentChannels) {
        this.store.set("channels", []);
      }
    } catch (error) {
      throw error;
    }
  }

  async ensureDirectories() {
    await fs.ensureDir(this.storeDir);
  }

  async loginWithSessions() {
    try {
      const result = await SessionManager.loginWithSessions();
      if (!result.success) {
        return { success: false, message: result.message };
      }

      const sessions = SessionManager.getLoggedInSessions();

      if (sessions.length === 0) {
        return { success: false, message: "Aktif session bulunamadı" };
      }

      this.loggedInSessions = sessions;
      return { success: true, sessions };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async startListening(channels) {
    try {
      if (this.isListening) {
        return { success: false, message: "Sistem zaten çalışıyor" };
      }

      const loginResult = await this.loginWithSessions();
      if (!loginResult.success) {
        return { success: false, message: loginResult.message };
      }

      this.isListening = true;
      this.startMessageListener(channels);
      return { success: true, message: "Emoji sistemi başlatıldı" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async stopListening() {
    try {
      this.clearEventHandlers();
      this.clearReactedMessages();
      this.emojiCache.clear();
      this.isListening = false;
      return { success: true, message: "Sistem durduruldu" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  startMessageListener(channels) {
    if (!this.isListening) return;

    const activeChannels = channels.filter((ch) => ch.active);
    if (activeChannels.length === 0) return;

    this.clearEventHandlers();

    this.loggedInSessions.forEach((session) => {
      if (!session?.sessionId) return;

      const handler = async (update) => {
        if (!update?.message) return;
        if (
          update.className !== "UpdateNewChannelMessage" &&
          update.className !== "UpdateNewMessage"
        )
          return;

        this.handleNewMessage(update.message, activeChannels);
      };

      session.client.addEventHandler(handler);
      this.eventHandlers.set(session.sessionId, {
        client: session.client,
        handler: handler,
        sessionId: session.sessionId,
      });
    });
  }

  clearEventHandlers() {
    for (const [sessionId, handler] of this.eventHandlers.entries()) {
      try {
        handler.client.removeEventHandler(handler.handler);
      } catch (error) {}
    }
    this.eventHandlers.clear();
  }

  async processMessageQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) return;

    try {
      this.isProcessing = true;
      const { message, channels } = this.messageQueue[0];

      const messageKey = `${message.peerId}_${message.id}`;
      if (this.reactedMessages.has(messageKey)) {
        this.messageQueue.shift();
        this.isProcessing = false;
        if (this.messageQueue.length > 0) {
          await this.processMessageQueue();
        }
        return;
      }

      for (const session of this.loggedInSessions) {
        try {
          if (!message?.peerId || !session?.sessionId) continue;

          let messageChannel;
          try {
            messageChannel = await session.client.getEntity(message.peerId);
          } catch (error) {
            this.addToReactionLog({
              channelId: message.peerId.toString(),
              channelTitle: "Bilinmeyen Kanal",
              emoji: "❌",
              timestamp: Date.now(),
              success: false,
              error: `Kanal bilgisi alınamadı: ${error.message}`,
            });
            continue;
          }

          const targetChannel = channels.find((ch) => {
            const channelUsername = ch.id.split("/").pop().replace("@", "");
            return messageChannel.username === channelUsername && ch.active;
          });

          if (!targetChannel) continue;

          const channelEmojis = await this.getChannelEmojis(
            session.client,
            message.peerId
          );

          if (!channelEmojis?.length) {
            this.addToReactionLog({
              channelId: targetChannel.id,
              channelTitle: targetChannel.title,
              emoji: "❌",
              timestamp: Date.now(),
              success: false,
              error: "Kanal emojileri alınamadı",
            });
            continue;
          }

          const randomEmoji =
            channelEmojis[Math.floor(Math.random() * channelEmojis.length)];

          await session.client.invoke(
            new Api.messages.SendReaction({
              peer: message.peerId,
              msgId: message.id,
              reaction: [
                new Api.ReactionEmoji({
                  emoticon: randomEmoji,
                }),
              ],
            })
          );

          this.addToReactionLog({
            channelId: targetChannel.id,
            channelTitle: targetChannel.title,
            channelUsername: messageChannel.username,
            emoji: randomEmoji,
            timestamp: Date.now(),
            success: true,
            sessionId: session.sessionId,
            sessionPhone: session.phoneNumber,
          });

          // Her session arasında 3 saniye bekle
          await wait(3000);
        } catch (error) {
          this.addToReactionLog({
            channelId: message.peerId.toString(),
            channelTitle:
              channels.find((ch) => ch.id.includes(message.peerId.toString()))
                ?.title || "Bilinmeyen Kanal",
            channelUsername: messageChannel?.username || "Bilinmeyen",
            emoji: "❌",
            timestamp: Date.now(),
            success: false,
            error: `Emoji gönderilemedi: ${error.message}`,
            sessionId: session.sessionId,
            sessionPhone: session.phoneNumber,
          });
        }
      }

      this.reactedMessages.add(messageKey);
      this.messageQueue.shift();
    } catch (error) {
      throw new Error("Process message queue error");
    } finally {
      this.isProcessing = false;
      if (this.messageQueue.length > 0) {
        await this.processMessageQueue();
      }
    }
  }

  async getChannelEmojis(client, channelId) {
    try {
      const cached = this.emojiCache.get(channelId);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.emojis;
      }

      const fullChannel = await client.invoke(
        new Api.channels.GetFullChannel({
          channel: channelId,
        })
      );

      if (!fullChannel?.fullChat?.availableReactions) return [];

      const availableReactions = fullChannel.fullChat.availableReactions;
      let emojis = [];

      if (availableReactions.className === "ChatReactionsAll") {
        emojis = [
          "👍",
          "👎",
          "❤️",
          "🔥",
          "🎉",
          "👏",
          "🤔",
          "🤯",
          "😢",
          "😡",
          "🥱",
          "👌",
        ];
      } else if (availableReactions.className === "ChatReactionsSome") {
        emojis = availableReactions.reactions.map(
          (reaction) => reaction.emoticon || reaction
        );
      }

      this.emojiCache.set(channelId, {
        emojis,
        timestamp: Date.now(),
      });

      return emojis;
    } catch (error) {
      const cached = this.emojiCache.get(channelId);
      if (cached) return cached.emojis;
      return [];
    }
  }

  async handleNewMessage(message, channels) {
    this.messageQueue.push({ message, channels });
    await this.processMessageQueue();
  }

  async getEmojiList() {
    try {
      const count = this.store.get("emojis").length;
      if (count === 0) {
        this.store.set("emojis", this.defaultEmojis);
      }

      return {
        success: true,
        emojis: this.store.get("emojis"),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Emoji listesi alınırken bir hata oluştu",
      };
    }
  }

  async addEmoji(emoji) {
    try {
      const emojiRegex =
        /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]/u;

      if (!emojiRegex.test(emoji)) {
        return {
          success: false,
          error: "Geçersiz emoji formatı",
        };
      }

      let emojiList = this.store.get("emojis");
      if (!emojiList) {
        emojiList = [];
      }

      if (emojiList.includes(emoji)) {
        return {
          success: false,
          error: "Bu emoji zaten ekli",
        };
      }

      emojiList.push(emoji);
      this.store.set("emojis", emojiList);

      return {
        success: true,
        emojis: emojiList,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Emoji eklenirken bir hata oluştu",
      };
    }
  }

  async removeEmoji(emoji) {
    try {
      let emojiList = this.store.get("emojis");
      if (!emojiList) {
        return {
          success: false,
          error: "Emoji listesi bulunamadı",
        };
      }

      emojiList = emojiList.filter((e) => e !== emoji);
      this.store.set("emojis", emojiList);

      return {
        success: true,
        emojis: emojiList,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Emoji silinirken bir hata oluştu",
      };
    }
  }

  async updateChannelStatus({ channelId, active }) {
    try {
      const result = await this.getChannels();
      if (!result.success) {
        return {
          success: false,
          error: "Kanal listesi alınamadı",
        };
      }

      const channels = result.channels;
      const updatedChannels = channels.map((ch) =>
        ch.id === channelId ? { ...ch, active } : ch
      );

      this.store.set("channels", updatedChannels);

      // Event handler'ları ve cache'i temizle
      this.clearEventHandlers();
      this.clearReactedMessages();
      this.emojiCache.clear();

      // Dinleme aktifse yeni kanallarla tekrar başlat
      if (this.isListening) {
        this.startMessageListener(updatedChannels);
      }

      return {
        success: true,
        channels: updatedChannels,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Kanal durumu güncellenirken bir hata oluştu",
      };
    }
  }

  addToReactionLog(logEntry) {
    this.reactionLog.unshift(logEntry);
    if (this.reactionLog.length > this.maxLogSize) {
      this.reactionLog = this.reactionLog.slice(0, this.maxLogSize);
    }
  }

  getReactionLog() {
    return this.reactionLog;
  }

  clearReactionLog() {
    this.reactionLog = [];
  }

  clearReactedMessages() {
    this.reactedMessages.clear();
  }

  async getChannels() {
    try {
      const rawData = this.store.get("channels");
      const channels = Array.isArray(rawData) ? rawData : [];

      const result = {
        success: true,
        channels: channels,
      };

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async addChannel(channelData) {
    try {
      const currentChannels = this.store.get("channels") || [];

      const channels = Array.isArray(currentChannels) ? currentChannels : [];

      if (channels.some((channel) => channel.id === channelData.id)) {
        return {
          success: false,
          error: "Bu kanal zaten ekli",
        };
      }

      channels.push(channelData);
      this.store.set("channels", channels);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Kanal eklenirken bir hata oluştu",
      };
    }
  }

  async removeChannel(channelId) {
    try {
      const result = await this.getChannels();
      const channels = result.channels;

      if (!channels || channels.length === 0) {
        return {
          success: false,
          error: "Kanal listesi bulunamadı",
        };
      }

      const updatedChannels = channels.filter((ch) => ch.id !== channelId);
      this.store.set("channels", updatedChannels);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Kanal silinirken bir hata oluştu",
      };
    }
  }

  async updateChannel(channelId, updates) {
    try {
      const result = await this.getChannels();
      if (!result.success) {
        return {
          success: false,
          error: "Kanal listesi alınamadı",
        };
      }

      const channels = result.channels;
      const updatedChannels = channels.map((ch) =>
        ch.id === channelId ? { ...ch, ...updates } : ch
      );

      this.store.set("channels", updatedChannels);

      return {
        success: true,
        channels: updatedChannels,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Kanal güncellenirken bir hata oluştu",
      };
    }
  }
}

const emojiManager = new EmojiManager();
module.exports = emojiManager;
