"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Minus, ArrowLeft, Trash2, AlertTriangle, Clock, Edit2, X, Check } from "lucide-react"
import Link from "next/link"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface Event {
  id: string
  title: string
  description: string
  dateOptions: Array<{
    id?: number
    datetime: string
    formatted: string
    startTime?: string
    endTime?: string
  }>
  participants: Array<{
    name: string
    availabilities: Record<string, string>
    submittedAt: string
  }>
  createdAt: string
  confirmedDateOptionIds?: number[]
}

interface DateTimeOption {
  id: string
  datetime: string
  hasTime: boolean
  startTime?: string
  endTime?: string
}

export default function EditEventPage() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [password, setPassword] = useState("")
  const [dateOptions, setDateOptions] = useState<DateTimeOption[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [bulkStartTime, setBulkStartTime] = useState("")
  const [bulkEndTime, setBulkEndTime] = useState("")
  const [bulkHasTime, setBulkHasTime] = useState(false)
  const [bulkEditMode, setBulkEditMode] = useState<"add" | "delete" | "edit">("add")

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${params.id}`)
        if (response.ok) {
          const foundEvent = await response.json()
          
          // Check if event is password protected but not authenticated
          if (foundEvent.passwordProtected) {
            // Redirect to event page for password authentication
            window.location.href = `/event/${params.id}`
            return
          }
          
          setEvent(foundEvent)
          setTitle(foundEvent.title)
          setDescription(foundEvent.description)
          setPassword(foundEvent.password || "")
          
          if (foundEvent.dateOptions) {
            setDateOptions(foundEvent.dateOptions.map((option: { id?: number; datetime: string; formatted: string; startTime?: string; endTime?: string }, index: number) => ({
              id: option.id ? option.id.toString() : `option-${index}`,
              datetime: option.datetime,
              hasTime: !!(option.startTime || option.endTime),
              startTime: option.startTime || "",
              endTime: option.endTime || ""
            })))
          }
        }
      } catch (error) {
        console.error('Error fetching event:', error)
      }
    }
    
    fetchEvent()
  }, [params.id])

  const addDateOption = () => {
    const newId = Math.random().toString(36).substr(2, 9)
    setDateOptions([...dateOptions, { id: newId, datetime: "", hasTime: false, startTime: "", endTime: "" }])
  }

  const removeDateOption = (id: string) => {
    if (dateOptions.length > 1) {
      setDateOptions(dateOptions.filter(option => option.id !== id))
    }
  }

  const updateDateOption = (id: string, updates: Partial<DateTimeOption>) => {
    setDateOptions(dateOptions.map(option =>
      option.id === id ? { ...option, ...updates } : option
    ))
  }

  const handleBulkOperation = () => {
    if (selectedDates.length === 0) {
      alert("日付を選択してください。")
      return
    }

    if (bulkEditMode === "add") {
      const newOptions: DateTimeOption[] = []
      selectedDates.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const existingOption = dateOptions.find(opt => opt.datetime === dateStr)
        if (!existingOption) {
          const newId = Math.random().toString(36).substr(2, 9)
          newOptions.push({
            id: newId,
            datetime: dateStr,
            hasTime: bulkHasTime,
            startTime: bulkHasTime ? bulkStartTime : "",
            endTime: bulkHasTime ? bulkEndTime : ""
          })
        }
      })
      setDateOptions([...dateOptions, ...newOptions])
    } else if (bulkEditMode === "delete") {
      const datesToDelete = selectedDates.map(d => format(d, 'yyyy-MM-dd'))
      setDateOptions(dateOptions.filter(opt => !datesToDelete.includes(opt.datetime)))
    } else if (bulkEditMode === "edit") {
      const datesToEdit = selectedDates.map(d => format(d, 'yyyy-MM-dd'))
      setDateOptions(dateOptions.map(opt => {
        if (datesToEdit.includes(opt.datetime)) {
          return {
            ...opt,
            hasTime: bulkHasTime,
            startTime: bulkHasTime ? bulkStartTime : "",
            endTime: bulkHasTime ? bulkEndTime : ""
          }
        }
        return opt
      }))
    }

    setSelectedDates([])
    setBulkStartTime("")
    setBulkEndTime("")
    setBulkHasTime(false)
    setShowBulkEdit(false)
  }


  const getDateModifiers = () => {
    const modifiers: Record<string, Date[]> = {}
    if (dateOptions.length > 0) {
      modifiers.existing = dateOptions.map(opt => new Date(opt.datetime + 'T00:00:00'))
    }
    if (selectedDates.length > 0) {
      modifiers.selected = selectedDates
    }
    return modifiers
  }

  const getDateModifiersClassNames = () => {
    return {
      existing: "bg-blue-100 text-blue-900 hover:bg-blue-200",
      selected: "bg-orange-100 text-orange-900 hover:bg-orange-200 font-bold"
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!event) return

    const validOptions = dateOptions.filter(option => option.datetime)
    if (validOptions.length === 0) {
      alert("少なくとも1つの日時を選択してください。")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          password: password.trim() || undefined,
          dateOptions: validOptions.map(option => {
            let formatted = new Date(option.datetime + 'T00:00:00').toLocaleDateString('ja-JP')
            
            if (option.hasTime && option.startTime) {
              const timeStr = option.endTime 
                ? `${option.startTime} - ${option.endTime}`
                : option.startTime
              formatted += ` ${timeStr}`
            }
            
            return {
              datetime: option.datetime,
              formatted,
              startTime: option.hasTime ? option.startTime : undefined,
              endTime: option.hasTime ? option.endTime : undefined
            }
          })
        }),
      })

      if (response.ok) {
        router.push(`/event/${event.id}`)
      } else {
        alert('イベントの更新に失敗しました。')
      }
    } catch (error) {
      console.error('Error updating event:', error)
      alert('イベントの更新に失敗しました。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!event) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/')
      } else {
        alert('イベントの削除に失敗しました。')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('イベントの削除に失敗しました。')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>
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

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">イベントを編集</CardTitle>
            <CardDescription>
              イベントの詳細を変更してください。参加者の回答は保持されます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">イベント名 *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例：チームミーティング"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">説明（任意）</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="イベントの詳細や注意事項があれば記入してください"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">パスワード（任意）</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="イベントを非公開にする場合はパスワードを設定してください"
                />
                <p className="text-sm text-gray-600">
                  パスワードを空にすると、誰でもイベントを閲覧できるようになります。
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>候補日時 *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkEdit(true)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    一括編集
                  </Button>
                </div>
                {dateOptions.map((option) => (
                  <div key={option.id} className="space-y-2 p-4 border rounded-lg">
                    <div className="flex gap-2 items-center">
                      <Input
                        type="date"
                        value={option.datetime}
                        onChange={(e) => updateDateOption(option.id, { datetime: e.target.value })}
                        className="flex-1"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateDateOption(option.id, { hasTime: !option.hasTime })}
                        title={option.hasTime ? "時間を削除" : "時間を追加"}
                      >
                        <Clock className={`w-4 h-4 ${option.hasTime ? 'text-blue-600' : 'text-gray-400'}`} />
                      </Button>
                      {dateOptions.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeDateOption(option.id)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {option.hasTime && (
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <Label className="text-xs text-gray-600">開始時間</Label>
                          <Input
                            type="time"
                            value={option.startTime || ""}
                            onChange={(e) => updateDateOption(option.id, { startTime: e.target.value })}
                            className="w-full"
                            placeholder="開始時間"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-gray-600">終了時間</Label>
                          <Input
                            type="time"
                            value={option.endTime || ""}
                            onChange={(e) => updateDateOption(option.id, { endTime: e.target.value })}
                            className="w-full"
                            placeholder="終了時間"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addDateOption}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  日時を追加
                </Button>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" size="lg" loading={isSubmitting}>
                  変更を保存
                </Button>
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="lg"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSubmitting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  削除
                </Button>
              </div>
            </form>

            {showDeleteConfirm && (
              <div className="mt-6 p-4 border-2 border-red-200 rounded-lg bg-red-50">
                <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  イベントを削除しますか？
                </div>
                <p className="text-red-700 text-sm mb-4">
                  この操作は取り消せません。イベントと全ての参加者の回答が削除されます。
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete}
                    size="sm"
                    loading={isDeleting}
                  >
                    削除する
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteConfirm(false)}
                    size="sm"
                    disabled={isDeleting}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>日付の一括編集</DialogTitle>
            <DialogDescription>
              カレンダーから日付を選択して、一括で追加・削除・編集ができます。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={bulkEditMode === "add" ? "default" : "outline"}
                size="sm"
                onClick={() => setBulkEditMode("add")}
              >
                <Plus className="w-4 h-4 mr-2" />
                追加
              </Button>
              <Button
                variant={bulkEditMode === "delete" ? "default" : "outline"}
                size="sm"
                onClick={() => setBulkEditMode("delete")}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                削除
              </Button>
              <Button
                variant={bulkEditMode === "edit" ? "default" : "outline"}
                size="sm"
                onClick={() => setBulkEditMode("edit")}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                時間編集
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  カレンダーから日付を選択
                </Label>
                <div className="border rounded-lg p-2 w-fit">
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => setSelectedDates(dates || [])}
                    locale={ja}
                    modifiers={getDateModifiers()}
                    modifiersClassNames={getDateModifiersClassNames()}
                    className="rounded-md"
                  />
                </div>
                <div className="mt-2 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 rounded"></div>
                    <span>既存の候補日</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-100 rounded"></div>
                    <span>選択中の日付</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    選択した日付 ({selectedDates.length}件)
                  </Label>
                  <div className="border rounded-lg p-3 h-[200px] overflow-y-auto">
                    {selectedDates.length === 0 ? (
                      <p className="text-sm text-gray-500">日付を選択してください</p>
                    ) : (
                      <div className="space-y-1">
                        {selectedDates
                          .sort((a, b) => a.getTime() - b.getTime())
                          .map((date, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span>{format(date, "yyyy年MM月dd日 (E)", { locale: ja })}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedDates(selectedDates.filter((_, i) => i !== index))
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {(bulkEditMode === "add" || bulkEditMode === "edit") && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="bulk-has-time-dialog"
                        checked={bulkHasTime}
                        onChange={(e) => setBulkHasTime(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="bulk-has-time-dialog" className="text-sm">時間を指定</Label>
                    </div>
                    {bulkHasTime && (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">開始時間</Label>
                          <Input
                            type="time"
                            value={bulkStartTime}
                            onChange={(e) => setBulkStartTime(e.target.value)}
                            placeholder="開始時間"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs">終了時間</Label>
                          <Input
                            type="time"
                            value={bulkEndTime}
                            onChange={(e) => setBulkEndTime(e.target.value)}
                            placeholder="終了時間"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleBulkOperation}
                    disabled={selectedDates.length === 0}
                    className="flex-1"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {bulkEditMode === "add" ? "追加" : bulkEditMode === "delete" ? "削除" : "更新"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowBulkEdit(false)
                      setSelectedDates([])
                    }}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}