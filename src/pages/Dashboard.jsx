import React, { useState, useEffect, useCallback } from "react";
import { format, differenceInDays, isValid } from "date-fns";
import { tr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { BsShieldCheck } from "react-icons/bs";
import toast from "react-hot-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemInfo, setSystemInfo] = useState({
    licenseType: "",
    daysLeft: 0,
    totalDays: 365,
    sessions: 1,
    lastLogin: null,
    deviceId: "",
    os: "",
    region: "TR",
    status: "active",
    version: "",
    ipAddress: "",
    updateAvailable: false,
    loginHistory: [],
    sessionStartTime: new Date(),
  });

  const loadAllData = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const licenseResponse = await window.api.getLicense();

      if (!licenseResponse?.data) {
        await window.api.logout();
        navigate("/login", { replace: true });
        return;
      }

      const license = licenseResponse.data;

      const [osInfo, ipInfo, versionInfo, updateInfo, sessionsInfo] =
        await Promise.all([
          window.api
            .getSystemInfo()
            .catch(() => ({ data: { os: "Bilinmiyor" } })),
          window.api
            .getIpAddress()
            .catch(() => ({ data: { ip: "Bilinmiyor" } })),
          window.api
            .getAppVersion()
            .catch(() => ({ data: { version: "1.0.0" } })),
          window.api
            .checkForUpdates()
            .catch(() => ({ data: { available: false } })),
          window.api.getSessions().catch(() => ({ data: { sessions: [] } })),
        ]);

      const expiryDate = new Date(license.expiresAt);
      const startDate = new Date(license.createdAt);
      const today = new Date();
      const lastLoginDate = license.lastLoginAt
        ? new Date(license.lastLoginAt)
        : new Date();

      if (
        !isValid(expiryDate) ||
        !isValid(startDate) ||
        !isValid(lastLoginDate)
      ) {
        throw new Error("Geçersiz tarih değeri tespit edildi");
      }

      const daysLeft = differenceInDays(expiryDate, today);
      const totalDays = differenceInDays(expiryDate, startDate);

      let status = "active";
      if (daysLeft <= 0) status = "expired";
      else if (daysLeft <= 7) status = "warning";

      setSystemInfo({
        licenseType: license.type || "Standart",
        daysLeft: Math.max(0, daysLeft),
        totalDays,
        lastLogin: lastLoginDate,
        deviceId: license.hardwareId || "Bilinmiyor",
        loginHistory: license.loginHistory || [],
        os: osInfo?.data?.os || "Bilinmiyor",
        ipAddress: ipInfo?.data?.ip || "Bilinmiyor",
        version: versionInfo?.data?.version || "1.0.0",
        updateAvailable: updateInfo?.data?.available || false,
        sessions: sessionsInfo?.data?.sessions?.length || 0,
        status,
        sessionStartTime: new Date(),
        region: "TR",
      });
    } catch (error) {
      setError(error.message || "Veriler yüklenirken bir hata oluştu");
      toast.error("Veriler yüklenirken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "text-telegram-success bg-telegram-success/10";
      case "warning":
        return "text-telegram-warning bg-telegram-warning/10";
      case "expired":
        return "text-telegram-error bg-telegram-error/10";
      default:
        return "text-telegram-secondary bg-telegram-dark";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "Aktif";
      case "warning":
        return "Yakında Sona Erecek";
      case "expired":
        return "Süresi Dolmuş";
      default:
        return "Bilinmiyor";
    }
  };

  const handleUpdate = async () => {
    try {
      await window.api.startUpdate();
    } catch (error) {
      throw new Error("Güncelleme başlatılırken hata:");
    }
  };

  const calculateSessionDuration = () => {
    const now = new Date();
    const diff = now - systemInfo.sessionStartTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} saat ${minutes} dakika`;
  };

  const StatCard = ({ icon, title, children, className = "" }) => (
    <div className={`bg-telegram-card rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-telegram-secondary">{title}</span>
        {icon}
      </div>
      {children}
    </div>
  );

  const formatDate = (date) => {
    if (!date || !isValid(date)) {
      return "Bilinmiyor";
    }
    return format(date, "d MMM yyyy", { locale: tr });
  };

  const formatTime = (date) => {
    if (!date || !isValid(date)) {
      return "Bilinmiyor";
    }
    return format(date, "HH:mm");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-telegram-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-telegram-primary mx-auto"></div>
          <p className="text-telegram-secondary mt-4">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-telegram-dark">
        <div className="text-center p-6 bg-telegram-card rounded-lg">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={loadAllData}
            className="px-4 py-2 bg-telegram-primary rounded-lg hover:bg-telegram-primary/90 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-telegram-card rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Hoş Geldiniz! <span className="text-2xl">👋</span>
            </h1>
            <p className="text-telegram-secondary mt-1">
              Telegram Manager Dashboard'a hoş geldiniz
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">
              {format(currentTime, "HH:mm:ss")}
            </div>
            <div className="text-telegram-secondary">
              {format(currentTime, "d MMMM yyyy EEEE", { locale: tr })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Lisans Durumu"
          icon={<BsShieldCheck className="text-2xl text-telegram-primary" />}
        >
          <div className="flex items-center gap-3">
            <div
              className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(
                systemInfo.status
              )}`}
            >
              {getStatusText(systemInfo.status)}
            </div>
            <div className="text-xs text-telegram-secondary">
              {systemInfo.licenseType || "Yükleniyor..."}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-telegram-secondary">Kalan Süre</span>
              <span className="text-white">{systemInfo.daysLeft} gün</span>
            </div>
            <div className="h-2 bg-telegram-dark rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  systemInfo.status === "active"
                    ? "bg-telegram-success"
                    : systemInfo.status === "warning"
                    ? "bg-telegram-warning"
                    : "bg-telegram-error"
                }`}
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      (systemInfo.daysLeft / systemInfo.totalDays) * 100
                    )
                  )}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-telegram-border">
            <div className="text-sm text-telegram-secondary mb-1">
              Device ID
            </div>
            <div className="font-mono text-sm text-white break-all">
              {systemInfo.deviceId}
            </div>
          </div>
        </StatCard>

        <StatCard
          title="Aktif Oturum"
          icon={<i className="ri-user-line text-2xl text-telegram-primary"></i>}
        >
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-4xl font-bold text-white">
                  {systemInfo.sessions}
                </div>
                <div className="text-telegram-secondary mt-1">Aktif Oturum</div>
              </div>
              <div className="text-telegram-success text-sm flex items-center gap-1 bg-telegram-success/10 px-3 py-1 rounded-full">
                <i className="ri-arrow-up-line"></i>
                Çevrimiçi
              </div>
            </div>

            <div className="pt-4 border-t border-telegram-border">
              <div className="flex justify-between items-center text-sm">
                <div className="text-telegram-secondary">Oturum Süresi</div>
                <div className="text-white">{calculateSessionDuration()}</div>
              </div>
            </div>
          </div>
        </StatCard>

        <StatCard
          title="Son Giriş Bilgileri"
          icon={
            <i className="ri-login-circle-line text-2xl text-telegram-primary"></i>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-telegram-secondary">
                Tarih & Saat
              </div>
              <div className="text-white">
                {formatDate(systemInfo.lastLogin)}
              </div>
              <div className="text-telegram-primary font-medium">
                {formatTime(systemInfo.lastLogin)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-telegram-secondary">
                İşletim Sistemi
              </div>
              <div className="text-white">{systemInfo.os}</div>
              <div className="text-telegram-primary font-medium">
                {systemInfo.region}
              </div>
            </div>

            <div className="col-span-2 pt-3 border-t border-telegram-border">
              <div className="text-sm text-telegram-secondary mb-1">
                IP Adresi
              </div>
              <div className="font-mono text-sm text-white break-all">
                {systemInfo.ipAddress}
              </div>
            </div>
          </div>
        </StatCard>

        <StatCard
          title="Güvenlik Durumu"
          icon={
            <i className="ri-shield-check-line text-2xl text-telegram-success"></i>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-telegram-success/10 flex items-center justify-center">
                <i className="ri-check-line text-2xl text-telegram-success"></i>
              </div>
              <div>
                <div className="text-white font-medium">Güvenli</div>
                <div className="text-sm text-telegram-secondary">
                  Son 30 günde hatalı giriş yok
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-telegram-border">
              <div className="flex justify-between items-center text-sm">
                <div className="text-telegram-secondary">Son Kontrol</div>
                <div className="text-white">{format(new Date(), "HH:mm")}</div>
              </div>
            </div>
          </div>
        </StatCard>
      </div>

      <StatCard
        title="Sistem Durumu"
        icon={
          <i className="ri-download-cloud-line text-2xl text-telegram-primary"></i>
        }
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full ${
                systemInfo.updateAvailable
                  ? "bg-telegram-warning/10"
                  : "bg-telegram-success/10"
              } flex items-center justify-center`}
            >
              <i
                className={`${
                  systemInfo.updateAvailable
                    ? "ri-download-line text-telegram-warning"
                    : "ri-check-line text-telegram-success"
                } text-xl`}
              ></i>
            </div>
            <div>
              <div className="text-white">
                {systemInfo.updateAvailable
                  ? "Güncelleme Mevcut"
                  : "Sistem Güncel"}
              </div>
              <div className="text-sm text-telegram-secondary">
                v{systemInfo.version} sürümünü kullanıyorsunuz
              </div>
            </div>
          </div>
          <button
            onClick={handleUpdate}
            disabled={!systemInfo.updateAvailable}
            className={`px-4 py-2 rounded-lg ${
              systemInfo.updateAvailable
                ? "bg-telegram-primary/10 text-telegram-primary hover:bg-telegram-primary/20"
                : "bg-telegram-dark text-telegram-secondary cursor-not-allowed"
            } transition-colors`}
          >
            {systemInfo.updateAvailable ? "Güncelle" : "Sistem Güncel"}
          </button>
        </div>
      </StatCard>
    </div>
  );
};

export default Dashboard;
