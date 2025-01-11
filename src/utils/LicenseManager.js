const path = require("path");
const fs = require("fs-extra");
const crypto = require("crypto");
const os = require("os");
const LicenseModel = require(path.join(__dirname, "..", "models", "License"));
const { app } = require("electron");

class LicenseManager {
  constructor() {
    this.storeDir = path.join(app.getPath("userData"), "store");
    this.store = null;

    this.isDevelopment = process.env.NODE_ENV !== "production";
    this.testLicenses = {
      "ADMIN-TEST-1234-5678": {
        key: "ADMIN-TEST-1234-5678",
        type: "admin",
        isActive: true,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        lastLoginAt: null,
        loginHistory: [],
      },
    };

    this.initStore();
    this.ensureDirectories();
  }

  async initStore() {
    if (this.store) return;

    try {
      const { default: Store } = await import("electron-store");
      this.store = new Store({
        name: "license-manager",
        encryptionKey: "krishnay",
        cwd: this.storeDir,
      });
    } catch (error) {
      console.error("License Store initialization error:", error);
      throw error;
    }
  }

  async ensureDirectories() {
    await fs.ensureDir(this.storeDir);
  }

  generateLicenseKey() {
    const segments = [];
    for (let i = 0; i < 4; i++) {
      const segment = crypto.randomBytes(2).toString("hex").toUpperCase();
      segments.push(segment);
    }
    return segments.join("-");
  }

  calculateExpiryDate(months) {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  }

  async getHardwareId() {
    const networkInterfaces = os.networkInterfaces();
    const cpus = os.cpus();

    const systemInfo = {
      platform: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
      cpus: cpus[0].model,
      mac: Object.values(networkInterfaces)
        .flat()
        .filter((ni) => !ni.internal && ni.mac !== "00:00:00:00:00:00")
        .map((ni) => ni.mac)
        .join(""),
    };

    const hash = crypto.createHash("sha256");
    hash.update(JSON.stringify(systemInfo));
    return hash.digest("hex");
  }

  async createLicense(type = "basic", months = 1, customKey = null) {
    try {
      const key = customKey || this.generateLicenseKey();
      const expiresAt = this.calculateExpiryDate(months);

      const license = new LicenseModel({
        key,
        type,
        isActive: true,
        expiresAt,
        createdAt: new Date(),
      });

      await license.save();

      return {
        key: license.key,
        type: license.type,
        isActive: license.isActive,
        createdAt: license.createdAt.toISOString(),
        expiresAt: license.expiresAt.toISOString(),
        lastLoginAt: null,
      };
    } catch (error) {
      throw error;
    }
  }

  async validateLicense(key) {
    try {
      if (this.isDevelopment && this.testLicenses[key]) {
        return { valid: true, license: this.testLicenses[key] };
      }

      if (!key) {
        key = this.store.get("currentLicense");
        if (!key) {
          return { valid: false, message: "Lisans anahtarı bulunamadı" };
        }
      }

      const license = await LicenseModel.findOne({ key });
      if (!license) {
        return { valid: false, message: "Geçersiz lisans anahtarı" };
      }

      if (!license.isActive) {
        return { valid: false, message: "Bu lisans deaktif edilmiş" };
      }

      const hardwareId = await this.getHardwareId();

      if (license.hardwareId && license.hardwareId !== hardwareId) {
        return { valid: false, message: "Bu lisans başka bir cihazda aktif" };
      }

      if (key !== this.store.get("currentLicense")) {
        const now = new Date();
        license.hardwareId = hardwareId;
        license.lastLoginAt = now;

        if (!license.loginHistory) license.loginHistory = [];
        license.loginHistory.push({
          date: now,
          deviceInfo: {
            platform: os.platform(),
            hostname: os.hostname(),
          },
        });

        await license.save();
        this.store.set("currentLicense", key);
      }

      return { valid: true, license: license.toObject() };
    } catch (error) {
      return { valid: false, message: "Bir hata oluştu" };
    }
  }

  async checkStoredLicense() {
    try {
      const storedKey = this.store.get("currentLicense");

      if (!storedKey) {
        return { valid: false, message: "Kayıtlı lisans bulunamadı" };
      }

      if (this.isDevelopment && this.testLicenses[storedKey]) {
        return { valid: true, license: this.testLicenses[storedKey] };
      }

      const license = await LicenseModel.findOne({ key: storedKey });
      if (!license) {
        this.store.delete("currentLicense");
        return { valid: false, message: "Lisans bulunamadı" };
      }

      if (!license.isActive) {
        this.store.delete("currentLicense");
        return { valid: false, message: "Bu lisans deaktif edilmiş" };
      }

      const hardwareId = await this.getHardwareId();
      if (license.hardwareId && license.hardwareId !== hardwareId) {
        this.store.delete("currentLicense");
        return { valid: false, message: "Bu lisans başka bir cihazda aktif" };
      }

      return { valid: true, license: license.toObject() };
    } catch (error) {
      return { valid: false, message: "Bir hata oluştu" };
    }
  }

  async storeLicense(key) {
    await this.initStore();
    this.store.set("currentLicense", key);
    return true;
  }

  async deleteLicense(key) {
    try {
      if (this.testLicenses[key]) {
        return false;
      }

      await LicenseModel.deleteOne({ key });

      const currentLicense = this.store.get("currentLicense");
      if (currentLicense === key) {
        this.store.delete("currentLicense");
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async getAllLicenses() {
    try {
      const licenses = await LicenseModel.find();

      const formattedLicenses = licenses.reduce((acc, license) => {
        acc[license.key] = {
          key: license.key,
          type: license.type,
          isActive: license.isActive,
          createdAt: license.createdAt.toISOString(),
          expiresAt: license.expiresAt.toISOString(),
          lastLoginAt: license.lastLoginAt
            ? license.lastLoginAt.toISOString()
            : null,
        };
        return acc;
      }, {});

      return {
        ...formattedLicenses,
        ...this.testLicenses,
      };
    } catch (error) {
      return this.testLicenses;
    }
  }

  async deactivateLicense(key) {
    try {
      const license = await LicenseModel.findOne({ key });
      if (!license) {
        throw new Error("Lisans bulunamadı");
      }

      await license.deactivate();
      await this.clearStoredLicense();

      return { success: true, message: "Lisans deaktif edildi" };
    } catch (error) {
      throw error;
    }
  }

  async clearStoredLicense() {
    try {
      this.store.delete("currentLicense");
      return true;
    } catch (error) {
      throw error;
    }
  }
}

const licenseManager = new LicenseManager();
module.exports = licenseManager;
