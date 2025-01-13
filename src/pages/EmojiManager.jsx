import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "react-hot-toast";
import { Trash2, Plus } from "lucide-react";
import { FaPlay, FaStop } from "react-icons/fa";

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
      }, 1000);
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
      const result = await window.api.getReactionChannels();

      if (result.success && Array.isArray(result.channels)) {
        setChannels(result.channels);
      } else {
        console.error("Kanal yükleme hatası:", result);
        setChannels([]);
        toast.error("Kanallar yüklenirken hata oluştu");
      }
    } catch (error) {
      console.error("loadChannels hatası:", error);
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

      const result = await window.api.addReactionChannel(channelData);
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
    const result = await window.api.removeReactionChannel(channelId);
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

  return (
    <div className="p-6 space-y-6 bg-telegram-dark text-white">
      <Card className="bg-telegram-card border border-telegram-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <span className="p-2 rounded-lg bg-telegram-primary/10">😊</span>
              Emoji Listesi
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex gap-2 items-center bg-telegram-input/50 px-3 py-1.5 rounded-lg">
                <span className="text-sm text-telegram-secondary">Toplam:</span>
                <span className="text-sm font-medium text-white">
                  {emojiList.length}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              placeholder="Yeni emoji ekle"
              className="max-w-[200px] bg-telegram-input border-telegram-border focus:border-telegram-border-hover"
            />
            <Button
              onClick={handleAddEmoji}
              className="flex items-center gap-2 bg-telegram-primary hover:bg-telegram-primary-hover"
            >
              <Plus className="w-4 h-4" /> Ekle
            </Button>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="grid grid-cols-6 gap-4">
              {emojiList.map((emoji) => (
                <div
                  key={emoji}
                  className="flex items-center justify-between p-3 border border-telegram-border rounded-lg bg-telegram-card hover:border-telegram-border-hover group transition-all duration-200"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
                    {emoji}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveEmoji(emoji)}
                    className="opacity-0 group-hover:opacity-100 hover:bg-telegram-hover text-telegram-secondary hover:text-telegram-error transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="bg-telegram-card border border-telegram-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-white flex items-center gap-2">
              <span className="p-2 rounded-lg bg-telegram-primary/10">📢</span>
              Kanal Listesi
            </CardTitle>
            <div className="flex gap-2 items-center bg-telegram-input/50 px-3 py-1.5 rounded-lg">
              <span className="text-sm text-telegram-secondary">Aktif:</span>
              <span className="text-sm font-medium text-white">
                {channels.filter((ch) => ch.active).length}/{channels.length}
              </span>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-telegram-primary hover:bg-telegram-primary-hover">
                <Plus className="w-4 h-4" /> Kanal Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-telegram-card border border-telegram-border sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-telegram-primary/10">
                    📢
                  </span>
                  Yeni Kanal Ekle
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label className="text-sm text-telegram-secondary">
                    Kanal Kullanıcı Adı
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-telegram-secondary">
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
                      className="pl-8 bg-telegram-input border-telegram-border focus:border-telegram-border-hover"
                    />
                  </div>
                  <p className="text-xs text-telegram-secondary mt-1">
                    Kanalın kullanıcı adını @ işareti olmadan girin
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-telegram-secondary">
                    Kanal Başlığı
                  </Label>
                  <Input
                    value={newChannel.title}
                    onChange={(e) =>
                      setNewChannel({ ...newChannel, title: e.target.value })
                    }
                    placeholder="Kanal başlığını girin"
                    className="bg-telegram-input border-telegram-border focus:border-telegram-border-hover"
                  />
                  <p className="text-xs text-telegram-secondary mt-1">
                    Kanalın görünen adını girin
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="flex-1 border-telegram-border hover:bg-telegram-hover"
                >
                  İptal
                </Button>
                <Button
                  onClick={handleAddChannel}
                  className="flex-1 bg-telegram-primary hover:bg-telegram-primary-hover"
                >
                  Ekle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center justify-between p-4 border border-telegram-border rounded-lg bg-telegram-card/80 hover:bg-telegram-card transition-all duration-200 hover:border-telegram-border-hover hover:shadow-lg group"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-telegram-primary/10 text-2xl group-hover:scale-110 transition-transform duration-200">
                      {channel.emoji}
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium text-lg">{channel.title}</div>
                      <div className="text-sm text-telegram-secondary flex items-center gap-2">
                        <span>@{channel.id.split("/").pop()}</span>
                        <span className="w-1 h-1 rounded-full bg-telegram-secondary/50"></span>
                        <span className="text-xs">
                          {channel.active ? "Aktif" : "Pasif"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-telegram-card/60 px-3 py-1.5 rounded-full">
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
                      className="opacity-0 group-hover:opacity-100 hover:bg-telegram-error/10 text-telegram-secondary hover:text-telegram-error rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
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
        </CardContent>
      </Card>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="p-2 rounded-lg bg-telegram-primary/10">📝</span>
            Son İşlemler
          </h3>
          <div className="flex gap-2 items-center bg-telegram-input/50 px-3 py-1.5 rounded-lg">
            <span className="text-sm text-telegram-secondary">Toplam Log:</span>
            <span className="text-sm font-medium text-white">
              {reactionLog.length}
            </span>
          </div>
        </div>
        <Card className="bg-telegram-card border border-telegram-border">
          <CardContent className="p-4">
            <ScrollArea className="h-[300px]">
              {reactionLog.map((log, index) => (
                <div
                  key={index}
                  className="mb-3 p-3 bg-telegram-card/60 border border-telegram-border rounded-lg hover:border-telegram-border-hover transition-all duration-200 hover:shadow-md group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg group-hover:scale-110 transition-transform duration-200">
                          {log.emoji}
                        </span>
                        <span className="text-sm font-medium text-telegram-primary">
                          {log.channelTitle || log.channelId}
                        </span>
                      </div>
                      <div className="text-xs text-telegram-muted">
                        {new Date(log.timestamp).toLocaleString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs ${
                        log.success
                          ? "bg-emerald-500/20 text-emerald-500"
                          : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {log.success ? "Başarılı" : "Başarısız"}
                    </div>
                  </div>
                  {log.error && (
                    <div className="mt-2 text-xs text-red-400 bg-red-500/10 p-2 rounded">
                      {log.error}
                    </div>
                  )}
                </div>
              ))}
              {reactionLog.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-8 text-telegram-muted">
                  <div className="w-12 h-12 rounded-full bg-telegram-card/60 flex items-center justify-center mb-3">
                    <svg
                      className="w-6 h-6"
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
                  <p className="text-sm font-medium">Henüz işlem yapılmadı</p>
                  <p className="text-xs mt-1">
                    Sistem başlatıldığında işlemler burada görünecek
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center mt-8">
        <Button
          size="lg"
          onClick={handleStartStop}
          className={`w-[200px] flex items-center gap-2 transition-all duration-300 ${
            systemRunning
              ? "bg-telegram-error hover:bg-telegram-error-hover"
              : "bg-telegram-success hover:bg-telegram-success-hover"
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
        </Button>
      </div>
    </div>
  );
};

export default EmojiManager;
