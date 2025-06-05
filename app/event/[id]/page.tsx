"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { ArrowLeft, Users, Calendar, Copy, Check, Edit2, ChevronDown, ChevronUp, CheckCircle, Download, XCircle } from "lucide-react"
import Link from "next/link"
import { ja } from "date-fns/locale"

interface DateOptionWithId {
  id?: number
  datetime: string
  formatted: string
  startTime?: string
  endTime?: string
}

interface ParticipantWithData {
  name: string
  availabilities: Record<string, string>
  comment?: string
  submittedAt: string
}

interface Event {
  id: string
  title: string
  description: string
  password?: string
  passwordProtected?: boolean
  dateOptions?: DateOptionWithId[]
  participants?: ParticipantWithData[]
  createdAt: string
  confirmedDateOptionIds?: number[]
}

type AvailabilityStatus = "unknown" | "available" | "unavailable"

export default function EventPage() {
  const params = useParams()
  const [event, setEvent] = useState<Event | null>(null)
  const [participantName, setParticipantName] = useState("")
  const [participantComment, setParticipantComment] = useState("")
  const [availabilities, setAvailabilities] = useState<Record<string, AvailabilityStatus>>({})
  const [isCopied, setIsCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null)
  const [showParticipateForm, setShowParticipateForm] = useState(false)
  const [showEventDetails, setShowEventDetails] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [password, setPassword] = useState("")
  const [isValidatingPassword, setIsValidatingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [isConfirming, setIsConfirming] = useState(false)
  const [calendarKey, setCalendarKey] = useState(0)
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false)
  const [showIndividualDropdowns, setShowIndividualDropdowns] = useState<Record<number, boolean>>({})
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [tableViewMode, setTableViewMode] = useState<'all' | 'monthly'>('all')
  const [selectedTableMonth, setSelectedTableMonth] = useState(new Date())
  const participateFormRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.calendar-dropdown')) {
        setShowCalendarDropdown(false)
        setShowIndividualDropdowns({})
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${params.id}`)
        if (response.ok) {
          const foundEvent = await response.json()
          
          // Check if event is password protected
          if (foundEvent.passwordProtected) {
            setPasswordRequired(true)
            setEvent(foundEvent)
            return
          }
          
          setEvent(foundEvent)
          setPasswordRequired(false)
          
          if (foundEvent.dateOptions) {
            const initialAvailabilities: Record<string, AvailabilityStatus> = {}
            foundEvent.dateOptions.forEach((option: DateOptionWithId) => {
              const key = option.id ? option.id.toString() : option.datetime
              initialAvailabilities[key] = "unknown"
            })
            setAvailabilities(initialAvailabilities)
          }
        }
      } catch (error) {
        console.error('Error fetching event:', error)
      }
    }
    
    fetchEvent()
  }, [params.id])

  const toggleAvailability = (dateOptionId: string) => {
    const statuses: AvailabilityStatus[] = ["unknown", "available", "unavailable"]
    const currentStatus = availabilities[dateOptionId] || "unknown"
    const currentIndex = statuses.indexOf(currentStatus)
    const nextIndex = (currentIndex + 1) % statuses.length
    setAvailabilities({
      ...availabilities,
      [dateOptionId]: statuses[nextIndex]
    })
  }

  const startEditing = (participantName: string) => {
    const participant = event?.participants?.find(p => p.name === participantName)
    if (participant) {
      setEditingParticipant(participantName)
      setParticipantName(participantName)
      setParticipantComment(participant.comment || "")
      const participantAvailabilities: Record<string, AvailabilityStatus> = {}
      Object.entries(participant.availabilities).forEach(([key, value]) => {
        participantAvailabilities[key] = value as AvailabilityStatus
      })
      setAvailabilities(participantAvailabilities)
      setIsEditing(true)
      setShowParticipateForm(true)
      
      // Scroll to the participation form after a short delay to ensure it's rendered
      setTimeout(() => {
        participateFormRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }, 100)
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditingParticipant(null)
    setParticipantName("")
    setParticipantComment("")
    setShowParticipateForm(false)
    
    if (event) {
      const initialAvailabilities: Record<string, AvailabilityStatus> = {}
      event.dateOptions?.forEach(option => {
        const key = option.id ? option.id.toString() : option.datetime
        initialAvailabilities[key] = "unknown"
      })
      setAvailabilities(initialAvailabilities)
    }
  }

  const startParticipating = () => {
    setShowParticipateForm(true)
    setIsEditing(false)
    setEditingParticipant(null)
    setParticipantName("")
    setParticipantComment("")
    
    if (event) {
      const initialAvailabilities: Record<string, AvailabilityStatus> = {}
      event.dateOptions?.forEach(option => {
        const key = option.id ? option.id.toString() : option.datetime
        initialAvailabilities[key] = "unknown"
      })
      setAvailabilities(initialAvailabilities)
    }
    
    // Scroll to the participation form after a short delay to ensure it's rendered
    setTimeout(() => {
      participateFormRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }, 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!event || !participantName.trim()) {
      alert("名前を入力してください。")
      return
    }

    if (!isEditing) {
      const existingParticipant = event.participants?.find(p => p.name === participantName.trim())
      if (existingParticipant) {
        const shouldEdit = confirm("同じ名前の参加者が既に存在します。回答を編集しますか？")
        if (shouldEdit) {
          startEditing(participantName.trim())
        }
        return
      }
      
      setIsSubmitting(true)
      
      try {
        const response = await fetch(`/api/events/${event.id}/participants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: participantName.trim(),
            availabilities,
            comment: participantComment.trim()
          }),
        })

        if (response.ok) {
          // Re-fetch event data (authentication is now handled by cookies)
          const eventResponse = await fetch(`/api/events/${event.id}`)
          if (eventResponse.ok) {
            const updatedEvent = await eventResponse.json()
            setEvent(updatedEvent)
            setParticipantName("")
            setParticipantComment("")
            setShowParticipateForm(false)
            
            if (updatedEvent.dateOptions) {
              const initialAvailabilities: Record<string, AvailabilityStatus> = {}
              updatedEvent.dateOptions.forEach((option: DateOptionWithId) => {
                const key = option.id ? option.id.toString() : option.datetime
                initialAvailabilities[key] = "unknown"
              })
              setAvailabilities(initialAvailabilities)
            }
          }
        } else {
          alert('参加者の登録に失敗しました。')
        }
      } catch (error) {
        console.error('Error adding participant:', error)
        alert('参加者の登録に失敗しました。')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const getAvailabilityBadge = (status: AvailabilityStatus) => {
    switch (status) {
      case "available":
        return <Badge variant="default" className="bg-green-500">○</Badge>
      case "unavailable":
        return <Badge variant="destructive">×</Badge>
      default:
        return <Badge variant="secondary">?</Badge>
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password.trim()) {
      setPasswordError("パスワードを入力してください。")
      return
    }

    setIsValidatingPassword(true)
    setPasswordError("")

    try {
      const response = await fetch(`/api/events/${params.id}/validate-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.valid) {
          // Cookie is now set automatically, just re-fetch the event
          const eventResponse = await fetch(`/api/events/${params.id}`)
          if (eventResponse.ok) {
            const foundEvent = await eventResponse.json()
            setEvent(foundEvent)
            setPasswordRequired(false)
            
            if (foundEvent.dateOptions) {
              const initialAvailabilities: Record<string, AvailabilityStatus> = {}
              foundEvent.dateOptions.forEach((option: DateOptionWithId) => {
                const key = option.id ? option.id.toString() : option.datetime
                initialAvailabilities[key] = "unknown"
              })
              setAvailabilities(initialAvailabilities)
            }
          }
        } else {
          setPasswordError("パスワードが正しくありません。")
        }
      } else {
        setPasswordError("パスワードの検証に失敗しました。")
      }
    } catch (error) {
      console.error('Error validating password:', error)
      setPasswordError("パスワードの検証中にエラーが発生しました。")
    } finally {
      setIsValidatingPassword(false)
    }
  }

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  const toggleDateConfirmation = async (dateOptionId: number) => {
    if (!event) return
    
    setIsConfirming(true)
    
    try {
      const response = await fetch(`/api/events/${event.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dateOptionId }),
      })
      
      if (response.ok) {
        // Re-fetch event data
        const eventResponse = await fetch(`/api/events/${event.id}`)
        if (eventResponse.ok) {
          const updatedEvent = await eventResponse.json()
          setEvent(updatedEvent)
          // Force calendar re-render
          setCalendarKey(prev => prev + 1)
        }
      } else {
        alert('操作に失敗しました。')
      }
    } catch (error) {
      console.error('Error toggling date confirmation:', error)
      alert('操作に失敗しました。')
    } finally {
      setIsConfirming(false)
    }
  }

  const downloadICal = () => {
    if (!event) return
    window.open(`/api/events/${event.id}/ical`, '_blank')
  }

  const downloadIndividualICal = (dateOptionId: number) => {
    if (!event) return
    
    const dateOption = event.dateOptions?.find(opt => opt.id === dateOptionId)
    if (!dateOption) return
    
    // Parse the date correctly
    let startTime: Date
    let endTime: Date
    
    if (dateOption.startTime) {
      // Use the specific start time from the date option
      startTime = new Date(dateOption.datetime + 'T' + dateOption.startTime + ':00')
      if (dateOption.endTime) {
        endTime = new Date(dateOption.datetime + 'T' + dateOption.endTime + ':00')
      } else {
        // Default to 1 hour if no end time specified
        endTime = new Date(startTime.getTime() + 60 * 60 * 1000)
      }
    } else {
      // Fallback to default times if no time specified
      if (dateOption.datetime.includes('T')) {
        startTime = new Date(dateOption.datetime)
      } else {
        startTime = new Date(dateOption.datetime + 'T10:00:00')
      }
      endTime = new Date(startTime.getTime() + 60 * 60 * 1000)
    }
    
    // Get participant names for attendees
    const attendees = event.participants
      ?.filter(p => p.availabilities[dateOptionId.toString()] === 'available')
      .map(p => p.name) || []
    
    // Generate simple iCal content
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

    const uid = `${Date.now()}-${dateOptionId}@schedulen.app`
    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
    
    let dtstart: string
    let dtend: string
    let isAllDay = false
    
    if (dateOption.startTime) {
      // Time specified - use datetime format
      dtstart = formatDateTime(startTime)
      dtend = formatDateTime(endTime)
    } else {
      // No time specified - use all-day format
      isAllDay = true
      const dateOnly = new Date(dateOption.datetime + 'T00:00:00')
      dtstart = formatDateOnly(dateOnly)
      const nextDay = new Date(dateOnly)
      nextDay.setDate(nextDay.getDate() + 1)
      dtend = formatDateOnly(nextDay)
    }
    
    const description = event.description + (attendees.length > 0 ? `\n\n参加者: ${attendees.join(', ')}` : '')
    
    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ScheduleN//ScheduleN App//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      isAllDay ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART:${dtstart}`,
      isAllDay ? `DTEND;VALUE=DATE:${dtend}` : `DTEND:${dtend}`,
      `SUMMARY:${event.title.replace(/[,;\\]/g, '\\$&')}`,
      `DESCRIPTION:${description.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n')}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')
    
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${event.title}_${dateOption.formatted.replace(/[^a-zA-Z0-9]/g, '_')}.ics`
    link.click()
    URL.revokeObjectURL(url)
  }

  const toggleIndividualDropdown = (dateOptionId: number) => {
    setShowIndividualDropdowns(prev => ({
      ...prev,
      [dateOptionId]: !prev[dateOptionId]
    }))
  }

  const addToGoogleCalendar = (dateOptionId: number) => {
    if (!event) return
    
    const dateOption = event.dateOptions?.find(opt => opt.id === dateOptionId)
    if (!dateOption) return
    
    console.log('Original datetime:', dateOption.datetime)
    
    // Parse the date correctly
    let startTime: Date
    let endTime: Date
    
    if (dateOption.startTime) {
      // Use the specific start time from the date option
      startTime = new Date(dateOption.datetime + 'T' + dateOption.startTime + ':00')
      if (dateOption.endTime) {
        endTime = new Date(dateOption.datetime + 'T' + dateOption.endTime + ':00')
      } else {
        // Default to 1 hour if no end time specified
        endTime = new Date(startTime.getTime() + 60 * 60 * 1000)
      }
    } else {
      // Fallback to default times if no time specified
      if (dateOption.datetime.includes('T')) {
        startTime = new Date(dateOption.datetime)
      } else {
        startTime = new Date(dateOption.datetime + 'T10:00:00')
      }
      endTime = new Date(startTime.getTime() + 60 * 60 * 1000)
    }
    
    console.log('Parsed startTime:', startTime)
    console.log('Parsed endTime:', endTime)
    
    // Get participant names for attendees
    const attendees = event.participants
      ?.filter(p => p.availabilities[dateOptionId.toString()] === 'available')
      .map(p => p.name) || []
    
    // Format for Google Calendar
    const formatGoogleDateTime = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      
      return `${year}${month}${day}T${hours}${minutes}${seconds}`
    }

    const formatGoogleDateOnly = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      
      return `${year}${month}${day}`
    }

    let startTimeFormatted: string
    let endTimeFormatted: string
    
    if (dateOption.startTime) {
      // Time specified - use datetime format
      startTimeFormatted = formatGoogleDateTime(startTime)
      endTimeFormatted = formatGoogleDateTime(endTime)
    } else {
      // No time specified - use all-day format
      const dateOnly = new Date(dateOption.datetime + 'T00:00:00')
      startTimeFormatted = formatGoogleDateOnly(dateOnly)
      const nextDay = new Date(dateOnly)
      nextDay.setDate(nextDay.getDate() + 1)
      endTimeFormatted = formatGoogleDateOnly(nextDay)
    }
    
    console.log('Formatted start:', startTimeFormatted)
    console.log('Formatted end:', endTimeFormatted)
    
    const description = event.description + (attendees.length > 0 ? `\n\n参加者: ${attendees.join(', ')}` : '')
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${startTimeFormatted}/${endTimeFormatted}`,
      details: description,
    })

    const url = `https://calendar.google.com/calendar/render?${params.toString()}`
    console.log('Google Calendar URL:', url)
    window.open(url, '_blank')
  }

  const addAllToGoogleCalendar = () => {
    if (!event?.confirmedDateOptionIds) return
    
    const count = event.confirmedDateOptionIds.length
    
    console.log('Adding all dates to Google Calendar:', event.confirmedDateOptionIds)
    
    // Open Google Calendar for each confirmed date immediately
    event.confirmedDateOptionIds.forEach((dateOptionId, index) => {
      console.log(`Opening Google Calendar for date option ${dateOptionId} (${index + 1}/${count})`)
      addToGoogleCalendar(dateOptionId)
    })
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center">パスワードが必要です</CardTitle>
              <CardDescription className="text-center">
                このイベント「{event.title}」を閲覧するにはパスワードが必要です。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="event-password">パスワード</Label>
                  <Input
                    id="event-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを入力してください"
                    required
                  />
                  {passwordError && (
                    <p className="text-sm text-red-600">{passwordError}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" loading={isValidatingPassword}>
                  認証
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const getSummary = (dateOption: DateOptionWithId) => {
    const key = dateOption.id ? dateOption.id.toString() : dateOption.datetime
    const participants = event.participants || []
    const availableCount = participants.filter(p => 
      p.availabilities[key] === "available"
    ).length
    return `${availableCount}/${participants.length}`
  }

  const getParticipationRate = (dateOption: DateOptionWithId) => {
    const key = dateOption.id ? dateOption.id.toString() : dateOption.datetime
    const participants = event.participants || []
    const availableCount = participants.filter(p => 
      p.availabilities[key] === "available"
    ).length
    return participants.length > 0 ? availableCount / participants.length : 0
  }

  const getEventDates = () => {
    const validDates: Date[] = []
    
    event.dateOptions?.forEach(option => {
      try {
        let date: Date
        if (option.datetime.includes('T')) {
          date = new Date(option.datetime)
        } else {
          date = new Date(option.datetime + 'T00:00:00')
        }
        
        if (!isNaN(date.getTime())) {
          validDates.push(date)
        }
      } catch (error) {
        console.error('Date parsing error:', error, option.datetime)
      }
    })
    
    return validDates
  }

  const getDateInfo = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return { isEventDate: false, participationRate: 0, summary: '', isConfirmed: false, dateOption: null }
    }

    const matchingOption = event.dateOptions?.find(option => {
      try {
        let optionDate: Date
        if (option.datetime.includes('T')) {
          optionDate = new Date(option.datetime)
        } else {
          optionDate = new Date(option.datetime + 'T00:00:00')
        }
        
        if (isNaN(optionDate.getTime())) {
          return false
        }
        
        // 日付比較を簡単に
        return date.getFullYear() === optionDate.getFullYear() &&
               date.getMonth() === optionDate.getMonth() &&
               date.getDate() === optionDate.getDate()
      } catch (error) {
        console.error('Date comparison error:', error, option.datetime)
        return false
      }
    })
    
    if (matchingOption) {
      const rate = getParticipationRate(matchingOption)
      const isConfirmed = matchingOption.id && event.confirmedDateOptionIds?.includes(matchingOption.id)
      return {
        isEventDate: true,
        participationRate: rate,
        summary: getSummary(matchingOption),
        isConfirmed: Boolean(isConfirmed),
        dateOption: matchingOption
      }
    }
    
    return { isEventDate: false, participationRate: 0, summary: '', isConfirmed: false, dateOption: null }
  }

  const getParticipantsForDate = (date: Date) => {
    const dateInfo = getDateInfo(date)
    if (!dateInfo.isEventDate || !dateInfo.dateOption) {
      return { available: [], unavailable: [], unknown: [] }
    }

    const key = dateInfo.dateOption.id ? dateInfo.dateOption.id.toString() : dateInfo.dateOption.datetime
    const participants = event.participants || []

    const available = participants.filter(p => p.availabilities[key] === "available")
    const unavailable = participants.filter(p => p.availabilities[key] === "unavailable")
    const unknown = participants.filter(p => !p.availabilities[key] || p.availabilities[key] === "unknown")

    return { available, unavailable, unknown }
  }

  const getFilteredDateOptions = () => {
    if (!event.dateOptions) return []
    
    if (tableViewMode === 'all') {
      return event.dateOptions
    }
    
    // 月ごと表示の場合、選択された月の日程のみ表示
    return event.dateOptions.filter(option => {
      try {
        let optionDate: Date
        if (option.datetime.includes('T')) {
          optionDate = new Date(option.datetime)
        } else {
          optionDate = new Date(option.datetime + 'T00:00:00')
        }
        
        return optionDate.getFullYear() === selectedTableMonth.getFullYear() &&
               optionDate.getMonth() === selectedTableMonth.getMonth()
      } catch {
        return false
      }
    })
  }

  const getAvailableMonths = () => {
    if (!event.dateOptions) return []
    
    const months = new Set<string>()
    event.dateOptions.forEach(option => {
      try {
        let optionDate: Date
        if (option.datetime.includes('T')) {
          optionDate = new Date(option.datetime)
        } else {
          optionDate = new Date(option.datetime + 'T00:00:00')
        }
        
        const monthKey = `${optionDate.getFullYear()}-${optionDate.getMonth()}`
        months.add(monthKey)
      } catch {
        // ignore
      }
    })
    
    return Array.from(months).map(monthKey => {
      const [year, month] = monthKey.split('-').map(Number)
      return new Date(year, month, 1)
    }).sort((a, b) => a.getTime() - b.getTime())
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            ホームに戻る
          </Link>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{event.title}</CardTitle>
                  {event.description && (
                    <CardDescription className="mt-2 text-base">
                      {event.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link href={`/edit/${event.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit2 className="w-4 h-4 mr-2" />
                      編集
                    </Button>
                  </Link>
                  <Button onClick={copyUrl} variant="outline" size="sm">
                    {isCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {isCopied ? "コピー済み" : "URLをコピー"}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  作成日: {new Date(event.createdAt).toLocaleDateString('ja-JP')}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  参加者: {event.participants?.length || 0}名
                </div>
              </div>
            </CardHeader>
          </Card>

          {event.confirmedDateOptionIds && event.confirmedDateOptionIds.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <CheckCircle className="w-5 h-5" />
                    確定日程 ({event.confirmedDateOptionIds.length}件)
                  </CardTitle>
                  <div className="flex gap-2">
                    <div className="relative calendar-dropdown">
                      <Button
                        onClick={() => setShowCalendarDropdown(!showCalendarDropdown)}
                        variant="outline"
                        size="sm"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        すべてカレンダーに追加
                      </Button>
                      
                      {showCalendarDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                addAllToGoogleCalendar()
                                setShowCalendarDropdown(false)
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Calendar className="w-4 h-4 mr-3" />
                              Googleカレンダーに追加
                            </button>
                            <button
                              onClick={() => {
                                downloadICal()
                                setShowCalendarDropdown(false)
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Download className="w-4 h-4 mr-3" />
                              iCalファイルをダウンロード
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {event.confirmedDateOptionIds
                    .map((confirmedId) => event.dateOptions?.find(opt => opt.id === confirmedId))
                    .filter((dateOption): dateOption is NonNullable<typeof dateOption> => dateOption !== undefined)
                    .sort((a, b) => {
                      const dateA = new Date(a.datetime + (a.startTime ? `T${a.startTime}` : 'T00:00'))
                      const dateB = new Date(b.datetime + (b.startTime ? `T${b.startTime}` : 'T00:00'))
                      return dateA.getTime() - dateB.getTime()
                    })
                    .map((dateOption) => {
                      const confirmedId = dateOption.id!
                      const participants = event.participants?.filter(p => 
                        p.availabilities[confirmedId.toString()] === 'available'
                      ).length || 0
                      
                      return (
                      <div key={confirmedId} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-800">{dateOption.formatted}</span>
                          <span className="text-sm text-blue-600">参加可能: {participants}名</span>
                        </div>
                        <div className="flex gap-2">
                          <div className="relative calendar-dropdown">
                            <Button
                              onClick={() => toggleIndividualDropdown(confirmedId)}
                              variant="outline"
                              size="sm"
                              className="bg-blue-50 hover:bg-blue-100 border-blue-300"
                            >
                              <Calendar className="w-4 h-4" />
                            </Button>
                            
                            {showIndividualDropdowns[confirmedId] && (
                              <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      addToGoogleCalendar(confirmedId)
                                      setShowIndividualDropdowns(prev => ({ ...prev, [confirmedId]: false }))
                                    }}
                                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Googleカレンダー
                                  </button>
                                  <button
                                    onClick={() => {
                                      downloadIndividualICal(confirmedId)
                                      setShowIndividualDropdowns(prev => ({ ...prev, [confirmedId]: false }))
                                    }}
                                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    iCalダウンロード
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => dateOption.id && toggleDateConfirmation(dateOption.id)}
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-50"
                            disabled={isConfirming}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-sm text-blue-600 mt-3">
                  複数の日程が確定されています。「カレンダーに追加」ボタンから追加方法を選択できます。個別の日程も右側のボタンから追加可能です。
                </p>
              </CardContent>
            </Card>
          )}

          {(event.participants?.length ?? 0) > 0 && event.dateOptions && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>参加状況</CardTitle>
                  {getAvailableMonths().length > 1 && (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={tableViewMode === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTableViewMode('all')}
                        >
                          一覧表示
                        </Button>
                        <Button
                          variant={tableViewMode === 'monthly' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTableViewMode('monthly')}
                        >
                          月ごと表示
                        </Button>
                      </div>
                      {tableViewMode === 'monthly' && (
                        <select
                          value={`${selectedTableMonth.getFullYear()}-${selectedTableMonth.getMonth()}`}
                          onChange={(e) => {
                            const [year, month] = e.target.value.split('-').map(Number)
                            setSelectedTableMonth(new Date(year, month, 1))
                          }}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                        >
                          {getAvailableMonths().map(month => (
                            <option 
                              key={`${month.getFullYear()}-${month.getMonth()}`}
                              value={`${month.getFullYear()}-${month.getMonth()}`}
                            >
                              {month.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>参加者</TableHead>
                      {getFilteredDateOptions().map((option) => (
                        <TableHead key={option.id || option.datetime} className="text-center min-w-[120px]">
                          <div>
                            {option.formatted}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="min-w-[200px]">備考</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {event.participants?.map((participant) => (
                      <TableRow key={participant.name}>
                        <TableCell className="font-medium">
                          <div className="flex items-center justify-between">
                            <span>{participant.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(participant.name)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        {getFilteredDateOptions().map((option) => {
                          const key = option.id ? option.id.toString() : option.datetime
                          return (
                            <TableCell key={key} className="text-center">
                              {getAvailabilityBadge(participant.availabilities[key] as AvailabilityStatus || "unknown")}
                            </TableCell>
                          )
                        })}
                        <TableCell className="max-w-[200px]">
                          {participant.comment && (
                            <div className="text-sm text-gray-600 break-words">
                              {participant.comment}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {/* 参加者セクションと操作セクションの境界線 */}
                    <TableRow>
                      <TableCell colSpan={getFilteredDateOptions().length + 2} className="h-4 border-b-0 bg-gray-50/30">
                      </TableCell>
                    </TableRow>
                    
                    {/* 集計・操作セクション */}
                    <TableRow className="bg-blue-50/50">
                      <TableCell className="font-bold text-blue-900">参加可能人数</TableCell>
                      {getFilteredDateOptions().map((option) => (
                        <TableCell key={option.id || option.datetime} className="text-center font-bold text-blue-900">
                          {getSummary(option)}
                        </TableCell>
                      ))}
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow className="bg-green-50/50">
                      <TableCell className="font-bold text-green-900">日程確定</TableCell>
                      {getFilteredDateOptions().map((option) => {
                        const rate = getParticipationRate(option)
                        const isRecommended = rate >= 0.7
                        const isConfirmed = option.id && event.confirmedDateOptionIds?.includes(option.id)
                        return (
                          <TableCell key={option.id || option.datetime} className="text-center">
                            <Button
                              onClick={() => option.id && toggleDateConfirmation(option.id)}
                              variant={isConfirmed ? "default" : isRecommended ? "default" : "outline"}
                              size="sm"
                              disabled={isConfirming || !option.id}
                              className={
                                isConfirmed 
                                  ? "bg-blue-600 hover:bg-blue-700" 
                                  : isRecommended 
                                    ? "bg-green-600 hover:bg-green-700" 
                                    : ""
                              }
                            >
                              {isConfirmed ? (
                                <>
                                  <Check className="w-4 h-4 mr-1" />
                                  確定済
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  確定
                                </>
                              )}
                            </Button>
                          </TableCell>
                        )
                      })}
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {(event.participants?.length ?? 0) > 0 && event.dateOptions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  カレンダービュー
                </CardTitle>
                <CardDescription>
                  イベント候補日と参加状況をカレンダーで確認できます。
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <button 
                      onClick={() => {
                        const newMonth = new Date(currentMonth);
                        newMonth.setMonth(newMonth.getMonth() - 1);
                        setCurrentMonth(newMonth);
                      }}
                      className="h-10 w-10 bg-transparent hover:bg-gray-100 flex items-center justify-center rounded-md transition-colors"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <CalendarComponent
                      key={calendarKey}
                      month={currentMonth}
                      locale={ja}
                      className="w-fit p-4 border rounded-md"
                      onDayClick={(date) => {
                        const dateInfo = getDateInfo(date)
                        if (dateInfo.isEventDate) {
                          setSelectedDate(selectedDate?.getTime() === date.getTime() ? null : date)
                        }
                      }}
                      classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-6 sm:space-y-0",
                        month: "space-y-4",
                        caption: "flex justify-center pt-1 pb-4 items-center w-full",
                        caption_label: "text-lg font-semibold",
                        nav: "hidden",
                        nav_button: "hidden",
                        nav_button_previous: "hidden",
                        nav_button_next: "hidden",
                        table: "w-full border-collapse",
                        head_row: "flex mb-1",
                        head_cell: "text-muted-foreground rounded-md w-10 h-8 font-normal text-sm flex items-center justify-center",
                        row: "flex w-full mt-1",
                        cell: "h-10 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                        day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-center leading-10 cursor-pointer",
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
                        day_today: "bg-accent text-accent-foreground rounded-md",
                        day_outside: "text-muted-foreground opacity-50 rounded-md",
                        day_disabled: "text-muted-foreground opacity-50 rounded-md",
                        day_hidden: "invisible",
                      }}
                      modifiers={{
                        confirmed: getEventDates().filter(date => {
                          const info = getDateInfo(date)
                          return info.isConfirmed
                        }),
                        high: getEventDates().filter(date => {
                          const info = getDateInfo(date)
                          return info.participationRate >= 0.7 && !info.isConfirmed
                        }),
                        medium: getEventDates().filter(date => {
                          const info = getDateInfo(date)
                          return info.participationRate >= 0.4 && info.participationRate < 0.7 && !info.isConfirmed
                        }),
                        low: getEventDates().filter(date => {
                          const info = getDateInfo(date)
                          return info.participationRate < 0.4 && !info.isConfirmed
                        }),
                      }}
                      modifiersStyles={{
                        confirmed: {
                          backgroundColor: '#2563eb',
                          color: 'white',
                          fontWeight: 'bold',
                          borderRadius: '8px',
                        },
                        high: { 
                          backgroundColor: '#22c55e',
                          color: 'white',
                          fontWeight: 'bold',
                          borderRadius: '8px',
                        },
                        medium: { 
                          backgroundColor: '#eab308',
                          color: 'white',
                          fontWeight: 'bold',
                          borderRadius: '8px',
                        },
                        low: { 
                          backgroundColor: '#fecaca',
                          color: '#991b1b',
                          fontWeight: 'bold',
                          borderRadius: '8px',
                        },
                      }}
                    />
                    
                    <button 
                      onClick={() => {
                        const newMonth = new Date(currentMonth);
                        newMonth.setMonth(newMonth.getMonth() + 1);
                        setCurrentMonth(newMonth);
                      }}
                      className="h-10 w-10 bg-transparent hover:bg-gray-100 flex items-center justify-center rounded-md transition-colors"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  {selectedDate && (() => {
                    const dateInfo = getDateInfo(selectedDate)
                    const bgColor = dateInfo.isConfirmed 
                      ? 'bg-blue-50 border-blue-200' 
                      : dateInfo.participationRate >= 0.7 
                        ? 'bg-green-50 border-green-200' 
                        : dateInfo.participationRate >= 0.4 
                          ? 'bg-yellow-50 border-yellow-200' 
                          : 'bg-red-50 border-red-200'
                    const textColor = dateInfo.isConfirmed 
                      ? 'text-blue-900' 
                      : dateInfo.participationRate >= 0.7 
                        ? 'text-green-900' 
                        : dateInfo.participationRate >= 0.4 
                          ? 'text-yellow-900' 
                          : 'text-red-900'
                    
                    return (
                    <div className={`mt-6 p-4 ${bgColor} border rounded-lg`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`font-semibold ${textColor}`}>
                          {selectedDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}の参加状況
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDate(null)}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                      {(() => {
                        const participants = getParticipantsForDate(selectedDate)
                        const dateInfo = getDateInfo(selectedDate)
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium">時間:</span>
                                <span>{dateInfo.dateOption?.formatted}</span>
                                {dateInfo.isConfirmed && (
                                  <Badge variant="default" className="bg-blue-600 text-xs">確定</Badge>
                                )}
                              </div>
                              {dateInfo.dateOption?.id && (
                                <Button
                                  onClick={() => toggleDateConfirmation(dateInfo.dateOption.id!)}
                                  variant={dateInfo.isConfirmed ? "default" : "outline"}
                                  size="sm"
                                  disabled={isConfirming}
                                  className={
                                    dateInfo.isConfirmed 
                                      ? "bg-blue-600 hover:bg-blue-700" 
                                      : dateInfo.participationRate >= 0.7 
                                        ? "bg-green-600 hover:bg-green-700 text-white" 
                                        : ""
                                  }
                                >
                                  {dateInfo.isConfirmed ? (
                                    <>
                                      <Check className="w-4 h-4 mr-1" />
                                      確定済
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      確定
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                            
                            {participants.available.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                  <span className="font-medium text-sm">参加可能 ({participants.available.length}名)</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {participants.available.map((participant) => (
                                    <Badge key={participant.name} variant="secondary" className="bg-green-100 text-green-800">
                                      {participant.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {participants.unavailable.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                  <span className="font-medium text-sm">参加不可 ({participants.unavailable.length}名)</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {participants.unavailable.map((participant) => (
                                    <Badge key={participant.name} variant="secondary" className="bg-red-100 text-red-800">
                                      {participant.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {participants.unknown.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                  <span className="font-medium text-sm">未回答 ({participants.unknown.length}名)</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {participants.unknown.map((participant) => (
                                    <Badge key={participant.name} variant="secondary" className="bg-gray-100 text-gray-800">
                                      {participant.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                    )
                  })()}
                  
                  <div className="mt-4">
                    <Button
                    variant="ghost"
                    onClick={() => setShowEventDetails(!showEventDetails)}
                    className="w-full justify-between p-2 h-auto"
                  >
                    <span className="text-sm font-medium">イベント候補日詳細</span>
                    {showEventDetails ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                  
                  {showEventDetails && (
                    <div className="space-y-2 mt-2">
                      {event.dateOptions?.map((option, index) => {
                        const rate = getParticipationRate(option)
                        const ratePercentage = Math.round(rate * 100)
                        const summary = getSummary(option)
                        const isHighParticipation = rate >= 0.7
                        const isMediumParticipation = rate >= 0.4
                        const isConfirmed = option.id && event.confirmedDateOptionIds?.includes(option.id)
                        
                        return (
                          <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${isConfirmed ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'}`}>
                            <div className="flex items-center gap-3">
                              <div 
                                className={`
                                  w-4 h-4 rounded-full
                                  ${isConfirmed
                                    ? 'bg-blue-600'
                                    : isHighParticipation 
                                      ? 'bg-green-500' 
                                      : isMediumParticipation 
                                        ? 'bg-yellow-500' 
                                        : 'bg-red-200'
                                  }
                                `}
                              />
                              <span className="font-medium">{option.formatted}</span>
                              {isConfirmed && (
                                <Badge variant="default" className="bg-blue-600 text-xs">確定</Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg">{ratePercentage}%</div>
                              <div className="text-sm text-gray-600">{summary}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  </div>
                  
                  <div className="mt-6 space-y-2">
                    <div className="text-sm font-medium">凡例</div>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-600 rounded"></div>
                        <span>確定済み</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span>参加率70%以上（推奨）</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                        <span>参加率40-69%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-200 rounded"></div>
                        <span>参加率39%以下</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!showParticipateForm && event.dateOptions ? (
            <Card>
              <CardHeader>
                <CardTitle>参加登録</CardTitle>
                <CardDescription>
                  このイベントに参加する場合は、下のボタンをクリックしてください。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={startParticipating}
                  size="lg" 
                  className="w-full"
                >
                  <Users className="w-4 h-4 mr-2" />
                  参加する
                </Button>
              </CardContent>
            </Card>
          ) : !event.dateOptions ? (
            <Card>
              <CardHeader>
                <CardTitle>イベントデータを読み込み中...</CardTitle>
                <CardDescription>
                  しばらくお待ちください。
                </CardDescription>
              </CardHeader>
            </Card>
          ) : showParticipateForm && event.dateOptions ? (
            <Card ref={participateFormRef}>
              <CardHeader>
                <CardTitle>
                  {isEditing ? `${editingParticipant}さんの回答を編集` : "参加登録"}
                </CardTitle>
                <CardDescription>
                  {isEditing 
                    ? "各候補日時の参加可否を変更してください。"
                    : "名前を入力して、各候補日時の参加可否を選択してください。"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                {!isEditing && (
                  <div className="space-y-2">
                    <Label htmlFor="name">お名前 *</Label>
                    <Input
                      id="name"
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      placeholder="田中太郎"
                      required
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <Label>各日時の参加可否</Label>
                  {event.dateOptions?.map((option) => {
                    const key = option.id ? option.id.toString() : option.datetime
                    return (
                      <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium">{option.formatted}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAvailability(key)}
                          className={`min-w-[60px] ${
                            availabilities[key] === "available" 
                              ? "bg-green-500 text-white hover:bg-green-600" 
                              : availabilities[key] === "unavailable"
                              ? "bg-red-500 text-white hover:bg-red-600"
                              : ""
                          }`}
                        >
                          {availabilities[key] === "available" 
                            ? "○" 
                            : availabilities[key] === "unavailable" 
                            ? "×" 
                            : "?"}
                        </Button>
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comment">備考（任意）</Label>
                  <Textarea
                    id="comment"
                    value={participantComment}
                    onChange={(e) => setParticipantComment(e.target.value)}
                    placeholder="その他のコメントがあれば記入してください"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" size="lg" loading={isSubmitting}>
                    {isEditing ? "回答を更新" : "回答を送信"}
                  </Button>
                  <Button type="button" variant="outline" size="lg" onClick={cancelEditing} disabled={isSubmitting}>
                    キャンセル
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}