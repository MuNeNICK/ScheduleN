import { NextRequest, NextResponse } from 'next/server'
import { validateEventPassword } from '@/lib/event-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { password } = await request.json()
    
    const isValid = await validateEventPassword(id, password || '')
    
    if (isValid) {
      // Set httpOnly cookie for 24 hours
      const response = NextResponse.json({ valid: true })
      response.cookies.set(`event_auth_${id}`, password, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 // 24 hours
      })
      return response
    } else {
      return NextResponse.json({ valid: false })
    }
  } catch (error) {
    console.error('Error validating password:', error)
    return NextResponse.json({ error: 'Failed to validate password' }, { status: 500 })
  }
}