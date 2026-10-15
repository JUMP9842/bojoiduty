import React, { useState, useMemo } from 'react';
import { useDuty } from '../context/DutyContext';
import {
  Settings,
  X,
  Bath,
  Users,
  Sparkles,
  Plus,
  Trash2,
  CalendarCheck,
  RotateCcw,
  CheckCircle2,
  Lock,
  Clock,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Bot,
  Send,
  HelpCircle,
  ExternalLink,
  Copy,
  AlertCircle,
  Cloud,
  ShieldCheck,
  Globe,
  QrCode,
  MessageSquare,
} from 'lucide-react';
import { AVAILABLE_COLORS, AVAILABLE_ICONS } from '../data/initialData';
import { getShiftMorningUserId, getShiftEveningUserId } from '../utils/shiftUtils';
import { getApiUrl } from '../utils/apiUtils';
import { LINE_OA_INFO } from '../utils/lineAuthUtils';

interface BackendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackendModal: React.FC<BackendModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    bathingSchedules,
    toggleBathingDate,
    users,
    addUser,
    deleteUser,
    shifts,
    adminAssignShift,
    adminClearShiftPart,
    autoDistributeShifts,
    resetToDefaultData,
    wipeAllData,
    bookingSettings,
    setMonthUnlockSchedule,
    deleteMonthUnlockSchedule,
    isFirebaseSynced,
  } = useDuty();

  // Password Protection for Backend (Password = "admin")
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [activeTab, setActiveTab] = useState<'duty_assign' | 'monthly_unlock' | 'bathing' | 'members' | 'fair_auto' | 'line_guide'>('duty_assign');

  // Line Guide & Test Push State
  const [lineGuideSubTab, setLineGuideSubTab] = useState<'callback' | 'webhook' | 'guide' | 'friend' | 'test'>('callback');
  const [testLineUserId, setTestLineUserId] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [activeWebhookUrl, setActiveWebhookUrl] = useState('https://pawsduty-duty.loca.lt/api/line/webhook');
  const [publicSiteUrl, setPublicSiteUrl] = useState('');
  const [isSavingPublicUrl, setIsSavingPublicUrl] = useState(false);
  const [saveUrlSuccess, setSaveUrlSuccess] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      fetch(getApiUrl('/api/line/config'))
        .then((res) => res.json())
        .then((data) => {
          if (data.webhookUrl) setActiveWebhookUrl(data.webhookUrl);
          if (data.publicSiteUrl) setPublicSiteUrl(data.publicSiteUrl);
        })
        .catch(console.warn);
    }
  }, [isOpen]);

  const handleSavePublicSiteUrl = async () => {
    setIsSavingPublicUrl(true);
    setSaveUrlSuccess(false);
    try {
      const res = await fetch(getApiUrl('/api/line/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicSiteUrl: publicSiteUrl.trim() }),
      });
      if (res.ok) {
        setSaveUrlSuccess(true);
        setTimeout(() => setSaveUrlSuccess(false), 3500);
      }
    } catch (err) {
      console.warn('Failed to save public site url:', err);
    } finally {
      setIsSavingPublicUrl(false);
    }
  };

  const handleTestPush = async () => {
    if (!testLineUserId.trim()) {
      setTestResult({ success: false, msg: 'กรุณากรอก LINE User ID สำหรับทดสอบ (e.g. U123456789...)' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(getApiUrl('/api/line/test-notification'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testUserId: testLineUserId.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          msg: '🎉 ส่งข้อความทดสอบไปยัง LINE สำเร็จ! โปรดเช็คในแอป LINE ของคุณ',
        });
      } else {
        setTestResult({
          success: false,
          msg: '❌ ส่งไม่สำเร็จ: ' + (data.error || 'โปรดตรวจสอบ Channel Access Token หรือให้แน่ใจว่าได้กดติดตามบอทแล้ว'),
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: 'เกิดข้อผิดพลาด: ' + err.message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('คัดลอกเรียบร้อยแล้ว: ' + text);
  };

  // Admin Calendar Navigation State
  const [adminCalDate, setAdminCalDate] = useState<Date>(() => new Date());
  const adminYear = adminCalDate.getFullYear();
  const adminMonth = adminCalDate.getMonth();

  const prevAdminMonth = () => setAdminCalDate(new Date(adminYear, adminMonth - 1, 1));
  const nextAdminMonth = () => setAdminCalDate(new Date(adminYear, adminMonth + 1, 1));
  const goToTodayAdmin = () => setAdminCalDate(new Date());

  const adminMonthTitle = useMemo(() => {
    return adminCalDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  }, [adminCalDate]);

  const daysInMonth = new Date(adminYear, adminMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(adminYear, adminMonth, 1).getDay(); // 0 = Sun

  const daysArray = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [firstDayOfWeek, daysInMonth]);

  const formatAdminDateStr = (d: number) => {
    return `${adminYear}-${String(adminMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  // Popover State for Assigning / Switching / Swapping User on a specific date & slot
  const [activeSlotTarget, setActiveSlotTarget] = useState<{
    date: string;
    type: 'daily' | 'bathing';
    part: 'morning' | 'evening' | 'full_day' | 'bathing';
    currentUserId?: string;
  } | null>(null);

  // Monthly Unlock Schedule Form
  const [scheduleTargetMonth, setScheduleTargetMonth] = useState(() => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
  });
  const [scheduleOpenDate, setScheduleOpenDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [scheduleOpenTime, setScheduleOpenTime] = useState('12:00');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);

  // Member form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('123');
  const [newMemberColor, setNewMemberColor] = useState(AVAILABLE_COLORS[0]);
  const [newMemberIcon, setNewMemberIcon] = useState(AVAILABLE_ICONS[0]);

  // Auto assign month
  const [autoYear, setAutoYear] = useState(new Date().getFullYear());
  const [autoMonth, setAutoMonth] = useState(new Date().getMonth());
  const [autoSuccessMessage, setAutoSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Password verification
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === 'admin') {
      setIsAdminAuthenticated(true);
      setPasswordError(false);
      setPasswordInput('');
    } else {
      setPasswordError(true);
    }
  };

  const handleSaveMonthSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTargetMonth || !scheduleOpenDate || !scheduleOpenTime) return;

    setMonthUnlockSchedule(scheduleTargetMonth, scheduleOpenDate, scheduleOpenTime, scheduleNotes.trim() || undefined);
    setScheduleSuccess(`บันทึกเวลาเปิดจองเดือน ${scheduleTargetMonth} เรียบร้อยแล้ว!`);
    setTimeout(() => setScheduleSuccess(null), 3500);
    setScheduleNotes('');
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    addUser(
      newUsername.trim(),
      newUsername.trim(),
      newMemberColor,
      newUsername.trim(),
      newPassword.trim(),
      newMemberIcon
    );
    setNewUsername('');
    setNewPassword('123');
  };

  const handleRunAutoDistribute = () => {
    if (users.length === 0) {
      alert('ยังไม่มีสมาชิกในระบบ กรุณาเพิ่มสมาชิกหรือให้สมาชิกเข้าสู่ระบบด้วย LINE ก่อน');
      return;
    }
    if (
      window.confirm(
        `ต้องการจัดสรรเวรประจำวันทั้งเดือน ${autoMonth + 1}/${autoYear} ให้สมาชิกทั้ง ${users.length} คน เท่ากันโดยอัตโนมัติหรือไม่?`
      )
    ) {
      autoDistributeShifts(autoYear, autoMonth);
      setAutoSuccessMessage(`จัดสรรเวรเดือน ${autoMonth + 1}/${autoYear} เรียบร้อยแล้ว!`);
      setTimeout(() => setAutoSuccessMessage(null), 3000);
    }
  };

  const getUserById = (id?: string) => users.find((u) => u.id === id);

  // If not authenticated, render password lock screen
  if (!isAdminAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-sm rounded-2xl bg-white border border-[#FFC067] shadow-2xl p-6 overflow-hidden text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-[#FFC067] text-neutral-950 flex items-center justify-center mx-auto mb-3 shadow-md border border-[#F5B153]">
            <KeyRound className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-neutral-900 mb-1">
            Admin Center
          </h3>
          <p className="text-xs text-neutral-500 mb-4">
            กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบจัดการหลังบ้าน
          </p>

          {passwordError && (
            <div className="mb-3 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs animate-in fade-in font-medium">
              รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                autoFocus
                placeholder="กรอกรหัสผ่าน (admin)..."
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-[#FFC067] focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 active:bg-[#FFC067] text-neutral-950 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 border border-[#FFC067]/70 cursor-pointer"
            >
              <span>เข้าสู่ระบบ Backend</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[94vh] flex flex-col rounded-2xl bg-white border border-[#FFC067] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-3 border-b border-[#FFC067]/40 flex items-center justify-between bg-[#FFF8EE]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#FFF8EE] text-neutral-950 flex items-center justify-center shadow-xs border border-[#FFC067]/70">
              <Settings className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-900">
                Admin Center
              </h3>
              {isFirebaseSynced && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                  Firebase Cloud Synced
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#FFC067]/60 px-5 sm:px-6 bg-white overflow-x-auto gap-1.5">
          <button
            onClick={() => setActiveTab('duty_assign')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'duty_assign'
                ? 'border-[#FFC067] text-neutral-950 bg-[#FFF8EE]'
                : 'border-transparent text-neutral-500 hover:text-neutral-950'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-neutral-900" />
            <span>จัดการเวรผู้ใช้ (Calendar View)</span>
          </button>

          <button
            onClick={() => setActiveTab('monthly_unlock')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'monthly_unlock'
                ? 'border-[#FFC067] text-neutral-950 bg-[#FFF8EE]'
                : 'border-transparent text-neutral-500 hover:text-neutral-950'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-neutral-900" />
            <span>ตั้งเวลาเปิดจองแต่ละเดือน</span>
          </button>

          <button
            onClick={() => setActiveTab('bathing')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'bathing'
                ? 'border-[#FFC067] text-neutral-950 bg-[#FFF8EE]'
                : 'border-transparent text-neutral-500 hover:text-neutral-950'
            }`}
          >
            <Bath className="w-3.5 h-3.5 text-sky-600" />
            <span>เวรอาบน้ำ ({bathingSchedules.filter((b) => b.enabled).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'members'
                ? 'border-[#FFC067] text-neutral-950 bg-[#FFF8EE]'
                : 'border-transparent text-neutral-500 hover:text-neutral-950'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>จัดการบัญชีผู้ใช้ ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('fair_auto')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'fair_auto'
                ? 'border-[#FFC067] text-neutral-950 bg-[#FFF8EE]'
                : 'border-transparent text-neutral-500 hover:text-neutral-950'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Auto Fair Share</span>
          </button>

          <button
            onClick={() => setActiveTab('line_guide')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'line_guide'
                ? 'border-[#FFC067] text-neutral-950 bg-[#FFF8EE]'
                : 'border-transparent text-neutral-500 hover:text-neutral-950'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-emerald-600" />
            <span>คู่มือ & LINE OA</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 text-xs">
          {/* TAB 1: Admin Interactive Calendar View */}
          {activeTab === 'duty_assign' && (
            <div className="space-y-3">
              {/* Calendar Toolbar & Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-[#FFF8EE]/60 border border-[#FFC067]/70">
                <div className="flex items-center gap-2.5">
                  <h4 className="text-sm font-bold text-neutral-900">
                    {adminMonthTitle} ({adminCalDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
                  </h4>
                  <button
                    onClick={goToTodayAdmin}
                    className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-white border border-[#FFC067]/70 text-neutral-950 hover:bg-[#FFC067]/30"
                  >
                    Today
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-[11px] text-neutral-500 hidden md:block">
                    💡 คลิกที่ชื่อผู้ใช้เพื่อเปลี่ยน/สลับคน &bull; กด 🗑️ เพื่อลบเฉพาะเวรนั้นๆ &bull; กด +🛁 เพิ่มเวรอาบน้ำ
                  </div>

                  <div className="flex items-center rounded-lg bg-white border border-[#FFC067]/70 p-0.5">
                    <button
                      onClick={prevAdminMonth}
                      title="Previous Month"
                      className="p-1 rounded text-neutral-600 hover:text-black hover:bg-[#FFF8EE]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={nextAdminMonth}
                      title="Next Month"
                      className="p-1 rounded text-neutral-600 hover:text-black hover:bg-[#FFF8EE]"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Admin Calendar Grid */}
              <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white shadow-xs">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-center py-2 text-xs font-bold text-neutral-700">
                  <span className="text-red-600">Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span className="text-blue-600">Sat</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 border-collapse">
                  {daysArray.map((dayNum, index) => {
                    if (dayNum === null) {
                      return (
                        <div
                          key={`empty-admin-${index}`}
                          className="min-h-[105px] p-1.5 bg-neutral-50/40 border-b border-r border-neutral-100"
                        />
                      );
                    }

                    const dateStr = formatAdminDateStr(dayNum);
                    const daily = shifts.find((s) => s.date === dateStr && s.type === 'daily');
                    const bathing = shifts.find((s) => s.date === dateStr && s.type === 'bathing');
                    const hasBathingSchedule = bathingSchedules.some((b) => b.date === dateStr && b.enabled);
                    const isToday = new Date().toISOString().slice(0, 10) === dateStr;

                    const morningUserId = getShiftMorningUserId(daily);
                    const eveningUserId = getShiftEveningUserId(daily);
                    const morningUser = morningUserId ? getUserById(morningUserId) : undefined;
                    const eveningUser = eveningUserId ? getUserById(eveningUserId) : undefined;
                    const bathingUser = getUserById(bathing?.userId);

                    return (
                      <div
                        key={`admin-day-${dayNum}`}
                        className={`min-h-[105px] p-1.5 border-b border-r border-neutral-100 flex flex-col justify-between transition-colors ${
                          isToday ? 'bg-[#FFF8EE]/60 ring-1 ring-inset ring-[#FFC067]' : 'bg-white'
                        }`}
                      >
                        {/* Day Header */}
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-bold inline-flex items-center justify-center w-5 h-5 rounded-full ${
                              isToday ? 'bg-[#FFC067] text-neutral-950 font-bold border border-[#F5B153]' : 'text-neutral-700'
                            }`}
                          >
                            {dayNum}
                          </span>

                          <div className="flex items-center gap-1">
                            {/* If daily shift has any assigned slots, show a clear all daily button */}
                            {daily && (morningUser || eveningUser) && (
                              <button
                                type="button"
                                onClick={() => adminClearShiftPart(dateStr, 'daily', 'full_day')}
                                className="text-[10px] p-0.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="ลบเวรประจำวันทั้งหมดของวันนี้ (เช้า + เย็น)"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}

                            {/* Toggle Bathing Schedule icon button */}
                            <button
                              type="button"
                              onClick={() => toggleBathingDate(dateStr)}
                              className={`text-[10px] px-1 py-0.5 rounded font-bold transition-all ${
                                hasBathingSchedule
                                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                  : 'text-neutral-400 hover:text-sky-600 hover:bg-sky-50'
                              }`}
                              title={hasBathingSchedule ? 'มีเวรอาบน้ำ (คลิกเพื่อปิด)' : 'คลิกเพื่อเพิ่มเวรอาบน้ำวันนี้'}
                            >
                              🛁
                            </button>
                          </div>
                        </div>

                        {/* Slots (Morning, Evening, Bathing) */}
                        <div className="space-y-1">
                          {/* 1. Morning Slot (☀️ เช้า) */}
                          <div className="flex items-center justify-between gap-1 text-[10px] p-1 rounded-md bg-amber-50/70 border border-amber-200 text-neutral-800">
                            <div
                              onClick={() =>
                                setActiveSlotTarget({
                                  date: dateStr,
                                  type: 'daily',
                                  part: 'morning',
                                  currentUserId: morningUser?.id,
                                })
                              }
                              className="flex items-center gap-1 truncate cursor-pointer hover:opacity-80 flex-1"
                              title="คลิกเพื่อเลือก/เปลี่ยนผู้รับเวรเช้า"
                            >
                              <Sun className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                              <span className="font-bold text-[9px] text-neutral-500 shrink-0">เช้า:</span>
                              {morningUser ? (
                                <>
                                  <span>{morningUser.icon}</span>
                                  <span className="truncate font-medium">
                                    {morningUser.username || morningUser.name}
                                  </span>
                                </>
                              ) : (
                                <span className="text-amber-700 font-medium">+ ว่าง</span>
                              )}
                            </div>

                            {morningUser && (
                              <button
                                type="button"
                                onClick={() => adminClearShiftPart(dateStr, 'daily', 'morning')}
                                className="text-neutral-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50"
                                title="ลบเฉพาะเวรเช้า"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          {/* 2. Evening Slot (🌙 เย็น) */}
                          <div className="flex items-center justify-between gap-1 text-[10px] p-1 rounded-md bg-indigo-50/70 border border-indigo-200 text-neutral-800">
                            <div
                              onClick={() =>
                                setActiveSlotTarget({
                                  date: dateStr,
                                  type: 'daily',
                                  part: 'evening',
                                  currentUserId: eveningUser?.id,
                                })
                              }
                              className="flex items-center gap-1 truncate cursor-pointer hover:opacity-80 flex-1"
                              title="คลิกเพื่อเลือก/เปลี่ยนผู้รับเวรเย็น"
                            >
                              <Moon className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                              <span className="font-bold text-[9px] text-neutral-500 shrink-0">เย็น:</span>
                              {eveningUser ? (
                                <>
                                  <span>{eveningUser.icon}</span>
                                  <span className="truncate font-medium">
                                    {eveningUser.username || eveningUser.name}
                                  </span>
                                </>
                              ) : (
                                <span className="text-indigo-600 font-medium">+ ว่าง</span>
                              )}
                            </div>

                            {eveningUser && (
                              <button
                                type="button"
                                onClick={() => adminClearShiftPart(dateStr, 'daily', 'evening')}
                                className="text-neutral-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50"
                                title="ลบเฉพาะเวรเย็น"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          {/* 3. Bathing Slot (🛁 อาบน้ำ) if enabled */}
                          {hasBathingSchedule && (
                            <div className="flex items-center justify-between gap-1 text-[10px] p-1 rounded-md bg-sky-50 border border-sky-200 text-sky-950">
                              <div
                                onClick={() =>
                                  setActiveSlotTarget({
                                    date: dateStr,
                                    type: 'bathing',
                                    part: 'bathing',
                                    currentUserId: bathingUser?.id,
                                  })
                                }
                                className="flex items-center gap-1 truncate cursor-pointer hover:opacity-80 flex-1"
                                title="คลิกเพื่อเลือก/เปลี่ยนผู้รับเวรอาบน้ำ"
                              >
                                <Bath className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                                {bathingUser ? (
                                  <>
                                    <span>{bathingUser.icon}</span>
                                    <span className="truncate font-bold">
                                      {bathingUser.username || bathingUser.name}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-sky-600 font-medium">+ ผู้รับผิดชอบ</span>
                                )}
                              </div>

                              {bathingUser && (
                                <button
                                  type="button"
                                  onClick={() => adminClearShiftPart(dateStr, 'bathing', 'bathing')}
                                  className="text-neutral-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50"
                                  title="ลบผู้รับเวรอาบน้ำ"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Popover / Modal: Quick Assign / Switch Member to Slot */}
              {activeSlotTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs animate-in fade-in duration-150">
                  <div className="relative w-full max-w-sm rounded-2xl bg-white border border-[#FFC067] shadow-2xl p-4 sm:p-5 overflow-hidden">
                    <button
                      onClick={() => setActiveSlotTarget(null)}
                      className="absolute top-3.5 right-3.5 p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">
                        {activeSlotTarget.part === 'morning'
                          ? '☀️'
                          : activeSlotTarget.part === 'evening'
                          ? '🌙'
                          : '🛁'}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900">
                          เลือกผู้รับผิดชอบเวร{' '}
                          {activeSlotTarget.part === 'morning'
                            ? 'เช้า'
                            : activeSlotTarget.part === 'evening'
                            ? 'เย็น'
                            : 'อาบน้ำ'}
                        </h4>
                        <span className="text-[11px] text-neutral-500">
                          วันที่ {activeSlotTarget.date}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-neutral-700 block mb-2">
                      คลิกเลือกสมาชิกเพื่อมอบหมาย / สลับคน:
                    </span>

                    <div className="space-y-1.5 max-h-60 overflow-y-auto mb-3">
                      {users.map((u) => {
                        const isCurrentSelected = u.id === activeSlotTarget.currentUserId;

                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              adminAssignShift(
                                u.id,
                                activeSlotTarget.date,
                                activeSlotTarget.type,
                                activeSlotTarget.part === 'bathing' ? 'full_day' : activeSlotTarget.part
                              );
                              setActiveSlotTarget(null);
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                              isCurrentSelected
                                ? 'bg-[#FFC067] text-neutral-950 border-[#F5B153] font-bold shadow-xs'
                                : 'bg-neutral-50 hover:bg-[#FFF8EE] text-neutral-800 border-neutral-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">{u.icon || '🐶'}</span>
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: u.color }}
                              />
                              <span>{u.username || u.name}</span>
                            </div>

                            {isCurrentSelected && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/60 text-neutral-950 font-bold">
                                ผู้รับผิดชอบปัจจุบัน
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Clear Slot Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            adminClearShiftPart(
                              activeSlotTarget.date,
                              activeSlotTarget.type,
                              activeSlotTarget.part
                            );
                            setActiveSlotTarget(null);
                          }}
                          className="flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200 font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบเฉพาะเวรนี้ (+ ว่าง)</span>
                        </button>

                        {activeSlotTarget.type === 'daily' && (
                          <button
                            type="button"
                            onClick={() => {
                              adminClearShiftPart(
                                activeSlotTarget.date,
                                'daily',
                                'full_day'
                              );
                              setActiveSlotTarget(null);
                            }}
                            className="flex items-center gap-1 text-xs text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-300 font-bold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ลบทั้งวัน (เช้า+เย็น)</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveSlotTarget(null)}
                        className="px-3 py-1.5 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                      >
                        ปิด
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Custom Monthly Unlock Schedule */}
          {activeTab === 'monthly_unlock' && (
            <div className="space-y-4">
              <form
                onSubmit={handleSaveMonthSchedule}
                className="p-4 rounded-xl bg-[#FFF8EE]/60 border border-[#FFC067]/70 shadow-xs space-y-3"
              >
                <div className="flex items-center gap-2 font-bold text-neutral-900 text-xs">
                  <Clock className="w-4 h-4 text-neutral-950" />
                  <span>กำหนดวันและเวลาเปิดให้จองเวรล่วงหน้าในแต่ละเดือน</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1 font-medium">
                      เลือกเดือนที่ต้องการเปิดจอง *
                    </label>
                    <input
                      type="month"
                      required
                      value={scheduleTargetMonth}
                      onChange={(e) => setScheduleTargetMonth(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-neutral-200 text-xs font-semibold focus:outline-hidden focus:border-[#FFC067]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1 font-medium">
                      วันที่เปิดให้เริ่มจอง *
                    </label>
                    <input
                      type="date"
                      required
                      value={scheduleOpenDate}
                      onChange={(e) => setScheduleOpenDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-neutral-200 text-xs font-semibold focus:outline-hidden focus:border-[#FFC067]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1 font-medium">
                      เวลาเปิดให้เริ่มจอง (HH:mm) *
                    </label>
                    <input
                      type="time"
                      required
                      value={scheduleOpenTime}
                      onChange={(e) => setScheduleOpenTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-neutral-200 text-xs font-semibold focus:outline-hidden focus:border-[#FFC067]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <input
                    type="text"
                    placeholder="บันทึกข้อความหรือเหตุผล (เช่น ทุกคนว่างพร้อมกันตอนเที่ยง)..."
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-xs w-2/3 focus:outline-hidden focus:border-[#FFC067]"
                  />

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 active:bg-[#FFC067] text-neutral-950 font-bold shadow-xs border border-[#FFC067]/70 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-neutral-950" />
                    <span>บันทึกเวลาเปิดจอง</span>
                  </button>
                </div>

                {scheduleSuccess && (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-medium animate-in fade-in">
                    {scheduleSuccess}
                  </div>
                )}
              </form>

              {/* Monthly unlock schedules list */}
              <div>
                <span className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider block mb-2">
                  รายการกำหนดการเปิดจองรายเดือน:
                </span>

                <div className="space-y-2">
                  {Object.values(bookingSettings.monthSchedules || {}).length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-neutral-200 text-neutral-400 text-center">
                      ยังไม่มีการกำหนดเวลาเปิดจองเฉพาะเดือน (ใช้ค่าเริ่มต้น: วันที่ {bookingSettings.bookingOpenDay} ของเดือนก่อนหน้า)
                    </div>
                  ) : (
                    Object.values(bookingSettings.monthSchedules || {}).map((item) => {
                      const unlockDateTime = new Date(`${item.openDate}T${item.openTime || '00:00'}:00`).getTime();
                      const isUnlockedNow = Date.now() >= unlockDateTime;

                      return (
                        <div
                          key={item.monthKey}
                          className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#FFC067]/70 shadow-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#FFF8EE] text-neutral-950 flex items-center justify-center font-bold text-xs shadow-xs border border-[#FFC067]/70">
                              {item.monthKey}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-neutral-900">
                                  จองเวรเดือน: {item.monthKey}
                                </span>
                                {isUnlockedNow ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                    ✓ เปิดให้จองแล้ว
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FFF8EE] text-neutral-950 font-semibold border border-[#FFC067]">
                                    🔒 ล็อค (ยังไม่ถึงเวลา)
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-neutral-500">
                                กำหนดเปิด: <strong>{item.openDate}</strong> เวลา <strong>{item.openTime} น.</strong>
                                {item.notes ? ` (${item.notes})` : ''}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => deleteMonthUnlockSchedule(item.monthKey)}
                            className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"
                            title="ลบกำหนดการนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Bathing Manager */}
          {activeTab === 'bathing' && (
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider block mb-2">
                  รายการวันที่เปิดให้จองเวรอาบน้ำ ({bathingSchedules.filter((b) => b.enabled).length} วัน):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {bathingSchedules
                    .filter((b) => b.enabled)
                    .map((item) => {
                      const currentBathDuty = shifts.find((s) => s.date === item.date && s.type === 'bathing');
                      const bathUser = getUserById(currentBathDuty?.userId);

                      return (
                        <div
                          key={item.date}
                          className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#FFC067]/70 shadow-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">🛁</span>
                            <div>
                              <span className="font-bold text-neutral-900 block">
                                {item.date}
                              </span>
                              <span className="text-[10px] text-neutral-500">
                                {bathUser ? `ผู้รับผิดชอบ: ${bathUser.icon} ${bathUser.username}` : 'ยังไม่มีผู้จอง'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {currentBathDuty && (
                              <button
                                onClick={() => adminClearShiftPart(item.date, 'bathing', 'bathing')}
                                className="px-2 py-1 text-[10px] text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-bold border border-red-200"
                                title="ปลดผู้จองเวรนี้"
                              >
                                ปลดเวร
                              </button>
                            )}

                            <button
                              onClick={() => toggleBathingDate(item.date, false)}
                              className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"
                              title="ลบวันอาบน้ำนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Members Manager */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <form
                onSubmit={handleAddMember}
                className="p-4 rounded-xl bg-[#FFF8EE]/60 border border-[#FFC067]/70 space-y-3"
              >
                <span className="text-xs font-bold text-neutral-900 block">
                  เพิ่มหรือสร้างบัญชีสมาชิกใหม่
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1 font-medium">
                      ชื่อผู้ใช้ (Username) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="กรอกชื่อผู้ใช้ / อีเมล..."
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-neutral-200 text-xs focus:outline-hidden focus:border-[#FFC067]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1 font-medium">
                      รหัสผ่าน (Password)
                    </label>
                    <input
                      type="password"
                      placeholder="กรอกรหัสผ่าน..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-neutral-200 text-xs focus:outline-hidden focus:border-[#FFC067]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-600 mb-1 font-medium">
                    เลือกสี (Color)
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {AVAILABLE_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setNewMemberColor(col)}
                        className={`w-5 h-5 rounded-full border-2 transition-transform ${
                          newMemberColor === col ? 'scale-125 border-neutral-900 ring-2 ring-[#FFC067]' : 'border-white'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-600 mb-1 font-medium">
                    เลือกไอคอน (Icon)
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {AVAILABLE_ICONS.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setNewMemberIcon(ic)}
                        className={`w-7 h-7 rounded-lg border text-sm flex items-center justify-center transition-all cursor-pointer ${
                          newMemberIcon === ic ? 'bg-[#FFF8EE] text-neutral-950 border-[#FFC067] shadow-xs font-bold' : 'bg-white border-neutral-200'
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 active:bg-[#FFC067] text-neutral-950 font-bold shadow-xs border border-[#FFC067]/70 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>บันทึกสมาชิกใหม่</span>
                  </button>
                </div>
              </form>

              {/* Members List */}
              <div>
                <span className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider block mb-2">
                  รายชื่อบัญชีผู้ใช้ในระบบ ({users.length} บัญชี):
                </span>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {users.length === 0 ? (
                    <div className="p-6 text-center bg-white rounded-xl border border-neutral-200 text-neutral-400">
                      <p className="text-xs font-semibold text-neutral-600">ยังไม่มีบัญชีผู้ใช้ในระบบ</p>
                      <p className="text-[11px] text-neutral-400 mt-1">สามารถสร้างบัญชีผ่านฟอร์มด้านบน หรือเข้าสู่ระบบด้วย LINE</p>
                    </div>
                  ) : (
                    users.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#FFC067]/70 shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{u.icon || '🐶'}</span>
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: u.color }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900">
                                {u.username || u.name}
                              </span>
                              {u.nickname && u.nickname !== u.name && (
                                <span className="text-xs text-neutral-500 font-normal">
                                  ({u.nickname})
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#FFF8EE] text-neutral-950 font-bold border border-[#FFC067]/60">
                                {u.role === 'admin' ? 'Admin' : 'Member'}
                              </span>
                            </div>
                            {u.password && (
                              <span className="text-[10px] text-neutral-400 font-mono">
                                Pass: {u.password}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`ยืนยันการลบบัญชีผู้ใช้ "${u.username || u.name}"? ระบบจะลบเวรที่ผูกไว้ทั้งหมดด้วย`)) {
                                deleteUser(u.id);
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-red-600 hover:bg-red-50 text-[11px] font-bold transition-colors border border-red-200 cursor-pointer"
                            title="ลบบัญชีผู้ใช้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ลบบัญชี</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Fair Auto Distribute */}
          {activeTab === 'fair_auto' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#FFF8EE] border border-[#FFC067] text-neutral-900">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Auto Fair Share Engine</span>
                </div>
                <p className="text-[11px] text-neutral-700 leading-relaxed font-medium">
                  ระบบจะคำนวณจำนวนวันในเดือนนั้นๆ แล้วแบ่งเวรทั้งวัน (เช้า+เย็น) ให้สมาชิกทุกคน ({users.length} คน) เท่ากันแบบเป๊ะๆ
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#FFC067]/70 shadow-xs space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1 font-medium">
                      เลือกเดือน
                    </label>
                    <select
                      value={autoMonth}
                      onChange={(e) => setAutoMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs focus:outline-hidden focus:border-[#FFC067]"
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i} value={i}>
                          Month {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1 font-medium">
                      เลือกปี
                    </label>
                    <input
                      type="number"
                      value={autoYear}
                      onChange={(e) => setAutoYear(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs focus:outline-hidden focus:border-[#FFC067]"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunAutoDistribute}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 active:bg-[#FFC067] text-neutral-950 font-bold shadow-xs transition-all border border-[#FFC067]/70 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-neutral-950" />
                  <span>กดรันหารเวรทั้งเดือนอัตโนมัติ</span>
                </button>

                {autoSuccessMessage && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-medium animate-in fade-in">
                    {autoSuccessMessage}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: Line Guide & Webhook Settings */}
          {activeTab === 'line_guide' && (
            <div className="space-y-4">
              <div className="flex flex-wrap border-b border-neutral-200 bg-neutral-50 px-2 pt-1 gap-2 text-xs">
                <button
                  onClick={() => setLineGuideSubTab('callback')}
                  className={`py-2 px-3 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                    lineGuideSubTab === 'callback'
                      ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 border-transparent'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>Callback URL (Vercel & Login)</span>
                </button>
                <button
                  onClick={() => setLineGuideSubTab('webhook')}
                  className={`py-2 px-3 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                    lineGuideSubTab === 'webhook'
                      ? 'bg-white text-neutral-950 border-emerald-500 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 border-transparent'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Webhook & ตั้งค่า Bot</span>
                </button>
                <button
                  onClick={() => setLineGuideSubTab('guide')}
                  className={`py-2 px-3 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                    lineGuideSubTab === 'guide'
                      ? 'bg-white text-neutral-950 border-[#06C755] shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 border-transparent'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>วิธีสร้าง Bot LINE OA</span>
                </button>
                <button
                  onClick={() => setLineGuideSubTab('friend')}
                  className={`py-2 px-3 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                    lineGuideSubTab === 'friend'
                      ? 'bg-white text-neutral-950 border-[#06C755] shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 border-transparent'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#06C755]" />
                  <span>บอท & QR Code เพิ่มเพื่อน</span>
                </button>
                <button
                  onClick={() => setLineGuideSubTab('test')}
                  className={`py-2 px-3 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                    lineGuideSubTab === 'test'
                      ? 'bg-white text-neutral-950 border-[#06C755] shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 border-transparent'
                  }`}
                >
                  <Send className="w-3.5 h-3.5 text-blue-600" />
                  <span>ทดสอบแจ้งเตือน (Test Push)</span>
                </button>
              </div>

              {lineGuideSubTab === 'callback' && (() => {
                const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
                const effectiveBase = publicSiteUrl.trim() || currentOrigin;
                const activeCallbackUrl = `${effectiveBase.replace(/\/$/, '')}/api/auth/line/callback`;

                return (
                  <div className="space-y-4 pt-2">
                    {/* Notice & Highlights */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-700 text-white space-y-1 shadow-md">
                      <div className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-200" />
                        <h4 className="font-bold text-sm">LINE Login Callback URL สำหรับเว็บจริง (Vercel)</h4>
                      </div>
                      <p className="text-[11px] text-blue-100 leading-relaxed">
                        ระบบคำนวณ Callback URL ให้โดยอัตโนมัติตามโดเมนของ Vercel เพื่อให้เมื่อเพื่อนหรือคนอื่นกดล็อกอินผ่าน LINE จะเด้งกลับมาที่เว็บจริงของคุณบน Vercel ทันที ไม่เด้งไปหน้า developer site
                      </p>
                    </div>

                    {/* Active Callback URL Box */}
                    <div className="p-4 rounded-xl bg-blue-50/70 border-2 border-blue-400 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 bg-blue-600 text-white font-black text-[10px] rounded-md tracking-wide">
                          Callback URL ที่ต้องใส่ใน LINE Developers Console
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(activeCallbackUrl)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอก Callback URL</span>
                        </button>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-blue-200 space-y-1">
                        <p className="text-[10px] text-neutral-500 font-semibold">
                          นำ URL ด้านล่างนี้ไปใส่ในช่อง **Callback URL** ใน LINE Developers Console:
                        </p>
                        <p className="font-mono text-xs text-blue-950 font-bold select-all break-all bg-blue-50/80 p-2.5 rounded-md border border-blue-200">
                          {activeCallbackUrl}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-blue-900 font-medium bg-white/90 p-2.5 rounded-lg border border-blue-200">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>รองรับการเข้าสู่ระบบแบบอัตโนมัติ 100% ไม่ติดสิทธิ์ Developer Site</span>
                      </div>
                    </div>

                    {/* CRITICAL WARNING / SOLUTION FOR ERROR 400: DEVELOPER CHANNEL */}
                    <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-400 space-y-2.5 text-amber-950 shadow-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <h4 className="font-bold text-xs text-amber-900">
                          วิธีแก้ Error 400: "Developer channel ไม่สามารถเข้าสู่ระบบได้" เมื่อให้เพื่อนล็อกอิน
                        </h4>
                      </div>
                      <div className="text-[11px] space-y-1.5 text-amber-800 leading-relaxed bg-white/80 p-3 rounded-lg border border-amber-200">
                        <p>
                          <strong>สาเหตุ:</strong> ช่อง LINE Login Channel บน LINE Developers Console ยังอยู่ในสถานะ <strong>"Developing" (กำลังพัฒนา)</strong> ทำให้มีเพียงเจ้าของ Channel เท่านั้นที่ล็อกอินได้ ส่วนเพื่อนหรือบุคคลอื่นจะติด Error 400 ทันที
                        </p>
                        <p className="pt-1">
                          <strong>วิธีปลดล็อกให้เพื่อนล็อกอินได้ (ทำง่ายๆ 1 คลิก):</strong>
                        </p>
                        <ol className="list-decimal pl-5 space-y-1 text-neutral-800 font-medium">
                          <li>เปิดหน้า <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold">LINE Developers Console</a> แล้วคลิกเลือก Channel LINE Login ของคุณ</li>
                          <li>มองที่แถบด้านบนสุด ถัดจากชื่อ Channel จะมีปุ่มสถานะสีเทา/เหลืองเขียนว่า <strong>"Developing"</strong></li>
                          <li>คลิกที่ปุ่มนั้นแล้วกดเปลี่ยนเป็น <strong>"Published" (เผยแพร่)</strong></li>
                          <li>เสร็จสิ้น! เมื่อสถานะเปลี่ยนเป็น <strong>Published</strong> เพื่อนทุกคนจะสามารถกดล็อกอินผ่าน LINE ได้ทันที ไม่ติดข้อความ error 400 อีกต่อไปครับ 🎉</li>
                        </ol>
                      </div>
                    </div>

                    {/* HOW TO LINK OA FOR AUTOMATIC ADD FRIEND ON LOGIN */}
                    <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-400 space-y-2.5 text-emerald-950 shadow-xs">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-[#06C755] shrink-0" />
                        <h4 className="font-bold text-xs text-emerald-950">
                          วิธีตั้งค่าให้ LINE Login เด้งหน้า "เพิ่มเพื่อน LINE OA" ทันทีที่เพื่อนกด Login
                        </h4>
                      </div>
                      <div className="text-[11px] space-y-1.5 text-emerald-900 leading-relaxed bg-white/90 p-3 rounded-lg border border-emerald-200">
                        <p>
                          ระบบได้กำหนดพารามิเตอร์ <strong>bot_prompt=aggressive</strong> ไว้ในโค้ดแล้ว เพื่อให้แอป LINE เด้งหน้าจอเพิ่มเพื่อนทันทีเมื่อผู้ใช้ล็อกอิน
                        </p>
                        <p className="pt-1">
                          <strong>เพื่อให้ฟังก์ชันนี้ทำงานบน LINE ต้องผูก LINE Login เข้ากับ Official Account ในคอนโซล:</strong>
                        </p>
                        <ol className="list-decimal pl-5 space-y-1 text-neutral-800 font-medium">
                          <li>เปิดหน้า <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-bold">LINE Developers Console</a> แล้วเลือก Channel <strong>LINE Login</strong> ของคุณ</li>
                          <li>เลือกแท็บ <strong>"LINE Official Account"</strong> (หรือดูที่หัวข้อ Linked OA)</li>
                          <li>กดปุ่ม <strong>"Link"</strong> แล้วเลือกบัญชีบอท <strong>BojoiDuty (@090puwgd)</strong> แล้วกดบันทึก</li>
                          <li>เสร็จสิ้น! เมื่อเพื่อนกดปุ่ม <strong>Login LINE</strong> ระบบ LINE จะเปิดหน้าจอให้กด <strong>"เพิ่มเพื่อน" (Add Friend)</strong> โดยอัตโนมัติทันทีครับ 🎉</li>
                        </ol>
                      </div>
                    </div>

                    {/* Custom Public URL Config (Optional override) */}
                    <div className="p-4 rounded-xl bg-white border border-neutral-200 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-xs text-neutral-800 flex items-center gap-1.5">
                          <Settings className="w-3.5 h-3.5 text-neutral-500" />
                          <span>ระบุ Vercel Public Site URL แบบเจาะจง (ถ้าต้องการ)</span>
                        </h5>
                        {saveUrlSuccess && (
                          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>บันทึกสำเร็จ</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        หากท่านต้องการล็อก URL ปลายทางให้เป็นโดเมน Vercel ของท่านอย่างแน่นอนเสมอ (เช่น <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-700">https://pawsduty.vercel.app</code>) สามารถกรอกที่นี่ได้เลย:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://your-app.vercel.app"
                          value={publicSiteUrl}
                          onChange={(e) => setPublicSiteUrl(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-300 focus:bg-white focus:border-blue-500 focus:outline-hidden font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleSavePublicSiteUrl}
                          disabled={isSavingPublicUrl}
                          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isSavingPublicUrl ? 'กำลังบันทึก...' : 'บันทึก URL'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {lineGuideSubTab === 'webhook' && (
                <div className="space-y-4 pt-2">
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 text-white space-y-1 shadow-md">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-emerald-200" />
                      <h4 className="font-bold text-sm">LINE Webhook Sync & Status (100% Online 24/7)</h4>
                    </div>
                    <p className="text-[11px] text-emerald-100 leading-relaxed">
                      ระบบ Express Backend ทำการซิงก์ Webhook URL ตรงไปยัง LINE Developers Console โดยอัตโนมัติผ่าน Direct Tunnel (พร้อมรับสถานะ 200 OK โดยไม่ติด 302 Redirect)
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-emerald-600 text-white font-black text-[10px] rounded-md">
                        Webhook URL ปัจจุบันที่พร้อมใช้งาน (แนะนำที่สุด ⭐)
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeWebhookUrl)}
                        className="px-3 py-1.5 rounded-lg bg-[#06C755] hover:bg-[#00B900] active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอก Webhook URL</span>
                      </button>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-emerald-300 space-y-1">
                      <p className="text-[10px] text-neutral-500 font-semibold">นำ URL นี้ไปใส่ในช่อง **Webhook URL** ใน LINE Developers Console:</p>
                      <p className="font-mono text-xs text-emerald-950 font-bold select-all break-all bg-emerald-50/90 p-2.5 rounded-md border border-emerald-300">
                        {activeWebhookUrl}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-emerald-900 font-medium bg-white/80 p-2 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>เมื่อกดปุ่ม <strong>Verify</strong> ใน LINE Developers Console จะขึ้น <strong>Success (HTTP status 200)</strong> ทันที!</span>
                    </div>
                  </div>
                </div>
              )}

              {lineGuideSubTab === 'guide' && (
                <div className="space-y-4 pt-2 text-neutral-800">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                    <h4 className="font-bold flex items-center gap-1.5 text-xs">
                      <HelpCircle className="w-4 h-4 text-amber-600" />
                      <span>ขั้นตอนการสร้าง บอท และนำ Tokens มาใส่ในระบบ</span>
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      ทำตามขั้นตอนง่ายๆ บน LINE Developers Console:
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-neutral-900 text-xs">
                        <span className="w-5 h-5 rounded-full bg-[#06C755] text-white flex items-center justify-center text-[11px]">1</span>
                        <span>ไปที่ LINE Developers Console</span>
                        <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="ml-auto text-[#06C755] hover:underline flex items-center gap-1 text-[11px]">
                          <span>เปิดเว็บ LINE Developers</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-neutral-900 text-xs">
                        <span className="w-5 h-5 rounded-full bg-[#06C755] text-white flex items-center justify-center text-[11px]">2</span>
                        <span>สร้าง LINE Login & Messaging API Channels</span>
                      </div>
                      <p className="text-[11px] text-neutral-600 pl-7 leading-relaxed">
                        ตั้งค่า Channel Access Token (long-lived) และเปิดใช้งาน Webhook ให้เรียบร้อย
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {lineGuideSubTab === 'friend' && (
                <div className="space-y-4 pt-2">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 space-y-1">
                    <h4 className="font-bold flex items-center gap-1.5 text-xs">
                      <MessageSquare className="w-4 h-4 text-[#06C755]" />
                      <span>ข้อมูล LINE Official Account สำหรับเพื่อนแอดรับแจ้งเตือน</span>
                    </h4>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      เพื่อให้ระบบสามารถส่งข้อความแจ้งเตือนเวรเข้าสู่แอป LINE ของเพื่อนแต่ละคนได้ เพื่อนต้องทำการเพิ่มเพื่อนกับบอท LINE OA ด้านล่างนี้ก่อน
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm flex flex-col items-center text-center space-y-4">
                    <div className="bg-white p-3 rounded-2xl border-2 border-[#06C755] shadow-md">
                      <img
                        src={LINE_OA_INFO.qrCodeUrl}
                        alt={`QR Code ${LINE_OA_INFO.displayName}`}
                        className="w-48 h-48 object-contain"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                        <span>บอท: {LINE_OA_INFO.displayName}</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <span className="font-mono text-sm font-black text-neutral-900 bg-neutral-100 px-3 py-1 rounded-xl border border-neutral-300">
                          {LINE_OA_INFO.basicId}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(LINE_OA_INFO.basicId)}
                          className="px-3 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอก ID</span>
                        </button>
                      </div>
                    </div>

                    <a
                      href={LINE_OA_INFO.addFriendUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full max-w-sm py-3 px-5 rounded-2xl bg-[#06C755] hover:bg-[#00B900] active:scale-98 text-white font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-600"
                    >
                      <MessageSquare className="w-4 h-4 fill-white" />
                      <span>เปิดหน้าเพิ่มเพื่อน LINE OA (คลิกเพื่อแอด)</span>
                      <ExternalLink className="w-4 h-4 text-emerald-100" />
                    </a>
                  </div>
                </div>
              )}

              {lineGuideSubTab === 'test' && (
                <div className="space-y-4 pt-2">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1">
                    <h4 className="font-bold flex items-center gap-1.5 text-xs">
                      <Send className="w-4 h-4 text-blue-600" />
                      <span>ทดสอบส่งการแจ้งเตือนเข้าแอป LINE</span>
                    </h4>
                    <p className="text-[11px] text-blue-800">
                      กรอก LINE User ID (เริ่มต้นด้วยตัว U...) เพื่อทดสอบการส่ง Push Notification
                    </p>
                  </div>

                  {testResult && (
                    <div
                      className={`p-3 rounded-xl font-bold flex items-center gap-2 ${
                        testResult.success
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <span>{testResult.msg}</span>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">
                        LINE User ID ของผู้รับ (เช่น U123456789abcdef...)
                      </label>
                      <input
                        type="text"
                        placeholder="วาง LINE User ID ที่นี่..."
                        value={testLineUserId}
                        onChange={(e) => setTestLineUserId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-mono focus:bg-white focus:border-[#06C755] focus:outline-hidden"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleTestPush}
                      disabled={isTesting}
                      className="w-full py-2.5 rounded-xl bg-[#06C755] hover:bg-[#00B900] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {isTesting ? <Bot className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>{isTesting ? 'กำลังส่งข้อความทดสอบ...' : 'ส่งข้อความทดสอบเข้า LINE'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-[#FFC067]/40 bg-[#FFF8EE]/40 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={async () => {
                if (confirm('⚠️ ยืนยันการล้างข้อมูลบัญชีผู้ใช้และตารางเวรทั้งหมดหรือไม่? (ข้อมูลบัญชีผู้ใช้, เวรทั้งหมด, คำขอแลกเวร, และประวัติกิจกรรม จะถูกล้างถาวร)')) {
                  const ok = await wipeAllData();
                  if (ok) {
                    alert('ล้างข้อมูลบัญชีผู้ใช้และตารางเวรทั้งหมดเรียบร้อยแล้ว!');
                    onClose();
                  }
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>ล้างข้อมูลบัญชีและตารางเวรทั้งหมด</span>
            </button>

            <button
              onClick={() => {
                if (confirm('ต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้นหรือไม่?')) {
                  resetToDefaultData();
                  onClose();
                }
              }}
              className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Demo Data</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 text-neutral-950 text-xs font-bold border border-[#FFC067]/70 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
