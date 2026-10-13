import { Announcement, ActivityLog, BathingScheduleConfig, ShiftAssignment, SwapRequest, User } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-som',
    username: 'som346ff@gmail.com',
    name: 'som346ff@gmail.com',
    nickname: 'น้องมี่',
    password: 'Sukphansa10139',
    icon: '🌸',
    color: '#DB2777', // Pink/Rose as in screenshot
    bgLight: '#FDF2F8',
    borderLight: '#FBCFE8',
    role: 'admin',
  },
  {
    id: 'user-preme',
    username: 'Preme',
    name: 'Preme',
    nickname: 'Preme',
    password: '254630',
    icon: '🦊',
    color: '#10B981', // Emerald green as in screenshot
    bgLight: '#ECFDF5',
    borderLight: '#A7F3D0',
    role: 'member',
  },
  {
    id: 'user-atom',
    username: 'Atom_555',
    name: 'Atom_555',
    nickname: 'น้องตั๋วน',
    password: 'Tan290146',
    icon: '🐱',
    color: '#2563EB', // Blue as in screenshot
    bgLight: '#EFF6FF',
    borderLight: '#BFDBFE',
    role: 'member',
  },
  {
    id: 'user-jump',
    username: 'JUMP',
    name: 'JUMP',
    nickname: 'JUMP',
    password: '9842',
    icon: '🐶',
    color: '#EA580C', // Orange as in screenshot
    bgLight: '#FFF7ED',
    borderLight: '#FFEDD5',
    role: 'member',
  },
];

export const AVAILABLE_ICONS = ['🌸', '🦊', '🐱', '🐶', '🐻', '🐼', '🦁', '🐯', '🐰', '🐨', '🦄', '🐾', '🦴', '🦮', '🐕', '🐩'];

export const AVAILABLE_COLORS = [
  '#DB2777', // Deep Pink (som346ff)
  '#10B981', // Emerald (Preme)
  '#2563EB', // Blue (Atom_555)
  '#EA580C', // Deep Orange (JUMP)
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#D97706', // Amber
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#E11D48', // Rose
];

// Generate dates for current month
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();

const formatDate = (year: number, month: number, day: number) => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'นัดหมายฉีดวัคซีนประจำปี 💉',
    content: 'วันเสาร์ที่ 17 นัดหมอไว้ตอน 10:30 น. ใครว่างไปด้วยกันได้เลยนะ อาหารเม็ดสูตรควบคุมน้ำหนักเริ่มทานสัปดาห์นี้',
    date: formatDate(currentYear, currentMonth, 17),
    authorId: 'user-som',
    authorName: 'som346ff@gmail.com',
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    badge: 'Important',
  },
  {
    id: 'ann-2',
    title: 'แชมพูอาบน้ำสูตรลดคันขวดใหม่อยู่ในห้องน้ำ 🧴',
    content: 'ขวดสีเขียวกลิ่นคาโมมายล์ ผสมน้ำ 1:3 ก่อนฟอกนะ อาบเสร็จอย่าลืมเช็ดหูด้านในด้วยสำลีชุบน้ำเกลือ',
    date: formatDate(currentYear, currentMonth, 5),
    authorId: 'user-preme',
    authorName: 'Preme',
    createdAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
  },
];

export const getInitialShifts = (): ShiftAssignment[] => {
  const shifts: ShiftAssignment[] = [];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const userIndex = (d - 1) % INITIAL_USERS.length;
    shifts.push({
      id: `shift-init-${d}`,
      date: formatDate(currentYear, currentMonth, d),
      type: 'daily',
      userId: INITIAL_USERS[userIndex].id,
      createdAt: new Date().toISOString(),
    });
  }

  // Bathing shifts on Saturdays
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(currentYear, currentMonth, d);
    if (dateObj.getDay() === 6) { // Saturday
      shifts.push({
        id: `shift-bath-init-${d}`,
        date: formatDate(currentYear, currentMonth, d),
        type: 'bathing',
        userId: INITIAL_USERS[d % INITIAL_USERS.length].id,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return shifts;
};

export const getInitialBathingSchedules = (): BathingScheduleConfig[] => {
  const configs: BathingScheduleConfig[] = [];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(currentYear, currentMonth, d);
    if (dateObj.getDay() === 6) { // Every Saturday
      configs.push({
        date: formatDate(currentYear, currentMonth, d),
        enabled: true,
        notes: 'เวรอาบน้ำประจำสัปดาห์',
      });
    }
  }
  return configs;
};

export const INITIAL_SWAP_REQUESTS: SwapRequest[] = [];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'log-1',
    userId: 'user-som',
    userName: 'som346ff@gmail.com',
    actionType: 'user_login',
    description: 'เข้าสู่ระบบสำเร็จ',
    timestamp: new Date().toISOString(),
  },
];
