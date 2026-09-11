# ContextLock Studio — build progress

Frontend implementation of `contextlock-frontend.md`, built inside the existing
`frontend/` Next.js app and skinned entirely with that site's own design system.

**Ground rule:** structure, pages, buttons and behaviour come from the spec.
Look and feel comes from the landing site — cream `--soft` ground, blue `--color`
ink, `NM_Regular` / `NM_Medium` / `Editorial` type. The spec's own dark-IDE theme
(§8.3) is deliberately **not** followed.

Phases follow the spec's own build sequence (§52).

---

## ✅ Phase FE-1 — Workbench shell

Commit `63ebe88`.

The persistent three-column IDE frame every page renders inside.

| Piece | Spec | Notes |
|---|---|---|
| TitleBar | §4 | project + agent switchers, revision chip & drawer, always-on `TESTNET LAB` badge, command field, build status, blockers, notifications, user menu |
| Activity Rail + Explorer | §5 | 9 rail views swapping explorer groups; nav badges always carry text, never colour alone |
| Editor tabs | §3.3 | preview/pin, dirty dot, stale warning, live dot; restore after refresh |
| Bottom panel | §3.4 | Problems · Output · Tests · Events · Terminal (dev-mode only, never a host shell) |
| Context Agent sidebar | §6 | page- and selection-aware, structured response cards, authority tiers enforced |
| Status bar | §7 | every item a defined click target; policy shows *observed* state + freshness |
| Command palette | §4.5 | ⌘K; policy/emergency entries only **open** confirmations |
| Resizers | §3.2 | pointer + keyboard operable, sizes persisted, double-click resets |
| Shortcuts | §44 | ⌘K ⌘B ⌘J ⌘⇧A ⌘⇧S ⌘⇧T ⌘⇧D — no single keystroke reaches a security control |

Also landed: typed domain model (`lib/studio/types.ts`), mock data layer,
RainbowKit/wagmi **testnet-only** wallet config, route tree for all 21 pages.

## ✅ Phase FE-2 — Shared domain primitives

Commit `63ebe88`.

`StatusBadge` · `VerdictBadge` · `FreshnessBadge` (§33) · `ReasonCode` with a
deterministic code catalog (§35) · `BlockchainRef` that **never** emits a public
explorer link for local-fork objects (§34) · `TrustClassBadge` ·
`NetworkRoleBadge` · `CreModeBadge` (a simulator can never render a DON badge) ·
`SecurityPath` · `StaleBanner` · `DraftAheadBanner` (§36) · `EmptyState` (§47).

Dialogs (§31): standard · security (current → requested → network → resource →
consequence) · emergency (ordered steps + typed confirmation) · destructive
(type the resource name).

## 🔄 Phase FE-3 — Build & Design *(in progress: 2 of 5)*

| Page | Spec | Status |
|---|---|---|
| Composer / Build | §10 | ✅ prompt editor w/ autosave + `/limits` `/protocol` `/data` `/forbid` helpers, DRAFT-labelled requirement parser, live build timeline, Examples / Import / Cancel / Resume |
| Organization / Agents | §11 | ✅ principal tree, agent detail, `EXECUTION: NONE` for reporting agents, shared-policy CRITICAL blocker, revoke via security confirmation |
| Blueprint | §12 | ⬜ next |
| Architecture | §13 | ⬜ |
| Permissions & Security | §14 | ⬜ |

## ⬜ Remaining phases

- **FE-4 — Test surfaces:** Simulation Center (§15), Reality Lab (§16), Attack Lab (§17)
- **FE-5 — Engineering:** Code / Monaco (§18), Integrations & Data Sources (§19)
- **FE-6 — Deployment:** Preflight, cost estimate, deployment progress (§20) — wallet connect lands here
- **FE-7 — Live operations:** Overview (§21), Activity (§22), Policies (§23), Runtime (§24), Control Plane (§25), Chainlink CRE (§26), Identity/ENS (§27)
- **FE-8 — Context Agent integration:** page context envelopes and proposed patches across every page (§39)
- **FE-9 — Reports, settings, polish:** Safety Reports (§28), Settings (§29), a11y (§45), responsive monitoring mode (§46)
- **Landing page polish** — last, by explicit decision

---

## Decisions on record

1. **Design system over spec theme.** Spec §8.3 asks for a dark IDE. We use the
   landing site's cream/blue palette and fonts across every page instead.
2. **No Tailwind, no shadcn.** Components are hand-rolled against the site's
   tokens in `public/styles/studio.css`, scoped under `.cl-studio`, so the
   landing page is untouched.
3. **Libraries added only where the spec names them:** `@xyflow/react`
   (Architecture), `@monaco-editor/react` (Code), `@tanstack/react-query`
   (server state), `lucide-react` (icons), `wagmi` + `viem` +
   `@rainbow-me/rainbowkit` (wallet).
4. **Mock data layer mirrors the real artifact shapes** (`lib/studio/mock/*`),
   so backend wiring is a data-source swap, not a rewrite.
5. **Chrome slightly taller than spec dimensions** — title bar 44px (spec 40),
   status bar 26px (spec 24) — for legibility at the chosen type scale.

## Fixes worth remembering

- **Landing CSS leaked into the workbench.** `inline.css` styles bare `section`
  with `padding: 30rem 0; width: 100vw`, which produced huge vertical gaps and
  content overflowing to the right. `webflow.css` likewise restyles bare
  `h1`–`h6`, `label`, `ul/ol`, `dd`. Both are now neutralised inside
  `.cl-studio` using `:where()` so component classes still win.
- **`.gitignore` was eating a route.** An unanchored `build/` pattern matched the
  `app/projects/[projectId]/build/` route segment, so the Composer page was
  silently never committed. Build-output ignores are now anchored to the root.
- **RainbowKit pulls optional `@x402/*` payment modules** through
  `@coinbase/cdp-sdk`. None are used — the wallet only connects and signs on a
  testnet — so they are ignored via webpack `IgnorePlugin` rather than installed.
