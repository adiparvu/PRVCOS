# PRV COS — Audit pre-producție de arhitectură enterprise și produs

**Data:** 26.07.2026 · **Scop:** întregul monorepo la `main` (`3ebe21d`) · **Metodă:** măsurat din cod, nu din roadmap. Fiecare cifră de mai jos a fost produsă de o comandă rulată pe repository; acolo unde o afirmație nu a putut fi verificată prin execuție, este marcată ca atare. Nu s-a modificat niciun rând de cod pentru acest audit.

**Dovezi verificate-prin-execuție refolosite aici:** într-o sesiune anterioară a fost provizionat un PostgreSQL 16 real și au fost aplicate toate cele 78 de migrații SQL legacy (60 au reușit, 18 au eșuat — constatarea care a dus la `MIGRATIONS.md`); gate-ul complet (`typecheck lint test`, 27/27 task-uri) trece verde la acest commit.

> Versiunea în engleză: `AUDIT_PREPRODUCTION_2026-07.md` (document-sursă; în caz de divergență, versiunea engleză prevalează).

---

## 1. Rezumat executiv

PRV COS este un **codebase mare, coerent și neobișnuit de disciplinat** (~345k linii de TypeScript) care implementează un sistem de operare multi-tenant pentru companii: 463 rute API, 200 pagini web, 66 ecrane mobile, 179 tabele în baza de date, 2.206 teste unitare. Tiparul arhitectural dominant — fiecare rută de business înfășurată într-un lanț de 4 porți (`withGates`: autentificare → rol → scop → audit) cu jurnal de audit înlănțuit criptografic — este aplicat cu o consistență de ~95%, ceea ce este rar la această scară.

**Concluzia principală:** produsul este **complet funcțional pentru un MVP și consistent intern, dar nu a rulat niciodată în producție, iar mai multe garanții critice sunt impuse într-un singur strat.** Distanța până la producție nu înseamnă mai multe funcționalități; înseamnă: un al doilea strat de izolare a tenantului (RLS), teste de integrare pe o bază de date reală, rate limiting dincolo de 3 rute și un mediu efectiv deployat.

**Top 5 puncte forte**
1. Tipar uniform de porți de securitate + jurnal de audit append-only, înlănțuit SHA-256 (`packages/auth/src/audit.ts`, `audit-logs.ts`) — implementat, nu doar declarat.
2. Calitatea schemei: 179 tabele, 144 enum-uri, 389 indexuri, 457 referințe FK, disciplină de soft-delete și cheie de tenant peste tot.
3. Disciplină de testare pentru un codebase pre-producție: 220 fișiere de test / 2.206 teste, toate verzi, legate în CI.
4. Profunzimea stivei de notificări: motor de escaladare/SLA, quiet hours impuse în calea de trimitere, rutare de alerte critice cu confirmare — funcționalități pe care majoritatea competitorilor le țin în spatele nivelurilor enterprise.
5. Poveste onestă a migrațiilor după remediere: `MIGRATIONS.md` documentează că schema TS este sursa adevărului, iar setul SQL legacy este doar istoric (verificat prin execuție: 18/78 migrații legacy eșuează).

**Top 5 riscuri**
1. **Izolarea tenantului este într-un singur strat.** RLS este activat pe 5 din 179 tabele; izolarea se sprijină în întregime pe filtrarea `companyId` din codul aplicației, sub o conexiune service-role. Un singur `where` uitat = scurgere cross-tenant. (Ridicat)
2. **Zero teste de integrare sau E2E.** Toate cele 2.206 teste mock-uiesc integral `@prv/db`; niciun test nu execută SQL real; zero specificații Playwright. Incidentul celor 18 migrații eșuate este exact clasa de bug pe care această lipsă o lasă invizibilă. (Ridicat)
3. **Rate limiting-ul avea un gol pe două wrapper-e.** ~~Constatarea inițială „doar 3 rute sunt limitate" a fost GREȘITĂ~~ — eroare de măsurare: middleware-ul de edge limitează fiecare request per IP, iar Gate 7 din lanțul de porți limitează per utilizator pe toate rutele `withGates`. Golul real era la wrapper-ele mobile (60 rute) și portal (12 rute), fără limită per utilizator. **Închis în `abfcb9b`.** (era Mediu-Ridicat → acum Scăzut)
4. **Nimic nu a fost vreodată deployat.** Fără staging, fără producție, fără niciun punct de date sub sarcină. Toate afirmațiile de performanță de mai jos sunt analiză statică. (Blocant pentru readiness, nu defect de cod)
5. **Postura CSRF este doar `SameSite=lax`** — nicio verificare de Origin/Referer în `middleware.ts` sau `with-gates.ts` pentru request-urile care modifică stare. (Mediu)

