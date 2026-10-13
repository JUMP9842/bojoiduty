import React, { useState } from 'react';
import { useDuty } from '../context/DutyContext';
import { ShiftAssignment, User } from '../types';
import { ArrowLeftRight, X, Sparkles } from 'lucide-react';
import { isUserAssignedToShift } from '../utils/shiftUtils';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillFromDate?: string;
  prefillFromShiftPart?: 'morning' | 'evening' | 'full_day' | 'bathing';
  prefillToUserId?: string;
  prefillToDate?: string;
}

export const SwapModal: React.FC<SwapModalProps> = ({
  isOpen,
  onClose,
  prefillFromDate,
  prefillFromShiftPart = 'morning',
  prefillToUserId,
  prefillToDate,
}) => {
  const { currentUser, users, shifts, createSwapRequest } = useDuty();

  const myShifts = shifts.filter((s) => {
    if (!currentUser) return false;
    return isUserAssignedToShift(s, currentUser.id);
  });

  const [fromDate, setFromDate] = useState<string>(
    prefillFromDate || (myShifts[0]?.date ?? '')
  );
  const [fromShiftPart, setFromShiftPart] = useState<'morning' | 'evening' | 'full_day' | 'bathing'>(
    prefillFromShiftPart
  );

  const [toUserId, setToUserId] = useState<string>(
    prefillToUserId || users.find((u) => u.id !== currentUser?.id)?.id || ''
  );
  const [toDate, setToDate] = useState<string>(prefillToDate || '');
  const [toShiftPart, setToShiftPart] = useState<'morning' | 'evening' | 'full_day' | 'bathing'>('morning');
  const [note, setNote] = useState<string>('');
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-md rounded-2xl bg-white border border-[#FFC067] shadow-xl p-5 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#FFF8EE] text-neutral-950 flex items-center justify-center text-xl mb-3 border border-[#FFC067]/70">
            🔒
          </div>
          <h3 className="text-sm font-bold text-neutral-900 mb-1">
            กรุณาเข้าสู่ระบบ
          </h3>
          <p className="text-xs text-neutral-500 mb-4">
            คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถส่งคำขอสลับเวรได้
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 text-neutral-950 text-xs font-bold border border-[#FFC067]/70 shadow-xs cursor-pointer"
          >
            ตกลง
          </button>
        </div>
      </div>
    );
  }

  const otherUsers = users.filter((u) => u.id !== currentUser.id);

  const targetUserShifts = shifts.filter((s) => {
    if (!toUserId) return false;
    return isUserAssignedToShift(s, toUserId);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUserId || !fromDate || !toDate) {
      alert('กรุณาเลือกข้อมูลให้ครบถ้วน');
      return;
    }

    const success = createSwapRequest({
      toUserId,
      fromDate,
      fromShiftPart,
      toDate,
      toShiftPart,
      note: note.trim() || undefined,
    });

    if (success) {
      setSubmittedMessage('ส่งคำขอสลับเวรเรียบร้อยแล้ว');
      setTimeout(() => {
        setSubmittedMessage(null);
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-[#FFC067] shadow-xl p-5 sm:p-6 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#FFF8EE] text-neutral-950 flex items-center justify-center border border-[#FFC067] font-bold">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900">
            Shift Swap (ขอสลับเวร)
          </h3>
        </div>

        {submittedMessage ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-neutral-900">{submittedMessage}</p>
            <p className="text-xs text-neutral-500 mt-1">รอการตอบรับจากเพื่อนร่วมห้อง</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
              <span className="text-[11px] font-semibold text-neutral-700 uppercase tracking-wider block mb-2">
                1. My Shift to Offer (เวรของฉันที่นำไปแลก):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-neutral-500 mb-1">
                    Date
                  </label>
                  {myShifts.length > 0 ? (
                    <select
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-neutral-200 focus:border-[#FFC067] focus:outline-hidden"
                    >
                      {myShifts.map((s) => (
                        <option key={s.id} value={s.date}>
                          {s.date} ({s.type === 'bathing' ? 'Bathing' : 'Daily Duty'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-neutral-200"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-500 mb-1">
                    Shift Period
                  </label>
                  <select
                    value={fromShiftPart}
                    onChange={(e) => setFromShiftPart(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-neutral-200 focus:border-[#FFC067] focus:outline-hidden"
                  >
                    <option value="morning">☀️ Morning</option>
                    <option value="evening">🌙 Evening</option>
                    <option value="full_day">☀️🌙 Full Day</option>
                    <option value="bathing">🛁 Bathing</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFF8EE] border border-[#FFC067]/70">
              <span className="text-[11px] font-semibold text-neutral-900 uppercase tracking-wider block mb-2">
                2. Target Shift to Swap With (เวรของเพื่อนที่ขอแลก):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2.5">
                <div>
                  <label className="block text-[11px] text-neutral-600 mb-1">
                    Member
                  </label>
                  <select
                    value={toUserId}
                    onChange={(e) => {
                      setToUserId(e.target.value);
                      const userS = shifts.filter((s) => s.userId === e.target.value);
                      if (userS.length > 0) setToDate(userS[0].date);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-neutral-200 focus:border-[#FFC067] focus:outline-hidden"
                  >
                    {otherUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.icon} {u.username || u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-600 mb-1">
                    Target Date
                  </label>
                  {targetUserShifts.length > 0 ? (
                    <select
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-neutral-200 focus:border-[#FFC067] focus:outline-hidden"
                    >
                      <option value="">-- เลือกวันที่ --</option>
                      {targetUserShifts.map((s) => (
                        <option key={s.id} value={s.date}>
                          {s.date} ({s.type === 'bathing' ? 'Bathing' : 'Daily Duty'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-neutral-200"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-600 mb-1">
                    Target Period
                  </label>
                  <select
                    value={toShiftPart}
                    onChange={(e) => setToShiftPart(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-neutral-200 focus:border-[#FFC067] focus:outline-hidden"
                  >
                    <option value="morning">☀️ Morning</option>
                    <option value="evening">🌙 Evening</option>
                    <option value="full_day">☀️🌙 Full Day</option>
                    <option value="bathing">🛁 Bathing</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                Note (Optional)
              </label>
              <input
                type="text"
                placeholder="ระบุเหตุผลหรือข้อความเพิ่มเติม..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-[#FFC067] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 active:bg-[#FFC067] text-neutral-950 text-xs font-bold transition-all shadow-xs border border-[#FFC067]/70 cursor-pointer"
              >
                ส่งคำขอสลับเวร (Swap Duty)
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
