import React from "react";
import { Outlet } from "react-router-dom";
import TitleBar from "./TitleBar";
import Sidebar from "./Sidebar";

const Layout = ({ onLogout }) => {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto bg-telegram-dark">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
