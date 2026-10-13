import React, { useState } from 'react';
import { useDuty } from '../context/DutyContext';
import { ShiftAssignment, SwapRequest, User } from '../types';
import {
  CalendarCheck,
  Sun,
  Moon,
  Bath,
  ArrowLeftRight,
  Clock,
  Trash2,
  Check,
  X,
  LogIn,
} from 'lucide-react';
import { getShiftMorningUserId, getShiftEveningUserId } from '../utils/shiftUtils';

interface MyScheduleSectionProps {
  onOpenSwap: (fromDate: string, fromPart: 'morning' | 'evening' | 'full_day' | 'bathing') => void;
}

export const MyScheduleSection: React.FC<MyScheduleSectionProps> = ({ onOpenSwap }) => {
  const {
    currentUser,
    users,
    shifts,
    cancelShift,
    swapRequests,
    respondSwapRequest,
    cancelSwapRequest,
  } = useDuty();

  const [filterType, setFilterType] = useState<'all' | 'daily' | 'bathing'>('all');

  if (!currentUser) {
    return (
      <section className="mb-8">
        <div className="p-6 rounded-2xl bg-white border border-[#FFC067]/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF8EE] text-neutral-950 flex items-center justify-center text-xl border border-[#FFC067]/70">
              🐾
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                ตารางเวรส่วนตัว & คำขอสลับเวร (My Schedule)
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                กรุณาเข้าสู่ระบบด้านบนเพื่อตรวจสอบเวรที่ได้รับมอบหมาย และส่งคำขอสลับเวร
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const myShifts = shifts.filter((s) => {
    if (s.type === 'bathing') return s.userId === currentUser.id;
    const mId = getShiftMorningUserId(s);
    const eId = getShiftEveningUserId(s);
    return mId === currentUser.id || eId === currentUser.id;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const filteredShifts = myShifts.filter((s) => {
    if (filterType === 'daily') return s.type === 'daily';
    if (filterType === 'bathing') return s.type === 'bathing';
    return true;
  });

  const incomingSwaps = swapRequests.filter(
    (s) => s.toUserId === currentUser.id && s.status === 'pending'
  );
  const outgoingSwaps = swapRequests.filter(
    (s) => s.fromUserId === currentUser.id && s.status === 'pending'
  );

  const getUserById = (id: string): User | undefined => {
    return users.find((u) => u.id === id);
  };

  const getShiftPartLabel = (part: SwapRequest['fromShiftPart']) => {
    switch (part) {
      case 'morning':
        return '☀️ Morning';
      case 'evening':
        return '🌙 Evening';
      case 'bathing':
        return '🛁 Bathing';
      default:
        return '☀️🌙 Full Day';
    }
  };

  return (
    <section className="mb-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#FFF8EE] text-neutral-950 flex items-center justify-center text-xs shadow-xs border border-[#FFC067]/80 font-bold">
            <CalendarCheck className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-bold tracking-tight text-neutral-900 uppercase">
            My Schedule &bull; {currentUser.icon} {currentUser.username || currentUser.name}
          </h2>
        </div>

        {/* Filter chips */}
        <div className="flex items-center bg-[#FFF8EE]/60 rounded-xl border border-[#FFC067]/70 p-1 shadow-xs self-start sm:self-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-white text-neutral-950 shadow-xs border border-[#FFC067]/60'
                : 'text-neutral-700 hover:text-neutral-950'
            }`}
          >
            All ({myShifts.length})
          </button>
          <button
            onClick={() => setFilterType('daily')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filterType === 'daily'
                ? 'bg-white text-neutral-950 shadow-xs border border-[#FFC067]/60'
                : 'text-neutral-700 hover:text-neutral-950'
            }`}
          >
            Daily Duty
          </button>
          <button
            onClick={() => setFilterType('bathing')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filterType === 'bathing'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-neutral-700 hover:text-neutral-950'
            }`}
          >
            Bathing
          </button>
        </div>
      </div>

      {/* Pending Swap Requests */}
      {incomingSwaps.length > 0 && (
        <div className="mb-4 space-y-2">
          {incomingSwaps.map((req) => {
            const requester = getUserById(req.fromUserId);
            return (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl bg-[#FFF8EE] border border-[#FFC067] text-neutral-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FFF8EE] text-neutral-950 flex items-center justify-center shrink-0 text-sm mt-0.5 border border-[#FFC067] font-bold">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-900">
                        คำขอสลับเวรจาก {requester?.username || requester?.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white text-neutral-950 font-bold border border-[#FFC067]/60">
                        Pending
                      </span>
                    </div>
                    <p className="text-xs text-neutral-800 mt-0.5">
                      เสนอเวรวันที่ <strong className="text-neutral-950">{req.fromDate}</strong> ({getShiftPartLabel(req.fromShiftPart)}) เพื่อขอแลกเวรวันที่ <strong className="text-neutral-950">{req.toDate}</strong> ({getShiftPartLabel(req.toShiftPart)}) ของคุณ
                    </p>
                    {req.note && (
                      <p className="text-[11px] text-neutral-600 italic mt-0.5">
                        &quot;{req.note}&quot;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => respondSwapRequest(req.id, false)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-neutral-600 hover:text-red-600 bg-white hover:bg-red-50 border border-neutral-200 rounded-xl transition-colors font-medium cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>ปฏิเสธ</span>
                  </button>
                  <button
                    onClick={() => respondSwapRequest(req.id, true)}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 text-neutral-950 text-xs font-bold border border-[#FFC067]/70 shadow-xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>ตกลงแลกเวร</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Outgoing Swaps */}
      {outgoingSwaps.length > 0 && (
        <div className="mb-4 space-y-2">
          {outgoingSwaps.map((req) => {
            const target = getUserById(req.toUserId);
            return (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl bg-white border border-dashed border-[#FFC067] text-neutral-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FFF8EE] text-neutral-950 flex items-center justify-center shrink-0 text-sm border border-[#FFC067]/70 font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">
                      ส่งคำขอสลับเวรถึง {target?.username || target?.name}
                    </span>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      เสนอเวรวันที่ {req.fromDate} เพื่อขอแลกเวรวันที่ {req.toDate}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => cancelSwapRequest(req.id)}
                  className="px-2.5 py-1 text-xs text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-neutral-200 transition-colors self-end sm:self-auto cursor-pointer"
                >
                  ยกเลิกคำขอ
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid of User's Shifts */}
      {filteredShifts.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-dashed border-neutral-200 text-center">
          <p className="text-xs text-neutral-400 mb-1">
            No scheduled duties found in this category
          </p>
          <p className="text-[11px] text-neutral-400">
            Click available shifts in the calendar above to reserve
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredShifts.map((shift) => {
            const isBathing = shift.type === 'bathing';
            const mId = getShiftMorningUserId(shift);
            const eId = getShiftEveningUserId(shift);
            const isMorningOnly = mId === currentUser.id && eId !== currentUser.id;
            const isEveningOnly = eId === currentUser.id && mId !== currentUser.id;

            return (
              <div
                key={shift.id}
                className={`p-4 rounded-2xl bg-white border transition-all shadow-xs flex flex-col justify-between ${
                  isBathing
                    ? 'border-sky-200 hover:border-sky-300'
                    : 'border-neutral-200 hover:border-[#FFC067]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        isBathing
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      {isBathing ? (
                        <>
                          <Bath className="w-3 h-3" />
                          <span>Bathing Duty</span>
                        </>
                      ) : isMorningOnly ? (
                        <>
                          <Sun className="w-3 h-3 text-amber-600" />
                          <span>Morning Shift</span>
                        </>
                      ) : isEveningOnly ? (
                        <>
                          <Moon className="w-3 h-3 text-indigo-500" />
                          <span>Evening Shift</span>
                        </>
                      ) : (
                        <>
                          <Sun className="w-3 h-3 text-amber-600" />
                          <Moon className="w-3 h-3 text-indigo-500 -ml-1" />
                          <span>Daily Duty (Full Day)</span>
                        </>
                      )}
                    </span>

                    <span className="text-[11px] font-medium text-neutral-400">
                      {shift.date}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-neutral-900 mb-1">
                    {shift.date}
                  </h3>

                  <div className="mt-2 text-[11px] text-neutral-600 space-y-1 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                    {isBathing ? (
                      <p className="flex items-center gap-1.5 text-sky-900 font-medium">
                        <span>🛁</span>
                        <span>เวรอาบน้ำ (Bathing Duty)</span>
                      </p>
                    ) : isMorningOnly ? (
                      <p className="flex items-center gap-1.5 text-neutral-700 font-medium">
                        <span>☀️</span>
                        <span>เวรเช้า (Morning Duty)</span>
                      </p>
                    ) : isEveningOnly ? (
                      <p className="flex items-center gap-1.5 text-neutral-700 font-medium">
                        <span>🌙</span>
                        <span>เวรเย็น (Evening Duty)</span>
                      </p>
                    ) : (
                      <>
                        <p className="flex items-center gap-1.5 text-neutral-700 font-medium">
                          <span>☀️</span>
                          <span>เวรเช้า (Morning Duty)</span>
                        </p>
                        <p className="flex items-center gap-1.5 text-neutral-700 font-medium">
                          <span>🌙</span>
                          <span>เวรเย็น (Evening Duty)</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-neutral-100">
                  <button
                    onClick={() => cancelShift(shift.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs transition-colors cursor-pointer"
                    title="ยกเลิกเวรนี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() =>
                      onOpenSwap(
                        shift.date,
                        isBathing
                          ? 'bathing'
                          : isMorningOnly
                          ? 'morning'
                          : isEveningOnly
                          ? 'evening'
                          : 'morning'
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 text-neutral-950 text-xs font-bold border border-[#FFC067]/70 transition-colors cursor-pointer shadow-xs"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-neutral-950" />
                    <span>Swap Duty</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
