// Seed: renovation projects with phases, tasks, estimates, contracts, site reports, material requests
import { db } from "../client"
import {
  renovationProjects,
  renovationPhases,
  renovationTasks,
  renovationEstimates,
  renovationEstimateLines,
  renovationContracts,
  renovationSiteReports,
  renovationMaterialRequests,
  renovationMaterialRequestLines,
} from "../schema/renovation"
import { eq } from "drizzle-orm"

export interface RenovationSeedResult {
  projectIds: string[]
}

export async function seedRenovation(opts: {
  companyId: string
  clientIds: string[]
  managerId: string
  supervisorId: string
  workerIds: string[]
}): Promise<RenovationSeedResult> {
  console.log("  → Seeding renovation projects...")

  const { companyId, clientIds, managerId, supervisorId, workerIds } = opts
  const [clientId1, clientId2, clientId3] = clientIds
  const [worker1Id, worker2Id, worker3Id] = workerIds

  const projectDefs = [
    {
      clientId: clientId1,
      projectCode: "PRV-2025-001",
      title: "Renovare Apartament 3 Camere — Bd. Unirii",
      description:
        "Renovare completă apartament 3 camere: zugrăveli, gresie, faianță, instalații electrice și sanitare.",
      status: "in_progress" as const,
      priority: "high" as const,
      projectType: "residential" as const,
      address: "Bd. Unirii 12, Ap. 45, Sector 4",
      city: "București",
      estimatedStartDate: "2025-03-01",
      estimatedEndDate: "2025-06-30",
      actualStartDate: "2025-03-05",
      estimatedValue: "85000",
      contractedValue: "82000",
      projectManagerId: managerId,
      siteSupervisorId: supervisorId,
      completionPercentage: 65,
    },
    {
      clientId: clientId2,
      projectCode: "PRV-2025-002",
      title: "Renovare Birouri — Hotel Royal",
      description:
        "Renovare și modernizare spații birouri etaj 3: pereți, pardoseală, iluminat LED, sistem climatizare.",
      status: "contracted" as const,
      priority: "medium" as const,
      projectType: "commercial" as const,
      address: "Calea Victoriei 88, Sector 1",
      city: "București",
      estimatedStartDate: "2025-07-01",
      estimatedEndDate: "2025-09-30",
      estimatedValue: "145000",
      contractedValue: "140000",
      projectManagerId: managerId,
      siteSupervisorId: supervisorId,
      completionPercentage: 0,
    },
    {
      clientId: clientId3,
      projectCode: "PRV-2025-003",
      title: "Renovare Baie și Bucătărie — Cluj-Napoca",
      description:
        "Renovare baie și bucătărie: faianță, gresie, mobilier, instalații, obiecte sanitare noi.",
      status: "completed" as const,
      priority: "medium" as const,
      projectType: "residential" as const,
      address: "Str. Memorandumului 20, Ap. 8",
      city: "Cluj-Napoca",
      estimatedStartDate: "2025-01-10",
      estimatedEndDate: "2025-02-28",
      actualStartDate: "2025-01-12",
      actualEndDate: "2025-02-25",
      estimatedValue: "28000",
      contractedValue: "27500",
      projectManagerId: managerId,
      siteSupervisorId: supervisorId,
      completionPercentage: 100,
    },
  ]

  const projectIds: string[] = []

  for (const p of projectDefs) {
    const existing = await db
      .select({ id: renovationProjects.id })
      .from(renovationProjects)
      .where(eq(renovationProjects.projectCode, p.projectCode))
      .limit(1)

    let projectId: string

    if (existing[0]) {
      projectId = existing[0].id
    } else {
      const [record] = await db
        .insert(renovationProjects)
        .values({ companyId, ...p })
        .returning({ id: renovationProjects.id })
      if (!record) continue
      projectId = record.id
    }

    projectIds.push(projectId)
  }

  // ── Phases for project 1 (in_progress) ─────────────────────────────────────
  if (projectIds[0]) {
    const pid = projectIds[0]

    const phaseDefs = [
      {
        phaseNumber: 1,
        title: "Demolare și pregătire",
        status: "completed" as const,
        plannedStartDate: "2025-03-05",
        plannedEndDate: "2025-03-20",
        actualStartDate: "2025-03-05",
        actualEndDate: "2025-03-19",
        completionPercentage: 100,
      },
      {
        phaseNumber: 2,
        title: "Instalații electrice",
        status: "completed" as const,
        plannedStartDate: "2025-03-20",
        plannedEndDate: "2025-04-15",
        actualStartDate: "2025-03-20",
        actualEndDate: "2025-04-14",
        completionPercentage: 100,
      },
      {
        phaseNumber: 3,
        title: "Instalații sanitare",
        status: "in_progress" as const,
        plannedStartDate: "2025-04-15",
        plannedEndDate: "2025-05-10",
        actualStartDate: "2025-04-15",
        completionPercentage: 60,
      },
      {
        phaseNumber: 4,
        title: "Finisaje",
        status: "pending" as const,
        plannedStartDate: "2025-05-10",
        plannedEndDate: "2025-06-30",
        completionPercentage: 0,
      },
    ]

    const phaseIds: string[] = []

    for (const ph of phaseDefs) {
      const [phase] = await db
        .insert(renovationPhases)
        .values({ projectId: pid, supervisorId, ...ph })
        .returning({ id: renovationPhases.id })
      if (phase) phaseIds.push(phase.id)
    }

    // Tasks for phase 3
    if (phaseIds[2]) {
      const taskDefs = [
        {
          title: "Montaj țevi alimentare apă",
          taskType: "labor" as const,
          status: "done" as const,
          assignedTo: worker3Id,
          estimatedHours: "16",
          actualHours: "14",
          dueDate: "2025-04-25",
        },
        {
          title: "Montaj canalizare",
          taskType: "labor" as const,
          status: "in_progress" as const,
          assignedTo: worker3Id,
          estimatedHours: "12",
          dueDate: "2025-05-03",
        },
        {
          title: "Montaj obiecte sanitare",
          taskType: "labor" as const,
          status: "todo" as const,
          assignedTo: worker3Id,
          estimatedHours: "8",
          dueDate: "2025-05-10",
        },
      ]

      for (const t of taskDefs) {
        await db.insert(renovationTasks).values({ projectId: pid, phaseId: phaseIds[2], ...t })
      }
    }

    // Estimate for project 1
    const [estimate] = await db
      .insert(renovationEstimates)
      .values({
        projectId: pid,
        estimateNumber: "EST-2025-001",
        version: 1,
        status: "accepted" as const,
        validUntil: "2025-03-31",
        subtotal: "68907.56",
        discount: "0",
        vatRate: "19",
        vatAmount: "13092.44",
        total: "82000",
        currency: "RON",
        preparedBy: managerId,
        approvedBy: managerId,
        approvedAt: new Date("2025-02-20"),
      })
      .returning({ id: renovationEstimates.id })

    if (estimate) {
      await db.insert(renovationEstimateLines).values([
        {
          estimateId: estimate.id,
          lineNumber: 1,
          category: "labor" as const,
          description: "Manoperă demolare și pregătire",
          unit: "mp",
          quantity: "120",
          unitPrice: "25",
          totalPrice: "3000",
        },
        {
          estimateId: estimate.id,
          lineNumber: 2,
          category: "materials" as const,
          description: "Materiale electrice — cablu, prize, întrerupătoare",
          unit: "lot",
          quantity: "1",
          unitPrice: "8500",
          totalPrice: "8500",
        },
        {
          estimateId: estimate.id,
          lineNumber: 3,
          category: "labor" as const,
          description: "Manoperă instalații electrice",
          unit: "ore",
          quantity: "80",
          unitPrice: "75",
          totalPrice: "6000",
        },
        {
          estimateId: estimate.id,
          lineNumber: 4,
          category: "materials" as const,
          description: "Materiale sanitare — țevi, fitinguri, obiecte sanitare",
          unit: "lot",
          quantity: "1",
          unitPrice: "18000",
          totalPrice: "18000",
        },
        {
          estimateId: estimate.id,
          lineNumber: 5,
          category: "labor" as const,
          description: "Manoperă instalații sanitare",
          unit: "ore",
          quantity: "60",
          unitPrice: "80",
          totalPrice: "4800",
        },
        {
          estimateId: estimate.id,
          lineNumber: 6,
          category: "materials" as const,
          description: "Faianță și gresie — 120mp",
          unit: "mp",
          quantity: "120",
          unitPrice: "85",
          totalPrice: "10200",
        },
        {
          estimateId: estimate.id,
          lineNumber: 7,
          category: "labor" as const,
          description: "Manoperă finisaje — zugrăveli, gips, șpaclu",
          unit: "mp",
          quantity: "280",
          unitPrice: "30",
          totalPrice: "8400",
        },
        {
          estimateId: estimate.id,
          lineNumber: 8,
          category: "overhead" as const,
          description: "Transport și logistică",
          unit: "lot",
          quantity: "1",
          unitPrice: "3000",
          totalPrice: "3000",
        },
        {
          estimateId: estimate.id,
          lineNumber: 9,
          category: "overhead" as const,
          description: "Management de proiect",
          unit: "ore",
          quantity: "40",
          unitPrice: "120",
          totalPrice: "4800",
        },
        {
          estimateId: estimate.id,
          lineNumber: 10,
          category: "materials" as const,
          description: "Vopsele și tencuieli",
          unit: "lot",
          quantity: "1",
          unitPrice: "3207.56",
          totalPrice: "3207.56",
        },
      ])

      // Contract for project 1
      await db.insert(renovationContracts).values({
        projectId: pid,
        estimateId: estimate.id,
        contractNumber: "CONTR-2025-001",
        status: "active" as const,
        contractValue: "82000",
        currency: "RON",
        startDate: "2025-03-05",
        endDate: "2025-06-30",
        signedByClientAt: new Date("2025-02-25"),
        signedByCompanyAt: new Date("2025-02-25"),
        paymentTerms: { advance: 30, milestone1: 30, milestone2: 20, final: 20 },
      })
    }

    // Site reports for project 1
    const siteReportDates = ["2025-04-28", "2025-04-29", "2025-04-30"]
    for (const reportDate of siteReportDates) {
      await db.insert(renovationSiteReports).values({
        projectId: pid,
        phaseId: phaseIds[2],
        reportDate,
        reportType: "daily" as const,
        submittedBy: supervisorId,
        weatherConditions: "Înnorat, 18°C",
        workersOnSite: 3,
        workPerformed:
          "Montaj țevi alimentare apă în baie și bucătărie. Verificare etanșeitate conexiuni.",
        completionDelta: 5,
        clientVisible: true,
      })
    }

    // Material request for project 1
    const [matReq] = await db
      .insert(renovationMaterialRequests)
      .values({
        projectId: pid,
        phaseId: phaseIds[2],
        requestedBy: supervisorId,
        status: "approved" as const,
        neededByDate: "2025-05-05",
        notes: "Necesar materiale sanitare pentru faza 3 - etapa finală",
      })
      .returning({ id: renovationMaterialRequests.id })

    if (matReq) {
      await db.insert(renovationMaterialRequestLines).values([
        {
          requestId: matReq.id,
          description: "Vas WC suspendat Geberit",
          unit: "buc",
          quantityRequested: "2",
          quantityApproved: "2",
          estimatedUnitPrice: "850",
        },
        {
          requestId: matReq.id,
          description: "Cadă baie 170x70",
          unit: "buc",
          quantityRequested: "1",
          quantityApproved: "1",
          estimatedUnitPrice: "1200",
        },
        {
          requestId: matReq.id,
          description: "Chiuvetă inox dublu",
          unit: "buc",
          quantityRequested: "1",
          quantityApproved: "1",
          estimatedUnitPrice: "680",
        },
        {
          requestId: matReq.id,
          description: "Baterie monocomandă baie",
          unit: "buc",
          quantityRequested: "3",
          quantityApproved: "3",
          estimatedUnitPrice: "320",
        },
      ])
    }
  }

  // ── Estimate for project 2 (contracted) ────────────────────────────────────
  if (projectIds[1]) {
    const pid = projectIds[1]

    const [estimate2] = await db
      .insert(renovationEstimates)
      .values({
        projectId: pid,
        estimateNumber: "EST-2025-002",
        version: 1,
        status: "accepted" as const,
        validUntil: "2025-06-30",
        subtotal: "117647.06",
        discount: "0",
        vatRate: "19",
        vatAmount: "22352.94",
        total: "140000",
        currency: "RON",
        preparedBy: managerId,
      })
      .returning({ id: renovationEstimates.id })

    if (estimate2) {
      await db.insert(renovationContracts).values({
        projectId: pid,
        estimateId: estimate2.id,
        contractNumber: "CONTR-2025-002",
        status: "signed" as const,
        contractValue: "140000",
        currency: "RON",
        startDate: "2025-07-01",
        endDate: "2025-09-30",
        signedByClientAt: new Date("2025-06-15"),
        signedByCompanyAt: new Date("2025-06-15"),
        paymentTerms: { advance: 25, milestone1: 35, milestone2: 25, final: 15 },
      })
    }
  }

  console.log(`    ✓ Renovation projects: ${projectIds.length}`)
  return { projectIds }
}
