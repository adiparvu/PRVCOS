import { test, expect } from "@playwright/test"

// Smoke suite (audit P2.9) — the first tests that exercise the REAL running
// server: middleware, headers, routing and the public API surface, none of
// which unit tests (which import handlers directly) can see. Auth is stubbed
// to "no user", so the suite covers exactly the unauthenticated surface.

test("health endpoint answers and reports database ok", async ({ request }) => {
  const res = await request.get("/api/health")
  const body = await res.json()
  expect(body.checks?.database).toBe("ok")
})

test("login page renders the sign-in form", async ({ page }) => {
  await page.goto("/auth/login")
  await expect(page.locator("input[type=email], input[name=email]").first()).toBeVisible()
  await expect(page.locator("input[type=password]").first()).toBeVisible()
})

test("protected route redirects an anonymous visitor to login", async ({ page }) => {
  const response = await page.goto("/dashboard")
  expect(page.url()).toContain("/auth/login")
  expect(page.url()).toContain("next=%2Fdashboard")
  expect(response?.status()).toBe(200)
})

test("security headers arrive on real responses", async ({ request }) => {
  const res = await request.get("/auth/login")
  const headers = res.headers()
  expect(headers["content-security-policy"]).toContain("default-src 'self'")
  expect(headers["x-frame-options"]).toBe("DENY")
  expect(headers["x-content-type-options"]).toBe("nosniff")
})

test("public shop products endpoint is tenant-scoped, not a tenant leak", async ({ request }) => {
  // No slug configured server-side in E2E env → the endpoint must fail closed
  // with an empty list, never dump all tenants' products (regression for the
  // cross-tenant leak fixed in 0d91cb1).
  const res = await request.get("/api/public/shop/products")
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.count).toBe(0)
  expect(body.reason).toBe("no_public_company")
})

test("unknown company slug fails closed too", async ({ request }) => {
  const res = await request.get("/api/public/shop/products?companySlug=no-such-tenant")
  const body = await res.json()
  expect(body.count).toBe(0)
  expect(body.reason).toBe("unknown_company")
})

test("cross-origin state-changing API request is rejected (CSRF origin check)", async ({
  request,
}) => {
  const res = await request.post("/api/public/leads", {
    headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
    data: { companySlug: "x", name: "Mallory", email: "m@evil.example" },
  })
  expect(res.status()).toBe(403)
  expect((await res.json()).code).toBe("ORIGIN_FORBIDDEN")
})

test("same-origin state-changing API request passes the origin check", async ({
  request,
  baseURL,
}) => {
  // A gated route: getting 401 (auth) rather than 403 (origin) proves the
  // request cleared the origin gate and reached the application layer.
  const res = await request.post("/api/mobile/projects", {
    headers: { Origin: baseURL!, "Content-Type": "application/json" },
    data: {},
  })
  expect(res.status()).toBe(401)
})

test("authenticated API without a token answers 401, not a crash", async ({ request }) => {
  const res = await request.get("/api/mobile/tasks")
  expect(res.status()).toBe(401)
  expect((await res.json()).code).toBe("UNAUTHORIZED")
})

test("public app entry: the storefront page renders", async ({ page }) => {
  const response = await page.goto("/")
  expect(response?.status()).toBe(200)
  await expect(page.locator("body")).not.toContainText("Application error")
})
