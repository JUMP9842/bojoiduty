import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

export const DEVICE_CODE = '121314';
export const STORAGE_KEY = 'bojoi_device_verified_121314';

export const DeviceVerificationModal: React.FC = () => {
  const [isVerified, setIsVerified] = useState<boolean>(true); // default true until checked
  const [inputCode, setInputCode] = useState<string>('');
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
      }, 700);
    } else {
      setErrorMsg('รหัสยืนยันอุปกรณ์ไม่ถูกต้อง กรุณากรอกรหัส 121314');
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white border-2 border-[#FFC067] shadow-2xl p-6 overflow-hidden">
        {/* Top Decorative Header */}
        <div className="flex flex-col items-center text-center space-y-2 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF8EE] border border-[#FFC067] flex items-center justify-center text-neutral-900 shadow-sm">
            {success ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 animate-bounce" />
            ) : (
              <Lock className="w-6 h-6 text-amber-600" />
            )}
          </div>

          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
              <ShieldCheck className="w-3 h-3 text-amber-600" />
              <span>ยืนยันสิทธิ์เข้าใช้อุปกรณ์ใหม่</span>
            </span>

            <h2 className="text-lg font-extrabold text-neutral-900 tracking-tight">
              กรอกรหัสผ่านเข้าใช้งาน (Device Code)
            </h2>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              อุปกรณ์นี้เข้าใช้งานเป็นครั้งแรก โปรดกรอกรหัสยืนยันอุปกรณ์เพื่อเข้าสู่ระบบ (รหัสคือ <span className="font-bold text-neutral-900 underline">121314</span>)
            </p>
          </div>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>ยืนยันอุปกรณ์สำเร็จ! กำลังเข้าสู่เว็บไซต์...</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 flex items-center justify-between">
              <span>รหัสผ่านยืนยันอุปกรณ์ (Device Passcode)</span>
              <span className="text-[10px] text-amber-600 font-bold">รหัส: 121314</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                maxLength={10}
                placeholder="กรอกรหัส 121314..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-neutral-50 border-2 border-neutral-200 focus:bg-white focus:border-[#FFC067] focus:outline-hidden font-mono font-bold tracking-widest text-neutral-900 text-center shadow-inner"
                autoFocus
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={success}
              className="w-full py-2.5 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 active:bg-[#FFC067] text-neutral-950 font-extrabold text-xs border-2 border-[#FFC067] shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>ยืนยันรหัสเข้าใช้งานอุปกรณ์ (Unlock Device)</span>
            </button>
          </div>

          <div className="text-center pt-1">
            <p className="text-[10px] text-neutral-400">
              เมื่อยืนยันถูกต้อง อุปกรณ์นี้จะไม่ต้องกรอกรหัสซ้ำอีกในครั้งถัดไป
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
