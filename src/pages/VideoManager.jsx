const { api } = window;
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { BiLoaderAlt } from "react-icons/bi";
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
import toast from "react-hot-toast";

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
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    progressInterval.current = setInterval(async () => {
      try {
        const progress = await api.getUploadProgress();
        if (!cleanupRef.current) {
          setUploadProgress(progress.data);

          if (
            progress.data.status === "tamamlandı" ||
            progress.data.status === "hata"
          ) {
            clearInterval(progressInterval.current);
            progressInterval.current = null;
          }
        }
      } catch (error) {
        toast.error(error.message || "İlerleme takibinde hata");
      }
    }, 500);
  }, []);

  const loadInitialData = async () => {
    try {
      const videos = await api.getAllVideos();
      setChannels(videos.data);

      const times = await api.getTimes();
      setScheduledTimes(times.data);
      setHasTimeChanges(false);

      const status = await api.getSchedulerStatus();
      setIsSchedulerRunning(status.data);
      setSchedulerMessage(status.message);
      const telegramSettings = (await api.getTelegramSettings()) || {
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
      const result = await api.showOpenDialog({
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

  const handleUpload = useCallback(async () => {
    if (!selectedFiles || !channelLink) {
      return toast.error("Lütfen video ve kanal bağlantısı seçin!");
    }

    try {
      setIsUploading(true);
      startProgressTracking();

      for (const filePath of selectedFiles) {
        if (cleanupRef.current) break;

        const result = await api.saveVideo({
          filePath: filePath,
          description: description || "",
          channelLink: channelLink,
        });

        if (result.success && !cleanupRef.current) {
          setDescription("");
          setChannelLink("");
        }
      }

      if (!cleanupRef.current) {
        setSelectedFiles([]);
        await loadInitialData();
      }
    } catch (error) {
      if (!cleanupRef.current) {
        toast.error(error.message || "Video yükleme hatası");
      }
    } finally {
      if (!cleanupRef.current) {
        setIsUploading(false);
        setTimeout(() => setUploadProgress(null), 3000);
      }
    }
  }, [selectedFiles, channelLink, description, startProgressTracking]);

  const handleDeleteVideo = async (channelId, videoId) => {
    try {
      await api.deleteVideo(channelId, videoId);

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
      await api.saveTimes(scheduledTimes);
      setHasTimeChanges(false);
      toast.success("Zamanlar başarıyla kaydedildi!");
    } catch (error) {
      toast.error("Zamanlar kaydedilirken hata oluştu!");
    }
  };

  const handleStartScheduler = async () => {
    try {
      await api.startScheduler();
      const status = await api.getSchedulerStatus();
      setIsSchedulerRunning(status.data);
      setSchedulerMessage(status.message);
    } catch (error) {
      toast.error(error.message || "Zamanlayıcı başlatılırken hata oluştu");
    }
  };

  const handleStopScheduler = async () => {
    try {
      await api.stopScheduler();
      const status = await api.getSchedulerStatus();
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

      const result = await api.saveTelegramSettings({
        token: botToken,
        isEnabled: false,
      });

      setBotToken(result.token);
      setIsBotEnabled(result.isEnabled);
      setBotStatus({
        lastError: result.lastError,
        lastSuccess: "Bot token başarıyla kaydedildi",
      });

      toast.success("Bot token başarıyla kaydedildi!");
    } catch (error) {
      toast.error("Bot token kaydedilirken hata oluştu!");
      setBotStatus({
        lastError: error.message,
        lastSuccess: "",
      });
    }
  };

  const handleToggleBot = async () => {
    try {
      if (!botToken) {
        toast.error("Önce bot token kaydedin!");
        return;
      }

      const newStatus = !isBotEnabled;
      const result = await api.saveTelegramSettings({
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

  const renderProgressBar = useCallback(() => {
    if (!uploadProgress) return null;

    const getStatusColor = () => {
      switch (uploadProgress.status) {
        case "tamamlandı":
          return "bg-green-500";
        case "hata":
          return "bg-red-500";
        default:
          return "bg-blue-500";
      }
    };

    const getStatusText = () => {
      switch (uploadProgress.stage) {
        case "started":
          return "Video yükleniyor...";
        case "compression":
          return `Sıkıştırılıyor`;
        case "preparation":
          return "Dosya hazırlanıyor...";
        case "record":
          return "Kaydediliyor...";
        case "completed":
          return "Yükleme tamamlandı!";
        case "error":
          return `Hata: ${uploadProgress.error}`;
        default:
          return "İşleniyor...";
      }
    };

    return (
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-400">
          <span>{uploadProgress.fileName}</span>
          <span>{uploadProgress.percent}%</span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getStatusColor()} transition-all duration-300`}
            style={{ width: `${uploadProgress.percent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">{getStatusText()}</span>
          {uploadProgress.stage === "compression" &&
            uploadProgress.targetSize &&
            uploadProgress.processedDuration && (
              <div className="text-xs text-gray-500 space-y-1">
                <div>Hedef Boyut: {uploadProgress.targetSize}</div>
                <div>İşlenen Süre: {uploadProgress.processedDuration}</div>
                {uploadProgress.fps && <div>FPS: {uploadProgress.fps}</div>}
              </div>
            )}
        </div>
      </div>
    );
  }, [uploadProgress]);

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

  return (
    <div className="p-8 space-y-8 min-h-screen text-white bg-gradient-to-b from-telegram-dark to-telegram-dark/95">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Video İşlemleri</h1>
        <p className="text-telegram-secondary">
          Video yükleme ve zamanlama işlemlerini buradan yönetebilirsiniz
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-telegram-card/50 backdrop-blur-sm border border-telegram-border/10 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-telegram-border/10 pb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FiUpload className="text-telegram-primary" />
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
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-telegram-dark/50 rounded-lg border border-telegram-border/10"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-telegram-primary/10 flex items-center justify-center">
                            <FiUpload className="w-4 h-4 text-telegram-primary" />
                          </div>
                          <span className="text-sm text-telegram-secondary">
                            {file.split("\\").pop()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-telegram-secondary mb-2">
                    Telegram Kanal Linki
                  </label>
                  <input
                    type="text"
                    value={channelLink}
                    onChange={(e) => setChannelLink(e.target.value)}
                    placeholder="https://t.me/kanal"
                    className="w-full p-3 bg-telegram-dark/50 border border-telegram-border/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-primary/20 focus:border-transparent transition-all duration-200 placeholder:text-telegram-secondary/50"
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
                    className="w-full p-3 bg-telegram-dark/50 border border-telegram-border/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-primary/20 focus:border-transparent transition-all duration-200 min-h-[120px] resize-y placeholder:text-telegram-secondary/50"
                  />
                </div>
              </div>

              {renderProgressBar()}

              <button
                onClick={handleUpload}
                disabled={isUploading || !channelLink || !selectedFiles.length}
                className={`w-full p-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200
                  ${
                    isUploading
                      ? "bg-telegram-primary/50 cursor-not-allowed"
                      : "bg-telegram-primary hover:bg-telegram-primary/90"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isUploading ? (
                  <>
                    <BiLoaderAlt className="w-5 h-5 animate-spin" />
                    <span>Videolar Yükleniyor...</span>
                  </>
                ) : (
                  <>
                    <FiUpload className="w-5 h-5" />
                    <span>Videoları Yükle</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-telegram-card/50 backdrop-blur-sm border border-telegram-border/10 rounded-xl p-6">
              <div className="flex items-center justify-between border-b border-telegram-border/10 pb-4 mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FiUsers className="text-telegram-primary" />
                  Yüklenen Videolar
                </h2>
              </div>
              {renderVideoList()}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-telegram-card/50 backdrop-blur-sm border border-telegram-border/10 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-telegram-border/10 pb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FiClock className="text-telegram-primary" />
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
                <div className="p-3 rounded-lg bg-telegram-dark/30 border border-telegram-border/10">
                  <p className="text-sm text-telegram-secondary">
                    {schedulerMessage}
                  </p>
                </div>
              )}

              <button
                onClick={
                  isSchedulerRunning
                    ? handleStopScheduler
                    : handleStartScheduler
                }
                className={`w-full p-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200
                  ${
                    isSchedulerRunning
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-emerald-500 hover:bg-emerald-600"
                  }`}
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
              </button>
            </div>

            <div className="bg-telegram-card/50 backdrop-blur-sm border border-telegram-border/10 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-telegram-border/10 pb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FiClock className="text-telegram-primary" />
                  Gönderim Zamanları
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="flex-1 p-3 bg-telegram-dark/50 border border-telegram-border/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-primary/20 focus:border-transparent transition-all duration-200"
                  />
                  <button
                    onClick={handleAddTime}
                    className="px-6 bg-telegram-primary hover:bg-telegram-primary/90 rounded-lg font-medium transition-all duration-200"
                  >
                    Ekle
                  </button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {scheduledTimes.map((time, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-telegram-dark/50 rounded-lg border border-telegram-border/10"
                    >
                      <div className="flex items-center space-x-3">
                        <FiClock className="w-5 h-5 text-telegram-secondary" />
                        {editingIndex === index ? (
                          <input
                            type="time"
                            value={editingTime}
                            onChange={(e) => setEditingTime(e.target.value)}
                            className="p-1 bg-telegram-dark border border-telegram-border/10 rounded focus:outline-none focus:ring-2 focus:ring-telegram-primary/20"
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
                            <button
                              onClick={() => handleSaveEdit(index)}
                              className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                            >
                              <FiCheck className="w-5 h-5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <FiX className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(index, time)}
                              className="p-2 text-telegram-secondary hover:text-telegram-primary hover:bg-telegram-primary/10 rounded-lg transition-all"
                            >
                              <FiEdit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTime(index)}
                              className="p-2 text-telegram-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <FiTrash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {hasTimeChanges && (
                  <button
                    onClick={handleSaveTimes}
                    className="w-full p-4 rounded-xl font-medium bg-emerald-500 hover:bg-emerald-600 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <FiCheck className="w-5 h-5" />
                    Zamanları Kaydet
                  </button>
                )}
              </div>
            </div>

            <div className="bg-telegram-card/50 backdrop-blur-sm border border-telegram-border/10 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-telegram-border/10 pb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FaTelegramPlane className="text-telegram-primary" />
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

              <div className="space-y-4">
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
                      className="flex-1 p-3 bg-telegram-dark/50 border border-telegram-border/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-primary/20 focus:border-transparent transition-all duration-200 placeholder:text-telegram-secondary/50"
                    />
                    <button
                      onClick={handleSaveToken}
                      disabled={!botToken}
                      className={`px-6 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
                        ${
                          botToken
                            ? "bg-telegram-primary hover:bg-telegram-primary/90"
                            : "bg-telegram-dark/50 cursor-not-allowed"
                        }`}
                    >
                      <FiCheck className="w-5 h-5" />
                    </button>
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
                    <button
                      onClick={handleToggleBot}
                      disabled={!botToken}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
                        ${
                          !botToken
                            ? "bg-telegram-dark/50 cursor-not-allowed"
                            : isBotEnabled
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-emerald-500 hover:bg-emerald-600"
                        }`}
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
                    </button>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(VideoManager);
