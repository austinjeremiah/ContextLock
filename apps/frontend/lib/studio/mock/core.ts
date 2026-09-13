/**
 * Mock backend — core project shell.
 *
 * Everything the workbench chrome needs: project, agents, environment,
 * revisions, blockers, problems, settings. Replace this module with real API
 * calls and the UI is unchanged.
 */
import type {
  Agent,
  Blocker,
  Environment,
  Freshness,
  ProblemItem,
  Project,
  ProjectSummary,
  RevisionSet,
  StudioSettings,
  TestResult,
} from '../types';

/** Fixed clock so mock timestamps stay stable between renders / SSR + client. */
export const NOW = new Date('2026-09-11T10:42:18.000Z');

export function isoAgo(seconds: number): string {
  return new Date(NOW.getTime() - seconds * 1000).toISOString();
}

export function fresh(source: string, ageSeconds: number, ttlSeconds = 30): Freshness {
  return {
    source,
    observedAt: isoAgo(ageSeconds),
    ttlSeconds,
    state: ageSeconds <= ttlSeconds ? 'FRESH' : 'STALE',
    lastSuccessfulAt: isoAgo(ageSeconds),
    staleReason: ageSeconds > ttlSeconds ? 'Observation older than time-to-live' : undefined,
  };
}

export function unknownFreshness(source: string, reason = 'Never synchronized'): Freshness {
  return { source, observedAt: null, ttlSeconds: 30, state: 'UNKNOWN', lastSuccessfulAt: null, staleReason: reason };
}

export function unavailableFreshness(source: string, reason: string): Freshness {
  return { source, observedAt: null, ttlSeconds: 30, state: 'UNAVAILABLE', lastSuccessfulAt: null, staleReason: reason };
}

/* ------------------------------------------------------------------- agents */

export const AGENTS: Agent[] = [
  {
    id: 'agt_guardian',
    name: 'Guardian',
    slug: 'guardian',
    role: 'Liquidation guardian',
    objective: 'Prevent liquidation of the treasury Aave position by repaying debt when health factor falls.',
    status: 'HEALTHY',
    executionClass: 'WRITE_CAPABLE',
    ensName: 'guardian.treasury.ctxlock.eth',
    ensNode: '0x9f2c4b8e1d7a3f56c0b9e84a2d1f7c36b5a0e9d8c7f4a1b2e3d6c5a4b7f8e9d0',
    address: '0x7A3c9F21bE45d80C1f6a2B4e5D8c7A9b0E3f1C24',
    allowedAdapters: ['adp_chainlink_feeds', 'adp_aave_v3', 'adp_sepolia_rpc', 'adp_mainnet_read'],
    budget: { autonomousPerAction: 1000, windowLimit: 5000, windowUsed: 1450, window: '24h' },
    orgBudgetImpact: 5000,
    policyHash: '0xCBd94f1a7e2c8b05d3f6a91e4c7b2d8f0a5e93c16b4d7f28a0c9e5b1d3f67f24',
    runtimeRevision: 3,
    parentId: null,
  },
  {
    id: 'agt_rebalancer',
    name: 'Rebalancer',
    slug: 'rebalancer',
    role: 'Portfolio rebalancer',
    objective: 'Maintain the target collateral ratio across approved venues within the daily budget.',
    status: 'PAUSED',
    executionClass: 'WRITE_CAPABLE',
    ensName: 'rebalancer.treasury.ctxlock.eth',
    ensNode: '0x4a1b7e9c2d5f8036a4b1c7e0d9f2a5b8c3e6d1f4a7b0c9e2d5f8a1b4c7e0d9f2',
    address: '0x2F81aC46dE93b7051c8A4f6E2d0B9c73A1e5F824',
    allowedAdapters: ['adp_chainlink_feeds', 'adp_uniswap_v3', 'adp_sepolia_rpc'],
    budget: { autonomousPerAction: 500, windowLimit: 2500, windowUsed: 0, window: '24h' },
    orgBudgetImpact: 2500,
    policyHash: '0x3e7d1a9c5b2f8460d7a3c9e1b5f2d8a0c6e4b9f1d3a7c0e5b8f2d6a9c1e4b7f0',
    runtimeRevision: 2,
    parentId: null,
  },
  {
    id: 'agt_reporter',
    name: 'Reporter',
    slug: 'reporter',
    role: 'Treasury reporter',
    objective: 'Produce read-only treasury position summaries. Holds no execution authority of any kind.',
    status: 'READY',
    executionClass: 'REPORTING_ONLY',
    ensName: 'reporter.treasury.ctxlock.eth',
    ensNode: '0x8c5f2a1e7b4d9036f1a8c3e5b7d0f2a4c6e8b1d3f5a7c9e0b2d4f6a8c1e3b5d7',
    address: '0x9D07bF35cA21e846B7f0a3C9d2E5b8F14a6C0E37',
    allowedAdapters: ['adp_the_graph', 'adp_mainnet_read'],
    budget: { autonomousPerAction: 0, windowLimit: 0, windowUsed: 0, window: '24h' },
    orgBudgetImpact: 0,
    policyHash: '0x1d4a7c0e3b6f9025a8c1e4b7d0f3a6c9e2b5d8f1a4c7e0b3d6f9a2c5e8b1d4f7',
    runtimeRevision: null,
    parentId: null,
  },
];

