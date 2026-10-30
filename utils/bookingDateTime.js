/**
 * Utility functions for validating and constraining booking dates and times.
 * Prevents selection of past dates and past times.
 */

export function cleanDay(date) {
  if (!date) return new Date();
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  const d1 = cleanDay(date1);
  const d2 = cleanDay(date2);
  return d1.getTime() === d2.getTime();
}

export function isPastDay(date, referenceDate = new Date()) {
  if (!date) return true;
  const target = cleanDay(date);
  const ref = cleanDay(referenceDate);
  return target.getTime() < ref.getTime();
}

export function isValidDayInRange(date, minDay = new Date(), maxDaysAhead = 90) {
  if (!date) return false;
  const target = cleanDay(date);
  const start = cleanDay(minDay);
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + maxDaysAhead);
  return target.getTime() >= start.getTime() && target.getTime() <= end.getTime();
}

export function parseTimeParts(value) {
  if (!value) {
    const now = new Date();
    const h24 = now.getHours();
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const m = now.getMinutes();
    const mer = h24 >= 12 ? 'PM' : 'AM';
    return { hour24: h24, hour12: h12, minute: m, meridiem: mer };
  }

  if (typeof value === 'object') {
    if (value.hour24 != null) {
      const h24 = Math.max(0, Math.min(23, value.hour24));
      const m = Math.max(0, Math.min(59, parseInt(value.minute || '0', 10)));
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      const mer = h24 >= 12 ? 'PM' : 'AM';
      return { hour24: h24, hour12: h12, minute: m, meridiem: mer };
    }
    if (value.hour != null) {
      let h12 = parseInt(value.hour, 10);
      const mer = String(value.meridiem || (h12 >= 12 ? 'PM' : 'AM')).toUpperCase();
      if (h12 > 12) h12 -= 12;
      if (h12 === 0) h12 = 12;
      let h24 = h12 % 12;
      if (mer === 'PM') h24 += 12;
      const m = Math.max(0, Math.min(59, parseInt(value.minute || '0', 10)));
      return { hour24: h24, hour12: h12, minute: m, meridiem: mer };
    }
  }

  if (typeof value === 'number') {
    const h24 = Math.max(0, Math.min(23, value));
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const mer = h24 >= 12 ? 'PM' : 'AM';
    return { hour24: h24, hour12: h12, minute: 0, meridiem: mer };
  }

  const str = String(value).trim();
  const match = str.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (!match) {
    return parseTimeParts(null);
  }

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2] || '0', 10);
  let mer = match[3] ? match[3].toUpperCase() : null;

  if (mer === 'PM' && h < 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  if (!mer) {
    mer = h >= 12 ? 'PM' : 'AM';
  }

  const h24 = Math.max(0, Math.min(23, h));
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const clampedM = Math.max(0, Math.min(59, m));

  return { hour24: h24, hour12: h12, minute: clampedM, meridiem: mer };
}

export function timeToMinutes(hour24, minute) {
  return hour24 * 60 + (parseInt(minute, 10) || 0);
}

export function compareTimes(timeA, timeB) {
  const pA = parseTimeParts(timeA);
  const pB = parseTimeParts(timeB);
  return timeToMinutes(pA.hour24, pA.minute) - timeToMinutes(pB.hour24, pB.minute);
}

export function isTimeBefore(timeA, timeB) {
  return compareTimes(timeA, timeB) < 0;
}

/**
 * Determine the strict minimum time allowed according to current selection:
 * - When pickup date is today: min time is current time (with optional buffer).
 * - When return date is same day as pickup: min time is pickup time.
 * - When return date is today and same day: max(now, pickupTime).
 */
export function getBookingMinTime({
  isToday = false,
  isSameDayAsPickup = false,
  pickupTime = null,
  referenceDate = new Date(),
  minBufferMinutes = 0,
}) {
  let minH24 = null;
  let minM = null;

  if (isToday) {
    let nowH = referenceDate.getHours();
    let nowM = referenceDate.getMinutes() + minBufferMinutes;
    if (nowM >= 60) {
      nowH += Math.floor(nowM / 60);
      nowM %= 60;
    }
    if (nowH <= 23) {
      minH24 = nowH;
      minM = nowM;
    }
  }

  if (isSameDayAsPickup && pickupTime) {
    const pt = parseTimeParts(pickupTime);
    if (minH24 === null) {
      minH24 = pt.hour24;
      minM = pt.minute;
    } else {
      const todayTotal = timeToMinutes(minH24, minM);
      const pickupTotal = timeToMinutes(pt.hour24, pt.minute);
      if (pickupTotal > todayTotal) {
        minH24 = pt.hour24;
        minM = pt.minute;
      }
    }
  }

  if (minH24 === null) return null;
  return {
    hour24: minH24,
    minute: minM,
  };
}

