import React from "react";
import { Outlet } from "react-router-dom";
import TitleBar from "./TitleBar";
import Sidebar from "./Sidebar";

const Layout = ({ onLogout }) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto bg-telegram-dark">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
