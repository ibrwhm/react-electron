import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const LicenseManagement = () => {
  const [licenses, setLicenses] = useState([]);
  const [selectedType, setSelectedType] = useState("basic");
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [customKey, setCustomKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadLicenses();
  }, []);

  const loadLicenses = async () => {
    try {
      const allLicenses = await window.api.getAllLicenses();
      const licenseData = allLicenses.data || allLicenses;

      const licenseArray = Array.isArray(licenseData)
        ? licenseData
        : Object.values(licenseData);

      setLicenses(licenseArray);
    } catch (error) {
      setError("Lisanslar yüklenirken hata oluştu");
    }
  };

  const handleCreateLicense = async (useCustomKey = false) => {
    try {
      setError("");
      setSuccess("");

      const key = useCustomKey ? customKey : null;
      const result = await window.api.createLicense(
        selectedType,
        selectedDuration,
        key
      );

      if (result) {
        const licenseKey =
          result.key ||
          result.license?.key ||
          result.data?.key ||
          (typeof result === "string" ? result : null);

        if (licenseKey) {
          setSuccess(`Lisans başarıyla oluşturuldu: ${licenseKey}`);
          setCustomKey("");
          await loadLicenses();
        } else {
          throw new Error("API yanıtında lisans anahtarı bulunamadı");
        }
      } else {
        throw new Error("API yanıtı alınamadı");
      }
    } catch (error) {
      setError(`Lisans oluşturulurken hata oluştu: ${error.message}`);
    }
  };

  const handleDeleteLicense = async (key) => {
    try {
      setError("");
      setSuccess("");

      const result = await window.api.deleteLicense(key);
      if (result) {
        setSuccess(`Lisans başarıyla silindi: ${key}`);
        loadLicenses();
      } else {
        setError("Lisans silinirken hata oluştu");
      }
    } catch (error) {
      setError("Lisans silinirken hata oluştu");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("tr-TR");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
        duration: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-gradient-to-br from-telegram-dark via-[#1c2c3e] to-telegram-darker py-12 px-4 relative overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-telegram-primary/10 rounded-full blur-3xl transform -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-telegram-secondary/10 rounded-full blur-3xl transform translate-y-1/2"></div>
      </div>

      <div className="max-w-7xl mx-auto relative px-4 py-8">
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-telegram-primary to-blue-400 bg-clip-text text-transparent">
            Lisans Yönetimi
          </h1>
          <div className="text-sm text-telegram-secondary">
            Toplam Lisans: {licenses.length}
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-telegram-card/30 backdrop-blur-sm p-6 mb-8 rounded-2xl border border-telegram-border/30 shadow-lg"
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-telegram-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Yeni Lisans Oluştur
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-telegram-secondary">
                Lisans Tipi
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-telegram-dark/50 border border-telegram-border/20 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-telegram-primary/50 transition-all"
              >
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-telegram-secondary">
                Süre
              </label>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                className="w-full bg-telegram-dark/50 border border-telegram-border/20 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-telegram-primary/50 transition-all"
              >
                <option value={1}>1 Ay</option>
                <option value={3}>3 Ay</option>
                <option value={6}>6 Ay</option>
                <option value={12}>12 Ay</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-telegram-secondary">
                Özel Anahtar
              </label>
              <input
                type="text"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="w-full bg-telegram-dark/50 border border-telegram-border/20 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-telegram-primary/50 transition-all placeholder-telegram-secondary/50"
              />
            </div>

            <motion.div className="flex items-end space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCreateLicense(false)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-medium flex items-center gap-2"
              >
                Otomatik Oluştur
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCreateLicense(true)}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg font-medium flex items-center gap-2"
              >
                Özel Oluştur
              </motion.button>
            </motion.div>
          </div>

          {(error || success) && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                error
                  ? "bg-red-500/10 text-red-500"
                  : "bg-green-500/10 text-green-500"
              }`}
            >
              {error || success}
            </div>
          )}
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-telegram-card/30 backdrop-blur-sm p-6 mb-8 rounded-2xl border border-telegram-border/30 shadow-lg"
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-telegram-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Mevcut Lisanslar
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-telegram-border/10">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-telegram-secondary uppercase tracking-wider">
                    Anahtar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-telegram-secondary uppercase tracking-wider">
                    Tip
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-telegram-secondary uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-telegram-secondary uppercase tracking-wider">
                    Oluşturulma
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-telegram-secondary uppercase tracking-wider">
                    Bitiş
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-telegram-secondary uppercase tracking-wider">
                    Son Giriş
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-telegram-secondary uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-telegram-border/10">
                {licenses.map((license) =>
                  license?.key ? (
                    <tr key={license.key}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {license.key}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-telegram-primary/10 text-telegram-primary">
                          {license.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            !license.isActive
                              ? "bg-red-500/10 text-red-500"
                              : new Date(license.expiresAt) < new Date()
                              ? "bg-orange-500/10 text-orange-500"
                              : "bg-green-500/10 text-green-500"
                          }`}
                        >
                          {license.isActive ? "Aktif" : "Devre Dışı"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-telegram-secondary">
                        {formatDate(license.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-telegram-secondary">
                        {formatDate(license.expiresAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-telegram-secondary">
                        {formatDate(license.lastLoginAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {license.key &&
                          !license.key.startsWith("ADMIN-TEST") && (
                            <button
                              onClick={() => handleDeleteLicense(license.key)}
                              className="text-red-500 hover:text-red-400 transition-colors focus:outline-none"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                      </td>
                    </tr>
                  ) : null
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LicenseManagement;
