import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  UserGroupIcon,
  FaceSmileIcon,
  VideoCameraIcon,
  RectangleGroupIcon,
  KeyIcon,
  Cog6ToothIcon,
  PhoneIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  PaperAirplaneIcon,
  ArrowLeftCircleIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

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
      adminOnly: true,
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
      className={`text-new-neutral-white flex flex-col transition-all duration-300 ease-linear ${
        isCollapsed ? "w-16" : "w-64"
      }`}
      initial={false}
    >
      <div className="p-4 mx-1 flex items-center justify-between border-b border-new-primary-border-light">
        <div className="flex items-center flex-1 overflow-hidden">
          <PaperAirplaneIcon className="h-6 w-6 text-new-primary-dark transform rotate-45" />
          {!isCollapsed && (
            <div className="ml-3 overflow-hidden">
              <div className="text-sm text-new-primary-dark font-bold whitespace-nowrap">
                Telegram Manager
              </div>
              <div className="text-xs text-new-neutral-gray">v{version}</div>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg text-new-primary-dark hover:bg-new-border-dark hover:text-new-primary-light transition-colors duration-300"
        >
          {isCollapsed ? (
            <ChevronDoubleRightIcon className="h-5 w-5" />
          ) : (
            <ChevronDoubleLeftIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <ul className="py-4">
          {menuItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;

            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <li key={item.path} className="px-2 py-1">
                <Link
                  to={item.path}
                  className={`flex items-center px-2 py-2 rounded-lg transition-colors text-new-neutral-gray ${
                    isActive ? "bg-new-border-dark" : "hover:bg-new-border-dark"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${isCollapsed ? "mx-auto" : "mr-3"}`}
                  />
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap"
                    >
                      {item.text}
                    </motion.span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-2 border-t border-new-primary-dark">
        <button
          onClick={onLogout}
          className={`w-full flex items-center justify-center px-2 py-2 rounded-lg text-new-neutral-gray hover:bg-new-border-dark hover:text-new-neutral-white transition-colors duration-300 ${
            isCollapsed ? "px-3" : "px-4"
          }`}
        >
          <ArrowLeftCircleIcon
            className={`h-5 w-5 ${isCollapsed ? "" : "mr-3"}`}
          />
          {!isCollapsed && <span className="whitespace-nowrap">Çıkış Yap</span>}
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;
