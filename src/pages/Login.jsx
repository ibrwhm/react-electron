import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import TitleBar from "@/components/TitleBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import appIcon from "@/assets/icon.png";

const Login = () => {
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await window.api.validateLicense(licenseKey);

      if (result.data.valid) {
        await window.api.storeLicense(licenseKey);
        await window.api.maintainTray();
        toast.success("Giriş başarılı!");
        navigate("/", { replace: true });
        window.location.reload();
      } else {
        toast.error(result.message || "Geçersiz lisans anahtarı");
      }
    } catch (error) {
      toast.error("Giriş yapılırken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-dark-900">
      <TitleBar />
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <img src={appIcon} alt="Logo" className="mx-auto h-16 w-16" />
            <h2 className="mt-6 text-3xl font-extrabold text-white">
              Lisans Doğrulama
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Devam etmek için lisans anahtarınızı girin
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <Label htmlFor="license-key" className="sr-only">
                  Lisans Anahtarı
                </Label>
                <Input
                  id="license-key"
                  name="license"
                  type="text"
                  required
                  className="!bg-telegram-input appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-600 bg-dark-800 text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Lisans Anahtarı"
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
                className="group relative w-full flex justify-center"
              >
                {loading ? (
                  <>
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
                  </>
                ) : (
                  "Doğrula"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
