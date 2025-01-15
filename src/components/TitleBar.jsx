import React, { useState, useEffect } from "react";
import { IoClose } from "react-icons/io5";
import { VscChromeMinimize } from "react-icons/vsc";
import { BiWindowAlt } from "react-icons/bi";
import { motion } from "framer-motion";
import appIcon from "@/assets/icon.ico";

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const checkMaximized = () => {
      const maximized = window.api.isMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();
    window.addEventListener("resize", checkMaximized);
    return () => window.removeEventListener("resize", checkMaximized);
  }, []);

  const handleMinimize = async () => {
    await window.api.windowMinimize();
  };

  const handleMaximize = async () => {
    await window.api.windowMaximize();
    setIsMaximized(!isMaximized);
  };

  const handleClose = async () => {
    await window.api.windowHide();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="titlebar h-10 bg-telegram-card/95 backdrop-blur-xl border-b border-white/5 flex justify-between items-center px-4 select-none"
      style={{ WebkitAppRegion: "drag" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="titlebar-drag flex items-center gap-3 flex-1">
        <motion.img
          src={appIcon}
          alt="Logo"
          className="w-5 h-5"
          initial={{ rotate: 0 }}
          animate={{ rotate: isHovered ? 360 : 0 }}
          transition={{ duration: 0.5 }}
        />
        <motion.span
          className="text-sm font-medium bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent"
          initial={{ opacity: 0.8 }}
          animate={{ opacity: isHovered ? 1 : 0.8 }}
        >
          Telegram Session Manager
        </motion.span>
      </div>
      <div
        className="window-controls flex items-center gap-1"
        style={{ WebkitAppRegion: "no-drag" }}
      >
        <motion.button
          whileHover={{
            scale: 1.1,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMinimize}
          className="window-control-btn rounded-full p-1.5 text-white/70 hover:text-white transition-colors"
        >
          <VscChromeMinimize className="text-lg" />
        </motion.button>
        <motion.button
          whileHover={{
            scale: 1.1,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMaximize}
          className="window-control-btn rounded-full p-1.5 text-white/70 hover:text-white transition-colors"
        >
          <BiWindowAlt
            className="text-lg"
            style={{ transform: isMaximized ? "rotate(180deg)" : "none" }}
          />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: "rgba(239, 68, 68, 0.2)" }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClose}
          className="window-control-btn rounded-full p-1.5 text-white/70 hover:text-red-500 transition-colors"
        >
          <IoClose className="text-xl" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default TitleBar;
