import { Metadata } from "next"

export const metadata: Metadata = {
  title: "イベント詳細",
  description: "スケジュール調整イベントの詳細ページです。参加者の都合を確認し、自分の参加状況を入力できます。",
}

export default function EventLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}