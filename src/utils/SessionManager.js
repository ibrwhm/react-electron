const { app } = require("electron");
const fs = require("fs-extra");
const path = require("path");
const MongoDBSession = require("./MongoDBSession");
const { TelegramClient } = require("telegram");
const { getRandomApiCredentials } = require("./helpers");

class SessionManager {
  constructor() {
    this.storeDir = path.join(app.getPath("userData"), "store");
    this.store = null;
    this.loggedInSessions = [];

    this.initStore();
    this.ensureDirectories();
  }

  async initStore() {
    if (this.store) return;

    try {
      const { default: Store } = await import("electron-store");
      this.store = new Store({
        name: "session-manager",
        encryptionKey: "krishnay",
        cwd: this.storeDir,
        defaults: {
          sessions: [],
        },
      });

      const currentSessions = this.store.get("sessions");

      if (!currentSessions) {
        this.store.set("sessions", []);
      }
    } catch (error) {
      throw error;
    }
  }

  async ensureDirectories() {
    await fs.ensureDir(this.storeDir);
  }

  async getSessions() {
    return this.store.get("sessions") || [];
  }

  async updateSession(sessionId, data) {
    const getSessions = await this.getSessions();

    const updatedSession = getSessions.map((session) =>
      session.sessionId === sessionId ? { ...session, ...data } : session
    );

    this.store.set("sessions", updatedSession);
  }

  async addSession(sessionId, data) {
    const getSessions = await this.getSessions();

    const isDuplicate = getSessions.some(
      (session) =>
        session.sessionId === sessionId ||
        session.phoneNumber === data.phoneNumber
    );

    if (isDuplicate) {
      return {
        success: false,
        error: "Bu session veya telefon numarası zaten ekli",
      };
    }

    const updatedSessions = [...getSessions, data];
    this.store.set("sessions", updatedSessions);

    return {
      success: true,
      sessions: updatedSessions,
    };
  }

  async deleteSession(sessionId) {
    const getSessions = await this.getSessions();

    if (!getSessions) {
      return {
        success: false,
        error: "Session listesi bulunamadı.",
      };
    }

    this.store.set(
      "sessions",
      getSessions.filter((session) => session.sessionId !== sessionId)
    );

    return {
      success: true,
    };
  }

  async loginWithSessions() {
    try {
      if (this.loggedInSessions.length > 0) {
        const allConnected = await Promise.all(
          this.loggedInSessions.map(async (session) => {
            try {
              await session.client.getMe();
              return true;
            } catch {
              return false;
            }
          })
        );

        if (allConnected.every((connected) => connected)) {
          return {
            success: true,
            sessionCount: this.loggedInSessions.length,
            message: "Sessionlar zaten aktif",
          };
        }

        await this.disconnectAll();
      }

      const sessions = await this.getSessions();
      if (sessions.length === 0) {
        return { success: false, message: "Hiç aktif session bulunamadı!" };
      }

      const loginPromises = sessions.map(async (session) => {
        const { apiId, apiHash } = getRandomApiCredentials();
        const mongoSession = new MongoDBSession(session.sessionId, this.store);

        try {
          await mongoSession.load();

          const client = new TelegramClient(mongoSession, apiId, apiHash, {
            connectionRetries: 5,
            useWSS: true,
            retryDelay: 2000,
          });

          await client.connect();
          const user = await client.getMe();

          return {
            sessionId: session.sessionId,
            client,
            phoneNumber: user.phone,
          };
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(loginPromises);
      this.loggedInSessions = results.filter((session) => session !== null);

      if (this.loggedInSessions.length === 0) {
        throw new Error("Hiçbir session'a giriş yapılamadı!");
      }

      return {
        success: true,
        sessionCount: this.loggedInSessions.length,
        message: `${this.loggedInSessions.length} session başarıyla aktif edildi`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async disconnectAll() {
    try {
      for (const session of this.loggedInSessions) {
        try {
          await Promise.race([
            session.client.disconnect(),
            new Promise((resolve) => setTimeout(resolve, 5000)),
          ]);

          if (session.client.destroy) {
            await session.client.destroy();
          }
        } catch (error) {
          throw error;
        }
      }
      this.loggedInSessions = [];
      return { success: true, message: "Tüm sessionlar kapatıldı" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  getLoggedInSessions() {
    return this.loggedInSessions;
  }
}

const sessionManager = new SessionManager();
module.exports = sessionManager;
