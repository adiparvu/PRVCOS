import { StockTakeSessionClient } from "./StockTakeSessionClient"

export const metadata = { title: "Inventariere · PRV" }

interface Props {
  params: Promise<{ id: string }>
}

export default async function StockTakeSessionPage({ params }: Props) {
  const { id } = await params
  return <StockTakeSessionClient id={id} />
}
