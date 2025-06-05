"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { ArrowLeft, Users, Calendar, Copy, Check, Edit2, ChevronDown, ChevronUp, CheckCircle, XCircle, Info, Lightbulb, RotateCcw } from "lucide-react"
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

// 初期サンプルデータ
const getInitialSampleEvent = (): Event => ({
  id: "tutorial-demo",
  title: "チームミーティング（デモ）",
  description: "毎月のチームミーティングです。プロジェクトの進捗確認と来月の計画を話し合います。",
  dateOptions: [
    {
      id: 1,
      datetime: "2025-01-15",
      formatted: "1月15日（水） 14:00-15:00",
      startTime: "14:00",
      endTime: "15:00"
    },
    {
      id: 2,
      datetime: "2025-01-16",
      formatted: "1月16日（木） 10:00-11:00",
      startTime: "10:00",
      endTime: "11:00"
    },
    {
      id: 3,
      datetime: "2025-01-17",
      formatted: "1月17日（金） 15:00-16:00",
      startTime: "15:00",
      endTime: "16:00"
    }
  ],
  participants: [
    {
      name: "田中太郎",
      availabilities: { "1": "available", "2": "unavailable", "3": "available" },
      comment: "よろしくお願いします",
      submittedAt: "2025-01-10T10:00:00Z"
    },
    {
      name: "佐藤花子",
      availabilities: { "1": "unavailable", "2": "available", "3": "available" },
      comment: "",
      submittedAt: "2025-01-10T11:00:00Z"
    },
    {
      name: "山田次郎",
      availabilities: { "1": "available", "2": "available", "3": "unavailable" },
      comment: "リモート参加希望",
      submittedAt: "2025-01-10T12:00:00Z"
    }
  ],
  createdAt: "2025-01-10T09:00:00Z",
  confirmedDateOptionIds: [3]
})

// ローカルストレージからデータを読み込む
const loadEventFromStorage = (): Event => {
  if (typeof window === 'undefined') return getInitialSampleEvent()
  
  try {
    const stored = localStorage.getItem('tutorial-event')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load event from storage:', error)
  }
  return getInitialSampleEvent()
}

// ローカルストレージにデータを保存する
const saveEventToStorage = (event: Event) => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem('tutorial-event', JSON.stringify(event))
  } catch (error) {
    console.error('Failed to save event to storage:', error)
  }
}

