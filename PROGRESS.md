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

Commit `3e4b1bd`.

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

Commit `3e4b1bd`.

`StatusBadge` · `VerdictBadge` · `FreshnessBadge` (§33) · `ReasonCode` with a
deterministic code catalog (§35) · `BlockchainRef` that **never** emits a public
explorer link for local-fork objects (§34) · `TrustClassBadge` ·
`NetworkRoleBadge` · `CreModeBadge` (a simulator can never render a DON badge) ·
`SecurityPath` · `StaleBanner` · `DraftAheadBanner` (§36) · `EmptyState` (§47).

Dialogs (§31): standard · security (current → requested → network → resource →
consequence) · emergency (ordered steps + typed confirmation) · destructive
(type the resource name).

## ✅ Phase FE-3 — Build & Design

Commits `0f2f8dc` (Composer, Organization) and `2de608f` (Blueprint,
Architecture, Permissions).

| Page | Spec | What landed |
|---|---|---|
| Composer / Build | §10 | Prompt editor with autosave and `/limits` `/protocol` `/data` `/forbid` helpers; parser output held at **DRAFT** until a deterministic artifact exists and a missing ceiling held at **REQUIRED** rather than invented; live build timeline whose stages open the matching bottom panel; Examples / Import Requirements / Cancel Build / Resume Build |
| Organization / Agents | §11 | Principal tree + agent detail; `EXECUTION: NONE` for reporting-only agents; blocking **CRITICAL — shared policy principal** check; Add / Duplicate as New Agent / Open Blueprint / Architecture / Policy / Revoke (security confirmation stating sibling + capability impact) / Remove Draft |
| Blueprint | §12 | All 19 canonical sections; editing opens a **draft revision** and never mutates the live one; left-edge change markers; **AUTHORITY EXPANSION** call-outs with the concrete consequence; grouped validation panel with click-to-focus-field; revision comparison listing expansions first plus what goes stale; Raw JSON / Copy / Export; publish action is **Create Revision**, not Save |
| Architecture | §13 | React Flow canvas, 14 node categories, labelled edges (READ / CONTEXT / TRIGGER / POLICY / AUTHORIZATION / EXECUTE / ESCALATE); **live overlay reuses the same graph**; 7 layer toggles; node inspector opens **inside the center pane** with navigation only — no destructive controls; accessible alternate node list; Fit / Zoom / Lock / Layers / Live Overlay / Export SVG |
| Permissions & Security | §14 | Posture summary; three-column **ALLOW / ESCALATE / DENY** matrix with per-rule policy refs and proof links; 7 constraint panels (capability bindings, recipients, expiry/nonce, data trust, confidentiality, identity, org aggregate); authority-increase review; Open Policy / Compare / Run boundary simulations / Export / Create policy revision. Deliberately offers **no** enable/disable control |

## ✅ UI hardening round (after FE-3 review)

Commits `16dbf7d`, `f6828d9`, `77a1ecf`. Driven by review of the running app —
the findings are generalised into **House rules** below so they are not
rediscovered later.

- Contrast: element resets were outranking component classes, so every button
  inherited its parent's ink (blue icons on the blue rail, cream menus on cream).
- Chrome bars: colour is inherited, not forced with `*`; badges and status dots
  get light-end hues on navy.
- Panels: explorer, agent sidebar and bottom panel now fill their sized wrapper.
- Full-width buttons wrap instead of forcing their container off-screen.
- Tab ✕ navigates to a neighbour instead of stranding the page.
- Explorer header shows the project, not a repeat of the group label.
- Revision indicator rebuilt as labelled segments, amber when trailing.
- Output log reads as a log: timestamp / scope / message, tinted by level.
- Architecture is per-agent; a reporting-only agent has no execution path drawn.
- Code runs the dark editor theme across the whole shell.
- Dev compile time: wallet stack moved behind a dynamic import, Turbopack on.

## ✅ Phase FE-4 — Test surfaces

