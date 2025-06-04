import { Metadata } from "next"

export const metadata: Metadata = {
  title: "イベント編集",
  description: "既存のスケジュール調整イベントを編集します。イベント名、説明、候補日時を変更できます。",
}

export default function EditLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}