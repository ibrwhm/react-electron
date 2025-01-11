import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { ArrowPathIcon, UsersIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const fetchMethods = [
    { value: 'all', label: 'Tüm Üyeler' },
    { value: 'online', label: 'Çevrimiçi Üyeler' },
    { value: 'recent', label: 'Son Görülen Üyeler' },
    { value: 'active_chat', label: 'Aktif Sohbet Edenler' }
];

const InviteManager = () => {
    const [sourceGroup, setSourceGroup] = useState('');
    const [targetGroup, setTargetGroup] = useState('');
    const [inviteLimit, setInviteLimit] = useState(4);
    const [fetchMethod, setFetchMethod] = useState('all');
    const [members, setMembers] = useState([]);
    const [systemActive, setSystemActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState({ success: 0, fail: 0 });

    useEffect(() => {
    }, [systemActive, isLoading, progress]);

    const MAX_DISPLAY_MEMBERS = 250;

    const resetForm = () => {
        setSourceGroup('');
        setTargetGroup('');
        setInviteLimit(4);
        setFetchMethod('all');
        setMembers([]);
        setProgress({ success: 0, fail: 0 });
        setSystemActive(false);
        setIsLoading(false);
    };

    const resetInviteProgress = () => {
        setProgress({ success: 0, fail: 0 });
        setSystemActive(false);
        setIsLoading(false);
    };

    useEffect(() => {
        if (!systemActive) {
            setIsLoading(false);
        }
    }, [systemActive]);

    useEffect(() => {
        if (systemActive) {
            const interval = setInterval(() => {
                window.api.getInviteProgress().then(data => {
                    if (data) {
                        setProgress(prev => ({
                            success: data.success || prev.success,
                            fail: data.fail || prev.fail
                        }));
                    }
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [systemActive]);

    const handleFetchMembers = async () => {
        if (!sourceGroup || !targetGroup) {
            toast.error("Lütfen kaynak ve hedef grubu belirtin");
            return;
        };

        try {
            setIsLoading(true);
            setMembers([]);

            const result = await window.api.fetchMembers(sourceGroup, targetGroup, fetchMethod);
            if (!result.success) {
                if (result.message.includes('CHAT_ADMIN_REQUIRED') || result.message.includes('admin yetkisi gerekiyor')) {
                    toast.error(result.message);
                    return;
                };

                throw new Error(result.message || 'Üyeler getirilemedi');
            };

            if (!result.members || result.members.length === 0) {
                toast.error("Hiç üye bulunamadı");
                return;
            };

            const displayMembers = result.members.slice(0, MAX_DISPLAY_MEMBERS);
            setMembers(displayMembers);

            toast.success(`${result.members.length} üye getirildi.`);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartInvite = async () => {
        if (!members.length) {
            toast.error("Lütfen önce üyeleri getirin");
            return;
        }

        try {
            setIsLoading(true);
            setSystemActive(true);
            setProgress({ success: 0, fail: 0 });
            let inviteStarted = false;

            const result = await window.api.startInvite(sourceGroup, members, inviteLimit, (data) => {
                if (data.finished && !inviteStarted) {
                    inviteStarted = true;
                    return;
                }

                if (data.success !== undefined) {
                    setProgress(prev => ({
                        success: data.success || prev.success,
                        fail: data.fail || prev.fail,
                    }));
                }

                if (data.finished === true) {
                    toast.success(data.message || "Davet işlemi tamamlandı");
                    resetForm();
                    setSystemActive(false);
                }
            });

            if (!result.success) {
                throw new Error(result.message);
            }

            toast.success("Üyeler davet edilmeye başlandı.");
        } catch (error) {
            setSystemActive(false);
            toast.error("Davet işlemi sırasında hata oluştu");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStopInvite = async () => {
        try {
            setIsLoading(true);
            const result = await window.api.stopInvite();

            if (result.success) {
                toast.success("Davet işlemi durduruldu");
                resetInviteProgress();
            } else {
                toast.error(result.error || 'Davet işlemi durdurulamadı');
            }
        } catch (error) {
            toast.error("Davet durdurma sırasında hata oluştu");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLimitChange = (value) => {
        const numValue = parseInt(value, 10);

        if (!value || isNaN(numValue)) {
            setInviteLimit(1);
            return;
        }

        if (numValue < 1) {
            setInviteLimit(1);
        } else if (numValue > 5) {
            setInviteLimit(5);
            toast.error("Maksimum limit 5 olabilir");
        } else {
            setInviteLimit(numValue);
        }
    };

    return (
        <div className="min-h-screen bg-telegram-dark text-white p-6">
            <div className="max-w-6xl mx-auto">
                <div className="bg-telegram-card rounded-xl p-6 mb-6 flex justify-between items-center shadow-lg">
                    <div>
                        <h1 className="text-2xl font-semibold text-white mb-1">Davet İşlemleri</h1>
                        <p className="text-sm text-telegram-secondary">Telegram gruplarına otomatik üye davet sistemi</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-telegram-card rounded-xl p-6 shadow-lg">
                            <div className="space-y-4">
                                <div>
                                    <Label className="block text-sm font-medium text-telegram-secondary mb-2">
                                        Kaynak Grup
                                    </Label>
                                    <Input
                                        type="text"
                                        value={sourceGroup}
                                        onChange={(e) => setSourceGroup(e.target.value)}
                                        placeholder="Örn: https://t.me/kaynak_grup"
                                        className="w-full px-4 py-2.5 bg-telegram-input border border-telegram-border rounded-lg focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <Label className="block text-sm font-medium text-telegram-secondary mb-2">
                                        Hedef Grup
                                    </Label>
                                    <Input
                                        type="text"
                                        value={targetGroup}
                                        onChange={(e) => setTargetGroup(e.target.value)}
                                        placeholder="Örn: https://t.me/hedef_grup"
                                        className="w-full px-4 py-2.5 bg-telegram-input border border-telegram-border rounded-lg focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <Label className="block text-sm font-medium text-telegram-secondary mb-2">
                                        Davet Limiti
                                    </Label>
                                    <Input
                                        type="number"
                                        value={inviteLimit}
                                        onChange={(e) => handleLimitChange(e.target.value)}
                                        min={1}
                                        max={5}
                                        className="w-full px-4 py-2.5 bg-telegram-input border border-telegram-border rounded-lg focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <Label className="block text-sm font-medium text-telegram-secondary mb-2">
                                        Üye Çekme Yöntemi
                                    </Label>
                                    <Select value={fetchMethod} onValueChange={(value) => setFetchMethod(value)}>
                                        <SelectTrigger className="w-full px-4 py-2.5 bg-telegram-input border border-telegram-border rounded-lg focus:outline-none transition-colors">
                                            <SelectValue placeholder="Fetch metodunu seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {fetchMethods.map((method) => (
                                                <SelectItem key={method.value} value={method.value}>
                                                    {method.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-telegram-card rounded-lg p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-white mb-2">Üye Listesi</h2>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleFetchMembers}
                                        disabled={isLoading || !sourceGroup || !targetGroup}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {isLoading ? (
                                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                        ) : (
                                            "Üyeleri Getir"
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {members.length > 0 ? (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {members.slice(0, MAX_DISPLAY_MEMBERS).map((member, index) => (
                                        <div
                                            key={`${member.id}-${index}`}
                                            className="flex items-center justify-between p-3 bg-telegram-dark rounded-lg"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-telegram-hover rounded-full flex items-center justify-center">
                                                    <UsersIcon className="w-5 h-5 text-telegram-primary" />
                                                </div>
                                                <div>
                                                    <div className="font-medium">
                                                        {member.firstName} {member.lastName}
                                                    </div>
                                                    <div className="text-sm text-telegram-secondary">
                                                        {member.username ? `@${member.username}` : 'Kullanıcı adı yok'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-telegram-secondary text-sm">
                                                {member.status || 'Durum bilgisi yok'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <UsersIcon className="w-12 h-12 mx-auto text-telegram-secondary mb-3" />
                                    <p className="text-telegram-secondary">
                                        Üyeleri getirmek için yukarıdaki formu kullanın
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-telegram-card rounded-lg p-6 shadow-lg h-fit">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-white mb-1">İstatistikler</h2>
                                <p className="text-sm text-telegram-secondary">Davet durumu ve istatistikler</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-telegram-dark rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <UsersIcon className="w-5 h-5 text-telegram-secondary" />
                                        <span className="text-xs text-telegram-secondary">Toplam</span>
                                    </div>
                                    <div className="text-2xl font-semibold">{members.length}</div>
                                </div>
                                <div className="bg-telegram-dark rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <ChartBarIcon className="w-5 h-5 text-telegram-secondary" />
                                        <span className="text-xs text-telegram-secondary">Başarılı</span>
                                    </div>
                                    <div className="text-2xl font-semibold text-[#00B574]">
                                        {progress.success}
                                    </div>
                                </div>

                                <div className="bg-telegram-dark rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <ChartBarIcon className="w-5 h-5 text-telegram-secondary" />
                                        <span className="text-xs text-telegram-secondary">Hatalı</span>
                                    </div>
                                    <div className="text-2xl font-semibold text-telegram-error">
                                        {progress.fail}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <Button
                                    className={`w-full ${systemActive
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                    disabled={!members.length || isLoading}
                                    onClick={() => {
                                        if (systemActive) {
                                            handleStopInvite();
                                        } else {
                                            handleStartInvite();
                                        }
                                    }}
                                >
                                    {isLoading ? (
                                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                    ) : systemActive ? (
                                        "Durdur"
                                    ) : (
                                        "Başlat"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InviteManager;
