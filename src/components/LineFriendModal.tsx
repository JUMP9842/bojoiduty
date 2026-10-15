import React, { useState } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Bell,
  X,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { LINE_OA_INFO } from '../utils/lineAuthUtils';

interface LineFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  userName?: string;
}

export const LineFriendModal: React.FC<LineFriendModalProps> = ({
  isOpen,
  onClose,
  title = 'เพิ่มเพื่อน LINE Official Account',
  subtitle = 'เพื่อให้บอท BojoiDuty สามารถส่งการแจ้งเตือนตารางเวรและข้อความสำคัญหาคุณได้',
  userName,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white border-2 border-[#06C755]/60 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Gradient Header */}
        <div className="bg-gradient-to-r from-[#06C755] via-[#05b84e] to-[#009b00] text-white px-6 py-5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border-2 border-white/60 flex items-center justify-center shadow-md shrink-0">
              <MessageSquare className="w-6 h-6 fill-white text-white" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-extrabold mb-1">
                <Sparkles className="w-3 h-3 text-amber-200" />
                <span>{userName ? `ยินดีต้อนรับคุณ ${userName}` : 'LINE Official Account'}</span>
              </div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                {title}
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Subtitle / Notification explanation */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold leading-relaxed flex items-start gap-2.5 shadow-2xs">
            <Bell className="w-4 h-4 text-[#06C755] shrink-0 mt-0.5 animate-bounce" />
            <div>
              <p className="font-extrabold text-neutral-900 mb-0.5">ทำไมต้องเพิ่มเพื่อน LINE OA?</p>
              <p className="text-[11px] text-neutral-600 leading-normal">
                {subtitle} (แจ้งเตือนล่วงหน้า 3 วัน, 1 วัน, และในวันที่มีเวร พร้อมโน้ตส่งมอบงาน)
              </p>
            </div>
          </div>

          {/* Primary Action Button: Add Friend in LINE */}
          <div>
            <button
              type="button"
              onClick={handleAddFriendClick}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#06C755] hover:bg-[#00B900] active:scale-98 text-white font-black text-sm shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-600 group"
            >
              <MessageSquare className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
              <span>กดเพิ่มเพื่อน LINE OA ทันที</span>
              <ExternalLink className="w-4 h-4 text-emerald-100 ml-1" />
            </button>
            <p className="text-[11px] text-center text-neutral-400 mt-1.5">
              กดแล้วจะเปิดแอป LINE ไปยังหน้าเพิ่มเพื่อนอัตโนมัติ
            </p>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-neutral-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              หรือสแกน QR Code
            </span>
          </div>

          {/* QR Code Card */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col items-center text-center">
            <div className="bg-white p-3 rounded-2xl border-2 border-emerald-300 shadow-md mb-2.5">
              <img
                src={LINE_OA_INFO.qrCodeUrl}
                alt={`QR Code ${LINE_OA_INFO.displayName}`}
                className="w-40 h-40 object-contain mx-auto"
                loading="eager"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
              <QrCode className="w-3.5 h-3.5 text-[#06C755]" />
              <span>สแกนด้วยกล้องมือถือหรือฟังก์ชันสแกนในแอป LINE</span>
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

          {/* Steps Helper */}
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
            <div className="font-extrabold flex items-center gap-1 text-amber-950 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>ขั้นตอนง่ายๆ 3 ข้อ:</span>
            </div>
            <p>1. กดปุ่มสีเขียว <strong>"เพิ่มเพื่อน LINE OA"</strong> หรือสแกน QR Code</p>
            <p>2. กดปุ่ม <strong>"เพิ่มเพื่อน" (Add)</strong> ในแอป LINE</p>
            <p>3. คุณจะได้รับข้อความต้อนรับและพร้อมรับการแจ้งเตือนเตือนเวรโดยอัตโนมัติ!</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-98 text-white font-bold text-xs transition-all cursor-pointer text-center shadow-xs"
          >
            เข้าใจแล้ว / เข้าสู่ระบบหน้าปฏิทินเวร
          </button>
        </div>
      </div>
    </div>
  );
};
