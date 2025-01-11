import React, { useState, useEffect } from 'react';
import { FiUpload, FiTrash2, FiEdit2 } from 'react-icons/fi';
import { BiLoaderAlt } from 'react-icons/bi';
import { BsCheckCircleFill, BsXCircleFill, BsClock, BsStopFill, BsPlayFill } from 'react-icons/bs';
import { FaTelegramPlane, FaSave, FaStop, FaPlay, FaExclamationCircle, FaCheckCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const { api } = window;

const VideoManager = () => {
  const [channels, setChannels] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [channelLink, setChannelLink] = useState('');
  const [scheduledTimes, setScheduledTimes] = useState([]);
  const [isSchedulerRunning, setIsSchedulerRunning] = useState(false);
  const [schedulerMessage, setSchedulerMessage] = useState('');
  const [newTime, setNewTime] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingTime, setEditingTime] = useState('');
  const [hasTimeChanges, setHasTimeChanges] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [isBotEnabled, setIsBotEnabled] = useState(false);
  const [botStatus, setBotStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const videos = await api.getAllVideos();
      setChannels(videos);

      const times = await api.getTimes();
      setScheduledTimes(times || []);
      setHasTimeChanges(false);

      const status = await api.getSchedulerStatus();
      setIsSchedulerRunning(status);

      const telegramSettings = await api.getTelegramSettings() || {
        token: '',
        isEnabled: false,
        lastError: '',
        lastSuccess: ''
      };

      setBotToken(telegramSettings.token || '');
      setIsBotEnabled(telegramSettings.isEnabled || false);
      setBotStatus({
        error: telegramSettings.lastError || '',
        success: telegramSettings.lastSuccess || ''
      });
    } catch (error) {
      console.error('Veriler yüklenirken hata oluştu:', error);
    }
  };

  const handleFileSelect = async () => {
    try {
      const result = await api.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Video Files', extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv'] }]
      });

      console.log(result)

      if (!result.filePaths || result.filePaths.length === 0) return;

      setSelectedFiles(result.filePaths);
    } catch (error) {
      console.error('Dosya seçiminde hata:', error);
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles || !channelLink) return;

    try {
      setIsUploading(true);

      for (const filePath of selectedFiles) {
        const result = await api.saveVideo({
          filePath: filePath,
          description: description,
          channelLink: channelLink
        });

        if (result.success) {
          setDescription('');
          setChannelLink('');
        }
      }

      setSelectedFiles([]);
      await loadInitialData();
    } catch (error) {
      console.error('Video yükleme hatası:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteVideo = async (channelId, videoId) => {
    try {
      await api.deleteVideo(channelId, videoId);

      setChannels(prev => {
        const updatedChannels = [...prev];
        const channelIndex = updatedChannels.findIndex(c => c._id === channelId);

        if (channelIndex !== -1) {
          updatedChannels[channelIndex].videos = updatedChannels[channelIndex].videos.filter(v => v._id !== videoId);

          if (updatedChannels[channelIndex].videos.length === 0) {
            updatedChannels.splice(channelIndex, 1);
          }
        }

        return updatedChannels;
      });

      toast.success('Video başarıyla silindi!');
    } catch (error) {
      console.error('Video silinirken hata:', error);
      toast.error('Video silinirken hata oluştu!');
    }
  };

  const handleAddTime = () => {
    if (!newTime || scheduledTimes.includes(newTime)) return;

    setScheduledTimes(prev => [...prev, newTime]);
    setNewTime('');
    setHasTimeChanges(true);
  };

  const handleStartEdit = (index, time) => {
    setEditingIndex(index);
    setEditingTime(time);
  };

  const handleSaveEdit = (index) => {
    if (!editingTime || (editingTime === scheduledTimes[index])) {
      handleCancelEdit();
      return;
    }

    setScheduledTimes(prev => {
      const newTimes = [...prev];
      newTimes[index] = editingTime;
      return newTimes;
    });
    setHasTimeChanges(true);
    handleCancelEdit();
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingTime('');
  };

  const handleDeleteTime = (index) => {
    setScheduledTimes(prev => prev.filter((_, i) => i !== index));
    setHasTimeChanges(true);
  };

  const handleSaveTimes = async () => {
    try {
      await api.saveTimes(scheduledTimes);
      setHasTimeChanges(false);
      toast.success('Zamanlar başarıyla kaydedildi!');
    } catch (error) {
      console.error('Zamanlar kaydedilirken hata oluştu:', error);
      toast.error('Zamanlar kaydedilirken hata oluştu!');
    }
  };

  const handleStartScheduler = async () => {
    try {
      await api.startScheduler();
      const status = await api.getSchedulerStatus();
      setIsSchedulerRunning(status);
      setSchedulerMessage(status.message);
    } catch (error) {
      console.error('Zamanlayıcı başlatılırken hata oluştu:', error);
    }
  };

  const handleStopScheduler = async () => {
    try {
      await api.stopScheduler();
      const status = await api.getSchedulerStatus();
      setIsSchedulerRunning(status);
      setSchedulerMessage(status.message);
    } catch (error) {
      console.error('Zamanlayıcı durdurulurken hata oluştu:', error);
    }
  };

  const handleSaveToken = async () => {
    try {
      if (!botToken) {
        toast.error('Bot token boş olamaz!');
        return;
      }

      const result = await api.saveTelegramSettings({
        token: botToken,
        isEnabled: false
      });

      setBotToken(result.token);
      setIsBotEnabled(result.isEnabled);
      setBotStatus({
        lastError: result.lastError,
        lastSuccess: 'Bot token başarıyla kaydedildi'
      });

      toast.success('Bot token başarıyla kaydedildi!');
    } catch (error) {
      console.error('Bot token kaydedilirken hata:', error);
      toast.error('Bot token kaydedilirken hata oluştu!');
      setBotStatus({
        lastError: error.message,
        lastSuccess: ''
      });
    }
  };

  const handleToggleBot = async () => {
    try {
      if (!botToken) {
        toast.error('Önce bot token kaydedin!');
        return;
      }

      const newStatus = !isBotEnabled;
      const result = await api.saveTelegramSettings({
        token: botToken,
        isEnabled: newStatus
      });

      setIsBotEnabled(result.isEnabled);
      setBotStatus({
        lastError: result.lastError,
        lastSuccess: result.lastSuccess
      });

      toast.success(newStatus ? 'Bot başlatıldı!' : 'Bot durduruldu!');
    } catch (error) {
      console.error('Bot durumu değiştirilirken hata:', error);
      toast.error('Bot durumu değiştirilirken hata oluştu!');
      setBotStatus({
        lastError: error.message,
        lastSuccess: ''
      });
    }
  };

  return (
    <div className="p-6 space-y-6 min-h-screen text-white transition-all duration-200">
      <h1 className="text-2xl font-semibold mb-8">Video İşlemleri</h1>

      <div className="bg-telegram-card border border-telegram-border rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold">Video Yükleme</h2>

        <div className="w-full">
          <button
            onClick={handleFileSelect}
            disabled={isUploading}
            className="w-full p-4 border border-telegram-border rounded-lg hover:bg-telegram-hover transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiUpload className="w-6 h-6" />
            <span>{selectedFiles.length > 0 ? 'Videolar Seçildi' : 'Video Seç'}</span>
          </button>
          {selectedFiles.length > 0 && (
            <div className="mt-2 text-sm text-gray-400">
              {selectedFiles.map((file, index) => (
                <p key={index} className="truncate">
                  Seçilen: {file.split('\\').pop()}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-400">
            Telegram Kanal Linki
          </label>
          <input
            type="text"
            value={channelLink}
            onChange={(e) => setChannelLink(e.target.value)}
            placeholder="https://t.me/kanal"
            className="w-full p-3 bg-telegram-input border border-telegram-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-400">
            Video Açıklaması
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Video açıklaması..."
            className="w-full p-3 bg-telegram-input border border-telegram-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[120px] resize-y"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={isUploading || !channelLink || !selectedFiles}
          className={`w-full p-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200
            ${isUploading
              ? 'bg-cyan-700 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-500'
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

      <div>
        <h2 className="text-xl font-semibold mb-4">Yüklenen Videolar</h2>
        <div className="bg-telegram-card border border-telegram-border rounded-lg p-6 space-y-8 max-h-[600px] overflow-auto">
          {channels.map((channel, index) => (
            <div key={index} className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                <h3 className="text-sm font-medium text-gray-400">
                  {channel.channelLink}
                </h3>
                <span className="text-xs text-gray-500">
                  {new Date().toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div className="space-y-2">
                {channel.videos.map((video, videoIndex) => (
                  <div
                    key={videoIndex}
                    className="flex items-center justify-between p-3 bg-telegram-input border border-telegram-border rounded-lg transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex-shrink-0">
                        {video.status === 'sent' && (
                          <BsCheckCircleFill className="w-5 h-5 text-green-500" />
                        )}
                        {video.status === 'pending' && (
                          <BsClock className="w-5 h-5 text-yellow-500" />
                        )}
                        {video.status === 'error' && (
                          <BsXCircleFill className="w-5 h-5 text-red-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">
                          {video.filename.length > 20
                            ? video.filename.substring(0, 20) + '...'
                            : video.filename}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(video.createdAt).toLocaleDateString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteVideo(channel._id, video._id)}
                      className="ml-2 p-2 text-red-500 bg-red-500/10 hover:text-white/70 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {channels.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              Henüz video yüklenmemiş
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Zamanlayıcı Kontrolü</h2>
        <div className="bg-telegram-card border border-telegram-border rounded-lg p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isSchedulerRunning ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {isSchedulerRunning ? 'Zamanlayıcı Çalışıyor' : 'Zamanlayıcı Durdu'}
            </span>
          </div>

          {schedulerMessage && (
            <div className="text-sm text-gray-400">
              {schedulerMessage}
            </div>
          )}

          <button
            onClick={isSchedulerRunning ? handleStopScheduler : handleStartScheduler}
            className={`w-full p-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200
              ${isSchedulerRunning
                ? 'bg-red-600'
                : 'bg-emerald-600'}`}
          >
            {isSchedulerRunning ? (
              <>
                <BsStopFill className="w-5 h-5" />
                Zamanlayıcıyı Durdur
              </>
            ) : (
              <>
                <BsPlayFill className="w-5 h-5" />
                Zamanlayıcıyı Başlat
              </>
            )}
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Gönderim Zamanları</h2>
        <div className="bg-telegram-card border border-telegram-border rounded-lg p-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="flex-1 p-2 bg-telegram-input border border-telegram-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleAddTime}
              disabled={!newTime}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Ekle
            </button>
          </div>

          <div className="space-y-2">
            {scheduledTimes.map((time, index) => (
              <div key={index} className="flex items-center gap-2">
                {editingIndex === index ? (
                  <input
                    type="time"
                    value={editingTime}
                    onChange={(e) => setEditingTime(e.target.value)}
                    className="flex-1 p-2 bg-telegram-input border border-telegram-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <div className="flex-1 p-2 bg-telegram-input border-b-2 border-telegram-border rounded-lg">
                    {time}
                  </div>
                )}

                {editingIndex === index ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(index)}
                      className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all duration-200"
                    >
                      <BsCheckCircleFill className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleCancelEdit()}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                    >
                      <BsXCircleFill className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartEdit(index, time)}
                      className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                    >
                      <FiEdit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTime(index)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveTimes}
            disabled={!hasTimeChanges}
            className={`w-full p-3 rounded-lg font-medium transition-all duration-200 ${hasTimeChanges
              ? 'bg-emerald-600 hover:bg-emerald-500'
              : 'bg-gray-600 cursor-not-allowed'
              }`}
          >
            Zamanları Kaydet
          </button>
        </div>
      </div>

      <div className="bg-telegram-card border border-telegram-border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FaTelegramPlane className="text-blue-400" />
            Telegram Bot Ayarları
          </h2>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isBotEnabled ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-400">{isBotEnabled ? 'Aktif' : 'Devre Dışı'}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Bot Token
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="Bot token'ınızı girin"
                className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={handleSaveToken}
                disabled={!botToken}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
                  ${botToken ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-600 cursor-not-allowed'}`}
              >
                <FaSave />
                Kaydet
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-400">Bot Durumu</span>
                <span className={`text-sm ${isBotEnabled ? 'text-green-400' : 'text-red-400'}`}>
                  {isBotEnabled ? 'Çalışıyor' : 'Durduruldu'}
                </span>
              </div>
              <button
                onClick={handleToggleBot}
                disabled={!botToken}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
                  ${!botToken ? 'bg-gray-600 cursor-not-allowed' :
                    isBotEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
              >
                {isBotEnabled ? (
                  <>
                    <FaStop />
                    Durdur
                  </>
                ) : (
                  <>
                    <FaPlay />
                    Başlat
                  </>
                )}
              </button>
            </div>

            {(botStatus?.lastError || botStatus?.lastSuccess) && (
              <div className="mt-2 text-sm">
                {botStatus?.lastError && (
                  <div className="text-red-400 flex items-start gap-2">
                    <FaExclamationCircle className="mt-1 flex-shrink-0" />
                    <span>{botStatus.lastError}</span>
                  </div>
                )}
                {botStatus?.lastSuccess && (
                  <div className="text-green-400 flex items-start gap-2">
                    <FaCheckCircle className="mt-1 flex-shrink-0" />
                    <span>{botStatus.lastSuccess}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoManager;
