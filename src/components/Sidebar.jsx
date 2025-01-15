import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  UserGroupIcon,
  FaceSmileIcon,
  VideoCameraIcon,
  RectangleGroupIcon,
  KeyIcon,
  PhoneIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  PaperAirplaneIcon,
  ArrowLeftCircleIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

const Sidebar = ({ onLogout }) => {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [version, setVersion] = useState("1.0.0");

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const license = await window.api.getLicense();
        setIsAdmin(license?.data.type === "admin");
        const appVersion = await window.api.getAppVersion();
        setVersion(appVersion?.data?.version || "1.0.0");
      } catch (error) {
        setIsAdmin(false);
        setVersion("1.0.0");
      }
    };
    checkAdmin();
  }, []);

  const menuItems = [
    { path: "/", icon: HomeIcon, text: "Ana Sayfa", adminOnly: false },
    {
      path: "/invites",
      icon: UserGroupIcon,
      text: "Davet İşlemleri",
      adminOnly: false,
    },
    {
      path: "/emojis",
      icon: FaceSmileIcon,
      text: "Emoji İşlemleri",
      adminOnly: false,
    },
    {
      path: "/videos",
      icon: VideoCameraIcon,
      text: "Video İşlemleri",
      adminOnly: false,
    },
    {
      path: "/channels",
      icon: RectangleGroupIcon,
      text: "Kanal İşlemleri",
      adminOnly: false,
    },
    {
      path: "/sessions",
      icon: PhoneIcon,
      text: "Session Yönetimi",
      adminOnly: false,
    },
    {
      path: "/licenses",
      icon: KeyIcon,
      text: "Lisans Yönetimi",
      adminOnly: true,
    },
  ];

  return (
    <motion.div
      className={`bg-telegram-card/30 backdrop-blur-xl border-r border-telegram-border/10 flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-72"
      }`}
      initial={false}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-telegram-border/10">
        <AnimatePresence mode="wait">
          <motion.div
            key={isCollapsed ? "collapsed" : "expanded"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center flex-1 overflow-hidden"
          >
            <div className="relative w-10 h-10 flex items-center justify-center bg-telegram-primary/10 rounded-xl">
              <PaperAirplaneIcon className="h-5 w-5 text-telegram-primary transform rotate-45" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-telegram-card" />
            </div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="ml-3 overflow-hidden"
              >
                <h1 className="text-sm font-bold bg-gradient-to-r from-telegram-primary to-blue-400 bg-clip-text text-transparent whitespace-nowrap">
                  Telegram Manager
                </h1>
                <p className="text-xs text-telegram-secondary">v{version}</p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg text-telegram-secondary hover:bg-telegram-card/50 hover:text-telegram-primary transition-all duration-200"
        >
          {isCollapsed ? (
            <ChevronDoubleRightIcon className="h-5 w-5" />
          ) : (
            <ChevronDoubleLeftIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <AnimatePresence mode="wait">
          <motion.ul layout className="space-y-2">
            {menuItems.map((item) => {
              if (item.adminOnly && !isAdmin) return null;

              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <motion.li
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Link
                    to={item.path}
                    className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? "bg-telegram-primary text-white"
                        : "text-telegram-secondary hover:bg-telegram-card/50 hover:text-white"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isActive
                          ? "bg-white/10"
                          : "bg-telegram-card/30 group-hover:bg-telegram-card/50"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 transition-transform duration-200 ${
                          isCollapsed ? "mx-auto" : ""
                        } ${isActive ? "" : "group-hover:scale-110"}`}
                      />
                    </div>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="ml-3 whitespace-nowrap font-medium"
                      >
                        {item.text}
                      </motion.span>
                    )}
                  </Link>
                </motion.li>
              );
            })}
          </motion.ul>
        </AnimatePresence>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-telegram-border/10">
        <button
          onClick={onLogout}
          className={`w-full flex items-center px-3 py-2.5 rounded-xl hover:bg-red-500/10 group transition-all duration-200`}
        >
          <div className="p-2 rounded-lg bg-telegram-card/30 group-hover:bg-red-500/20">
            <ArrowLeftCircleIcon className="h-5 w-5 text-telegram-secondary group-hover:text-red-500" />
          </div>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="ml-3 font-medium text-telegram-secondary group-hover:text-red-500"
            >
              Çıkış Yap
            </motion.span>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;
