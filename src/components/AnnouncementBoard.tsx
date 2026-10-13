import React, { useState } from 'react';
import { useDuty } from '../context/DutyContext';
import { Megaphone, Plus, Trash2, Calendar, X, Tag } from 'lucide-react';

export const AnnouncementBoard: React.FC = () => {
  const { announcements, addAnnouncement, deleteAnnouncement, currentUser } = useDuty();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [badge, setBadge] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    addAnnouncement(title.trim(), content.trim(), date, badge.trim() || undefined);
    setTitle('');
    setContent('');
    setBadge('');
    setIsAdding(false);
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
            Announcements
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#FFF8EE] text-neutral-950 font-bold border border-[#FFC067]/70">
            {announcements.length}
          </span>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 text-neutral-950 text-xs font-bold border border-[#FFC067]/70 shadow-xs transition-colors cursor-pointer"
        >
          {isAdding ? (
            <>
              <X className="w-3.5 h-3.5 text-neutral-950" />
              <span>ปิดฟอร์ม</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5 text-neutral-950" />
              <span>เพิ่มประกาศ</span>
            </>
          )}
        </button>
      </div>

      {/* Add Announcement Modal / Expandable Form */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="mb-4 p-4 sm:p-5 rounded-2xl bg-white border border-[#FFC067] shadow-xs animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#FFC067]/30">
            <span className="text-xs font-bold text-neutral-900">เขียนประกาศใหม่</span>
            <span className="text-xs text-neutral-400">
              ผู้เขียน: <strong className="text-neutral-800">{currentUser ? (currentUser.username || currentUser.name) : 'ผู้เยี่ยมชม'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                หัวข้อประกาศ *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น นัดพาไปตัดขน, อาหารเปียกหมดแล้ว..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-[#FFC067] focus:outline-hidden transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                วันที่เกี่ยวข้อง *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-[#FFC067] focus:outline-hidden transition-colors"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">
              รายละเอียด *
            </label>
            <textarea
              required
              rows={2}
              placeholder="ระบุข้อความแจ้งเตือน รายละเอียดขั้นตอน หรือสิ่งที่เพื่อนๆ ในบ้านต้องทราบ..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-[#FFC067] focus:outline-hidden resize-none transition-colors"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-neutral-950" />
              <input
                type="text"
                placeholder="ป้ายกำกับ (เช่น สำคัญ, หมอนัด)"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg bg-neutral-50 border border-neutral-200 w-44 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 active:bg-[#FFC067] text-neutral-950 text-xs font-bold transition-all shadow-xs border border-[#FFC067]/70 cursor-pointer"
              >
                โพสต์ประกาศ
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Announcements List / Cards */}
      {announcements.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white border border-dashed border-[#FFC067]/70 text-center">
          <p className="text-xs text-neutral-400">ยังไม่มีประกาศในขณะนี้ คลิก &quot;เพิ่มประกาศ&quot; เพื่อแจ้งเตือนเพื่อนๆ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between p-4 rounded-2xl bg-white border border-[#FFC067]/60 hover:border-[#FFC067] shadow-xs hover:shadow-xs transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FFF8EE] text-neutral-950 font-bold border border-[#FFC067]/60">
                        {item.badge}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] text-neutral-400 font-medium">
                      <Calendar className="w-3 h-3" />
                      {item.date}
                    </span>
                  </div>

                  <button
                    onClick={() => deleteAnnouncement(item.id)}
                    title="ลบประกาศนี้"
                    className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-80 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-xs font-bold text-neutral-900 mb-1.5 leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed line-clamp-3 mb-4">
                  {item.content}
                </p>
              </div>

              {/* Author name on bottom-left */}
              <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 font-medium">
                  <div className="w-4 h-4 rounded-full bg-[#FFF8EE] text-neutral-950 flex items-center justify-center text-[9px] font-bold border border-[#FFC067]/60">
                    {item.authorName.charAt(0).toUpperCase()}
                  </div>
                  <span>{item.authorName}</span>
                </div>

                <span className="text-[10px] text-neutral-400">
                  {new Date(item.createdAt).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
