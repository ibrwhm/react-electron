import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "react-hot-toast";
import { Trash2, Plus, SmileIcon } from "lucide-react";
import { FaPlay, FaStop } from "react-icons/fa";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";

const EmojiManager = () => {
  const [channels, setChannels] = useState([]);
  const [emojiList, setEmojiList] = useState([]);
  const [newEmoji, setNewEmoji] = useState("");
  const [newChannel, setNewChannel] = useState({ username: "", title: "" });
  const [open, setOpen] = useState(false);
  const [systemRunning, setSystemRunning] = useState(false);
  const [reactionLog, setReactionLog] = useState([]);

  useEffect(() => {
    loadChannels();
    loadEmojis();
    checkStatus();
  }, []);

  useEffect(() => {
    let interval;
    if (systemRunning) {
      interval = setInterval(async () => {
        const result = await window.api.getReactionLog();
        if (result.success) {
          setReactionLog(result.log);
        }
      }, 10000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [systemRunning]);

  const checkStatus = async () => {
    const result = await window.api.getSystemStatus();
    if (result.success) {
      setSystemRunning(result.isRunning);
    }
  };

  const loadChannels = async () => {
    try {
      const result = await window.api.getChannelList();
      if (result.success && Array.isArray(result.channels)) {
        setChannels(result.channels);
      } else {
        setChannels([]);
        toast.error("Kanallar yüklenirken hata oluştu");
      }
    } catch (error) {
      setChannels([]);
      toast.error("Kanallar yüklenirken beklenmeyen bir hata oluştu");
    }
  };

  const loadEmojis = async () => {
    const result = await window.api.getEmojiList();
    if (result.success) {
      setEmojiList(result.emojis);
    } else {
      toast.error("Emoji listesi yüklenirken hata oluştu");
    }
  };

  const handleAddEmoji = async () => {
    if (!newEmoji || newEmoji.trim() === "") {
      toast.error("Emoji boş olamaz");
      return;
    }

    try {
      const result = await window.api.addEmoji(newEmoji.trim());
      if (result.success) {
        setEmojiList(result.emojis);
        setNewEmoji("");
        toast.success("Emoji eklendi");
      } else {
        toast.error(result.error || "Emoji eklenirken hata oluştu");
      }
    } catch (error) {
      toast.error("Emoji eklenirken bir hata oluştu");
    }
  };

  const handleRemoveEmoji = async (emoji) => {
    const result = await window.api.removeEmoji(emoji);
    if (result.success) {
      setEmojiList(result.emojis);
      toast.success("Emoji silindi");
    } else {
      toast.error("Emoji silinirken hata oluştu");
    }
  };

  const handleAddChannel = async () => {
    if (newChannel.username && newChannel.title) {
      const cleanUsername = newChannel.username.replace(/^@/, "");

      const channelData = {
        id: `https://t.me/${cleanUsername}`,
        title: newChannel.title,
        emoji: "📢",
        active: false,
      };

      const result = await window.api.addChannel(channelData);
      if (result.success) {
        await loadChannels();
        setNewChannel({ username: "", title: "" });
        setOpen(false);
        toast.success("Kanal eklendi");
      } else {
        toast.error("Kanal eklenirken hata oluştu");
      }
    } else {
      toast.error("Tüm alanları doldurun");
    }
  };

  const handleRemoveChannel = async (channelId) => {
    const result = await window.api.removeChannel(channelId);
    if (result.success) {
      await loadChannels();
      toast.success("Kanal kaldırıldı");
    } else {
      toast.error("Kanal kaldırılırken hata oluştu");
    }
  };

  const handleToggleChannel = async (channelId, active) => {
    const result = await window.api.updateChannelStatus({ channelId, active });
    if (result.success) {
      await loadChannels();
      toast.success(
        active ? "Kanal aktifleştirildi" : "Kanal devre dışı bırakıldı"
      );
    } else {
      toast.error("Kanal durumu güncellenirken hata oluştu");
    }
  };

  const handleStartStop = async () => {
    if (!systemRunning) {
      const activeChannels = channels.filter((ch) => ch?.active);
      const result = await window.api.startReactionSystem(activeChannels);
      if (result.success) {
        setSystemRunning(true);
        toast.success("Sistem başlatıldı");
      } else {
        toast.error(result.message || "Sistem baslatılırken hata oluştu");
      }
    } else {
      const result = await window.api.stopReactionSystem();
      if (result.success) {
        setSystemRunning(false);
        toast.success("Sistem durduruldu");
      } else {
        toast.error("Sistem durdurulurken hata oluştu");
      }
    }
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

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-telegram-primary/20 rounded-2xl">
              <SmileIcon className="w-8 h-8 text-telegram-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                Emoji Yönetimi
              </h1>
              <p className="text-telegram-secondary mt-1">
                Telegram kanallarına otomatik emoji tepki sistemi
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
                  {channels.filter((ch) => ch.active).length}
                </span>
              </div>
              <div className="text-center">
                <span className="text-sm font-medium text-telegram-secondary block">
                  Toplam Emoji
                </span>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                  {emojiList.length}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <motion.div
              variants={itemVariants}
              className="bg-telegram-card/20 backdrop-blur-xl rounded-3xl border border-telegram-border/30 shadow-2xl p-8 mb-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-telegram-primary/10">
                    😊
                  </span>
                  Emoji Listesi
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2 items-center bg-telegram-input/50 px-3 py-1.5 rounded-lg">
                    <span className="text-sm text-telegram-secondary">
                      Toplam:
                    </span>
                    <span className="text-sm font-medium text-white">
                      {emojiList.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mb-6">
                <Input
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  placeholder="Yeni emoji ekle"
                  className="max-w-[200px] bg-telegram-input/20 backdrop-blur-sm border-telegram-border/30 text-white placeholder:text-telegram-muted focus-visible:ring-telegram-primary"
                />
                <Button
                  onClick={handleAddEmoji}
                  className="flex items-center gap-2 bg-gradient-to-r from-telegram-primary to-telegram-primary-hover hover:shadow-telegram-primary/30"
                >
                  <Plus className="w-4 h-4" /> Ekle
                </Button>
              </div>

              <ScrollArea className="h-[200px]">
                <div className="grid grid-cols-6 gap-4">
                  {emojiList.map((emoji) => (
                    <motion.div
                      key={emoji}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-between p-3 bg-telegram-card/30 backdrop-blur-sm border border-telegram-border/30 rounded-xl hover:border-telegram-primary/20 group transition-all duration-200"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
                        {emoji}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveEmoji(emoji)}
                        className="opacity-0 group-hover:opacity-100 hover:bg-telegram-error/10 text-telegram-secondary hover:text-telegram-error transition-all duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-telegram-card/20 backdrop-blur-xl rounded-3xl border border-telegram-border/30 shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-telegram-primary/10">
                    📢
                  </span>
                  Kanal Listesi
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2 items-center bg-telegram-input/50 px-3 py-1.5 rounded-lg">
                    <span className="text-sm text-telegram-secondary">
                      Aktif:
                    </span>
                    <span className="text-sm font-medium text-white">
                      {channels.filter((ch) => ch.active).length}/
                      {channels.length}
                    </span>
                  </div>
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2 bg-gradient-to-r from-telegram-primary to-telegram-primary-hover hover:shadow-telegram-primary/30">
                        <Plus className="w-4 h-4" /> Kanal Ekle
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-telegram-card/20 backdrop-blur-xl border-telegram-border/30 text-white max-w-lg p-8 rounded-3xl shadow-2xl">
                      <DialogHeader className="mb-8">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                          <div className="p-3 bg-telegram-primary/20 rounded-xl">
                            <span className="text-2xl">📢</span>
                          </div>
                          Yeni Kanal Ekle
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-8">
                        <div className="space-y-4">
                          <Label className="text-lg text-telegram-secondary">
                            Kanal Kullanıcı Adı
                          </Label>
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-telegram-secondary text-lg group-hover:text-telegram-primary transition-colors duration-200">
                              @
                            </span>
                            <Input
                              value={newChannel.username}
                              onChange={(e) =>
                                setNewChannel({
                                  ...newChannel,
                                  username: e.target.value,
                                })
                              }
                              placeholder="örn: ihbarmisali"
                              className="pl-10 bg-telegram-input/20 backdrop-blur-sm border-telegram-border/30 text-white placeholder:text-telegram-muted focus-visible:ring-telegram-primary text-lg py-6 rounded-xl shadow-inner transition-all duration-200 hover:bg-telegram-input/30"
                            />
                          </div>
                          <p className="text-sm text-telegram-secondary/80 ml-1">
                            Kanalın kullanıcı adını @ işareti olmadan girin
                          </p>
                        </div>

                        <div className="space-y-4">
                          <Label className="text-lg text-telegram-secondary">
                            Kanal Başlığı
                          </Label>
                          <Input
                            value={newChannel.title}
                            onChange={(e) =>
                              setNewChannel({
                                ...newChannel,
                                title: e.target.value,
                              })
                            }
                            placeholder="Kanal başlığını girin"
                            className="bg-telegram-input/20 backdrop-blur-sm border-telegram-border/30 text-white placeholder:text-telegram-muted focus-visible:ring-telegram-primary text-lg py-6 rounded-xl shadow-inner transition-all duration-200 hover:bg-telegram-input/30"
                          />
                          <p className="text-sm text-telegram-secondary/80 ml-1">
                            Kanalın görünen adını girin
                          </p>
                        </div>
                      </div>

                      <DialogFooter className="mt-8 gap-4">
                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setOpen(false)}
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-white bg-gradient-to-r from-telegram-error to-telegram-error-hover shadow-lg hover:shadow-telegram-error/30 transition-all duration-200 text-lg font-medium"
                        >
                          İptal
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleAddChannel}
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-white bg-gradient-to-r from-telegram-primary to-telegram-primary-hover shadow-lg hover:shadow-telegram-primary/30 transition-all duration-200 text-lg font-medium"
                        >
                          <Plus className="w-5 h-5" />
                          Ekle
                        </motion.button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {channels.map((channel) => (
                    <motion.div
                      key={channel.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 bg-telegram-card/30 backdrop-blur-sm rounded-xl border border-telegram-border/30 hover:border-telegram-primary/20 group transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-telegram-primary/20 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-200">
                          {channel.emoji}
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {channel.title}
                          </div>
                          <div className="text-sm text-telegram-secondary">
                            @{channel.id.split("/").pop()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-telegram-card/40 px-3 py-1.5 rounded-lg">
                          <Switch
                            checked={channel.active}
                            onCheckedChange={(checked) =>
                              handleToggleChannel(channel.id, checked)
                            }
                            className="data-[state=checked]:bg-telegram-success"
                          />
                          <span
                            className={`text-sm ${
                              channel.active
                                ? "text-telegram-success"
                                : "text-telegram-muted"
                            }`}
                          >
                            {channel.active ? "Aktif" : "Pasif"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveChannel(channel.id)}
                          className="opacity-0 group-hover:opacity-100 hover:bg-telegram-error/10 text-telegram-secondary hover:text-telegram-error transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                  {channels.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-telegram-muted space-y-4">
                      <div className="w-16 h-16 rounded-full bg-telegram-card/60 flex items-center justify-center">
                        <Plus className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium">Henüz kanal eklenmemiş</p>
                        <p className="text-sm">
                          Kanal eklemek için yukarıdaki "Kanal Ekle" butonunu
                          kullanın
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-6">
            <motion.div
              variants={itemVariants}
              className="bg-telegram-card/20 backdrop-blur-xl rounded-3xl border border-telegram-border/30 shadow-2xl p-8"
            >
              <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-3">
                <span className="p-2 rounded-lg bg-telegram-primary/10">
                  📝
                </span>
                Son İşlemler
              </h2>

              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {reactionLog.map((log, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-telegram-card/30 backdrop-blur-sm rounded-xl border border-telegram-border/30 hover:border-telegram-primary/20 group transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg group-hover:scale-110 transition-transform duration-200">
                              {log.emoji}
                            </span>
                            <span className="font-medium text-white">
                              {log.channelTitle || log.channelId}
                            </span>
                          </div>
                          <div className="text-xs text-telegram-muted">
                            {new Date(log.timestamp).toLocaleString("tr-TR")}
                          </div>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-lg text-xs ${
                            log.success
                              ? "bg-telegram-success/20 text-telegram-success"
                              : "bg-telegram-error/20 text-telegram-error"
                          }`}
                        >
                          {log.success ? "Başarılı" : "Başarısız"}
                        </div>
                      </div>
                      {log.error && (
                        <div className="mt-2 text-xs bg-telegram-error/10 text-telegram-error p-2 rounded-lg">
                          {log.error}
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {reactionLog.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-telegram-muted space-y-4">
                      <div className="w-16 h-16 rounded-full bg-telegram-card/60 flex items-center justify-center">
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">Henüz işlem yapılmadı</p>
                        <p className="text-sm">
                          Sistem başlatıldığında işlemler burada görünecek
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </motion.div>

            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartStop}
                className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-white shadow-lg transition-all duration-200 text-lg font-medium ${
                  systemRunning
                    ? "bg-gradient-to-r from-telegram-error to-telegram-error-hover hover:shadow-telegram-error/30"
                    : "bg-gradient-to-r from-telegram-success to-telegram-success-hover hover:shadow-telegram-success/30"
                }`}
              >
                {systemRunning ? (
                  <>
                    <FaStop className="w-5 h-5" />
                    Sistemi Durdur
                  </>
                ) : (
                  <>
                    <FaPlay className="w-5 h-5" />
                    Sistemi Başlat
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default EmojiManager;
