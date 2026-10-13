import { ShiftAssignment } from '../types';

/**
 * Returns the user ID responsible for the morning slot of a daily shift,
 * or undefined if the morning slot is unassigned/cleared.
 */
export function getShiftMorningUserId(shift?: ShiftAssignment | null): string | undefined {
  if (!shift || shift.type !== 'daily') return undefined;

  // If morning is explicitly set as non-empty string
  if (typeof shift.morningUserId === 'string') {
    return shift.morningUserId.trim() !== '' ? shift.morningUserId.trim() : undefined;
  }

  // If evening is explicitly defined (even if empty) but morning is not,
  // then morning is unassigned
  if (typeof shift.eveningUserId === 'string') {
    return undefined;
  }

  // Full-day fallback (legacy or newly booked full-day shifts without explicit morning/evening keys)
  return shift.userId ? shift.userId.trim() : undefined;
}

/**
 * Returns the user ID responsible for the evening slot of a daily shift,
 * or undefined if the evening slot is unassigned/cleared.
 */
export function getShiftEveningUserId(shift?: ShiftAssignment | null): string | undefined {
  if (!shift || shift.type !== 'daily') return undefined;

  // If evening is explicitly set as non-empty string
  if (typeof shift.eveningUserId === 'string') {
    return shift.eveningUserId.trim() !== '' ? shift.eveningUserId.trim() : undefined;
  }

  // If morning is explicitly defined (even if empty) but evening is not,
  // then evening is unassigned
  if (typeof shift.morningUserId === 'string') {
    return undefined;
  }

  // Full-day fallback
  return shift.userId ? shift.userId.trim() : undefined;
}

/**
 * Checks whether a daily or bathing shift has any assigned users.
 */
export function isShiftEmpty(shift?: ShiftAssignment | null): boolean {
  if (!shift) return true;
  if (shift.type === 'bathing') {
    return !shift.userId || shift.userId.trim() === '';
  }
  return !getShiftMorningUserId(shift) && !getShiftEveningUserId(shift);
}

/**
 * Checks if a specific user is assigned to a shift (either morning, evening, full-day, or bathing).
 */
export function isUserAssignedToShift(shift: ShiftAssignment | null | undefined, userId: string): boolean {
  if (!shift || !userId) return false;
  if (shift.type === 'bathing') {
    return shift.userId === userId;
  }
  return getShiftMorningUserId(shift) === userId || getShiftEveningUserId(shift) === userId;
}
