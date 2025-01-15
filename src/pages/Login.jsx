import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import TitleBar from "@/components/TitleBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import appIcon from "@/assets/icon.ico";
import { motion } from "framer-motion";
import { HiKey, HiLockClosed } from "react-icons/hi";

const Login = () => {
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const validationResult = await window.api.validateLicense(licenseKey);

      if (!validationResult.success) {
        throw new Error(validationResult.message || "Lisans doğrulanamadı");
      }

      const storeResult = await window.api.storeLicense(licenseKey);

      if (!storeResult.success) {
        throw new Error(storeResult.message || "Lisans kaydedilemedi");
      }

      toast.success("Giriş başarılı!");

      window.location.reload();
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 500);
    } catch (error) {
      console.error("Giriş hatası:", error);
      setError(error.message || "Giriş yapılırken bir hata oluştu");
      toast.error(error.message || "Giriş yapılırken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col h-screen bg-gradient-to-br from-telegram-dark via-[#1c2c3e] to-telegram-darker"
    >
      <TitleBar />
      <div className="relative flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        {/* Arkaplan efektleri */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-telegram-primary/10 rounded-full blur-3xl transform -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-telegram-secondary/10 rounded-full blur-3xl transform translate-y-1/2"></div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="max-w-md w-full space-y-8 relative"
        >
          <div className="bg-dark-800/50 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/10">
            <div className="text-center">
              <motion.img
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                src={appIcon}
                alt="Logo"
                className="mx-auto h-20 w-20 drop-shadow-2xl"
              />
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mt-6 text-3xl font-extrabold bg-gradient-to-r from-telegram-primary to-telegram-secondary bg-clip-text text-transparent"
              >
                Lisans Doğrulama
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="mt-2 text-sm text-gray-400"
              >
                Devam etmek için lisans anahtarınızı girin
              </motion.p>
            </div>

            <motion.form
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-8 space-y-6"
              onSubmit={handleSubmit}
            >
              <div className="rounded-md">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiKey className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="license-key"
                    name="license"
                    type="text"
                    required
                    className="pl-10 !bg-dark-900/50 border-gray-600/50 focus:border-telegram-primary text-white placeholder-gray-400 rounded-lg"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 bg-gradient-to-r from-telegram-primary to-telegram-secondary hover:from-telegram-primary/90 hover:to-telegram-secondary/90 text-white rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02] focus:scale-[0.98]"
                >
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <HiLockClosed className="h-5 w-5 text-white/80 group-hover:text-white" />
                  </span>
                  {loading ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Doğrulanıyor...
                    </div>
                  ) : (
                    "Doğrula"
                  )}
                </Button>
              </div>
            </motion.form>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Login;
