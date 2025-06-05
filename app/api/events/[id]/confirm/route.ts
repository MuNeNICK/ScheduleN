import { NextRequest, NextResponse } from 'next/server'
import { toggleEventDateConfirmation, getEvent } from '@/lib/event-service'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { dateOptionId } = await request.json()
    const { id } = await context.params
    
    if (!dateOptionId) {
      return NextResponse.json({ error: 'Date option ID is required' }, { status: 400 })
    }
    
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
    
    const result = await toggleEventDateConfirmation(id, dateOptionId)
    
    return NextResponse.json({ success: true, confirmed: result.confirmed })
  } catch (error) {
    console.error('Error toggling event date confirmation:', error)
    return NextResponse.json(
      { error: 'Failed to toggle event date confirmation' },
      { status: 500 }
    )
  }
}