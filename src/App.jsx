import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InviteManager from './pages/InviteManager';
import EmojiManager from './pages/EmojiManager';
import VideoManager from './pages/VideoManager';
import ChannelManager from './pages/ChannelManager';
import LicenseManagement from './pages/LicenseManagement';
import Settings from './pages/Settings';
import SessionManager from './pages/SessionManager';
import UpdateModal from '@/components/UpdateModal';

function AuthCheck({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const license = await window.api.getLicense();
        const isAuthed = !!license;
        setIsAuthenticated(isAuthed);

        if (!isAuthed && window.location.pathname !== '/login') {
          navigate('/login');
        }
      } catch (error) {
        setIsAuthenticated(false);
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);

  return children({ isAuthenticated });
}

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <div className="flex flex-col h-screen">
        <AuthCheck>
          {({ isAuthenticated }) => (
            <Routes>
              <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />
              {isAuthenticated ? (
                <Route element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="invites" element={<InviteManager />} />
                  <Route path="emojis" element={<EmojiManager />} />
                  <Route path="videos" element={<VideoManager />} />
                  <Route path="channels" element={<ChannelManager />} />
                  <Route path="licenses" element={<LicenseManagement />} />
                  <Route path="settings" element={<Settings />} />
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
