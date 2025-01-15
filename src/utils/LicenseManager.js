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
    try {
      if (this.store) return;

      const { default: Store } = await import("electron-store");
      this.store = new Store({
        name: "license-manager",
        encryptionKey: "krishnay",
        cwd: this.storeDir,
        clearInvalidConfig: true,
      });
    } catch (error) {
      console.error("Store başlatma hatası:", error);
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

  async validateLicense(key, isManualLogin = true) {
    try {
      if (!key) {
        return { success: false, message: "Lisans anahtarı bulunamadı" };
      }

      const now = new Date();
      const lastValidation = this._lastValidation?.[key];
      if (lastValidation && now - lastValidation < 1000) {
        return (
          this._lastValidationResult?.[key] || {
            success: false,
            message: "Doğrulama sonucu bulunamadı",
          }
        );
      }

      if (!this._lastValidation) this._lastValidation = {};
      if (!this._lastValidationResult) this._lastValidationResult = {};
      this._lastValidation[key] = now;

      if (this.isDevelopment && this.testLicenses[key]) {
        const result = { success: true, data: this.testLicenses[key] };
        this._lastValidationResult[key] = result;
        return result;
      }

      const mongoose = require("mongoose");
      if (mongoose.connection.readyState !== 1) {
        const result = {
          success: false,
          message: "Veritabanı bağlantısı bekleniyor, lütfen tekrar deneyin",
        };
        this._lastValidationResult[key] = result;
        return result;
      }

      const license = await LicenseModel.findOne({
        key: key.trim().toUpperCase(),
      });

      if (!license) {
        const result = { success: false, message: "Geçersiz lisans anahtarı" };
        this._lastValidationResult[key] = result;
        return result;
      }

      if (!license.isActive) {
        const result = { success: false, message: "Bu lisans deaktif edilmiş" };
        this._lastValidationResult[key] = result;
        return result;
      }

      const expiryDate = new Date(license.expiresAt);

      if (now > expiryDate) {
        const result = { success: false, message: "Lisans süresi dolmuş" };
        this._lastValidationResult[key] = result;
        return result;
      }

      const hardwareId = await this.getHardwareId();

      if (license.hardwareId && license.hardwareId !== hardwareId) {
        const result = {
          success: false,
          message: "Bu lisans başka bir cihazda aktif",
        };
        this._lastValidationResult[key] = result;
        return result;
      }

      let shouldUpdate = false;

      if (!license.hardwareId) {
        license.hardwareId = hardwareId;
        shouldUpdate = true;
      }

      if (isManualLogin) {
        license.lastLoginAt = now;
        if (!license.loginHistory) license.loginHistory = [];
        license.loginHistory = license.loginHistory.slice(-9);
        license.loginHistory.push({
          date: now,
          deviceInfo: {
            platform: os.platform(),
            hostname: os.hostname(),
          },
        });
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        await license.save();
      }

      this.store.set("currentLicense", key);

      const result = {
        success: true,
        data: license.toObject(),
      };
      this._lastValidationResult[key] = result;
      return result;
    } catch (error) {
      const result = {
        success: false,
        message: error.message || "Lisans doğrulanırken bir hata oluştu",
      };
      this._lastValidationResult[key] = result;
      return result;
    }
  }

  async checkStoredLicense() {
    try {
      const storedKey = this.store.get("currentLicense");

      if (!storedKey) {
        return { success: false, message: "Kayıtlı lisans bulunamadı" };
      }

      // Otomatik kontrol için validateLicense'ı çağırırken isManualLogin=false
      const result = await this.validateLicense(storedKey, false);

      if (!result.success) {
        this.store.delete("currentLicense");
      }

      return result;
    } catch (error) {
      return { success: false, message: "Bir hata oluştu" };
    }
  }

  async storeLicense(key) {
    try {
      await this.initStore();

      const validationResult = await this.validateLicense(key);
      if (!validationResult.success) {
        return {
          success: false,
          message: validationResult.message,
        };
      }

      this.store.set("currentLicense", key);

      return {
        success: true,
        message: "Lisans başarıyla kaydedildi",
      };
    } catch (error) {
      console.error("Lisans kaydetme hatası:", error);
      return {
        success: false,
        message: error.message || "Lisans kaydedilirken bir hata oluştu",
      };
    }
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

      const formattedLicenses = licenses.map((license) => ({
        key: license.key,
        type: license.type,
        isActive: license.isActive,
        createdAt: license.createdAt.toISOString(),
        expiresAt: license.expiresAt.toISOString(),
        lastLoginAt: license.lastLoginAt
          ? license.lastLoginAt.toISOString()
          : null,
        hardwareId: license.hardwareId,
      }));

      // Test lisanslarını diziye çevir
      const testLicenseArray = Object.entries(this.testLicenses).map(
        ([key, license]) => ({
          ...license,
          key,
        })
      );

      const allLicenses = [...formattedLicenses, ...testLicenseArray];

      return {
        success: true,
        data: allLicenses,
      };
    } catch (error) {
      return {
        success: true,
        data: Object.entries(this.testLicenses).map(([key, license]) => ({
          ...license,
          key,
        })),
      };
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
