import { format } from 'date-fns';

export interface ICalEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  organizer?: string;
  attendees?: string[];
}

export function generateICalFile(event: ICalEvent): string {
  const formatDateTime = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const uid = `${Date.now()}@schedulen.app`;
  const dtstamp = formatDateTime(new Date());
  const dtstart = formatDateTime(event.startTime);
  const dtend = formatDateTime(event.endTime);

  let icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ScheduleN//ScheduleN App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
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