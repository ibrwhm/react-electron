import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  HiUserGroup,
  HiOutlineLogout,
  HiOutlineX,
  HiOutlineLightningBolt,
  HiOutlineUsers,
  HiOutlineChartBar,
  HiOutlineClock,
} from "react-icons/hi";

const LoadingSpinner = () => (
  <div className="flex items-center gap-2">
    <div className="animate-spin">
      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
    </div>
    <span>İşlem yapılıyor...</span>
  </div>
);

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

      <div className="max-w-4xl mx-auto relative">
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-telegram-primary/20 rounded-2xl">
              <HiOutlineLightningBolt className="w-8 h-8 text-telegram-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                Kanal İşlemleri
              </h1>
              <p className="text-telegram-secondary mt-1">
                Telegram kanallarınızı yönetin
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-telegram-card/30 backdrop-blur-sm px-6 py-4 rounded-2xl border border-telegram-border/30 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-telegram-primary/20 rounded-lg">
                  <HiOutlineUsers className="w-5 h-5 text-telegram-primary" />
                </div>
                <div>
                  <span className="text-sm font-medium text-telegram-secondary">
                    Aktif Oturumlar
                  </span>
                  <p className="text-xl font-bold bg-gradient-to-r from-telegram-primary to-telegram-secondary bg-clip-text text-transparent">
                    {sessionCount}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-telegram-card/30 backdrop-blur-sm px-6 py-4 rounded-2xl border border-telegram-border/30 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <HiOutlineChartBar className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <span className="text-sm font-medium text-telegram-secondary">
                    İşlem Durumu
                  </span>
                  <p className="text-xl font-bold text-green-500">
                    {loading ? "İşleniyor" : "Hazır"}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-telegram-card/20 backdrop-blur-xl rounded-3xl border border-telegram-border/30 shadow-2xl overflow-hidden"
        >
          <div className="p-8 md:p-10">
            <div className="max-w-3xl mx-auto space-y-8">
              <motion.div variants={itemVariants} className="space-y-3">
                <label className="block text-base font-semibold text-telegram-secondary">
                  Kanal Bağlantısı
                </label>
                <div className="relative group">
                  <Input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="w-full bg-telegram-input/20 backdrop-blur-sm border-telegram-border/30 text-white placeholder:text-telegram-muted focus-visible:ring-telegram-primary text-lg py-6 pl-6 pr-12 rounded-xl shadow-inner transition-all duration-200 group-hover:bg-telegram-input/30"
                    placeholder="https://t.me/genel_sohbet"
                    disabled={loading}
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <HiUserGroup className="h-6 w-6 text-telegram-muted group-hover:text-telegram-primary transition-colors duration-200" />
                  </div>
                </div>
                <p className="text-sm text-telegram-muted mt-2">
                  Katılmak istediğiniz kanalın bağlantısını girin
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-4 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleJoinChannel}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-8 py-4 rounded-xl text-white bg-gradient-to-r from-telegram-primary to-telegram-primary-hover shadow-lg hover:shadow-telegram-primary/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                >
                  {loading ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <HiUserGroup className="mr-3 h-6 w-6" />
                      Tüm Oturumlarla Kanala Katıl
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLeaveChannel}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-8 py-4 rounded-xl text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg hover:shadow-orange-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                >
                  {loading ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <HiOutlineLogout className="mr-3 h-6 w-6" />
                      Tüm Oturumları Kanaldan Çıkar
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLeaveAllChannels}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-8 py-4 rounded-xl text-white bg-gradient-to-r from-red-500 to-red-600 shadow-lg hover:shadow-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                >
                  {loading ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <HiOutlineX className="mr-3 h-6 w-6" />
                      Tüm Kanallardan Çık
                    </>
                  )}
                </motion.button>

                {/* İşlem Durumu */}
                {loading && (
                  <div className="bg-telegram-card/30 backdrop-blur-sm p-4 rounded-xl border border-telegram-border/30">
                    <div className="flex items-center gap-3">
                      <HiOutlineClock className="w-5 h-5 text-telegram-primary animate-spin" />
                      <span className="text-telegram-secondary">
                        İşlem devam ediyor...
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ChannelManager;
