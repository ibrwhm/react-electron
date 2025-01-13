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

const UpdateModal = () => {
  const [open, setOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.electron.on("update-available", (info) => {
      setError(null);
      setUpdateInfo(info);
      setOpen(true);
    });

    window.electron.on("download-progress", (progressObj) => {
      setProgress(progressObj.percent);
    });

    window.electron.on("update-downloaded", () => {
      setDownloaded(true);
    });

    window.electron.on("update-error", (errorInfo) => {
      setError(errorInfo.message);
      setDownloading(false);
    });
  }, []);

  const handleDownload = async () => {
    try {
      setError(null);
      setDownloading(true);
      await window.electron.invoke("start-update-download");
    } catch (err) {
      setError("Güncelleme indirme başlatılamadı");
      setDownloading(false);
    }
  };

  const handleInstall = async () => {
    await window.electron.invoke("quit-and-install");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Güncelleme Mevcut!</DialogTitle>
          <DialogDescription className="text-sm text-white">
            Versiyon {updateInfo?.version} yayınlandı.
            {updateInfo?.releaseNotes && (
              <div className="mt-2">
                <h4 className="font-semibold text-white">
                  Güncelleme Notları:
                </h4>
                <p className="text-sm text-white">{updateInfo.releaseNotes}</p>
              </div>
            )}
            {error && (
              <div className="mt-2 text-red-500 text-sm">Hata: {error}</div>
            )}
          </DialogDescription>
        </DialogHeader>

        {downloading && !downloaded && !error && (
          <div className="py-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center mt-2">
              İndiriliyor... {progress.toFixed(1)}%
            </p>
          </div>
        )}

        <DialogFooter>
          {!downloading && (
            <Button
              className="bg-telegram-error hover:bg-telegram-error-hover"
              onClick={() => setOpen(false)}
            >
              Daha Sonra
            </Button>
          )}
          {!downloading && !error && (
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={handleDownload}
            >
              Güncellemeyi İndir
            </Button>
          )}
          {error && <Button onClick={handleDownload}>Tekrar Dene</Button>}
          {downloaded && (
            <Button onClick={handleInstall}>Yeniden Başlat ve Güncelle</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateModal;
