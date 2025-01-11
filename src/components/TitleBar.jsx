import React, { useState, useEffect } from 'react';
import { IoClose } from "react-icons/io5";
import { VscChromeMinimize } from "react-icons/vsc";
import { BiWindowAlt } from "react-icons/bi";

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = () => {
      const maximized = window.api.isMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();
    window.addEventListener('resize', checkMaximized);
    return () => window.removeEventListener('resize', checkMaximized);
  }, []);

  const handleMinimize = async () => {
    await window.api.windowMinimize();
  };

  const handleMaximize = async () => {
    await window.api.windowMaximize();
    setIsMaximized(!isMaximized);
  };

  const handleClose = async () => {
    await window.api.windowClose();
  };

  return (
    <div className="titlebar h-8 bg-dark-800 flex justify-between items-center px-2 select-none" style={{ WebkitAppRegion: 'drag' }}>
      <div className="titlebar-drag flex-1">
        <span className="text-sm text-gray-400">Telegram Session Manager</span>
      </div>
      <div className="window-controls flex items-center" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={handleMinimize}
          className="window-control-btn hover:bg-dark-700 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <VscChromeMinimize className="text-lg" />
        </button>
        <button
          onClick={handleMaximize}
          className="window-control-btn hover:bg-dark-700 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <BiWindowAlt className="text-lg" style={{ transform: isMaximized ? 'rotate(180deg)' : 'none' }} />
        </button>
        <button
          onClick={handleClose}
          className="window-control-btn hover:bg-red-600 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <IoClose className="text-xl" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;