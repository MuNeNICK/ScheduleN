import { NextRequest, NextResponse } from 'next/server'
import { getEvent, updateEvent, deleteEvent, validateEventPassword } from '@/lib/event-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const event = await getEvent(id)
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // If event has password protection, check cookie authentication
    if (event.password) {
      const cookiePassword = request.cookies.get(`event_auth_${id}`)?.value
      const isValid = await validateEventPassword(id, cookiePassword || '')
      
      if (!isValid) {
        // Return limited event data without sensitive information
        return NextResponse.json({
          id: event.id,
          title: event.title,
          description: event.description,
          passwordProtected: true,
          createdAt: event.createdAt
        })
      }
    }

    // Remove password from response for security
    const { password: _password, ...eventData } = event
    return NextResponse.json(eventData)
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updates = await request.json()
    await updateEvent(id, updates)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteEvent(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}