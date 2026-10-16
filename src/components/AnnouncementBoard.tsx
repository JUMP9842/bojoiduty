import React, { useState, useEffect, useMemo } from 'react';
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
  Sparkles,
  Zap,
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

  // Form Fields
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

  // LINE Notification settings in Form
  const [enableLineNotify, setEnableLineNotify] = useState<boolean>(true);
  const [notifyOnPublish, setNotifyOnPublish] = useState<boolean>(true);
  const [scheduledNotificationTimes, setScheduledNotificationTimes] = useState<string[]>([]);
  const [newScheduleInput, setNewScheduleInput] = useState<string>('');
  const [scheduleInputError, setScheduleInputError] = useState<string | null>(null);
  const [enableDailyNotify, setEnableDailyNotify] = useState<boolean>(false);
  const [dailyNotifyTime, setDailyNotifyTime] = useState<string>('08:00');

  // Modal for setting notification time directly on an existing announcement card
  const [timingModalAnn, setTimingModalAnn] = useState<Announcement | null>(null);
  const [modalScheduleInput, setModalScheduleInput] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSavingModalTiming, setIsSavingModalTiming] = useState<boolean>(false);

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

  // Auto clear feedback banner after 7 seconds
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 7000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Heartbeat check for scheduled and daily notifications when app/board mounts or runs (for Vercel serverless reliability)
  useEffect(() => {
    const triggerNotificationsCheck = async () => {
      try {
        await safeFetchJson(getApiUrl('/api/line/announcement-notify'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ triggerAll: true }),
        });
      } catch (err) {
        console.warn('Background notification check error:', err);
      }
    };

    const initTimer = setTimeout(triggerNotificationsCheck, 2000);
    const interval = setInterval(triggerNotificationsCheck, 180000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, []);

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

  // Helper to format Date object into YYYY-MM-DDTHH:mm for datetime-local inputs
  const toInputDatetimeStr = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
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

  // Quick Preset Handlers for Start Time (เวลาเริ่มประกาศ)
  const handlePresetStartNow = () => setStartAtInput(toInputDatetimeStr(new Date()));
  const handlePresetStartToday = (hour: number) => {
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    setStartAtInput(toInputDatetimeStr(d));
  };
  const handlePresetStartTomorrow = (hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
    setStartAtInput(toInputDatetimeStr(d));
  };
  const handlePresetStartAddHours = (hours: number) => {
    const base = startAtInput ? new Date(startAtInput) : new Date();
    base.setTime(base.getTime() + hours * 3600 * 1000);
    setStartAtInput(toInputDatetimeStr(base));
  };

  // Quick Preset Handlers for End Time (ระยะเวลาแสดงประกาศ)
  const handlePresetEndAddDays = (days: number) => {
    const base = startAtInput ? new Date(startAtInput) : new Date();
    const end = new Date(base.getTime() + days * 24 * 3600 * 1000);
    setEndAtInput(toInputDatetimeStr(end));
  };

  // Quick Preset Handlers for Scheduled Notification Time in Form
  const handlePresetScheduleNow = () => setNewScheduleInput(toInputDatetimeStr(new Date()));
  const handlePresetScheduleToday = (hour: number) => {
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    setNewScheduleInput(toInputDatetimeStr(d));
  };
  const handlePresetScheduleTomorrow = (hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
    setNewScheduleInput(toInputDatetimeStr(d));
  };
  const handlePresetScheduleAddHours = (hours: number) => {
    const base = newScheduleInput ? new Date(newScheduleInput) : new Date();
    base.setTime(base.getTime() + hours * 3600 * 1000);
    setNewScheduleInput(toInputDatetimeStr(base));
  };

  // Open New Form
  const handleOpenNewForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    const d = new Date();
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    setBadge('');
    setStartAtInput('');
    setEndAtInput('');

    setEnableLineNotify(true);
    setNotifyOnPublish(true);
    setScheduledNotificationTimes([]);
    setNewScheduleInput('');
    setEnableDailyNotify(false);
    setDailyNotifyTime('08:00');
    setScheduleInputError(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEditForm = (item: Announcement) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setDate(item.date || new Date().toISOString().slice(0, 10));
    setBadge(item.badge || '');
    setStartAtInput(formatIsoToInput(item.startAt));
    setEndAtInput(formatIsoToInput(item.endAt));

    const isNotifyEnabled = item.lineNotifyOnPublish !== false || (!!item.lineNotifyScheduledAt && item.lineNotifyScheduledAt.length > 0) || !!item.dailyNotifyTime;
    setEnableLineNotify(!!isNotifyEnabled);
    setNotifyOnPublish(item.lineNotifyOnPublish !== false);
    setScheduledNotificationTimes((item.lineNotifyScheduledAt || []).map((s) => formatIsoToInput(s)));
    setEnableDailyNotify(!!item.dailyNotifyTime);
    setDailyNotifyTime(item.dailyNotifyTime || '08:00');
    setNewScheduleInput('');
    setScheduleInputError(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormError(null);
    setScheduleInputError(null);
  };

  // Add a new scheduled time in the form
  const handleAddScheduleTime = () => {
    setScheduleInputError(null);
    if (!newScheduleInput || !newScheduleInput.trim()) {
      setScheduleInputError('กรุณาเลือกวันและเวลาที่ต้องการให้แจ้งเตือน');
      return;
    }

    const slotIso = formatInputToThaiIso(newScheduleInput);
    if (!slotIso) {
      setScheduleInputError('รูปแบบวันและเวลาไม่ถูกต้อง');
      return;
    }

    const slotTs = new Date(slotIso).getTime();

    // Validate that slot is within announcement start/end window if specified
    const finalStartIso = formatInputToThaiIso(startAtInput);
    const finalEndIso = formatInputToThaiIso(endAtInput);

    if (finalEndIso) {
      const endTs = new Date(finalEndIso).getTime();
      if (slotTs > endTs) {
        setScheduleInputError(`เวลาแจ้งเตือน (${formatDisplayTime(slotIso)}) อยู่หลังเวลาสิ้นสุดประกาศ กรุณาเลือกเวลาในช่วงประกาศ`);
        return;
      }
    }

    if (finalStartIso) {
      const startTs = new Date(finalStartIso).getTime();
      // Allow 2 min skew
      if (slotTs + 120000 < startTs) {
        setScheduleInputError(`เวลาแจ้งเตือน (${formatDisplayTime(slotIso)}) อยู่ก่อนเวลาเริ่มประกาศ กรุณาเลือกเวลาในช่วงประกาศ`);
        return;
      }
    }

    if (scheduledNotificationTimes.includes(newScheduleInput)) {
      setScheduleInputError('มีเวลาแจ้งเตือนนี้ในรายการแล้ว');
      return;
    }

    setScheduledNotificationTimes((prev) => [...prev, newScheduleInput]);
    setNewScheduleInput('');
  };

  const handleRemoveScheduleTime = (idxToRemove: number) => {
    setScheduledNotificationTimes((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (!title.trim() || !content.trim()) {
      setFormError('กรุณากรอกหัวข้อและรายละเอียดประกาศ');
      setIsSubmitting(false);
      return;
    }

    const finalStartIso = formatInputToThaiIso(startAtInput);
    const finalEndIso = formatInputToThaiIso(endAtInput);

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

    // Convert scheduled times to Thai ISO
    const scheduledListIso: string[] = [];
    for (const slot of scheduledNotificationTimes) {
      const iso = formatInputToThaiIso(slot);
      if (iso && !scheduledListIso.includes(iso)) {
        scheduledListIso.push(iso);
      }
    }

    // Validate all scheduled times against endAt
    if (finalEndIso) {
      const endTs = new Date(finalEndIso).getTime();
      const exceeding = scheduledListIso.find((s) => new Date(s).getTime() > endTs);
      if (exceeding) {
        setFormError(`เวลาแจ้งเตือน (${formatDisplayTime(exceeding)}) อยู่หลังเวลาสิ้นสุดประกาศ กรุณาปรับเปลี่ยน`);
        setIsSubmitting(false);
        return;
      }
    }

    const lineNotifyOnPublish = enableLineNotify && notifyOnPublish;

    try {
      let savedAnn: Announcement;
      if (editingId) {
        const existing = announcements.find((a) => a.id === editingId);
        const updatedAnn: Announcement = {
          ...existing,
          id: editingId,
          title: title.trim(),
          content: content.trim(),
          date,
          badge: badge.trim() || undefined,
          startAt: finalStartIso,
          endAt: finalEndIso,
          lineNotifyOnPublish,
          lineNotifyScheduledAt: scheduledListIso,
          dailyNotifyTime: enableLineNotify && enableDailyNotify ? dailyNotifyTime : undefined,
          createdAt: existing?.createdAt || new Date().toISOString(),
          authorId: currentUser ? currentUser.id : 'guest',
          authorName: currentUser ? (currentUser.username || currentUser.name) : 'ผู้เยี่ยมชม',
          authorAvatar: currentUser?.avatar,
        };
        savedAnn = await updateAnnouncement(updatedAnn);
      } else {
        savedAnn = await addAnnouncement(
          title.trim(),
          content.trim(),
          date,
          badge.trim() || undefined,
          finalStartIso,
          finalEndIso,
          lineNotifyOnPublish,
          scheduledListIso,
          enableLineNotify && enableDailyNotify ? dailyNotifyTime : undefined
        );
      }

      // Collect eligible recipient LINE IDs
      const recipientUserIds = users
        .filter((u) => u.lineUserId && u.lineUserId.startsWith('U') && u.lineNotificationEnabled !== false)
        .map((u) => u.lineUserId as string);

      if (enableLineNotify) {
        // If notifyOnPublish is enabled, trigger immediate broadcast!
        if (notifyOnPublish) {
          const notifyRes = await safeFetchJson(getApiUrl('/api/line/announcement-notify'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              announcementId: savedAnn.id,
              announcement: savedAnn,
              recipientUserIds,
              force: true, // Force send now on publish
            }),
          });

          const sentCount = notifyRes.data?.sent ?? recipientUserIds.length;
          let feedbackMsg = `📢 บันทึกและส่งข้อความเข้า LINE OA สมาชิกแล้ว (${sentCount} คน)`;
          if (scheduledListIso.length > 0) {
            feedbackMsg += ` และตั้งเวลาเตือนเพิ่มอีก ${scheduledListIso.length} รอบ`;
          }
          setFeedback({ type: 'success', text: feedbackMsg });
        } else if (scheduledListIso.length > 0) {
          // If only scheduled times were chosen
          setFeedback({
            type: 'success',
            text: `⏰ บันทึกประกาศสำเร็จ! จะส่งข้อความแจ้งเตือนเข้า LINE OA เมื่อถึงเวลาที่เลือกไว้ (และยังอยู่ในช่วงประกาศ)`,
          });
        } else {
          setFeedback({ type: 'success', text: `✅ บันทึกประกาศสำเร็จเรียบร้อยแล้ว` });
        }
      } else {
        setFeedback({ type: 'success', text: `✅ บันทึกประกาศสำเร็จเรียบร้อยแล้ว (ไม่ส่ง LINE)` });
      }

      handleCloseForm();
    } catch (err: any) {
      setFormError('เกิดข้อผิดพลาดในการบันทึก: ' + (err?.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instant Manual Broadcast Action: Send Announcement to LINE Now
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

  // Open the "เลือกเวลาประกาศ" Modal for an announcement card
  const handleOpenTimingModal = (ann: Announcement) => {
    setTimingModalAnn(ann);
    setModalScheduleInput('');
    setModalError(null);
  };

  const handleCloseTimingModal = () => {
    setTimingModalAnn(null);
    setModalScheduleInput('');
    setModalError(null);
  };

  // Add scheduled notification time directly to an existing announcement
  const handleSaveModalScheduleTime = async () => {
    if (!timingModalAnn) return;
    setModalError(null);

    if (!modalScheduleInput || !modalScheduleInput.trim()) {
      setModalError('กรุณาเลือกวันและเวลาที่ต้องการให้แจ้งเตือน');
      return;
    }

    const slotIso = formatInputToThaiIso(modalScheduleInput);
    if (!slotIso) {
      setModalError('รูปแบบวันและเวลาไม่ถูกต้อง');
      return;
    }

    const slotTs = new Date(slotIso).getTime();

    // Check announcement start and end window
    if (timingModalAnn.endAt) {
      const endTs = new Date(timingModalAnn.endAt).getTime();
      if (slotTs > endTs) {
        setModalError(`เวลาที่เลือก (${formatDisplayTime(slotIso)}) อยู่หลังเวลาสิ้นสุดประกาศ กรุณาเลือกเวลาในช่วงประกาศ`);
        return;
      }
    }

    if (timingModalAnn.startAt) {
      const startTs = new Date(timingModalAnn.startAt).getTime();
      if (slotTs + 120000 < startTs) {
        setModalError(`เวลาที่เลือก (${formatDisplayTime(slotIso)}) อยู่ก่อนเวลาเริ่มประกาศ กรุณาเลือกเวลาในช่วงประกาศ`);
        return;
      }
    }

    const currentList = timingModalAnn.lineNotifyScheduledAt || [];
    if (currentList.includes(slotIso)) {
      setModalError('มีเวลาแจ้งเตือนนี้ในรายการแล้ว');
      return;
    }

    setIsSavingModalTiming(true);
    try {
      const updatedAnn: Announcement = {
        ...timingModalAnn,
        lineNotifyScheduledAt: [...currentList, slotIso],
      };
      await updateAnnouncement(updatedAnn);
      setTimingModalAnn(updatedAnn);
      setModalScheduleInput('');
      setFeedback({
        type: 'success',
        text: `⏰ บันทึกเวลาประกาศ ${formatDisplayTime(slotIso)} สำเร็จ! ระบบจะแจ้งเตือนลง LINE เมื่อถึงเวลานี้ (และยังอยู่ในช่วงประกาศ)`,
      });
    } catch (err: any) {
      setModalError('เกิดข้อผิดพลาดในการบันทึก: ' + (err?.message || String(err)));
    } finally {
      setIsSavingModalTiming(false);
    }
  };

  // Remove scheduled time from modal
  const handleRemoveModalScheduleTime = async (slotToRemove: string) => {
    if (!timingModalAnn) return;
    try {
      const currentList = timingModalAnn.lineNotifyScheduledAt || [];
      const updatedList = currentList.filter((s) => s !== slotToRemove);
      const updatedAnn: Announcement = {
        ...timingModalAnn,
        lineNotifyScheduledAt: updatedList,
      };
      await updateAnnouncement(updatedAnn);
      setTimingModalAnn(updatedAnn);
      setFeedback({
        type: 'info',
        text: `ลบเวลาแจ้งเตือนเรียบร้อยแล้ว`,
      });
    } catch (err: any) {
      setModalError('เกิดข้อผิดพลาดในการลบ: ' + (err?.message || String(err)));
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

  const activeLineMembersCount = useMemo(() => {
    return users.filter((u) => u.lineUserId && u.lineNotificationEnabled !== false).length;
  }, [users]);

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

      {/* Add / Edit Announcement Modal Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 p-4 sm:p-5 rounded-2xl bg-white border-2 border-[#FFC067] shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#FFC067]/30">
            <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-[#FFC067]" />
              <span className="font-extrabold text-sm text-neutral-950">
                {editingId ? 'แก้ไขและเผยแพร่ประกาศ (Publish)' : 'เขียนประกาศใหม่และเผยแพร่ (Publish)'}
              </span>
            </span>
            <span className="text-xs text-neutral-500">
              ผู้ประกาศ: <strong className="text-neutral-900">{currentUser ? (currentUser.username || currentUser.name) : 'ผู้เยี่ยมชม'}</strong>
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

          {/* SECTION 1: Web Display Time Window with Quick Preset Buttons */}
          <div className="p-3.5 mb-3 rounded-2xl bg-gradient-to-r from-amber-50/70 to-orange-50/60 border border-[#FFC067]/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950">
                <Timer className="w-4 h-4 text-[#F5B153]" />
                <span>กำหนดช่วงเวลาที่ต้องการให้แสดงบนหน้าเว็บ (Start - End)</span>
              </div>
              <span className="text-[10px] text-amber-800 font-medium">
                ซ่อนเมื่อหมดเวลา / ไม่บังคับ
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {/* Start At Input + Preset Buttons */}
              <div className="p-2.5 rounded-xl bg-white border border-amber-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-extrabold text-neutral-800 flex items-center gap-1">
                    <span>🟢 เริ่มแสดงบนเว็บ (Start At):</span>
                  </label>
                  {startAtInput && (
                    <button
                      type="button"
                      onClick={() => setStartAtInput('')}
                      className="text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer"
                    >
                      ✕ ล้างเวลา (เริ่มทันที)
                    </button>
                  )}
                </div>

                <input
                  type="datetime-local"
                  value={startAtInput}
                  onChange={(e) => setStartAtInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-neutral-50 border border-neutral-300 focus:border-[#FFC067] focus:bg-white focus:outline-hidden text-neutral-900"
                />

                {/* Preset Buttons for Start Time */}
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] font-bold text-neutral-500">
                    ⚡ ปุ่มเลือกเวลาเริ่มด่วน:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={handlePresetStartNow}
                      className="px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      ⚡ ตอนนี้
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetStartToday(18)}
                      className="px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      🌇 วันนี้ 18:00
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetStartTomorrow(8)}
                      className="px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      ☀️ พรุ่งนี้ 08:00
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetStartAddHours(1)}
                      className="px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      +1 ชม.
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetStartAddHours(3)}
                      className="px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      +3 ชม.
                    </button>
                  </div>
                </div>
              </div>

              {/* End At Input + Preset Buttons */}
              <div className="p-2.5 rounded-xl bg-white border border-amber-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-extrabold text-neutral-800 flex items-center gap-1">
                    <span>⌛ สิ้นสุดการแสดง (End At - ซ่อนเมื่อถึงเวลานี้):</span>
                  </label>
                  {endAtInput && (
                    <button
                      type="button"
                      onClick={() => setEndAtInput('')}
                      className="text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer"
                    >
                      ✕ ล้างเวลา (แสดงตลอด)
                    </button>
                  )}
                </div>

                <input
                  type="datetime-local"
                  value={endAtInput}
                  onChange={(e) => setEndAtInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-neutral-50 border border-neutral-300 focus:border-[#FFC067] focus:bg-white focus:outline-hidden text-neutral-900"
                />

                {/* Preset Buttons for End Time / Duration */}
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] font-bold text-neutral-500">
                    ⏱️ ปุ่มเลือกระยะเวลาประกาศ:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => handlePresetEndAddDays(1)}
                      className="px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      📅 24 ชม.
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetEndAddDays(3)}
                      className="px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      📅 3 วัน
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetEndAddDays(7)}
                      className="px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      📅 7 วัน
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetEndAddDays(14)}
                      className="px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      📅 14 วัน
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetEndAddDays(30)}
                      className="px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      📅 30 วัน
                    </button>
                    <button
                      type="button"
                      onClick={() => setEndAtInput('')}
                      className="px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      ♾️ ตลอดไป
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PROMINENT & DEDICATED LINE OA NOTIFICATION SETTINGS */}
          <div className="p-4 mb-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100/50 border-2 border-emerald-400 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-emerald-300/70 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#06C755] text-white flex items-center justify-center text-sm font-extrabold shadow-xs">
                  💬
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <span>การแจ้งเตือนประกาศเข้า LINE OA สมาชิก</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-bold">
                      {activeLineMembersCount} สมาชิกพร้อมรับ
                    </span>
                  </h4>
                  <p className="text-[10px] text-emerald-800 font-medium">
                    ส่งข้อความอัตโนมัติหาเพื่อนๆ ในทีมที่มีบัญชี LINE OA
                  </p>
                </div>
              </div>

              {/* Master Switch */}
              <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded-xl border border-emerald-300 shadow-xs">
                <input
                  type="checkbox"
                  checked={enableLineNotify}
                  onChange={(e) => setEnableLineNotify(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer accent-[#06C755]"
                />
                <span className="text-xs font-extrabold text-emerald-950">
                  {enableLineNotify ? 'เปิดส่ง LINE' : 'ปิดส่ง LINE'}
                </span>
              </label>
            </div>

            {enableLineNotify && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Checkbox: Send Immediately upon Publish */}
                <div className="p-3 bg-white rounded-xl border border-emerald-300 flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyOnPublish}
                      onChange={(e) => setNotifyOnPublish(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 accent-[#06C755] cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-extrabold text-neutral-900 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                        <span>ส่งข้อความเข้า LINE ทันทีเมื่อกดเผยแพร่ประกาศ (Publish Now)</span>
                      </div>
                      <p className="text-[10px] text-neutral-500">
                        ส่งข้อความบรอดแคสต์เข้า LINE สมาชิกทันทีที่บันทึกประกาศ
                      </p>
                    </div>
                  </label>
                </div>

                {/* DEDICATED BUTTON & SECTION: เลือกเวลาประกาศ (แจ้งเตือนลง LINE) */}
                <div className="p-3.5 bg-white rounded-xl border-2 border-emerald-500 space-y-2.5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="block text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#06C755]" />
                      <span>⏰ ปุ่มเลือกเวลาประกาศ (หากถึงเวลานี้ในช่วงประกาศ จะแจ้งเตือนลง LINE):</span>
                    </label>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full self-start sm:self-auto">
                      ส่งเมื่อถึงเวลา + ยังอยู่ในช่วงประกาศ
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="datetime-local"
                      value={newScheduleInput}
                      onChange={(e) => {
                        setNewScheduleInput(e.target.value);
                        setScheduleInputError(null);
                      }}
                      className="flex-1 px-3 py-2 text-xs font-bold rounded-lg bg-neutral-50 border border-neutral-300 focus:bg-white focus:border-[#06C755] focus:outline-hidden text-neutral-900 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={handleAddScheduleTime}
                      className="px-4 py-2 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ เพิ่มเวลาแจ้งเตือนนี้</span>
                    </button>
                  </div>

                  {scheduleInputError && (
                    <div className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>{scheduleInputError}</span>
                    </div>
                  )}

                  {/* Quick Preset Buttons */}
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] font-bold text-neutral-500">
                      ⚡ ปุ่มลัดเลือกเวลาด่วน:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={handlePresetScheduleNow}
                        className="px-2.5 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-[10px] font-bold border border-emerald-300 transition-all cursor-pointer"
                      >
                        ⚡ ตอนนี้
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetScheduleToday(18)}
                        className="px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold transition-all cursor-pointer"
                      >
                        🌇 วันนี้ 18:00
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetScheduleTomorrow(8)}
                        className="px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold transition-all cursor-pointer"
                      >
                        ☀️ พรุ่งนี้ 08:00
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetScheduleAddHours(1)}
                        className="px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold transition-all cursor-pointer"
                      >
                        +1 ชม.
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetScheduleAddHours(3)}
                        className="px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold transition-all cursor-pointer"
                      >
                        +3 ชม.
                      </button>
                      {startAtInput && (
                        <button
                          type="button"
                          onClick={() => setNewScheduleInput(startAtInput)}
                          className="px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-950 text-[10px] font-bold border border-amber-300 transition-all cursor-pointer"
                        >
                          📅 ตามเวลาเริ่มประกาศ (startAt)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List of Scheduled Notification Times */}
                  {scheduledNotificationTimes.length > 0 ? (
                    <div className="pt-2 border-t border-emerald-200 space-y-1.5">
                      <span className="text-[10px] font-extrabold text-emerald-950">
                        📋 คิวเวลาแจ้งเตือนที่ตั้งไว้ ({scheduledNotificationTimes.length} เวลา):
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {scheduledNotificationTimes.map((slot, idx) => (
                          <div
                            key={slot + idx}
                            className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold"
                          >
                            <div className="flex items-center gap-2">
                              <Bell className="w-3.5 h-3.5 text-emerald-600" />
                              <span>รอบที่ {idx + 1}: {formatDisplayTime(formatInputToThaiIso(slot))}</span>
                              <span className="text-[10px] font-medium text-emerald-700">
                                (แจ้งเตือนลง LINE เมื่อถึงเวลานี้ และยังอยู่ในช่วงประกาศ)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveScheduleTime(idx)}
                              className="text-neutral-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                              title="ลบเวลานี้"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-neutral-500 pt-1">
                      * สามารถกดปุ่มเพื่อเลือกวันและเวลาที่ต้องการให้ส่งข้อความ LINE แจ้งเตือนล่วงหน้าได้หลายเวลา
                    </p>
                  )}
                </div>

                {/* DEDICATED DAILY RECURRING NOTIFICATION SECTION */}
                <div className="p-3.5 bg-white rounded-xl border-2 border-emerald-500 space-y-2.5 shadow-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableDailyNotify}
                      onChange={(e) => setEnableDailyNotify(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 accent-[#06C755] cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-extrabold text-neutral-900 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>🔄 แจ้งเตือนซ้ำทุกวันเวลาเดียวกัน (Daily Recurring Notification)</span>
                      </div>
                      <p className="text-[10px] text-neutral-500">
                        ประกาศนี้จะแจ้งเตือนลง LINE ในเวลาที่กำหนดของทุกวัน จนกว่าจะหมดช่วงเวลาที่ต้องประกาศ (End At)
                      </p>
                    </div>
                  </label>

                  {enableDailyNotify && (
                    <div className="pl-6 space-y-2 pt-2 border-t border-emerald-200 animate-in fade-in duration-150">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label className="text-xs font-extrabold text-emerald-950">
                          เลือกเวลาแจ้งเตือนทุกวัน (เช่น 08:00 น.):
                        </label>
                        <input
                          type="time"
                          value={dailyNotifyTime}
                          onChange={(e) => setDailyNotifyTime(e.target.value)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-neutral-50 border border-neutral-300 focus:bg-white focus:border-[#06C755] text-neutral-900"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => setDailyNotifyTime('08:00')}
                          className="px-2.5 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-[10px] font-bold border border-emerald-300 cursor-pointer"
                        >
                          ⏰ 08:00 ทุกวัน
                        </button>
                        <button
                          type="button"
                          onClick={() => setDailyNotifyTime('12:00')}
                          className="px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold cursor-pointer"
                        >
                          ⏰ 12:00 ทุกวัน
                        </button>
                        <button
                          type="button"
                          onClick={() => setDailyNotifyTime('18:00')}
                          className="px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold cursor-pointer"
                        >
                          ⏰ 18:00 ทุกวัน
                        </button>
                      </div>
                      <p className="text-[10px] text-emerald-800 font-medium">
                        ✨ ตัวอย่าง: หากเลือกเวลา 08:00 ระบบจะส่งข้อความแจ้งเตือนเข้า LINE OA ทุกวันเวลา 08:00 น. จนถึงวันที่สิ้นสุดประกาศ
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar & Submit Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                placeholder="ป้ายกำกับ (เช่น สำคัญ, หมอนัด, อาหาร)"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg bg-neutral-50 border border-neutral-200 w-44 focus:bg-white focus:outline-hidden font-semibold"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseForm}
                className="px-3.5 py-2 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer font-semibold rounded-xl"
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
                    <span>
                      {editingId
                        ? '💾 บันทึกและเผยแพร่ (Publish)'
                        : '📢 เผยแพร่ประกาศ (Publish)'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* QUICK MODAL: ตั้งเวลาแจ้งเตือน LINE สำหรับประกาศใบที่เลือก */}
      {timingModalAnn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg p-5 rounded-2xl bg-white border-2 border-emerald-500 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-emerald-200 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  LINE Notification Scheduler
                </span>
                <h3 className="text-sm font-extrabold text-neutral-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#06C755]" />
                  <span>เลือกเวลาประกาศ (แจ้งเตือนลง LINE)</span>
                </h3>
                <p className="text-xs text-neutral-600 font-semibold mt-0.5">
                  ประกาศ: "{timingModalAnn.title}"
                </p>
              </div>
              <button
                onClick={handleCloseTimingModal}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Active Window */}
            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 font-semibold space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Timer className="w-3.5 h-3.5 text-[#F5B153]" />
                <span>ช่วงเวลาประกาศที่มีผล (Active Period):</span>
              </div>
              <div className="text-[11px] text-neutral-700 pl-5">
                <div>🟢 เริ่ม: {timingModalAnn.startAt ? formatDisplayTime(timingModalAnn.startAt) : 'เริ่มทันที'}</div>
                <div>⌛ สิ้นสุด: {timingModalAnn.endAt ? formatDisplayTime(timingModalAnn.endAt) : 'แสดงตลอดไป (ไม่มีวันหมดอายุ)'}</div>
              </div>
              <p className="text-[10px] text-neutral-500 pl-5 pt-0.5">
                * ระบบจะส่งข้อความลง LINE เมื่อถึงเวลาที่เลือกไว้ และต้องยังอยู่ในช่วงเวลาประกาศนี้เท่านั้น
              </p>
            </div>

            {/* List of currently scheduled times */}
            <div>
              <span className="block text-xs font-extrabold text-neutral-800 mb-1.5">
                เวลาแจ้งเตือนที่ตั้งไว้ในปัจจุบัน:
              </span>
              {timingModalAnn.lineNotifyScheduledAt && timingModalAnn.lineNotifyScheduledAt.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {timingModalAnn.lineNotifyScheduledAt.map((slot, idx) => (
                    <div
                      key={slot + idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-950"
                    >
                      <div className="flex items-center gap-2">
                        <Bell className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>รอบที่ {idx + 1}: {formatDisplayTime(slot)}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveModalScheduleTime(slot)}
                        className="text-neutral-400 hover:text-red-600 p-1 cursor-pointer"
                        title="ลบเวลานี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-neutral-50 border border-dashed border-neutral-300 text-center text-xs text-neutral-400">
                  ยังไม่ได้ตั้งเวลาแจ้งเตือนเพิ่มเติม (กดเลือกเวลาด้านล่างได้เลย)
                </div>
              )}
            </div>

            {modalError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Add new notification time */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
              <label className="block text-[11px] font-extrabold text-neutral-800">
                เลือกวันและเวลาที่ต้องการให้ส่งข้อความ LINE:
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="datetime-local"
                  value={modalScheduleInput}
                  onChange={(e) => {
                    setModalScheduleInput(e.target.value);
                    setModalError(null);
                  }}
                  className="flex-1 px-3 py-2 text-xs font-bold rounded-lg bg-white border border-neutral-300 focus:border-[#06C755] focus:outline-hidden text-neutral-900"
                />
                <button
                  type="button"
                  disabled={isSavingModalTiming}
                  onClick={handleSaveModalScheduleTime}
                  className="px-4 py-2 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isSavingModalTiming ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>+ บันทึกเวลานี้</span>
                </button>
              </div>

              {/* Quick Presets in Modal */}
              <div className="flex flex-wrap gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => setModalScheduleInput(toInputDatetimeStr(new Date()))}
                  className="px-2 py-0.5 rounded-md bg-white hover:bg-neutral-100 text-neutral-800 text-[10px] font-bold border border-neutral-200 cursor-pointer"
                >
                  ⚡ ตอนนี้
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setHours(18, 0, 0, 0);
                    setModalScheduleInput(toInputDatetimeStr(d));
                  }}
                  className="px-2 py-0.5 rounded-md bg-white hover:bg-neutral-100 text-neutral-800 text-[10px] font-bold border border-neutral-200 cursor-pointer"
                >
                  🌇 18:00
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    d.setHours(8, 0, 0, 0);
                    setModalScheduleInput(toInputDatetimeStr(d));
                  }}
                  className="px-2 py-0.5 rounded-md bg-white hover:bg-neutral-100 text-neutral-800 text-[10px] font-bold border border-neutral-200 cursor-pointer"
                >
                  ☀️ พรุ่งนี้ 08:00
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const base = modalScheduleInput ? new Date(modalScheduleInput) : new Date();
                    base.setTime(base.getTime() + 1 * 3600 * 1000);
                    setModalScheduleInput(toInputDatetimeStr(base));
                  }}
                  className="px-2 py-0.5 rounded-md bg-white hover:bg-neutral-100 text-neutral-800 text-[10px] font-bold border border-neutral-200 cursor-pointer"
                >
                  +1 ชม.
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const base = modalScheduleInput ? new Date(modalScheduleInput) : new Date();
                    base.setTime(base.getTime() + 3 * 3600 * 1000);
                    setModalScheduleInput(toInputDatetimeStr(base));
                  }}
                  className="px-2 py-0.5 rounded-md bg-white hover:bg-neutral-100 text-neutral-800 text-[10px] font-bold border border-neutral-200 cursor-pointer"
                >
                  +3 ชม.
                </button>
              </div>
            </div>

            {/* Instant Send Right Now Button */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  handleTriggerLineNow(timingModalAnn);
                  handleCloseTimingModal();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#06C755] text-xs font-bold border border-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ส่งข้อความเข้า LINE ตอนนี้ทันที (1 คลิก)</span>
              </button>

              <button
                type="button"
                onClick={handleCloseTimingModal}
                className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 cursor-pointer font-semibold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
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
                          {item.dailyNotifyTime && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-950 font-extrabold border border-emerald-400 flex items-center gap-1"
                              title={`แจ้งเตือนทุกวันเวลา ${item.dailyNotifyTime} น. จนกว่าจะหมดช่วงเวลาประกาศ`}
                            >
                              <span>🔄</span>
                              <span>ทุกวัน {item.dailyNotifyTime} น.</span>
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
                      <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleTriggerLineNow(item)}
                          disabled={isSendingThis}
                          title="กดส่งประกาศนี้เข้า LINE OA สมาชิกตอนนี้ทันที"
                          className="px-2 py-1 rounded-lg bg-[#06C755]/10 hover:bg-[#06C755]/20 text-[#06C755] text-[10px] font-extrabold border border-[#06C755]/40 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isSendingThis ? (
                            <Loader2 className="w-3 h-3 animate-spin text-[#06C755]" />
                          ) : (
                            <Send className="w-3 h-3 text-[#06C755]" />
                          )}
                          <span>ส่ง LINE ตอนนี้</span>
                        </button>

                        {/* Dedicated Button requested by user: เลือกเวลาประกาศ */}
                        <button
                          onClick={() => handleOpenTimingModal(item)}
                          title="เลือกเวลาประกาศ (แจ้งเตือนลง LINE เมื่อถึงเวลาและยังอยู่ในช่วงประกาศ)"
                          className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-[10px] font-extrabold border border-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Clock className="w-3 h-3 text-emerald-700" />
                          <span>เลือกเวลาประกาศ</span>
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
                      <div className="font-bold flex items-center justify-between text-emerald-800">
                        <div className="flex items-center gap-1">
                          <Bell className="w-3 h-3 text-emerald-600" />
                          <span>กำหนดเวลาเตือน LINE ({schedCount} ครั้ง):</span>
                        </div>
                        <button
                          onClick={() => handleOpenTimingModal(item)}
                          className="text-[9px] text-[#06C755] hover:underline font-extrabold cursor-pointer"
                        >
                          + เพิ่ม/จัดการเวลา
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.lineNotifyScheduledAt!.map((s, idx) => (
                          <span
                            key={s + idx}
                            className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-[9px] font-bold text-emerald-900"
                          >
                            #{idx + 1}: {formatDisplayTime(s)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    {item.authorAvatar ? (
                      <img
                        src={item.authorAvatar}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-[#FFC067] text-neutral-950 flex items-center justify-center text-[9px] font-bold">
                        {(item.authorName || 'B')[0]}
                      </div>
                    )}
                    <span>{item.authorName || 'สมาชิกทีม'}</span>
                  </div>

                  {/* Broadcast Now direct button */}
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenTimingModal(item)}
                        className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>เวลาประกาศ</span>
                      </button>
                      <button
                        onClick={() => handleTriggerLineNow(item)}
                        disabled={isSendingThis}
                        className="text-[10px] text-[#06C755] hover:text-[#05b34c] font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>ส่งข้อความเข้า LINE</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
