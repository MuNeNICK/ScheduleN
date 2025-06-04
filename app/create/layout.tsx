import { Metadata } from "next"

export const metadata: Metadata = {
  title: "イベント作成",
  description: "新しいスケジュール調整イベントを作成します。イベント名、説明、候補日時を設定して参加者との日程調整を始めましょう。",
}

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}