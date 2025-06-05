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
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
      }
      
      const uid = `${Date.now()}-${confirmedDateOptionId}@schedulen.app`
      const dtstamp = formatDateTime(new Date())
      const dtstart = formatDateTime(startTime)
      const dtend = formatDateTime(endTime)
      
      icalContent += '\r\nBEGIN:VEVENT'
      icalContent += `\r\nUID:${uid}`
      icalContent += `\r\nDTSTAMP:${dtstamp}`
      icalContent += `\r\nDTSTART:${dtstart}`
      icalContent += `\r\nDTEND:${dtend}`
      icalContent += `\r\nSUMMARY:${event.title.replace(/[,;\\]/g, '\\$&')}`
      
      if (event.description) {
        icalContent += `\r\nDESCRIPTION:${event.description.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n')}`
      }
      
      if (attendees.length > 0) {
        icalContent += `\r\nATTENDEES:${attendees.join(', ')}`
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