export function agentBySlug(slug: string | null | undefined): Agent {
  return AGENTS.find((a) => a.slug === slug) ?? AGENTS[0];
}

export function agentById(id: string | null | undefined): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}

/* -------------------------------------------------------------- environment */

export const ENVIRONMENT: Environment = {
  executionNetwork: 'Ethereum Sepolia',
  executionChainId: 11155111,
  realitySource: 'Ethereum Mainnet',
  realityMode: 'LIVE_MAINNET_MIRROR',
  mainnetWrites: 'PROHIBITED',
  creMode: 'CONTEXTLOCK_SIMULATOR',
  label: 'TESTNET LAB',
};

export const REVISIONS: RevisionSet = {
  requirements: 6,
  blueprint: 8,
  blueprintDraft: null,
  strategy: 8,
  build: 7,
  deployment: 3,
  runtime: 3,
  policy: 8,
  creArtifactHash: '0x6b1f83c4a09e27d5b8f1c4a70e3d96b2f5a8c1e04d7b3f6a9c2e5b8d1f4a7c0e',
};

export const BLOCKERS: Blocker[] = [
  {
    id: 'BLK-114',
    title: 'The Graph adapter cannot authenticate',
    detail:
      'The Graph adapter is configured but its API key is missing, so no indexed data is being served. No other source is being substituted for it.',
    severity: 'HIGH',
    surface: 'integrations',
    actionLabel: 'Configure Credential',
    actionHref: '/integrations',
  },
  {
    id: 'BLK-117',
    title: 'Historical Replay requires an archive RPC',
    detail:
      'No archive node endpoint is registered, so Historical Replay can only serve the most recent 128 blocks and is reported as LIMITED.',
    severity: 'MEDIUM',
    surface: 'reality',
    actionLabel: 'Open Reality Lab',
    actionHref: '/reality',
  },
];

/* ------------------------------------------------------------------ project */

export const PROJECT: Project = {
  id: 'prj_treasury_guardian',
  name: 'Treasury Guardian',
  description:
    'Aave liquidation guardian for the Sepolia treasury, with a rebalancer and a read-only reporter operating as separate principals.',
  agentCount: AGENTS.length,
  lifecycle: 'ACTIVE',
  lastRevision: 8,
  executionNetwork: 'Ethereum Sepolia',
  creMode: 'CONTEXTLOCK_SIMULATOR',
  updatedAt: isoAgo(420),
  alerts: 1,
  organization: 'Treasury Department',
  agents: AGENTS,
  revisions: REVISIONS,
  environment: ENVIRONMENT,
  blockers: BLOCKERS,
};

