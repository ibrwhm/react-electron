const { MemorySession } = require("telegram/sessions");
const { AuthKey } = require("telegram/crypto/AuthKey");
const sessionManager = require("./SessionManager");

class MongoDBSession extends MemorySession {
  constructor(sessionId) {
    super();
    this.sessionId = sessionId;
  }

  async load() {
    try {
      const sessionId = this.sessionId;
      const sessions = await sessionManager.getSessions();
      const sessionData = await sessions.find(
        (session) => session.sessionId == sessionId
      );

      if (!sessionData) {
        throw new Error("Session verisi bulunamadı.");
      }

      const authKeyData = sessionData.authKey;
      if (authKeyData) {
        this._authKey = new AuthKey();
        await this._authKey.setKey(Buffer.from(authKeyData._key, "base64"));
      }

      this._dcId = sessionData.dcId;
      this._port = sessionData.port;
      this._serverAddress = sessionData.serverAddress;

      return this;
    } catch (error) {
      throw error;
    }
  }

  async save() {
    return this;
  }
}

module.exports = MongoDBSession;
