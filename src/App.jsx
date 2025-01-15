import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import InviteManager from "./pages/InviteManager";
import EmojiManager from "./pages/EmojiManager";
import VideoManager from "./pages/VideoManager";
import ChannelManager from "./pages/ChannelManager";
import LicenseManagement from "./pages/LicenseManagement";
import SessionManager from "./pages/SessionManager";
import UpdateModal from "./components/UpdateModal";

// Merkezi loading spinner bileşeni
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-telegram-dark">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-telegram-primary"></div>
      <p className="text-telegram-secondary mt-4">Yükleniyor...</p>
    </div>
  </div>
);

function AuthCheck({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogout, setIsLogout] = useState(false);
  const navigate = useNavigate();
  const authChecked = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (authChecked.current || isLogout) {
        return;
      }

      try {
        setIsLoading(true);
        authChecked.current = true;

        const result = await window.api.getLicense();

        if (result?.success === true && result?.data) {
          setIsAuthenticated(true);
          if (window.location.pathname === "/login") {
            navigate("/dashboard", { replace: true });
          }
        } else {
          setIsAuthenticated(false);
          if (window.location.pathname !== "/login") {
            navigate("/login", { replace: true });
          }
        }
      } catch (error) {
        console.error("Kimlik doğrulama hatası:", error);
        setIsAuthenticated(false);

        if (!isLogout) {
          toast.error(error.message || "Kimlik doğrulama hatası");
        }

        if (window.location.pathname !== "/login") {
          navigate("/login", { replace: true });
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
      authChecked.current = false;
      await window.api.logout();
      setIsAuthenticated(false);
      toast.success("Başarıyla çıkış yapıldı");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error("Çıkış yapılırken bir hata oluştu");
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
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
                  <Route index element={<Dashboard />} />
                  <Route path="invites" element={<InviteManager />} />
                  <Route path="emojis" element={<EmojiManager />} />
                  <Route path="videos" element={<VideoManager />} />
                  <Route path="channels" element={<ChannelManager />} />
                  <Route path="licenses" element={<LicenseManagement />} />
                  <Route path="sessions" element={<SessionManager />} />
                </Route>
              ) : (
                <Route path="*" element={<Navigate to="/login" replace />} />
              )}
            </Routes>
          )}
        </AuthCheck>
      </div>
      <UpdateModal />
    </>
  );
}

export default App;
