const mongoose = require("mongoose");
const log = require("electron-log");
const path = require("path");
const { app } = require("electron");

console.log(app.getAppPath());

const envPath = app.isPackaged
  ? path.join(app.getAppPath(), ".env")
  : path.join(__dirname, "../../.env");

require("dotenv").config({ path: envPath });

const connectionOptions = {
  serverSelectionTimeoutMS: 3000,
  socketTimeoutMS: 30000,
  family: 4,
  maxPoolSize: 5,
  minPoolSize: 1,
  connectTimeoutMS: 5000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  w: "majority",
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

const maxRetries = 2;
const retryDelay = 2000;

let retryCount = 0;
let isConnected = false;

mongoose.connection.on("connected", () => {
  log.info("MongoDB bağlantısı başarılı");
  isConnected = true;
  retryCount = 0;
});

mongoose.connection.on("error", (err) => {
  log.error("MongoDB bağlantı hatası:", err);
  isConnected = false;
});

mongoose.connection.on("disconnected", () => {
  log.warn("MongoDB bağlantısı kesildi");
  isConnected = false;
  if (retryCount < maxRetries) {
    setTimeout(connectWithRetry, retryDelay);
  }
});

mongoose.set("bufferCommands", false);

const connectWithRetry = async () => {
  try {
    if (!isConnected) {
      retryCount++;
      log.info(
        `MongoDB bağlantısı deneniyor... (Deneme ${retryCount}/${maxRetries})`
      );

      if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI environment variable is not defined");
      }

      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }

      await Promise.race([
        mongoose.connect(process.env.MONGODB_URI, connectionOptions),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Bağlantı zaman aşımı")),
            connectionOptions.connectTimeoutMS
          )
        ),
      ]);
    }
  } catch (error) {
    log.error(
      `MongoDB bağlantı hatası (Deneme ${retryCount}/${maxRetries}):`,
      error.message
    );

    if (
      error.message.includes("ENOTFOUND") ||
      error.message.includes("Authentication failed") ||
      error.message.includes("MONGODB_URI environment variable is not defined")
    ) {
      throw error;
    }

    if (retryCount < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return connectWithRetry();
    } else {
      log.error(
        "MongoDB bağlantısı başarısız oldu, maksimum deneme sayısına ulaşıldı"
      );
      throw error;
    }
  }
};

const connectDB = async () => {
  try {
    await connectWithRetry();

    process.on("SIGINT", async () => {
      try {
        await mongoose.connection.close();
        log.info("MongoDB bağlantısı kapatıldı");
        process.exit(0);
      } catch (err) {
        log.error("MongoDB bağlantısı kapatılırken hata:", err);
        process.exit(1);
      }
    });
  } catch (error) {
    log.error("MongoDB bağlantısı başlatılamadı:", error);
    throw error;
  }
};

const isDBConnected = () => isConnected;

module.exports = {
  connectDB,
  isDBConnected,
  mongoose,
};
