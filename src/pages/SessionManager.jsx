import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrashIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  UsersIcon,
  PhoneIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

const SessionManager = () => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    success: 0,
    fail: 0,
    total: 0,
    currentFile: "",
    finished: false,
  });
  const [checkProgress, setCheckProgress] = useState({
    success: 0,
    fail: 0,
    total: 0,
    finished: false,
  });
  const [checking, setChecking] = useState(false);

  const loadSessions = async () => {
    try {
      const result = await window.api.getSessions();
      if (result.success) {
        setSessions(result.sessions);
      } else {
        toast.error("Sessionlar yüklenemedi: " + result.error);
      }
    } catch (error) {
      toast.error("Sessionlar yüklenirken hata oluştu");
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    let modalCloseTimeout = null;

    const importProgressHandler = (_, progress) => {
      if (!isSubscribed) return;

      if (!progress) {
        console.error("Geçersiz ilerleme bildirimi");
        return;
      }

      setUploadProgress((prev) => ({
        ...prev,
        ...progress,
      }));

      if (progress.finished) {
        setUploading(false);

        if (modalCloseTimeout) {
          clearTimeout(modalCloseTimeout);
        }

        if (progress.success > 0 || progress.fail > 0) {
          const messages = [];
          if (progress.success > 0) {
            messages.push(`${progress.success} session başarıyla yüklendi`);
          }
          if (progress.fail > 0) {
            messages.push(`${progress.fail} session yüklenemedi`);
          }

          const message = messages.join(", ");
          if (progress.fail > 0 && progress.success === 0) {
            toast.error(message);
          } else {
            toast.success(message);
          }
        }

        modalCloseTimeout = setTimeout(() => {
          if (isSubscribed) {
            setShowUploadModal(false);
            loadSessions();

            setUploadProgress({
              success: 0,
              fail: 0,
              total: 0,
              currentFile: "",
              finished: false,
            });
          }
        }, 1500);
      }
    };

    const checkProgressHandler = (_, progress) => {
      if (!isSubscribed) return;

      if (!progress) {
        console.error("Geçersiz kontrol bildirimi");
        return;
      }

      setCheckProgress(progress);

      if (progress.finished) {
        setChecking(false);
        loadSessions();
      }
    };

    window.api.on("import-progress", importProgressHandler);
    window.api.on("check-progress", checkProgressHandler);
    loadSessions();

    return () => {
      isSubscribed = false;
      window.api.removeListener("import-progress", importProgressHandler);
      window.api.removeListener("check-progress", checkProgressHandler);
      if (modalCloseTimeout) {
        clearTimeout(modalCloseTimeout);
      }
    };
  }, []);

  const handleDeleteSession = async (sessionId) => {
    try {
      setIsLoading(true);
      const result = await window.api.deleteSession(sessionId);
      if (result.success) {
        toast.success("Session başarıyla silindi");
        await loadSessions();
      } else {
        toast.error("Session silinemedi: " + result.error);
      }
    } catch (error) {
      toast.error("Session silinirken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSessions = async () => {
    try {
      const result = await window.api.showOpenDialog({
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "Session Files", extensions: ["session"] }],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        setUploading(true);
        setShowUploadModal(true);
        setUploadProgress({
          success: 0,
          fail: 0,
          total: result.filePaths.length,
          currentFile: "",
          finished: false,
        });

        const importResult = await window.api.importSessions(result.filePaths);

        if (!importResult.success) {
          toast.error("Session yükleme hatası: " + importResult.error);
          setUploading(false);
          setShowUploadModal(false);
        }
      }
    } catch (error) {
      toast.error("Session yükleme hatası: " + error.message);
      setUploading(false);
      setShowUploadModal(false);
    }
  };

  const handleCheckSessions = async () => {
    try {
      setChecking(true);
      const result = await window.api.checkSessions();

      if (result.success) {
        const successCount = result.results.filter((r) => r.success).length;
        const failCount = result.results.filter((r) => !r.success).length;

        if (successCount > 0) {
          toast.success(`${successCount} session aktif ve çalışıyor`);
        }
        if (failCount > 0) {
          toast.error(`${failCount} session kontrol edilemedi`);
        }

        await loadSessions();
      } else {
        toast.error("Session kontrolü başarısız: " + result.error);
      }
    } catch (error) {
      toast.error("Session kontrolü sırasında hata: " + error.message);
    } finally {
      setChecking(false);
    }
  };

  const UploadModal = () => (
    <AnimatePresence>
      {showUploadModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-gray-800/90 rounded-xl p-8 w-[480px] relative border border-gray-700/50"
          >
            <button
              onClick={() => !uploading && setShowUploadModal(false)}
              className={`absolute top-4 right-4 text-gray-400 hover:text-white transition-colors ${
                uploading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={uploading}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-semibold mb-6 text-white">
              Session Yükle
            </h2>

            <div className="space-y-6">
              <div
                onClick={!uploading ? handleUploadSessions : undefined}
                className={`border-2 border-dashed border-gray-700/50 hover:border-indigo-500/50 rounded-xl p-8 text-center transition-colors ${
                  uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <CloudArrowUpIcon className="w-12 h-12 mx-auto text-gray-400" />
                <p className="mt-4 text-gray-300">
                  {uploading
                    ? "Session yükleniyor..."
                    : "Session dosyalarını seçmek için tıklayın"}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Desteklenen format: .session
                </p>
              </div>

              {uploading && uploadProgress && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>İlerleme</span>
                    <span>
                      {uploadProgress.success + uploadProgress.fail} /{" "}
                      {uploadProgress.total}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{
                        width: `${
                          ((uploadProgress.success + uploadProgress.fail) /
                            uploadProgress.total) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-500">
                      {uploadProgress.success} başarılı
                    </span>
                    <span className="text-red-500">
                      {uploadProgress.fail} başarısız
                    </span>
                  </div>
                  {uploadProgress.currentFile && (
                    <p className="text-sm text-gray-400 mt-2 truncate">
                      İşleniyor: {uploadProgress.currentFile}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

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
      className="min-h-screen bg-gradient-to-br from-telegram-dark via-[#1c2c3e] to-telegram-darker py-12 px-4 relative overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-telegram-primary/10 rounded-full blur-3xl transform -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-telegram-secondary/10 rounded-full blur-3xl transform translate-y-1/2"></div>
      </div>

      <div className="max-w-7xl mx-auto relative">
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Session Yönetimi
          </h1>
          <p className="text-gray-400 mt-2">
            Telegram sessionlarınızı yönetin ve kontrol edin.
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <UsersIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Aktif Sessionlar</h2>
                <p className="text-gray-400">{sessions.length} session yüklü</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <PhoneIcon className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Kontrol Durumu</h2>
                <p className="text-gray-400">
                  {checkProgress.success} başarılı, {checkProgress.fail}{" "}
                  başarısız
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex gap-4 mb-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUploadSessions}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-medium flex items-center gap-2"
            disabled={isLoading}
          >
            <UserIcon className="w-5 h-5" />
            Session Yükle
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCheckSessions}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg font-medium flex items-center gap-2"
            disabled={isLoading}
          >
            <UserIcon className="w-5 h-5" />
            Kontrol Et
          </motion.button>
        </motion.div>

        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {sessions.map((session) => (
            <motion.div
              key={session.sessionId}
              variants={itemVariants}
              className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <UserIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {session.firstName || "İsimsiz"}
                    </h3>
                    <p className="text-sm text-gray-400">
                      @{session.username || "kullanıcı adı yok"}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDeleteSession(session.sessionId)}
                  className="p-2 hover:bg-red-500/10 rounded-lg group"
                >
                  <svg
                    className="w-5 h-5 text-gray-400 group-hover:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </motion.button>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">
                  <span className="font-medium text-gray-300">Telefon:</span>{" "}
                  {session.phoneNumber}
                </p>
                <p className="text-sm text-gray-400">
                  <span className="font-medium text-gray-300">Durum:</span>{" "}
                  <span
                    className={
                      session.isActive ? "text-green-400" : "text-red-400"
                    }
                  >
                    {session.isActive ? "Aktif" : "Pasif"}
                  </span>
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <UploadModal />
    </motion.div>
  );
};

export default SessionManager;