| Page | Spec | What landed |
|---|---|---|
| Simulation Center | §15 | 24 scenarios across all 11 groups; grouped list with per-scenario checkboxes; detail shows deterministic inputs, mutation, expected vs actual, reason code, changed fields, layers evaluated, timing and run log; **a run built against an older Blueprint is shown STALE** rather than as a current pass; security path per run; Run All / Run Selected / Stop Run / Create Scenario / Duplicate / Reset to Template / Compare Runs / Open failed assertion / Run CRE Simulation. The expected result is fixed when a scenario is written and is never editable to turn a failure green |
| Reality Lab | §16 | **Market source and execution target are two separate fields**, never merged; four modes each reporting AVAILABLE / LIMITED / BLOCKED with the exact blocker (Historical Replay is LIMITED for want of an archive RPC; The Graph is UNAVAILABLE for want of a credential, with no substitution); snapshot header with anchor block, coherence and hash; source table with trust class and freshness; provenance drawer; local fork panel with Create / Reset / Snapshot / Restore / Destroy / Run Agent on Fork, endpoint shown only in developer mode; **fork transactions are labelled LOCAL FORK TRANSACTION and never receive a public explorer link**; six synthetic overlays applied over an immutable base snapshot, with Apply / Clear / Compare with Base |
| Attack Lab | §17 | 16 attacks across all 10 categories; cards carry applicability, severity, last result and stopping layer; detail shows original vs injected values, the stopping layer, reason code, and `NOT ISSUED` / `NOT SUBMITTED`; **defences exercised lists only the layers a run actually reached** — a layer never reached is not claimed as a defence; mainnet write attempt always offered for a write-capable agent; attacks that cannot apply to a reporting-only principal are marked not applicable and report no result; Run Attack / Run All Applicable / View Security Path / Compare with Baseline / Open Policy Rule / Open Simulation / Export Result |

Attack applicability is derived from the agent's execution class, so a
reporting-only principal is not shown green results for attacks that could never
have run against it.

## ✅ Phase FE-5 — Engineering surfaces

| Page | Spec | What landed |
|---|---|---|
| Code | §18 | Monaco editor, dynamically imported so it stays out of every other route's graph, themed from the workbench's own dark tokens; file tree across all seven groups with `GENERATED` / `TEMPLATE` / `MODIFIED` / `STALE` / `LOCKED` marks; **generated code is read-only after a successful build** so the artifact still corresponds to its Blueprint; developer mode may open a draft, which marks the file MODIFIED, raises a banner and states that revalidation and a rebuild are required — a hand edit is never invisible to Blueprint validation; Monaco Diff for revision compare; per-file provenance linking to the Blueprint section that generated it and the test that covers it; Rebuild from Blueprint / Run tests / Open Problems / Compare revision / Download project / Copy / Copy path / Download |
| Integrations & Data Sources | §19 | Four tabs (Adapters, Data Sources, Credentials, Custom/OpenAPI); adapter table with id, version, type, network role, capabilities, trust class, status, lifecycle and used-by, opening an inspector with full provenance; **credential values are never displayed** — only name, scope, storage boundary, status, last verified and what uses them, with the existing value replaceable but never readable; an unavailable source names exactly what is missing and states that nothing of lower trust is substituted; OpenAPI import pinned to a single allowed host, generating an adapter at trust class UNVERIFIED; Add Integration / Import OpenAPI / Configure credential / Rotate / Test connection / View provenance / Run conformance tests / Disable adapter |

Trust class is treated as a property of the source throughout: a Blueprint that
requires a verified oracle will not accept an indexed source in its place, and
no control on this page can raise a source's trust class.

## ⬜ Remaining phases — 4 phases plus landing polish

| Phase | Scope | Pages |
|---|---|---|
| **FE-6** ← next | Deployment | Preflight, cost estimate, deployment progress (§20) — **wallet connect lands here** |
| **FE-7** | Live operations | Overview (§21), Activity (§22), Policies (§23), Runtime (§24), Control Plane (§25), Chainlink CRE (§26), Identity/ENS (§27) |
| **FE-8** | Context Agent | page context envelopes, selections and proposed patches across every page (§39) |
| **FE-9** | Output + polish | Safety Reports (§28), Settings (§29), a11y (§45), responsive monitoring mode (§46) |
| **Landing** | Polish pass | last, by explicit decision |

**Current page count:** 13 built (Projects, New project, Composer, Organization,
Blueprint, Architecture, Permissions, Simulation, Reality Lab, Attack Lab, Code,
Integrations) · 10 navigable but not yet built, each rendering the shared
`PendingSurface`.

---

## House rules

Learned the hard way. Check these *before* writing a page, not after.