**Scor general: 72/100** — justificarea în §17.

---

## 2. Matricea de acoperire funcțională

Scala de status: **Complet / Aproape complet / Parțial / Lipsă.** Procentul de completare este raportat la viziunea declarată a platformei (cele 18 platforme din CLAUDE.md), nu la un produs minimal.

| # | Arie | Status | % | Dovadă |
|---|------|--------|---|--------|
| 1 | Prezentare publică (web) | Parțial | 40% | `apps/marketing` este un stub de 2 fișiere; pagini publice există în `apps/web` |
| 2 | Prezentare publică (mobil) | Aproape complet | 85% | 5 tab-uri publice live pe API-uri reale (shop build 1–4/4) |
| 3 | Servicii de renovare | Aproape complet | 80% | proiecte, faze, oferte, portal client cu accept/respinge |
| 4 | Management de proiect | Aproape complet | 85% | task-uri cu dependențe, milestone-uri, riscuri, paritate mobilă |
| 5 | Management forță de muncă | Aproape complet | 90% | schimburi, swap-uri, staffing, anulare, guard-uri pe concedii |
| 6 | Pontaj | Aproape complet | 90% | înregistrări, corecții, aprobare pontaj |
| 7 | CRM | Aproape complet | 85% | lead-uri → etape → conversie, clienți, contacte, account manager |
| 8 | Shop (intern + public) | Aproape complet | 85% | produse, comenzi, retururi, promoții, checkout public (fără plăți — deliberat) |
| 9 | Finanțe | Aproape complet | 80% | facturi, cheltuieli, rulări de payroll, cron pentru restanțe; fără integrare cu sistem contabil |
| 10 | Analytics | Aproape complet | 85% | 26 rute de analytics, hub-directoar, dashboard-uri per modul |
| 11 | Platforma AI | Parțial | 45% | chat de intelligence, briefing bazat pe reguli, redactare PII, reguli de alertă; fără pipeline de embeddings/RAG în cod, deși pgvector e provizionat |
| 12 | Management documente | Aproape complet | 85% | arhivare, cron de retenție, partajare internă/externă, cerere de semnătură |
| 13 | Centru de notificări | Aproape complet | 90% | digest, escaladare, quiet hours, rutare critică, preferințe |
| 14 | Bază de cunoștințe | Aproape complet | 85% | articole, pin/arhivare, feedback de utilitate, scriere de pe mobil (K1/K2) |
| 15 | Centru de învățare | Aproape complet | 80% | cursuri, înscriere, dashboard de finalizare |
| 16 | Achiziții | Aproape complet | 85% | PR → ciclu PO, GRN → inventar, potrivire în 3 direcții |
| 17 | Management furnizori | Aproape complet | 85% | management de status, dashboard de cheltuieli, alegerea furnizorului preferat |
| 18 | Management flotă | Aproape complet | 85% | vehicule, curse, mentenanță, readiness/utilizare |
| 19 | Management scule | Aproape complet | 85% | registru de custodie, checkout/retur/daună, cron-uri de întârziere |
| 20 | Siguranță (SSM) | Aproape complet | 85% | incidente, investigații, inspecții, certificări, metrici |
| 21 | Marketplace | **Lipsă** | 0% | zero cod oriunde; există doar în viziune |
| 22 | Prezență | Aproape complet | 80% | store de prezență + API + componente UI |
| 23 | Căutare (Typesense) | Parțial | 50% | `packages/search` are 224 LOC — client, colecții, indexare există; fără job-uri de reindexare sau profunzime în UI-ul de rezultate |
| 24 | Portal client | Aproape complet | 80% | autentificare magic-link (token 15 min, sesiune 30 zile), oferte, contracte, facturi, documente, mesaje — wrapper propriu `withPortalAuth` pe toate cele 12 rute |

---

## 3. Scorecard de arhitectură

