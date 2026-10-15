import React, { useState, useEffect } from 'react';
import { useDuty } from '../context/DutyContext';
import {
  CheckCircle2,
  MessageSquare,
  Sparkles,
  X,
  User as UserIcon,
  Loader2,
  ExternalLink,
  QrCode,
  Copy,
  Check,
  Bell,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { AVAILABLE_COLORS, AVAILABLE_ICONS } from '../data/initialData';
import { LINE_OA_INFO } from '../utils/lineAuthUtils';

export const LineProfileSetupModal: React.FC = () => {
  const { pendingLineProfile, completeLineRegistration, cancelPendingLineProfile } = useDuty();

  const [step, setStep] = useState<'profile' | 'add_friend'>('profile');
  const [displayName, setDisplayName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(AVAILABLE_ICONS[3] || '🐶'); // Default to dog
  const [selectedColor, setSelectedColor] = useState(AVAILABLE_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [completedUser, setCompletedUser] = useState<{
    displayName: string;
    icon: string;
    color: string;
  } | null>(null);

  // Sync default display name whenever a new pending profile arrives
  useEffect(() => {
    if (pendingLineProfile) {
      setStep('profile');
      setCompletedUser(null);
      setDisplayName(pendingLineProfile.displayName || 'สมาชิกใหม่');
      setSelectedColor(AVAILABLE_COLORS[0]);
      setSelectedIcon(AVAILABLE_ICONS[3] || '🐶');
      setErrorMsg(null);
    }
  }, [pendingLineProfile]);

  if (!pendingLineProfile && !completedUser) return null;

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim();
    if (!cleanName) {
      setErrorMsg('กรุณากรอกชื่อที่จะแสดงในระบบ');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const user = await completeLineRegistration({
        displayName: cleanName,
        icon: selectedIcon,
        color: selectedColor,
      });

      // Transition to Step 2: Prompt to Add LINE OA Friend
      setCompletedUser({
        displayName: cleanName,
        icon: selectedIcon,
        color: selectedColor,
      });
      setStep('add_friend');
      setIsSubmitting(false);
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการลงทะเบียน: ' + (err.message || 'โปรดลองใหม่อีกครั้ง'));
      setIsSubmitting(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(LINE_OA_INFO.basicId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAddFriendClick = () => {
    const isMobile =
      typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = LINE_OA_INFO.addFriendUrl;
    } else {
      window.open(LINE_OA_INFO.addFriendUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleFinishAll = () => {
    setCompletedUser(null);
    setStep('profile');
  };

  const handleClose = () => {
    setCompletedUser(null);
    cancelPendingLineProfile();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border-2 border-[#06C755]/50 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Step Indicator Header */}
        <div className="bg-gradient-to-r from-[#06C755] to-[#00B900] text-white px-6 py-5 relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            title="ปิด"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5">
            {step === 'profile' ? (
              pendingLineProfile?.pictureUrl ? (
                <div className="relative">
                  <img
                    src={pendingLineProfile.pictureUrl}
                    alt={pendingLineProfile.displayName}
                    className="w-14 h-14 rounded-2xl border-2 border-white object-cover shadow-md"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#06C755] border-2 border-white flex items-center justify-center">
                    <MessageSquare className="w-2.5 h-2.5 fill-white text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-white/20 border-2 border-white flex items-center justify-center text-2xl shadow-md">
                  🐾
                </div>
              )
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/20 border-2 border-white flex items-center justify-center shadow-md shrink-0">
                <CheckCircle2 className="w-8 h-8 text-white animate-bounce" />
              </div>
            )}

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-extrabold mb-1">
                <Sparkles className="w-3 h-3 text-amber-200" />
                <span>
                  {step === 'profile'
                    ? 'ขั้นตอน 1/2: ตั้งค่าโปรไฟล์บัญชี'
                    : 'ขั้นตอน 2/2: เพิ่มเพื่อน LINE OA'}
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                {step === 'profile'
                  ? 'ตั้งค่าโปรไฟล์บัญชีของคุณ'
                  : 'เพิ่มเพื่อน LINE Official Account'}
              </h2>
              <p className="text-xs text-emerald-100 opacity-90 mt-0.5">
                {step === 'profile'
                  ? `เชื่อมต่อจาก LINE: ${pendingLineProfile?.displayName || 'สมาชิกใหม่'}`
                  : `สมัครสำเร็จแล้ว! ยินดีต้อนรับคุณ ${completedUser?.displayName}`}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        {step === 'profile' ? (
          /* STEP 1: Profile Customization */
          <form onSubmit={handleSubmitProfile} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold animate-in fade-in">
                {errorMsg}
              </div>
            )}

            {/* 1. Display Name */}
            <div>
              <label className="block text-xs font-black text-neutral-800 mb-1.5 flex items-center justify-between">
                <span>1. ชื่อที่จะแสดงในระบบ (Display Name) *</span>
                <span className="text-[10px] text-neutral-400 font-normal">แก้ไขตามต้องการได้</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  maxLength={30}
                  placeholder="กรอกชื่อที่จะแสดง เช่น น้องบีม, พี่ต้น..."
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl bg-neutral-50 border-2 border-neutral-200 focus:bg-white focus:border-[#06C755] focus:outline-hidden font-bold text-neutral-900 shadow-inner transition-colors"
                  autoFocus
                />
              </div>
            </div>

            {/* 2. Choose Icon */}
            <div>
              <label className="block text-xs font-black text-neutral-800 mb-1.5 flex items-center justify-between">
                <span>2. เลือกไอคอนประจำตัว (Choose Icon) *</span>
                <span className="text-[10px] text-neutral-500 font-bold">เลือกไอคอนที่ชอบ</span>
              </label>
              <div className="grid grid-cols-8 gap-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-200 max-h-36 overflow-y-auto">
                {AVAILABLE_ICONS.map((icon) => {
                  const isSelected = selectedIcon === icon;
                  return (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setSelectedIcon(icon)}
                      className={`aspect-square rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white border-2 border-[#06C755] shadow-md scale-110 ring-2 ring-emerald-200'
                          : 'bg-white/80 border border-neutral-200 hover:bg-white hover:scale-105'
                      }`}
                    >
                      <span>{icon}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Choose Color */}
            <div>
              <label className="block text-xs font-black text-neutral-800 mb-1.5 flex items-center justify-between">
                <span>3. เลือกสีประจำตัว (Choose Color) *</span>
                <span className="text-[10px] text-neutral-500 font-bold">สีของเวรคุณบนปฏิทิน</span>
              </label>
              <div className="flex items-center gap-2.5 flex-wrap p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                {AVAILABLE_COLORS.map((col) => {
                  const isSelected = selectedColor === col;
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setSelectedColor(col)}
                      className={`w-7 h-7 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'scale-125 ring-3 ring-neutral-900 shadow-md border-2 border-white'
                          : 'hover:scale-110 border border-black/10'
                      }`}
                      style={{ backgroundColor: col }}
                      title={col}
                    >
                      {isSelected && <span className="text-white text-[10px] font-black">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-neutral-50 to-[#FFF8EE] border border-neutral-200">
              <span className="text-[10px] font-black text-neutral-500 block mb-2 uppercase tracking-wider">
                ตัวอย่างบัตรของคุณที่จะแสดงในปฏิทินเวร:
              </span>
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-2 shadow-xs transition-all"
                style={{
                  backgroundColor: `${selectedColor}18`,
                  borderColor: `${selectedColor}60`,
                  color: '#171717',
                }}
              >
                <span className="text-base">{selectedIcon}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: selectedColor }}
                />
                <span className="font-extrabold text-xs">
                  {displayName.trim() || 'ชื่อที่จะแสดง'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/80 font-bold text-neutral-600 border border-neutral-200">
                  LINE OA
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-2 py-3 px-6 rounded-2xl bg-[#06C755] hover:bg-[#00B900] active:scale-98 text-white font-black text-xs shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-600 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึกข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <span>บันทึกและไปขั้นตอนเพิ่มเพื่อน</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: Dedicated Add LINE OA Friend Screen */
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Success Celebration Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 flex items-center gap-3.5 shadow-sm">
              <div
                className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-2xl shadow-xs shrink-0"
                style={{
                  backgroundColor: `${completedUser?.color}20`,
                  borderColor: completedUser?.color,
                }}
              >
                {completedUser?.icon || '🐶'}
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 mb-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>บันทึกโปรไฟล์เรียบร้อยแล้ว</span>
                </span>
                <h3 className="text-sm font-extrabold text-neutral-900 truncate">
                  ยินดีต้อนรับคุณ {completedUser?.displayName}
                </h3>
              </div>
            </div>

            {/* Why must add friend notice */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold leading-relaxed flex items-start gap-2.5 shadow-2xs">
              <Bell className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <p className="font-extrabold text-neutral-900 mb-0.5">
                  ขั้นตอนสุดท้าย: เพิ่มเพื่อน LINE Official Account
                </p>
                <p className="text-[11px] text-neutral-700 leading-normal">
                  กรุณากดเพิ่มเพื่อนหรือสแกน QR Code ด้านล่างนี้ เพื่อให้บอท BojoiDuty สามารถส่งการแจ้งเตือนตารางเวรและการแจ้งเตือนด่วนไปยัง LINE ของคุณได้โดยตรง
                </p>
              </div>
            </div>

            {/* Primary Action Button: Add Friend in LINE */}
            <div>
              <button
                type="button"
                onClick={handleAddFriendClick}
                className="w-full py-4 px-5 rounded-2xl bg-[#06C755] hover:bg-[#00B900] active:scale-98 text-white font-black text-sm shadow-xl hover:shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2.5 border-2 border-emerald-600 group"
              >
                <MessageSquare className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
                <span className="text-base tracking-tight">➕ กดเพิ่มเพื่อน LINE OA ทันที</span>
                <ExternalLink className="w-4 h-4 text-emerald-100 ml-1" />
              </button>
              <p className="text-[11px] text-center text-neutral-500 mt-1.5 font-medium">
                (คลิกแล้วจะเปิดแอป LINE ไปยังหน้าเพิ่มเพื่อน <strong>@{LINE_OA_INFO.basicId.replace(/^@/, '')}</strong> ทันที)
              </p>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-neutral-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                หรือสแกน QR Code ด้วยมือถือ
              </span>
            </div>

            {/* QR Code Section */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col items-center text-center">
              <div className="bg-white p-3 rounded-2xl border-2 border-emerald-300 shadow-md mb-2">
                <img
                  src={LINE_OA_INFO.qrCodeUrl}
                  alt={`QR Code ${LINE_OA_INFO.displayName}`}
                  className="w-40 h-40 object-contain mx-auto"
                  loading="eager"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
                <QrCode className="w-3.5 h-3.5 text-[#06C755]" />
                <span>สแกนด้วยแอป LINE หรือกล้องมือถือ</span>
              </div>

              {/* LINE ID with Copy Button */}
              <div className="mt-3 flex items-center gap-2 w-full max-w-xs">
                <div className="flex-1 py-1.5 px-3 rounded-xl bg-white border border-neutral-200 text-xs font-black text-neutral-800 text-center tracking-wide font-mono">
                  {LINE_OA_INFO.basicId}
                </div>

                <button
                  type="button"
                  onClick={handleCopyId}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border shrink-0 ${
                    copied
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-300'
                  }`}
                  title="คัดลอก LINE ID"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอก ID</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick 3-step Instructions */}
            <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-[11px] text-emerald-950 space-y-1">
              <div className="font-extrabold flex items-center gap-1 text-emerald-900 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#06C755]" />
                <span>ขั้นตอนง่ายๆ 3 ข้อ:</span>
              </div>
              <p>1. กดปุ่มสีเขียว <strong>"เพิ่มเพื่อน LINE OA"</strong> ด้านบน หรือสแกน QR Code</p>
              <p>2. กดปุ่ม <strong>"เพิ่มเพื่อน" (Add)</strong> ในหน้าจอแอป LINE</p>
              <p>3. คุณจะได้รับข้อความต้อนรับและพร้อมรับการแจ้งเตือนเตือนเวรโดยอัตโนมัติ!</p>
            </div>

            {/* Finish & Proceed to Calendar */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleFinishAll}
                className="w-full py-3 px-5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:scale-98 text-white font-extrabold text-xs transition-all cursor-pointer text-center shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>เพิ่มเพื่อนแล้ว / เข้าสู่ระบบหน้าปฏิทินเวร</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
