// Seed: vehicles with daily logs and tools with assignments
import { db } from "../client"
import { vehicles, vehicleDailyLogs, tools } from "../schema/fleet"

export interface FleetSeedResult {
  vehicleIds: string[]
  toolIds: string[]
}

export async function seedFleet(opts: {
  companyId: string
  storeId: string
  supervisorId: string
  workerIds: string[]
}): Promise<FleetSeedResult> {
  console.log("  → Seeding fleet & tools...")

  const { companyId, storeId, supervisorId, workerIds } = opts
  const [worker1Id, worker2Id, worker3Id] = workerIds

  // ── Vehicles ────────────────────────────────────────────────────────────────
  const vehicleDefs = [
    {
      assignedUserId: supervisorId,
      storeId,
      type: "van" as const,
      status: "active" as const,
      make: "Ford",
      model: "Transit",
      year: 2022,
      licensePlate: "B-234-PRV",
      vin: "WF0XXXTTGXNA12345",
      color: "Alb",
      fuelType: "Diesel",
      mileageKm: 42800,
      fuelLevelPct: 75,
      nextServiceAtKm: 50000,
      insuranceExpiresAt: new Date("2026-01-15"),
      itpExpiresAt: new Date("2025-11-20"),
    },
    {
      assignedUserId: worker1Id,
      storeId,
      type: "car" as const,
      status: "active" as const,
      make: "Dacia",
      model: "Duster",
      year: 2021,
      licensePlate: "B-567-PRV",
      vin: "UU1HSDACYB12345",
      color: "Gri",
      fuelType: "Benzină",
      mileageKm: 58200,
      fuelLevelPct: 50,
      nextServiceAtKm: 60000,
      insuranceExpiresAt: new Date("2025-12-31"),
      itpExpiresAt: new Date("2026-03-10"),
    },
    {
      storeId,
      type: "van" as const,
      status: "maintenance" as const,
      make: "Volkswagen",
      model: "Crafter",
      year: 2019,
      licensePlate: "B-891-PRV",
      color: "Alb",
      fuelType: "Diesel",
      mileageKm: 118500,
      nextServiceAtKm: 120000,
      insuranceExpiresAt: new Date("2025-09-30"),
      itpExpiresAt: new Date("2025-08-15"),
      notes: "În service — schimb ambreiaj",
    },
  ]

  const vehicleIds: string[] = []

  for (const v of vehicleDefs) {
    const [record] = await db
      .insert(vehicles)
      .values({ companyId, ...v })
      .returning({ id: vehicles.id })
    if (record) vehicleIds.push(record.id)
  }

  // ── Daily logs for vehicle 1 ─────────────────────────────────────────────
  if (vehicleIds[0]) {
    const logDates = ["2025-05-12", "2025-05-13", "2025-05-14", "2025-05-15", "2025-05-16"]
    let odometer = 42600
    for (const date of logDates) {
      odometer += Math.floor(Math.random() * 80) + 40
      await db
        .insert(vehicleDailyLogs)
        .values({
          companyId,
          vehicleId: vehicleIds[0],
          recordedBy: supervisorId,
          date,
          odometerKm: odometer,
        })
        .onConflictDoNothing()
    }
  }

  // ── Tools ────────────────────────────────────────────────────────────────
  const toolDefs = [
    {
      assignedUserId: worker1Id,
      storeId,
      name: "Mașină de găurit Bosch GSB 18V",
      category: "electrice",
      brand: "Bosch",
      model: "GSB 18V-55",
      serialNumber: "BSH-2023-001",
      status: "in_use" as const,
    },
    {
      assignedUserId: worker1Id,
      storeId,
      name: "Flex 125mm DeWalt",
      category: "electrice",
      brand: "DeWalt",
      model: "DWE4206",
      serialNumber: "DWT-2022-045",
      status: "in_use" as const,
    },
    {
      assignedUserId: worker3Id,
      storeId,
      name: 'Cheie franceză 18" Gedore',
      category: "manuale",
      brand: "Gedore",
      model: "6238540",
      status: "in_use" as const,
    },
    {
      assignedUserId: worker3Id,
      storeId,
      name: "Trusă fitinguri presă Viega",
      category: "sanitare",
      brand: "Viega",
      model: "Pressgun 5",
      serialNumber: "VIG-2024-012",
      status: "in_use" as const,
    },
    {
      storeId,
      name: "Schelă metalică 3 niveluri",
      category: "echipamente",
      brand: "Layher",
      status: "available" as const,
      notes: "Depozit central, sector C",
    },
    {
      storeId,
      name: "Generator Honda EU22i",
      category: "electrice",
      brand: "Honda",
      model: "EU22i",
      serialNumber: "HND-2023-888",
      status: "available" as const,
    },
    {
      storeId,
      name: "Polizor unghiular Makita 230mm",
      category: "electrice",
      brand: "Makita",
      model: "GA9020",
      serialNumber: "MKT-2021-334",
      status: "maintenance" as const,
      notes: "Disc de schimbat",
    },
  ]

  const toolIds: string[] = []

  for (const t of toolDefs) {
    const [record] = await db
      .insert(tools)
      .values({ companyId, ...t })
      .returning({ id: tools.id })
    if (record) toolIds.push(record.id)
  }

  console.log(`    ✓ Vehicles: ${vehicleIds.length}, Tools: ${toolIds.length}`)
  return { vehicleIds, toolIds }
}
