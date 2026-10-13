import React, { useState, useMemo, useRef } from 'react';
import { useDuty } from '../context/DutyContext';
import { ShiftAssignment, User, SelectedShiftTarget, CalendarTaskNote } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Bath,
  Check,
  Calendar as CalendarIcon,
  ArrowLeftRight,
  Trash2,
  Sparkles,
  CheckCircle2,
  Users,
  FileDown,
  X,
  Plus,
  Pin,
  StickyNote,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { exportCalendarToPdf } from '../utils/pdfExport';
import { getShiftMorningUserId, getShiftEveningUserId } from '../utils/shiftUtils';

interface CalendarViewProps {
  onOpenSwapWithDate?: (date: string, toUserId?: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = () => {
  const {
    currentUser,
    users,
    shifts,
    bathingSchedules,
    selectedShifts,
    toggleSelectShift,
    isShiftSelected,
    clearSelectedShifts,
    batchBookShifts,
    activeSwapSelection,
    startSwapWithShift,
    selectMyShiftForSwap,
    updateSwapSelectionNote,
    updateSwapSelectionPart,
    cancelSwapSelection,
    confirmDirectSwap,
    isDateOpenForBooking,
    calendarTasks,
    addCalendarTaskNote,
    deleteCalendarTaskNote,
    quotaStats,
    currentUserRemainingQuota,
  } = useDuty();

  const calendarPrintRef = useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Task / Note Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskType, setTaskType] = useState<'task' | 'note'>('task');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStartDate, setTaskStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [taskEndDate, setTaskEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [taskColor, setTaskColor] = useState('#FFC067');
  const [taskIcon, setTaskIcon] = useState('📌');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Month navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthName = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

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

  const formatDateStr = (d: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const getShiftsForDate = (dateStr: string) => {
    const daily = shifts.find((s) => s.date === dateStr && s.type === 'daily');
    const bathing = shifts.find((s) => s.date === dateStr && s.type === 'bathing');
    return { daily, bathing };
  };

  const getUserById = (id?: string): User | undefined => {
    if (!id) return undefined;
    return users.find((u) => u.id === id);
  };

  // Find Tasks and Notes for a specific date
  const getTasksAndNotesForDate = (dateStr: string) => {
    const dayTasks = calendarTasks.filter((t) => {
      if (t.type !== 'task') return false;
      const start = t.startDate;
      const end = t.endDate || t.startDate;
      return dateStr >= start && dateStr <= end;
    });

    const dayNotes = calendarTasks.filter((t) => {
      return t.type === 'note' && t.startDate === dateStr;
    });

    return { dayTasks, dayNotes };
  };

  // Handle batch booking of multi-selected shifts
  const handleConfirmBatchBooking = () => {
    if (selectedShifts.length === 0) return;
    const count = selectedShifts.length;
    const success = batchBookShifts();
    if (success) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#FFC067', '#10B981', '#2563EB', '#DB2777'],
      });
      setBookingSuccess(`จองสำเร็จจำนวน ${count} เวรเรียบร้อยแล้ว!`);
      setTimeout(() => setBookingSuccess(null), 3500);
    } else {
      alert('ไม่สามารถจองได้ กรุณาตรวจสอบว่ามีเวรที่ถูกจองไปแล้วหรือไม่');
    }
  };

  // Handle confirm swap from bottom popup
  const handleConfirmSwap = () => {
    const success = confirmDirectSwap();
    if (success) {
      setBookingSuccess('ส่งคำขอสลับเวรเรียบร้อยแล้ว!');
      setTimeout(() => setBookingSuccess(null), 3500);
    }
  };

  // Handle Task / Note Submit
  const handleCreateTaskNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    addCalendarTaskNote({
      type: taskType,
      title: taskTitle.trim(),
      startDate: taskStartDate,
      endDate: taskType === 'task' ? taskEndDate : undefined,
      color: taskColor,
      icon: taskIcon,
    });

