import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActivityLog,
  Announcement,
  BathingScheduleConfig,
  BookingSettings,
  CalendarTaskNote,
  MonthUnlockSchedule,
  SelectedShiftTarget,
  ShiftAssignment,
  SwapRequest,
  SwapSelectionState,
  User,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_ANNOUNCEMENTS,
  getInitialShifts,
  getInitialBathingSchedules,
  INITIAL_SWAP_REQUESTS,
  INITIAL_ACTIVITY_LOGS,
  AVAILABLE_COLORS,
  AVAILABLE_ICONS,
} from '../data/initialData';
import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { getShiftMorningUserId, getShiftEveningUserId } from '../utils/shiftUtils';
import { getApiUrl } from '../utils/apiUtils';

const DEFAULT_LINE_ACCESS_TOKEN =
  'KuXbOznb4aCQvDid2OyJ8F4+k3o221q6owdzubhHzw0hNexdEEw+3bYMMY4EhgjA/UQ6WvBR5/Zyy1WgjZwITGugy5rnBqMnkBBpqJY4NGVHmd1wfImEstyXPUV3blruSEEwn+ywp8PHBBIk0smvYgdB04t89/1O/w1cDnyilFU=';

export function cleanFirestoreData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        clean[key] = cleanFirestoreData(val);
      } else {
        clean[key] = val;
      }
    }
  }
  return clean;
}

export async function safeSetDoc(docRef: any, data: any, options?: any) {
  const cleaned = cleanFirestoreData(data);
  return setDoc(docRef, cleaned, options);
}

const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  bookingOpenDay: 20,
  allowPastBooking: false,
  openMonthsAhead: 1,
  monthSchedules: {
    // Example: November 2026 opens on October 30, 2026 at 12:00
    '2026-11': {
      monthKey: '2026-11',
      openDate: '2026-10-30',
      openTime: '12:00',
      notes: 'เปิดจองพร้อมกันตอนเที่ยง',
    },
  },
};

const INITIAL_CALENDAR_TASKS: CalendarTaskNote[] = [
  {
    id: 'task-1',
    type: 'task',
    title: 'ซื้ออาหาร & ตรวจสุขภาพ',
    startDate: new Date().toISOString().slice(0, 8) + '10',
    endDate: new Date().toISOString().slice(0, 8) + '12',
    color: '#3B82F6',
    authorId: 'user-1',
    authorName: 'Alex',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'note-1',
    type: 'note',
    title: 'ซื้อของใช้เพิ่ม',
    startDate: new Date().toISOString().slice(0, 8) + '15',
    color: '#10B981',
    authorId: 'user-1',
    authorName: 'Alex',
    createdAt: new Date().toISOString(),
  },
];

interface DutyContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  currentUserId: string | null;
  users: User[];
  login: (username: string, password: string) => { success: boolean; error?: string };
  loginWithLine: (profile: { lineUserId: string; displayName: string; pictureUrl?: string }) => Promise<{ isNewUser: boolean; user?: User }>;
  pendingLineProfile: { lineUserId: string; displayName: string; pictureUrl?: string } | null;
  setPendingLineProfile: (profile: { lineUserId: string; displayName: string; pictureUrl?: string } | null) => void;
  completeLineRegistration: (data: { displayName: string; icon: string; color: string }) => Promise<User | null>;
  linkLineToExistingUser: (existingUserId: string) => Promise<User | null>;
  cancelPendingLineProfile: () => void;
  isLineFriendModalOpen: boolean;
  openLineFriendModal: () => void;
  closeLineFriendModal: () => void;
  sendLinePushNotification: (targetUserId: string, messageText: string) => Promise<boolean>;
  register: (username: string, password: string, color: string, icon: string) => { success: boolean; error?: string };
  logout: () => void;
  addUser: (name: string, nickname: string, color: string, username?: string, password?: string, icon?: string) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  shifts: ShiftAssignment[];
  bookShift: (date: string, type: 'daily' | 'bathing', notes?: string) => boolean;
  batchBookShifts: (notes?: string) => boolean;
  cancelShift: (shiftId: string) => boolean;
  adminAssignShift: (userId: string, date: string, type: 'daily' | 'bathing', part?: 'full_day' | 'morning' | 'evening', notes?: string) => Promise<boolean> | boolean;
  adminDeleteShift: (shiftId: string) => Promise<boolean> | boolean;
  adminDeleteAllShiftsForDate: (date: string) => Promise<boolean> | boolean;
  adminClearShiftPart: (date: string, type: 'daily' | 'bathing', part?: 'morning' | 'evening' | 'full_day' | 'bathing') => Promise<boolean> | void;
  bathingSchedules: BathingScheduleConfig[];
  toggleBathingDate: (date: string, enabled?: boolean) => void;
  isBathingDate: (date: string) => boolean;
  swapRequests: SwapRequest[];
  createSwapRequest: (data: {
    toUserId: string;
    fromDate: string;
    fromShiftPart: 'morning' | 'evening' | 'full_day' | 'bathing';
    toDate: string;
    toShiftPart: 'morning' | 'evening' | 'full_day' | 'bathing';
    note?: string;
  }) => boolean;
  respondSwapRequest: (requestId: string, accept: boolean) => void;
  cancelSwapRequest: (requestId: string) => void;
  announcements: Announcement[];
  addAnnouncement: (title: string, content: string, date: string, badge?: string) => void;
  deleteAnnouncement: (id: string) => void;
  activityLogs: ActivityLog[];
  clearActivityLogs: () => void;
  autoDistributeShifts: (year: number, month: number) => void;
  resetToDefaultData: () => void;
  wipeAllData: () => Promise<boolean>;
  // Multi-selection state
  selectedShifts: SelectedShiftTarget[];
  toggleSelectShift: (target: SelectedShiftTarget) => void;
  isShiftSelected: (date: string, type: 'daily' | 'bathing') => boolean;
  clearSelectedShifts: () => void;
  // Interactive Swap Selection Mode on Calendar
  activeSwapSelection: SwapSelectionState | null;
  startSwapWithShift: (data: Omit<SwapSelectionState, 'myDate' | 'myType' | 'myPart'>) => void;
  selectMyShiftForSwap: (date: string, type: 'daily' | 'bathing', part?: 'full_day' | 'morning' | 'evening' | 'bathing') => void;
  updateSwapSelectionNote: (note: string) => void;
  updateSwapSelectionPart: (myPart?: 'full_day' | 'morning' | 'evening' | 'bathing', targetPart?: 'full_day' | 'morning' | 'evening' | 'bathing') => void;
  cancelSwapSelection: () => void;
  confirmDirectSwap: () => boolean;
  // Booking Window & Monthly Lock schedule
  bookingSettings: BookingSettings;
  updateBookingSettings: (settings: BookingSettings) => void;
  setMonthUnlockSchedule: (monthKey: string, openDate: string, openTime: string, notes?: string) => void;
  deleteMonthUnlockSchedule: (monthKey: string) => void;
  isDateOpenForBooking: (dateStr: string) => { isOpen: boolean; reason?: string };
  // Calendar Tasks & Notes
  calendarTasks: CalendarTaskNote[];
  addCalendarTaskNote: (task: { type: 'task' | 'note'; title: string; startDate: string; endDate?: string; color?: string; icon?: string }) => void;
  deleteCalendarTaskNote: (id: string) => void;
  // Single selection fallback
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedShiftType: 'daily' | 'bathing';
  setSelectedShiftType: (type: 'daily' | 'bathing') => void;
  // Quota computations
  quotaStats: {
    totalDaysInMonth: number;
    targetPerMember: number;
    userCounts: Record<string, { daily: number; bathing: number; total: number }>;
  };
  currentUserRemainingQuota: number;
  isFirebaseSynced: boolean;
}

const DutyContext = createContext<DutyContextType | undefined>(undefined);