export const PROJECT_LIST: ProjectSummary[] = [
  {
    id: PROJECT.id,
    name: PROJECT.name,
    description: PROJECT.description,
    agentCount: 3,
    lifecycle: 'ACTIVE',
    lastRevision: 8,
    executionNetwork: 'Ethereum Sepolia',
    creMode: 'CONTEXTLOCK_SIMULATOR',
    updatedAt: isoAgo(420),
    alerts: 1,
    organization: 'Treasury Department',
  },
  {
    id: 'prj_yield_router',
    name: 'Yield Router',
    description: 'Routes idle stablecoin balances between approved lending venues under a hard per-action ceiling.',
    agentCount: 1,
    lifecycle: 'BUILT',
    lastRevision: 4,
    executionNetwork: 'Base Sepolia',
    creMode: 'MY_CRE_SIMULATOR',
    updatedAt: isoAgo(86400 * 2 + 3600),
    alerts: 0,
    organization: 'Treasury Department',
  },
  {
    id: 'prj_bridge_sentinel',
    name: 'Bridge Sentinel',
    description: 'Cross-chain transfer watcher that escalates any destination outside the approved allowlist.',
    agentCount: 2,
    lifecycle: 'DRAFT',
    lastRevision: 1,
    executionNetwork: 'Ethereum Sepolia',
    creMode: 'NONE',
    updatedAt: isoAgo(86400 * 9),
    alerts: 0,
    organization: null,
  },
  {
    id: 'prj_payroll_agent',
    name: 'Payroll Agent',
    description: 'Scheduled stablecoin disbursement to a fixed recipient set with mandatory escalation above band.',
    agentCount: 1,
    lifecycle: 'DEPLOYED',
    lastRevision: 5,
    executionNetwork: 'Ethereum Sepolia',
    creMode: 'CONTEXTLOCK_SIMULATOR',
    updatedAt: isoAgo(86400 * 4),
    alerts: 2,
    organization: 'Operations',
  },
];

export const PROJECT_TEMPLATES = [
  {
    id: 'tpl_aave_guardian',
    name: 'Aave Liquidation Guardian',
    description: 'Watches a lending position and repays debt within a hard ceiling when the health factor falls.',
    protocols: ['Aave v3', 'Chainlink Data Feeds'],
  },
  {
    id: 'tpl_rebalancer',
    name: 'Collateral Rebalancer',
    description: 'Maintains a target collateral ratio across approved venues inside a daily budget.',
    protocols: ['Uniswap v3', 'Chainlink Data Feeds'],
  },
  {
    id: 'tpl_reporter',
    name: 'Read-only Reporter',
    description: 'Produces position and risk summaries. Execution class is NONE and can never be widened in place.',
    protocols: ['The Graph', 'Mainnet RPC'],
  },
  {
    id: 'tpl_blank',
    name: 'Blank project',
    description: 'Start from a description with no preset protocols, actions or authority.',
    protocols: [],
  },
];

/* ------------------------------------------------------- problems and tests */

export const PROBLEMS: ProblemItem[] = [
  {
    id: 'PRB-1',
    severity: 'HIGH',
    message: 'The Graph data source is UNAVAILABLE',
    detail: 'Adapter adp_the_graph cannot authenticate. Indexed position history is not being served and is not substituted.',
    resource: 'adapter · the-graph',
    href: '/integrations',
  },
  {
    id: 'PRB-2',
    severity: 'MEDIUM',
    message: 'Historical Replay is LIMITED',
    detail: 'No archive RPC registered; replay is restricted to the most recent 128 blocks.',
    resource: 'reality · historical-replay',
    href: '/reality',
  },
];

