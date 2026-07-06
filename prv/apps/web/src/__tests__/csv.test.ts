import { describe, it, expect } from "vitest"
import { toCsv } from "@/lib/csv"

const cols = [
  { key: "name", label: "Name" },
  { key: "qty", label: "Qty" },
]

describe("toCsv", () => {
  it("writes a header row from the column labels", () => {
    const csv = toCsv([], cols)
    expect(csv).toBe("Name,Qty")
  })

  it("serializes rows in column order, joined with CRLF", () => {
    const csv = toCsv(
      [
        { name: "Tap", qty: 5 },
        { name: "Tile", qty: 12 },
      ],
      cols
    )
    expect(csv).toBe("Name,Qty\r\nTap,5\r\nTile,12")
  })

  it("quotes fields containing commas, quotes or newlines and doubles quotes", () => {
    const csv = toCsv([{ name: 'Grohe "Pro", 40mm', qty: "a\nb" }], cols)
    expect(csv).toBe('Name,Qty\r\n"Grohe ""Pro"", 40mm","a\nb"')
  })

  it("renders null/undefined and missing keys as empty cells", () => {
    const csv = toCsv([{ name: null, qty: undefined }, {}], cols)
    expect(csv).toBe("Name,Qty\r\n,\r\n,")
  })

  it("stringifies numbers and booleans", () => {
    const csv = toCsv([{ name: true, qty: 0 }], cols)
    expect(csv).toBe("Name,Qty\r\ntrue,0")
  })
})
