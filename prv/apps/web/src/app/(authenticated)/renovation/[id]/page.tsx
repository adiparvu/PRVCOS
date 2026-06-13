import { RenovationProjectDetailClient } from "./RenovationProjectDetailClient"

export const metadata = { title: "Renovation Project · PRV" }

export default function RenovationProjectPage({ params }: { params: { id: string } }) {
  return <RenovationProjectDetailClient id={params.id} />
}
