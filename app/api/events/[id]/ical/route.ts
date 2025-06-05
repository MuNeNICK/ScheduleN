import { NextRequest, NextResponse } from 'next/server'
import { getEvent } from '@/lib/event-service'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    // Verify event exists and user has access
    const authCookie = request.cookies.get(`event_auth_${id}`)
    const event = await getEvent(id)
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    
    // Check if password is required and user is authenticated
    if (event.password && !authCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Check if event has confirmed dates
    if (!event.confirmedDateOptionIds || event.confirmedDateOptionIds.length === 0) {
      return NextResponse.json({ error: 'No dates confirmed yet' }, { status: 400 })
    }
    
    // Generate multiple iCal events
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ScheduleN//ScheduleN App//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ].join('\r\n')
    
    for (const confirmedDateOptionId of event.confirmedDateOptionIds) {
      const confirmedDateOption = event.dateOptions.find(
        option => option.id === confirmedDateOptionId
      )
      
      if (!confirmedDateOption) continue
      
      
      // Parse the date and time
      let startTime: Date
      let endTime: Date
      
      if (confirmedDateOption.startTime) {
        // Use the specific start time from the date option
        startTime = new Date(confirmedDateOption.datetime + 'T' + confirmedDateOption.startTime + ':00')
        if (confirmedDateOption.endTime) {
          endTime = new Date(confirmedDateOption.datetime + 'T' + confirmedDateOption.endTime + ':00')
        } else {
          // Default to 1 hour if no end time specified
          endTime = new Date(startTime.getTime() + 60 * 60 * 1000)
        }
      } else {
        // Fallback to default times if no time specified
        startTime = new Date(confirmedDateOption.datetime + 'T10:00:00')
        endTime = new Date(startTime.getTime() + 60 * 60 * 1000)
      }
      
      // Get participant names for attendees
      const attendees = event.participants
        .filter(p => {
          const availability = p.availabilities[confirmedDateOptionId.toString()]
          return availability === 'available'
        })
        .map(p => p.name)
      
      // Generate individual event
      const formatDateTime = (date: Date): string => {
        // Format as local time without timezone (YYYYMMDDTHHMMSS)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        return `${year}${month}${day}T${hours}${minutes}${seconds}`
      }

      const formatDateOnly = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}${month}${day}`
      }
      
      const uid = `${event.id}-${confirmedDateOptionId}-${Date.now()}@schedulen.app`
      const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
      
      let dtstart: string
      let dtend: string
      let isAllDay = false
      
      if (confirmedDateOption.startTime) {
        // Time specified - use datetime format
        dtstart = formatDateTime(startTime)
        dtend = formatDateTime(endTime)
      } else {
        // No time specified - use all-day format
        isAllDay = true
        const dateOnly = new Date(confirmedDateOption.datetime + 'T00:00:00')
        dtstart = formatDateOnly(dateOnly)
        const nextDay = new Date(dateOnly)
        nextDay.setDate(nextDay.getDate() + 1)
        dtend = formatDateOnly(nextDay)
      }
      
      icalContent += '\r\nBEGIN:VEVENT'
      icalContent += `\r\nUID:${uid}`
      icalContent += `\r\nDTSTAMP:${dtstamp}`
      icalContent += isAllDay ? `\r\nDTSTART;VALUE=DATE:${dtstart}` : `\r\nDTSTART:${dtstart}`
      icalContent += isAllDay ? `\r\nDTEND;VALUE=DATE:${dtend}` : `\r\nDTEND:${dtend}`
      icalContent += `\r\nSUMMARY:${event.title.replace(/[,;\\]/g, '\\$&')}`
      
      const description = event.description + (attendees.length > 0 ? `\n\n参加者: ${attendees.join(', ')}` : '')
      if (description) {
        icalContent += `\r\nDESCRIPTION:${description.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n')}`
      }
      
      icalContent += '\r\nSTATUS:CONFIRMED'
      icalContent += '\r\nEND:VEVENT'
    }
    
    icalContent += '\r\nEND:VCALENDAR'
    
    // Return iCal file
    return new NextResponse(icalContent, {
      headers: {
        'Content-Type': 'text/calendar;charset=utf-8',
        'Content-Disposition': `attachment; filename="${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`
      }
    })
  } catch (error) {
    console.error('Error generating iCal file:', error)
    return NextResponse.json(
      { error: 'Failed to generate iCal file' },
      { status: 500 }
    )
  }
}