import { inngest } from "../client"

const DAYS_WARNING = 30
const SERVICE_KM_WARNING = 500

export const fleetMaintenanceFunction = inngest.createFunction(
  {
    id: "prv-fleet-maintenance",
    name: "Fleet Maintenance Alerts — Daily",
    retries: 2,
    concurrency: { limit: 5 },
  },
  { cron: "0 6 * * *" }, // 06:00 UTC daily
  async ({ step }) => {
    const now = new Date()
    const warnDate = new Date(now.getTime() + DAYS_WARNING * 24 * 60 * 60 * 1000)

    // Step 1: find all active vehicles
    const allVehicles = await step.run("find-active-vehicles", async () => {
      const { db } = await import("@prv/db")
      const { vehicles } = await import("@prv/db/schema")
      const { eq, and, isNull } = await import("drizzle-orm")

      return db
        .select({
          id: vehicles.id,
          companyId: vehicles.companyId,
          make: vehicles.make,
          model: vehicles.model,
          licensePlate: vehicles.licensePlate,
          mileageKm: vehicles.mileageKm,
          nextServiceAtKm: vehicles.nextServiceAtKm,
          insuranceExpiresAt: vehicles.insuranceExpiresAt,
          itpExpiresAt: vehicles.itpExpiresAt,
        })
        .from(vehicles)
        .where(and(eq(vehicles.isActive, true), isNull(vehicles.deletedAt)))
        .limit(2000)
    })

    // Filter at-risk vehicles in JS to avoid SQL arithmetic on columns
    const atRisk = allVehicles.filter((v) => {
      const insExpiring = v.insuranceExpiresAt && new Date(v.insuranceExpiresAt) <= warnDate
      const itpExpiring = v.itpExpiresAt && new Date(v.itpExpiresAt) <= warnDate
      const serviceDue =
        v.nextServiceAtKm != null && v.mileageKm >= v.nextServiceAtKm - SERVICE_KM_WARNING
      return insExpiring || itpExpiring || serviceDue
    })

    if (atRisk.length === 0) return { vehiclesAtRisk: 0, alertsSent: 0 }

    // Group by company
    const byCompany = new Map<string, typeof atRisk>()
    for (const v of atRisk) {
      const list = byCompany.get(v.companyId) ?? []
      list.push(v)
      byCompany.set(v.companyId, list)
    }

    // Step 2: notify fleet managers per company
    const alertsSent = await step.run("notify-fleet-managers", async () => {
      const { db } = await import("@prv/db")
      const { companyMemberships, users, notifications } = await import("@prv/db/schema")
      const { eq, and, inArray } = await import("drizzle-orm")
      const { sendEmail, EmailFrom } = await import("@prv/email")

      let total = 0

      for (const [companyId, vehicleList] of byCompany.entries()) {
        const members = await db
          .select({ userId: companyMemberships.userId })
          .from(companyMemberships)
          .where(
            and(
              eq(companyMemberships.companyId, companyId),
              eq(companyMemberships.status, "ACTIVE"),
              inArray(companyMemberships.primaryRole, ["owner", "admin", "manager"])
            )
          )
          .limit(20)

        const userIds = members.map((m) => m.userId)
        if (userIds.length === 0) continue

        const adminUsers = await db
          .select({ id: users.id, email: users.email, firstName: users.firstName })
          .from(users)
          .where(inArray(users.id, userIds))

        for (const vehicle of vehicleList) {
          const alerts: string[] = []

          if (vehicle.insuranceExpiresAt && new Date(vehicle.insuranceExpiresAt) <= warnDate) {
            const days = Math.ceil(
              (new Date(vehicle.insuranceExpiresAt).getTime() - now.getTime()) / 86400000
            )
            alerts.push(`insurance expires in ${days} day${days !== 1 ? "s" : ""}`)
          }
          if (vehicle.itpExpiresAt && new Date(vehicle.itpExpiresAt) <= warnDate) {
            const days = Math.ceil(
              (new Date(vehicle.itpExpiresAt).getTime() - now.getTime()) / 86400000
            )
            alerts.push(`ITP expires in ${days} day${days !== 1 ? "s" : ""}`)
          }
          if (
            vehicle.nextServiceAtKm != null &&
            vehicle.mileageKm >= vehicle.nextServiceAtKm - SERVICE_KM_WARNING
          ) {
            const kmLeft = vehicle.nextServiceAtKm - vehicle.mileageKm
            alerts.push(kmLeft > 0 ? `service due in ${kmLeft} km` : "service overdue")
          }

          if (alerts.length === 0) continue

          const vehicleName = `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`
          const alertBody = `${vehicleName}: ${alerts.join(", ")}.`

          const notifRows = adminUsers.map((a) => ({
            userId: a.id,
            companyId,
            type: "warning" as const,
            channel: "in_app" as const,
            title: `Fleet alert: ${vehicleName}`,
            body: alertBody,
            entityType: "vehicle",
            entityId: vehicle.id,
            actionUrl: `/fleet/${vehicle.id}`,
            deliveredAt: now,
            metadata: { alerts } as Record<string, unknown>,
          }))

          if (notifRows.length > 0) {
            await db.insert(notifications).values(notifRows)
          }

          await Promise.allSettled(
            adminUsers.map((a) =>
              sendEmail({
                to: a.email,
                from: EmailFrom.NOTIFICATIONS,
                subject: `Fleet alert: ${vehicleName}`,
                html: `<p>Hi ${a.firstName ?? "there"},</p><p><strong>Fleet alert</strong> for <strong>${vehicleName}</strong>:</p><ul>${alerts.map((al) => `<li>${al}</li>`).join("")}</ul><p>Please take action to keep the fleet compliant and safe.</p>`,
                tags: [
                  { name: "type", value: "fleet_maintenance" },
                  { name: "vehicle_id", value: vehicle.id },
                ],
              })
            )
          )

          total++
        }
      }

      return total
    })

    return { vehiclesAtRisk: atRisk.length, alertsSent }
  }
)
