import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, Clock } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "スケるん",
  description: "スケるん（ScheduleN）- 簡単にスケジュール調整ができるWebアプリです。候補日を設定して参加者の都合を集約し、最適な日程を見つけましょう。",
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            スケるん
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            みんなの都合を簡単に調整
          </p>
          <Link href="/create">
            <Button size="lg" className="text-lg px-8 py-3">
              新しいイベントを作成
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <Calendar className="w-12 h-12 mx-auto mb-4 text-blue-600" />
              <CardTitle>簡単作成</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                イベント名と候補日時を入力するだけで、簡単にスケジュール調整を開始できます。
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="w-12 h-12 mx-auto mb-4 text-green-600" />
              <CardTitle>みんなで回答</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                参加者は名前を入力して、各候補日時の参加可否を選択するだけ。
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Clock className="w-12 h-12 mx-auto mb-4 text-purple-600" />
              <CardTitle>結果確認</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                リアルタイムで参加者の回答状況と最適な日程を確認できます。
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-2xl mx-auto mt-16 text-center">
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">プライベートなスケジュール調整</h3>
              <p className="text-gray-600 text-sm">
                作成されたイベントは専用URLでのみアクセス可能です。<br />
                URLを知っている人のみが参加・編集できるため、安全にスケジュール調整を行えます。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
