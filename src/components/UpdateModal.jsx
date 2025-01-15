import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineRefresh,
  HiOutlineDownload,
  HiOutlineClock,
} from "react-icons/hi";

const UpdateModal = () => {
  const [open, setOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.api.on("update-available", (event, info) => {
      setError(null);
      setUpdateInfo(info);
      setOpen(true);
    });

    window.api.on("download-progress", (event, progressObj) => {
      setProgress(progressObj.percent);
    });

    window.api.on("update-downloaded", () => {
      setDownloaded(true);
    });

    window.api.on("update-error", (event, errorInfo) => {
      setError(errorInfo.message);
      setDownloading(false);
    });

    return () => {
      window.api.removeAllListeners("update-available");
      window.api.removeAllListeners("download-progress");
      window.api.removeAllListeners("update-downloaded");
      window.api.removeAllListeners("update-error");
    };
  }, []);

  const handleDownload = async () => {
    try {
      setError(null);
      setDownloading(true);
      await window.api.startUpdateDownload();
    } catch (err) {
      setError("Güncelleme indirme başlatılamadı");
      setDownloading(false);
    }
  };

  const handleInstall = async () => {
    try {
      await window.api.quitAndInstall();
    } catch (err) {
      setError("Güncelleme yüklenemedi");
    }
  };

  const releaseNotesStyle = `
    .release-notes {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.875rem;
      line-height: 1.5;
    }
    .release-notes h1 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      color: rgba(255, 255, 255, 0.9);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .release-notes h1::before {
      content: "•";
      color: #4F86EF;
    }
    .release-notes ul {
      list-style: none;
      padding-left: 1.5rem;
      margin: 0.5rem 0;
    }
    .release-notes li {
      position: relative;
      margin: 0.25rem 0;
    }
    .release-notes li::before {
      content: "•";
      color: rgba(79, 134, 239, 0.6);
      position: absolute;
      left: -1rem;
    }
  `;

  return (
    <>
      <style>{releaseNotesStyle}</style>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-telegram-card/95 backdrop-blur-xl border border-white/10 shadow-2xl">
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-telegram-primary to-telegram-secondary bg-clip-text text-transparent">
              Yeni Güncelleme Mevcut!
            </DialogTitle>
            <DialogDescription className="text-base text-white/90">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-lg">
                  <span className="text-telegram-primary">
                    v{updateInfo?.version}
                  </span>
                  <span>sürümü yayınlandı</span>
                </div>

                {updateInfo?.releaseNotes && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-4 space-y-2"
                  >
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      <i className="ri-file-list-line"></i>
                      Güncelleme Notları:
                    </h4>
                    <div className="bg-black/20 rounded-xl p-4">
                      <div
                        className="release-notes"
                        dangerouslySetInnerHTML={{
                          __html: updateInfo.releaseNotes,
                        }}
                      />
                    </div>
                  </motion.div>
                )}

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-500 flex items-center gap-2"
                    >
                      <i className="ri-error-warning-line text-xl"></i>
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </DialogDescription>
          </DialogHeader>

          {downloading && !downloaded && !error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-6"
            >
              <Progress
                value={progress}
                className="h-2 bg-telegram-dark"
                indicatorClassName="bg-gradient-to-r from-telegram-primary to-telegram-secondary"
              />
              <div className="flex items-center justify-between mt-3 text-sm text-white/80">
                <span>İndiriliyor...</span>
                <span className="font-medium">{progress.toFixed(1)}%</span>
              </div>
            </motion.div>
          )}

          <DialogFooter className="gap-3 mt-4">
            {!downloading && (
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-transparent border border-white/10 hover:bg-white/5 text-white/80"
                onClick={() => setOpen(false)}
              >
                <HiOutlineClock className="text-lg" />
                Daha Sonra
              </Button>
            )}

            {!downloading && !error && (
              <Button
                className="flex items-center gap-2 bg-gradient-to-r from-telegram-primary to-telegram-secondary hover:opacity-90 transform transition-all duration-200 hover:scale-105"
                onClick={handleDownload}
              >
                <HiOutlineDownload className="text-lg" />
                Güncellemeyi İndir
              </Button>
            )}

            {error && (
              <Button
                className="flex items-center gap-2 bg-telegram-primary/10 text-telegram-primary hover:bg-telegram-primary/20"
                onClick={handleDownload}
              >
                <HiOutlineRefresh className="text-lg" />
                Tekrar Dene
              </Button>
            )}

            {downloaded && (
              <Button
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90 transform transition-all duration-200 hover:scale-105"
                onClick={handleInstall}
              >
                <HiOutlineRefresh className="text-lg" />
                Yeniden Başlat ve Güncelle
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UpdateModal;
