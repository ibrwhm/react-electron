import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { FiUsers, FiUserPlus, FiUserMinus } from "react-icons/fi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  UsersIcon,
  ChartBarIcon,
  LinkIcon,
  UserGroupIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const fetchMethods = [
  { value: "all", label: "Tüm Üyeler" },
  { value: "online", label: "Çevrimiçi Üyeler" },
  { value: "recent", label: "Son Görülen Üyeler" },
  { value: "active_chat", label: "Aktif Sohbet Edenler" },
];

const InviteManager = () => {
  const MAX_DISPLAY_MEMBERS = 250;

  const [sourceGroup, setSourceGroup] = useState("");
  const [targetGroup, setTargetGroup] = useState("");
  const [inviteLimit, setInviteLimit] = useState(4);
  const [fetchMethod, setFetchMethod] = useState("all");
  const [members, setMembers] = useState([]);
  const [systemActive, setSystemActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ success: 0, fail: 0 });

  const resetInviteProgress = () => {
    setSystemActive(false);
    setProgress({ success: 0, fail: 0 });
    setSourceGroup("");
    setTargetGroup("");
    setMembers([]);
  };

  useEffect(() => {
    if (systemActive) {
      let prevData = null;

      const interval = setInterval(async () => {
        try {
          const data = await window.api.getInviteProgress();
          if (!data) return;

          const hasChanged =
            !prevData ||
            prevData.success !== data.success ||
            prevData.fail !== data.fail;

          if (hasChanged) {
            setProgress((prev) => ({
              success: data.success ?? prev.success,
              fail: data.fail ?? prev.fail,
            }));

            if (data.message) {
              toast.success(data.message);
            }

            prevData = { ...data };
          }

          if (data.finished) {
            if (data.message) {
              toast.success(data.message);
            }

            resetInviteProgress();
            setSystemActive(false);
            clearInterval(interval);
          }
        } catch (error) {
          toast.error("Davet işlemi sırasında hata oluştu");
        }
      }, 2000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [systemActive]);

  useEffect(() => {
    const notificationAudio = new Audio("/notification.wav");
    notificationAudio.volume = 0.5;

    const handleNotification = () => {
      try {
        notificationAudio.currentTime = 0;
        notificationAudio.play().catch((error) => {
          toast.error("Ses çalma hatası");
        });
      } catch (error) {
        toast.error("Ses çalma hatası");
      }
    };

    window.api.on("play-notification", handleNotification);

    return () => {
      window.api.removeListener("play-notification", handleNotification);
      notificationAudio.pause();
      notificationAudio.src = "";
    };
  }, []);

  const handleFetchMembers = async () => {
    if (!sourceGroup || !targetGroup) {
      toast.error("Lütfen kaynak ve hedef grubu belirtin");
      return;
    }

    try {
      setIsLoading(true);
      setMembers([]);

      const result = await window.api.fetchMembers(
        sourceGroup,
        targetGroup,
        fetchMethod
      );
      if (!result.success) {
        if (
          result.message.includes("CHAT_ADMIN_REQUIRED") ||
          result.message.includes("admin yetkisi gerekiyor")
        ) {
          toast.error(result.message);
          return;
        }

        throw new Error(result.message || "Üyeler getirilemedi");
      }

      if (!result.members || result.members.length === 0) {
        toast.error("Hiç üye bulunamadı");
        return;
      }

      const displayMembers = result.members.slice(0, MAX_DISPLAY_MEMBERS);
      setMembers(displayMembers);

      toast.success(`${result.members.length} üye getirildi.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartInvite = async () => {
    if (!members.length) {
      toast.error("Lütfen önce üyeleri getirin");
      return;
    }

    try {
      setIsLoading(true);
      setSystemActive(true);
      setProgress({ success: 0, fail: 0 });

      const result = await window.api.startInvite(
        sourceGroup,
        members,
        inviteLimit
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success("Üyeler davet edilmeye başlandı.");
    } catch (error) {
      setSystemActive(false);
      toast.error("Davet işlemi sırasında hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopInvite = async () => {
    try {
      setIsLoading(true);
      const result = await window.api.stopInvite();

      if (result.success) {
        toast.success("Davet işlemi durduruldu");
        resetInviteProgress();
      } else {
        toast.error(result.error || "Davet işlemi durdurulamadı");
      }
    } catch (error) {
      toast.error("Davet durdurma sırasında hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLimitChange = (value) => {
    const numValue = parseInt(value, 10);

    if (!value || isNaN(numValue)) {
      setInviteLimit(1);
      return;
    }

    if (numValue < 1) {
      setInviteLimit(1);
    } else if (numValue > 5) {
      setInviteLimit(5);
      toast.error("Maksimum limit 5 olabilir");
    } else {
      setInviteLimit(numValue);
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
              <UserGroupIcon className="w-8 h-8 text-telegram-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                Davet İşlemleri
              </h1>
              <p className="text-telegram-secondary mt-1">
                Telegram gruplarına otomatik üye davet sistemi
              </p>
            </div>
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-telegram-card/30 backdrop-blur-sm px-6 py-3 rounded-2xl border border-telegram-border/30 shadow-lg flex items-center space-x-4"
          >
            <div className="text-center">
              <span className="text-sm font-medium text-telegram-secondary block">
                Başarılı
              </span>
              <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
                {progress.success}
              </span>
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-telegram-secondary block">
                Başarısız
              </span>
              <span className="text-xl font-bold bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent">
                {progress.fail}
              </span>
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
              <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-3">
                <LinkIcon className="w-6 h-6 text-telegram-primary" />
                Grup Bağlantıları
              </h2>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-telegram-secondary">Kaynak Grup</Label>
                  <div className="relative group">
                    <Input
                      type="text"
                      value={sourceGroup}
                      onChange={(e) => setSourceGroup(e.target.value)}
                      className="w-full bg-telegram-input/20 backdrop-blur-sm border-telegram-border/30 text-white placeholder:text-telegram-muted focus-visible:ring-telegram-primary text-lg py-6 pl-6 pr-12 rounded-xl shadow-inner transition-all duration-200 group-hover:bg-telegram-input/30"
                      placeholder="Örn: kaynak_grup"
                      disabled={isLoading || systemActive}
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <FiUsers className="h-6 w-6 text-telegram-muted group-hover:text-telegram-primary transition-colors duration-200" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-telegram-secondary">Hedef Grup</Label>
                  <div className="relative group">
                    <Input
                      type="text"
                      value={targetGroup}
                      onChange={(e) => setTargetGroup(e.target.value)}
                      className="w-full bg-telegram-input/20 backdrop-blur-sm border-telegram-border/30 text-white placeholder:text-telegram-muted focus-visible:ring-telegram-primary text-lg py-6 pl-6 pr-12 rounded-xl shadow-inner transition-all duration-200 group-hover:bg-telegram-input/30"
                      placeholder="Örn: hedef_grup"
                      disabled={isLoading || systemActive}
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <FiUserPlus className="h-6 w-6 text-telegram-muted group-hover:text-telegram-primary transition-colors duration-200" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-telegram-secondary">
                      Üye Getirme Yöntemi
                    </Label>
                    <Select
                      value={fetchMethod}
                      onValueChange={setFetchMethod}
                      disabled={isLoading || systemActive}
                    >
                      <SelectTrigger className="w-full bg-telegram-input/20 backdrop-blur-sm border-telegram-border/30 text-white hover:bg-telegram-input/30 transition-colors duration-200 h-[50px] px-6 text-lg rounded-xl">
                        <SelectValue placeholder="Yöntem seçin" />
                      </SelectTrigger>
                      <SelectContent className="bg-telegram-card/95 backdrop-blur-xl border-telegram-border/30 text-white rounded-xl shadow-2xl">
                        {fetchMethods.map((method) => (
                          <SelectItem
                            key={method.value}
                            value={method.value}
                            className="text-base focus:bg-telegram-primary/20 focus:text-white hover:bg-telegram-primary/10 cursor-pointer transition-colors duration-200 rounded-lg py-3"
                          >
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-telegram-secondary">
                      Davet Limiti
                    </Label>
                    <Input
                      type="number"
                      value={inviteLimit}
                      onChange={(e) => handleLimitChange(e.target.value)}
                      min={1}
                      max={5}
                      className="w-full bg-telegram-input/20 backdrop-blur-sm border-telegram-border/30 text-white placeholder:text-telegram-muted focus-visible:ring-telegram-primary text-lg py-6 pl-6 pr-12 rounded-xl shadow-inner transition-all duration-200 hover:bg-telegram-input/30"
                      disabled={isLoading || systemActive}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleFetchMembers}
                    disabled={isLoading || systemActive}
                    className="flex-1 flex items-center justify-center px-8 py-4 rounded-xl text-white bg-gradient-to-r from-telegram-primary to-telegram-primary-hover shadow-lg hover:shadow-telegram-primary/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                  >
                    <UsersIcon className="w-6 h-6 mr-2" />
                    Üyeleri Getir
                  </motion.button>
                </div>

                {members.length > 0 && (
                  <div className="mt-8 space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                        <ClockIcon className="w-6 h-6 text-telegram-primary" />
                        Son İşlem
                      </h2>
                      <div className="flex gap-4">
                        <div className="bg-telegram-card/30 backdrop-blur-sm rounded-xl px-4 py-2 border border-telegram-border/30">
                          <div className="text-sm text-telegram-secondary">
                            Toplam Üye
                          </div>
                          <div className="text-xl font-bold text-white">
                            {members.length}
                          </div>
                        </div>
                        <div className="bg-telegram-card/30 backdrop-blur-sm rounded-xl px-4 py-2 border border-telegram-border/30">
                          <div className="text-sm text-telegram-secondary">
                            Gösterilen
                          </div>
                          <div className="text-xl font-bold text-white">
                            {Math.min(members.length, MAX_DISPLAY_MEMBERS)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                      {members
                        .slice(0, MAX_DISPLAY_MEMBERS)
                        .map((member, index) => (
                          <motion.div
                            key={`${member.id}-${index}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center justify-between p-4 bg-telegram-card/30 backdrop-blur-sm rounded-xl border border-telegram-border/30 hover:border-telegram-primary/20 transition-all group"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-telegram-primary/20 rounded-xl flex items-center justify-center group-hover:bg-telegram-primary/30 transition-colors">
                                <UsersIcon className="w-5 h-5 text-telegram-primary" />
                              </div>
                              <div>
                                <div className="font-medium text-white">
                                  {member.firstName} {member.lastName}
                                </div>
                                <div className="text-sm text-telegram-secondary">
                                  {member.username
                                    ? `@${member.username}`
                                    : "Kullanıcı adı yok"}
                                </div>
                              </div>
                            </div>
                            <div className="bg-telegram-card/40 px-3 py-1.5 rounded-lg text-sm text-telegram-secondary">
                              {member.status || "Durum bilgisi yok"}
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-6">
            <motion.div
              variants={itemVariants}
              className="bg-telegram-card/20 backdrop-blur-xl rounded-3xl border border-telegram-border/30 shadow-2xl p-8"
            >
              <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-3">
                <ChartBarIcon className="w-6 h-6 text-telegram-primary" />
                Davet Durumu
              </h2>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-telegram-card/30 backdrop-blur-sm rounded-2xl p-4 border border-telegram-border/30">
                    <div className="text-sm text-telegram-secondary mb-1">
                      Başarılı
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                      {progress.success}
                    </div>
                  </div>
                  <div className="bg-telegram-card/30 backdrop-blur-sm rounded-2xl p-4 border border-telegram-border/30">
                    <div className="text-sm text-telegram-secondary mb-1">
                      Başarısız
                    </div>
                    <div className="text-2xl font-bold text-red-400">
                      {progress.fail}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartInvite}
                    disabled={isLoading || systemActive || !members.length}
                    className="w-full flex items-center justify-center px-6 py-4 rounded-xl text-white bg-gradient-to-r from-telegram-primary to-telegram-primary-hover shadow-lg hover:shadow-telegram-primary/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                  >
                    <FiUserPlus className="w-6 h-6 mr-2" />
                    Davet Et
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStopInvite}
                    disabled={isLoading || !systemActive}
                    className="w-full flex items-center justify-center px-6 py-4 rounded-xl text-white bg-gradient-to-r from-telegram-error to-telegram-error-hover shadow-lg hover:shadow-telegram-error/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                  >
                    <FiUserMinus className="w-6 h-6 mr-2" />
                    Durdur
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default InviteManager;