export default function TutorialPage() {
  const [event, setEvent] = useState<Event>(getInitialSampleEvent())
  const [participantName, setParticipantName] = useState("")
  const [participantComment, setParticipantComment] = useState("")
  const [availabilities, setAvailabilities] = useState<Record<string, AvailabilityStatus>>({})
  const [isCopied, setIsCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null)
  const [showParticipateForm, setShowParticipateForm] = useState(false)
  const [showEventDetails, setShowEventDetails] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [calendarKey, setCalendarKey] = useState(0)
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 0, 1)) // 2025年1月に設定
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showTip, setShowTip] = useState<string | null>(null)
  const participateFormRef = useRef<HTMLDivElement>(null)

  // ローカルストレージからデータを読み込む
  useEffect(() => {
    const loadedEvent = loadEventFromStorage()
    setEvent(loadedEvent)
  }, [])

  useEffect(() => {
    if (event.dateOptions) {
      const initialAvailabilities: Record<string, AvailabilityStatus> = {}
      event.dateOptions.forEach((option: DateOptionWithId) => {
        const key = option.id ? option.id.toString() : option.datetime
        initialAvailabilities[key] = "unknown"
      })
      setAvailabilities(initialAvailabilities)
    }
  }, [event])

  // イベントデータが変更されたときにカレンダーを再描画
  useEffect(() => {
    setCalendarKey(prev => prev + 1)
  }, [event.confirmedDateOptionIds, event.participants])

  const toggleAvailability = (dateOptionId: string) => {
    setShowTip("availability-toggle")
    setTimeout(() => setShowTip(null), 3000)
    
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
    setShowTip("edit-participant")
    setTimeout(() => setShowTip(null), 3000)
    
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
    setShowTip("participate")
    setTimeout(() => setShowTip(null), 3000)
    
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
    
    setTimeout(() => {
      participateFormRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }, 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!participantName.trim()) {
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
      setShowTip("participant-added")
      setTimeout(() => setShowTip(null), 3000)
      
      // 新しい参加者を追加
      const newParticipant: ParticipantWithData = {
        name: participantName.trim(),
        availabilities,
        comment: participantComment.trim(),
        submittedAt: new Date().toISOString()
      }
      
      const updatedEvent = {
        ...event,
        participants: [...(event.participants || []), newParticipant]
      }
      
      setEvent(updatedEvent)
      saveEventToStorage(updatedEvent)
      
      // フォームをリセット
      setParticipantName("")
      setParticipantComment("")
      setShowParticipateForm(false)
      
      if (event.dateOptions) {
        const initialAvailabilities: Record<string, AvailabilityStatus> = {}
        event.dateOptions.forEach((option: DateOptionWithId) => {
          const key = option.id ? option.id.toString() : option.datetime
          initialAvailabilities[key] = "unknown"
        })
        setAvailabilities(initialAvailabilities)
      }
      
      setIsSubmitting(false)
    } else {
      // 既存参加者の編集
      setIsSubmitting(true)
      setShowTip("participant-updated")
      setTimeout(() => setShowTip(null), 3000)
      
      const updatedParticipants = event.participants?.map(p => 
        p.name === editingParticipant 
          ? { ...p, availabilities, comment: participantComment.trim() }
          : p
      ) || []
      
      const updatedEvent = {
        ...event,
        participants: updatedParticipants
      }
      
      setEvent(updatedEvent)
      saveEventToStorage(updatedEvent)
      
      // 編集を終了
      setIsEditing(false)
      setEditingParticipant(null)
      setParticipantName("")
      setParticipantComment("")
      setShowParticipateForm(false)
      
      if (event.dateOptions) {
        const initialAvailabilities: Record<string, AvailabilityStatus> = {}
        event.dateOptions.forEach((option: DateOptionWithId) => {
          const key = option.id ? option.id.toString() : option.datetime
          initialAvailabilities[key] = "unknown"
        })
        setAvailabilities(initialAvailabilities)
      }
      
      setIsSubmitting(false)
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

  const copyUrl = async () => {
    setShowTip("copy-url")
    setTimeout(() => setShowTip(null), 3000)
    
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  const toggleDateConfirmation = async (dateOptionId: number) => {
    setShowTip("confirm-date")
    setTimeout(() => setShowTip(null), 3000)
    
    setIsConfirming(true)
    
    const currentConfirmed = event.confirmedDateOptionIds || []
    let updatedConfirmed: number[]
    
    if (currentConfirmed.includes(dateOptionId)) {
      // 確定を取り消し
      updatedConfirmed = currentConfirmed.filter(id => id !== dateOptionId)
    } else {
      // 確定に追加
      updatedConfirmed = [...currentConfirmed, dateOptionId]
    }
    
    const updatedEvent = {
      ...event,
      confirmedDateOptionIds: updatedConfirmed
    }
    
    setEvent(updatedEvent)
    saveEventToStorage(updatedEvent)
    
    // カレンダーを再描画
    setCalendarKey(prev => prev + 1)
    
    setIsConfirming(false)
  }

  const resetTutorialData = () => {
    setShowTip("data-reset")
    setTimeout(() => setShowTip(null), 3000)
    
    const confirmed = confirm("チュートリアルデータを初期状態にリセットしますか？")
    if (confirmed) {
      const initialEvent = getInitialSampleEvent()
      setEvent(initialEvent)
      saveEventToStorage(initialEvent)
      
      // フォーム状態もリセット
      setParticipantName("")
      setParticipantComment("")
      setShowParticipateForm(false)
      setIsEditing(false)
      setEditingParticipant(null)
      setSelectedDate(null)
      setCalendarKey(prev => prev + 1)
      
      if (initialEvent.dateOptions) {
        const initialAvailabilities: Record<string, AvailabilityStatus> = {}
        initialEvent.dateOptions.forEach((option: DateOptionWithId) => {
          const key = option.id ? option.id.toString() : option.datetime
          initialAvailabilities[key] = "unknown"
        })
        setAvailabilities(initialAvailabilities)
      }
    }
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
          // 日付のみの場合、時刻を00:00に設定
          date = new Date(option.datetime + 'T00:00:00')
        }
        
        if (!isNaN(date.getTime())) {
          // 時刻を00:00:00に正規化して日付のみで比較
          const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
          validDates.push(normalizedDate)
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

    // 入力された日付を正規化（時刻を00:00:00に設定）
    const normalizedInputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

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
        
        // オプションの日付も正規化
        const normalizedOptionDate = new Date(optionDate.getFullYear(), optionDate.getMonth(), optionDate.getDate())
        
        return normalizedInputDate.getTime() === normalizedOptionDate.getTime()
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

  const TipCard = ({ tipId, title, content }: { tipId: string, title: string, content: string }) => {
    if (showTip !== tipId) return null
    
    return (
      <div className="fixed top-4 right-4 z-50 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-800">{title}</h4>
            <p className="text-sm text-yellow-700 mt-1">{content}</p>
          </div>
        </div>
      </div>
    )
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

        {/* チュートリアルヘッダー */}
        <div className="max-w-4xl mx-auto mb-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-6 h-6 text-blue-600" />
                  <CardTitle className="text-blue-800">スケるんの使い方</CardTitle>
                </div>
                <Button
                  onClick={resetTutorialData}
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-50"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  リセット
                </Button>
              </div>
              <CardDescription className="text-blue-700">
                このページでは実際のイベントページと同じ機能を体験できます。
                各操作を試すとヒントが表示されるので、実際に触って使い方を覚えてください。
                データはブラウザに保存されるため、ページを再読み込みしても変更内容が残ります。
              </CardDescription>
            </CardHeader>
          </Card>
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
                  <Button variant="outline" size="sm">
                    <Edit2 className="w-4 h-4 mr-2" />
                    編集
                  </Button>
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
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    確定日程 ({event.confirmedDateOptionIds.length}件)
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShowTip("calendar-export")
                        setTimeout(() => setShowTip(null), 3000)
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      カレンダーに追加
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {event.confirmedDateOptionIds
                    .map((confirmedId) => event.dateOptions?.find(opt => opt.id === confirmedId))
                    .filter((dateOption): dateOption is NonNullable<typeof dateOption> => dateOption !== undefined)
                    .map((dateOption) => {
                      const confirmedId = dateOption.id!
                      const participants = event.participants?.filter(p => 
                        p.availabilities[confirmedId.toString()] === 'available'
                      ).length || 0
                      
                      return (
                        <div key={confirmedId} className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-800">{dateOption.formatted}</span>
                            <span className="text-sm text-green-600">参加可能: {participants}名</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                setShowTip("individual-export")
                                setTimeout(() => setShowTip(null), 3000)
                              }}
                              variant="outline"
                              size="sm"
                              className="bg-blue-50 hover:bg-blue-100 border-blue-300"
                            >
                              <Calendar className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => toggleDateConfirmation(dateOption.id!)}
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
              </CardContent>
            </Card>
          )}

          {(event.participants?.length ?? 0) > 0 && event.dateOptions && (
            <Card>
              <CardHeader>
                <CardTitle>参加状況</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>参加者</TableHead>
                      {event.dateOptions.map((option) => (
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
                        {event.dateOptions?.map((option) => {
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
                    
                    <TableRow>
                      <TableCell colSpan={event.dateOptions.length + 2} className="h-4 border-b-0 bg-gray-50/30">
                      </TableCell>
                    </TableRow>
                    
                    <TableRow className="bg-blue-50/50">
                      <TableCell className="font-bold text-blue-900">参加可能人数</TableCell>
                      {event.dateOptions?.map((option) => (
                        <TableCell key={option.id || option.datetime} className="text-center font-bold text-blue-900">
                          {getSummary(option)}
                        </TableCell>
                      ))}
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow className="bg-green-50/50">
                      <TableCell className="font-bold text-green-900">日程確定</TableCell>
                      {event.dateOptions?.map((option) => {
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
                                  ? "bg-green-600 hover:bg-green-700" 
                                  : isRecommended 
                                    ? "bg-blue-600 hover:bg-blue-700" 
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
                  イベント候補日と参加状況をカレンダーで確認できます。日付をクリックすると詳細が表示されます。
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
                        setShowTip("calendar-navigation")
                        setTimeout(() => setShowTip(null), 3000)
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
                          setShowTip("calendar-click")
                          setTimeout(() => setShowTip(null), 3000)
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
                      modifiers={(() => {
                        const eventDates = getEventDates()
                        const confirmed = eventDates.filter(date => {
                          const info = getDateInfo(date)
                          return info.isConfirmed
                        })
                        const high = eventDates.filter(date => {
                          const info = getDateInfo(date)
                          return info.participationRate >= 0.7 && !info.isConfirmed
                        })
                        const medium = eventDates.filter(date => {
                          const info = getDateInfo(date)
                          return info.participationRate >= 0.4 && info.participationRate < 0.7 && !info.isConfirmed
                        })
                        const low = eventDates.filter(date => {
                          const info = getDateInfo(date)
                          return info.participationRate < 0.4 && !info.isConfirmed
                        })
                        
                        return { confirmed, high, medium, low }
                      })()}
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
                        setShowTip("calendar-navigation")
                        setTimeout(() => setShowTip(null), 3000)
                      }}
                      className="h-10 w-10 bg-transparent hover:bg-gray-100 flex items-center justify-center rounded-md transition-colors"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  {selectedDate && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-blue-900">
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
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">時間:</span>
                              <span>{dateInfo.dateOption?.formatted}</span>
                              {dateInfo.isConfirmed && (
                                <Badge variant="default" className="bg-blue-600 text-xs">確定</Badge>
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
                  )}
                  
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
                    <Button type="submit" className="flex-1" size="lg" disabled={isSubmitting}>
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

      {/* Tips表示 */}
      <TipCard 
        tipId="participate" 
        title="参加登録フォーム" 
        content="名前を入力して、各日程の参加可否を選択できます。ボタンをクリックして ○（参加可能）、×（参加不可）、?（未定）を切り替えられます。" 
      />
      <TipCard 
        tipId="availability-toggle" 
        title="参加可否の変更" 
        content="ボタンをクリックするたびに、?（未定）→ ○（参加可能）→ ×（参加不可）→ ?（未定）の順で切り替わります。" 
      />
      <TipCard 
        tipId="edit-participant" 
        title="参加者の編集" 
        content="既存の参加者の回答を編集できます。名前の横の編集ボタンをクリックすると、その人の回答を変更できます。" 
      />
      <TipCard 
        tipId="confirm-date" 
        title="日程確定機能" 
        content="参加率の高い日程を確定できます。確定ボタンをクリックすると、その日程が決定済みとして表示されます。" 
      />
      <TipCard 
        tipId="calendar-click" 
        title="カレンダーの日付クリック" 
        content="カレンダーの色付きの日付をクリックすると、その日の参加者詳細が表示されます。参加可能・不可・未回答の参加者が一覧で確認できます。" 
      />
      <TipCard 
        tipId="calendar-navigation" 
        title="カレンダーの月移動" 
        content="カレンダーの左右のボタンで前月・翌月に移動できます。イベント候補日がある月を確認しましょう。" 
      />
      <TipCard 
        tipId="copy-url" 
        title="URLのコピー" 
        content="このボタンでイベントページのURLをコピーできます。他の参加者にイベントを共有する際に便利です。" 
      />
      <TipCard 
        tipId="calendar-export" 
        title="一括カレンダー出力" 
        content="確定した全ての日程をGoogleカレンダーやiCalファイルとして一括出力できます。" 
      />
      <TipCard 
        tipId="individual-export" 
        title="個別カレンダー出力" 
        content="確定した個別の日程をGoogleカレンダーやiCalファイルとして出力できます。" 
      />
      <TipCard 
        tipId="participant-added" 
        title="参加者が追加されました" 
        content="新しい参加者が正常に追加されました。データはブラウザに保存されているため、ページを再読み込みしても残ります。" 
      />
      <TipCard 
        tipId="participant-updated" 
        title="参加者情報が更新されました" 
        content="参加者の回答が正常に更新されました。変更内容はブラウザに保存されています。" 
      />
      <TipCard 
        tipId="data-reset" 
        title="データリセット" 
        content="チュートリアルデータを初期状態にリセットしました。いつでもリセットボタンで元に戻せます。" 
      />
      <TipCard 
        tipId="download-ical" 
        title="iCalダウンロード" 
        content="カレンダーアプリで使用できるiCalファイルをダウンロードできます。OutlookやAppleカレンダーなどで利用可能です。" 
      />
    </div>
  )
}