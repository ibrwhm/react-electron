const mongoose = require("mongoose");

const deviceInfoSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true },
    hostname: { type: String, required: true },
  },
  { _id: false }
);

const loginHistorySchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    deviceInfo: { type: deviceInfoSchema, required: true },
  },
  { _id: false }
);

const licenseSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["basic", "pro", "admin"],
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 365 * 24 * 60 * 60,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      index: true,
    },
    hardwareId: {
      type: String,
      sparse: true,
      index: true,
    },
    loginHistory: [loginHistorySchema],
    maxDevices: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

licenseSchema.methods.deactivate = async function () {
  this.isActive = false;
  return this.save();
};

const LicenseModel = mongoose.model("License", licenseSchema);

module.exports = LicenseModel;
