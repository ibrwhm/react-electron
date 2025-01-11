const mongoose = require("mongoose");

const licenseSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  type: { type: String, enum: ["basic", "pro", "admin"], required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  lastLoginAt: { type: Date },
  hardwareId: { type: String },
  loginHistory: [
    {
      date: Date,
      deviceInfo: {
        platform: String,
        hostname: String,
      },
    },
  ],
});

licenseSchema.methods.deactivate = async function () {
  this.isActive = false;
  return this.save();
};

const LicenseModel = mongoose.model("License", licenseSchema);
module.exports = LicenseModel;
