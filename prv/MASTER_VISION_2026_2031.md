# PRV — COMPANY OPERATING SYSTEM
## Viziunea Strategică Completă · 2026–2031
**Document**: Master Vision v1.0
**Status**: APROBAT — 7 Iunie 2026
**Scop**: Planificare strategică 3–5 ani
**Continuă**: PRODUCT_VISION.md · PLATFORM_MODULE_MAP.md · IMPLEMENTATION_ROADMAP_PART1-2.md

> *"Nu construim software. Construim sistemul de operare al companiei tale."*

---

## PRINCIPIU FUNDAMENTAL

```
EXTINDE CEEA CE EXISTĂ.
NU DISTRUGE CEEA CE EXISTĂ.
CONSTRUIEȘTE PESTE FUNDAȚIA ACTUALĂ.
```

Acest document NU modifică roadmap-ul aprobat (Faze 0–25, 145 săptămâni).
Descrie expansiunea care urmează după finalizarea roadmap-ului existent.
Implementarea oricărei funcționalități din acest document necesită aprobare explicită separată.

---

## CUPRINS

1. [Declarația de Viziune](#1-declaratia-de-viziune)
2. [Filozofia Platformei](#2-filozofia-platformei)
3. [Arhitectura la Maturitate](#3-arhitectura-la-maturitate)
4. [Cele Trei Orizonturi](#4-cele-trei-orizonturi)
5. [Capabilități Core — Viziunea la Maturitate](#5-capabilitati-core--viziunea-la-maturitate)
6. [Temele Transversale](#6-temele-transversale)
7. [Strategia de Industrie](#7-strategia-de-industrie)
8. [Portalele — Ecosistemul Extern](#8-portalele--ecosistemul-extern)
9. [Evoluția Modelului de Business](#9-evolutia-modelului-de-business)
10. [Poziționarea Competitivă](#10-pozitionarea-competitiva)
11. [Metricile de Succes](#11-metricile-de-succes)

---

## 1. DECLARAȚIA DE VIZIUNE

### Ce este PRV în 2031

**PRV este sistemul de operare al companiei tale.**

Nu un CRM. Nu un ERP. Nu un software de construcții. Nu un tool de project management.

PRV este locul unde se naște o afacere dimineața și unde se culcă seara — de la devizul scris pe șantier la factura trimisă clientului, de la cererea de concediu a unui angajat la raportul de profit al CEO-ului, de la work order-ul unui tehnician de teren la oferta trimisă unui client din Bruxelles.

### Ambiția în 3 propoziții

1. **Să înlocuiască 8–10 software-uri separate** pe care o companie le folosește astăzi în mod fragmentat, cu un singur ecosistem integrat.

2. **Să servească orice tip de companie** — de la firme de renovări la distribuitori B2B, de la companii de curățenie la consultanți — printr-o arhitectură modulară care se adaptează la industrie, nu invers.

3. **Să aducă designul și experiența unui produs Apple** în segmentul enterprise/ERP — un sector unde interfețele urâte, fluxurile confuze și aplicațiile mobile inutilizabile sunt standarde acceptate.

### Competitorii pe care PRV îi înlocuiește (simultan)

```
Procore                 Construction Management
Autodesk Construction   BIM + Construction
Buildertrend            Home Builder Software
Odoo                    ERP + CRM + Commerce
Zoho One                All-in-one Business Suite
HubSpot                 CRM + Marketing
Monday.com              Project Management
ClickUp                 Task Management
Jobber                  Field Service Management
QuickBooks              Finance + Accounting
```

Niciun competitor nu acoperă toate aceste categorii cu calitate consistentă.
PRV cu expansiunea completă: acoperă 95%+ din funcționalitățile cumulate ale acestora.

### Ce înseamnă "Company Operating System"

Un operating system are trei proprietăți:

- **Kernel** — un nucleu care rulează indiferent de ce aplicație folosești
  (auth, permissions, audit, notifications, search)
- **Applications** — module care rulează pe kernel și se pot combina în orice configurație
  (CRM, Finance, Construction, HR)
- **Ecosystem** — un strat extern care extinde platforma
  (portale pentru clienți, furnizori, subcontractori; integrări; marketplace)

PRV este construit exact astfel.
Kernel-ul există deja (Faze 0–5 ✅).
Aplicațiile se construiesc progresiv (Faze 6–25 ⚠️).
Ecosistemul vine ultima (Expansiune ❌ planificat).

---

## 2. FILOZOFIA PLATFORMEI

### 2.1 Principiul Datelor Unice

**Orice informație se introduce o singură dată și curge automat prin tot sistemul.**

Clientul creat în CRM este același client din Finance, din Construction, din Portal.
Angajatul din HR este același cu tehnicianul din Field Service, cu resursa din Projects, cu beneficiarul din Payroll.
Furnizorul din Suppliers este același furnizor din Procurement, din Finance, din Portal.

Nu există duplicare. Nu există re-introducere manuală. Nu există sincronizare între sisteme.

Aceasta nu este o proprietate opțională. Este o cerință arhitecturală fundamentală.

### 2.2 Principiul Loop-urilor Automate

Valoarea reală a PRV nu vine din faptul că are toate modulele — ci din faptul că modulele **formează cicluri de valoare automate**.

```
LOOP 1 — Ciclul Comercial (CRM → Finance)
  Lead → Calificare → Deviz/Ofertă → Aprobare internă →
  → Trimis client → Acceptat → Proiect creat automat →
  → Avansuri facturate automat → Lucrare completă →
  → Factură finală → Plată → Cash flow actualizat

LOOP 2 — Ciclul Operațional (Projects → Resources → Finance)
  Proiect creat → Faze planificate → Echipă alocată →
  → Materiale comandate (Procurement auto) → Livrare confirmată →
  → Cost actualizat în deviz → Variație detectată → Alert CEO →
  → Buget ajustat → Profitabilitate recalculată

LOOP 3 — Ciclul de Teren (Field Service → Finance)
  Work Order creat din CRM → Tehnician alocat automat →
  → Plecat din baza (GPS confirmat) → Ajuns la client →
  → Lucrare executată → Raport completat pe telefon →
  → Client semnează digital → Factură generată instant →
  → Trimisă pe email → Plată online → Confirmat în Finance

LOOP 4 — Ciclul HR (Workforce → Projects → Finance)
  Angajat pontează intrare (GPS + biometric) →
  → Ore calculate automat → Asociate la project →
  → Cost ore actualizat în project budget →
  → Supraalocări detectate → Alert Team Lead →
  → Payroll calculat lunar automat din pontaj
```

Fiecare loop elimină muncă manuală, reduce erorile și creează vizibilitate în timp real.

### 2.3 Principiul Rolului Corect

**PRV nu arată tuturor același lucru.**

- Tehnicianul de teren vede work order-ul, ruta GPS și câmpurile din service report.
- Team Lead-ul vede echipa, pontajele și taskurile.
- Project Manager-ul vede bugetul, fazele și riscurile.
- Finance Director-ul vede cashflow-ul, facturile și profitabilitatea.
- CEO-ul vede totul — comprimat în 60 de secunde.

Același produs. Experiențe complet diferite. Zero setup.

### 2.4 Principiul Mobilului Serios

**Mobile nu este "versiunea simplificată" a PRV.**

Mobile este platforma primară pentru:
- Tehnicieni de teren (work orders, GPS, service reports, semnături)
- Muncitori pe șantier (pontaj, materiale, site journal, incidente)
- Team Lead-i (aprobare taskuri, pontaje echipă, scurt update)

Web este platforma primară pentru:
- Management (planificare, devize, proiecte complexe, rapoarte)
- Finance Director (invoices, cash flow, rapoarte contabile)
- HR (contracte, recruitment, payroll)
- CEO (dashboard, analytics, comenzi strategice)

Ambele sunt la nivel de producție. Nicio funcționalitate critică nu există exclusiv pe web.

---

## 3. ARHITECTURA LA MATURITATE

### Modelul în Straturi

```
╔══════════════════════════════════════════════════════════════════════╗
║                    STRAT 5 — ECOSYSTEM                              ║
║   Client Portal · Supplier Portal · Subcontractor Portal            ║
║   Employee Self-Service · Developer API · Marketplace               ║
╠══════════════════════════════════════════════════════════════════════╣
║                    STRAT 4 — INTELLIGENCE                           ║
║   Analytics Engine · AI Platform · Command Center · Forecasting     ║
╠══════════════════════════════════════════════════════════════════════╣
║                    STRAT 3 — VERTICALE                              ║
║   Construction · Field Service · Commerce · Industry Configs        ║
╠══════════════════════════════════════════════════════════════════════╣
║                    STRAT 2 — MODULE BUSINESS                        ║
║   CRM · Finance · Projects · HR · Documents · Procurement           ║
║   Suppliers · Fleet · Tools · Knowledge · Learning · Safety         ║
╠══════════════════════════════════════════════════════════════════════╣
║                    STRAT 1 — KERNEL PLATFORM                        ║
║   Auth & Zero Trust · RBAC · Audit Log · Notifications              ║
║   Search · Automation Engine · Approval Engine · Compliance Engine  ║
║   Offline Sync · Multi-language · Multi-currency · Event Bus        ║
╚══════════════════════════════════════════════════════════════════════╝

Starea actuală:
  Stratul 1: 85% complet (Faze 0–5)
  Stratul 2: 40% complet (UI + mock data, Faze 6–22 parțiale)
  Stratul 3: 0% (planificat în expansiune)
  Stratul 4: 20% complet (intelligence routes, mock)
  Stratul 5: 0% (planificat)
```

### Harta Completă a Modulelor

```
KERNEL (Stratul 1) — Transversal, fără UI propriu
  ├── Auth & Security (Zero Trust, 7-gate chain)          ✅ COMPLET
  ├── RBAC & Scope Engine (19 roluri, 9 niveluri)         ✅ COMPLET
  ├── Audit Log Engine (imutabil, SHA-256 chained)        ✅ COMPLET
  ├── Notification Engine (in-app, push, email, SMS)      ⚠️ PARȚIAL
  ├── Search Engine (Typesense, semantic + keyword)        ⚠️ PARȚIAL
  ├── Event Bus (Inngest — inter-module events)           ⚠️ INFRA
  ├── Approval Engine (shared workflow library)            ⚠️ STUB
  ├── Compliance Engine (e-Factura RO, TVA BE, etc.)      ❌ PLANIFICAT
  ├── Automation Engine (triggers, conditions, actions)   ❌ PLANIFICAT
  ├── Offline Sync Engine (CRDT, queue, conflict res.)    ❌ PLANIFICAT
  ├── Multi-language (i18n framework, RO/EN/FR/NL)        ❌ PLANIFICAT
  └── Multi-currency (EUR/RON/GBP + FX engine)            ❌ PLANIFICAT

MODULE BUSINESS (Stratul 2) — UI + API, role-aware
  ├── CRM (Leads, Contacts, Quotes, Pipeline)             ⚠️ 50%
  ├── Finance (Invoices, Expenses, Cash Flow, Budget)     ⚠️ 50%
  ├── Projects (Tasks, Phases, Gantt, Kanban, Resources)  ⚠️ 45%
  ├── HR (People, Payroll, Contracts, Performance)        ⚠️ 40%
  ├── Attendance (Clock-in, Shifts, Leave, GPS)           ⚠️ 35%
  ├── Documents (Upload, Versions, Signatures)            ⚠️ 35%
  ├── Communication (DM, Channels, Mentions)              ⚠️ 5%
  ├── Notifications (Center, Preferences, Delivery)       ⚠️ 30%
  ├── Procurement (PO, GRN, 3-way match)                  ⚠️ 45%
  ├── Suppliers (Profiles, Contracts, Performance)        ⚠️ 50%
  ├── Fleet (Vehicles, Compliance, Trips)                 ⚠️ 50%
  ├── Tools (Registry, Checkout, Maintenance)             ⚠️ 50%
  ├── Knowledge Base (Articles, Policies, Search)         ⚠️ 45%
  ├── Learning Center (Courses, Certs, Progress)          ⚠️ 45%
  ├── Safety (Incidents, PTW, Checklists)                 ❌ 0%
  └── Shop (Catalog, Inventory, Orders, POS)              ❌ 5%

VERTICALE (Stratul 3) — Module industrie-specifice
  ├── Construction (BOQ, Devize, RFI, Site Journal)       ❌ PLANIFICAT
  ├── Field Service (Work Orders, Dispatch, GPS)          ❌ PLANIFICAT
  ├── Inventory & Warehouse (Multi-depozit, Mișcări)      ❌ PLANIFICAT
  └── B2B Commerce (Wholesale, Pricing Tiers)             ❌ PLANIFICAT

INTELLIGENCE (Stratul 4) — Analytics, AI, Command
  ├── Analytics Engine (KPIs, BI, Reports, Forecast)     ⚠️ 20%
  ├── AI Platform (Assistant, Copilots, Insights)         ⚠️ 15%
  └── Command Center (Executive Cockpit, Health Score)    ⚠️ 25%

ECOSYSTEM (Stratul 5) — Extern, portale, marketplace
  ├── Client Portal                                        ❌ PLANIFICAT
  ├── Supplier Portal                                      ❌ PLANIFICAT
  ├── Subcontractor Portal                                 ❌ PLANIFICAT
  ├── Employee Self-Service                                ❌ PLANIFICAT
  ├── Public API + Developer Portal                        ⚠️ 20%
  └── Marketplace                                          ❌ PLANIFICAT
```

---

## 4. CELE TREI ORIZONTURI

### Orizontul 1 — "Funcționează" (An 1 · Săpt. 1–52)

**Tema**: Finalizarea a ceea ce există. Tranziție de la prototip la produs real.

**Obiectivul central**: Fiecare modul existent trebuie să funcționeze cu date reale.
Nu mock data. Nu placeholder. Funcțional complet, conectat la Supabase,
cu RLS activ, cu PDF generation, cu push notifications reale.

**Ce se livrează**:
- Toate rutele API trecute de la mock la Drizzle ORM real
- `packages/approval-engine` implementat complet
- Mobile app MVP funcțional (clock-in GPS, notifications, projects basic)
- PDF generation (invoices, payslips, devize de bază)
- Push notifications (APNs + FCM)
- E2E testing la ≥70% coverage (exit criteria Phase 7)
- Seed data real pentru companii demo
- Phase 9 Shop (catalog, inventory, orders) — de la 5% la 70%

**Ce NU se schimbă**:
- Arhitectura rămâne identică
- Roadmap-ul Fazelor 0–25 rămâne intact
- Nu se adaugă module noi din expansiune

**Definiția succesului**:
> PRV Renovations și PRV Projects pot folosi PRV zilnic ca unic software
> de operare, fără să mai aibă nevoie de Excel, WhatsApp sau facturat manual.
> CEO-ul poate vedea situația companiei în 60 de secunde.

---

### Orizontul 2 — "Câștigă" (Ani 2–3 · Săpt. 53–156)

**Tema**: Verticalizare și diferențiere competitivă.
PRV devine cel mai bun software pentru companiile de construcții și servicii din România și Belgia.

**Obiectivul central**: Adaugă capacitățile care fac PRV de neînlocuit pentru industria
construcțiilor și serviciilor de teren. Integrează compliance-ul fiscal.
Lansează primii clienți externi.

**Marile trei livrabile**:

**A — Construction Module**
PRV acoperă complet ciclul de viață al unui proiect de construcții/renovări:
de la deviz inițial la decontul final.
Devize, BOQ, RFI, jurnal de șantier, subcontractori, cost control.
Aceasta este identitatea de business a PRV și cel mai mare avantaj față de orice competitor generic.

**B — Field Service Module**
Tehnicianul de teren cu telefonul în mână trebuie să poată:
primi work order → naviga la client → completa raportul → obține semnătura → genera factura.
Totul offline dacă e nevoie, sync când redevine online.

**C — Compliance Romania + Belgia**
e-Factura ANAF, SAF-T, TVA belgiană, TVA intracomunitar.
Cerințe legale obligatorii. Companiile care adoptă PRV au nevoie de compliance din prima zi.

**Definiția succesului**:
> O companie de renovări din București sau o firmă de servicii tehnice din Bruxelles
> poate înlocui complet Procore + Jobber + QuickBooks + Excel cu PRV.
> Și poate face asta în 2 zile de onboarding.

---

### Orizontul 3 — "Scalează" (Ani 4–5 · Săpt. 157–239)

**Tema**: Platformă SaaS internațională. Ecosistem de parteneri. AI ca diferențiator primar.

**Obiectivul central**: PRV devine o platformă pe care alte companii o adoptă ca SaaS,
pe care developerii construiesc extensii, și pe care AI-ul transformă fiecare workflow
în ceva mai inteligent decât suma pieselor.

**Marile trei piloni**:

**A — SaaS Platform**
Orice companie din lume poate semna pe prv.io, alege un plan, configura industria și țara,
și fi operațional în 30 de minute. Billing automat, onboarding ghidat de AI, support tier-based.

**B — Marketplace & Ecosystem**
Developerii pot construi extensii pe care le vând prin PRV Marketplace.
Partenerii de implementare pot oferi servicii de onboarding și customizare.
PRV devine o platformă, nu doar un produs.

**C — AI ca Core Differentiator**
Nu "AI button" undeva în interfață.
AI woven în fiecare workflow: devize generate din descriere text, rapoarte de teren
completate automat, briefing CEO la 7:00, anomalii financiare detectate înainte să devină probleme.

**Definiția succesului**:
> PRV are 2,000+ companii plătitoare în 5+ țări.
> Ecosystem de 50+ parteneri și 100+ extensii în marketplace.
> Niciun competitor nu oferă o platformă similară ca funcționalitate, design și AI integration.

---

## 5. CAPABILITĂȚI CORE — VIZIUNEA LA MATURITATE

### 5.1 Construction Management

**Starea actuală**: Absent. Projects module există (45%) fără nimic construction-specific.

**Ciclul complet al unui proiect de construcții în PRV**:

```
1. DEVIZ INITIAL
   Clientul solicită ofertă (din CRM) →
   PM deschide Deviz Editor →
   Selectează template (tip lucrare + dimensiuni) →
   AI propune articole standard + prețuri istorice →
   PM ajustează → Deviz finalizat →
   Conversie automată în Ofertă CRM →
   Client semnează digital din Portal

2. PLANIFICARE PROIECT
   Proiect creat automat din ofertă acceptată →
   Faze definite (Demolare / Instalații / Finisaje / Recepție) →
   Echipă alocată din HR module →
   Materiale planificate → auto-create Purchase Requests →
   Subcontractori invitați pe Portal →
   Program generat (Gantt)

3. EXECUȚIE ÎN TEREN
   Muncitori pontează la șantier (GPS verificat) →
   Site Journal actualizat zilnic (ce s-a lucrat, cine, foto) →
   RFI creat dacă apare neclaritate →
   Materiale recepționate (GRN scan QR pe tabletă) →
   Variații față de deviz flagate automat →
   Progress photos uploadate din mobile

4. CONTROL FINANCIAR LIVE
   Cost real vs. deviz: dashboard actualizat zilnic →
   Variație > 10%: alert automat PM + CFO →
   Avansuri facturate automat per faze finalizate →
   Subcontractori facturează din Portal →
   3-way match automat (PO + GRN + factură furnizor)

5. FINALIZARE
   Recepție: checklist per fază →
   Client semnează digital recepția →
   Factură finală generată automat →
   Retenție calculată automat →
   Post-project analytics: profitabilitate reală vs. estimată →
   Template actualizat cu prețuri reale pentru devize viitoare
```

**Funcționalitățile cheie ale Construction Module**:

**Deviz Engine**
Nu un Excel glorificat, ci un editor structurat:
- Capitole → subcapitole → articole → variante
- Cantități și unități de măsură cu validare
- Prețuri unitare din lista internă + AI suggestion din historical
- Calcul automat total + TVA + adaos comercial
- Comparator: deviz propriu vs. deviz furnizor (identifică discrepanțe)
- Versioning (v1, v2, v3 — cu diff vizualizat)
- Export PDF A4, branded, semnat digital

**BOQ (Bill of Quantities)**
- Import din template standard (CSDN, NCS românești)
- Legare BOQ la Procurement (fiecare linie BOQ → purchase request automată)
- BOQ vs. Received: ce s-a comandat vs. ce a ajuns pe șantier

**RFI Management**
- Creat de oricine pe șantier (mobile)
- Alocat automat la proiectantul responsabil
- Deadline tracking cu escaladare
- Impact cost/timp evaluat și aprobat
- Arhivă completă per proiect (legal requirement în construcții)

**Site Journal**
- Dată, vreme, echipă prezentă (din Attendance data)
- Activități executate (text + foto)
- Materiale folosite (scad din stocul de pe șantier)
- Evenimente neașteptate (accidente, întârzieri, vizite)
- Semnat de responsabilul de șantier
- Export PDF pentru devize suplimentare sau dispute

**Subcontractor Management**
- Invitație pe portal (email link → cont separat, izolat)
- Primesc Work Packages vizibile numai lor
- Raportează progress din Portal
- Facturează din Portal (factura intră direct în Procurement 3-way match)
- Rating și performanță istorică

**Arhitectural**: Construction Module extinde Projects (Module 02), nu este un modul separat.
`project_type: 'renovation' | 'construction' | 'service' | 'consulting'`
Tab-uri adiționale contextuale în `/projects/[id]` când `type === 'construction'`.

---

### 5.2 Field Service

**Starea actuală**: Absent. Fleet (vehicles) și Tools (equipment) există parțial.

**Ciclul complet al unui Work Order în PRV**:

```
NAȘTEREA WORK ORDER-ULUI
  Sursă 1: Client sună → Operator creează WO din CRM
  Sursă 2: Client completează formularul din Client Portal
  Sursă 3: Contract recurring → WO generat automat lunar
  Sursă 4: Problemă raportată în proiect → WO creat din Projects

ALOCARE INTELIGENTĂ
  Dispatch Board → sistem sugerează tehnicianul optimal
  (proxim + disponibil + skill match) →
  Dispatcher confirmă sau reasignează →
  Tehnician primește notificare push pe telefon

EXECUȚIE ÎN TEREN (100% mobile, 100% offline-capable)
  Tehnician acceptă WO → Navigație start
  GPS tracking activ (cu consimțământ explicit + GDPR compliant)
  Ajuns la client: "Pornesc lucrul" button
  Completează Service Report (câmpuri pre-populate din WO)
  Fotografiază: înainte + după
  Notează materialele folosite
  Notează timpii (ore lucrate, deplasare)

FINALIZARE PE TEREN
  Preview Service Report generat pe telefon
  Client citește + semnează pe ecranul tehnicianului
  WO → status COMPLETED

AUTOMATIZARE POST-COMPLETARE
  Factură generată automat (materiale + ore + deplasare)
  Trimisă pe email clientului sau disponibilă în Client Portal
  Stocul actualizat (materialele folosite scăzute)
  Costul WO calculat și alocat la proiect
  Feedback request trimis clientului (rating 1–5)
```

**Funcționalitățile cheie**:

**Dispatch Board**
- Calendar view pe tehnicieni (ziua curentă + 3 zile)
- Map view: unde sunt toți tehnicienii acum (GPS live)
- Drag-and-drop alocare WO → tehnician → time slot
- Color coding: disponibil / en-route / la client / în deplasare
- Alert: WO nealocat cu < 2h înainte de time slot

**GPS Tracking — cu respect față de angajat**
- Tracking ACTIV numai în orele de program (auto-off la ora de ieșire)
- Consent explicit semnat la onboarding
- Angajatul vede propria traiectorie din app
- GDPR compliant complet

**Service Report Engine**
- Template configurabil per tip de serviciu
- Pre-populate automat: client, adresă, technician, materiale planificate
- Câmpuri custom per tip serviciu
- Signature capture nativă (canvas multi-touch)
- Generare PDF instant pe telefon (fără internet dacă e necesar)
- Arhivat în Documents cu metadata WO

**SLA Management**
- Timp de răspuns contractat per client
- Alert dacă WO nu e alocat în 1h de la creare
- Escaladare automată la manager dacă SLA expiră
- SLA analytics: % WO-uri respectate per perioadă

---

### 5.3 ERP Operațional

**Starea actuală**: Fragmente — Procurement (45%), Suppliers (50%), Fleet (50%), Tools (50%).
Fără Inventory sau Warehouse.

**Cele cinci piese ale ERP-ului PRV**:

**Procurement complet**
- Purchase Request: oricine poate solicita (cu approval chain configurabil)
- Purchase Order: generat din PR, trimis furnizorului direct din PRV
- Goods Receipt Note (GRN): recepție livrare (scan QR/barcode sau manual)
- 3-way match automat: PO ↔ GRN ↔ Factură furnizor
- Purchase analytics: spend per categorie, per furnizor, tendințe, economii

**Inventory & Warehouse**
- Multi-depozit / multi-locație (birou central, depozit, fiecare șantier)
- Mișcări de stoc: intrare (GRN), ieșire (WO / consum șantier), transfer
- Valorizare: FIFO, LIFO, cost mediu ponderat
- Reorder automation: stoc sub prag → Purchase Request automată
- Barcode / QR: generare la înregistrare, scan la mișcări

**Supplier Management extins**
- Profil 360°: date contact, contracte, certificate, istoric comenzi, rating
- Evaluare furnizor: calitate / preț / livrare (scoreboard)
- Supplier Portal: confirmă PO, uploadează factura, vede plăți
- Contracte: termeni, prețuri contractate, volume minime, penalizări
- Preferred suppliers per categorie de produs

**Asset Management**
- Orice asset al companiei: IT, licențe software, utilaje, vehicule, imobile
- Ciclu de viață: achiziție → utilizare → mentenanță → depreciere → casare
- Depreciere automată (linear sau degresiv) cu integrare Finance
- Garanții și suport: reminder la expirare
- Cost per asset per proiect

**Operations (Stores/Locations) extins**
- Fiecare locație ca entitate cu KPIs proprii
- Transfer resurse între locații (angajați, echipamente, stocuri)
- Manager locație cu scope limitat la propria locație

---

### 5.4 CRM & Sales

**Starea actuală**: Clients (50%) + Quotes (50%). Lead pipeline absent.

**Ciclul complet CRM PRV**:

```
ATRAGERE
  Lead din: formular site / apel / recomandare / campanie / eveniment
  Lead creat în PRV (manual sau automat din form)
  Scored automat de AI: probabilitate conversie bazat pe:
    - Industrie + dimensiune companie client
    - Sursa leadului
    - Similar cu profilul clienților câștigați anterior
    - Engagement cu oferte anterioare

CALIFICARE
  Kanban pipeline: New → Contacted → Qualified → Proposal → Negotiation → Won/Lost
  Activities trackate: apeluri, emailuri, întâlniri
  AI: "Pe baza profilului, sugerez template 'Baie Standard' cu
       ajustare preț la metru pătrat"

OFERTARE
  Deviz creat din CRM (modul Construction linkuit)
  sau Ofertă standard (produse/servicii din catalog)
  Tracking: deschis? / când? / de câte ori?
  Reminder automat dacă nu s-a răspuns în 3 zile

CONVERSIE
  Client acceptă → Project creat automat
  Contract generat din template (Document Center)
  Semnat digital de ambele părți
  Avans facturat automat dacă e specificat în contract

RETENȚIE
  Post-proiect: feedback automat (NPS)
  Istoric 360°: toate proiectele, facturile, comunicările
  Oportunitate upsell detectată de AI:
    "Clientul X a finalizat renovarea băii — probabilitate 73%
    pentru renovarea bucătăriei în 6–18 luni"
```

**Customer Profile 360°** — inima CRM-ului:
- Date contact + preferințe comunicare
- Toate proiectele (active și istorice)
- Toate facturile și statusul plăților (DSO per client)
- Toate comunicările (emailuri, apeluri loggate, notes)
- Toate documentele (contracte, devize, garanții)
- NPS score și feedback-uri
- Oportunități active
- Recomandări AI

---

### 5.5 Finance Platform

**Starea actuală**: Invoices (50%) + Expenses (50%). Cash flow, budgets, recurring — absente.

**PRV Finance este CFO-ul operațional al companiei** — vizibilitate financiară în timp real.
Nu software de contabilitate. Integrare nativă cu Xero/Sage/QuickBooks pentru contabilitate completă.

**Revenue Engine**
- Toate sursele de venituri: proiecte + shop + servicii + abonamente
- Recunoaștere venituri configurabilă
- Recurring invoices: abonamente de mentenanță, servicii periodice
- Multi-currency: factură în EUR, echivalent RON calculat la cursul zilei
- Pro-forma: documente non-fiscal înainte de confirmare

**Expense Management complet**
- Upload receipt → OCR AI → categorisit automat
- Cheltuieli per proiect: cost tracking detaliat
- Cheltuieli per angajat: deconturi, diurne, mileage
- Approval workflow configurabil
- Buget vs. actual: per departament, per proiect, per categorie

**Cash Flow Engine** (inima viziunii Finance)
- Cash flow real-time: sold curent + facturi de încasat - facturi de plătit
- Cash flow forecast 90 zile bazat pe historicul de plăți
- "La rata actuală, vei rămâne cu cash negativ pe 14 august dacă factura
  INV-0234 nu se încasează"
- Vizualizare Revolut-style: grafic smooth, drill-down pe orice zi
- Alertă automată: "cash buffer < 30 zile de costuri fixe"

**Budget Engine**
- Bugete anuale / trimestriale / lunare per departament
- Tracking real-time: buget aprobat / cheltuit / rămas / prognozat
- Variații automat flagate: cheltuieli > 110% buget → alert
- Re-forecast la 6 luni fără să modifici originalul

**Financial Compliance**
- e-Factura: generare XML ANAF, trimitere automată, tracking status
- SAF-T: generare fișier lunar
- TVA: declarație configurabilă (lunar/trimestrial)
- Reconciliere bancară: import extras → matching automat cu plăți

---

### 5.6 Commerce

**Starea actuală**: Shop (5%) — un workspace stub.

**Profilul A — Companie cu shop propriu (B2C)**:
Catalog online, coș, checkout, Stripe, livrări, retururi.
Integrat cu Inventory (stoc real-time) și Finance (facturare automată).

**Profilul B — Companie cu clienți business (B2B)**:
Prețuri diferite per client, volume discount, factură pe bază de comandă.
Clientul comandă din Portal, primește factură automat.

**Canalele de vânzare**:
- Web shop (Public App)
- Mobile app (iOS + Android)
- POS fizic (tabletă la punct de vânzare)
- Client Portal (comandă online autentificată, B2B)
- Sales agent (order taking prin app în vizita la client)

**B2B Commerce specifics**:
- Prețuri contractate per client
- Limite de credit per client
- Aprobare internă pentru comenzi > prag
- Delivery note + CMR auto-generate

---

### 5.7 Business Intelligence

**Starea actuală**: Intelligence module (20%) cu rute mock. Command Center (25%).

**PRV Intelligence** este contextul de business în care fiecare decizie este luată —
cu datele corecte, în formatul corect, la momentul corect, pentru rolul corect.

**Stratul 1 — Live Operations** (pentru management zilnic):
- KPI-uri live: revenue azi, echipe active, WO-uri în progress
- Alerts proactive: anomalii detectate automat
- "Pulse" al companiei: o singură pagină cu starea de azi
- Mobile-first: consultabil din telefon în 30 de secunde

**Stratul 2 — Executive Cockpit** (CEO, CFO, directori):
- 8-zone dashboard: Revenue | Costs | Projects | People | Clients | Operations | Compliance | AI Insights
- Trend analysis: luna aceasta vs. luna trecută vs. același trimestru an trecut
- Company Health Score (0–100): un singur număr pe 6 dimensiuni
- CEO 60-Second Rule: de la login la overview complet în sub 60 de secunde

**Stratul 3 — Analiza Profundă** (Finance Director, Operations Manager):
- Custom report builder: drag-and-drop dimensiuni + metrici
- 50+ pre-built reports
- Cross-module reports: "Profitabilitate per client" = Finance + CRM + Projects
- Schedule & deliver: raportul X trimis automat pe email
- Export: PDF branded, Excel, CSV

**Stratul 4 — Forecasting** (decizie strategică):
- Cash flow forecast 30/60/90 zile (actualizat zilnic)
- Resource forecast: cine va fi liber în 3 săptămâni
- Revenue forecast: pipeline CRM → probabilitate × valoare
- Construction cost forecast: cost-to-complete per proiect

**Construction-specific BI**:
- Cost variance per lucrare (deviz estimat vs. realizat)
- Marja per tip de lucrare (baie vs. bucătărie vs. apartament)
- Productivitate pe angajat per tip activitate
- Furnizori: preț vs. calitate vs. livrare (scoreboard)

---

## 6. TEMELE TRANSVERSALE

### 6.1 AI Everywhere

**Principiul**: AI nu este un modul. AI este o capacitate transversală prezentă în fiecare
modul ca un asistent contextual — nu ca o funcție separată.

**Nivelurile AI în PRV**:

```
Nivel 1 — AI Pasiv (Orizontul 2, toate modulele)
  AI observă și sugerează, dar nu acționează:
  - Autocomplete câmpuri bazat pe pattern
  - Detectare anomalii silențioasă
  - Sugestii de acțiuni contextuale

Nivel 2 — AI Activ (Orizontul 2-3, module specifice)
  AI acționează la cerere:
  - "Generează deviz pentru renovare baie 8mp, standard mediu, București"
  - "Completează raportul de service din istoricul WO-ului similar"
  - "Scrie emailul de follow-up pentru oferta trimisă acum 5 zile"
  - "Estimează data de finalizare a proiectului la velocity curent"

Nivel 3 — AI Proactiv (Orizontul 3)
  AI acționează fără să fie întrebat:
  - CEO briefing generat automat la 7:00
  - Anomalie detectată → tichet creat → notificare trimisă (fără intervenție umană)
  - Contract expirat → draft scrisoare de reînnoire → spre aprobare
  - Factură restantă > 45 zile → draft email final → spre trimitere
```

**AI Governance** — ce nu poate face AI-ul niciodată fără aprobare umană:
- Trimite comunicări financiare (facturi, notificări plată)
- Modifica prețuri sau termene contractuale
- Angaja sau concedia angajați
- Executa transferuri financiare
- Modifica date contabile

**Cost Tracking AI**: fiecare companie vede consumul de tokens și costul asociat per modul.

### 6.2 Mobile-First, Offline-Ready

**Principiul**: Dacă un muncitor de pe șantier nu poate folosi funcționalitatea fără internet,
acea funcționalitate nu este finisată.

**Modulele obligatoriu offline-capable**:
1. Attendance (clock-in/out — GPS buffered, sync când revine online)
2. Work Orders (open, execute, complete service report, capture signature)
3. Site Journal (adaugă intrare, fotografii — queue pentru upload)
4. Procurement receipt (GRN scan — sync când revine online)
5. Tools checkout (scan QR de ieșire/intrare unelte)

**Arhitectura offline**:
- TanStack Query pentru optimistic updates (deja standard în codebase)
- Dexie.js (IndexedDB wrapper) pentru local storage persistent
- Operation Queue: fiecare write operation locală e queued cu timestamp + idempotency key
- Sync Engine: când revine conectivitate, queue se procesează în ordine
- Visual indicator discret: "Offline — X operații în așteptare"

**Experiența mobilă dincolo de funcționalitate**:
- Swipe gestures native
- Haptic feedback pe toate acțiunile critice
- Face ID / biometric pentru re-auth pe operații sensibile
- Dynamic Island: work order activ / drum spre client / SLA countdown
- Widget home screen: "2 WO-uri astăzi / Cash azi: €12,400"
- Shortcuts iOS: "Pornesc lucrul" direct din lock screen

### 6.3 Compliance by Design

**Principiul**: Complianța nu se adaugă ulterior. Se construiește în nucleul Finance
și Documents de la început.

**Romania — pilonii fiscali**:

```
e-Factura (obligatorie legal)
  - Orice factură B2B în Romania → transmitere XML la ANAF
  - PRV generează XML UBL/CII conform specificației ANAF
  - Trimitere automată la SPV
  - Status tracking: Trimis → Validat → Acceptat / Respins cu cod eroare
  - Retry automat pentru erori temporare
  - Arhivare în Documents cu timestamp ANAF confirmat

SAF-T (Standard Audit File for Tax)
  - Fișier D394 generat lunar (sau la cerere pentru control ANAF)
  - Toate tranzacțiile financiare din PRV mapate automat la structura SAF-T
  - Export din Finance module cu 2 click-uri

TVA România
  - Cote configurabile: 19% / 9% / 5% / 0%
  - TVA deductibil per categorie cheltuială
  - Declarație TVA D300 generată automat pentru import în SAGA/Ciel
```

**Belgia — pilonii fiscali**:

```
TVA belgiană
  - Cote: 21% / 12% / 6% / 0%
  - Configurabil per tip tranzacție
  - Facturare electronică în format UBL 2.1

TVA intracomunitar
  - VIES validation automat la crearea unui supplier / client din EU
  - EC Sales List (listing) generat trimestrial
  - Mențiune "Taxare inversă" automată pe facturi B2B EU
```

**Multi-country framework**:
Fiecare țară adăugată = un modul de configurare:
coduri fiscale, formate date, monedă, limbă.
România și Belgia sunt primele.
Structura permite adăugarea Germaniei, Franței, Olandei în câteva săptămâni fiecare.

### 6.4 Adaptabilitate Verticală

**Principiul**: PRV nu se reproiectează pentru fiecare industrie.
Configurarea platformei adaptează experiența.

**Mecanismul de adaptare** — la crearea contului:
1. **Industria primară** (construcții / servicii tehnice / retail / distribuție / consultanță / etc.)
2. **Țara** (Romania / Belgia / etc.)
3. **Dimensiunea** (1–10 / 11–50 / 51–200 / 200+)

Pe baza selecției:
- Modulele relevante activate implicit (restul ascunse, nu șterse)
- Terminologia ajustată ("Proiect" → "Lucrare" pentru construcții)
- Dashboards cu KPIs relevanți pentru industrie
- Templates pre-populate cu structuri tipice
- AI context calibrat la industrie

**Verticale suportate la maturitate**:

| Verticală | Module principale | Specificuri |
|---|---|---|
| Construcții / Renovări | Construction, Projects, Field Service, Procurement | BOQ, devize, RFI, șantiere |
| Servicii tehnice | Field Service, CRM, Finance, Fleet | Work orders, GPS, SLA |
| Retail / Comerț | Shop, Commerce, Inventory, Suppliers | POS, catalog, retururi |
| Distribuție B2B | B2B Commerce, Inventory, Procurement | Prețuri per client, volume |
| Consultanță | Projects, CRM, Finance, HR | Timesheets, billing per oră |
| HoReCa | Operations, Inventory, HR, Finance | Locații multiple, ture |
| Transport / Logistică | Fleet, Operations, Field Service | GPS, rute, documente CMR |

---

## 7. STRATEGIA DE INDUSTRIE

### Mișcarea de Go-to-Market: "Construcții First, Everything Else Follows"

**De ce Construcții ca verticală primară**:

1. PRV este deja în construcții — PRV Renovations și PRV Projects sunt clienții nativi.
   Cunoaștem problemele din interior.

2. Competitorii au probleme serioase în această verticală:
   - Procore: scump, complex, gândit pentru proiecte de 50M+, nu pentru firme de 10–50 angajați
   - Odoo: generic, UI proastă, mobil slab
   - Excel: 80% din firmele mici de construcții din România gestionează devize în Excel

3. România + Belgia sunt insuficient servite:
   - Procore nu are e-Factura RO nativă
   - Niciun software de construcții major nu are suport complet pentru TVA belgiană + intracomunitar
   - Piața: ~100,000 firme de construcții și renovări în România

4. Efectul de rețea al verticalei:
   - Firma de renovări → invită subcontractorii pe Portal PRV →
     aceștia descoperă PRV → unii devin clienți plătitori
   - Firma mare recomandă PRV furnizorilor → aceștia se înregistrează → viral growth

**Expansiunea verticală**:

```
An 1-2: Construcții + Renovări (RO + BE)
         ↓
An 3:   Servicii tehnice (HVAC, electricitate, instalații)
         ↓
An 3-4: Retail / Distribuție (materiale de construcții)
         ↓
An 4-5: Transport / Logistică
         ↓
An 5+:  Orice industrie cu fieldwork + operațiuni complexe
```

---

## 8. PORTALELE — ECOSISTEMUL EXTERN

**Principiul**: PRV extinde granițele companiei pentru a include stakeholderii externi
în același ecosistem.

### Client Portal

**Cine îl folosește**: Clienții finali ai companiei (persoane fizice sau juridice)

**Ce pot face**:
- Urmăresc progresul proiectului în timp real (faze, fotografii, taskuri)
- Aprobă faze (recepție intermediară cu semnătură digitală)
- Văd și descarcă documentele lor
- Văd și plătesc facturile online (Stripe payment)
- Acceptă ofertele noi (devize → semnătură → automatizare proiect)
- Comunică cu echipa (channel dedicat proiectului)
- Lasă feedback și rating

**Impact**: Transparență completă = clienți mai satisfăcuți, mai puține telefoane cu "unde ești?",
mai puțin timp pierdut de PM în status updates.

### Supplier Portal

**Cine îl folosește**: Furnizorii companiei

**Ce pot face**:
- Văd și confirmă Purchase Orders primite
- Uploadează invoice-urile (intră direct în 3-way match)
- Văd istoricul comenzilor și al plăților
- Actualizează date companie, certificate, termene
- Primesc notificări instant când un PO e creat

**Impact**: Elimină email-urile și apelurile telefonice pentru comenzi.
Procurement devine automat.

### Subcontractor Portal

**Cine îl folosește**: Subcontractorii pe care compania îi folosește pe șantiere

**Ce pot face**:
- Văd Work Packages alocate lor (și NUMAI lor — izolat complet)
- Raportează progress per WP
- Uploadează fotografii de pe teren
- Trimit facturi (intră în approval flow din Procurement)
- Văd statusul plăților lor
- Accesează planurile și documentele relevante

**Izolare de securitate**: Subcontractorul nu vede niciodată costul total al proiectului,
identitatea altor subcontractori sau datele interne ale companiei.

### Employee Self-Service Portal

**Cine îl folosește**: Angajații, de pe dispozitivele personale

**Ce pot face**:
- Văd și aprobă fișele de pontaj
- Solicită concediu (cu vizibilitate pe cine mai e în concediu)
- Descarcă fluturașul de salariu
- Văd documentele HR proprii (contract, acte adiționale)
- Urmăresc cursurile și certificările
- Văd programul de ture

---

## 9. EVOLUȚIA MODELULUI DE BUSINESS

### Faza 1 — Internal Tool (An 1)

PRV funcționează ca software intern pentru PRV Renovations și PRV Projects.
- Zero revenue SaaS
- Valoare: eficiență operațională, reducere costuri (Excel, tool-uri separate)
- Obiectiv: validare funcționalitate în condiții reale

### Faza 2 — Early SaaS (An 2-3)

PRV se deschide pentru primii clienți externi (beta privat).
- 20–50 companii beta, selectate
- Pricing simplu, per companie
- Feedback loop intens pentru product-market fit
- Focus: companii de construcții și servicii tehnice din RO + BE

**Modelul de pricing propus**:

| Plan | Target | Preț estimat |
|---|---|---|
| Starter | 1–10 angajați | €79/lună / companie |
| Growth | 11–50 angajați | €199/lună / companie |
| Professional | 51–200 angajați | €499/lună / companie |
| Enterprise | 200+ angajați | Negociat |

### Faza 3 — SaaS Scalabil (An 3-4)

- Self-service signup complet
- Marketplace activ (20–30 extensii)
- Partner program: firme de contabilitate și consultanță care revând PRV
- Expansion: Germania, Franța, Olanda

**Revenue model diversificat**:
- Subscripții SaaS (recurrent, ~80% din revenue)
- Marketplace commission (15–30% din prețul extensiilor)
- Implementation services (prin parteneri sau direct)
- Training și certificare

### Faza 4 — Platform Leader (An 4-5)

- 2,000+ companii în 5+ țări
- Marketplace cu 100+ extensii
- Ecosistem de 50+ parteneri
- Potențial investment sau exit

---

## 10. POZIȚIONAREA COMPETITIVĂ

### De ce PRV câștigă

**Împotriva Procore**:
- Procore costă €500–€2,000/lună pentru o companie mică
- Procore nu are HR, payroll, CRM, field service integrate
- UI formalist, mobil slab
- PRV la €199/lună înlocuiește Procore + Jobber + HubSpot + QuickBooks

**Împotriva Odoo**:
- Odoo are funcționalități similare dar UI din 2010
- Odoo mobil este inutilizabil pe șantier
- Odoo nu are compliance RO nativ (e-Factura)
- PRV câștigă prin design + mobile + AI + RO compliance

**Împotriva stivei de tool-uri separate** (cel mai comun competitor real):
- Companie tipică: Excel devize + Trello proiecte + QuickBooks finanțe +
  WhatsApp comunicare = haos, date duplicate, zero vizibilitate
- PRV: totul într-un loc, date consistente, fluxuri automate, o singură subscripție

### Moat-urile competitive (avantaje greu de replicat)

**1. Compliance RO + BE nativ**
Niciun competitor major nu va implementa e-Factura RO nativ — prea mică piața pentru ei,
strategic pentru PRV. Companiile românești nu au alternativă comparabilă.

**2. Vertical integration Construction + Field Service + Finance**
A construi aceste trei module integrate este 18–24 luni de muncă.
Oricine încearcă să copieze pornește cu 2 ani în urmă.

**3. Design System Liquid Glass**
Reproducerea designului este posibilă, dar crearea unui produs coerent la acest nivel
în ERP/Construction software este extrem de dificilă.
Cultura designului nu se copiază.

**4. AI Native Architecture**
Competitorii adaugă AI pe o arhitectură proiectată fără AI.
PRV are Event Bus + Company-scoped context + AI governance gândit de la început.
Competitorii vor imita aceasta în 2–3 ani.
PRV poate fi la versiunea 3 când ei lansează versiunea 1.

**5. Comunitatea verticală RO + BE**
Primele 200 companii beta creează un network effect.
Recomandările din industrie sunt cel mai eficient canal de sales în construcții.

### Calculul avantajului de cost pentru un client tipic

```
Competitor stack pentru o companie de construcții/renovări:
  Procore (construction)      $375/lună
  Odoo (ERP + HR)             $200/lună
  HubSpot (CRM)               $150/lună
  Jobber (field service)      $169/lună
  QuickBooks (finance)        $100/lună
  ────────────────────────────────────────
  TOTAL competitor stack:     ~$1,000–$1,500/lună

PRV (toate modulele incluse):
  Estimat: €200–€500/lună per companie

Economie per client: €500–€1,200/lună = €6,000–€14,400/an
Plus: 0 integrări de menținut. 1 singur training. 1 singur vendor.
```

---

## 11. METRICILE DE SUCCES

### Orizontul 1 — "Funcționează" (An 1)

| Metric | Target |
|---|---|
| Module cu date reale (nu mock) | 100% din cele 23 existente |
| E2E test coverage | ≥70% (exit criteria Phase 7) |
| Mobile: clock-in GPS funcțional | ✅ |
| PDF generation (invoices + devize) | ✅ |
| PRV Renovations rulează exclusiv pe PRV | ✅ |
| Timp de la login la overview CEO | <60 secunde |
| API P95 response time | <500ms |

### Orizontul 2 — "Câștigă" (An 3)

| Metric | Target |
|---|---|
| Construction module live | ✅ BOQ + RFI + Cost Control |
| Field Service live | ✅ Work Orders + GPS + Reports |
| e-Factura RO live | ✅ integrat ANAF |
| TVA Belgia live | ✅ |
| Companii externe beta | 20–50 |
| NPS beta | >40 |
| Timp mediu onboarding | <2 zile |
| Timp de la WO creat la factură trimisă | <2 minute (automatizat) |

### Orizontul 3 — "Scalează" (An 5)

| Metric | Target |
|---|---|
| Companii plătitoare | 2,000+ |
| Țări active | 5+ |
| Marketplace extensii | 100+ |
| Parteneri implementare | 50+ |
| Uptime SLA | 99.9% |
| Churn lunar | <2% |
| NPS | >50 |

### KPIs pentru PRV ca Produs

```
CALITATE
  Erori TypeScript:             0
  Test coverage (unit):         >80%
  Test coverage (E2E):          >70% pe căi critice
  Uptime:                       99.9%

PERFORMANȚĂ
  API P95:                      <500ms
  Page load (LCP):              <2.5s
  Mobile:                       60fps pe iPhone 12

EXPERIENȚĂ
  CEO 60-Second Rule:           validat cu utilizatori reali
  Onboarding time:              <2 ore pentru admin
  Support tickets per companie: <2/lună

SECURITATE
  Zero P0/P1 vulnerabilități deschise
  Penetration test:             ≥1 pe an
  SOC2 Type II:                 target An 3
```

---

## CONCLUZIE

**PRV în 2031 este sistemul de operare al oricărei companii de construcții, servicii
sau comerț din Europa Centrală și de Vest** — de la devizul scris pe șantier la factura
plătită de client, de la cererea de concediu a unui angajat la briefing-ul de dimineață
al CEO-ului.

**PRV câștigă nu pentru că face mai mult decât competitorii** — ci pentru că face totul
*împreună*, cu un design la nivel Apple, cu AI nativ în fiecare workflow, cu compliance
fiscal real pentru România și Belgia, și cu o experiență mobilă pe care niciun software
ERP nu o oferă astăzi.

**Fundația există. Arhitectura este solidă. Direcția este clară. Urmează execuția.**

---

## DOCUMENTE CORELATE

| Document | Conținut |
|---|---|
| `PRODUCT_VISION.md` | Viziunea originală PRV (18 platforme, structură companie) |
| `PLATFORM_MODULE_MAP.md` | Mapa platform → modul (23 module existente) |
| `IMPLEMENTATION_ROADMAP_PART1.md` | Faze 0–12 (fundație + module core) |
| `IMPLEMENTATION_ROADMAP_PART2.md` | Faze 13–25 (platform layer + lansare) |
| `MASTER_ARCHITECTURE_BLUEPRINT_PART1.md` | Arhitectura sistem, stivă tehnologică |
| `MASTER_ARCHITECTURE_BLUEPRINT_PART2.md` | Arhitectura sistem, extinsă |
| `SECURITY_ARCHITECTURE.md` | Zero Trust, 7-gate chain, audit, GDPR |
| `ROLE_ARCHITECTURE.md` | 19 roluri, 9 niveluri scope, permisiuni |
| `DESIGN_SYSTEM.md` | Liquid Glass, tipografie, motion, haptics |
| `DATABASE_BLUEPRINT_PART1-3.md` | 151+ entități, RLS, migrări |

---

*Status: APROBAT — 7 Iunie 2026*
*Versiunea următoare va fi produsă după finalizarea Orizontului 1*
*Orice implementare din acest document necesită aprobare separată explicită*