export const TEST_RESULTS: TestResult[] = [
  { id: 'tst_1', suite: 'policy', name: 'denies recipient outside allowlist', status: 'PASS', durationMs: 42 },
  { id: 'tst_2', suite: 'policy', name: 'denies amount above hard ceiling', status: 'PASS', durationMs: 38 },
  { id: 'tst_3', suite: 'policy', name: 'escalates amount inside escalation band', status: 'PASS', durationMs: 40 },
  { id: 'tst_4', suite: 'capability', name: 'rejects replayed capability nonce', status: 'PASS', durationMs: 55 },
  { id: 'tst_5', suite: 'capability', name: 'rejects expired capability', status: 'PASS', durationMs: 51 },
  { id: 'tst_6', suite: 'data', name: 'denies decision on stale oracle round', status: 'PASS', durationMs: 61 },
  {
    id: 'tst_7',
    suite: 'data',
    name: 'denies decision when indexed source is unavailable',
    status: 'FAIL',
    durationMs: 74,
    failure:
      'Expected DENY with DATA_SOURCE_UNAVAILABLE; adapter adp_the_graph returned UNAVAILABLE before the policy layer was reached.',
  },
  { id: 'tst_8', suite: 'network', name: 'refuses mainnet write target', status: 'PASS', durationMs: 33 },
];

/** Log severity, so the output panel can read as a log rather than a wall of one colour. */
export type LogLevel = 'info' | 'step' | 'pass' | 'fail' | 'warn';

export interface LogLine {
  time: string;
  scope: string;
  message: string;
  level: LogLevel;
}

export const OUTPUT_LOG: LogLine[] = [
  { time: '10:31:02', scope: 'build r7', message: 'resolving blueprint r8', level: 'step' },
  { time: '10:31:03', scope: 'build r7', message: 'generating agent modules (6 files)', level: 'step' },
  { time: '10:31:05', scope: 'build r7', message: 'generating contextlock policy module', level: 'step' },
  {
    time: '10:31:07',
    scope: 'build r7',
    message: 'generating adapter bindings: chainlink-data-feeds, aave-v3, sepolia-rpc',
    level: 'step',
  },
  { time: '10:31:09', scope: 'build r7', message: 'compiling CRE workflow to wasm', level: 'step' },
  { time: '10:31:14', scope: 'build r7', message: 'wasm hash 0x6b1f83c4…f4a7c0e', level: 'info' },
  {
    time: '10:31:15',
    scope: 'build r7',
    message: 'running mandatory security regression (24 scenarios)',
    level: 'step',
  },
  { time: '10:31:41', scope: 'build r7', message: '23 passed · 1 failed (DATA_SOURCE_UNAVAILABLE)', level: 'fail' },
  {
    time: '10:31:41',
    scope: 'build r7',
    message: 'artifact retained; deployment gate requires a clean security regression',
    level: 'warn',
  },
  { time: '10:31:41', scope: 'build r7', message: 'BUILD COMPLETE with findings', level: 'warn' },
];

/** Flat text form, used for copy and for the sanitized log download. */
export function logAsText(lines: LogLine[]): string {
  return lines.map((l) => `[${l.time}] ${l.scope} · ${l.message}`).join('\n');
}

/* ------------------------------------------------------------------ settings */

export const SETTINGS: StudioSettings = {
  project: {
    name: PROJECT.name,
    description: PROJECT.description,
    organization: 'Treasury Department',
    defaultAgentId: 'agt_guardian',
  },
  appearance: { theme: 'light', density: 'comfortable', editorFontSize: 13 },
  simulationLimits: { userRunsPerDay: 200, userRunsUsed: 47, mandatoryRegressionRuns: 24, serverEnforced: true },
  runtime: { autoRestart: true, restartBackoffSeconds: 15, logRetentionDays: 14 },
  notifications: { criticalAlerts: true, deploymentEvents: true, simulationFailures: true, weeklyDigest: false },
  developerMode: {
    enabled: false,
    showRawIds: false,
    showRawJson: false,
    constrainedTerminal: false,
    verboseEvents: false,
  },
};
