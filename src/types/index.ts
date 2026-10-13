export interface User {
  id: string;
  username: string;
  name: string;
  nickname?: string;
  password?: string;
  icon: string;
  avatar?: string;
  color: string;
  bgLight: string;
  borderLight: string;
  role: 'admin' | 'member';
  lineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  lineConnectedAt?: string;
  lineNotificationEnabled?: boolean;
}

export type ShiftPart = 'full_day' | 'morning' | 'evening' | 'bathing';

export interface ShiftAssignment {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'daily' | 'bathing';
  userId: string;
  morningUserId?: string;
  eveningUserId?: string;
  notes?: string;
  createdAt: string;
}

export interface BathingScheduleConfig {
  date: string; // YYYY-MM-DD
  enabled: boolean;
  notes?: string;
}

export interface SwapRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromDate: string;
  fromShiftPart: 'morning' | 'evening' | 'full_day' | 'bathing';
  toDate: string;
  toShiftPart: 'morning' | 'evening' | 'full_day' | 'bathing';
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  badge?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  actionType:
    | 'book_shift'
    | 'cancel_shift'
    | 'swap_request'
    | 'swap_accept'
    | 'swap_decline'
    | 'announcement_create'
    | 'announcement_delete'
    | 'bathing_update'
    | 'auto_distribute'
    | 'member_update'
    | 'user_login'
    | 'user_register'
    | 'task_create'
    | 'task_delete'
    | 'unlock_schedule_update'
    | 'admin_wipe';
  description: string;
  timestamp: string;
}

export interface SelectedShiftTarget {
  date: string;
  type: 'daily' | 'bathing';
}

export interface MonthUnlockSchedule {
  monthKey: string; // YYYY-MM (e.g., "2026-11")
  openDate: string; // YYYY-MM-DD (e.g., "2026-10-30")
  openTime: string; // HH:mm (e.g., "12:00")
  notes?: string;
}

export interface BookingSettings {
  bookingOpenDay: number;
  allowPastBooking: boolean;
  openMonthsAhead: number;
  monthSchedules?: Record<string, MonthUnlockSchedule>; // Flexible unlock date/time per month
}

export interface SwapSelectionState {
  targetUserId: string;
  targetUserName: string;
  targetUserIcon: string;
  targetDate: string;
  targetType: 'daily' | 'bathing';
  targetPart: 'full_day' | 'morning' | 'evening' | 'bathing';
  myDate?: string;
  myType?: 'daily' | 'bathing';
  myPart?: 'full_day' | 'morning' | 'evening' | 'bathing';
  note?: string;
}

export interface CalendarTaskNote {
  id: string;
  type: 'task' | 'note';
  title: string;
  startDate: string;
  endDate?: string;
  color?: string;
  icon?: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}