| Dimensiune | Scor /10 | Note |
|---|---|---|
| Consistență | 9 | Un singur tipar de rută, un singur idiom de audit, un singur tipar de mock în teste. Codebase-ul se citește ca și cum l-ar fi scris un singur autor. |
| Stratificare | 8 | Granițe curate între pachete: `db` (doar schemă), `auth` (porți/permisiuni), `cache`, `jobs`, `search`, `ai-engine`, `approval-engine`, `env` (config validat). |
| Cuplare | 7 | Rutele importă `@prv/db` direct — nu există strat de repository. Acceptabil la această scară; ascute însă riscul lipsei de RLS, pentru că construcția query-urilor e distribuită în 463 de fișiere. |
| Duplicare | 7 | Rutele web și mobile duplică logică de business pentru aceleași verbe (ex. PATCH pe angajați există de două ori cu guard-uri paralele). Deliberat (contexte de auth diferite), dar un risc de divergență — 3 bug-uri de paritate au fost deja găsite și reparate în sesiuni anterioare. |
| Potrivirea abstracțiilor | 9 | Nicio abstracție speculativă găsită. `approval-engine` și `ai-engine` sunt mici și folosite. Fără framework-uri moarte. |
| Dependențe ciclice | 9 | Niciuna între pachete; graful Turborepo este un DAG. |
| Scalabilitate | 6 | O singură aplicație Next.js servește 463 rute + 200 pagini. Suficient până la ~10k utilizatori; cold-start-ul serverless și dimensiunea bundle-ului sunt primii pereți. Fără cablare de read-replica, deși documentația pretinde „primary + read replica" — **documentația supraestimează implementarea**. |

**Sisteme duplicate găsite:** (1) perechile de rute web vs mobil (~60 de verbe) — se păstrează, dar extrage handler-e comune când apare al treilea client; (2) două sisteme de migrații (SQL legacy vs drizzle-kit push) — deja reconciliate și documentate, se păstrează; (3) două idiomuri de extragere a ipAddress între familiile de rute — cosmetic.

**Nu se recomandă nicio rescriere, nicăieri.** Monolitul este forma corectă pentru dimensiunea acestei echipe. Singura investiție structurală justificată acum: un strat comun `lib/handlers/` pentru verbele care există și pe web și pe mobil, adoptat oportunist când rutele sunt atinse din nou.

---

## 4. Analiza bazei de date

| Aspect | Verdict | Detaliu |
|---|---|---|
| Schemă | **Puternică** | 179 tabele / 54 fișiere, denumiri consistente, cheie de tenant pe tabelele de business, disciplină de soft-delete (`deletedAt`), 144 enum-uri în loc de status-uri text liber |
| Indexuri | **Puternice** | 389 declarații index/uniqueIndex; coloanele FK și cheile de tenant acoperite în eșantioanele inspectate |
| Chei străine | **Puternice** | 457 `references()`; guard-uri self-FK adăugate la nivel de aplicație (self-manager, self-dependency) |
| Migrații | **Reparate, de urmărit** | Calea canonică este `db:provision` (extensii + drizzle-kit push). Setul SQL legacy păstrat pentru istoricul CI. Runner-ul cheie acum după tag-ul complet, detectează drift de checksum, refuză baze legacy. Risc rezidual: drizzle-kit push nu are poveste de rollback — acceptabil pre-lansare, are nevoie de migrații generate post-lansare. |
| RLS | **Închis** (`0f3bec1`) | Era: activat pe 5 din 179 tabele. `db:provision` se încheie acum cu `db:rls` (rls-lockdown.sql): RLS pe fiecare tabel + politică company_isolation pe fiecare tabel cu company_id. Verificat prin execuție: anon deny implicit, SELECT scopat pe tenant sub `SET LOCAL app.company_id`. |
| Normalizare | **Bună** | 3NF cu contoare denormalizate deliberat; fără abuz de EAV |
| Eficiența query-urilor | **Bună (static)** | Liste paginate, verificări de existență cu `limit(1)`, fără tipare N+1 în rutele eșantionate. Neverificat sub sarcină — nu există date EXPLAIN de producție. |
| Coloane moarte | **Documentate** | `nationalId`, `bankIban`, `secretEncrypted` sunt coloane moarte, niciodată scrise; comentariile avertizează acum că nu există niciun helper de criptare. Fie se implementează criptare la nivel de aplicație înainte de prima scriere, fie se elimină. |

---

## 5. Analiza backend-ului

