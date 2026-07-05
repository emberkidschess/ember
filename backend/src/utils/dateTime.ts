export const SUPPORTED_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'Asia/Kolkata',
  'Asia/Riyadh',
  'Asia/Dubai',
  'Asia/Qatar',
  'Asia/Kuwait',
  'Asia/Bahrain',
  'Asia/Muscat',
] as const;

function offsetAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const representedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );
  return representedAsUtc - instant.getTime();
}

export function zonedDateTimeToUtc(date: Date | string, time: string, timeZone: string): Date {
  if (!SUPPORTED_TIMEZONES.includes(timeZone as (typeof SUPPORTED_TIMEZONES)[number])) {
    throw new Error(`Unsupported timezone: ${timeZone}`);
  }
  const datePart = new Date(date).toISOString().slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const naive = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  let result = new Date(naive.getTime() - offsetAt(naive, timeZone));
  // A second pass handles DST boundaries where the first offset lookup was
  // performed on the opposite side of the transition.
  result = new Date(naive.getTime() - offsetAt(result, timeZone));
  return result;
}

export function classWindow(classData: {
  date: Date | string;
  startTime: string;
  endTime: string;
  timezone: string;
}): { startAt: Date; endAt: Date } {
  return {
    startAt: zonedDateTimeToUtc(classData.date, classData.startTime, classData.timezone),
    endAt: zonedDateTimeToUtc(classData.date, classData.endTime, classData.timezone),
  };
}

/**
 * Class dates are stored as date-only values at UTC midnight. Convert the
 * current calendar date in a student's timezone to that storage shape so a
 * class later today is not dropped merely because UTC midnight has passed.
 */
export function localCalendarDateAsUtc(timeZone: string, instant = new Date()): Date {
  if (!SUPPORTED_TIMEZONES.includes(timeZone as (typeof SUPPORTED_TIMEZONES)[number])) {
    throw new Error(`Unsupported timezone: ${timeZone}`);
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
}
