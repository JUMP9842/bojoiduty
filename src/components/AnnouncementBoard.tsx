import React, { useState, useEffect } from 'react';
import { useDuty } from '../context/DutyContext';
import { Announcement } from '../types';
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
} from 'lucide-react';

export const AnnouncementBoard: React.FC = () => {
  const {
    announcements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    currentUser,
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

  // Real-time timer updating nowTimestamp every 30 seconds for minute-precise auto-expiry
  const [nowTimestamp, setNowTimestamp] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 30000);
    return () => clearInterval(timer);
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
      // Format to local date time parts
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

  const handleOpenNewForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    const d = new Date();
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    setBadge('');
    setStartAtInput('');
    setEndAtInput('');
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
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !content.trim()) {
      setFormError('กรุณากรอกหัวข้อและรายละเอียดประกาศ');
      return;
    }

    const startIso = formatInputToThaiIso(startAtInput);
    const endIso = formatInputToThaiIso(endAtInput);

    if (startIso && endIso) {
      const startTs = new Date(startIso).getTime();
      const endTs = new Date(endIso).getTime();
      if (endTs <= startTs) {
        setFormError('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้นเผยแพร่');
        return;
      }
    }

    if (editingId) {
      const existing = announcements.find((a) => a.id === editingId);
      if (existing) {
        const updatedAnn: Announcement = {
          ...existing,
          title: title.trim(),
          content: content.trim(),
          date,
          badge: badge.trim() || undefined,
          startAt: startIso,
          endAt: endIso,
        };
        updateAnnouncement(updatedAnn);
      }
    } else {
      addAnnouncement(
        title.trim(),
        content.trim(),
        date,
        badge.trim() || undefined,
        startIso,
        endIso
      );
    }

    handleCloseForm();
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

      {/* Add / Edit Announcement Modal or Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 p-4 sm:p-5 rounded-2xl bg-white border-2 border-[#FFC067] shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#FFC067]/30">
            <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-[#FFC067]" />
              <span>{editingId ? 'แก้ไข / ขยายเวลาประกาศ' : 'เขียนประกาศใหม่'}</span>
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

          {/* Start and End Time pickers */}
          <div className="p-3 mb-3 rounded-xl bg-amber-50/60 border border-[#FFC067]/40 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Timer className="w-3.5 h-3.5 text-[#FFC067]" />
              <span>กำหนดช่วงเวลาเผยแพร่อัตโนมัติ (ซ่อนเมื่อหมดเวลา / แม่นยำระดับนาที):</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                  เริ่มแสดงเวลา (Start At - เลือกหรือไม่เลือกก็ได้)
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
                  สิ้นสุดเวลา (End At - เมื่อถึงเวลานี้จะซ่อนทันที)
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
                className="px-4 py-1.5 rounded-xl bg-[#FFC067] hover:bg-[#ffb347] active:scale-95 text-neutral-950 text-xs font-extrabold transition-all shadow-md border border-amber-400 cursor-pointer"
              >
                {editingId ? 'บันทึกแก้ไขประกาศ' : 'โพสต์ประกาศ'}
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
                        </>
                      )}

                      <span className="flex items-center gap-1 text-[11px] text-neutral-400 font-medium">
                        <Calendar className="w-3 h-3" />
                        {item.date}
                      </span>
                    </div>

                    {/* Admin Actions: Edit/Extend & Delete */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
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
                    <div className="mb-3 p-2 rounded-xl bg-neutral-100/80 border border-neutral-200 text-[10px] font-semibold text-neutral-600 flex flex-col gap-0.5">
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
