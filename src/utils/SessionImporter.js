const { TelegramClient } = require("telegram");
const { getRandomApiCredentials } = require("./helpers");
const SQLiteSession = require("gramjs-sqlitesession");
const MongoDBSession = require("./MongoDBSession");
const sessionManager = require("./SessionManager");

class SessionImporter {
  constructor() {
    this.progress = { success: 0, fail: 0, total: 0, finished: false };
  }

  async checkSession(session) {
    let client = null;
    try {
      const mongoSession = new MongoDBSession(session.sessionId);
      await mongoSession.load();
      const { apiId, apiHash } = getRandomApiCredentials();

      client = new TelegramClient(mongoSession, apiId, apiHash, {
        connectionRetries: 1,
        timeout: 30000,
      });

      await Promise.race([
        client.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout")), 30000)
        ),
      ]);

      const me = await client.getMe();

      await sessionManager.updateSession(session.sessionId, {
        sessionId: session.sessionId,
        phoneNumber: me.phone,
        firstName: me.firstName || null,
        lastName: me.lastName || null,
        username: me.username || null,
        isActive: true,
        lastUsed: new Date(),
        authKey: { _key: session.authKey._key },
        dcId: session.dcId,
        port: session.port || 443,
        serverAddress: session.serverAddress || "149.154.167.91",
      });

      this.progress.success++;
      return {
        success: true,
        message: `${me.phone || session.sessionId} session aktif ve çalışıyor`,
      };
    } catch (error) {
      await sessionManager.deleteSession(session.sessionId);
      this.progress.fail++;
      return {
        success: false,
        message: `Session kontrol hatası: ${error.message}`,
      };
    }
  }

  async checkMultipleSessions(sessions, progressCallback) {
    this.progress = {
      success: 0,
      fail: 0,
      total: sessions.length,
      finished: false,
    };
    progressCallback(this.progress);

    const results = [];
    for (const session of sessions) {
      const result = await this.checkSession(session);
      results.push({ sessionId: session.sessionId, ...result });
      progressCallback(this.progress);
    }

    this.progress.finished = true;
    progressCallback(this.progress);
    return results;
  }

  async importSession(sessionPath) {
    let client = null;
    try {
      const session = new SQLiteSession(sessionPath);
      await session.load();
      const { apiId, apiHash } = getRandomApiCredentials();

      client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 1,
      });

      client.setLogLevel("none");
      await client.connect();

      const me = await client.getMe();

      const authKeyBase64 = session.authKey.getKey().toString("base64");
      const sessionId = me.phone;

      await sessionManager.addSession(sessionId, {
        sessionId,
        phoneNumber: me.phone,
        firstName: me.firstName || null,
        lastName: me.lastName || null,
        username: me.username || null,
        isActive: true,
        lastUsed: new Date(),
        authKey: { _key: authKeyBase64 },
        dcId: session.dcId,
        port: session.port || 443,
        serverAddress: session.serverAddress || "149.154.167.91",
      });

      this.progress.success++;
      return { success: true };
    } catch (error) {
      this.progress.fail++;
      return { success: false, error: error.message };
    }
  }

  async importMultipleSessions(sessionPaths, progressCallback) {
    this.progress = {
      success: 0,
      fail: 0,
      total: sessionPaths.length,
      finished: false,
    };
    progressCallback(this.progress);

    const results = [];
    for (const sessionPath of sessionPaths) {
      const result = await this.importSession(sessionPath);
      results.push(result);
      progressCallback(this.progress);
    }

    this.progress.finished = true;
    progressCallback(this.progress);

    if (this.progress.success === 0) {
      return {
        success: false,
        error:
          this.progress.fail > 0
            ? `${this.progress.fail} session yüklenemedi`
            : "Hiç session yüklenemedi",
      };
    }

    return {
      success: true,
      successCount: this.progress.success,
      failCount: this.progress.fail,
    };
  }
}

module.exports = SessionImporter;
