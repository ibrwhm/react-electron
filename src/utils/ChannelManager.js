const { Api } = require("telegram");
const { sleep } = require("./helpers");
const getChannelUsername = require("./getChannelUsername");
const sessionManager = require("./SessionManager");

class ChannelManager {
  constructor() {
    this.delay = 2000;
  }

  async joinChannel(channelName) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    let activeSessions = sessionManager.getLoggedInSessions();
    if (!activeSessions || activeSessions.length === 0) {
      await sessionManager.loginWithSessions();
      activeSessions = sessionManager.getLoggedInSessions();
    }

    for (const session of activeSessions) {
      try {
        if (!session.client || typeof session.client.invoke !== "function") {
          throw new Error("Geçersiz oturum");
        }

        const channelPeer = await getChannelUsername(
          session.client,
          channelName
        );

        await session.client.invoke(
          new Api.channels.JoinChannel({
            channel: channelPeer,
          })
        );

        results.success++;
        await sleep(this.delay);
      } catch (error) {
        results.failed++;
        results.errors.push({
          phone: session.phoneNumber,
          error: error.message,
        });
      }
    }

    return results;
  }

  async leaveChannel(channelName) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    let activeSessions = sessionManager.getLoggedInSessions();
    if (!activeSessions || activeSessions.length === 0) {
      await sessionManager.loginWithSessions();
      activeSessions = sessionManager.getLoggedInSessions();
    }

    for (const session of activeSessions) {
      try {
        if (!session.client || typeof session.client.invoke !== "function") {
          throw new Error("Geçersiz oturum");
        }

        const channelPeer = await getChannelUsername(
          session.client,
          channelName
        );

        await session.client.invoke(
          new Api.channels.LeaveChannel({
            channel: channelPeer,
          })
        );

        results.success++;
        await sleep(this.delay);
      } catch (error) {
        results.failed++;
        results.errors.push({
          phone: session.phoneNumber,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Tüm oturumları bütün kanallardan çıkarır
   * @param {Array} sessions - Telegram oturumları
   * @returns {Promise<{success: number, failed: number, errors: Array}>}
   */
  async leaveAllChannels() {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    let activeSessions = sessionManager.getLoggedInSessions();
    if (!activeSessions || activeSessions.length === 0) {
      await sessionManager.loginWithSessions();
      activeSessions = sessionManager.getLoggedInSessions();
    }

    for (const session of activeSessions) {
      try {
        if (!session.client || typeof session.client.invoke !== "function") {
          throw new Error("Geçersiz oturum");
        }

        const dialogs = await session.client.getDialogs();

        const channels = dialogs.filter(
          (dialog) => dialog.entity && dialog.entity.className === "Channel"
        );

        for (const channel of channels) {
          try {
            await session.client.invoke(
              new Api.channels.LeaveChannel({
                channel: channel.entity,
              })
            );
            await sleep(this.delay);
          } catch (error) {
            throw new Error(`Kanal ayrılma hatası (${channel.title})`);
          }
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          phone: session.phoneNumber,
          error: error.message,
        });
      }
    }

    return results;
  }
}

module.exports = new ChannelManager();
