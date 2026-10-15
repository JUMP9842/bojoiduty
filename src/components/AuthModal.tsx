import React, { useState, useEffect } from 'react';
import { useDuty } from '../context/DutyContext';
import { X, LogIn, UserPlus, Lock, User as UserIcon, Palette, MessageSquare, CheckCircle, Sparkles, ExternalLink } from 'lucide-react';
import { AVAILABLE_COLORS, AVAILABLE_ICONS } from '../data/initialData';
import { triggerLineLogin } from '../utils/lineAuthUtils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register' | 'edit_profile';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
}) => {
  const { login, register, currentUser, updateUser, users, openLineFriendModal } = useDuty();
  const [mode, setMode] = useState<'login' | 'register' | 'edit_profile'>(defaultMode);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVAILABLE_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(AVAILABLE_ICONS[0]);
  const [lineUserIdInput, setLineUserIdInput] = useState('');
  const [lineNotifEnabled, setLineNotifEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync profile data when editing
  useEffect(() => {
    if (currentUser && mode === 'edit_profile') {
      setUsername(currentUser.username || currentUser.name);
      setPassword(currentUser.password || '');
      setConfirmPassword(currentUser.password || '');
      setSelectedColor(currentUser.color || AVAILABLE_COLORS[0]);
      setSelectedIcon(currentUser.icon || AVAILABLE_ICONS[0]);
      setLineUserIdInput(currentUser.lineUserId || '');
      setLineNotifEnabled(currentUser.lineNotificationEnabled ?? true);
    }
  }, [currentUser, mode]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!username.trim() || !password.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    if (mode === 'register') {
      if (password.trim() !== confirmPassword.trim()) {
        setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }
    }

    if (mode === 'login') {
      const res = login(username.trim(), password.trim());
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } else if (mode === 'register') {
      const res = register(username.trim(), password.trim(), selectedColor, selectedIcon);
      if (res.success) {
        setSuccessMsg('สมัครสมาชิกสำเร็จ! เข้าสู่ระบบเรียบร้อยแล้ว');
        setTimeout(() => {
          onClose();
          openLineFriendModal();
        }, 800);
      } else {
        setError(res.error || 'ไม่สามารถลงทะเบียนได้');
      }
    } else if (mode === 'edit_profile') {
      if (!currentUser) return;
      updateUser({
        ...currentUser,
        username: username.trim(),
        name: username.trim(),
        nickname: currentUser.nickname || username.trim(),
        password: password.trim(),
        color: selectedColor,
        bgLight: `${selectedColor}15`,
        borderLight: `${selectedColor}40`,
        icon: selectedIcon,
        lineUserId: lineUserIdInput.trim() || undefined,
        lineNotificationEnabled: lineNotifEnabled,
      });
      setSuccessMsg('บันทึกข้อมูลโปรไฟล์และการตั้งค่า LINE เรียบร้อยแล้ว!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1000);
    }
  };

  const handleQuickSelectStaff = (u: typeof users[0]) => {
    setUsername(u.username || u.name);
    setPassword(u.password || '');
    setError(null);
    // Auto submit login for instant convenience
    const res = login(u.username || u.name, u.password || '');
    if (res.success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-white border-2 border-[#FFC067]/60 shadow-2xl p-4 sm:p-5 overflow-hidden">
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#FFC067] via-[#06C755] to-[#FFC067]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge */}
        <div className="flex flex-col gap-2 mb-3 pr-6 pt-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FFC067] text-neutral-950 flex items-center justify-center font-bold shadow-xs">
              🐶
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-neutral-900">
                {mode === 'login'
                  ? 'เข้าสู่ระบบ BojoiDuty'
                  : mode === 'register'
                  ? 'สมัครสมาชิกผู้ใช้ใหม่'
                  : 'ตั้งค่าโปรไฟล์ & LINE'}
              </h3>
              <p className="text-[11px] text-neutral-500">
                ระบบเวรดูแลน้องหมา & แจ้งเตือน LINE OA
              </p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex rounded-xl bg-neutral-100 p-1 text-xs border border-neutral-200">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-[#FFC067]" />
              <span>เข้าสู่ระบบ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-[#06C755]" />
              <span>สมัครสมาชิก</span>
            </button>

            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  setMode('edit_profile');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === 'edit_profile'
                    ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200'
                    : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-purple-600" />
                <span>การตั้งค่า</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Staff Account Switcher */}
        {mode === 'login' && users.length > 0 && (
          <div className="mb-3 p-2.5 rounded-xl bg-amber-50/80 border border-[#FFC067]/50 text-xs">
            <div className="text-[11px] font-bold text-amber-900 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FFC067]" />
              <span>เข้าสู่ระบบด้วยบัญชีเจ้าหน้าที่ทันที (1-Click Login):</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickSelectStaff(u)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#FFC067]/40 hover:border-[#06C755] hover:bg-emerald-50 text-[11px] font-bold text-neutral-800 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <span>{u.icon || '🐶'}</span>
                  <span>{u.nickname || u.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Primary Direct LINE OAuth Login Button */}
        {mode === 'login' && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() =>
                triggerLineLogin(() =>
                  setError('หาก Login ผ่าน LINE ไม่สำเร็จ สามารถเลือกบัญชีเจ้าหน้าที่ด้านบนเพื่อเข้าสู่ระบบได้ทันที')
                )
              }
              className="w-full py-2.5 px-3 rounded-xl bg-[#06C755] hover:bg-[#00B900] active:scale-98 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-600"
            >
              <MessageSquare className="w-4 h-4 fill-white shrink-0" />
              <span>Login ด้วยบัญชี LINE</span>
              <ExternalLink className="w-3.5 h-3.5 text-white/80 ml-auto" />
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold animate-in fade-in">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-neutral-700 mb-1">
              {mode === 'register' ? 'ชื่อผู้ใช้ / อีเมล *' : 'ชื่อผู้ใช้ (Username) *'}
            </label>
            <div className="relative">
              <UserIcon className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                required
                placeholder={mode === 'register' ? 'เช่น som346ff@gmail.com หรือ Preme' : 'กรอกชื่อผู้ใช้...'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-[#FFC067] focus:outline-hidden font-semibold text-neutral-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-700 mb-1">
              {mode === 'register' ? 'สร้างรหัสผ่าน *' : 'รหัสผ่าน (Password) *'}
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              <input
                type="password"
                required
                placeholder="กรอกรหัสผ่าน..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-[#FFC067] focus:outline-hidden font-semibold text-neutral-900"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                ยืนยันรหัสผ่าน (Confirm Password) *
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="กรอกยืนยันรหัสผ่านอีกครั้ง..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-[#FFC067] focus:outline-hidden font-semibold text-neutral-900"
                />
              </div>
            </div>
          )}

          {/* Color & Icon Picker for Register & Edit Profile */}
          {(mode === 'register' || mode === 'edit_profile') && (
            <div className="space-y-2.5 pt-2 border-t border-neutral-100">
              {/* Color */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                  เลือกสีประจำตัว
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {AVAILABLE_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setSelectedColor(col)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                        selectedColor === col ? 'scale-125 border-neutral-900 ring-2 ring-[#FFC067]' : 'border-white'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                  เลือกไอคอนประจำตัว (Icon)
                </label>
                <div className="flex items-center gap-1 flex-wrap">
                  {AVAILABLE_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setSelectedIcon(ic)}
                      className={`w-7 h-7 rounded-lg border text-sm flex items-center justify-center transition-all cursor-pointer ${
                        selectedIcon === ic ? 'bg-amber-50 text-neutral-950 border-[#FFC067] shadow-xs font-bold' : 'bg-white border-neutral-200'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* LINE User ID & Notification Settings under Edit Profile */}
          {mode === 'edit_profile' && (
            <div className="space-y-2.5 pt-3 border-t border-neutral-100 bg-emerald-50/40 p-3 rounded-xl border border-emerald-200/60">
              <label className="block text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#06C755]" />
                <span>การตั้งค่า LINE (LINE User ID & Notifications)</span>
              </label>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                  LINE User ID (สำหรับรับแจ้งเตือนเวรส่วนตัว)
                </label>
                <input
                  type="text"
                  placeholder="วาง LINE User ID (เช่น U12345...)"
                  value={lineUserIdInput}
                  onChange={(e) => setLineUserIdInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-xl bg-white border border-neutral-200 focus:border-[#06C755] focus:outline-hidden text-neutral-900"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lineNotifEnabled}
                  onChange={(e) => setLineNotifEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[#06C755] focus:ring-[#06C755]"
                />
                <span className="text-xs font-semibold text-neutral-700">เปิดใช้งานรับการแจ้งเตือนเวรผ่าน LINE</span>
              </label>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-neutral-400">
              🟢 BojoiDuty System
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 cursor-pointer font-semibold"
              >
                ปิด
              </button>

              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#FFC067] hover:bg-[#ffb347] active:scale-95 text-neutral-950 text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5 border border-amber-400 cursor-pointer"
              >
                {mode === 'login' ? (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>เข้าสู่ระบบ</span>
                  </>
                ) : mode === 'register' ? (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>สมัครสมาชิก</span>
                  </>
                ) : (
                  <>
                    <Palette className="w-3.5 h-3.5" />
                    <span>บันทึกการตั้งค่า</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
