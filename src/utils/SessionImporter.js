const { TelegramClient } = require("telegram");
const { getRandomApiCredentials } = require("./helpers");
const SQLiteSession = require("gramjs-sqlitesession");
const MongoDBSession = require("./MongoDBSession");
const SessionManager = require("./SessionManager");

class SessionImporter {
  constructor() {
    this.progress = { success: 0, fail: 0, total: 0, finished: false };
  }

  async checkSession(session) {
    let client = null;
    try {
      const mongoSession = new MongoDBSession(
        session.sessionId,
        SessionManager.store
      );
      await mongoSession.load();

      const { apiId, apiHash } = getRandomApiCredentials();

      client = new TelegramClient(mongoSession, apiId, apiHash, {
        connectionRetries: 2,
        timeout: 20000,
        useWSS: true,
        retryDelay: 1000,
        autoReconnect: false,
      });

      await Promise.race([
        client.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Bağlantı zaman aşımı")), 20000)
        ),
      ]);

      const me = await client.getMe();

      await SessionManager.updateSession(session.sessionId, {
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
      await SessionManager.deleteSession(session.sessionId);
      this.progress.fail++;
      return {
        success: false,
        message: `Session kontrol hatası: ${error.message}`,
      };
    } finally {
      if (client) {
        try {
          await Promise.race([
            client.disconnect(),
            new Promise((resolve) => setTimeout(resolve, 5000)),
          ]);

          if (client.destroy) {
            await client.destroy();
          }
        } catch (error) {
          console.error("Bağlantı kapatma hatası:", error);
        } finally {
          client = null;
        }
      }
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
      this.progress = {
        ...this.progress,
        success: results.filter((r) => r.success).length,
        fail: results.filter((r) => !r.success).length,
      };
      progressCallback(this.progress);
    }

    this.progress.finished = true;
    progressCallback(this.progress);
    return results;
  }

  async importSession(sessionPath) {
    let client = null;
    try {
      if (!sessionPath || typeof sessionPath !== "string") {
        throw new Error("Geçersiz session dosya yolu");
      }

      const session = new SQLiteSession(sessionPath);
      try {
        await session.load();
      } catch (loadError) {
        throw new Error(`Session dosyası okunamadı: ${loadError.message}`);
      }

      const { apiId, apiHash } = getRandomApiCredentials();

      client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 2,
        timeout: 20000,
        useWSS: true,
        retryDelay: 1000,
        autoReconnect: false,
      });

      client.setLogLevel("none");

      await Promise.race([
        client.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Bağlantı zaman aşımı")), 20000)
        ),
      ]);

      const me = await client.getMe();

      const authKeyBase64 = session.authKey.getKey().toString("base64");
      const sessionId = me.phone;

      const result = await SessionManager.addSession(sessionId, {
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

      if (result.success) {
        this.progress.success++;
        return {
          success: true,
          message: `${me.phone} numaralı session başarıyla yüklendi`,
        };
      } else {
        this.progress.fail++;
        return {
          success: false,
          error: result.error || "Session kaydedilemedi",
        };
      }
    } catch (error) {
      this.progress.fail++;
      return {
        success: false,
        error:
          error.message === "Bağlantı zaman aşımı"
            ? "Session bağlantı zaman aşımına uğradı (30 saniye)"
            : `Session yüklenemedi: ${error.message}`,
      };
    } finally {
      if (client) {
        try {
          await Promise.race([
            client.disconnect(),
            new Promise((resolve) => setTimeout(resolve, 5000)),
          ]);

          if (client.destroy) {
            await client.destroy();
          }
        } catch (error) {
          console.error("Bağlantı kapatma hatası:", error);
        } finally {
          client = null;
        }
      }
    }
  }

  async importMultipleSessions(sessionPaths, progressCallback) {
    if (!Array.isArray(sessionPaths) || sessionPaths.length === 0) {
      return {
        success: false,
        error: "Yüklenecek session dosyası seçilmedi",
      };
    }

    this.progress = {
      success: 0,
      fail: 0,
      total: sessionPaths.length,
      finished: false,
      currentFile: "",
    };

    progressCallback(this.progress);

    const results = [];
    for (const [index, sessionPath] of sessionPaths.entries()) {
      this.progress.currentFile = sessionPath;
      progressCallback(this.progress);

      try {
        const result = await this.importSession(sessionPath);
        results.push({
          path: sessionPath,
          ...result,
        });

        this.progress = {
          ...this.progress,
          success: results.filter((r) => r.success).length,
          fail: results.filter((r) => !r.success).length,
          currentFile: sessionPath,
        };
        progressCallback(this.progress);
      } catch (error) {
        this.progress.fail++;
        results.push({
          path: sessionPath,
          success: false,
          error: error.message,
        });

        progressCallback({
          ...this.progress,
          currentFile: sessionPath,
        });
      }
    }

    this.progress.finished = true;
    this.progress.currentFile = "";
    progressCallback(this.progress);

    if (results.every((r) => !r.success)) {
      const firstError = results[0]?.error || "Bilinmeyen hata";
      return {
        success: false,
        error:
          results.length === 1
            ? `Session yüklenemedi: ${firstError}`
            : `${results.length} session yüklenemedi. İlk hata: ${firstError}`,
      };
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      success: successCount > 0,
      successCount,
      failCount,
      results: results.map((r) => ({
        path: r.path,
        success: r.success,
        message: r.message,
        error: r.error,
      })),
    };
  }
}

module.exports = SessionImporter;
