import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { Product, ProductCategory } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ProductSpec {
  label: string
  value: string
}

export interface ProductDetail extends Product {
  description: string
  specs: ProductSpec[]
  tags: string[]
  minOrderQty: number
}

const DETAIL_MAP: Record<string, Omit<ProductDetail, keyof Product>> = {
  "p-001": {
    description:
      "Set duș complet Grohe Eurosmart cu baterie monocomandă, cap duș fix Ø 200mm și duș de mână cu 3 funcții. Finisaj crom lucios, cartuș ceramic, lungime furtun 1500mm.",
    specs: [
      { label: "Marcă", value: "Grohe" },
      { label: "Model", value: "Eurosmart" },
      { label: "Cap duș", value: "Ø 200mm" },
      { label: "Funcții duș mână", value: "3" },
      { label: "Lungime furtun", value: "1500mm" },
      { label: "Finisaj", value: "Crom" },
      { label: "Garanție", value: "5 ani" },
    ],
    tags: ["sanitare", "grohe", "dus", "baie"],
    minOrderQty: 1,
  },
  "p-002": {
    description:
      "Parchet stratificat stejar natural 10mm grosime totală, 3mm strat de uzură, clasă de utilizare AC4 — potrivit pentru trafic mediu spre intens. Suprafață tratată cu ulei dur, aspect autentic.",
    specs: [
      { label: "Esență", value: "Stejar" },
      { label: "Grosime", value: "10mm" },
      { label: "Strat uzură", value: "3mm" },
      { label: "Clasă utilizare", value: "AC4" },
      { label: "Format lamă", value: "1200×180mm" },
      { label: "Suprafață", value: "Ulei dur" },
      { label: "Montaj", value: "Click / flotant" },
    ],
    tags: ["pardoseli", "stejar", "parchet", "lemn"],
    minOrderQty: 5,
  },
  "p-003": {
    description:
      "Vopsea lavabilă superioară Baumit pentru interior, acoperire excelentă în 2 straturi, rezistentă la spălare clasa 1, alb mat. Recipient 15L, acoperire aproximativă 120m² / ambalaj.",
    specs: [
      { label: "Marcă", value: "Baumit" },
      { label: "Volum", value: "15L" },
      { label: "Acoperire", value: "~120m²" },
      { label: "Finisaj", value: "Mat" },
      { label: "Rezistență spălare", value: "Clasa 1" },
      { label: "Timp uscare", value: "2h" },
      { label: "Straturi recomandate", value: "2" },
    ],
    tags: ["vopsele", "baumit", "lavabila", "interior"],
    minOrderQty: 1,
  },
  "p-004": {
    description:
      "Bormaşină-şurubelniţă cu percuție fără fir Bosch GSB 18V-55 din seria Professional. Acumulator Li-Ion 18V 2.0Ah inclus, încărcător rapid GAL 1210 CV, mandrina 13mm.",
    specs: [
      { label: "Marcă", value: "Bosch" },
      { label: "Model", value: "GSB 18V-55" },
      { label: "Tensiune", value: "18V" },
      { label: "Cuplu maxim", value: "55 Nm" },
      { label: "Mandrina", value: "13mm" },
      { label: "Viteze", value: "2" },
      { label: "Acumulator inclus", value: "2.0Ah" },
    ],
    tags: ["scule", "bosch", "bormasina", "acumulator"],
    minOrderQty: 1,
  },
  "p-005": {
    description:
      "Tablou electric modular Hager Volta 24 module, îngropat, capac IP40 + rezervă 4 module pentru extensii viitoare. Bara faza dublă, șine DIN 35mm, cablaj pregătit.",
    specs: [
      { label: "Marcă", value: "Hager" },
      { label: "Module", value: "24" },
      { label: "Montaj", value: "Îngropat" },
      { label: "Grad protecție", value: "IP40" },
      { label: "Bara faza", value: "Dublă" },
      { label: "Sina DIN", value: "35mm" },
      { label: "Garanție", value: "2 ani" },
    ],
    tags: ["electrice", "hager", "tablou", "sigurante"],
    minOrderQty: 1,
  },
  "p-006": {
    description:
      "Cabină duș dreptunghiulară Cersanit Zip 90×90cm, profil aluminiu, geam securizat 6mm Easy Clean. Ușă pivotantă, înălțime 195cm, etanșeizare superioară.",
    specs: [
      { label: "Marcă", value: "Cersanit" },
      { label: "Dimensiuni", value: "90×90cm" },
      { label: "Înălțime", value: "195cm" },
      { label: "Sticlă", value: "6mm securizat" },
      { label: "Tratament sticlă", value: "Easy Clean" },
      { label: "Profil", value: "Aluminiu" },
      { label: "Ușă", value: "Pivotantă" },
    ],
    tags: ["sanitare", "cersanit", "cabina", "dus"],
    minOrderQty: 1,
  },
  "p-007": {
    description:
      "Fereastră PVC 5 camere Salamander 100×120cm cu geam tripan 4-16-4-16-4mm Ar, ug=0.5W/m²K. Feronerie Roto NX, deschidere batant-basculant, profil alb.",
    specs: [
      { label: "Profil", value: "Salamander 5 camere" },
      { label: "Dimensiuni", value: "100×120cm" },
      { label: "Geam", value: "Tripan 4-16-4-16-4" },
      { label: "Ug", value: "0.5 W/m²K" },
      { label: "Feronerie", value: "Roto NX" },
      { label: "Deschidere", value: "Batant-basculant" },
      { label: "Culoare", value: "Alb RAL9016" },
    ],
    tags: ["tamplarie", "pvc", "fereastra", "termopan"],
    minOrderQty: 1,
  },
  "p-008": {
    description:
      "Gresie porțelanată mată 60×60cm, calibru precis ±0.5mm, clasa de alunecare R10. Aspect ciment industrial, potrivit pentru baie, bucătărie, hol. Ambalaj 1.44m².",
    specs: [
      { label: "Format", value: "60×60cm" },
      { label: "Grosime", value: "9mm" },
      { label: "Calibru", value: "±0.5mm" },
      { label: "Alunecare", value: "R10" },
      { label: "Absorbție apă", value: "<0.1%" },
      { label: "Duritate", value: "PEI 4" },
      { label: "Ambalaj", value: "1.44m²" },
    ],
    tags: ["pardoseli", "gresie", "portelanata", "60x60"],
    minOrderQty: 10,
  },
  "p-009": {
    description:
      "Grund penetrant consolidant Ceresit CT17 pentru exterior și interior. Îmbunătățește aderența tencuielilor și finisajelor, stabilizează suprafețe absorbante. Sac 25kg.",
    specs: [
      { label: "Marcă", value: "Ceresit" },
      { label: "Model", value: "CT17" },
      { label: "Ambalaj", value: "25kg" },
      { label: "Acoperire", value: "~8kg/m²" },
      { label: "Granulometrie", value: "0.5mm" },
      { label: "Utilizare", value: "Exterior + interior" },
      { label: "Clasă A1", value: "Incombustibil" },
    ],
    tags: ["vopsele", "ceresit", "grund", "tencuiala"],
    minOrderQty: 2,
  },
  "p-010": {
    description:
      "Polizor unghiular Makita GA5030K 125mm, 720W, turație 11000rpm. Protecție disc, cheie fixare disc, geanta transport incluse. Ideal tăieri, șlefuiri beton/metal.",
    specs: [
      { label: "Marcă", value: "Makita" },
      { label: "Model", value: "GA5030K" },
      { label: "Putere", value: "720W" },
      { label: "Disc", value: "125mm" },
      { label: "Turație", value: "11000 rpm" },
      { label: "Greutate", value: "1.6kg" },
      { label: "Accesorii incluse", value: "Geantă, cheie" },
    ],
    tags: ["scule", "makita", "flex", "polizor"],
    minOrderQty: 1,
  },
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: "p-001",
    sku: "SAN-GR-ES",
    name: "Set duș Grohe Eurosmart",
    category: "sanitare",
    price: 189,
    unit: "buc",
    stock: 14,
    featured: true,
  },
  {
    id: "p-002",
    sku: "PAR-OAK-10",
    name: "Parchet stejar 10mm",
    category: "pardoseli",
    price: 28,
    unit: "m²",
    stock: 340,
    featured: true,
  },
  {
    id: "p-003",
    sku: "VOP-BAU-15",
    name: "Baumit lavabilă interior 15L",
    category: "vopsele",
    price: 42,
    unit: "buc",
    stock: 62,
    featured: true,
  },
  {
    id: "p-004",
    sku: "SCU-BSC-18V",
    name: "Bosch GSB 18V Li-Ion",
    category: "scule",
    price: 210,
    unit: "buc",
    stock: 8,
    featured: true,
  },
  {
    id: "p-005",
    sku: "ELC-HAG-24",
    name: "Tablou electric 24 module Hager",
    category: "electrice",
    price: 94,
    unit: "buc",
    stock: 5,
    badge: "low-stock",
    featured: false,
  },
  {
    id: "p-006",
    sku: "SAN-CER-90",
    name: "Cabină duș 90×90 Cersanit",
    category: "sanitare",
    price: 416,
    oldPrice: 520,
    unit: "buc",
    stock: 3,
    badge: "sale",
    featured: false,
  },
  {
    id: "p-007",
    sku: "TAM-PVC-3C",
    name: "Fereastră PVC 3 camere 100×120",
    category: "tamplarie",
    price: 340,
    unit: "buc",
    stock: 22,
    badge: "new",
    featured: false,
  },
  {
    id: "p-008",
    sku: "PAR-GRE-60",
    name: "Gresie porțelanată 60×60 mată",
    category: "pardoseli",
    price: 18,
    unit: "m²",
    stock: 800,
    featured: false,
  },
  {
    id: "p-009",
    sku: "VOP-CER-CT17",
    name: "Grund penetrant Ceresit CT17 25kg",
    category: "vopsele",
    price: 36,
    unit: "sac",
    stock: 48,
    featured: false,
  },
  {
    id: "p-010",
    sku: "SCU-MAK-125",
    name: "Flex unghiular Makita 125mm",
    category: "scule",
    price: 128,
    unit: "buc",
    stock: 11,
    badge: "new",
    featured: false,
  },
]

export const GET = withGates(
  { action: "shop.products.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").filter(Boolean).pop() ?? ""
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const base = MOCK_PRODUCTS.find((p) => p.id === id)
    if (!base) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const extra = DETAIL_MAP[id] ?? {
      description: "Detalii produs disponibile în curând.",
      specs: [],
      tags: [],
      minOrderQty: 1,
    }

    const related = MOCK_PRODUCTS.filter((p) => p.id !== id && p.category === base.category).slice(
      0,
      3
    )

    return NextResponse.json({ product: { ...base, ...extra }, related })
  }
)