export const DutyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  // Default to null so new visitors or other devices MUST sign in manually
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return localStorage.getItem('bojoiduty_current_user_id') || null;
  });
  const [shifts, setShifts] = useState<ShiftAssignment[]>([]);
  const [bathingSchedules, setBathingSchedules] = useState<BathingScheduleConfig[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [bookingSettings, setBookingSettings] = useState<BookingSettings>(DEFAULT_BOOKING_SETTINGS);
  const [calendarTasks, setCalendarTasks] = useState<CalendarTaskNote[]>([]);
  const [isFirebaseSynced, setIsFirebaseSynced] = useState<boolean>(false);
  const [pendingLineProfile, setPendingLineProfile] = useState<{ lineUserId: string; displayName: string; pictureUrl?: string } | null>(null);
  const [isLineFriendModalOpen, setIsLineFriendModalOpen] = useState<boolean>(false);

  const openLineFriendModal = useCallback(() => {
    setIsLineFriendModalOpen(true);
  }, []);

  const closeLineFriendModal = useCallback(() => {
    setIsLineFriendModalOpen(false);
  }, []);

  // Sync current user ID to localStorage
  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem('bojoiduty_current_user_id', currentUserId);
    } else {
      localStorage.removeItem('bojoiduty_current_user_id');
    }
  }, [currentUserId]);

  // Multi-selection state for booking
  const [selectedShifts, setSelectedShifts] = useState<SelectedShiftTarget[]>([]);

  // Interactive Swap state for calendar direct click
  const [activeSwapSelection, setActiveSwapSelection] = useState<SwapSelectionState | null>(null);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedShiftType, setSelectedShiftType] = useState<'daily' | 'bathing'>('daily');

  // Firebase Real-Time Listeners (Connecting Preview & Public to the same Firestore data)
  useEffect(() => {
    let isMounted = true;

    const initSeed = async () => {
      try {
        // Booking Settings only
        const settingsSnap = await getDoc(doc(db, 'settings', 'booking_settings'));
        if (!settingsSnap.exists()) {
          await safeSetDoc(doc(db, 'settings', 'booking_settings'), DEFAULT_BOOKING_SETTINGS).catch(console.warn);
        }
      } catch (err) {
        console.warn('Firebase settings check notice:', err);
      }
    };
    initSeed();

    const onSnapErr = (name: string) => (err: Error) => {
      console.warn(`[Firestore Sync] onSnapshot stream notice (${name}) - reconnecting:`, err.message);
    };

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        if (isMounted) {
          setUsers(snap.docs.map((d) => d.data() as User));
        }
      },
      onSnapErr('users')
    );

    const unsubShifts = onSnapshot(
      collection(db, 'shifts'),
      (snap) => {
        if (isMounted) {
          const items = snap.docs.map((d) => d.data() as ShiftAssignment);
          setShifts(items);
        }
      },
      onSnapErr('shifts')
    );

    const unsubTasks = onSnapshot(
      collection(db, 'calendar_tasks'),
      (snap) => {
        if (isMounted) {
          const items = snap.docs.map((d) => d.data() as CalendarTaskNote);
          setCalendarTasks(items);
        }
      },
      onSnapErr('calendar_tasks')
    );

    const unsubBathing = onSnapshot(
      collection(db, 'bathing_schedules'),
      (snap) => {
        if (isMounted) {
          const items = snap.docs.map((d) => d.data() as BathingScheduleConfig);
          setBathingSchedules(items);
        }
      },
      onSnapErr('bathing_schedules')
    );

    const unsubAnnouncements = onSnapshot(
      collection(db, 'announcements'),
      (snap) => {
        if (isMounted) setAnnouncements(snap.docs.map((d) => d.data() as Announcement));
      },
      onSnapErr('announcements')
    );

    const unsubSwaps = onSnapshot(
      collection(db, 'swap_requests'),
      (snap) => {
        if (isMounted) setSwapRequests(snap.docs.map((d) => d.data() as SwapRequest));
      },
      onSnapErr('swap_requests')
    );

    const unsubLogs = onSnapshot(
      collection(db, 'activity_logs'),
      (snap) => {
        if (isMounted) {
          const items = snap.docs.map((d) => d.data() as ActivityLog);
          setActivityLogs(items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
        }
      },
      onSnapErr('activity_logs')
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'booking_settings'),
      (docSnap) => {
        if (docSnap.exists() && isMounted) {
          setBookingSettings(docSnap.data() as BookingSettings);
        }
      },
      onSnapErr('booking_settings')
    );

    setIsFirebaseSynced(true);

    // Auto-check and trigger scheduled reminders (throttled once per 30 minutes in sessionStorage)
    const checkScheduledReminders = async () => {
      try {
        const lastCheck = sessionStorage.getItem('last_reminders_trigger');
        const now = Date.now();
        if (!lastCheck || now - Number(lastCheck) > 1800000) {
          sessionStorage.setItem('last_reminders_trigger', String(now));
          await fetch(getApiUrl('/api/line/trigger-scheduled-reminders'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force: false }),
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('Scheduled reminders trigger notice:', err);
      }
    };
    const remTimer = setTimeout(checkScheduledReminders, 4000);

    return () => {
      isMounted = false;
      clearTimeout(remTimer);
      unsubUsers();
      unsubShifts();
      unsubTasks();
      unsubBathing();
      unsubAnnouncements();
      unsubSwaps();
      unsubLogs();
      unsubSettings();
    };
  }, []);

  const currentUser = useMemo(() => {
    if (!currentUserId) return null;
    return users.find((u) => u.id === currentUserId) || null;
  }, [users, currentUserId]);

  const addLog = async (actionType: ActivityLog['actionType'], description: string, user = currentUser) => {
    const newLog: ActivityLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userId: user ? user.id : 'guest',
      userName: user ? (user.username || user.name) : 'ผู้เยี่ยมชม',
      userAvatar: user?.avatar,
      actionType,
      description,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [newLog, ...prev.slice(0, 99)]);
    safeSetDoc(doc(db, 'activity_logs', newLog.id), newLog).catch(console.warn);
  };

  // Helper function to format date string for LINE notification (e.g., 2026-10-15 -> 15 ต.ค. 2569)
  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10) + 543;
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return `${d} ${thaiMonths[m - 1]} ${y}`;
  };

  // Helper to send LINE Push Notification via Messaging API (Backend Proxy - No CORS)
  // Helper to resolve Google Apps Script Web App URL
  const getGoogleAppsScriptUrl = async (): Promise<string> => {
    let gasUrl = (import.meta.env as any).VITE_LINE_GAS_URL || (import.meta.env as any).VITE_GAS_WEB_APP_URL || '';
    try {
      const local = localStorage.getItem('line_gas_url') || localStorage.getItem('gas_web_app_url');
      if (local && local.trim().startsWith('https://script.google.com/')) {
        gasUrl = local.trim();
      }
    } catch {}
    try {
      if (!gasUrl) {
        const cfgDoc = await getDoc(doc(db, 'settings', 'line')).catch(() => null);
        if (cfgDoc && cfgDoc.exists()) {
          const data = cfgDoc.data();
          if (data.gasUrl && typeof data.gasUrl === 'string' && data.gasUrl.trim().startsWith('https://script.google.com/')) {
            gasUrl = data.gasUrl.trim();
          }
        }
      }
    } catch {}
    return gasUrl.trim();
  };

  // Helper to resolve LINE token on frontend
  const getFrontendLineToken = async (): Promise<string> => {
    let token = (import.meta.env as any).VITE_LINE_CHANNEL_ACCESS_TOKEN || DEFAULT_LINE_ACCESS_TOKEN || '';
    try {
      const local = localStorage.getItem('line_channel_access_token') || localStorage.getItem('line_access_token');
      if (local && local.trim().length > 30) {
        token = local.trim();
      }
    } catch {}
    try {
      const cfgDoc = await getDoc(doc(db, 'settings', 'line')).catch(() => null);
      if (cfgDoc && cfgDoc.exists()) {
        const data = cfgDoc.data();
        if (data.lineAccessToken && data.lineAccessToken.trim().length > 30) {
          token = data.lineAccessToken.trim();
        }
      }
    } catch {}
    return token.trim();
  };

  const sendLinePushNotification = async (
    targetUserIdOrName: string,
    messageText: string,
    showDiagnosticAlert: boolean = true
  ): Promise<boolean> => {
    if (!targetUserIdOrName) {
      if (showDiagnosticAlert) {
        window.alert('เกิดข้อผิดพลาดในการส่ง LINE: ไม่ได้ระบุผู้รับ (Target User ID หรือ ชื่อผู้ใช้ว่างเปล่า)');
      }
      return false;
    }

    const cleanTarget = targetUserIdOrName.trim();
    const cleanTargetLower = cleanTarget.toLowerCase();

    // 1. Search in local state users comparing id, uid, lineUserId, lineId, line_user_id, name, nickname, username
    let matchedUser: any = users.find((u: any) => {
      return (
        u.id === cleanTarget ||
        u.uid === cleanTarget ||
        u.lineUserId === cleanTarget ||
        u.lineId === cleanTarget ||
        u.line_user_id === cleanTarget ||
        (u.username && u.username.toLowerCase() === cleanTargetLower) ||
        (u.name && u.name.toLowerCase() === cleanTargetLower) ||
        (u.nickname && u.nickname.toLowerCase() === cleanTargetLower)
      );
    });

    // 2. Fetch fresh from Firestore via frontend Firebase SDK if not found
    if (!matchedUser || (!matchedUser.lineUserId && !matchedUser.lineId && !matchedUser.line_user_id)) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const freshUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
        const freshMatched = freshUsers.find((u: any) => {
          return (
            u.id === cleanTarget ||
            u.uid === cleanTarget ||
            u.lineUserId === cleanTarget ||
            u.lineId === cleanTarget ||
            u.line_user_id === cleanTarget ||
            (u.username && u.username.toLowerCase() === cleanTargetLower) ||
            (u.name && u.name.toLowerCase() === cleanTargetLower) ||
            (u.nickname && u.nickname.toLowerCase() === cleanTargetLower) ||
            (u.username && u.username.toLowerCase().includes(cleanTargetLower)) ||
            (u.name && u.name.toLowerCase().includes(cleanTargetLower)) ||
            (u.nickname && u.nickname.toLowerCase().includes(cleanTargetLower))
          );
        });

        if (freshMatched) {
          matchedUser = freshMatched;
        }
      } catch (err) {
        console.warn('Frontend fresh user query notice:', err);
      }
    }

    // 3. Resolve targetLineUserId (field lineUserId, lineId, line_user_id, or uid starting with U)
    const rawLineId = matchedUser
      ? matchedUser.lineUserId ||
        matchedUser.lineId ||
        matchedUser.line_user_id ||
        (typeof matchedUser.uid === 'string' && matchedUser.uid.startsWith('U') && matchedUser.uid.length >= 30 ? matchedUser.uid : '')
      : '';

    const targetLineUserId = rawLineId || (cleanTarget.startsWith('U') && cleanTarget.length >= 30 ? cleanTarget : '');

    const userName = matchedUser
      ? matchedUser.nickname || matchedUser.name || matchedUser.username
      : cleanTarget;

    if (!targetLineUserId || !targetLineUserId.startsWith('U')) {
      console.warn(`[LINE Push Diagnostic] ไม่พบรหัส LINE User ID สำหรับ: ${cleanTarget}`);
      if (showDiagnosticAlert) {
        window.alert(`เกิดข้อผิดพลาดในการส่ง LINE: ผู้ใช้ "${userName}" ยังไม่ได้ผูกบัญชี LINE OA (ไม่พบรหัส LINE User ID ที่ขึ้นต้นด้วย U)`);
      }
      return false;
    }

    const gasUrl = await getGoogleAppsScriptUrl();
    const token = await getFrontendLineToken();

    console.log(`[LINE Push Dispatch] Target: ${userName} (${targetLineUserId}) | Message: "${messageText}"`);

    // 4. Primary direct POST to Google Apps Script Web App (if gasUrl is provided)
    if (gasUrl) {
      try {
        console.log(`[LINE Push Direct Google Apps Script]: Sending to ${gasUrl}`);
        const response = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            to: targetLineUserId,
            messages: [{ type: 'text', text: messageText }],
            token: token,
          }),
        });

        const rawText = await response.text().catch(() => '');
        let resData: any = {};
        try {
          resData = rawText ? JSON.parse(rawText) : {};
        } catch {
          resData = { text: rawText };
        }

        if (response.ok && !resData.error && resData.message !== 'error') {
          console.log(`[LINE Push Success via Google Apps Script]`, resData);
          if (showDiagnosticAlert) {
            window.alert(`ส่งการแจ้งเตือน LINE สำเร็จไปยัง ${userName}`);
          }
          return true;
        } else {
          const errMsg = resData.error || resData.message || rawText || `GAS Response error`;
          console.error(`[GAS Push Error]:`, errMsg);
          console.warn(`[GAS Push Notice]: ${errMsg} -> Falling back to Vercel Serverless API`);
        }
      } catch (gasErr: any) {
        console.warn(`[GAS Push Exception]: ${gasErr.message || String(gasErr)} -> Falling back to Vercel Serverless API`);
      }
    }

    // 5. Fallback: Vercel / Express Backend Proxy Serverless Functions
    const payload = {
      to: targetLineUserId,
      lineUserId: targetLineUserId,
      userId: targetLineUserId,
      targetUserId: targetLineUserId,
      message: messageText,
      messageText: messageText,
      messages: [{ type: 'text', text: messageText }],
      token: token,
      channelAccessToken: token,
    };

    const apiEndpoints = ['/api/line/push-notification', '/api/line-push'];

    for (const endpoint of apiEndpoints) {
      try {
        const response = await fetch(getApiUrl(endpoint), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const rawText = await response.text().catch(() => '');
        let jsonResponse: any = null;
        try {
          jsonResponse = rawText ? JSON.parse(rawText) : {};
        } catch {}

        if (response.ok && (jsonResponse?.success !== false && !jsonResponse?.error)) {
          console.log(`[LINE Push Success via ${endpoint}]: Delivered to ${userName} (${targetLineUserId})`, jsonResponse || rawText);
          if (showDiagnosticAlert) {
            window.alert(`ส่งการแจ้งเตือน LINE สำเร็จไปยัง ${userName}`);
          }
          return true;
        }

        const errorDetail = jsonResponse?.error || jsonResponse?.message || rawText || `HTTP Status ${response.status}`;
        console.warn(`[LINE Push Endpoint ${endpoint} Warning]: Status ${response.status}: ${errorDetail}`);
      } catch (err: any) {
        console.warn(`[LINE Push Endpoint ${endpoint} Exception]:`, err);
      }
    }

    if (showDiagnosticAlert) {
      window.alert(`เกิดข้อผิดพลาดในการส่ง LINE ผ่าน Vercel Serverless Function (โปรดตรวจสอบการตั้งค่า LINE Token ใน Vercel Environment Variables)`);
    }
    return false;
  };

  // Precise Custom Monthly Unlock Schedule & Window Check
  const isDateOpenForBooking = (dateStr: string): { isOpen: boolean; reason?: string } => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    const [targetYear, targetMonth] = dateStr.split('-').map(Number);
    const targetMonthIdx = targetMonth - 1;
    const targetMonthKey = dateStr.slice(0, 7); // e.g. "2026-11"

    const monthDiff = (targetYear - currentYear) * 12 + (targetMonthIdx - currentMonth);

    // 1. Current month is always open
    if (monthDiff === 0) {
      return { isOpen: true };
    }

    // 2. Check if a custom month schedule is set for this month in Backend (e.g. 2026-11 opens on 2026-10-30 at 12:00)
    const customSchedule = bookingSettings.monthSchedules?.[targetMonthKey];
    if (customSchedule && customSchedule.openDate) {
      const openTime = customSchedule.openTime || '00:00';
      const openDateTimeStr = `${customSchedule.openDate}T${openTime}:00`;
      const openTimestamp = new Date(openDateTimeStr).getTime();
      const currentTimestamp = Date.now();

      if (currentTimestamp < openTimestamp) {
        return {
          isOpen: false,
          reason: `เปิดให้จองวันที่ ${customSchedule.openDate} เวลา ${openTime} น.`,
        };
      } else {
        return { isOpen: true };
      }
    }

    // 3. Default fallback for past months
    if (monthDiff < 0) {
      if (bookingSettings.allowPastBooking) return { isOpen: true };
      return { isOpen: false, reason: 'เดือนที่ผ่านมาแล้ว' };
    }

    // 4. Default fallback for next month (Month + 1): opens on bookingOpenDay
    if (monthDiff === 1) {
      const openDay = bookingSettings.bookingOpenDay || 20;
      if (currentDay < openDay) {
        return {
          isOpen: false,
          reason: `เปิดให้จองวันที่ ${openDay} ของเดือนนี้`,
        };
      }
      return { isOpen: true };
    }

    // 5. Future months beyond next month
    if (monthDiff > (bookingSettings.openMonthsAhead || 1)) {
      return {
        isOpen: false,
        reason: 'ยังไม่ถึงกำหนดเปิดจองสำหรับเดือนนี้',
      };
    }

    return { isOpen: true };
  };

  const updateBookingSettings = async (settings: BookingSettings) => {
    setBookingSettings(settings);
    safeSetDoc(doc(db, 'settings', 'booking_settings'), settings).catch(console.warn);
    addLog('member_update', `[Admin] ปรับปรุงเงื่อนไขวันเปิดจองเวร`);
  };

  const setMonthUnlockSchedule = async (monthKey: string, openDate: string, openTime: string, notes?: string) => {
    const updatedSchedules: Record<string, MonthUnlockSchedule> = {
      ...(bookingSettings.monthSchedules || {}),
      [monthKey]: {
        monthKey,
        openDate,
        openTime: openTime || '12:00',
        notes: notes || '',
      },
    };

    const newSettings: BookingSettings = {
      ...bookingSettings,
      monthSchedules: updatedSchedules,
    };

    setBookingSettings(newSettings);
    safeSetDoc(doc(db, 'settings', 'booking_settings'), newSettings).catch(console.warn);
    addLog('unlock_schedule_update', `[Admin] กำหนดวันเปิดจองเดือน ${monthKey}: วันที่ ${openDate} เวลา ${openTime || '12:00'} น.`);

    // Broadcast notification to all users connected to LINE
    users.forEach((u) => {
      if (u.lineUserId) {
        sendLinePushNotification(
          u.lineUserId,
          `📢 [BojoiDuty] แอดมินได้ประกาศวันเปิดจองเวรประจำเดือน ${monthKey}!\n📅 วันที่เปิดจอง: ${openDate} เวลา ${openTime || '12:00'} น.`
        );
      }
    });
  };

  const deleteMonthUnlockSchedule = async (monthKey: string) => {
    if (!bookingSettings.monthSchedules) return;
    const copy = { ...bookingSettings.monthSchedules };
    delete copy[monthKey];

    const newSettings: BookingSettings = {
      ...bookingSettings,
      monthSchedules: copy,
    };

    setBookingSettings(newSettings);
    safeSetDoc(doc(db, 'settings', 'booking_settings'), newSettings).catch(console.warn);
    addLog('unlock_schedule_update', `[Admin] ลบการตั้งเวลาเปิดจองเดือน ${monthKey}`);
  };

  // Auth: Login
  const login = (username: string, password: string): { success: boolean; error?: string } => {
    const cleanQuery = username.toLowerCase().trim();
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === cleanQuery ||
        u.name.toLowerCase() === cleanQuery ||
        (u.nickname && u.nickname.toLowerCase() === cleanQuery)
    );

    if (!user) {
      return { success: false, error: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' };
    }

    if (user.password && user.password !== password) {
      return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
    }

    setCurrentUserId(user.id);
    addLog('user_login', `เข้าสู่ระบบสำเร็จ`, user);
    return { success: true };
  };

  // Auth: Login with LINE OAuth Profile
  // Flow requested:
  // 1. Check if user already exists (by lineUserId) -> Login directly! Do not show registration screen again.
  // 2. If new user -> prompt screen to fill display name, choose icon, choose color -> Click complete.
  const loginWithLine = async (profile: { lineUserId: string; displayName: string; pictureUrl?: string }): Promise<{ isNewUser: boolean; user?: User }> => {
    // 0. If user is currently logged in, link LINE to their current staff account immediately!
    if (currentUserId) {
      const activeUser = users.find((u) => u.id === currentUserId);
      if (activeUser) {
        const updatedUser: User = {
          ...activeUser,
          lineUserId: profile.lineUserId,
          lineDisplayName: profile.displayName || activeUser.lineDisplayName,
          linePictureUrl: profile.pictureUrl || activeUser.linePictureUrl,
          avatar: profile.pictureUrl || activeUser.avatar,
          lineConnectedAt: new Date().toISOString(),
          lineNotificationEnabled: true,
        };
        setUsers((prev) => prev.map((u) => (u.id === currentUserId ? updatedUser : u)));
        safeSetDoc(doc(db, 'users', currentUserId), updatedUser).catch(console.warn);
        addLog('member_update', `เชื่อมต่อบัญชี ${activeUser.nickname || activeUser.name} กับ LINE OA เรียบร้อยแล้ว`, updatedUser);
        return { isNewUser: false, user: updatedUser };
      }
    }

    // 1. Check in existing state by lineUserId
    let user = users.find(
      (u) => (u.lineUserId && u.lineUserId === profile.lineUserId)
    );

    // If not found in memory state, check directly in Firestore to be certain
    if (!user) {
      try {
        const directSnap = await getDoc(doc(db, 'users', 'line-' + profile.lineUserId));
        if (directSnap.exists()) {
          user = directSnap.data() as User;
        } else {
          const allUsersSnap = await getDocs(collection(db, 'users'));
          const found = allUsersSnap.docs.map(d => d.data() as User).find(u => u.lineUserId === profile.lineUserId);
          if (found) user = found;
        }
      } catch (err) {
        console.warn('Firestore user check notice:', err);
      }
    }

    if (user) {
      // User is already registered! Login directly without showing onboarding screen!
      const updatedUser: User = {
        ...user,
        lineUserId: profile.lineUserId,
        lineDisplayName: profile.displayName || user.lineDisplayName,
        linePictureUrl: profile.pictureUrl || user.linePictureUrl,
        avatar: profile.pictureUrl || user.avatar,
        lineConnectedAt: user.lineConnectedAt || new Date().toISOString(),
        lineNotificationEnabled: true,
      };
      setUsers((prev) => {
        const exists = prev.some((u) => u.id === user!.id);
        return exists ? prev.map((u) => (u.id === user!.id ? updatedUser : u)) : [...prev, updatedUser];
      });
      setCurrentUserId(user.id);
      safeSetDoc(doc(db, 'users', user.id), updatedUser).catch(console.warn);
      addLog('user_login', `เข้าสู่ระบบผ่าน LINE OA สำเร็จ (${user.name || profile.displayName})`, updatedUser);
      return { isNewUser: false, user: updatedUser };
    } else {
      // Unlinked/New user! Set pending profile so the setup modal pops up to either LINK to an existing staff account or create new profile
      setPendingLineProfile(profile);
      return { isNewUser: true };
    }
  };

  // Link LINE Account to an existing staff member in the system
  const linkLineToExistingUser = async (existingUserId: string): Promise<User | null> => {
    if (!pendingLineProfile) return null;
    const targetUser = users.find((u) => u.id === existingUserId);
    if (!targetUser) return null;

    const updatedUser: User = {
      ...targetUser,
      lineUserId: pendingLineProfile.lineUserId,
      lineDisplayName: pendingLineProfile.displayName || targetUser.lineDisplayName,
      linePictureUrl: pendingLineProfile.pictureUrl || targetUser.linePictureUrl,
      avatar: pendingLineProfile.pictureUrl || targetUser.avatar,
      lineConnectedAt: new Date().toISOString(),
      lineNotificationEnabled: true,
    };

    setUsers((prev) => prev.map((u) => (u.id === existingUserId ? updatedUser : u)));
    setCurrentUserId(updatedUser.id);
    await safeSetDoc(doc(db, 'users', updatedUser.id), updatedUser);
    addLog('member_update', `เชื่อมต่อบัญชี ${updatedUser.nickname || updatedUser.name} กับ LINE OA เรียบร้อยแล้ว`, updatedUser);
    setPendingLineProfile(null);
    return updatedUser;
  };

  // Complete LINE Registration after user picks display name, icon, and color
  const completeLineRegistration = async (data: { displayName: string; icon: string; color: string }): Promise<User | null> => {
    if (!pendingLineProfile) return null;

    const cleanName = data.displayName.trim() || pendingLineProfile.displayName || 'LINE User';
    const chosenColor = data.color || AVAILABLE_COLORS[0];
    const chosenIcon = data.icon || '🐶';
    const isFirstUser = users.length === 0 || !users.some((u) => u.role === 'admin');

    const newUser: User = {
      id: 'line-' + pendingLineProfile.lineUserId,
      lineUserId: pendingLineProfile.lineUserId,
      lineDisplayName: pendingLineProfile.displayName,
      linePictureUrl: pendingLineProfile.pictureUrl,
      username: cleanName,
      name: cleanName,
      nickname: cleanName,
      avatar: pendingLineProfile.pictureUrl,
      icon: chosenIcon,
      color: chosenColor,
      bgLight: `${chosenColor}15`,
      borderLight: `${chosenColor}40`,
      role: isFirstUser ? 'admin' : 'member',
      lineConnectedAt: new Date().toISOString(),
      lineNotificationEnabled: true,
    };

    setUsers((prev) => [...prev.filter((u) => u.id !== newUser.id), newUser]);
    setCurrentUserId(newUser.id);
    await safeSetDoc(doc(db, 'users', newUser.id), newUser);
    addLog('user_register', `สร้างบัญชีใหม่ผ่าน LINE OA สำเร็จ: ${cleanName}`, newUser);
    setPendingLineProfile(null);
    return newUser;
  };

  const cancelPendingLineProfile = () => {
    setPendingLineProfile(null);
  };

  // Auth: Register
  const register = (
    username: string,
    password: string,
    color: string,
    icon: string
  ): { success: boolean; error?: string } => {
    const cleanUsername = username.trim();
    const exists = users.some(
      (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    if (exists) {
      return { success: false, error: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว' };
    }

    const chosenColor = color || AVAILABLE_COLORS[0];
    const chosenIcon = icon || AVAILABLE_ICONS[0];
    const isFirstUser = users.length === 0 || !users.some((u) => u.role === 'admin');

    const newUser: User = {
      id: 'user-' + Date.now(),
      username: cleanUsername,
      name: cleanUsername,
      nickname: cleanUsername,
      password: password.trim(),
      icon: chosenIcon,
      color: chosenColor,
      bgLight: `${chosenColor}15`,
      borderLight: `${chosenColor}40`,
      role: isFirstUser ? 'admin' : 'member',
    };

    setUsers((prev) => [...prev, newUser]);
    setCurrentUserId(newUser.id);
    safeSetDoc(doc(db, 'users', newUser.id), newUser).catch(console.warn);
    addLog('user_register', `ลงทะเบียนผู้ใช้ใหม่ (${cleanUsername})`, newUser);
    return { success: true };
  };

  const logout = () => {
    setCurrentUserId(null);
    localStorage.removeItem('bojoiduty_current_user_id');
  };

  const isBathingDate = (date: string): boolean => {
    const config = bathingSchedules.find((b) => b.date === date);
    return !!config?.enabled;
  };

  const toggleBathingDate = async (date: string, enabled?: boolean) => {
    const exists = bathingSchedules.find((b) => b.date === date);
    const newState = enabled !== undefined ? enabled : !exists?.enabled;
    const configObj: BathingScheduleConfig = {
      date,
      enabled: newState,
      notes: 'เวรอาบน้ำ',
    };

    setBathingSchedules((prev) => {
      if (exists) {
        return prev.map((b) => (b.date === date ? configObj : b));
      } else {
        return [...prev, configObj];
      }
    });

    safeSetDoc(doc(db, 'bathing_schedules', date), configObj).catch(console.warn);
    addLog('bathing_update', `ปรับปรุงกำหนดการเวรอาบน้ำ วันที่ ${date}`);
  };

  const isShiftSelected = (date: string, type: 'daily' | 'bathing'): boolean => {
    return selectedShifts.some((s) => s.date === date && s.type === type);
  };

  const toggleSelectShift = (target: SelectedShiftTarget) => {
    const check = isDateOpenForBooking(target.date);
    if (!check.isOpen) {
      alert(`ยังไม่สามารถจองได้: ${check.reason}`);
      return;
    }

    if (activeSwapSelection) {
      setActiveSwapSelection(null);
    }

    setSelectedShifts((prev) => {
      const exists = prev.some((s) => s.date === target.date && s.type === target.type);
      if (exists) {
        return prev.filter((s) => !(s.date === target.date && s.type === target.type));
      } else {
        return [...prev, target];
      }
    });
  };

  const clearSelectedShifts = () => {
    setSelectedShifts([]);
  };

  // Calendar Tasks & Notes methods
  const addCalendarTaskNote = async (taskData: {
    type: 'task' | 'note';
    title: string;
    startDate: string;
    endDate?: string;
    color?: string;
    icon?: string;
  }) => {
    const newTask: CalendarTaskNote = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      type: taskData.type,
      title: taskData.title,
      startDate: taskData.startDate,
      endDate: taskData.endDate || taskData.startDate,
      color: taskData.color || '#FFC067',
      icon: taskData.icon || (taskData.type === 'task' ? '📌' : '📝'),
      authorId: currentUser ? currentUser.id : 'guest',
      authorName: currentUser ? (currentUser.username || currentUser.name) : 'ผู้เยี่ยมชม',
      createdAt: new Date().toISOString(),
    };

    setCalendarTasks((prev) => [...prev, newTask]);
    safeSetDoc(doc(db, 'calendar_tasks', newTask.id), newTask).catch(console.warn);
    addLog('task_create', `เพิ่ม ${taskData.type === 'task' ? 'Task' : 'Note'} ในปฏิทิน: "${taskData.title}"`);
  };

  const deleteCalendarTaskNote = async (id: string) => {
    const target = calendarTasks.find((t) => t.id === id);
    setCalendarTasks((prev) => prev.filter((t) => t.id !== id));
    deleteDoc(doc(db, 'calendar_tasks', id)).catch(console.warn);
    if (target) {
      addLog('task_delete', `ลบ ${target.type === 'task' ? 'Task' : 'Note'}: "${target.title}"`);
    }
  };

  // Interactive Swap Selection Mode on Calendar
  const startSwapWithShift = (data: Omit<SwapSelectionState, 'myDate' | 'myType' | 'myPart'>) => {
    if (!currentUser) {
      alert('กรุณาเข้าสู่ระบบก่อนเลือกสลับเวร');
      return;
    }
    setSelectedShifts([]);
    const myShiftList = shifts.filter((s) => s.userId === currentUser.id || s.morningUserId === currentUser.id || s.eveningUserId === currentUser.id);
    const defaultMyShift = myShiftList[0];

    setActiveSwapSelection({
      ...data,
      myDate: defaultMyShift?.date,
      myType: defaultMyShift?.type || 'daily',
      myPart: 'full_day',
    });
  };

  const selectMyShiftForSwap = (date: string, type: 'daily' | 'bathing', part: 'full_day' | 'morning' | 'evening' | 'bathing' = 'full_day') => {
    if (!activeSwapSelection) return;
    setActiveSwapSelection({
      ...activeSwapSelection,
      myDate: date,
      myType: type,
      myPart: part,
    });
  };

  const updateSwapSelectionNote = (note: string) => {
    if (!activeSwapSelection) return;
    setActiveSwapSelection({ ...activeSwapSelection, note });
  };

  const updateSwapSelectionPart = (
    myPart?: 'full_day' | 'morning' | 'evening' | 'bathing',
    targetPart?: 'full_day' | 'morning' | 'evening' | 'bathing'
  ) => {
    if (!activeSwapSelection) return;
    setActiveSwapSelection({
      ...activeSwapSelection,
      myPart: myPart || activeSwapSelection.myPart,
      targetPart: targetPart || activeSwapSelection.targetPart,
    });
  };

  const cancelSwapSelection = () => {
    setActiveSwapSelection(null);
  };

  const confirmDirectSwap = (): boolean => {
    if (!currentUser) {
      alert('กรุณาเข้าสู่ระบบก่อนทำการสลับเวร');
      return false;
    }

    if (!activeSwapSelection || !activeSwapSelection.myDate) {
      alert('กรุณาเลือกเวรของตนเองที่จะนำไปแลกเปลี่ยน');
      return false;
    }

    const newSwap: SwapRequest = {
      id: 'swap-' + Date.now(),
      fromUserId: currentUser.id,
      toUserId: activeSwapSelection.targetUserId,
      fromDate: activeSwapSelection.myDate,
      fromShiftPart: activeSwapSelection.myPart || 'full_day',
      toDate: activeSwapSelection.targetDate,
      toShiftPart: activeSwapSelection.targetPart || 'full_day',
      note: activeSwapSelection.note || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setSwapRequests((prev) => [newSwap, ...prev]);
    safeSetDoc(doc(db, 'swap_requests', newSwap.id), newSwap).catch(console.warn);

    addLog(
      'swap_request',
      `ส่งคำขอสลับเวร (${activeSwapSelection.myDate}) กับ ${activeSwapSelection.targetUserName} (${activeSwapSelection.targetDate}) พร้อมข้อความ: ${activeSwapSelection.note || 'ไม่มีข้อความ'}`
    );

    setActiveSwapSelection(null);
    return true;
  };

  // Single book
  const bookShift = async (date: string, type: 'daily' | 'bathing', notes?: string): Promise<boolean> => {
    if (!currentUser) {
      alert('กรุณาเข้าสู่ระบบก่อนทำการจองเวร');
      return false;
    }

    const check = isDateOpenForBooking(date);
    if (!check.isOpen) {
      alert(`ไม่สามารถจองได้: ${check.reason}`);
      return false;
    }

    const existing = shifts.find((s) => s.date === date && s.type === type);
    if (existing) return false;

    const newShift: ShiftAssignment = {
      id: 'shift-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      date,
      type,
      userId: currentUser.id,
      notes: notes || '',
      createdAt: new Date().toISOString(),
    };

    setShifts((prev) => [...prev, newShift]);
    safeSetDoc(doc(db, 'shifts', newShift.id), newShift).catch(console.warn);

    addLog(
      'book_shift',
      type === 'daily'
        ? `จองเวรประจำวัน วันที่ ${date}`
        : `จองเวรอาบน้ำ 🛁 วันที่ ${date}`
    );
    return true;
  };

  // Batch book multi-selected shifts
  const batchBookShifts = (notes?: string): boolean => {
    if (!currentUser) {
      alert('กรุณาเข้าสู่ระบบก่อนทำการจองเวร');
      return false;
    }

    if (selectedShifts.length === 0) return false;

    const newShifts: ShiftAssignment[] = [];
    const datesBooked: string[] = [];

    selectedShifts.forEach((item, idx) => {
      const existing = shifts.find((s) => s.date === item.date && s.type === item.type);
      if (!existing) {
        const newShift: ShiftAssignment = {
          id: 'shift-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 6),
          date: item.date,
          type: item.type,
          userId: currentUser.id,
          notes: notes || '',
          createdAt: new Date().toISOString(),
        };
        newShifts.push(newShift);
        datesBooked.push(`${item.date} (${item.type === 'daily' ? 'ประจำวัน' : 'อาบน้ำ'})`);
        safeSetDoc(doc(db, 'shifts', newShift.id), newShift).catch(console.warn);
      }
    });

    if (newShifts.length > 0) {
      setShifts((prev) => [...prev, ...newShifts]);
      addLog('book_shift', `จองเวรพร้อมกัน ${newShifts.length} เวร: ${datesBooked.join(', ')}`);
      setSelectedShifts([]);
      return true;
    }

    return false;
  };

  // Admin Direct Shift Assigner
  const adminAssignShift = (
    userId: string,
    date: string,
    type: 'daily' | 'bathing',
    part: 'full_day' | 'morning' | 'evening' = 'full_day',
    notes?: string
  ): boolean => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return false;

    const existingIdx = shifts.findIndex((s) => s.date === date && s.type === type);
    const isEdit = existingIdx >= 0;
    let updatedShift: ShiftAssignment;

    if (isEdit) {
      const cur = { ...shifts[existingIdx] };
      if (type === 'daily') {
        const currentMorning = getShiftMorningUserId(cur) || '';
        const currentEvening = getShiftEveningUserId(cur) || '';

        if (part === 'morning') {
          cur.morningUserId = userId;
          cur.eveningUserId = currentEvening;
          cur.userId = userId;
        } else if (part === 'evening') {
          cur.eveningUserId = userId;
          cur.morningUserId = currentMorning;
          cur.userId = currentMorning || userId;
        } else {
          // full_day
          cur.userId = userId;
          cur.morningUserId = userId;
          cur.eveningUserId = userId;
        }
      } else {
        cur.userId = userId;
      }
      if (notes !== undefined) cur.notes = notes;
      updatedShift = cur;
      setShifts((prev) => prev.map((s) => (s.id === cur.id ? cur : s)));
      safeSetDoc(doc(db, 'shifts', cur.id), cur).catch(console.warn);
    } else {
      updatedShift = {
        id: 'shift-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        date,
        type,
        userId,
        morningUserId: part === 'evening' ? '' : userId,
        eveningUserId: part === 'morning' ? '' : userId,
        notes: notes || '',
        createdAt: new Date().toISOString(),
      };
      setShifts((prev) => [...prev, updatedShift]);
      safeSetDoc(doc(db, 'shifts', updatedShift.id), updatedShift).catch(console.warn);
    }

    addLog('member_update', `[Admin] มอบหมายเวร ${type} (${part}) วันที่ ${date} ให้แก่ ${targetUser.username || targetUser.name}`);

    // Requirement 1, 2, 3, 4, 5: Send push notification with diagnostic window.alert()
    const shiftPartText = part === 'morning' ? 'กะเช้า' : part === 'evening' ? 'กะเย็น' : type === 'bathing' ? 'เวรอาบน้ำ' : 'เต็มวัน';
    const formattedDate = formatDateDisplay(date);
    const msg = isEdit
      ? `✏️ แจ้งเตือนการแก้ไขเวร: เวรของคุณในวันที่ ${formattedDate} ถูกปรับเปลี่ยนเป็นช่วงเวลา ${shiftPartText} โดย Admin`
      : `📅 แจ้งเตือนเวรใหม่: คุณได้รับมอบหมายเวรวันที่ ${formattedDate} ช่วงเวลา ${shiftPartText} โดย Admin`;

    sendLinePushNotification(userId, msg, true);

    return true;
  };

  const adminDeleteShift = (shiftId: string): boolean => {
    return cancelShift(shiftId);
  };

  const adminDeleteAllShiftsForDate = (date: string): boolean => {
    const targetShifts = shifts.filter((s) => s.date === date);
    if (targetShifts.length === 0) return false;

    // Collect affected user IDs
    const affectedUserIds = new Set<string>();
    targetShifts.forEach((s) => {
      if (s.userId) affectedUserIds.add(s.userId);
      if (s.morningUserId) affectedUserIds.add(s.morningUserId);
      if (s.eveningUserId) affectedUserIds.add(s.eveningUserId);
    });

    setShifts((prev) => prev.filter((s) => s.date !== date));
    targetShifts.forEach((s) => {
      deleteDoc(doc(db, 'shifts', s.id)).catch(console.warn);
    });
    addLog('cancel_shift', `[Admin] ลบเวรทั้งหมดของวันที่ ${date} (${targetShifts.length} รายการ)`);

    // Requirement 1, 2, 3, 4, 5: Notify affected users with diagnostic window.alert()
    affectedUserIds.forEach((uId) => {
      const formattedDate = formatDateDisplay(date);
      const msg = `❌ แจ้งเตือนยกเลิกเวร: เวรของคุณในวันที่ ${formattedDate} ถูกยกเลิกโดย Admin`;
      sendLinePushNotification(uId, msg, true);
    });

    return true;
  };

  const adminClearShiftPart = (
    date: string,
    type: 'daily' | 'bathing',
    part: 'morning' | 'evening' | 'full_day' | 'bathing' = 'full_day'
  ) => {
    const affectedUserIds = new Set<string>();

    if (type === 'bathing' || part === 'bathing') {
      const bShifts = shifts.filter((s) => s.date === date && s.type === 'bathing');
      if (bShifts.length > 0) {
        bShifts.forEach((s) => {
          if (s.userId) affectedUserIds.add(s.userId);
        });
        setShifts((prev) => prev.filter((s) => !(s.date === date && s.type === 'bathing')));
        bShifts.forEach((s) => deleteDoc(doc(db, 'shifts', s.id)).catch(console.warn));
        addLog('cancel_shift', `[Admin] ลบเวรอาบน้ำ วันที่ ${date}`);
      }
    } else {
      // Daily shift
      const dShift = shifts.find((s) => s.date === date && s.type === 'daily');
      if (dShift) {
        const currentMorning = getShiftMorningUserId(dShift);
        const currentEvening = getShiftEveningUserId(dShift);

        if (part === 'full_day') {
          if (currentMorning) affectedUserIds.add(currentMorning);
          if (currentEvening) affectedUserIds.add(currentEvening);
          if (dShift.userId) affectedUserIds.add(dShift.userId);

          setShifts((prev) => prev.filter((s) => !(s.date === date && s.type === 'daily')));
          const allDaily = shifts.filter((s) => s.date === date && s.type === 'daily');
          allDaily.forEach((s) => deleteDoc(doc(db, 'shifts', s.id)).catch(console.warn));
          addLog('cancel_shift', `[Admin] ลบเวรประจำวันทั้งหมด วันที่ ${date}`);
        } else if (part === 'morning') {
          if (currentMorning) affectedUserIds.add(currentMorning);

          if (!currentEvening) {
            setShifts((prev) => prev.filter((s) => s.id !== dShift.id));
            deleteDoc(doc(db, 'shifts', dShift.id)).catch(console.warn);
          } else {
            const cur: ShiftAssignment = {
              ...dShift,
              userId: currentEvening,
              morningUserId: '',
              eveningUserId: currentEvening,
            };
            setShifts((prev) => prev.map((s) => (s.id === cur.id ? cur : s)));
            safeSetDoc(doc(db, 'shifts', cur.id), cur).catch(console.warn);
          }
          addLog('cancel_shift', `[Admin] ล้างเฉพาะเวรเช้า วันที่ ${date}`);
        } else if (part === 'evening') {
          if (currentEvening) affectedUserIds.add(currentEvening);

          if (!currentMorning) {
            setShifts((prev) => prev.filter((s) => s.id !== dShift.id));
            deleteDoc(doc(db, 'shifts', dShift.id)).catch(console.warn);
          } else {
            const cur: ShiftAssignment = {
              ...dShift,
              userId: currentMorning,
              morningUserId: currentMorning,
              eveningUserId: '',
            };
            setShifts((prev) => prev.map((s) => (s.id === cur.id ? cur : s)));
            safeSetDoc(doc(db, 'shifts', cur.id), cur).catch(console.warn);
          }
          addLog('cancel_shift', `[Admin] ล้างเฉพาะเวรเย็น วันที่ ${date}`);
        }
      }
    }

    // Requirement 1, 2, 3, 4, 5: Send LINE notifications to cleared/cancelled users with diagnostic window.alert()
    affectedUserIds.forEach((uId) => {
      const partText = part === 'morning' ? 'กะเช้า' : part === 'evening' ? 'กะเย็น' : part === 'bathing' ? 'เวรอาบน้ำ' : 'เต็มวัน';
      const formattedDate = formatDateDisplay(date);
      const msg = `❌ แจ้งเตือนยกเลิกเวร: เวรของคุณในวันที่ ${formattedDate} ช่วงเวลา ${partText} ถูกยกเลิกโดย Admin`;
      sendLinePushNotification(uId, msg, true);
    });
  };

  const cancelShift = (shiftId: string): boolean => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return false;

    const affectedUserIds = new Set<string>();
    if (shift.userId) affectedUserIds.add(shift.userId);
    if (shift.morningUserId) affectedUserIds.add(shift.morningUserId);
    if (shift.eveningUserId) affectedUserIds.add(shift.eveningUserId);

    setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    deleteDoc(doc(db, 'shifts', shiftId)).catch(console.warn);
    addLog(
      'cancel_shift',
      `ยกเลิกเวร${shift.type === 'daily' ? 'ประจำวัน' : 'อาบน้ำ'} วันที่ ${shift.date}`
    );

    // Requirement 1, 2, 3, 4, 5: Notify cancelled shift users with diagnostic window.alert()
    affectedUserIds.forEach((uId) => {
      const partText = shift.type === 'bathing' ? 'เวรอาบน้ำ' : 'เวรประจำวัน';
      const formattedDate = formatDateDisplay(shift.date);
      const msg = `❌ แจ้งเตือนยกเลิกเวร: เวรของคุณในวันที่ ${formattedDate} ช่วงเวลา ${partText} ถูกยกเลิกโดย Admin`;
      sendLinePushNotification(uId, msg, true);
    });

    return true;
  };

  const createSwapRequest = (data: {
    toUserId: string;
    fromDate: string;
    fromShiftPart: 'morning' | 'evening' | 'full_day' | 'bathing';
    toDate: string;
    toShiftPart: 'morning' | 'evening' | 'full_day' | 'bathing';
    note?: string;
  }): boolean => {
    if (!currentUser) {
      alert('กรุณาเข้าสู่ระบบก่อนทำการขอสลับเวร');
      return false;
    }

    const targetUser = users.find((u) => u.id === data.toUserId);
    const newSwap: SwapRequest = {
      id: 'swap-' + Date.now(),
      fromUserId: currentUser.id,
      toUserId: data.toUserId,
      fromDate: data.fromDate,
      fromShiftPart: data.fromShiftPart,
      toDate: data.toDate,
      toShiftPart: data.toShiftPart,
      note: data.note || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setSwapRequests((prev) => [newSwap, ...prev]);
    safeSetDoc(doc(db, 'swap_requests', newSwap.id), newSwap).catch(console.warn);

    const shiftPartName: Record<string, string> = {
      morning: 'เวรเช้า',
      evening: 'เวรเย็น',
      full_day: 'เวรทั้งวัน',
      bathing: 'เวรอาบน้ำ',
    };

    addLog(
      'swap_request',
      `ส่งคำขอสลับ${shiftPartName[data.fromShiftPart] || 'เวร'} วันที่ ${data.fromDate} กับ ${targetUser?.name || 'เพื่อน'} (โน้ต: ${data.note || '-'})`
    );

    // Automatic LINE Push Notification
    if (targetUser && targetUser.lineUserId) {
      sendLinePushNotification(
        targetUser.lineUserId,
        `🔄 [BojoiDuty] คุณได้รับการขอสลับเวรใหม่!\n` +
        `จากคุณ: ${currentUser.nickname || currentUser.name}\n` +
        `📅 เวรของคุณ: ${data.fromDate} (${shiftPartName[data.fromShiftPart] || 'เวร'})\n` +
        `🔄 เสนอสลับกับ: ${data.toDate} (${shiftPartName[data.toShiftPart] || 'เวร'})\n` +
        `📝 หมายเหตุ: ${data.note || '-'}`
      );
    }

    return true;
  };

  const respondSwapRequest = (requestId: string, accept: boolean) => {
    const request = swapRequests.find((r) => r.id === requestId);
    if (!request) return;

    // Send LINE Push Notification to request author
    const fromUser = users.find((u) => u.id === request.fromUserId);
    if (fromUser && fromUser.lineUserId) {
      const statusText = accept ? '✅ ยอมรับคำขอสลับเวรแล้ว!' : '❌ ปฏิเสธคำขอสลับเวร';
      sendLinePushNotification(
        fromUser.lineUserId,
        `🔄 [BojoiDuty] อัปเดตคำขอสลับเวรวันที่ ${request.fromDate}\n${statusText}`
      );
    }

    if (!accept) {
      const updatedReq = { ...request, status: 'declined' as const, updatedAt: new Date().toISOString() };
      setSwapRequests((prev) =>
        prev.map((r) => (r.id === requestId ? updatedReq : r))
      );
      safeSetDoc(doc(db, 'swap_requests', requestId), updatedReq).catch(console.warn);
      addLog('swap_decline', `ปฏิเสธคำขอสลับเวร วันที่ ${request.fromDate}`);
      return;
    }

    setShifts((prevShifts) => {
      let updated = [...prevShifts];

      if (request.fromShiftPart === 'full_day' && request.toShiftPart === 'full_day') {
        const fromShift = updated.find((s) => s.date === request.fromDate && s.type === 'daily');
        const toShift = updated.find((s) => s.date === request.toDate && s.type === 'daily');

        if (fromShift) {
          fromShift.userId = request.toUserId;
          safeSetDoc(doc(db, 'shifts', fromShift.id), fromShift).catch(console.warn);
        }
        if (toShift) {
          toShift.userId = request.fromUserId;
          safeSetDoc(doc(db, 'shifts', toShift.id), toShift).catch(console.warn);
        }
      } else if (request.fromShiftPart === 'bathing' && request.toShiftPart === 'bathing') {
        const fromBath = updated.find((s) => s.date === request.fromDate && s.type === 'bathing');
        const toBath = updated.find((s) => s.date === request.toDate && s.type === 'bathing');

        if (fromBath) {
          fromBath.userId = request.toUserId;
          safeSetDoc(doc(db, 'bathing_schedules', fromBath.id), fromBath).catch(console.warn);
        }
        if (toBath) {
          toBath.userId = request.fromUserId;
          safeSetDoc(doc(db, 'bathing_schedules', toBath.id), toBath).catch(console.warn);
        }
      } else {
        const fromShiftIdx = updated.findIndex((s) => s.date === request.fromDate && s.type === 'daily');
        if (fromShiftIdx >= 0) {
          const shift = { ...updated[fromShiftIdx] };
          if (request.fromShiftPart === 'morning') {
            shift.morningUserId = request.toUserId;
            if (!shift.eveningUserId) shift.eveningUserId = request.fromUserId;
          } else if (request.fromShiftPart === 'evening') {
            shift.eveningUserId = request.toUserId;
            if (!shift.morningUserId) shift.morningUserId = request.fromUserId;
          }
          updated[fromShiftIdx] = shift;
          safeSetDoc(doc(db, 'shifts', shift.id), shift).catch(console.warn);
        }

        const toShiftIdx = updated.findIndex((s) => s.date === request.toDate && s.type === 'daily');
        if (toShiftIdx >= 0) {
          const shift = { ...updated[toShiftIdx] };
          if (request.toShiftPart === 'morning') {
            shift.morningUserId = request.fromUserId;
            if (!shift.eveningUserId) shift.eveningUserId = request.toUserId;
          } else if (request.toShiftPart === 'evening') {
            shift.eveningUserId = request.fromUserId;
            if (!shift.morningUserId) shift.morningUserId = request.toUserId;
          }
          updated[toShiftIdx] = shift;
          safeSetDoc(doc(db, 'shifts', shift.id), shift).catch(console.warn);
        }
      }

      return updated;
    });

    const acceptedReq = { ...request, status: 'accepted' as const, updatedAt: new Date().toISOString() };
    setSwapRequests((prev) =>
      prev.map((r) => (r.id === requestId ? acceptedReq : r))
    );
    safeSetDoc(doc(db, 'swap_requests', requestId), acceptedReq).catch(console.warn);

    addLog('swap_accept', `ยอมรับคำขอสลับเวร วันที่ ${request.fromDate} 🔄`);
  };

  const cancelSwapRequest = (requestId: string) => {
    setSwapRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'cancelled' } : r))
    );
    deleteDoc(doc(db, 'swap_requests', requestId)).catch(console.warn);
  };

  const addAnnouncement = async (title: string, content: string, date: string, badge?: string) => {
    const newAnn: Announcement = {
      id: 'ann-' + Date.now(),
      title,
      content,
      date,
      authorId: currentUser ? currentUser.id : 'guest',
      authorName: currentUser ? (currentUser.username || currentUser.name) : 'ผู้เยี่ยมชม',
      authorAvatar: currentUser?.avatar,
      createdAt: new Date().toISOString(),
      badge: badge || '',
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    safeSetDoc(doc(db, 'announcements', newAnn.id), newAnn).catch(console.warn);
    addLog('announcement_create', `เพิ่มประกาศใหม่: "${title}"`);

    // Broadcast announcement notification to all users with LINE account
    users.forEach((u) => {
      if (u.lineUserId) {
        sendLinePushNotification(
          u.lineUserId,
          `📢 [ประกาศใหม่จาก BojoiDuty]\n📌 หัวข้อ: ${title}\n📝 รายละเอียด: ${content}\n📅 มีผลวันที่: ${date}`
        );
      }
    });
  };

  const deleteAnnouncement = async (id: string) => {
    const target = announcements.find((a) => a.id === id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    deleteDoc(doc(db, 'announcements', id)).catch(console.warn);
    if (target) {
      addLog('announcement_delete', `ลบประกาศ: "${target.title}"`);
    }
  };

  const addUser = (
    name: string,
    nickname: string,
    color: string,
    username?: string,
    password?: string,
    icon?: string
  ) => {
    const chosenColor = color || AVAILABLE_COLORS[users.length % AVAILABLE_COLORS.length];
    const cleanUsername = username?.trim() || name.toLowerCase().replace(/\s+/g, '');
    const newUser: User = {
      id: 'user-' + Date.now(),
      username: cleanUsername,
      name,
      nickname: nickname || name,
      password: password || '123',
      icon: icon || AVAILABLE_ICONS[users.length % AVAILABLE_ICONS.length],
      color: chosenColor,
      bgLight: `${chosenColor}15`,
      borderLight: `${chosenColor}40`,
      role: 'member',
    };
    setUsers((prev) => [...prev, newUser]);
    safeSetDoc(doc(db, 'users', newUser.id), newUser).catch(console.warn);
    addLog('member_update', `เพิ่มสมาชิกใหม่: ${name}`);
  };

  const updateUser = (updatedUser: User) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    safeSetDoc(doc(db, 'users', updatedUser.id), updatedUser).catch(console.warn);
    addLog('member_update', `อัปเดตข้อมูลสมาชิก: ${updatedUser.name}`);

    // Notify user of profile/role updates by admin
    if (updatedUser.lineUserId) {
      sendLinePushNotification(
        updatedUser.lineUserId,
        `📢 [BojoiDuty] แอดมินได้ทำการอัปเดตข้อมูลโปรไฟล์/สิทธิ์การใช้งานของคุณเรียบร้อยแล้ว`
      );
    }
  };

  const deleteUser = async (id: string) => {
    const user = users.find((u) => u.id === id);

    const userShifts = shifts.filter((s) => s.userId === id || s.morningUserId === id || s.eveningUserId === id);
    for (const s of userShifts) {
      await deleteDoc(doc(db, 'shifts', s.id)).catch(console.warn);
    }
    setShifts((prev) => prev.filter((s) => s.userId !== id && s.morningUserId !== id && s.eveningUserId !== id));

    setUsers((prev) => prev.filter((u) => u.id !== id));
    deleteDoc(doc(db, 'users', id)).catch(console.warn);

    if (currentUserId === id) {
      const nextUser = users.find((u) => u.id !== id);
      setCurrentUserId(nextUser ? nextUser.id : null);
      if (!nextUser) localStorage.removeItem('bojoiduty_current_user_id');
    }

    if (user) {
      addLog('member_update', `[Admin] ลบบัญชีผู้ใช้: ${user.username || user.name}`);
      if (user.lineUserId) {
        sendLinePushNotification(
          user.lineUserId,
          `📢 [BojoiDuty] บัญชีผู้ใช้ของคุณถูกปรับเปลี่ยนหรือลบออกจากระบบโดยแอดมิน`
        );
      }
    }
  };

  const autoDistributeShifts = async (year: number, month: number) => {
    if (users.length === 0) return;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const newShifts: ShiftAssignment[] = [...shifts.filter((s) => {
      const [y, m] = s.date.split('-').map(Number);
      return y !== year || m !== month + 1;
    })];

    const generatedShifts: ShiftAssignment[] = [];
    let userIndex = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const user = users[userIndex % users.length];
      const newShift: ShiftAssignment = {
        id: 'shift-auto-' + dateStr,
        date: dateStr,
        type: 'daily',
        userId: user.id,
        notes: '',
        createdAt: new Date().toISOString(),
      };
      newShifts.push(newShift);
      generatedShifts.push(newShift);
      await safeSetDoc(doc(db, 'shifts', newShift.id), newShift).catch(console.warn);
      userIndex++;
    }

    setShifts(newShifts);
    addLog('auto_distribute', `จัดสรรเวรทั้งเดือน ${month + 1}/${year} ให้อัตโนมัติเท่ากันทุกคน (${users.length} คน)`);

    // Group assigned count by user and notify each user
    const userShiftCount = new Map<string, number>();
    generatedShifts.forEach((s) => {
      if (s.userId) userShiftCount.set(s.userId, (userShiftCount.get(s.userId) || 0) + 1);
    });

    userShiftCount.forEach((count, uId) => {
      const u = users.find((x) => x.id === uId);
      if (u && u.lineUserId) {
        sendLinePushNotification(
          u.lineUserId,
          `📢 [BojoiDuty] แอดมินได้จัดสรรเวรอัตโนมัติสำหรับเดือน ${month + 1}/${year} เรียบร้อยแล้ว!\n📌 คุณได้รับการจัดสรรเวรทั้งหมด ${count} วัน สามารถเข้าเช็คตารางบนระบบได้เลยครับ`
        );
      }
    });
  };

  const resetToDefaultData = async () => {
    setUsers([]);
    setCurrentUserId(null);
    localStorage.removeItem('bojoiduty_current_user_id');
    setShifts([]);
    setBathingSchedules([]);
    setSwapRequests([]);
    setAnnouncements([]);
    setActivityLogs([]);
    setBookingSettings(DEFAULT_BOOKING_SETTINGS);
    setCalendarTasks([]);
    setSelectedShifts([]);
    setActiveSwapSelection(null);

    try {
      const collectionsToWipe = ['users', 'shifts', 'bathing_schedules', 'announcements', 'swap_requests', 'calendar_tasks', 'activity_logs'];
      for (const colName of collectionsToWipe) {
        const snap = await getDocs(collection(db, colName));
        for (const d of snap.docs) {
          await deleteDoc(doc(db, colName, d.id)).catch(console.warn);
        }
      }
      await safeSetDoc(doc(db, 'settings', 'booking_settings'), DEFAULT_BOOKING_SETTINGS);
    } catch (e) {
      console.warn('Reset Firestore sync error:', e);
    }
  };

  const wipeAllData = async (): Promise<boolean> => {
    try {
      setUsers([]);
      setShifts([]);
      setSwapRequests([]);
      setAnnouncements([]);
      setActivityLogs([]);
      setBathingSchedules([]);
      setCalendarTasks([]);
      setSelectedShifts([]);
      setActiveSwapSelection(null);
      setCurrentUserId(null);
      localStorage.removeItem('bojoiduty_current_user_id');

      const collectionsToWipe = ['users', 'shifts', 'swap_requests', 'announcements', 'activity_logs', 'bathing_schedules', 'calendar_tasks'];
      for (const colName of collectionsToWipe) {
        const snap = await getDocs(collection(db, colName));
        for (const d of snap.docs) {
          await deleteDoc(doc(db, colName, d.id)).catch(console.warn);
        }
      }

      addLog('admin_wipe', 'ล้างข้อมูลบัญชีผู้ใช้และตารางเวรทั้งหมดเรียบร้อยแล้ว');
      return true;
    } catch (err) {
      console.error('Error wiping all data:', err);
      return false;
    }
  };

  const quotaStats = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const targetPerMember = Math.ceil(daysInMonth / Math.max(1, users.length));

    const userCounts: Record<string, { daily: number; bathing: number; total: number }> = {};
    users.forEach((u) => {
      userCounts[u.id] = { daily: 0, bathing: 0, total: 0 };
    });

    shifts.forEach((s) => {
      if (s.type === 'daily') {
        const mId = getShiftMorningUserId(s);
        const eId = getShiftEveningUserId(s);

        if (mId && eId && mId === eId) {
          if (userCounts[mId]) {
            userCounts[mId].daily += 1;
            userCounts[mId].total += 1;
          }
        } else {
          if (mId && userCounts[mId]) {
            userCounts[mId].daily += 0.5;
            userCounts[mId].total += 0.5;
          }
          if (eId && userCounts[eId]) {
            userCounts[eId].daily += 0.5;
            userCounts[eId].total += 0.5;
          }
        }
      } else if (s.type === 'bathing') {
        if (userCounts[s.userId]) {
          userCounts[s.userId].bathing += 1;
          userCounts[s.userId].total += 1;
        }
      }
    });

    return {
      totalDaysInMonth: daysInMonth,
      targetPerMember,
      userCounts,
    };
  }, [users, shifts]);

  const currentUserRemainingQuota = useMemo(() => {
    if (!currentUser) return quotaStats.targetPerMember;
    const bookedDaily = quotaStats.userCounts[currentUser.id]?.daily || 0;
    const selectedDaily = selectedShifts.filter((s) => s.type === 'daily').length;
    const remaining = quotaStats.targetPerMember - bookedDaily - selectedDaily;
    return Math.max(0, remaining);
  }, [quotaStats, currentUser, selectedShifts]);

  return (
    <DutyContext.Provider
      value={{
        currentUser,
        setCurrentUser: (u) => setCurrentUserId(u ? u.id : null),
        currentUserId,
        users,
        login,
        loginWithLine,
        pendingLineProfile,
        setPendingLineProfile,
        completeLineRegistration,
        linkLineToExistingUser,
        cancelPendingLineProfile,
        isLineFriendModalOpen,
        openLineFriendModal,
        closeLineFriendModal,
        sendLinePushNotification,
        register,
        logout,
        addUser,
        updateUser,
        deleteUser,
        shifts,
        bookShift: (d, t, n) => {
          bookShift(d, t, n);
          return true;
        },
        batchBookShifts,
        cancelShift,
        adminAssignShift,
        adminDeleteShift,
        adminDeleteAllShiftsForDate,
        adminClearShiftPart,
        bathingSchedules,
        toggleBathingDate,
        isBathingDate,
        swapRequests,
        createSwapRequest,
        respondSwapRequest,
        cancelSwapRequest,
        announcements,
        addAnnouncement,
        deleteAnnouncement,
        activityLogs,
        clearActivityLogs: () => setActivityLogs([]),
        autoDistributeShifts,
        resetToDefaultData,
        wipeAllData,
        selectedShifts,
        toggleSelectShift,
        isShiftSelected,
        clearSelectedShifts,
        activeSwapSelection,
        startSwapWithShift,
        selectMyShiftForSwap,
        updateSwapSelectionNote,
        updateSwapSelectionPart,
        cancelSwapSelection,
        confirmDirectSwap,
        bookingSettings,
        updateBookingSettings,
        setMonthUnlockSchedule,
        deleteMonthUnlockSchedule,
        isDateOpenForBooking,
        calendarTasks,
        addCalendarTaskNote,
        deleteCalendarTaskNote,
        selectedDate,
        setSelectedDate,
        selectedShiftType,
        setSelectedShiftType,
        quotaStats,
        currentUserRemainingQuota,
        isFirebaseSynced,
      }}
    >
      {children}
    </DutyContext.Provider>
  );
};

export const useDuty = () => {
  const context = useContext(DutyContext);
  if (!context) {
    throw new Error('useDuty must be used within a DutyProvider');
  }
  return context;
};
