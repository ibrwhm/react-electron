import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        // Güncelleme mevcut olduğunda
        window.electron.on('update-available', (info) => {
            setUpdateInfo(info);
            setOpen(true);
        });

        // İndirme ilerlemesi
        window.electron.on('download-progress', (progressObj) => {
            setProgress(progressObj.percent);
        });

        // İndirme tamamlandığında
        window.electron.on('update-downloaded', () => {
            setDownloaded(true);
        });
    }, []);

    const handleDownload = async () => {
        setDownloading(true);
        await window.electron.invoke('start-update-download');
    };

    const handleInstall = async () => {
        await window.electron.invoke('quit-and-install');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Yeni Güncelleme Mevcut!</DialogTitle>
                    <DialogDescription>
                        Versiyon {updateInfo?.version} yayınlandı.
                        {updateInfo?.releaseNotes && (
                            <div className="mt-2">
                                <h4 className="font-semibold">Güncelleme Notları:</h4>
                                <p className="text-sm">{updateInfo.releaseNotes}</p>
                            </div>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {downloading && !downloaded && (
                    <div className="py-4">
                        <Progress value={progress} className="w-full" />
                        <p className="text-sm text-center mt-2">
                            İndiriliyor... {progress.toFixed(1)}%
                        </p>
                    </div>
                )}

                <DialogFooter>
                    {!downloading && (
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Daha Sonra
                        </Button>
                    )}
                    {!downloading && (
                        <Button onClick={handleDownload}>
                            Güncellemeyi İndir
                        </Button>
                    )}
                    {downloaded && (
                        <Button onClick={handleInstall}>
                            Yeniden Başlat ve Güncelle
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UpdateModal; 