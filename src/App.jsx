import React, { useState, useEffect, Suspense, lazy } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import Login from "./pages/Login";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const InviteManager = lazy(() => import("./pages/InviteManager"));
const EmojiManager = lazy(() => import("./pages/EmojiManager"));
const VideoManager = lazy(() => import("./pages/VideoManager"));
const ChannelManager = lazy(() => import("./pages/ChannelManager"));
const LicenseManagement = lazy(() => import("./pages/LicenseManagement"));
const SessionManager = lazy(() => import("./pages/SessionManager"));
const UpdateModal = lazy(() => import("./components/UpdateModal"));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function AuthCheck({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogout, setIsLogout] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);

        if (isLogout) {
          setIsAuthenticated(false);
          return;
        }

        const license = await window.api.getLicense();

        if (!license) {
          throw new Error("Lisans bilgisi alınamadı");
        }

        if (!license.data) {
          throw new Error("Lisans verisi bulunamadı");
        }

        if (!license.data.key) {
          throw new Error("Lisans anahtarı bulunamadı");
        }

        if (!license.data.isActive) {
          throw new Error("Lisans aktif değil");
        }

        const now = new Date();
        const expiryDate = new Date(license.data.expiresAt);

        if (isNaN(expiryDate.getTime())) {
          throw new Error("Geçersiz lisans bitiş tarihi");
        }

        if (now > expiryDate) {
          throw new Error("Lisans süresi dolmuş");
        }

        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        if (!isLogout) {
          toast.error(error.message || "Kimlik doğrulama hatası");
        }

        if (window.location.pathname !== "/login") {
          setTimeout(() => {
            navigate("/login", { replace: true });
          }, 100);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate, isLogout]);

  const handleLogout = async () => {
    try {
      setIsLogout(true);
      await window.api.logout();
      toast.success("Başarıyla çıkış yapıldı");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error("Çıkış yapılırken bir hata oluştu");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-telegram-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-telegram-primary"></div>
          <p className="text-telegram-secondary mt-4">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return children({ isAuthenticated, handleLogout });
}

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#333",
            color: "#fff",
          },
          success: {
            iconTheme: {
              primary: "#10B981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#EF4444",
              secondary: "#fff",
            },
          },
        }}
      />
      <div className="flex flex-col h-screen">
        <AuthCheck>
          {({ isAuthenticated, handleLogout }) => (
            <Routes>
              <Route
                path="/login"
                element={
                  !isAuthenticated ? <Login /> : <Navigate to="/" replace />
                }
              />
              {isAuthenticated ? (
                <Route element={<Layout onLogout={handleLogout} />}>
                  <Route
                    index
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Dashboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="invites"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <InviteManager />
                      </Suspense>
                    }
                  />
                  <Route
                    path="emojis"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <EmojiManager />
                      </Suspense>
                    }
                  />
                  <Route
                    path="videos"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <VideoManager />
                      </Suspense>
                    }
                  />
                  <Route
                    path="channels"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <ChannelManager />
                      </Suspense>
                    }
                  />
                  <Route
                    path="licenses"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <LicenseManagement />
                      </Suspense>
                    }
                  />
                  <Route
                    path="sessions"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <SessionManager />
                      </Suspense>
                    }
                  />
                </Route>
              ) : (
                <Route path="*" element={<Navigate to="/login" replace />} />
              )}
            </Routes>
          )}
        </AuthCheck>
      </div>
      <Suspense fallback={<LoadingSpinner />}>
        <UpdateModal />
      </Suspense>
    </>
  );
}

export default App;
