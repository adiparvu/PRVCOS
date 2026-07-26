// Configuration for the unauthenticated (public) app.
//
// The public endpoints are tenant-scoped: POST /api/public/leads REQUIRES a
// companySlug, and GET /api/public/shop/products only falls back to the
// server's PUBLIC_COMPANY_SLUG when the client sends none. The server-side
// variable has no EXPO_PUBLIC_ prefix, so the app cannot read it — sending the
// slug explicitly keeps behaviour independent of how the server happens to be
// configured.
export const COMPANY_SLUG = process.env.EXPO_PUBLIC_COMPANY_SLUG ?? "prv-renovations"

/** Products listing cap. The endpoint does not validate `limit`, and a NaN or
 *  negative value reaches Postgres and 500s — always send a sane integer. */
export const PRODUCT_PAGE_SIZE = 50
