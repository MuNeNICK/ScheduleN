import { NextRequest, NextResponse } from 'next/server'
import { addParticipant, updateParticipant, isEventPasswordProtected, validateEventPassword } from '@/lib/event-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { name, availabilities, comment, password } = await request.json()
    
    // Check password if event is protected
    const isProtected = await isEventPasswordProtected(id)
    if (isProtected) {
      // Check for password in cookies or request body
      const cookiePassword = request.cookies.get(`event_password_${id}`)?.value
      const validPassword = password || cookiePassword
      
      if (!validPassword || !(await validateEventPassword(id, validPassword))) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        )
      }
    }
    
    await addParticipant(id, name, availabilities, comment)
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error adding participant:', error)
    return NextResponse.json({ error: 'Failed to add participant' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { name, availabilities, comment, password } = await request.json()
    
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Participant name is required' },
        { status: 400 }
      )
    }
    
    // Check password if event is protected
    const isProtected = await isEventPasswordProtected(id)
    if (isProtected) {
      // Check for password in cookies or request body
      const cookiePassword = request.cookies.get(`event_password_${id}`)?.value
      const validPassword = password || cookiePassword
      
      if (!validPassword || !(await validateEventPassword(id, validPassword))) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        )
      }
    }
    
    await updateParticipant(id, name.trim(), availabilities, comment)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error updating participant:', error)
    
    if (error instanceof Error && error.message === 'Participant not found') {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update participant' },
      { status: 500 }
    )
  }
}