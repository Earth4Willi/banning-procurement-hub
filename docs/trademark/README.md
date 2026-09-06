# Trademark Registration Pack — Banning Procurement Hub

**Jurisdiction:** Ghana — Industrial Property Office (IPO) under the Registrar General's Department.
**Law:** Trademarks Act, 2004 (Act 660), as amended, and the Trademarks Regulations (L.I. 2409 of 2020).
**Status:** Branding materials assembled. Identity the marks to file, then lodge with the IPO (or a licensed trademark agent).

> Advisory material only — not legal advice. Confirm current forms, fees and procedures with the IPO Ghana (rqd.gov.gh / ipoghana.gov.gh) or a Ghanaian IP attorney before filing.

---

## 1. The marks to register

Two filings give the strongest protection ("register it uniquely" = make the mark much less open to third-party takeover or lookalikes):

| Mark | Type | What to submit |
| --- | --- | --- |
| **A. Figurative mark** — the master logo | Combined logo | `logo/logo main.jpg` (master, 1152×864) — submit a clean representation, ideally on a plain background. `public/main-logo.jpg` is the site copy. |
| **B. Wordmark** | Text-only | "BANNING PROCUREMENT HUB" (and optionally "BPH") |

File A on its own protects the logo as filed; B protects the brand name even when styled differently. Registering both is the standard "lock the brand" move.

## 2. Classes of goods/services (Nice Classification)

File in every class the business actually operates in, or could reasonably expand into:

| Class | Coverage (why it matters for BPH) |
| --- | --- |
| **35** | Procurement services for others; retail and wholesale services relating to building materials; business administration and consultancy. **Core** — this is the actual business model. |
| **19** | Non-metal building materials: cement, tiles, roofing sheets, PVC pipes, and fittings. **Core** — the product range. |
| **6** | Common metals and metal building materials, including iron rods / reinforcement bars. **Core** — the rebar line. |
| **39** | Transport; delivery of goods; logistics and distribution. **Core** — "same day / faster deliveries in Accra" is the marketing edge, protect it here. |
| **37** | Construction, building repair and installation services. **Optional** — only if the company plans to offer construction/installation itself (a trade supplier in class 35/19/6 normally stays out of 37 to avoid conflict with contractors). |

A combined Class 35 + 19 + 6 + 39 filing covers selling, delivering and procurement of cement/rods/tiles/roofing/pipes. Add 37 later if the scope changes.

## 3. Required documents (each filing)

- Completed trademark application form (current IPO Ghana form).
- A clear reproduction of the mark (JPEG/PNG, high contrast, white or plain background) — use the logo copy in `logo/` or `public/main-logo.jpg`.
- Class number + list of the specific goods/services within each class (use the table above; write them out, e.g. "cement; tiles; roofing sheets; PVC pipes; reinforcement bars of common metal").
- Applicant's legal name, nationality, address. The applicant must be the registered entity (e.g. the registered business name / company behind BPH) — the mark lives in the entity's name, not an individual's.
- Proof of business registration (Certificate of Incorporation / Registered Business Name certificate).
- Power of attorney (Form) if filing through an agent.
- Priority document, only if claiming priority from an earlier filing in another country within 6 months.
- Filing fees per class (current IPO fee schedule).

## 4. Filing procedure

1. **Preliminary search (recommended)** — request a trademark search at the IPO for "BANNING PROCUREMENT HUB" in classes 35, 19, 6, 39 to check conflicting marks before paying full fees.
2. **File the application** with the IPO (in person at the Industrial Property Office, Accra, or via a licensed agent), with the above documents and fees.
3. **Formalities + substantive examination** — the IPO checks form and then examines for distinctiveness and conflicts.
4. **Acceptance & publication** — the mark is published in the Trademarks Journal; third parties have (typically) 2 months to oppose.
5. **Registration** — if no opposition, the mark is registered and a certificate is issued. Valid **10 years** from filing, renewable in 10-year blocks.

**Typical total duration from filing: ~6–12 months** (search 1–3 months, examination and publication several months). Protection runs from the filing date.

## 5. Readiness checklist

- [ ] Confirm the exact registered legal name of the business and use it as applicant.
- [ ] Settlement on the exact logo version to file (same version used everywhere on-site = `public/main-logo.jpg`).
- [ ] Search/refine the goods list per class (work with the agent on wording).
- [ ] Confirm current fees with the IPO or agent.
- [ ] Decide: in-house filing vs licensed Ghanaian trademark agent (recommended for speed and to handle opposition risk).
- [ ] Once filed, keep the filing receipt — sitemap/site "last updated" dates and @ 2026 footer copy should eventually carry a © + ™/® once status allows "®".

## 6. Where the logo lives in the codebase

- Master source: `logo/logo main.jpg`
- Site display copy: `public/main-logo.jpg` (favicon/header/footer chip)
- App icons: `public/icon-512.png`, `public/icon-192.png`, `src/app/icon.png` (generated)
- Social card: `public/og.png` (generated 1200×630)
- Generator: `scripts/generate-logo-assets.ps1` (re-run after any master-logo change)