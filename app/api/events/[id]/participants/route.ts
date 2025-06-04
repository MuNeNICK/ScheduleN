import { NextRequest, NextResponse } from 'next/server'
import { addParticipant } from '@/lib/event-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { name, availabilities, comment } = await request.json()
    await addParticipant(id, name, availabilities, comment)
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error adding participant:', error)
    return NextResponse.json({ error: 'Failed to add participant' }, { status: 500 })
  }
}