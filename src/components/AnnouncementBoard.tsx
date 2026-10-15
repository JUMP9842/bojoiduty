import React, { useState, useEffect } from 'react';
import { useDuty } from '../context/DutyContext';
import { Announcement } from '../types';
import { getApiUrl, safeFetchJson } from '../utils/apiUtils';
import {
  Megaphone,
  Plus,
  Trash2,
  Calendar,
  X,
  Tag,
  Clock,
  Edit2,
  CheckCircle,
  AlertCircle,
  Timer,
  Bell,
  Send,
  Loader2,
} from 'lucide-react';

export const AnnouncementBoard: React.FC = () => {
  const {
    announcements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    currentUser,
    users,
  } = useDuty();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [badge, setBadge] = useState('');
  const [startAtInput, setStartAtInput] = useState('');
  const [endAtInput, setEndAtInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // LINE Notification settings
  const [enableLineNotify, setEnableLineNotify] = useState<boolean>(true);
  const [sendTimingMode, setSendTimingMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledSendTime, setScheduledSendTime] = useState<string>(''); // Main scheduled send time
  const [additionalSlots, setAdditionalSlots] = useState<string[]>([]); // Extra reminder times
  const [extraSlotInput, setExtraSlotInput] = useState<string>('');
  const [slotError, setSlotError] = useState<string | null>(null);

  // Status & feedback banners
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSendingLineId, setIsSendingLineId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Real-time timer updating nowTimestamp every 30 seconds for minute-precise auto-expiry
  const [nowTimestamp, setNowTimestamp] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Auto clear feedback banner after 6 seconds
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 6000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const isAdmin = currentUser?.role === 'admin';

  // Helper to determine status: 'upcoming' | 'active' | 'expired'
  const getAnnouncementStatus = (
    item: Announcement,
    nowTs: number
  ): 'upcoming' | 'active' | 'expired' => {
    const startTs = item.startAt ? new Date(item.startAt).getTime() : 0;
    const endTs = item.endAt ? new Date(item.endAt).getTime() : Infinity;

    if (nowTs < startTs) return 'upcoming';
    if (nowTs > endTs) return 'expired';
    return 'active';
  };

  // Convert input value (YYYY-MM-DDTHH:mm) to Thailand ISO string (YYYY-MM-DDTHH:mm:00+07:00)
  const formatInputToThaiIso = (val: string): string | undefined => {
    if (!val || !val.trim()) return undefined;
    const trimmed = val.trim();
    if (trimmed.includes('+') || trimmed.endsWith('Z')) return trimmed;
    return `${trimmed}:00+07:00`;
  };

  // Convert ISO string back to datetime-local input value (YYYY-MM-DDTHH:mm)
  const formatIsoToInput = (isoStr?: string): string => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day}T${h}:${min}`;
    } catch {
      return '';
    }
  };

  const formatDisplayTime = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const day = d.getDate();
      const monthShort = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ][d.getMonth()];
      const yearStr = (d.getFullYear() + 543).toString().slice(-2);
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return `${day} ${monthShort} ${yearStr} เวลา ${timeStr} น.`;
    } catch {
      return isoStr;
    }
  };

  const handleOpenNewForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    const d = new Date();
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    setBadge('');
    setStartAtInput('');
    setEndAtInput('');

    // Default: enabled, send immediately
    setEnableLineNotify(true);
    setSendTimingMode('immediate');
    setScheduledSendTime('');
    setAdditionalSlots([]);
    setExtraSlotInput('');
    setSlotError(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item: Announcement) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setDate(item.date || new Date().toISOString().slice(0, 10));
    setBadge(item.badge || '');
    setStartAtInput(formatIsoToInput(item.startAt));
    setEndAtInput(formatIsoToInput(item.endAt));

    const isNotifyEnabled = item.lineNotifyOnPublish !== false || (!!item.lineNotifyScheduledAt && item.lineNotifyScheduledAt.length > 0);
    setEnableLineNotify(!!isNotifyEnabled);

    // If startAt is in the future or has scheduled slots
    const scheduledList = item.lineNotifyScheduledAt || [];
    if (scheduledList.length > 0) {
      setSendTimingMode('scheduled');
      setScheduledSendTime(formatIsoToInput(scheduledList[0]));
      setAdditionalSlots(scheduledList.slice(1).map((s) => formatIsoToInput(s)));
    } else if (item.startAt && new Date(item.startAt).getTime() > Date.now()) {
      setSendTimingMode('scheduled');
      setScheduledSendTime(formatIsoToInput(item.startAt));
      setAdditionalSlots([]);
    } else {
      setSendTimingMode('immediate');
      setScheduledSendTime('');
      setAdditionalSlots([]);
    }

    setExtraSlotInput('');
    setSlotError(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormError(null);
    setSlotError(null);
  };

  const handleAddExtraSlot = () => {
    setSlotError(null);
    if (!extraSlotInput || !extraSlotInput.trim()) {
      setSlotError('กรุณาเลือกวันที่และเวลาที่ต้องการเพิ่ม');
      return;
    }

    const slotIso = formatInputToThaiIso(extraSlotInput);
    if (!slotIso) {
      setSlotError('รูปแบบวันที่และเวลาไม่ถูกต้อง');
      return;
    }

    if (additionalSlots.includes(extraSlotInput) || scheduledSendTime === extraSlotInput) {
      setSlotError('มีเวลาแจ้งเตือนนี้ในรายการแล้ว');
      return;
    }

    setAdditionalSlots((prev) => [...prev, extraSlotInput]);
    setExtraSlotInput('');
  };

  const handleRemoveExtraSlot = (idxToRemove: number) => {
    setAdditionalSlots((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (!title.trim() || !content.trim()) {
      setFormError('กรุณากรอกหัวข้อและรายละเอียดประกาศ');
      setIsSubmitting(false);
      return;
    }

    let finalStartIso = formatInputToThaiIso(startAtInput);
    const finalEndIso = formatInputToThaiIso(endAtInput);

    // If user selected "scheduled" send time but startAtInput was empty, sync startAt with scheduledSendTime
    if (enableLineNotify && sendTimingMode === 'scheduled') {
      if (!scheduledSendTime || !scheduledSendTime.trim()) {
        setFormError('กรุณาเลือกวันและเวลาที่ต้องการให้ส่ง LINE ในช่องที่ระบุ');
        setIsSubmitting(false);
        return;
      }
      const schedIso = formatInputToThaiIso(scheduledSendTime);
      if (!finalStartIso && schedIso) {
        finalStartIso = schedIso;
      }
    }

    // Validate start vs end
    if (finalStartIso && finalEndIso) {
      const startTs = new Date(finalStartIso).getTime();
      const endTs = new Date(finalEndIso).getTime();
      if (endTs <= startTs) {
        setFormError('เวลาสิ้นสุดการแสดงผลต้องอยู่หลังเวลาเริ่มต้น');
        setIsSubmitting(false);
        return;
      }
    }

    // Compile lineNotifyScheduledAt list
    const scheduledListIso: string[] = [];
    if (enableLineNotify && sendTimingMode === 'scheduled' && scheduledSendTime) {
      const iso = formatInputToThaiIso(scheduledSendTime);
      if (iso) scheduledListIso.push(iso);
    }
    for (const extra of additionalSlots) {
      const iso = formatInputToThaiIso(extra);
      if (iso && !scheduledListIso.includes(iso)) {
        scheduledListIso.push(iso);
      }
    }

    // Validate that scheduled times do not exceed endAt if endAt is set
    if (finalEndIso) {
      const endTs = new Date(finalEndIso).getTime();
      const exceeding = scheduledListIso.find((s) => new Date(s).getTime() > endTs);
      if (exceeding) {
        setFormError(`เวลาแจ้งเตือน (${formatDisplayTime(exceeding)}) อยู่หลังเวลาสิ้นสุดประกาศ กรุณาปรับเปลี่ยน`);
        setIsSubmitting(false);
        return;
      }
    }

    const lineNotifyOnPublish = enableLineNotify && sendTimingMode === 'immediate';

    try {
      if (editingId) {
        const existing = announcements.find((a) => a.id === editingId);
        if (existing) {
          const updatedAnn: Announcement = {
            ...existing,
            title: title.trim(),
            content: content.trim(),
            date,
            badge: badge.trim() || undefined,
            startAt: finalStartIso,
            endAt: finalEndIso,
            lineNotifyOnPublish,
            lineNotifyScheduledAt: scheduledListIso,
          };
          await updateAnnouncement(updatedAnn);
        }
      } else {
        await addAnnouncement(
          title.trim(),
          content.trim(),
          date,
          badge.trim() || undefined,
          finalStartIso,
          finalEndIso,
          lineNotifyOnPublish,
          scheduledListIso
        );
      }

      const activeMemberCount = users.filter((u) => u.lineUserId && u.lineNotificationEnabled !== false).length;
      if (enableLineNotify) {
        if (sendTimingMode === 'immediate') {
          setFeedback({
            type: 'success',
            text: `📢 บันทึกและเผยแพร่สำเร็จ! ส่งแจ้งเตือนเข้า LINE OA สมาชิกแล้ว (${activeMemberCount} คน)`,
          });
        } else {
          setFeedback({
            type: 'success',
            text: `⏰ บันทึกสำเร็จ! ตั้งเวลาส่งแจ้งเตือน LINE วันที่ ${formatDisplayTime(scheduledListIso[0])} เรียบร้อยแล้ว`,
          });
        }
      } else {
        setFeedback({
          type: 'success',
          text: `✅ บันทึกประกาศสำเร็จเรียบร้อยแล้ว`,
        });
      }

      handleCloseForm();
    } catch (err: any) {
      setFormError('เกิดข้อผิดพลาดในการบันทึก: ' + (err?.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin Manual Action: Send Announcement to LINE Now
  const handleTriggerLineNow = async (ann: Announcement) => {
    setIsSendingLineId(ann.id);
    try {
      const recipientUserIds = users
        .filter((u) => u.lineUserId && u.lineUserId.startsWith('U') && u.lineNotificationEnabled !== false)
        .map((u) => u.lineUserId as string);

      if (recipientUserIds.length === 0) {
        setFeedback({
          type: 'info',
          text: '⚠️ ยังไม่มีสมาชิกที่เชื่อมต่อบัญชี LINE OA ในระบบ',
        });
        return;
      }

      const res = await safeFetchJson(getApiUrl('/api/line/announcement-notify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcementId: ann.id,
          announcement: ann,
          recipientUserIds,
          force: true,
        }),
      });

      if (res.ok && res.data?.success) {
        setFeedback({
          type: 'success',
          text: `💬 ส่งข้อความประกาศ "${ann.title}" เข้า LINE OA สมาชิกเรียบร้อยแล้ว (${recipientUserIds.length} คน)`,
        });
      } else {
        setFeedback({
          type: 'error',
          text: `⚠️ ไม่สามารถส่ง LINE ได้: ${res.data?.reason || res.data?.error || 'ข้อผิดพลาด'}`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `❌ เกิดข้อผิดพลาด: ${err?.message || 'Network error'}`,
      });
    } finally {
      setIsSendingLineId(null);
    }
  };

  // Filter announcements for current user view
  // Admin sees all (active, upcoming, expired), Members see ONLY active
  const visibleAnnouncements = announcements.filter((item) => {
    const status = getAnnouncementStatus(item, nowTimestamp);
    if (isAdmin) return true;
    return status === 'active';
  });

  const activeCount = announcements.filter(
    (a) => getAnnouncementStatus(a, nowTimestamp) === 'active'
  ).length;

  return (
    <section className="mb-8">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#FFC067] text-neutral-950 flex items-center justify-center text-xs shadow-xs border border-[#F5B153] font-bold">
            <Megaphone className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-bold tracking-tight text-neutral-900 uppercase">
            Announcements & Notice
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#FFF8EE] text-neutral-950 font-bold border border-[#FFC067]/70">
            {activeCount} กำลังเผยแพร่ {isAdmin && `(รวมทั้งหมด ${announcements.length})`}
          </span>
        </div>

        {isAdmin && (
          <button
            onClick={isFormOpen ? handleCloseForm : handleOpenNewForm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 text-neutral-950 text-xs font-bold border border-[#FFC067]/70 shadow-xs transition-colors cursor-pointer"
          >
            {isFormOpen ? (
              <>
                <X className="w-3.5 h-3.5 text-neutral-950" />
                <span>ปิดฟอร์ม</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-neutral-950" />
                <span>เพิ่มประกาศใหม่</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Instant Feedback Banner */}
      {feedback && (
        <div
          className={`mb-3.5 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : feedback.type === 'error'
              ? 'bg-red-50 border-red-300 text-red-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <Bell className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Add / Edit Announcement Modal or Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 p-4 sm:p-5 rounded-2xl bg-white border-2 border-[#FFC067] shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#FFC067]/30">
            <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-[#FFC067]" />
              <span>{editingId ? 'แก้ไขและเผยแพร่ประกาศ (Publish)' : 'เขียนประกาศใหม่และเผยแพร่ (Publish)'}</span>
            </span>
            <span className="text-xs text-neutral-400">
              ผู้ประกาศ: <strong className="text-neutral-800">{currentUser ? (currentUser.username || currentUser.name) : 'ผู้เยี่ยมชม'}</strong>
            </span>
          </div>

          {formError && (
            <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                หัวข้อประกาศ *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น นัดพาไปตัดขน, อาหารเปียกหมดแล้ว..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-[#FFC067] focus:outline-hidden font-semibold transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                วันที่เกี่ยวข้อง *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-[#FFC067] focus:outline-hidden font-semibold transition-colors"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[11px] font-bold text-neutral-700 mb-1">
              รายละเอียดประกาศ *
            </label>
            <textarea
              required
              rows={2}
              placeholder="ระบุข้อความแจ้งเตือน รายละเอียดขั้นตอน หรือสิ่งที่เพื่อนๆ ในบ้านต้องทราบ..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-[#FFC067] focus:outline-hidden resize-none font-semibold transition-colors"
            />
          </div>

          {/* Web Display Time Window */}
          <div className="p-3 mb-3 rounded-xl bg-amber-50/60 border border-[#FFC067]/40 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Timer className="w-3.5 h-3.5 text-[#FFC067]" />
              <span>ช่วงเวลาที่ต้องการให้แสดงบนหน้าเว็บ (ซ่อนเมื่อหมดเวลา / ไม่บังคับ):</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                  เริ่มแสดงบนหน้าเว็บ (Start At - หากเว้นว่างจะเริ่มทันที)
                </label>
                <input
                  type="datetime-local"
                  value={startAtInput}
                  onChange={(e) => setStartAtInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white border border-neutral-200 focus:border-[#FFC067] focus:outline-hidden text-neutral-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                  สิ้นสุดการแสดง (End At - ซ่อนเมื่อถึงเวลานี้)
                </label>
                <input
                  type="datetime-local"
                  value={endAtInput}
                  onChange={(e) => setEndAtInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white border border-neutral-200 focus:border-[#FFC067] focus:outline-hidden text-neutral-800"
                />
              </div>
            </div>
            <p className="text-[10px] text-neutral-500 font-medium">
              * หากไม่ระบุช่วงเวลา ประกาศจะแสดงตลอดเวลาเป็นปกติ
            </p>
          </div>

          {/* DEDICATED & EXPLICIT LINE NOTIFICATION SETTINGS */}
          <div className="p-4 mb-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-400 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#06C755] text-white flex items-center justify-center text-xs font-extrabold shadow-xs">
                  💬
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-950">
                    การแจ้งเตือนประกาศเข้า LINE OA สมาชิก
                  </h4>
                  <p className="text-[10px] text-emerald-800 font-medium">
                    ส่งข้อความอัตโนมัติหาเพื่อนๆ ในทีมที่มีบัญชี LINE OA
                  </p>
                </div>
              </div>

              {/* Master Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableLineNotify}
                  onChange={(e) => setEnableLineNotify(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer accent-[#06C755]"
                />
                <span className="text-xs font-bold text-emerald-900">
                  {enableLineNotify ? 'เปิดส่ง LINE' : 'ปิดส่ง LINE'}
                </span>
              </label>
            </div>

            {enableLineNotify && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* 1. Choice of Send Time */}
                <div>
                  <label className="block text-[11px] font-extrabold text-neutral-800 mb-1.5">
                    1. เลือกเวลาที่ต้องการให้ส่งข้อความ LINE:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Option A: Send Immediately upon Publish */}
                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        sendTimingMode === 'immediate'
                          ? 'bg-white border-[#06C755] shadow-xs ring-1 ring-[#06C755]'
                          : 'bg-white/80 border-neutral-200 hover:border-emerald-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sendTimingMode"
                        value="immediate"
                        checked={sendTimingMode === 'immediate'}
                        onChange={() => setSendTimingMode('immediate')}
                        className="mt-0.5 accent-[#06C755] cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-extrabold text-neutral-900 flex items-center gap-1">
                          <span>⚡ ส่งทันทีเมื่อกดเผยแพร่ (Publish)</span>
                        </span>
                        <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight">
                          ส่งข้อความประกาศเข้า LINE ของสมาชิกทุกคนทันทีที่กดบันทึก
                        </p>
                      </div>
                    </label>

                    {/* Option B: Choose specific Date and Time */}
                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        sendTimingMode === 'scheduled'
                          ? 'bg-white border-[#06C755] shadow-xs ring-1 ring-[#06C755]'
                          : 'bg-white/80 border-neutral-200 hover:border-emerald-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sendTimingMode"
                        value="scheduled"
                        checked={sendTimingMode === 'scheduled'}
                        onChange={() => setSendTimingMode('scheduled')}
                        className="mt-0.5 accent-[#06C755] cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-extrabold text-neutral-900 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>⏰ กำหนดวันและเวลาที่ต้องการให้ส่ง</span>
                        </span>
                        <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight">
                          ระบุวันที่และชั่วโมง:นาทีที่ต้องการให้บอทส่งแจ้งเตือน
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* PROMINENT DATETIME INPUT PICKER (when scheduled timing selected) */}
                {sendTimingMode === 'scheduled' && (
                  <div className="p-3 bg-white rounded-xl border-2 border-emerald-500 space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                    <label className="block text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#06C755]" />
                      <span>ช่องเลือกวันและเวลาที่ต้องการให้ส่ง LINE *:</span>
                    </label>
                    <input
                      type="datetime-local"
                      required={sendTimingMode === 'scheduled'}
                      value={scheduledSendTime}
                      onChange={(e) => setScheduledSendTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-neutral-50 border border-neutral-300 focus:bg-white focus:border-[#06C755] focus:outline-hidden text-neutral-900"
                    />
                    <p className="text-[10px] text-emerald-700 font-medium">
                      * บอทจะรอส่งเข้า LINE OA ของสมาชิกทุกคนอัตโนมัติเมื่อถึงเวลานี้
                    </p>
                  </div>
                )}

                {/* 2. Additional reminder slots */}
                <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-neutral-800 flex items-center gap-1">
                      <Bell className="w-3.5 h-3.5 text-emerald-600" />
                      <span>2. ต้องการตั้งเวลาส่งเตือนซ้ำอีกหรือไม่? (ไม่บังคับ / เพิ่มได้หลายรอบ):</span>
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="datetime-local"
                      value={extraSlotInput}
                      onChange={(e) => {
                        setExtraSlotInput(e.target.value);
                        setSlotError(null);
                      }}
                      className="flex-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-50 border border-neutral-300 focus:border-emerald-500 focus:bg-white focus:outline-hidden text-neutral-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddExtraSlot}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ เพิ่มเวลาเตือนอีก</span>
                    </button>
                  </div>

                  {slotError && (
                    <div className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                      <span>{slotError}</span>
                    </div>
                  )}

                  {/* List of additional slots */}
                  {additionalSlots.length > 0 && (
                    <div className="pt-1.5 space-y-1">
                      <span className="text-[10px] font-bold text-neutral-600">
                        รอบเตือนเพิ่มเติม ({additionalSlots.length} รอบ):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {additionalSlots.map((slot, idx) => (
                          <div
                            key={slot + idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-950 text-[10px] font-bold"
                          >
                            <Clock className="w-3 h-3 text-emerald-700" />
                            <span>รอบที่ {idx + 1}: {formatDisplayTime(formatInputToThaiIso(slot))}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExtraSlot(idx)}
                              className="ml-1 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="ลบเวลานี้"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-neutral-950" />
              <input
                type="text"
                placeholder="ป้ายกำกับ (เช่น สำคัญ, หมอนัด)"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg bg-neutral-50 border border-neutral-200 w-44 focus:bg-white focus:outline-hidden font-semibold"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCloseForm}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-[#06C755] hover:bg-[#05b34c] active:scale-95 text-white text-xs font-extrabold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึกและส่ง LINE...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{editingId ? '💾 บันทึกและเผยแพร่ (Publish)' : '📢 เผยแพร่ประกาศ (Publish)'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Announcements List / Cards */}
      {visibleAnnouncements.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white border border-dashed border-[#FFC067]/70 text-center">
          <p className="text-xs text-neutral-400 font-semibold">
            {announcements.length > 0
              ? 'ขณะนี้ยังไม่มีประกาศที่มีผลบังคับใช้ (ประกาศก่อนหน้าล่วงเวลา/หมดอายุแล้ว)'
              : 'ยังไม่มีประกาศในขณะนี้ คลิก "เพิ่มประกาศใหม่" เพื่อแจ้งเตือนเพื่อนๆ'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {visibleAnnouncements.map((item) => {
            const status = getAnnouncementStatus(item, nowTimestamp);
            const hasPublishLine = item.lineNotifyOnPublish !== false;
            const schedCount = Array.isArray(item.lineNotifyScheduledAt) ? item.lineNotifyScheduledAt.length : 0;
            const isSendingThis = isSendingLineId === item.id;

            return (
              <div
                key={item.id}
                className={`group relative flex flex-col justify-between p-4 rounded-2xl bg-white border transition-all ${
                  status === 'expired'
                    ? 'border-neutral-300 opacity-60 bg-neutral-50'
                    : status === 'upcoming'
                    ? 'border-blue-300 bg-blue-50/30'
                    : 'border-[#FFC067]/60 hover:border-[#FFC067] shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Badge for announcement theme */}
                      {item.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FFF8EE] text-neutral-950 font-bold border border-[#FFC067]/60">
                          {item.badge}
                        </span>
                      )}

                      {/* Status Badges for Admin */}
                      {isAdmin && (
                        <>
                          {status === 'upcoming' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-extrabold border border-blue-300 flex items-center gap-1">
                              <Timer className="w-3 h-3 text-blue-600" />
                              <span>รอเผยแพร่</span>
                            </span>
                          )}
                          {status === 'expired' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-100 text-red-900 font-extrabold border border-red-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-red-600" />
                              <span>หมดอายุแล้ว</span>
                            </span>
                          )}
                          {status === 'active' && (item.startAt || item.endAt) && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-extrabold border border-emerald-300 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>กำลังเผยแพร่</span>
                            </span>
                          )}
                          {hasPublishLine && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1"
                              title="ส่งแจ้งเตือนเข้า LINE OA อัตโนมัติเมื่อเริ่มเผยแพร่"
                            >
                              <span>💬</span>
                              <span>LINE เผยแพร่</span>
                            </span>
                          )}
                          {schedCount > 0 && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1"
                              title={`ตั้งเวลาส่ง LINE เพิ่มเติม ${schedCount} เวลา`}
                            >
                              <Bell className="w-3 h-3 text-emerald-600" />
                              <span>เตือน {schedCount} เวลา</span>
                            </span>
                          )}
                        </>
                      )}

                      <span className="flex items-center gap-1 text-[11px] text-neutral-400 font-medium">
                        <Calendar className="w-3 h-3" />
                        {item.date}
                      </span>
                    </div>

                    {/* Admin Actions: Edit/Extend & Delete & Test Send LINE */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleTriggerLineNow(item)}
                          disabled={isSendingThis}
                          title="กดส่งประกาศนี้เข้า LINE OA สมาชิกตอนนี้ทันที"
                          className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isSendingThis ? (
                            <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                          ) : (
                            <Send className="w-3 h-3 text-emerald-600" />
                          )}
                          <span>ส่ง LINE ทันที</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditForm(item)}
                          title="แก้ไข / ขยายเวลาประกาศนี้"
                          className="p-1 rounded-lg text-neutral-500 hover:text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => deleteAnnouncement(item.id)}
                          title="ลบประกาศนี้"
                          className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-neutral-900 mb-1.5 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed line-clamp-3 mb-3">
                    {item.content}
                  </p>

                  {/* Active Time Window details if set */}
                  {(item.startAt || item.endAt) && (
                    <div className="mb-2 p-2 rounded-xl bg-neutral-100/80 border border-neutral-200 text-[10px] font-semibold text-neutral-600 flex flex-col gap-0.5">
                      {item.startAt && (
                        <div>
                          <span>🟢 เริ่ม: </span>
                          <span className="font-bold text-neutral-800">{formatDisplayTime(item.startAt)}</span>
                        </div>
                      )}
                      {item.endAt && (
                        <div>
                          <span>⌛ สิ้นสุด: </span>
                          <span className="font-bold text-neutral-800">{formatDisplayTime(item.endAt)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin Scheduled LINE notice times preview */}
                  {isAdmin && schedCount > 0 && (
                    <div className="mb-2 p-2 rounded-xl bg-emerald-50/80 border border-emerald-200 text-[10px] text-emerald-900 flex flex-col gap-1">
                      <div className="font-bold flex items-center gap-1 text-emerald-800">
                        <Bell className="w-3 h-3 text-emerald-600" />
                        <span>กำหนดการเตือน LINE ({schedCount} ครั้ง):</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.lineNotifyScheduledAt!.map((s, idx) => (
                          <span
                            key={s + idx}
                            className="px-1.5 py-0.5 bg-white rounded border border-emerald-200 font-semibold text-[9px]"
                          >
                            {formatDisplayTime(s)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Author name on bottom-left */}
                <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 font-medium">
                    <div className="w-4 h-4 rounded-full bg-[#FFF8EE] text-neutral-950 flex items-center justify-center text-[9px] font-bold border border-[#FFC067]/60">
                      {item.authorName.charAt(0).toUpperCase()}
                    </div>
                    <span>{item.authorName}</span>
                  </div>

                  <span className="text-[10px] text-neutral-400 font-semibold">
                    {new Date(item.createdAt).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
