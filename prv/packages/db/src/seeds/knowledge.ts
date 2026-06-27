// Seed: knowledge articles with read progress
import { db } from "../client"
import { knowledgeArticles, articleReadProgress } from "../schema/knowledge"

export interface KnowledgeSeedResult {
  articleIds: string[]
}

export async function seedKnowledge(opts: {
  companyId: string
  managerId: string
  supervisorId: string
  workerIds: string[]
}): Promise<KnowledgeSeedResult> {
  console.log("  → Seeding knowledge base...")

  const { companyId, managerId, supervisorId, workerIds } = opts
  const [worker1Id, worker2Id, worker3Id] = workerIds
  if (!worker1Id || !worker2Id || !worker3Id) {
    throw new Error("seed requires at least 3 worker ids")
  }

  const articleDefs = [
    {
      authorUserId: managerId,
      title: "Procedură Protecția Muncii — Lucrări la Înălțime",
      type: "sop" as const,
      category: "operations" as const,
      content:
        "## Scop\nAceastă procedură stabilește cerințele minime de securitate pentru lucrările executate la înălțime mai mare de 2m...\n\n## Domeniu de aplicare\nToți angajații PRV Renovations care execută lucrări la înălțime.\n\n## Echipamente obligatorii\n- Centură de siguranță cu absorbitor de energie\n- Cască de protecție cu ham\n- Mănuși anti-alunecare\n\n## Pași obligatorii înainte de urcare\n1. Verificare integritate schele\n2. Verificare echipament individual\n3. Anunțare supraveghetor\n4. Marcaj zonă de lucru",
      version: "2.1",
      isPinned: true,
      readMinutes: 8,
      views: 47,
    },
    {
      authorUserId: managerId,
      title: "Ghid Utilizare PRV — Rapoarte de Șantier",
      type: "guide" as const,
      category: "operations" as const,
      content:
        "## Introducere\nRapoartele de șantier sunt documentele zilnice prin care supervizorul înregistrează activitatea echipei...\n\n## Completare raport zilnic\n1. Deschide PRV → Renovări → Proiect → Rapoarte\n2. Apasă butonul + Raport Nou\n3. Completează câmpurile obligatorii: data, nr. muncitori, lucrări efectuate\n4. Atașează fotografii\n5. Marchează vizibilitate client dacă e cazul",
      version: "1.0",
      isPinned: false,
      readMinutes: 5,
      views: 23,
    },
    {
      authorUserId: managerId,
      title: "Politică Utilizare Vehicule de Serviciu",
      type: "policy" as const,
      category: "hr" as const,
      content:
        "## Scop\nAceastă politică reglementează utilizarea vehiculelor din parcul auto PRV Renovations.\n\n## Reguli generale\n- Vehiculele se utilizează exclusiv în scop profesional\n- Jurnalul de bord se completează zilnic\n- Alimentarea se face exclusiv cu card de combustibil PRV\n- Defecțiunile se raportează imediat supervizorului\n\n## Interdicții\n- Utilizare personală fără aprobare scrisă\n- Conducere sub influența alcoolului\n- Transport persoane neautorizate",
      version: "1.2",
      isPinned: false,
      readMinutes: 6,
      views: 35,
    },
    {
      authorUserId: managerId,
      title: "FAQ — Cereri de Materiale și Aprovizionare",
      type: "faq" as const,
      category: "procurement" as const,
      content:
        "## Întrebări frecvente\n\n**Cine poate crea o cerere de materiale?**\nOrice angajat cu rol de Supraveghetor sau mai sus.\n\n**Care este termenul de aprobare?**\nCererile sunt aprobate în maxim 48h de supraveghetor și 72h de manager.\n\n**Cum urmăresc statusul cererii?**\nPRV → Procurare → Cereri Materiale → Cererile mele.\n\n**Pot adăuga materiale după trimitere?**\nNu. Trebuie creată o cerere nouă suplimentară.",
      version: "1.0",
      isPinned: false,
      readMinutes: 4,
      views: 19,
    },
    {
      authorUserId: managerId,
      title: "Procedură Recepție și Inventariere Materiale",
      type: "sop" as const,
      category: "procurement" as const,
      content:
        "## Scop\nStabilește procesul de recepție, verificare și inventariere a materialelor achiziționate.\n\n## Pași recepție\n1. Verifică bonul de livrare față de comanda de achiziție\n2. Numără și verifică integritatea fiecărui articol\n3. Semnează avizul doar după verificare completă\n4. Introduce materialele în sistem PRV\n5. Arhivează documentele fizice",
      version: "1.1",
      isPinned: false,
      readMinutes: 7,
      views: 28,
    },
    {
      authorUserId: managerId,
      title: "Ghid Completare Pontaj și Evidență Ore",
      type: "guide" as const,
      category: "hr" as const,
      content:
        "## Pontaj zilnic\nFiecare angajat trebuie să înregistreze orele lucrate zilnic în PRV.\n\n## Cum se face pontajul\n1. PRV → Prezență → Marcare prezentă\n2. La începerea lucrului: Clock In\n3. La terminare: Clock Out\n4. Verifică că orele sunt corecte\n\n## Ore suplimentare\nOrele suplimentare se înregistrează separat și necesită aprobare de manager.",
      version: "1.0",
      isPinned: true,
      readMinutes: 4,
      views: 62,
    },
  ]

  const articleIds: string[] = []

  for (const a of articleDefs) {
    const [record] = await db
      .insert(knowledgeArticles)
      .values({ companyId, ...a })
      .returning({ id: knowledgeArticles.id })
    if (record) articleIds.push(record.id)
  }

  // ── Read progress ─────────────────────────────────────────────────────────
  const allUsers = [managerId, supervisorId, worker1Id, worker2Id, worker3Id]

  if (articleIds[0]) {
    // PSI article — all read it
    for (const userId of allUsers) {
      await db
        .insert(articleReadProgress)
        .values({
          companyId,
          articleId: articleIds[0],
          userId,
          progressPct: 100,
          lastReadAt: new Date("2025-04-10"),
        })
        .onConflictDoNothing()
    }
  }

  if (articleIds[2]) {
    // Vehicle policy — supervisor + workers read it
    const readers = [supervisorId, worker1Id, worker2Id, worker3Id]
    for (const userId of readers) {
      await db
        .insert(articleReadProgress)
        .values({
          companyId,
          articleId: articleIds[2],
          userId,
          progressPct: 100,
          lastReadAt: new Date("2025-04-05"),
        })
        .onConflictDoNothing()
    }
  }

  if (articleIds[5]) {
    // Pontaj guide — partial read by workers
    for (const userId of [worker1Id, worker2Id, worker3Id]) {
      await db
        .insert(articleReadProgress)
        .values({
          companyId,
          articleId: articleIds[5],
          userId,
          progressPct: 75,
          lastReadAt: new Date("2025-05-02"),
        })
        .onConflictDoNothing()
    }
  }

  console.log(`    ✓ Knowledge articles: ${articleIds.length}`)
  return { articleIds }
}