/**
 * Check if a 12-hour digit in given meridiem is selectable considering operating hours and minTime.
 */
export function isHourSelectable(hour12, meridiem, opHours, minTime) {
  let h24 = (hour12 % 12) + (meridiem === 'PM' ? 12 : 0);

  // Operating hours check
  if (opHours && !opHours.is24Hours) {
    if (h24 < opHours.openHour || h24 > opHours.closeHour) {
      return false;
    }
  }

  // Min time constraint check
  if (minTime) {
    if (h24 < minTime.hour24) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a minute is selectable considering operating hours and minTime.
 */
export function isMinuteSelectable(hour12, minute, meridiem, opHours, minTime) {
  let h24 = (hour12 % 12) + (meridiem === 'PM' ? 12 : 0);
  const m = parseInt(minute, 10) || 0;

  // Operating hours boundary check
  if (opHours && !opHours.is24Hours) {
    if (h24 === opHours.openHour && opHours.openMinute != null && m < opHours.openMinute) {
      return false;
    }
    if (h24 === opHours.closeHour && opHours.closeMinute != null && m > opHours.closeMinute) {
      return false;
    }
  }

  // Min time constraint check
  if (minTime) {
    if (h24 < minTime.hour24) return false;
    if (h24 === minTime.hour24 && m < minTime.minute) return false;
  }

  return true;
}

/**
 * Get all 12-hour values selectable for a given meridiem.
 */
export function getSelectableHoursForMeridiem(meridiem, opHours, minTime) {
  const allHours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  return allHours.filter((h) => isHourSelectable(h, meridiem, opHours, minTime));
}

/**
 * Clamp a given time against both operating hours and minimum time.
 */
export function clampBookingTime(hour12, minuteStr, meridiem, opHours, minTime) {
  let h24 = (hour12 % 12) + (meridiem === 'PM' ? 12 : 0);
  let m = parseInt(minuteStr, 10) || 0;

  if (opHours && !opHours.is24Hours) {
    if (h24 < opHours.openHour) {
      h24 = opHours.openHour;
      m = Math.max(m, opHours.openMinute || 0);
    } else if (h24 > opHours.closeHour) {
      h24 = opHours.closeHour;
      m = Math.min(m, opHours.closeMinute ?? 59);
    } else if (h24 === opHours.closeHour && opHours.closeMinute != null && m > opHours.closeMinute) {
      m = opHours.closeMinute;
    } else if (h24 === opHours.openHour && opHours.openMinute != null && m < opHours.openMinute) {
      m = opHours.openMinute;
    }
  }

  if (minTime) {
    if (h24 < minTime.hour24) {
      h24 = minTime.hour24;
      m = Math.max(m, minTime.minute);
    } else if (h24 === minTime.hour24 && m < minTime.minute) {
      m = minTime.minute;
    }
  }

  const nextMer = h24 >= 12 ? 'PM' : 'AM';
  const nextH12 = h24 % 12 === 0 ? 12 : h24 % 12;

  return {
    hour: nextH12,
    minute: String(m).padStart(2, '0'),
    meridiem: nextMer,
    hour24: h24,
  };
}

/**
 * Validate an entire booking range.
 */
export function validateBookingRange({
  pickupDay,
  pickupTime,
  dropDay,
  dropTime,
  referenceDate = new Date(),
}) {
  if (!pickupDay) return { valid: false, error: 'Choose pickup date' };
  if (isPastDay(pickupDay, referenceDate)) {
    return { valid: false, error: 'Pickup date cannot be in the past' };
  }

  if (!pickupTime) return { valid: false, error: 'Choose pickup time' };
  if (isSameDay(pickupDay, referenceDate)) {
    const pt = parseTimeParts(pickupTime);
    const nowH = referenceDate.getHours();
    const nowM = referenceDate.getMinutes();
    if (timeToMinutes(pt.hour24, pt.minute) < timeToMinutes(nowH, nowM)) {
      return { valid: false, error: 'Pickup time cannot be in the past' };
    }
  }

  if (!dropDay) return { valid: false, error: 'Choose drop date' };
  if (cleanDay(dropDay).getTime() < cleanDay(pickupDay).getTime()) {
    return { valid: false, error: 'Drop date cannot be earlier than pickup date' };
  }

  if (!dropTime) return { valid: false, error: 'Choose drop time' };
  if (isSameDay(pickupDay, dropDay)) {
    const pt = parseTimeParts(pickupTime);
    const dt = parseTimeParts(dropTime);
    if (timeToMinutes(dt.hour24, dt.minute) < timeToMinutes(pt.hour24, pt.minute)) {
      return { valid: false, error: 'Drop time cannot be earlier than pickup time' };
    }
  }

  return { valid: true, error: null };
}
