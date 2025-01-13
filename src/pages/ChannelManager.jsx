import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { HiUserGroup, HiOutlineLogout, HiOutlineX } from "react-icons/hi";
import { Input } from "@/components/ui/input";

const ChannelManager = () => {
  const [channelName, setChannelName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    const fetchSessionCount = async () => {
      try {
        const result = await window.api.getSessions();
        if (result.success) {
          setSessionCount(result.sessions.length);
        }
      } catch (error) {
        throw new Error("Oturum sayısı alınamadı");
      }
    };

    fetchSessionCount();
  }, []);

  const handleJoinChannel = async () => {
    if (!channelName.trim()) {
      toast.error("Lütfen bir kanal adı girin");
      return;
    }
    setLoading(true);
    try {
      await window.api.joinChannel(channelName);
      toast.success("Tüm oturumlar kanala başarıyla katıldı");
    } catch (error) {
      toast.error("Kanala katılırken bir hata oluştu: " + error.message);
    }
    setLoading(false);
  };

  const handleLeaveChannel = async () => {
    if (!channelName.trim()) {
      toast.error("Lütfen bir kanal adı girin");
      return;
    }
    setLoading(true);
    try {
      await window.api.leaveChannel(channelName);
      toast.success("Tüm oturumlar kanaldan başarıyla ayrıldı");
    } catch (error) {
      toast.error("Kanaldan ayrılırken bir hata oluştu: " + error.message);
    }
    setLoading(false);
  };

  const handleLeaveAllChannels = async () => {
    setLoading(true);
    try {
      await window.api.leaveAllChannels();
      toast.success("Tüm oturumlar bütün kanallardan başarıyla ayrıldı");
    } catch (error) {
      toast.error("Kanallardan ayrılırken bir hata oluştu: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-telegram-dark py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Kanal İşlemleri</h1>
          <div className="bg-telegram-card px-4 py-2 rounded-lg border border-telegram-border">
            <span className="text-sm font-medium text-telegram-secondary">
              Aktif Oturumlar:
            </span>
            <span className="ml-2 text-sm font-semibold text-telegram-primary">
              {sessionCount}
            </span>
          </div>
        </div>

        <div className="bg-telegram-card rounded-2xl border border-telegram-border overflow-hidden">
          <div className="p-8">
            <div className="max-w-2xl mx-auto">
              <div className="mb-8">
                <label className="block text-sm font-medium text-telegram-secondary mb-2">
                  Kanal Adı
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="bg-telegram-input border-telegram-border text-white placeholder:text-telegram-muted focus-visible:ring-telegram-primary"
                    placeholder="Örn: genel-sohbet"
                    disabled={loading}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <HiUserGroup className="h-5 w-5 text-telegram-muted" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleJoinChannel}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-6 py-3 rounded-lg text-white bg-telegram-primary hover:bg-telegram-primary-hover transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      İşlem yapılıyor...
                    </div>
                  ) : (
                    <>
                      <HiUserGroup className="mr-2 h-5 w-5" />
                      Tüm Oturumları Kanala Katıl
                    </>
                  )}
                </button>

                <button
                  onClick={handleLeaveChannel}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-6 py-3 rounded-lg text-white bg-telegram-secondary hover:bg-telegram-hover transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      İşlem yapılıyor...
                    </div>
                  ) : (
                    <>
                      <HiOutlineLogout className="mr-2 h-5 w-5" />
                      Tüm Oturumları Kanaldan Çıkar
                    </>
                  )}
                </button>

                <button
                  onClick={handleLeaveAllChannels}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-6 py-3 rounded-lg text-white bg-telegram-error hover:bg-telegram-error-hover transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      İşlem yapılıyor...
                    </div>
                  ) : (
                    <>
                      <HiOutlineX className="mr-2 h-5 w-5" />
                      Tüm Kanallardan Çık
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelManager;
