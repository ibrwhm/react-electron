import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
    ArrowLeftCircleIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const Sidebar = () => {
    const location = useLocation();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [version, setVersion] = useState('1.0.0');

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const license = await window.api.getLicense();
                setIsAdmin(license?.type === 'admin');
                const appVersion = await window.api.getAppVersion();
                setVersion(appVersion?.version || '1.0.0');
            } catch (error) {
                setIsAdmin(false);
            }
        };
        checkAdmin();
    }, []);

    const handleLogout = async () => {
        try {
            await window.api.storeLicense(null);
            window.location.href = '/login';
        } catch (error) {
            throw error;
        }
    };

    const menuItems = [
        { path: '/', icon: HomeIcon, text: 'Ana Sayfa', adminOnly: false },
        { path: '/invites', icon: UserGroupIcon, text: 'Davet İşlemleri', adminOnly: false },
        { path: '/emojis', icon: FaceSmileIcon, text: 'Emoji İşlemleri', adminOnly: false },
        { path: '/videos', icon: VideoCameraIcon, text: 'Video İşlemleri', adminOnly: false },
        { path: '/channels', icon: RectangleGroupIcon, text: 'Kanal İşlemleri', adminOnly: false },
        { path: '/sessions', icon: PhoneIcon, text: 'Session Yönetimi', adminOnly: true },
        { path: '/licenses', icon: KeyIcon, text: 'Lisans Yönetimi', adminOnly: true },
        { path: '/settings', icon: Cog6ToothIcon, text: 'Ayarlar', adminOnly: false }
    ];

    return (
        <motion.div
            className={`text-white flex flex-col transition-all duration-300 ease-in-out ${
                isCollapsed ? 'w-16' : 'w-64'
            }`}
            initial={false}
        >
            <div className="p-4 flex items-center justify-between border-b border-dark-700">
                <div className="flex items-center flex-1 overflow-hidden">
                    <PaperAirplaneIcon className="h-6 w-6 text-primary-500 transform rotate-45" />
                    {!isCollapsed && (
                        <div className="ml-3 overflow-hidden">
                            <div className="text-sm font-bold whitespace-nowrap">Telegram Manager</div>
                            <div className="text-xs text-gray-400">v{version}</div>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1 rounded-lg hover:bg-dark-700 transition-colors"
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
                                    className={`flex items-center px-2 py-2 rounded-lg transition-colors ${
                                        isActive
                                            ? 'bg-primary text-white'
                                            : 'text-gray-400 hover:bg-dark-700 hover:text-white'
                                    }`}
                                >
                                    <Icon className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
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

            <div className="p-2 border-t border-dark-700">
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center justify-center px-2 py-2 rounded-lg text-gray-200 hover:bg-telegram-error/80 hover:text-white transition-colors duration-300 ${
                        isCollapsed ? 'px-3' : 'px-4'
                    }`}
                >
                    <ArrowLeftCircleIcon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
                    {!isCollapsed && (
                        <span className="whitespace-nowrap">Çıkış Yap</span>
                    )}
                </button>
            </div>
        </motion.div>
    );
};

export default Sidebar;
