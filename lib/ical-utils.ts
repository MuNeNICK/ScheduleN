import { format } from 'date-fns';

export interface ICalEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  organizer?: string;
  attendees?: string[];
  isAllDay?: boolean;
}

export function generateICalFile(event: ICalEvent): string {
  const formatDateTime = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const formatDateOnly = (date: Date): string => {
    return format(date, "yyyyMMdd");
  };

  const uid = `${Date.now()}@schedulen.app`;
  const dtstamp = formatDateTime(new Date());
  
  let dtstart: string;
  let dtend: string;
  
  if (event.isAllDay) {
    dtstart = formatDateOnly(event.startTime);
    dtend = formatDateOnly(event.endTime);
  } else {
    dtstart = formatDateTime(event.startTime);
    dtend = formatDateTime(event.endTime);
  }

  const icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ScheduleN//ScheduleN App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    event.isAllDay ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART:${dtstart}`,
    event.isAllDay ? `DTEND;VALUE=DATE:${dtend}` : `DTEND:${dtend}`,
    `SUMMARY:${escapeICalString(event.title)}`,
  ];

  if (event.description) {
    icalContent.push(`DESCRIPTION:${escapeICalString(event.description)}`);
  }

  if (event.location) {
    icalContent.push(`LOCATION:${escapeICalString(event.location)}`);
  }

  if (event.organizer) {
    icalContent.push(`ORGANIZER:${event.organizer}`);
  }

  if (event.attendees && event.attendees.length > 0) {
    event.attendees.forEach(attendee => {
      icalContent.push(`ATTENDEE:${attendee}`);
    });
  }

  icalContent.push(
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  );

  return icalContent.join('\r\n');
}

function escapeICalString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

export function createICalDownload(icalContent: string, filename: string): void {
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function createGoogleCalendarUrl(event: ICalEvent): string {
  const formatGoogleDateTime = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  };

  const formatGoogleDateOnly = (date: Date): string => {
    return format(date, "yyyyMMdd");
  };

  let startTime: string;
  let endTime: string;
  
  if (event.isAllDay) {
    startTime = formatGoogleDateOnly(event.startTime);
    endTime = formatGoogleDateOnly(event.endTime);
  } else {
    startTime = formatGoogleDateTime(event.startTime);
    endTime = formatGoogleDateTime(event.endTime);
  }
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startTime}/${endTime}`,
    details: event.description || '',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function openGoogleCalendar(event: ICalEvent): void {
  const url = createGoogleCalendarUrl(event);
  window.open(url, '_blank');
}