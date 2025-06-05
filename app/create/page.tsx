"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Minus, ArrowLeft, Calendar, Clock } from "lucide-react"
import Link from "next/link"

interface DateTimeOption {
  id: string
  datetime: string
  hasTime: boolean
  startTime?: string
  endTime?: string
}

export default function CreateEventPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [password, setPassword] = useState("")
  const [dateOptions, setDateOptions] = useState<DateTimeOption[]>([
    { id: "1", datetime: "", hasTime: false, startTime: "", endTime: "" }
  ])
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const [bulkStartDate, setBulkStartDate] = useState("")
  const [bulkEndDate, setBulkEndDate] = useState("")
  const [bulkStartTime, setBulkStartTime] = useState("")
  const [bulkEndTime, setBulkEndTime] = useState("")
  const [bulkHasTime, setBulkHasTime] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const addBulkDates = () => {
    if (!bulkStartDate || !bulkEndDate) {
      alert("開始日と終了日を選択してください。")
      return
    }

    const startDate = new Date(bulkStartDate)
    const endDate = new Date(bulkEndDate)
    
    if (startDate > endDate) {
      alert("開始日は終了日より前の日付を選択してください。")
      return
    }

    const newOptions: DateTimeOption[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]

      const newId = Math.random().toString(36).substr(2, 9)
      newOptions.push({
        id: newId,
        datetime: dateStr,
        hasTime: bulkHasTime,
        startTime: bulkHasTime ? bulkStartTime : "",
        endTime: bulkHasTime ? bulkEndTime : ""
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    setDateOptions([...dateOptions, ...newOptions])
    setBulkStartDate("")
    setBulkEndDate("")
    setBulkStartTime("")
    setBulkEndTime("")
    setBulkHasTime(false)
    setShowBulkAdd(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validOptions = dateOptions.filter(option => option.datetime)
    if (validOptions.length === 0) {
      alert("少なくとも1つの日時を選択してください。")
      return
    }

    setIsSubmitting(true)

    const event = {
      id: Date.now().toString(),
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
      }),
      participants: [],
      createdAt: new Date().toISOString()
    }

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })

      if (response.ok) {
        router.push(`/event/${event.id}`)
      } else {
        alert('イベントの作成に失敗しました。')
      }
    } catch (error) {
      console.error('Error creating event:', error)
      alert('イベントの作成に失敗しました。')
    } finally {
      setIsSubmitting(false)
    }
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
            <CardTitle className="text-2xl">新しいイベントを作成</CardTitle>
            <CardDescription>
              スケジュール調整のためのイベントを作成してください。
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
                  パスワードを設定すると、このイベントを閲覧するためにパスワードが必要になります。
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>候補日時 *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkAdd(!showBulkAdd)}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    一括追加
                  </Button>
                </div>
                
                {showBulkAdd && (
                  <Card className="p-4 bg-blue-50">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">期間を指定して一括追加</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="bulk-start" className="text-xs">開始日</Label>
                          <Input
                            id="bulk-start"
                            type="date"
                            value={bulkStartDate}
                            onChange={(e) => setBulkStartDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="bulk-end" className="text-xs">終了日</Label>
                          <Input
                            id="bulk-end"
                            type="date"
                            value={bulkEndDate}
                            onChange={(e) => setBulkEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bulk-has-time"
                          checked={bulkHasTime}
                          onChange={(e) => setBulkHasTime(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="bulk-has-time" className="text-xs">時間を指定</Label>
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
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={addBulkDates}
                          className="flex-1"
                        >
                          追加
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBulkAdd(false)}
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

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

              <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
                イベントを作成
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}