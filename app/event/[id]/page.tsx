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
import { ArrowLeft, Users, Calendar, Copy, Check, Edit2, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { ja } from "date-fns/locale"

interface DateOptionWithId {
  id?: number
  datetime: string
  formatted: string
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
  const participateFormRef = useRef<HTMLDivElement>(null)

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
      return { isEventDate: false, participationRate: 0, summary: '' }
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
      return {
        isEventDate: true,
        participationRate: rate,
        summary: getSummary(matchingOption)
      }
    }
    
    return { isEventDate: false, participationRate: 0, summary: '' }
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
                          {option.formatted}
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
                    <TableRow className="bg-gray-50">
                      <TableCell className="font-bold">参加可能人数</TableCell>
                      {event.dateOptions?.map((option) => (
                        <TableCell key={option.id || option.datetime} className="text-center font-bold">
                          {getSummary(option)}
                        </TableCell>
                      ))}
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
                  <div className="relative">
                    <CalendarComponent
                      locale={ja}
                      className="rounded-md border w-fit mx-auto"
                      classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                        month: "space-y-4",
                        caption: "flex justify-center pt-1 pb-4 relative items-center",
                        caption_label: "text-lg font-semibold px-12",
                        nav: "absolute inset-0 flex justify-between items-center px-2",
                        nav_button: "h-8 w-8 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center shadow-sm",
                        nav_button_previous: "",
                        nav_button_next: "",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex",
                        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] flex items-center justify-center",
                        row: "flex w-full mt-2",
                        cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-center leading-9",
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
                        day_today: "bg-accent text-accent-foreground rounded-md",
                        day_outside: "text-muted-foreground opacity-50 rounded-md",
                        day_disabled: "text-muted-foreground opacity-50 rounded-md",
                        day_hidden: "invisible",
                      }}
                      modifiers={{
                        high: getEventDates().filter(date => {
                          const info = getDateInfo(date)
                          return info.participationRate >= 0.7
                        }),
                        medium: getEventDates().filter(date => {
                          const info = getDateInfo(date)
                          return info.participationRate >= 0.4 && info.participationRate < 0.7
                        }),
                        low: getEventDates().filter(date => {
                          const info = getDateInfo(date)
                          return info.participationRate < 0.4
                        }),
                      }}
                      modifiersStyles={{
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
                  </div>
                  
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
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div 
                                className={`
                                  w-4 h-4 rounded-full
                                  ${isHighParticipation 
                                    ? 'bg-green-500' 
                                    : isMediumParticipation 
                                      ? 'bg-yellow-500' 
                                      : 'bg-red-200'
                                  }
                                `}
                              />
                              <span className="font-medium">{option.formatted}</span>
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