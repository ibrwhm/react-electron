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
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
  maxPoolSize: 10,
  minPoolSize: 2,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 30000,
};

const maxRetries = 3;
const retryDelay = 5000;

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

      await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
    }
  } catch (error) {
    log.error(
      `MongoDB bağlantı hatası (Deneme ${retryCount}/${maxRetries}):`,
      error
    );
    if (retryCount < maxRetries) {
      setTimeout(connectWithRetry, retryDelay);
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
