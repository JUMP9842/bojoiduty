import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export const DEVICE_CODE = '121314';
export const STORAGE_KEY = 'bojoi_device_verified_121314';

export const DeviceVerificationModal: React.FC = () => {
  const [isVerified, setIsVerified] = useState<boolean>(true); // default true until checked
  const [inputCode, setInputCode] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    const verified = localStorage.getItem(STORAGE_KEY);
    if (verified === 'true') {
      setIsVerified(true);
    } else {
      setIsVerified(false);
    }
  }, []);

  if (isVerified) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanInput = inputCode.trim();

    if (cleanInput === DEVICE_CODE) {
      setSuccess(true);
      localStorage.setItem(STORAGE_KEY, 'true');
      setTimeout(() => {
        setIsVerified(true);
      }, 600);
    } else {
      setErrorMsg('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-white border border-slate-100 shadow-2xl p-7 overflow-hidden">
        {/* Top Decorative Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shadow-sm">
            {success ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-600 animate-bounce" />
            ) : (
              <Lock className="w-7 h-7 text-amber-600" />
            )}
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              ยืนยันรหัสเข้าใช้งาน
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[260px] mx-auto">
              โปรดกรอกรหัสผ่านเพื่อเข้าใช้งานระบบ
            </p>
          </div>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>ยืนยันสำเร็จ กำลังเข้าสู่ระบบ...</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              รหัสผ่าน (Passcode)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                maxLength={20}
                placeholder="กรอกรหัสผ่าน..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none font-medium tracking-wide text-slate-900 transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={success}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <span>เข้าสู่ระบบ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