### The landing page's CSS is global and it leaks

`inline.css` and `webflow.css` style bare elements for the marketing site and
apply to everything, including the workbench.

- `section { padding: 30rem 0; width: 100vw }` → phantom gaps and right-side
  overflow inside any centred column.
- `* { font-weight: 100; line-height: 100%; color: var(--color) }`.
- `h1`–`h6` at 38px/bold with top margins, `label` bold+block, `ul/ol` padded
  40px, `dd` indented 40px.
- `html { font-size: calc(100vw / 1920 * 10) }` → 1rem ≈ 7.5px at 1440px wide.

All are neutralised inside `.cl-studio`. **Never use `rem` in workbench CSS** —
the root size is not what you think. Workbench pages pin `html` to 16px via
`html:has(.cl-studio)` so third-party rem-based CSS (RainbowKit) renders sanely.

### Specificity: element resets must use `:where()`

`.cl-studio button { color: inherit }` is **(0,1,1)** and silently outranks every
component class at **(0,1,0)** — `.cl-btn-primary`, `.cl-rail-btn`,
`.cl-palette-item`. The symptom is components ignoring their own colour and
inheriting their parent's. Always write `.cl-studio :where(button) { … }`.

For the same reason, never colour a region with `.region * { color: … }`: it
captures popovers and dialogs rendered inside that region. Set colour on the
region and let it inherit, then re-assert it on any surface with its own ground.

### A flex child must be told to fill its wrapper

The shell sizes panels on a wrapper div. A panel that is only
`display: flex; flex-direction: column` sizes to its **content**, leaving dead
space or clipping. Every panel needs `flex: 1 1 auto; width: 100%`. This bit the
explorer, the agent sidebar and the bottom panel separately.

### `white-space: nowrap` belongs on toolbar buttons only

`.cl-btn` is nowrap so toolbars do not ragged-wrap. A full-width button holding a
sentence must override it, or it forces its container wider than the viewport.
Use `.cl-btn-block`, which wraps and left-aligns.

### The verdict palette is tuned for the cream ground

`--cl-pass` / `--cl-warn` and friends are dark inks. On the navy chrome bars they
are nearly unreadable, so badges there switch to outline form with light-end
hues. If a new surface has a dark ground, it needs the same treatment.

### Per-agent data is not optional

Agents are distinct principals. Anything rendered per-agent — architecture,
blueprint, permissions, budgets — must be derived from the selected agent. A
shared graph made Reporter appear to have an execution path, contradicting
Organization and Permissions. **Blueprint and Permissions still render
Guardian's data for every agent** and should be made per-agent as those phases
are revisited.

When data varies by agent, the memo that builds it must depend on the agent, and
any selection keyed to the old data must reset.

### Keep the wallet lazy

wagmi + RainbowKit + viem + WalletConnect is ~7,000 modules. Mounted in the
layout it made every route compile all of it (~20s per page in dev, which does
not tree-shake). It lives in `components/studio/wallet/` behind `dynamic()`.

Providers do belong in a layout — just never the **root** one, since a layout's
module graph compiles for every route beneath it. The correct home is a nested
layout scoped to the routes that need it (`deploy/layout.tsx`,
`policies/layout.tsx`), which keeps React context working normally while only
those routes pay the cost.

### Product copy, not build notes

No phase numbers, no "in progress", no framework names in anything a user reads.
An unbuilt page says what it is for and that it is not available — nothing else.
Never show a healthy or green state for something that does not exist yet.

### Repo

- Commit messages carry **no Claude attribution trailers**.
- `.gitignore` patterns for build output must be **anchored** (`/build/`, not
  `build/`) — an unanchored pattern matched the `app/.../build/` route segment
  and silently dropped a real page from a commit.
- `npm run dev` uses Turbopack; `npm run dev:webpack` is the fallback. After
  switching between them, `rm -rf .next` or the production build fails with
  `Cannot find module for page: /`.
- **Never `rm -rf .next` while a dev server is running.** It deletes the running
  server's Turbopack runtime out from under it; the dev server then throws
  `Cannot find module '../chunks/ssr/[turbopack]_runtime.js'` and has to be
  restarted. Run `tsc --noEmit` to check work instead, or ask before clearing.

### Working agreement

Build one phase, stop, and let the UI be reviewed before starting the next.

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
