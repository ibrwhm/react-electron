const { MemorySession } = require("telegram/sessions");
const { AuthKey } = require("telegram/crypto/AuthKey");

class MongoDBSession extends MemorySession {
  constructor(sessionId, store) {
    super();
    this.sessionId = sessionId;
    this.store = store;
  }

  async load() {
    try {
      const sessions = this.store.get("sessions") || [];
      const sessionData = sessions.find(
        (session) => session.sessionId === this.sessionId
      );

      if (!sessionData) {
        throw new Error("Session verisi bulunamadı");
      }

      if (sessionData.authKey) {
        this._authKey = new AuthKey();
        await this._authKey.setKey(
          Buffer.from(sessionData.authKey._key, "base64")
        );
      }

      this._dcId = sessionData.dcId;
      this._port = sessionData.port;
      this._serverAddress = sessionData.serverAddress;

      return this;
    } catch (error) {
      console.error("Session yükleme hatası:", error);
      throw error;
    }
  }

  async save() {
    return this;
  }
}

module.exports = MongoDBSession;
