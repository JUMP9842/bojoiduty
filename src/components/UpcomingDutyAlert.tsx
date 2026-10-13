import React, { useState, useMemo } from 'react';
import { useDuty } from '../context/DutyContext';
import { getShiftMorningUserId, getShiftEveningUserId } from '../utils/shiftUtils';
import { getApiUrl } from '../utils/apiUtils';
import {
  Bell,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export const UpcomingDutyAlert: React.FC = () => {
  const { currentUser, shifts } = useDuty();

  const [isSending, setIsSending] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);

  // Calculate upcoming shifts for the current user in the next 7 days
  const upcomingDuties = useMemo(() => {
    if (!currentUser) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items: Array<{
      dateStr: string;
      formattedDate: string;
      type: 'daily' | 'bathing';
      parts: string[];
      daysAway: number;
      note?: string;
    }> = [];

    for (let i = 0; i <= 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);

      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const formattedDate = targetDate.toLocaleDateString('th-TH', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });

      // Check daily shift
      const daily = shifts.find((s) => s.date === dateStr && s.type === 'daily');
      if (daily) {
        const mUserId = getShiftMorningUserId(daily);
        const eUserId = getShiftEveningUserId(daily);
        const isMorning = mUserId === currentUser.id;
        const isEvening = eUserId === currentUser.id;

        if (isMorning || isEvening) {
          const parts: string[] = [];
          if (isMorning && isEvening) parts.push('เต็มวัน (เช้า+เย็น)');
          else if (isMorning) parts.push('☀️ เช้า (08:00 - 12:00)');
          else if (isEvening) parts.push('🌙 เย็น (16:00 - 20:00)');

          items.push({
            dateStr,
            formattedDate,
            type: 'daily',
            parts,
            daysAway: i,
            note: daily.notes || '',
          });
        }
      }

      // Check bathing shift
      const bathing = shifts.find((s) => s.date === dateStr && s.type === 'bathing');
      if (bathing && bathing.userId === currentUser.id) {
        items.push({
          dateStr,
          formattedDate,
          type: 'bathing',
          parts: ['🛁 อาบน้ำดูแลสุนัข'],
          daysAway: i,
          note: bathing.notes || '',
        });
      }
    }

    return items;
  }, [currentUser, shifts]);

  if (!currentUser) return null;

  const handleSendLineNotification = async () => {
    if (!currentUser.lineUserId) {
      setNotificationStatus({
        type: 'error',
        msg: 'กรุณาตั้งค่าเชื่อมต่อ LINE User ID ของคุณในเมนูการตั้งค่าโปรไฟล์ (ปุ่มโปรไฟล์/ตั้งค่าด้านบนขวา) ก่อนส่งแจ้งเตือน',
      });
      return;
    }

    setIsSending(true);
    setNotificationStatus(null);

    try {
      const dutySummary = upcomingDuties
        .map((d) => {
          const label = d.daysAway === 0 ? 'วันนี้' : d.daysAway === 1 ? 'พรุ่งนี้' : `อีก ${d.daysAway} วัน`;
          let text = `📅 ${label} (${d.formattedDate}): ${d.parts.join(', ')}`;
          if (d.note) {
            text += `\n   📝 โน้ต: ${d.note}`;
          }
          return text;
        })
        .join('\n\n');

      const messageText =
        `🐶 [BojoiDuty Notification]\n` +
        `สวัสดีครับคุณ ${currentUser.nickname || currentUser.name}\n` +
        `แจ้งเตือนตารางเวรที่ใกล้จะถึงของคุณ:\n\n` +
        (dutySummary || 'ไม่มีเวรใน 7 วันนี้') +
        `\n\n✨ สู้ ๆ นะครับ น้องหมารออยู่! 🐾\nเข้าดูปฏิทินแบบเต็มได้ที่เว็บไซต์ BojoiDuty`;

      const res = await fetch(getApiUrl('/api/line/push-notification'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: currentUser.lineUserId,
          messageText,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotificationStatus({
          type: 'success',
          msg: 'ส่งแจ้งเตือนตารางเวร (พร้อมโน้ต) เข้า LINE ของคุณสำเร็จเรียบร้อย!',
        });
      } else {
        setNotificationStatus({
          type: 'error',
          msg: data.error || 'ไม่สามารถส่งข้อความได้ กรุณาตรวจสอบการตั้งค่า LINE Tokens',
        });
      }
    } catch (err: any) {
      setNotificationStatus({
        type: 'error',
        msg: 'เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleTriggerScheduledReminders = async () => {
    setIsSending(true);
    setNotificationStatus(null);

    try {
      const res = await fetch(getApiUrl('/api/line/trigger-scheduled-reminders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotificationStatus({
          type: 'success',
          msg: `🎉 ตรวจสอบและส่งการแจ้งเตือนสเกตดูลล่วงหน้า (D-3, D-1, วันนี้พร้อมโน้ตและประกาศ) ไปแล้ว ${data.sentCount} ข้อความ`,
        });
      } else {
        setNotificationStatus({
          type: 'error',
          msg: data.error || data.reason || 'ไม่สามารถประมวลผลการแจ้งเตือนสเกตดูลได้',
        });
      }
    } catch (err: any) {
      setNotificationStatus({
        type: 'error',
        msg: 'เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 border-2 border-[#06C755]/40 shadow-sm p-4 sm:p-5 relative overflow-hidden backdrop-blur-xs">
      {/* Background Decorative Pattern */}
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-[#06C755]/10 blur-xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        {/* Left Info: Current User & Duty Status */}
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#06C755] text-white text-[11px] font-extrabold shadow-xs">
              <Bell className="w-3.5 h-3.5 animate-bounce" />
              <span>ระบบแจ้งเตือนเวร LINE OA</span>
            </span>

            {currentUser.lineUserId ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>เชื่อมต่อ LINE OA แล้ว ({currentUser.lineUserId.slice(0, 6)}...)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <span>ยังไม่ได้ใส่ LINE User ID (ไปตั้งค่าได้ที่เมนูโปรไฟล์)</span>
              </span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            <span>ตารางเวรใกล้จะถึงของคุณ ({currentUser.nickname || currentUser.name})</span>
            <span className="text-sm">{currentUser.icon}</span>
          </h3>

          {/* Upcoming Duty List */}
          {upcomingDuties.length > 0 ? (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {upcomingDuties.slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 shadow-2xs ${
                    item.daysAway === 0
                      ? 'bg-red-50 text-red-800 border-red-200 ring-2 ring-red-400/30 animate-pulse'
                      : item.daysAway === 1
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-white text-neutral-800 border-emerald-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-[#06C755]" />
                  <div>
                    <div className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">
                      {item.daysAway === 0
                        ? '🔥 เวรวันนี้!'
                        : item.daysAway === 1
                        ? '⚡ เวรพรุ่งนี้!'
                        : `อีก ${item.daysAway} วัน (${item.formattedDate})`}
                    </div>
                    <div className="text-[11px] font-bold flex items-center gap-1">
                      <span>{item.parts.join(', ')}</span>
                      {item.note && (
                        <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-semibold" title={item.note}>
                          📝 มีโน้ต
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-500 font-medium">
              🎉 ยินดีด้วย! คุณไม่มีเวรประจำวันหรือเวรอาบน้ำใน 7 วันนี้
            </p>
          )}
        </div>

        {/* Right Actions: Send LINE Notification Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-emerald-200/60">
          <button
            type="button"
            onClick={handleSendLineNotification}
            disabled={isSending}
            className="px-3.5 py-2 rounded-xl bg-[#06C755] hover:bg-[#00B900] active:scale-95 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 border border-emerald-600 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 fill-white" />
            <span>{isSending ? 'กำลังส่ง...' : '📲 เตือนฉันเข้า LINE (พร้อมโน้ต)'}</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerScheduledReminders}
            disabled={isSending}
            className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="กดทดสอบส่งการแจ้งเตือนรอบสเกตดูลอัตโนมัติ (ล่วงหน้า 3 วัน, 1 วัน, และวันนี้พร้อมโน้ตและประกาศ)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>⚡ รันสเกตดูลเตือน (พร้อมโน้ต)</span>
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {notificationStatus && (
        <div
          className={`mt-3 p-2.5 rounded-xl font-bold text-xs flex items-center justify-between animate-in fade-in ${
            notificationStatus.type === 'success'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <span>{notificationStatus.msg}</span>
          </div>

          <button
            type="button"
            onClick={() => setNotificationStatus(null)}
            className="text-xs underline hover:opacity-80"
          >
            ปิด
          </button>
        </div>
      )}
    </div>
  );
};
