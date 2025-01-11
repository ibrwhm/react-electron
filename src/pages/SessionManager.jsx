import React, { useState, useEffect } from 'react';
import { TrashIcon, ArrowPathIcon, CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const SessionManager = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ success: 0, fail: 0, total: 0 });
  const [checkProgress, setCheckProgress] = useState({ success: 0, fail: 0, total: 0, finished: false });
  const [checking, setChecking] = useState(false);

  const loadSessions = async () => {
    try {
      const result = await window.api.getSessions();
      if (result.success) {
        setSessions(result.sessions);
      } else {
        toast.error('Sessionlar yüklenemedi: ' + result.error);
      }
    } catch (error) {
      toast.error('Sessionlar yüklenirken hata oluştu');
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      setLoading(true);
      const result = await window.api.deleteSession(sessionId);
      if (result.success) {
        toast.success('Session başarıyla silindi');
        await loadSessions();
      } else {
        toast.error('Session silinemedi: ' + result.error);
      }
    } catch (error) {
      toast.error('Session silinirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSessions = async () => {
    try {
      const result = await window.api.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Session Files', extensions: ['session'] }]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        setUploading(true);
        const importResult = await window.api.importSessions(result.filePaths);
        
        if (importResult.success && importResult.successCount > 0) {
          toast.success(`${importResult.successCount} session başarıyla yüklendi`);
          if (importResult.failCount > 0) {
            toast.error(`${importResult.failCount} session yüklenemedi`);
          }
          await loadSessions();
        } else {
          toast.error(importResult.error || 'Session yüklenemedi');
        }
      }
    } catch (error) {
      toast.error('Session yükleme hatası: ' + error.message);
    } finally {
      setUploading(false);
      setShowUploadModal(false);
    }
  };

  const handleCheckSessions = async () => {
    try {
      setChecking(true);
      const result = await window.api.checkSessions();
      
      if (result.success) {
        const successCount = result.results.filter(r => r.success).length;
        const failCount = result.results.filter(r => !r.success).length;
        
        if (successCount > 0) {
          toast.success(`${successCount} session aktif ve çalışıyor`);
        }
        if (failCount > 0) {
          toast.error(`${failCount} session kontrol edilemedi`);
        }
        
        await loadSessions();
      } else {
        toast.error('Session kontrolü başarısız: ' + result.error);
      }
    } catch (error) {
      toast.error('Session kontrolü sırasında hata: ' + error.message);
    } finally {
      setChecking(false);
    }
  };

  const SessionCard = ({ session }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-[#1a1b1e] rounded-lg p-4 flex justify-between items-center ${
        !session.isActive ? 'opacity-50' : ''
      }`}
    >
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-medium text-white">
            {session.username || session.phone}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            session.isActive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
          }`}>
            {session.isActive ? 'Aktif' : 'Pasif'}
          </span>
        </div>
        <span className="text-sm text-gray-400">
          Son kontrol: {session.lastUsed ? new Date(session.lastUsed).toLocaleString() : 'Hiç kontrol edilmedi'}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleDeleteSession(session.sessionId)}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );

  const UploadModal = () => (
    <AnimatePresence>
      {showUploadModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-[#1a1b1e] rounded-lg p-6 w-96 relative"
          >
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            <h2 className="text-xl font-semibold mb-4 text-white">Session Yükle</h2>
            
            <div className="space-y-4">
              <div 
                onClick={handleUploadSessions}
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
              >
                <CloudArrowUpIcon className="w-12 h-12 mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-400">
                  Session dosyalarını seçmek için tıklayın
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Desteklenen format: .session
                </p>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>İlerleme:</span>
                    <span>{uploadProgress.success + uploadProgress.fail} / {uploadProgress.total}</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{
                        width: `${((uploadProgress.success + uploadProgress.fail) / uploadProgress.total) * 100}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-500">{uploadProgress.success} başarılı</span>
                    <span className="text-red-500">{uploadProgress.fail} başarısız</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8 bg-telegram-card p-4 rounded-lg">
        <div>
          <h1 className="text-2xl font-bold text-white">Oturum Yöneticisi</h1>
          <p className="text-gray-400 mt-1">Toplam {sessions.length} oturum</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowUploadModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
          >
            <CloudArrowUpIcon className="h-5 w-5 mr-2" />
            Session Ekle
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCheckSessions}
            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200"
            disabled={loading}
          >
            <ArrowPathIcon className={`h-5 w-5 ${checking ? 'animate-spin' : ''}`} />
            Kontrol Et
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className={`flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 ${
              refreshing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={refreshing}
          >
            <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>

      {sessions && sessions.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl text-gray-400 mb-2">Henüz hiç oturum bulunmuyor</h2>
          <p className="text-gray-500">Yeni oturum eklemek için Session Ekle butonunu kullanın</p>
        </div>
      ) : (
        <div className="bg-telegram-card p-4 rounded-lg grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session, index) => {
            const key = session.sessionId || session._id?.toString() || `temp-${index}`;
            return (
              <SessionCard key={key} session={session} />
            );
          })}
        </div>
      )}

      {checkProgress.total > 0 && (
        <div className="bg-telegram-card p-4 rounded-lg mt-4">
          <h2 className="text-lg font-medium text-white mb-2">Kontrol İlerlemesi</h2>
          <div className="flex justify-between text-sm text-gray-400">
            <span>İlerleme:</span>
            <span>{checkProgress.success + checkProgress.fail} / {checkProgress.total}</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{
                width: `${((checkProgress.success + checkProgress.fail) / checkProgress.total) * 100}%`
              }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-green-500">{checkProgress.success} başarılı</span>
            <span className="text-red-500">{checkProgress.fail} başarısız</span>
          </div>
        </div>
      )}

      <UploadModal />
    </div>
  );
};

export default SessionManager;