    setTaskTitle('');
    setIsTaskModalOpen(false);
  };

  // Export Calendar Only to Landscape PDF
  const handleExportCalendarPdf = () => {
    try {
      setIsExportingPdf(true);
      const bathingDates = bathingSchedules.filter((b) => b.enabled).map((b) => b.date);

      exportCalendarToPdf({
        year,
        month,
        shifts,
        users,
        bathingDates,
      });

      setBookingSuccess('Export PDF ปฏิทินสำเร็จเรียบร้อยแล้ว!');
      setTimeout(() => setBookingSuccess(null), 3000);
      setIsExportingPdf(false);
    } catch (err) {
      console.error('Export PDF error:', err);
      setIsExportingPdf(false);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF');
    }
  };

  return (
    <section className="mb-8">
      {/* Top: Fair Duty Quota */}
      <div className="mb-5 p-4 rounded-2xl bg-white border border-[#FFC067]/70 shadow-xs">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#FFC067]/30">
          <div className="w-6 h-6 rounded-lg bg-[#FFC067] text-neutral-950 flex items-center justify-center text-xs shadow-xs font-bold border border-[#F5B153]">
            <Users className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold text-neutral-900">
            Fair Duty Quota
          </h3>
        </div>

        {/* Member Quota Progress Bars */}
        {users.length === 0 ? (
          <div className="py-3 text-center text-xs text-neutral-400">
            ยังไม่มีสมาชิกในระบบ เข้าสู่ระบบด้วย LINE หรือสร้างบัญชีใหม่เพื่อเริ่มจัดสรรเวร
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {users.map((u) => {
              const count = quotaStats.userCounts[u.id] || { daily: 0, bathing: 0, total: 0 };
              const progress = Math.min(100, Math.round((count.daily / Math.max(1, quotaStats.targetPerMember)) * 100));
              const isMe = Boolean(currentUser && u.id === currentUser.id);

              return (
                <div
                  key={u.id}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isMe
                      ? 'bg-[#FFF8EE] text-neutral-950 border-[#FFC067] shadow-xs ring-1 ring-[#FFC067]/50'
                      : 'bg-[#FFF8EE]/40 border-[#FFC067]/40 text-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{u.icon || '🐶'}</span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: u.color }}
                      />
                      <span className="text-xs font-bold truncate max-w-[80px]">
                        {u.username || u.name}
                      </span>
                    </div>
                    {isMe && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white text-neutral-950 font-bold border border-[#FFC067]/60">
                        You
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between text-xs mb-1">
                    <span className={isMe ? 'text-neutral-900 font-semibold' : 'text-neutral-500'}>
                      {count.daily} / {quotaStats.targetPerMember} Days
                    </span>
                    <span className="font-bold">{progress}%</span>
                  </div>

                  <div className="w-full h-1.5 bg-neutral-200/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: isMe ? '#FFC067' : u.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Swap Mode Active Banner */}
      {activeSwapSelection && (
        <div className="mb-3 p-3 rounded-2xl bg-[#FFF8EE] border border-[#FFC067] text-neutral-900 shadow-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#FFC067] text-neutral-950 flex items-center justify-center text-xs font-bold shrink-0 border border-[#F5B153]">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-900 block">
                อยู่ในโหมดสลับเวร: แลกเวรวันที่ {activeSwapSelection.targetDate} ของ {activeSwapSelection.targetUserIcon} {activeSwapSelection.targetUserName}
              </span>
              <span className="text-[11px] text-neutral-700 font-medium">
                &rarr; กรุณาคลิกเลือกเวรของตนเองในปฏิทินที่จะนำไปแลก
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={cancelSwapSelection}
            className="px-2.5 py-1 text-xs text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-300 rounded-lg"
          >
            ยกเลิก
          </button>
        </div>
      )}

      {/* Main Calendar Container */}
      <div
        ref={calendarPrintRef}
        id="calendar-export-area"
        className="bg-white rounded-2xl border border-[#FFC067]/80 shadow-xs overflow-hidden"
      >
        {/* Calendar Header with Navigation and Add Task / Note button in #FFC067 theme */}
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#FFC067]/30 bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-neutral-900">
              {monthName}
            </h2>
            <button
              onClick={goToToday}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#FFF8EE] hover:bg-[#FFC067]/40 text-neutral-900 transition-colors border border-[#FFC067]/70"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* + Add Task / Note button in Swap Duty tone */}
            <button
              onClick={() => {
                setTaskStartDate(new Date().toISOString().slice(0, 10));
                setTaskEndDate(new Date().toISOString().slice(0, 10));
                setIsTaskModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 active:bg-[#FFC067]/60 text-neutral-950 text-xs font-bold transition-all shadow-xs border border-[#FFC067]/70 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-neutral-950" />
              <span>+ Add Task / Note</span>
            </button>

            <div className="flex items-center rounded-xl bg-[#FFF8EE] border border-[#FFC067]/70 p-0.5">
              <button
                onClick={prevMonth}
                title="Previous Month"
                className="p-1.5 rounded-lg text-neutral-700 hover:text-black hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                title="Next Month"
                className="p-1.5 rounded-lg text-neutral-700 hover:text-black hover:bg-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 border-b border-[#FFC067]/30 bg-[#FFF8EE]/60 text-center py-2 text-xs font-bold text-neutral-900">
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
                  key={`empty-${index}`}
                  className="min-h-[115px] sm:min-h-[140px] p-2 bg-neutral-50/30 border-b border-r border-neutral-100"
                />
              );
            }

            const dateStr = formatDateStr(dayNum);
            const { daily, bathing } = getShiftsForDate(dateStr);
            const { dayTasks, dayNotes } = getTasksAndNotesForDate(dateStr);
            const hasBathingSchedule = bathingSchedules.some((b) => b.date === dateStr && b.enabled);
            const isToday = new Date().toISOString().slice(0, 10) === dateStr;

            const isDailySelected = isShiftSelected(dateStr, 'daily');
            const isBathingSelected = isShiftSelected(dateStr, 'bathing');

            // Booking status for this date
            const bookingStatus = isDateOpenForBooking(dateStr);
            const isLocked = !bookingStatus.isOpen;

            // Shift owner users
            const dailyUser = getUserById(daily?.userId);
            const morningUserId = getShiftMorningUserId(daily);
            const eveningUserId = getShiftEveningUserId(daily);
            const morningUser = morningUserId ? getUserById(morningUserId) : undefined;
            const eveningUser = eveningUserId ? getUserById(eveningUserId) : undefined;
            const bathingUser = getUserById(bathing?.userId);

            const isMyDailyDuty = Boolean(
              currentUser && (
                morningUserId === currentUser.id ||
                eveningUserId === currentUser.id
              )
            );
            const isMyBathingDuty = Boolean(currentUser && bathing?.userId === currentUser.id);

            return (
              <div
                key={`day-${dayNum}`}
                className={`min-h-[115px] sm:min-h-[140px] p-1.5 sm:p-2 border-b border-r border-neutral-100 flex flex-col justify-between transition-colors ${
                  isToday ? 'bg-[#FFF8EE]/60 ring-1 ring-inset ring-[#FFC067]' : 'bg-white'
                } ${isLocked ? 'bg-neutral-50/50' : ''}`}
              >
                {/* Day Top: Day number + Task strip */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold inline-flex items-center justify-center w-5 h-5 rounded-full ${
                        isToday
                          ? 'bg-[#FFC067] text-neutral-950 font-bold border border-[#F5B153]'
                          : isLocked
                          ? 'text-neutral-400'
                          : 'text-neutral-700'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Lock indicator or bathing badge */}
                    {isLocked ? (
                      <span
                        className="text-[10px] text-neutral-400 cursor-help"
                        title={bookingStatus.reason || 'ยังไม่ถึงกำหนดเปิดจอง'}
                      >
                        <Lock className="w-3 h-3 inline text-neutral-400" />
                      </span>
                    ) : hasBathingSchedule ? (
                      <span className="text-[10px] text-sky-600 font-bold flex items-center gap-0.5">
                        <Bath className="w-3 h-3" />
                      </span>
                    ) : null}
                  </div>

                  {/* 1. Multi-day Tasks / Single Day Tasks (TOP OF DAY CELL) */}
                  {dayTasks.length > 0 && (
                    <div className="space-y-0.5 mb-1">
                      {dayTasks.map((t) => {
                        const isStart = t.startDate === dateStr;
                        const isEnd = (t.endDate || t.startDate) === dateStr;

                        return (
                          <div
                            key={t.id}
                            className={`group text-[9px] font-bold px-1 py-0.5 text-neutral-950 flex items-center justify-between gap-1 shadow-xs transition-opacity ${
                              isStart && isEnd
                                ? 'rounded-md'
                                : isStart
                                ? 'rounded-l-md rounded-r-xs'
                                : isEnd
                                ? 'rounded-r-md rounded-l-xs'
                                : 'rounded-none'
                            }`}
                            style={{ backgroundColor: t.color || '#FFC067' }}
                            title={`Task: ${t.title} (${t.startDate} ถึง ${t.endDate || t.startDate})`}
                          >
                            <div className="flex items-center gap-1 truncate">
                              {isStart && <span>{t.icon || '📌'}</span>}
                              <span className="truncate">{t.title}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCalendarTaskNote(t.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-neutral-900 hover:text-black ml-0.5 font-bold"
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Duty items: Morning & Evening */}
                <div className="space-y-1 my-1">
                  {daily ? (
                    <div
                      onClick={() => {
                        if (activeSwapSelection) {
                          if (isMyDailyDuty) {
                            selectMyShiftForSwap(dateStr, 'daily', 'full_day');
                          }
                        } else if (!isMyDailyDuty) {
                          startSwapWithShift({
                            targetUserId: dailyUser?.id || '',
                            targetUserName: dailyUser?.username || dailyUser?.name || 'เพื่อน',
                            targetUserIcon: dailyUser?.icon || '🐶',
                            targetDate: dateStr,
                            targetType: 'daily',
                            targetPart: 'full_day',
                          });
                        }
                      }}
                      className={`rounded-lg border p-1 transition-all ${
                        isMyDailyDuty
                          ? 'bg-[#FFF8EE] border-[#FFC067] hover:border-[#F5B153] cursor-pointer'
                          : 'bg-neutral-50/80 border-neutral-200 hover:border-[#FFC067] hover:bg-[#FFF8EE]/60 cursor-pointer'
                      }`}
                      title={
                        isMyDailyDuty
                          ? 'เวรของคุณ (คลิกเพื่อเลือกสำหรับสลับเวร)'
                          : `เวรของ ${dailyUser?.username || dailyUser?.name} (คลิกเพื่อขอสลับเวร)`
                      }
                    >
                      {/* Morning Slot (☀️ เช้า) */}
                      <div
                        className="flex items-center justify-between text-[10px] py-0.5 px-1 rounded font-medium truncate"
                        style={{
                          backgroundColor: morningUser?.bgLight || '#F9FAFB',
                          color: morningUser?.color || '#9CA3AF',
                        }}
                      >
                        <div className="flex items-center gap-1 truncate">
                          <Sun className="w-2.5 h-2.5 shrink-0 text-amber-600" />
                          <span className="font-bold text-[9px] text-neutral-500 shrink-0">เช้า:</span>
                          {morningUser ? (
                            <>
                              <span className="text-[10px]">{morningUser.icon}</span>
                              <span className="truncate">{morningUser.username || morningUser.name}</span>
                            </>
                          ) : (
                            <span className="text-neutral-400 font-normal italic text-[9px]">+ ว่าง</span>
                          )}
                        </div>
                      </div>

                      {/* Evening Slot (🌙 เย็น) */}
                      <div
                        className="flex items-center justify-between text-[10px] py-0.5 px-1 rounded font-medium truncate mt-0.5"
                        style={{
                          backgroundColor: eveningUser?.bgLight || '#F9FAFB',
                          color: eveningUser?.color || '#9CA3AF',
                        }}
                      >
                        <div className="flex items-center gap-1 truncate">
                          <Moon className="w-2.5 h-2.5 shrink-0 text-indigo-500" />
                          <span className="font-bold text-[9px] text-neutral-500 shrink-0">เย็น:</span>
                          {eveningUser ? (
                            <>
                              <span className="text-[10px]">{eveningUser.icon}</span>
                              <span className="truncate">{eveningUser.username || eveningUser.name}</span>
                            </>
                          ) : (
                            <span className="text-neutral-400 font-normal italic text-[9px]">+ ว่าง</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Available Daily Duty Slot
                    isLocked ? (
                      <div className="text-[9px] text-neutral-400 bg-neutral-100/70 py-1 px-1.5 rounded text-center border border-neutral-200/60">
                        <span>🔒 ยังไม่เปิดจอง</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleSelectShift({ date: dateStr, type: 'daily' })}
                        className={`w-full py-1 px-1.5 rounded-md text-[10px] font-medium border text-left flex items-center justify-between transition-all ${
                          isDailySelected
                            ? 'bg-[#FFC067] text-neutral-950 border-[#F5B153] shadow-xs font-bold'
                            : 'bg-neutral-50/80 hover:bg-neutral-100 text-neutral-600 border-dashed border-neutral-300'
                        }`}
                      >
                        <span>{isDailySelected ? '✓ เลือก (เช้า+เย็น)' : '+ ว่าง (เช้า+เย็น)'}</span>
                        {isDailySelected && <Check className="w-3 h-3 text-neutral-950" />}
                      </button>
                    )
                  )}

                  {/* Bathing Duty Slot */}
                  {bathing ? (
                    <div
                      onClick={() => {
                        if (activeSwapSelection) {
                          if (isMyBathingDuty) selectMyShiftForSwap(dateStr, 'bathing', 'bathing');
                        } else if (!isMyBathingDuty) {
                          startSwapWithShift({
                            targetUserId: bathingUser?.id || '',
                            targetUserName: bathingUser?.username || bathingUser?.name || 'เพื่อน',
                            targetUserIcon: bathingUser?.icon || '🐶',
                            targetDate: dateStr,
                            targetType: 'bathing',
                            targetPart: 'bathing',
                          });
                        }
                      }}
                      className="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border truncate bg-sky-50 border-sky-200 text-sky-900 cursor-pointer hover:border-sky-400"
                      title={isMyBathingDuty ? 'เวรอาบน้ำของคุณ' : `เวรอาบน้ำของ ${bathingUser?.username} (คลิกเพื่อขอสลับ)`}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <Bath className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                        <span className="font-bold text-[9px]">อาบน้ำ:</span>
                        <span>{bathingUser?.icon}</span>
                        <span className="truncate">{bathingUser?.username || bathingUser?.name}</span>
                      </div>
                    </div>
                  ) : hasBathingSchedule ? (
                    isLocked ? (
                      <div className="text-[8px] text-neutral-400 text-center py-0.5">
                        - อาบน้ำ (ล็อค) -
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleSelectShift({ date: dateStr, type: 'bathing' })}
                        className={`w-full py-0.5 px-1.5 rounded-md text-[9px] font-medium border text-left flex items-center justify-between transition-all ${
                          isBathingSelected
                            ? 'bg-sky-600 text-white border-sky-700 shadow-xs font-bold'
                            : 'bg-sky-50/60 hover:bg-sky-100 text-sky-700 border-sky-200/60'
                        }`}
                      >
                        <span>{isBathingSelected ? '✓ อาบน้ำ' : '+ อาบน้ำ'}</span>
                        {isBathingSelected && <Check className="w-2.5 h-2.5" />}
                      </button>
                    )
                  ) : null}
                </div>

                {/* 3. Notes Bar (BOTTOM OF DAY CELL) */}
                {dayNotes.length > 0 && (
                  <div className="mt-1 space-y-0.5 pt-1 border-t border-neutral-100">
                    {dayNotes.map((n) => (
                      <div
                        key={n.id}
                        className="group text-[9px] px-1 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between gap-0.5"
                        title={`Note: ${n.title}`}
                      >
                        <div className="flex items-center gap-1 truncate">
                          <span>{n.icon || '📝'}</span>
                          <span className="truncate font-medium">{n.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCalendarTaskNote(n.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 ml-0.5 font-bold"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking Feedback Notification */}
      {bookingSuccess && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 animate-in fade-in font-medium">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{bookingSuccess}</span>
          </div>
          <button onClick={() => setBookingSuccess(null)} className="text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Floating Bottom-Right Booking & Quota Popup */}
      {selectedShifts.length > 0 && !activeSwapSelection && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-3rem)] p-4 rounded-2xl bg-neutral-900/95 backdrop-blur-md text-white shadow-2xl animate-in slide-in-from-bottom-5 duration-300 border border-[#FFC067]/80 ring-2 ring-[#FFC067]/30">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#FFC067] text-neutral-950 font-bold text-xs flex items-center justify-center border border-[#F5B153]">
                  {selectedShifts.length}
                </span>
                <span className="text-xs font-bold text-white">
                  เลือกไว้ {selectedShifts.length} เวร
                </span>
              </div>

              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FFC067]/20 text-[#FFC067] font-semibold border border-[#FFC067]/40">
                เหลือโควต้า: {currentUserRemainingQuota} วัน
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto">
              {selectedShifts.map((s, idx) => (
                <span
                  key={`${s.date}-${s.type}-${idx}`}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-neutral-200 flex items-center gap-1 border border-white/10"
                >
                  <span>{s.date}</span>
                  <span className="text-[9px] text-[#FFC067] font-semibold">
                    ({s.type === 'daily' ? 'เช้า+เย็น' : 'อาบน้ำ'})
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleSelectShift(s)}
                    className="text-neutral-400 hover:text-white ml-0.5 font-bold"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={clearSelectedShifts}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                ล้างทั้งหมด
              </button>

              <button
                type="button"
                onClick={handleConfirmBatchBooking}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/60 active:bg-[#FFC067] text-neutral-950 text-xs font-bold shadow-lg transition-all border border-[#FFC067] cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-neutral-950" />
                <span>ยืนยันการจอง ({selectedShifts.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Floating Bottom-Right Shift Swap Popup with Note Box */}
      {activeSwapSelection && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-3rem)] p-4 rounded-2xl bg-neutral-900/95 backdrop-blur-md text-white shadow-2xl animate-in slide-in-from-bottom-5 duration-300 border border-[#FFC067]/80 ring-2 ring-[#FFC067]/30">
          <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#FFC067] text-neutral-950 font-bold text-xs flex items-center justify-center border border-[#F5B153]">
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-white">
                  ขอสลับเวรกับ {activeSwapSelection.targetUserIcon} {activeSwapSelection.targetUserName}
                </span>
              </div>

              <button
                type="button"
                onClick={cancelSwapSelection}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shift comparison info */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Target Shift */}
              <div className="p-2 rounded-xl bg-white/10 border border-white/10">
                <span className="text-[10px] text-[#FFC067] font-semibold block mb-1">
                  1. เวรของเพื่อนที่ขอแลก:
                </span>
                <span className="font-bold text-white block">{activeSwapSelection.targetDate}</span>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(['morning', 'evening', 'full_day'] as const).map((part) => (
                    <button
                      key={part}
                      type="button"
                      onClick={() => updateSwapSelectionPart(undefined, part)}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        activeSwapSelection.targetPart === part
                          ? 'bg-[#FFC067] text-neutral-950 font-bold'
                          : 'bg-white/10 text-neutral-300'
                      }`}
                    >
                      {part === 'morning' ? '☀️ เช้า' : part === 'evening' ? '🌙 เย็น' : '☀️🌙 ทั้งวัน'}
                    </button>
                  ))}
                </div>
              </div>

              {/* My Shift */}
              <div className="p-2 rounded-xl bg-white/10 border border-white/10">
                <span className="text-[10px] text-emerald-400 font-semibold block mb-1">
                  2. เวรของฉันที่จะนำไปแลก:
                </span>
                {activeSwapSelection.myDate ? (
                  <>
                    <span className="font-bold text-white block">{activeSwapSelection.myDate}</span>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(['morning', 'evening', 'full_day'] as const).map((part) => (
                        <button
                          key={part}
                          type="button"
                          onClick={() => updateSwapSelectionPart(part, undefined)}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            activeSwapSelection.myPart === part
                              ? 'bg-emerald-400 text-neutral-950 font-bold'
                              : 'bg-white/10 text-neutral-300'
                          }`}
                        >
                          {part === 'morning' ? '☀️ เช้า' : part === 'evening' ? '🌙 เย็น' : '☀️🌙 ทั้งวัน'}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <span className="text-[11px] text-[#FFC067] font-medium block animate-pulse">
                    &larr; คลิกเลือกวันในปฏิทิน
                  </span>
                )}
              </div>
            </div>

            {/* Note box for recipient */}
            <div>
              <label className="block text-[10px] text-neutral-300 mb-1 font-medium">
                ข้อความ / โน้ตถึงเพื่อนผู้รับคำขอ:
              </label>
              <input
                type="text"
                placeholder="เช่น ติดธุระด่วนตอนเย็น รบกวนสลับด้วยนะ..."
                value={activeSwapSelection.note || ''}
                onChange={(e) => updateSwapSelectionNote(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white placeholder-neutral-400 focus:bg-white/15 focus:outline-hidden"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={cancelSwapSelection}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleConfirmSwap}
                disabled={!activeSwapSelection.myDate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/60 active:bg-[#FFC067] text-neutral-950 text-xs font-bold shadow-lg transition-all disabled:opacity-40 border border-[#FFC067] cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-neutral-950" />
                <span>ยืนยันส่งคำขอสลับเวร</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Export PDF Button in Swap Duty tone */}
      <div className="mt-4 flex items-center justify-end">
        <button
          onClick={handleExportCalendarPdf}
          disabled={isExportingPdf}
          type="button"
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 active:bg-[#FFC067]/60 text-neutral-950 text-xs font-bold transition-all shadow-xs disabled:opacity-50 border border-[#FFC067]/70 cursor-pointer"
        >
          <FileDown className="w-4 h-4 text-neutral-950" />
          <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : 'Export PDF'}</span>
        </button>
      </div>

      {/* Add Task / Note Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-2xl bg-white border border-[#FFC067] shadow-2xl p-4 sm:p-5 overflow-hidden">
            <button
              onClick={() => setIsTaskModalOpen(false)}
              className="absolute top-3.5 right-3.5 p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{taskType === 'task' ? '📌' : '📝'}</span>
              <h3 className="text-sm font-bold text-neutral-900">
                {taskType === 'task' ? 'Add Task' : 'Add Note'}
              </h3>
            </div>

            {/* Type selector */}
            <div className="flex rounded-lg bg-[#FFF8EE] p-0.5 text-xs mb-3 border border-[#FFC067]/60">
              <button
                type="button"
                onClick={() => setTaskType('task')}
                className={`flex-1 py-1.5 font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  taskType === 'task' ? 'bg-[#FFC067] text-neutral-950 shadow-xs font-bold' : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                <Pin className="w-3 h-3" />
                <span>Task</span>
              </button>
              <button
                type="button"
                onClick={() => setTaskType('note')}
                className={`flex-1 py-1.5 font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  taskType === 'note' ? 'bg-[#FFC067] text-neutral-950 shadow-xs font-bold' : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                <StickyNote className="w-3 h-3" />
                <span>Note</span>
              </button>
            </div>

            <form onSubmit={handleCreateTaskNote} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  หัวข้อ / รายละเอียด *
                </label>
                <input
                  type="text"
                  required
                  placeholder={taskType === 'task' ? 'ตรวจสุขภาพ, ซื้ออาหาร...' : 'ให้ยาตอนเช้า, อาหารเปียก...'}
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-[#FFC067] focus:outline-hidden"
                />
              </div>

              {taskType === 'task' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                      วันเริ่มต้น *
                    </label>
                    <input
                      type="date"
                      required
                      value={taskStartDate}
                      onChange={(e) => setTaskStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-neutral-50 border border-neutral-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                      วันสิ้นสุด
                    </label>
                    <input
                      type="date"
                      required
                      value={taskEndDate}
                      onChange={(e) => setTaskEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-neutral-50 border border-neutral-200"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                    วันที่ *
                  </label>
                  <input
                    type="date"
                    required
                    value={taskStartDate}
                    onChange={(e) => setTaskStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-neutral-50 border border-neutral-200"
                  />
                </div>
              )}

              {/* Color & Icon */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div>
                  <label className="block text-[10px] text-neutral-500 mb-1">สีแถบ</label>
                  <div className="flex items-center gap-1.5">
                    {['#FFC067', '#10B981', '#2563EB', '#DB2777', '#8B5CF6'].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setTaskColor(col)}
                        className={`w-4 h-4 rounded-full border ${taskColor === col ? 'scale-125 border-neutral-900 ring-2 ring-[#FFC067]' : 'border-white'}`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-500 mb-1">ไอคอน</label>
                  <div className="flex items-center gap-1">
                    {['📌', '📝', '💊', '🍖', '💉', '✂️'].map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setTaskIcon(ic)}
                        className={`text-xs p-0.5 rounded ${taskIcon === ic ? 'bg-[#FFC067]/40 font-bold' : ''}`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 active:bg-[#FFC067] text-neutral-950 text-xs font-bold shadow-xs border border-[#FFC067]/70 cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
