import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { FaTelegramPlane, FaStopCircle } from "react-icons/fa";
import {
  FiUpload,
  FiTrash2,
  FiUsers,
  FiEdit,
  FiClock,
  FiCheck,
  FiX,
  FiPlayCircle,
  FiVideo,
} from "react-icons/fi";

const VideoManager = () => {
  const [channels, setChannels] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [description, setDescription] = useState("");
  const [channelLink, setChannelLink] = useState("");
  const [scheduledTimes, setScheduledTimes] = useState([]);
  const [isSchedulerRunning, setIsSchedulerRunning] = useState(false);
  const [schedulerMessage, setSchedulerMessage] = useState("");
  const [newTime, setNewTime] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingTime, setEditingTime] = useState("");
  const [hasTimeChanges, setHasTimeChanges] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [isBotEnabled, setIsBotEnabled] = useState(false);
  const [botStatus, setBotStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const progressInterval = useRef(null);
  const cleanupRef = useRef(false);

  useEffect(() => {
    loadInitialData();
    return () => {
      cleanupRef.current = true;
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  const startProgressTracking = useCallback(() => {
    const interval = setInterval(async () => {
      try {
        const result = await window.api.getUploadProgress();
        if (result.success) {
          setUploadProgress(result.data);
        }
      } catch (error) {
        toast.error("Progress takibi hatası");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    try {
      const videos = await window.api.getAllVideos();
      setChannels(videos.data);

      const times = await window.api.getTimes();
      setScheduledTimes(times.data);
      setHasTimeChanges(false);

      const status = await window.api.getSchedulerStatus();
      setIsSchedulerRunning(status.data);
      setSchedulerMessage(status.message);
      const telegramSettings = (await window.api.getTelegramSettings()) || {
        token: "",
        isEnabled: false,
        lastError: "",
        lastSuccess: "",
      };

      setBotToken(telegramSettings.data.token || "");
      setIsBotEnabled(telegramSettings.data.isEnabled || false);
      setBotStatus({
        error: telegramSettings.data.lastError || "",
        success: telegramSettings.data.lastSuccess || "",
      });
    } catch (error) {
      toast.error(error.message || "Veriler yüklenirken bir hata oluştu");
    }
  };

  const handleFileSelect = async () => {
    try {
      const result = await window.api.showOpenDialog({
        properties: ["openFile", "multiSelections"],
        filters: [
          {
            name: "Video Files",
            extensions: ["mp4", "avi", "mkv", "mov", "wmv"],
          },
        ],
      });

      if (!result.filePaths || result.filePaths.length === 0) return;

      setSelectedFiles(result.filePaths);
    } catch (error) {
      throw new Error("Dosya seçiminde hata");
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error("Lütfen video seçin");
      return;
    }

    if (!channelLink) {
      toast.error("Lütfen kanal linki girin");
      return;
    }

    try {
      setIsUploading(true);
      startProgressTracking();

      for (const filePath of selectedFiles) {
        const data = {
          filePath: filePath,
          channelLink,
          description,
        };

        const result = await window.api.saveVideo(data);

        if (result.success) {
          toast.success("Video başarıyla yüklendi");
          setChannels((prevChannels) => {
            const existingChannel = prevChannels.find(
              (c) => c.channelLink === channelLink
            );
            if (existingChannel) {
              return prevChannels.map((c) =>
                c.channelLink === channelLink
                  ? { ...c, videos: [...c.videos, result.video] }
                  : c
              );
            } else {
              return [
                ...prevChannels,
                {
                  _id: Date.now().toString(),
                  channelLink,
                  videos: [result.video],
                },
              ];
            }
          });
        } else {
          toast.error(result.error || "Video yüklenirken bir hata oluştu");
        }
      }

      setSelectedFiles([]);
      setDescription("");
      setChannelLink("");
    } catch (error) {
      toast.error("Video yüklenirken bir hata oluştu");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);

      // Progress'i sıfırlamak için 1 saniye bekle
      setTimeout(() => {
        setUploadProgress({
          status: "",
          current: 0,
          total: 0,
          stage: "",
          fps: 0,
          kbps: 0,
        });
      }, 1000);
    }
  };

  const handleDeleteVideo = async (channelId, videoId) => {
    try {
      await window.api.deleteVideo(channelId, videoId);

      setChannels((prev) => {
        const updatedChannels = [...prev];
        const channelIndex = updatedChannels.findIndex(
          (c) => c._id === channelId
        );

        if (channelIndex !== -1) {
          updatedChannels[channelIndex].videos = updatedChannels[
            channelIndex
          ].videos.filter((v) => v._id !== videoId);

          if (updatedChannels[channelIndex].videos.length === 0) {
            updatedChannels.splice(channelIndex, 1);
          }
        }

        return updatedChannels;
      });

      toast.success("Video başarıyla silindi!");
    } catch (error) {
      toast.error("Video silinirken hata oluştu!");
    }
  };

  const handleAddTime = () => {
    if (!newTime || scheduledTimes.includes(newTime)) return;

    setScheduledTimes((prev) => [...prev, newTime]);
    setNewTime("");
    setHasTimeChanges(true);
  };

  const handleStartEdit = (index, time) => {
    setEditingIndex(index);
    setEditingTime(time);
  };

  const handleSaveEdit = (index) => {
    if (!editingTime || editingTime === scheduledTimes[index]) {
      handleCancelEdit();
      return;
    }

    setScheduledTimes((prev) => {
      const newTimes = [...prev];
      newTimes[index] = editingTime;
      return newTimes;
    });
    setHasTimeChanges(true);
    handleCancelEdit();
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingTime("");
  };

  const handleDeleteTime = (index) => {
    setScheduledTimes((prev) => prev.filter((_, i) => i !== index));
    setHasTimeChanges(true);
  };

  const handleSaveTimes = async () => {
    try {
      await window.api.saveTimes(scheduledTimes);
      setHasTimeChanges(false);
      toast.success("Zamanlar başarıyla kaydedildi!");
    } catch (error) {
      toast.error("Zamanlar kaydedilirken hata oluştu!");
    }
  };

  const handleStartScheduler = async () => {
    try {
      await window.api.startScheduler();
      const status = await window.api.getSchedulerStatus();
      setIsSchedulerRunning(status.data);
      setSchedulerMessage(status.message);
    } catch (error) {
      toast.error(error.message || "Zamanlayıcı başlatılırken hata oluştu");
    }
  };

  const handleStopScheduler = async () => {
    try {
      await window.api.stopScheduler();
      const status = await window.api.getSchedulerStatus();
      setIsSchedulerRunning(status.data);
      setSchedulerMessage(status.message);
    } catch (error) {
      toast.error(error.message || "Zamanlayıcı başlatılırken hata oluştu");
    }
  };

  const handleSaveToken = async () => {
    try {
      if (!botToken) {
        toast.error("Bot token boş olamaz!");
        return;
      }

      setIsLoading(true);
      const result = await window.api.saveTelegramSettings({
        token: botToken,
        isEnabled: false,
      });

      if (result.success) {
        setBotToken(result.data.token || "");
        setIsBotEnabled(result.data.isEnabled || false);
        setBotStatus({
          error: result.data.lastError || "",
          success: "Bot token başarıyla kaydedildi",
        });
        toast.success("Bot token başarıyla kaydedildi!");
      } else {
        throw new Error(result.message || "Bot token kaydedilemedi");
      }
    } catch (error) {
      toast.error(error.message || "Bot token kaydedilirken hata oluştu!");
      setBotStatus({
        error: error.message || "Bot token kaydedilemedi",
        success: "",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBot = async () => {
    try {
      if (!botToken) {
        toast.error("Önce bot token kaydedin!");
        return;
      }

      const newStatus = !isBotEnabled;
      const result = await window.api.saveTelegramSettings({
        token: botToken,
        isEnabled: newStatus,
      });

      setIsBotEnabled(result.data.isEnabled);
      setBotStatus({
        lastError: result.data.lastError,
        lastSuccess: result.data.lastSuccess,
      });

      toast.success(newStatus ? "Bot başlatıldı!" : "Bot durduruldu!");
    } catch (error) {
      toast.error("Bot durumu değiştirilirken hata oluştu!");
      setBotStatus({
        lastError: error.message,
        lastSuccess: "",
      });
    }
  };

  const renderProgressBar = () => {
    if (!uploadProgress) return null;

    const {
      status = "beklemede",
      current = 0,
      total = 0,
      stage = "",
      fps = 0,
      kbps = 0,
    } = uploadProgress;
    const percent = total > 0 ? (current / total) * 100 : 0;

    return (
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">{(status || "").toUpperCase()}</span>
          <span className="text-gray-300">{percent.toFixed(1)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        {stage === "sıkıştırma" && fps && kbps && (
          <div className="flex justify-between text-xs text-gray-400">
            <span>FPS: {fps}</span>
            <span>Bitrate: {formatBitrate(kbps)}</span>
          </div>
        )}
      </div>
    );
  };

  const formatBitrate = (kbps) => {
    if (!kbps) return "0 kbps";
    if (kbps >= 1024) {
      return `${(kbps / 1024).toFixed(1)} Mbps`;
    }
    return `${Math.round(kbps)} kbps`;
  };

  useEffect(() => {}, [channels]);

  const getVideoStatus = (video) => {
    switch (video.status) {
      case "sent":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            Gönderildi
          </span>
        );
      case "error":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            Hata
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            Bekliyor
          </span>
        );
    }
  };

  const sortedChannels = useMemo(() => {
    return channels
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [channels]);

  const renderVideoList = useCallback(() => {
    if (!sortedChannels || sortedChannels.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-gray-500">
          <FiUsers className="w-12 h-12 mb-2" />
          <p>Henüz video yüklenmemiş</p>
          <p className="text-sm">
            Video yüklemek için yukarıdaki formu kullanın
          </p>
        </div>
      );
    }

    return sortedChannels.map((channel) => (
      <div
        key={channel._id}
        className="p-4 mb-4 rounded-lg bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 hover:border-telegram-primary/20 transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <FaTelegramPlane className="text-telegram-primary" />
            {channel.channelLink}
          </h3>
        </div>
        <div className="space-y-2">
          {channel.videos.map((video) => (
            <div
              key={video._id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/20 transition-all duration-300"
            >
              <div className="flex items-center space-x-4 flex-1">
                <div className="w-10 h-10 rounded-lg bg-telegram-primary/10 flex items-center justify-center">
                  <FiVideo className="w-5 h-5 text-telegram-primary" />
                </div>
                <div className="flex-1 min-w-0 max-w-[300px]">
                  <p className="text-sm text-gray-300 truncate">
                    {video.filename}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {new Date(video.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="flex-shrink-0">{getVideoStatus(video)}</div>
              </div>
              <button
                onClick={() => handleDeleteVideo(channel._id, video._id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-300 ml-2"
              >
                <FiTrash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    ));
  }, [sortedChannels, handleDeleteVideo]);

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

      <div className="max-w-7xl mx-auto relative">
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-telegram-primary/20 rounded-2xl">
              <FiVideo className="w-8 h-8 text-telegram-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                Video İşlemleri
              </h1>
              <p className="text-telegram-secondary mt-1">
                Video yükleme ve zamanlama işlemlerini buradan yönetebilirsiniz
              </p>
            </div>
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-telegram-card/30 backdrop-blur-sm px-6 py-3 rounded-2xl border border-telegram-border/30 shadow-lg"
          >
            <div className="flex items-center gap-6">
              <div className="text-center">
                <span className="text-sm font-medium text-telegram-secondary block">
                  Aktif Kanal
                </span>
                <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
                  {channels.length}
                </span>
              </div>
              <div className="text-center">
                <span className="text-sm font-medium text-telegram-secondary block">
                  Zamanlanmış
                </span>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                  {scheduledTimes.length}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            variants={itemVariants}
            className="lg:col-span-2 space-y-6"
          >
            <motion.div
              variants={itemVariants}
              className="bg-telegram-card/20 backdrop-blur-xl rounded-3xl border border-telegram-border/30 shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-telegram-primary/10">
                    <FiUpload className="w-5 h-5 text-telegram-primary" />
                  </span>
                  Video Yükleme
                </h2>
              </div>

              <div className="w-full">
                <button
                  onClick={handleFileSelect}
                  disabled={isUploading}
                  className="w-full h-32 border-2 border-dashed border-telegram-border/20 rounded-xl hover:border-telegram-primary/50 hover:bg-telegram-primary/5 transition-all duration-300 flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiUpload className="w-8 h-8 text-telegram-primary" />
                  <span className="text-telegram-secondary font-medium">
                    {selectedFiles.length > 0
                      ? "Videolar Seçildi"
                      : "Video Seçmek için Tıklayın"}
                  </span>
                  {selectedFiles.length > 0 && (
                    <span className="text-sm text-telegram-secondary/70">
                      {selectedFiles.length} video seçildi
                    </span>
                  )}
                </button>
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedFiles.map((file, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-telegram-dark/50 rounded-lg border border-telegram-border/10"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-telegram-primary/10 flex items-center justify-center">
                            <FiVideo className="w-4 h-4 text-telegram-primary" />
                          </div>
                          <span className="text-sm text-telegram-secondary">
                            {file.split("\\").pop()}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium text-telegram-secondary mb-2">
                    Telegram Kanal Linki
                  </label>
                  <input
                    type="text"
                    value={channelLink}
                    onChange={(e) => setChannelLink(e.target.value)}
                    placeholder="https://t.me/kanal"
                    className="w-full p-3 bg-telegram-dark/50 border border-telegram-border/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-primary/20 focus:border-transparent transition-all duration-200 placeholder:text-telegram-secondary/50 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-telegram-secondary mb-2">
                    Video Açıklaması
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Video açıklaması..."
                    className="w-full p-3 bg-telegram-dark/50 border border-telegram-border/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-primary/20 focus:border-transparent transition-all duration-200 min-h-[120px] resize-y placeholder:text-telegram-secondary/50 text-white"
                  />
                </div>
              </div>

              {renderProgressBar()}

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUpload}
                disabled={
                  !selectedFiles ||
                  selectedFiles.length === 0 ||
                  !channelLink ||
                  isUploading
                }
                className={`w-full p-4 rounded-xl font-medium flex items-center justify-center gap-2 mt-6 transition-all duration-200
                  ${
                    isUploading
                      ? "bg-telegram-primary/50 cursor-not-allowed"
                      : "bg-gradient-to-r from-telegram-primary to-telegram-primary-hover hover:shadow-telegram-primary/30"
                  } disabled:opacity-50 disabled:cursor-not-allowed text-white`}
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                    <span>Yükleniyor...</span>
                  </>
                ) : (
                  <>
                    <FiUpload className="w-5 h-5" />
                    <span>Videoları Yükle</span>
                  </>
                )}
              </motion.button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-telegram-card/20 backdrop-blur-xl rounded-3xl border border-telegram-border/30 shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-telegram-primary/10">
                    <FiUsers className="w-5 h-5 text-telegram-primary" />
                  </span>
                  Yüklenen Videolar
                </h2>
              </div>

              <div className="space-y-4">{renderVideoList()}</div>
            </motion.div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-6">
            <motion.div
              variants={itemVariants}
              className="bg-telegram-card/20 backdrop-blur-xl rounded-3xl border border-telegram-border/30 shadow-2xl p-8"
            >
              <div className="flex items-center justify-between border-b border-telegram-border/10 pb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-telegram-primary/10">
                    <FiClock className="w-5 h-5 text-telegram-primary" />
                  </span>
                  Zamanlayıcı
                </h2>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isSchedulerRunning ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                  <span className="text-sm text-telegram-secondary">
                    {isSchedulerRunning ? "Aktif" : "Pasif"}
                  </span>
                </div>
              </div>

              {schedulerMessage && (
                <div className="p-3 rounded-lg bg-telegram-dark/30 border border-telegram-border/10 mt-4">
                  <p className="text-sm text-telegram-secondary">
                    {schedulerMessage}
                  </p>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={
                  isSchedulerRunning
                    ? handleStopScheduler
                    : handleStartScheduler
                }
                className={`w-full p-4 rounded-xl font-medium flex items-center justify-center gap-2 mt-6 transition-all duration-200
                  ${
                    isSchedulerRunning
                      ? "bg-gradient-to-r from-red-500 to-red-600 hover:shadow-red-500/30"
                      : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-emerald-500/30"
                  } text-white`}
              >
                {isSchedulerRunning ? (
                  <>
                    <FaStopCircle className="w-5 h-5" />
                    Zamanlayıcıyı Durdur
                  </>
                ) : (
                  <>
                    <FiPlayCircle className="w-5 h-5" />
                    Zamanlayıcıyı Başlat
                  </>
                )}
              </motion.button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-telegram-card/20 backdrop-blur-xl rounded-3xl border border-telegram-border/30 shadow-2xl p-8"
            >
              <div className="flex items-center justify-between border-b border-telegram-border/10 pb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-telegram-primary/10">
                    <FiClock className="w-5 h-5 text-telegram-primary" />
                  </span>
                  Gönderim Zamanları
                </h2>
              </div>

              <div className="space-y-4 mt-6">
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="flex-1 p-3 bg-telegram-dark/50 border border-telegram-border/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-primary/20 focus:border-transparent transition-all duration-200 text-white"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddTime}
                    className="px-6 bg-gradient-to-r from-telegram-primary to-telegram-primary-hover hover:shadow-telegram-primary/30 rounded-lg font-medium transition-all duration-200 text-white"
                  >
                    Ekle
                  </motion.button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {scheduledTimes.map((time, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-telegram-dark/50 rounded-lg border border-telegram-border/10 group hover:border-telegram-primary/20 transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <FiClock className="w-5 h-5 text-telegram-secondary" />
                        {editingIndex === index ? (
                          <input
                            type="time"
                            value={editingTime}
                            onChange={(e) => setEditingTime(e.target.value)}
                            className="p-1 bg-telegram-dark border border-telegram-border/10 rounded focus:outline-none focus:ring-2 focus:ring-telegram-primary/20 text-white"
                            autoFocus
                          />
                        ) : (
                          <span className="text-telegram-secondary">
                            {time}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {editingIndex === index ? (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleSaveEdit(index)}
                              className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                            >
                              <FiCheck className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={handleCancelEdit}
                              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <FiX className="w-5 h-5" />
                            </motion.button>
                          </>
                        ) : (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleStartEdit(index, time)}
                              className="p-2 text-telegram-secondary hover:text-telegram-primary hover:bg-telegram-primary/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <FiEdit className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDeleteTime(index)}
                              className="p-2 text-telegram-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <FiTrash2 className="w-5 h-5" />
                            </motion.button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {hasTimeChanges && (
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveTimes}
                    className="w-full p-4 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-emerald-500/30 transition-all duration-200 flex items-center justify-center gap-2 text-white"
                  >
                    <FiCheck className="w-5 h-5" />
                    Zamanları Kaydet
                  </motion.button>
                )}
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-telegram-card/20 backdrop-blur-xl rounded-3xl border border-telegram-border/30 shadow-2xl p-8"
            >
              <div className="flex items-center justify-between border-b border-telegram-border/10 pb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-telegram-primary/10">
                    <FaTelegramPlane className="w-5 h-5 text-telegram-primary" />
                  </span>
                  Bot Ayarları
                </h2>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isBotEnabled ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                  <span className="text-sm text-telegram-secondary">
                    {isBotEnabled ? "Aktif" : "Devre Dışı"}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium text-telegram-secondary mb-2">
                    Bot Token
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      placeholder="Bot token'ınızı girin"
                      className="flex-1 p-3 bg-telegram-dark/50 border border-telegram-border/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-primary/20 focus:border-transparent transition-all duration-200 placeholder:text-telegram-secondary/50 text-white"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSaveToken}
                      disabled={!botToken}
                      className={`px-6 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
                        ${
                          botToken
                            ? "bg-gradient-to-r from-telegram-primary to-telegram-primary-hover hover:shadow-telegram-primary/30"
                            : "bg-telegram-dark/50 cursor-not-allowed"
                        } text-white`}
                    >
                      <FiCheck className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-telegram-secondary">
                        Bot Durumu
                      </span>
                      <span
                        className={`text-sm ${
                          isBotEnabled ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isBotEnabled ? "Çalışıyor" : "Durduruldu"}
                      </span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleToggleBot}
                      disabled={!botToken || isLoading}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
                        ${
                          !botToken || isLoading
                            ? "bg-telegram-dark/50 cursor-not-allowed"
                            : isBotEnabled
                            ? "bg-gradient-to-r from-red-500 to-red-600 hover:shadow-red-500/30"
                            : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-emerald-500/30"
                        } text-white`}
                    >
                      {isBotEnabled ? (
                        <>
                          <FaStopCircle className="w-5 h-5" />
                          Durdur
                        </>
                      ) : (
                        <>
                          <FiPlayCircle className="w-5 h-5" />
                          Başlat
                        </>
                      )}
                    </motion.button>
                  </div>

                  {(botStatus?.lastError || botStatus?.lastSuccess) && (
                    <div className="mt-2 space-y-2">
                      {botStatus?.lastError && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="text-sm text-red-400">
                            {botStatus.lastError}
                          </p>
                        </div>
                      )}
                      {botStatus?.lastSuccess && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-sm text-emerald-400">
                            {botStatus.lastSuccess}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(VideoManager);
