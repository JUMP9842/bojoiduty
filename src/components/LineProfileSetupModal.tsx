import React, { useState, useEffect } from 'react';
import { useDuty } from '../context/DutyContext';
import { CheckCircle2, MessageSquare, Sparkles, X, User as UserIcon, Loader2 } from 'lucide-react';
import { AVAILABLE_COLORS, AVAILABLE_ICONS } from '../data/initialData';

export const LineProfileSetupModal: React.FC = () => {
  const { pendingLineProfile, completeLineRegistration, cancelPendingLineProfile } = useDuty();

  const [displayName, setDisplayName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(AVAILABLE_ICONS[3] || '🐶'); // Default to dog
  const [selectedColor, setSelectedColor] = useState(AVAILABLE_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync default display name whenever a new pending profile arrives
  useEffect(() => {
    if (pendingLineProfile) {
      setDisplayName(pendingLineProfile.displayName || 'สมาชิกใหม่');
      // Pick color based on name hash or first available
      setSelectedColor(AVAILABLE_COLORS[0]);
      setSelectedIcon(AVAILABLE_ICONS[3] || '🐶');
      setErrorMsg(null);
    }
  }, [pendingLineProfile]);

  if (!pendingLineProfile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim();
    if (!cleanName) {
      setErrorMsg('กรุณากรอกชื่อที่จะแสดงในระบบ');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await completeLineRegistration({
        displayName: cleanName,
        icon: selectedIcon,
        color: selectedColor,
      });
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการลงทะเบียน: ' + (err.message || 'โปรดลองใหม่อีกครั้ง'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border-2 border-[#06C755]/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Decorative Green Header */}
        <div className="bg-gradient-to-r from-[#06C755] to-[#00B900] text-white px-6 py-5 relative">
          <button
            type="button"
            onClick={cancelPendingLineProfile}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            title="ยกเลิก"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5">
            {pendingLineProfile.pictureUrl ? (
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
            )}

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-extrabold mb-1">
                <Sparkles className="w-3 h-3 text-amber-200" />
                <span>สมัครสมาชิกใหม่ผ่าน LINE OA</span>
              </div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                ตั้งค่าโปรไฟล์บัญชีของคุณ
              </h2>
              <p className="text-xs text-emerald-100 opacity-90 mt-0.5">
                เชื่อมต่อจาก LINE: <span className="font-bold underline">{pendingLineProfile.displayName}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
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
              onClick={cancelPendingLineProfile}
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
                  <CheckCircle2 className="w-4 h-4" />
                  <span>เสร็จสิ้น (สร้างบัญชีและเข้าสู่ระบบ)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
