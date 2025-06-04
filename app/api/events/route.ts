import { NextRequest, NextResponse } from 'next/server'
import { createEvent, getAllEvents } from '@/lib/event-service'

export async function POST(request: NextRequest) {
  try {
    const eventData = await request.json()
    const eventId = await createEvent(eventData)
    return NextResponse.json({ id: eventId }, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const events = await getAllEvents()
    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}