- **API-uri:** 463 rute; 359 `withGates` + 60 `withMobileAuth` + 12 `withPortalAuth` + 18 auth + 4 publice + health/inngest/share-token = **100% din rutele de business au poartă** (cele 44 „fără poartă" sunt exact rutele care trebuie să fie publice sau au wrapper propriu — verificat prin listă, nu prin eșantion).
- **Validare:** zod pe fiecare rută mutantă eșantionată; lărgirea enum-urilor ținută în sincron cu schema (acoperită de teste de regresie).
- **Audit:** 296 rute apelează `writeAuditLog`; diferența față de cele 419 rute cu poartă o reprezintă GET-urile read-only — corect prin design.
- **Caching:** wrapper Redis există (`packages/cache`: query cache, pub/sub, evenimente realtime, rate-limit); seturile de permisiuni cache-uite 30s. Caching la nivel de răspuns absent — acceptabil pre-lansare.
- **Job-uri de fundal:** 40 de funcții Inngest (cron-uri pentru restanțe/expirări/retenție/escaladare + notificări declanșate de evenimente). Cheia de semnare validată prin `packages/env`.
- **Tratarea erorilor:** plicuri de eroare JSON consistente cu `code`; Sentry cablat prin `instrumentation.ts` + `error.tsx`.
- **Slăbiciuni:** (1) ~~rate limiting pe doar 3 rute~~ corectat: per-IP la edge + per-utilizator în Gate 7 existau; golul wrapper-elor mobile/portal închis în `abfcb9b`; (2) fără corelare request-ID între jurnalul de audit și Sentry; (3) `writeAuditLog` este fire-and-forget void — un eșec de scriere în audit e silențios (compromis deliberat pentru disponibilitate; ar trebui măcar numărat în Sentry).

## 6. Analiza frontend-ului (web)

- 200 de pagini sub App Router, grupuri de rute per platformă; layout-uri consistente; sistemul de design Liquid Glass în `packages/ui` (28,7k LOC).
- State: Zustand + TanStack Query conform specificației; toast-uri globale de eroare pe mutații cablate.
- **Accesibilitate: cea mai slabă dimensiune.** Atribute `aria-` în doar 48 de fișiere din 200+ pagini; fără verificări automate de a11y în CI; WCAG 2.1 AA este declarat în viziune dar nemăsurat. Parțial.
- Responsivitate prezentă; fără acoperire de regresie vizuală.

## 7. Analiza aplicației mobile

- **Aplicația de staff:** 47 de ecrane autentificate acoperind toate cele 5 tab-uri de business + ecrane de detaliu/rapoarte; sesiune în SecureStore; deblocare Face ID (reparată să ceară o sesiune existentă); ecrane TOTP/MFA; înregistrare push cu registru de device-uri pe server.
- **Aplicația publică:** 9 ecrane, toate pe API-uri publice live; coș/favorite persistate în Keychain; pachetul de submisie App Store complet; `ITSAppUsesNonExemptEncryption` declarat.
- **Offline: inexistent.** Fără NetInfo, fără coadă, fără cache-and-sync. Fiecare ecran cere conectivitate. Pentru muncitorii de teren (utilizatorul declarat) acesta este cel mai mare gol de produs pe mobil. Parțial.
- **Teste pe partea mobilă: 16** (doar formatters). Logica de business mobilă e testată indirect prin cele 64 de suite de teste ale rutelor API mobile — acceptabil, dar logica de UI (store-uri, hook-uri) e netestată.
- Funcționalități de platformă din viziune absente: Dynamic Island, Live Activities, widget-uri, haptics. Lipsă (nivel-viziune, nu nivel-lansare).

## 8. Scorecard de securitate

| Constatare | Severitate | Detaliu |
|---|---|---|
| RLS absent pe 174/179 tabele | **Ridicat** | Izolare de tenant într-un singur strat sub conexiune service-role. Un query nescopat = citire cross-tenant. O scurgere exact din această clasă s-a produs deja (endpoint-ul public de produse, reparat în `0d91cb1`). |
| Verificare de origine CSRF | **Închis** (`f268fe1`) | Middleware-ul respinge request-urile mutante /api al căror Origin nu corespunde nici host-ului, nici ALLOWED_ORIGINS; clienții nativi fără Origin neafectați; originea „null" respinsă. |
| Gol de rate limiting pe wrapper-ele mobile/portal | **Închis** (`abfcb9b`) | Constatare corectată: edge-ul limitează per IP global și Gate 7 per utilizator pe rutele withGates; golul era doar withMobileAuth/withPortalAuth. Ambele oglindesc acum Gate 7 (api_read/api_write per utilizator+cale). |
| Eșecurile de scriere în audit sunt silențioase | **Mediu** | void prin design; eșecurile ar trebui numărate/alertate, altfel garanția de imutabilitate e neverificabilă în practică. |
| Coloane „criptate" moarte | **Mediu** | `secretEncrypted`/`bankIban`/`nationalId` — nu există criptare; acum documentat. Nu scrieți în ele până nu există un helper pe KMS. |
| Secrete | **Scăzut** | `packages/env` validează la boot; fără secrete în repo (CI folosește stub-uri etichetate); `.env` în gitignore. |
| XSS | **Scăzut** | Escaparea React + CSP în middleware **și** în next.config (duplicat — de consolidat într-o singură sursă). Fără `dangerouslySetInnerHTML` în componentele eșantionate. |
| Injecție SQL | **Scăzut** | Parametrizare Drizzle peste tot; `sql.unsafe` doar în runner-ul de migrații (input de încredere). |
| Modelul de sesiune | **Bun** | Sesiuni server-side, registru de device-uri cu revocare, re-auth (15 min) pentru operațiuni sensibile, MFA (TOTP + WebAuthn/passkeys + coduri de rezervă), lockout pe signup/login. |
| Lanțul de audit | **Bun — verificat în cod** | Lanțul SHA-256 `prevHash`/`entryHash` per companie există în schemă și în `audit.ts`. Recomandare: un cron periodic de verificare a lanțului; fără el, o falsificare ar trece totuși neobservată. |

## 9. Scorecard UX (vs Apple / Linear / Notion / Stripe / Revolut)

| Dimensiune | /10 | Note |
|---|---|---|
| Consistență vizuală | 9 | Un singur limbaj de design impus peste tot; token-uri partajate; disciplina monocromă ținută |
| Navigare | 8 | Adâncimea de 3 niveluri respectată; structură de 5 tab-uri pe ambele aplicații; command palette prezent |
| Descoperibilitate | 7 | Directorul de Analytics ajută; modulele adânci (potrivire în 3 direcții, politici de escaladare) presupun încă utilizatori instruiți |
| Calitatea interacțiunii | 6 | Confirmări, toast-uri, acțiuni bulk făcute bine. Lipsește față de clasa de comparație: update-urile optimiste sunt inconsistente, nu există tipar de undo, motion-ul cu fizică de spring e specificat dar rar implementat |
| Stări empty/error/loading | 8 | Aplicația publică are toate cele patru stări per ecran; web-ul în mare parte acoperit |
| Accesibilitate | 4 | Vezi §6 — cel mai mare decalaj față de standardele Apple/Stripe |

**UX per total: 7/10.** Decalajul față de Linear/Stripe nu e vizual — e motion, ascunderea latenței (UI optimist) și accesibilitatea.

## 10. Scorecard de performanță

| Aspect | Verdict |
|---|---|
| Indexarea DB | Puternică (static) |
| Paginare | Prezentă pe toate listele eșantionate |
| Caching | Infrastructura Redis pregătită; utilizare efectivă subțire (permisiuni, rate-limit) |
| Bundle/număr de rute | 463 rute + 200 pagini într-o singură aplicație Next — măsurați cold-start-ul înainte de lansare |
| Read replica | **Declarată în documentație, neimplementată** (nicio cablare de replică în `packages/db`) |
| Teste de sarcină | **Nu există.** Niciun k6/artillery/gatling nicăieri. Fiecare afirmație de performanță din acest repo e netestată sub trafic. |

**Scor: 5/10** — nu pentru că codul ar fi lent, ci pentru că nimic nu dovedește că e rapid.

## 11. Scorecard de testare

| Strat | Număr | Verdict |
|---|---|---|
| Unitare (rute web, pachete) | 220 fișiere / 2.206 teste, toate verzi | Puternic |
| Integrare (Postgres real) | **0** | **Golul critic.** Toate testele mock-uiesc `@prv/db`; incidentul celor 18 migrații eșuate dovedește că mock-urile nu pot prinde realitatea schemei/SQL-ului |
| E2E (Playwright) | **0** specificații | Lipsă; Chromium e chiar preinstalat în mediu |
| Mobil | 16 (formatters) | Subțire |
| A11y / regresie vizuală | 0 | Lipsă |
| CI | lint + typecheck + test + bootstrap de migrații legacy, pe push/PR | Bun; fără etapă de deploy |
| Instabilitate cunoscută | 4 suite expiră sub sarcină paralelă; trec single-threaded (`--no-file-parallelism` verificat 197/197) | Documentați sau reparați configurarea pool-ului vitest |

**Scor: 6/10.** Lățime excelentă pe un singur strat; adâncime zero sub el.

## 12. Registrul datoriei tehnice

| # | Datorie | Dobânda plătită dacă e ignorată | Efort |
|---|---|---|---|
| D1 | Fără al doilea strat RLS | Scurgere cross-tenant din orice viitor query nescopat | M — șablon de politică × 174 tabele, mecanic |
| D2 | Doar teste cu DB mock-uit | Drift de schemă și bug-uri SQL ajung în producție nedetectate | M — testcontainers + ~30 specificații pe căile critice |
| D3 | Duplicarea logicii rutelor web/mobil | Bug-uri de paritate (3 deja găsite) | S per rută, oportunist |
| D4 | Acoperirea rate limiting-ului | Abuz/inundarea API-urilor autentificate | S — limiter implicit la nivel de middleware |
| D5 | CSP definit în două locuri | Divergență în timp | S |
| D6 | Coloane sensibile moarte | Cineva scrie PII în clar într-o coloană numită „encrypted" | S — eliminați sau implementați |
| D7 | drizzle-kit push, fără rollback | Schimbările de schemă post-lansare devin riscante | M — treceți pe migrații generate la lansare |
| D8 | Teste instabile în paralel | Erodarea încrederii în CI | S |
| D9 | Documentația promite > implementarea (read replica, *verificarea* lanțului SHA, Dynamic Island…) | Induce în eroare viitorii auditori/cumpărători | S — aliniați afirmațiile din CLAUDE.md cu realitatea |
| D10 | Stub-ul `apps/marketing` | Zero până la go-to-market | — |

## 13. Registrul de riscuri (top 10, probabilitate × impact)

| # | Risc | P | I | Clasă | Atenuare |
|---|---|---|---|---|---|
| R1 | Expunere de date cross-tenant printr-un query nescopat | M | Critic | Securitate | D1 (RLS) + teste de integrare care afirmă izolarea |
| R2 | Producția se comportă altfel decât mock-urile (SQL, constrângeri, tranzacții) | R | Ridicat | Calitate | D2 |
| R3 | Niciun mediu nu a rulat vreodată stiva completă | Cert | Ridicat | Ops | Deploy de staging înaintea oricărei alte investiții |
| R4 | Abuz de API (fără throttling) | M | Mediu | Securitate | D4 |
| R5 | Pistă de audit silențios incompletă | S | Ridicat | Conformitate | Alertă la eșec de scriere + cron de verificare a lanțului |
| R6 | Mobilul inutilizabil offline pe șantiere | R | Mediu | Produs | Cache de citire + coadă de mutații întâi pentru pontaj/task-uri |
| R7 | Respingere din App Store | S | Mediu | Lansare | Pachetul de submisie gata; riscurile rămase sunt pași de ops |
| R8 | Factor de autobuz — un singur mentenor (un idiom, un autor) | M | Mediu | Org | Consistența ajută; documentația e solidă |
| R9 | Latență de cold-start la 463 de rute | M | Mediu | Perf | Măsurați pe staging; divizați dacă se dovedește necesar |
| R10 | Platforma AI livrează sub viziune | M | Scăzut | Produs | Bazat pe reguli e onest; scopați RAG deliberat |

*(P/I: S=scăzut, M=mediu, R=ridicat)*

---

## 14. Analiza decalajelor față de competitori

Comprimat la diferențele relevante pentru decizii. „✅ egalat" = funcționalitatea există și merge în cod; „◐" = parțial; „✗" = lipsă.

| Competitor | Nucleul lor | PRV egalat | PRV parțial | PRV lipsă | PRV superior |
|---|---|---|---|---|---|
| **Procore** | PM de construcții | ✅ proiecte/task-uri/siguranță/inspecții/documente | ◐ RFI-uri, submittals (doar documente generice) | ✗ planșe/BIM, management de licitații | HR+payroll+flotă+scule integrate într-un singur tenant; lanț de audit |
| **Autodesk ACC** | Design-to-field | ✅ issues, documente | ◐ checklist-uri | ✗ coordonare CAD/model — nu concurați aici | Fluxurile non-design |
| **Buildertrend** | Constructori rezidențiali | ✅ oferte→proiecte→facturi, portal client, selecții-lite | ◐ Gantt de planificare | ✗ finanțare pentru proprietari, takeoffs | Portalul client cu magic-link + semnare contract e mai curat |
| **Odoo** | ERP modular | ✅ paritate CRM/inventar/achiziții/flotă pentru scop SMB | ◐ contabilitate (fără registru general — doar facturi/cheltuieli) | ✗ producție, profunzime ecommerce, app store | UX unic coerent vs mozaicul de module Odoo; pistă de audit reală |
| **Zoho One** | Lățimea suitei | ✅ ~10 din categoriile de aplicații | ◐ email/campanii | ✗ 30+ aplicații periferice | Profunzime per modul; calitatea design-ului |
| **HubSpot** | CRM/marketing | ◐ nucleul CRM | ◐ pipeline-uri | ✗ automatizare de marketing, secvențe de email | Integrarea ops+teren pe care HubSpot n-o are |
| **Monday / ClickUp** | Work OS | ✅ task-uri/dashboard-uri/automatizări(cron) | ◐ view-uri custom | ✗ workflow-uri/board-uri definite de utilizator | Semantica de domeniu (payroll, GRN, custodie) pe care ei n-o pot exprima |
| **Jobber** | Field service | ✅ oferte/planificare/facturare/hub client | ◐ rutare | ✗ colectare de plăți de la consumatori | Multi-company, RBAC enterprise |
| **QuickBooks** | Contabilitate | ◐ facturi/cheltuieli | ◐ rulări de payroll (fără motor de taxe) | ✗ registru general, depunere taxe, feed-uri bancare | Nu e competitor — integrați, nu concurați |

**Oportunități de diferențiere (ordonate):** (1) *singurul* OS de construcții multi-companie auditabil — jurnalul de audit înlănțuit + porțile zero-trust reprezintă o poveste de conformitate reală pe care niciun tool SMB n-o are; (2) un singur binar care servește storefront public + portal client + OS de staff; (3) potrivirea pe piața românească (TVA, semantică de payroll) contra incumbenților centrați pe SUA. **Nu urmăriți:** BIM/CAD (Autodesk), contabilitate cu registru general (integrare QuickBooks/Saga în schimb), automatizare de marketing (HubSpot).

---

## 15. Raport de pregătire pentru producție

| Etapă | % | Justificare |
|---|---|---|
| MVP (complet funcțional pentru primul client) | **92%** | Toate cele 18 arii de platformă, mai puțin marketplace, au cod funcțional; restul de 8% e șlefuire, nu structură |
| Alpha intern (echipa îl folosește zilnic) | **85%** | Blocat doar de deployment — nu există niciun mediu. Pe partea de cod: gata |
| Beta intern (o companie reală operează pe el) | **72%** | Necesită: deploy de staging, companie reală seed-uită, teste de integrare, rate limiting |
| Beta public | **58%** | Adaugă: strat RLS, test de sarcină, execuția pachetului App Store (pași de ops), site de marketing |
| Gata de producție | **52%** | Adaugă: suită E2E, runbook-uri de monitorizare/alertare, exercițiu de backup/restore, migrații cu rollback |
| Gata de enterprise | **38%** | Adaugă: SSO/SAML, poveste de rezidență a datelor, controale pe traiectoria SOC2 (lanțul de audit ajută), SLA-uri, API-uri de administrare, mobil offline |

## 16. Plan de acțiune prioritizat

**P0 — înainte ca cineva real să-l atingă**
1. Deploy de staging (`apps/web` + cele 7 servicii) — deblochează orice altă verificare. (ops)
2. Politici RLS pe toate tabelele de tenant — șablon mecanic, cel mai mare risc retras. (D1)
3. Rate limiter implicit în middleware pentru rutele autentificate. (D4)
4. Verificare de Origin pentru request-urile care modifică stare. (CSRF)

**P1 — înainte de prima companie reală**
5. Strat de teste de integrare: Postgres în testcontainers, ~30 specificații pe căile de auth/tenancy/finanțe, inclusiv o suită de aserțiuni de izolare cross-tenant. (D2)
6. Cron de verificare a lanțului de audit + alertă Sentry la eșec de scriere în audit. (R5)
7. Eliminați sau implementați coloanele sensibile moarte. (D6)
8. Treceți pe migrații drizzle generate la momentul lansării. (D7)

**P2 — înainte de beta public**
9. Suită E2E de smoke (login → flux de bază per platformă) în CI.
10. Cache de citire offline + coadă de mutații pentru pontaj/task-uri pe mobil. (R6)
11. Test de sarcină pe top-20 rute; măsurați cold start-ul; abia apoi decideți orice divizare. (R9)
12. Trecere de accesibilitate spre WCAG AA măsurat pe cele mai folosite 20 de pagini.
13. Aliniați afirmațiile din documentație cu implementarea (read replica, funcționalități de platformă). (D9)

**P3 — traiectoria enterprise**
14. SSO/SAML, SCIM; suprafață de admin/API; site de marketing; marketplace (greenfield).

---

## 17. Scor general: **72 / 100**

**Cum se descompune** (ponderile reflectă prioritățile pre-producție):

| Componentă | Pondere | Scor | Contribuție |
|---|---|---|---|
| Completitudine funcțională vs propria viziune | 20% | 84 | 16,8 |
| Calitatea și consistența arhitecturii | 15% | 85 | 12,8 |
| Design-ul bazei de date | 10% | 85 | 8,5 |
| Securitate (implementată, stratificată) | 15% | 66 | 9,9 |
| Testare (lățime × adâncime) | 15% | 55 | 8,3 |
| Performanță (dovedită, nu presupusă) | 10% | 45 | 4,5 |
| UX vs reperul premium | 10% | 70 | 7,0 |
| DevOps/deployabilitate | 5% | 45 | 2,3 |
| **Total** | | | **72,1** |

**De ce 72 și nu mai mult:** fiecare punct pierdut se trage din *nedovedit*, nu din *stricat*: niciun mediu deployat, niciun test care atinge o bază de date reală, izolare de tenant într-un singur strat și afirmații de performanță cu zero dovezi sub sarcină. Acestea sunt exact proprietățile care despart un codebase impresionant de un sistem de producție.

**De ce 72 și nu mai puțin:** lucrurile grele și scumpe sunt făcute și făcute consistent — o schemă de 179 tabele cu disciplină referențială, o poartă zero-trust aplicată uniform pe 100% din rutele de business, un jurnal de audit real înlănțuit criptografic, 2.206 teste verzi și o aplicație mobilă aflată la o listă de pași de ops distanță de TestFlight. Munca rămasă este inginerie bine înțeleasă, cu soluții cunoscute — nu cercetare.

*Acest document nu înlocuiește niciun roadmap și nu schimbă niciun cod. Rulați din nou comenzile de măsurare din §2–§11 pentru a re-verifica orice cifră.*

---

## 18. Jurnal de remediere (post-audit)

Auditul este un instantaneu la `3ebe21d`. Lucrări finalizate de atunci:

| Element din audit | Commit | Ce s-a schimbat |
|---|---|---|
| P0.2 / D1 / R1 — al doilea strat RLS | `0f3bec1` | `db:provision` se încheie acum cu `db:rls`: RLS activat pe fiecare tabel, politică `company_isolation` pe fiecare tabel cu `company_id`. Verificat prin execuție (anon deny implicit; scopat pe tenant sub `SET LOCAL app.company_id`; idempotent). |
| P0.3 / D4 / R4 — rate limiting | `abfcb9b` | Constatare corectată (vezi §1/§8) — golul real era la wrapper-ele mobile/portal; ambele impun acum limite per utilizator api_read/api_write cu 429 + Retry-After. |
| P0.4 — verificare Origin CSRF | `f268fe1` | Middleware-ul respinge request-urile mutante /api cross-origin; clienții nativi neafectați. |
| P1.6 / R5 — verificarea lanțului | `c936ddd` | Cron zilnic re-derivă lanțul fiecărei companii (eveniment critic `audit_chain_broken` la rupere); eșecurile writeAuditLog sunt numărate în Redis și descărcate într-un eveniment `audit_write_failure` de severitate ridicată. |
| D5 — duplicarea CSP | `a10dc7a` | next.config.ts e unica sursă de headere de securitate; copia divergentă din middleware eliminată. |
| D6 — coloane sensibile moarte | `a10dc7a` | national_id, bank_iban, secret_encrypted eliminate; re-adăugarea cere mai întâi criptare pe KMS. |
| D8 — teste instabile în paralel | `a10dc7a` | testTimeout/hookTimeout 30s acoperă înfometarea de scheduling sub sarcina paralelă turbo. |
| P1.5 / R2 — teste de integrare | `a0f1bf1` | Primele suite pe Postgres real: aserțiuni de izolare cross-tenant + detecție de falsificare a lanțului de audit, rulate în CI pe pgvector/pgvector:pg16 cu provizionarea schemei complete. |
| P2.9 — E2E smoke | `2660154` | Zece specificații Playwright pe serverul real (headere, redirecturi, API public fail-closed, verificarea de Origin cap-coadă); job propriu de CI; limiterul de edge cade acum deschis la o pană Redis. |
| P2.10 / R6 — offline mobil | `3784c56` | Cache-ul de query-uri persistat în AsyncStorage (24h), onlineManager alimentat de NetInfo, coadă durabilă FIFO de mutații cu replay la reconectare; bifarea task-urilor e primul consumator. |
| D9 — documentație vs implementare | acest commit | Afirmațiile din CLAUDE.md aliniate cu realitatea: read replica, Dynamic Island / Live Activities / Widgets / Haptics, lanțul realtime pe 4 niveluri și cheile Typesense per companie marcate ca roadmap (Never Remove: adnotate, nu șterse); WCAG marcat în lucru; copy-ul fals „read replica" vizibil în produs scos din pagina Integrations. Verificarea lanțului SHA nu a mai cerut modificări — implementată post-audit (`c936ddd`). |

P0.1 (deploy de staging) rămâne muncă de ops, în afara repository-ului.
