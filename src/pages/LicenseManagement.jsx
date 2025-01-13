import React, { useState, useEffect } from "react";

const LicenseManagement = () => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
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
      console.log("Gelen lisanslar:", allLicenses);

      // data property'sini kontrol et
      const licenseData = allLicenses.data || allLicenses;

      // Eğer data bir obje ise Object.values ile diziye çevir
      const licenseArray = Array.isArray(licenseData)
        ? licenseData
        : Object.values(licenseData);

      console.log("İşlenmiş lisans dizisi:", licenseArray);
      setLicenses(licenseArray);
      setLoading(false);
    } catch (error) {
      console.error("Lisans yükleme hatası:", error);
      setError("Lisanslar yüklenirken hata oluştu");
      setLoading(false);
    }
  };

  const handleCreateLicense = async (useCustomKey = false) => {
    try {
      setError("");
      setSuccess("");

      const key = useCustomKey ? customKey : null;
      const license = await window.api.createLicense(
        selectedType,
        selectedDuration,
        key
      );

      if (license) {
        setSuccess(`Lisans başarıyla oluşturuldu: ${license.key}`);
        setCustomKey("");
        loadLicenses();
      }
    } catch (error) {
      setError("Lisans oluşturulurken hata oluştu");
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

  const getStatusColor = (license) => {
    if (!license?.isActive) return "text-red-500";
    if (new Date(license?.expiresAt) < new Date()) return "text-orange-500";
    return "text-green-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-telegram-dark text-white p-8">
        <div className="animate-pulse">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-telegram-dark text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-4">Lisans Yönetimi</h1>

          {/* Lisans Oluşturma Formu */}
          <div className="bg-telegram-card p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Yeni Lisans Oluştur</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Lisans Tipi
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-telegram-dark border border-telegram-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-telegram-primary"
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Süre (Ay)
                </label>
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(Number(e.target.value))}
                  className="w-full bg-telegram-dark border border-telegram-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-telegram-primary"
                >
                  <option value={1}>1 Ay</option>
                  <option value={3}>3 Ay</option>
                  <option value={6}>6 Ay</option>
                  <option value={12}>12 Ay</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Özel Anahtar (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="w-full bg-telegram-dark border border-telegram-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-telegram-primary"
                />
              </div>

              <div className="flex items-end space-x-2">
                <button
                  onClick={() => handleCreateLicense(false)}
                  className="px-4 py-2 bg-telegram-primary hover:bg-telegram-primary-hover rounded-md transition-colors"
                >
                  Otomatik Oluştur
                </button>
                <button
                  onClick={() => handleCreateLicense(true)}
                  disabled={!customKey}
                  className="px-4 py-2 bg-telegram-secondary hover:bg-telegram-secondary-hover rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Özel Oluştur
                </button>
              </div>
            </div>

            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
            {success && (
              <div className="text-green-500 text-sm mt-2">{success}</div>
            )}
          </div>

          {/* Lisans Listesi */}
          <div className="bg-telegram-card p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Mevcut Lisanslar</h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-telegram-border">
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
                <tbody className="divide-y divide-telegram-border">
                  {licenses.map((license) =>
                    license?.key ? (
                      <tr key={license.key} className="hover:bg-telegram-hover">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {license.key}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">
                          {license.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={getStatusColor(license)}>
                            {license.isActive ? "Aktif" : "Devre Dışı"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatDate(license.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatDate(license.expiresAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatDate(license.lastLoginAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {license.key &&
                            !license.key.startsWith("ADMIN-TEST") && (
                              <button
                                onClick={() => handleDeleteLicense(license.key)}
                                className="text-red-500 hover:text-red-400 transition-colors"
                              >
                                Sil
                              </button>
                            )}
                        </td>
                      </tr>
                    ) : null
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseManagement;
