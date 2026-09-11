/**
 * Mock backend — design surfaces.
 *
 * Blueprint (19 canonical sections), Architecture graph and the deterministic
 * permission model. The draft revision deliberately contains one
 * authority-increasing change and one tightening change so the Blueprint page
 * can demonstrate that it distinguishes them.
 */
import { fresh, unavailableFreshness } from './core';
import type {
  ArchEdge,
  ArchNode,
  ArchitectureGraph,
  Blueprint,
  BlueprintSection,
  PermissionsModel,
  ValidationFinding,
} from '../types';

/* --------------------------------------------------------------- blueprint */

const SECTIONS: BlueprintSection[] = [
  {
    id: 'identity',
    index: 1,
    title: 'Identity',
    summary: 'Who this agent is, as a distinct principal.',
    fields: [
      { key: 'agent.name', label: 'Agent name', value: 'Guardian', editable: true },
      { key: 'agent.slug', label: 'Slug', value: 'guardian', mono: true },
      { key: 'agent.principal', label: 'Principal class', value: 'INDEPENDENT', hint: 'Never shares a policy with another agent.' },
      { key: 'agent.address', label: 'Agent address', value: '0x7A3c9F21bE45d80C1f6a2B4e5D8c7A9b0E3f1C24', mono: true },
      { key: 'agent.operator', label: 'Operator', value: 'operator@treasury' },
    ],
  },
  {
    id: 'objective',
    index: 2,
    title: 'Objective',
    summary: 'The single purpose this agent exists to serve.',
    fields: [
      {
        key: 'objective.statement',
        label: 'Objective',
        value: 'Prevent liquidation of the treasury Aave v3 position by repaying USDC debt when the health factor falls below threshold.',
        editable: true,
      },
      { key: 'objective.successCriteria', label: 'Success criteria', value: 'Health factor restored above 1.30 without exceeding any authority limit.' },
      { key: 'objective.nonGoals', label: 'Non-goals', value: 'Yield optimization · position sizing · collateral management' },
    ],
  },
  {
    id: 'protocols',
    index: 3,
    title: 'Protocols',
    summary: 'The exact venues this agent may interact with.',
    fields: [
      { key: 'protocols.primary', label: 'Primary protocol', value: 'Aave v3' },
      { key: 'protocols.market', label: 'Market', value: 'Ethereum Sepolia core market', mono: true },
      { key: 'protocols.pool', label: 'Pool address', value: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951', mono: true },
      { key: 'protocols.forbidden', label: 'Forbidden venues', value: 'Every venue not listed above' },
    ],
  },
  {
    id: 'assets',
    index: 4,
    title: 'Assets',
    summary: 'Which assets may be read and which may be moved.',
    fields: [
      { key: 'assets.readable', label: 'Readable', value: 'WETH · USDC · aEthWETH · variableDebtUSDC' },
      { key: 'assets.movable', label: 'Movable', value: 'USDC only' },
      { key: 'assets.source', label: 'Source of funds', value: 'Treasury safe · 0x4E81bA07c9F3d2610a8B5e7C4d9F02a6B3c1E58D', mono: true },
      { key: 'assets.forbidden', label: 'Never movable', value: 'Collateral (aEthWETH), any asset not listed as movable' },
    ],
  },
  {
    id: 'triggers',
    index: 5,
    title: 'Triggers',
    summary: 'What causes this agent to evaluate an action.',
    fields: [
      { key: 'triggers.primary', label: 'Primary trigger', value: 'Health factor < 1.25', editable: true },
      { key: 'triggers.evaluationInterval', label: 'Evaluation interval', value: '60 seconds' },
      { key: 'triggers.cooldown', label: 'Cooldown after action', value: '300 seconds' },
      { key: 'triggers.manual', label: 'Manual trigger', value: 'Permitted — subject to identical policy evaluation' },
    ],
  },
  {
    id: 'actions',
    index: 6,
    title: 'Actions',
    summary: 'The complete set of actions this agent can ever attempt.',
    fields: [
      { key: 'actions.allowed', label: 'Allowed actions', value: 'repayDebt(USDC)' },
      { key: 'actions.denied', label: 'Denied actions', value: 'borrow · withdrawCollateral · supply · transfer · approve(unbounded)' },
      { key: 'actions.recipient', label: 'Permitted recipient', value: 'Aave v3 Pool only' },
      { key: 'actions.calldataShape', label: 'Calldata constraint', value: 'Exact function selector and argument shape pinned at build time', mono: true },
    ],
  },
  {
    id: 'permissions',
    index: 7,
    title: 'Permissions',
    summary: 'The authority envelope in one place.',
    fields: [
      { key: 'permissions.model', label: 'Model', value: 'ALLOW / ESCALATE / DENY with a hard ceiling' },
      { key: 'permissions.defaultVerdict', label: 'Default verdict', value: 'DENY', hint: 'Anything not explicitly allowed is denied.' },
      { key: 'permissions.reviewer', label: 'Escalation reviewer', value: 'operator@treasury' },
    ],
  },
  {
    id: 'autonomous-policy',
    index: 8,
    title: 'Autonomous policy',
    summary: 'What the agent may do with no human in the loop.',
    fields: [
      {
        key: 'autonomous.maxAmountPerAction',
        label: 'Max amount per action',
        value: '$1,500',
        previousValue: '$1,000',
        authorityExpansion: true,
        authorityNote: 'Agent may autonomously move an additional $500 per action.',
        editable: true,
      },
      { key: 'autonomous.windowLimit', label: 'Rolling window limit', value: '$5,000 per 24h', editable: true },
      { key: 'autonomous.maxActionsPerWindow', label: 'Max actions per window', value: '6' },
      { key: 'autonomous.requiresFreshData', label: 'Requires fresh data', value: 'Yes — refuses to act on stale sources' },
    ],
  },
  {
    id: 'escalation-policy',
    index: 9,
    title: 'Escalation policy',
    summary: 'What requires a human decision before it can proceed.',
    fields: [
      { key: 'escalation.band', label: 'Escalation band', value: '$1,500 – $5,000', previousValue: '$1,000 – $5,000', editable: true },
      { key: 'escalation.approver', label: 'Approver', value: 'operator@treasury' },
      { key: 'escalation.timeout', label: 'Approval timeout', value: '15 minutes, then the request expires unexecuted' },
      { key: 'escalation.channel', label: 'Notification channel', value: 'Studio alert + email' },
    ],
  },
  {
    id: 'confidential-policy',
    index: 10,
    title: 'Confidential policy',
    summary: 'What must never leave the trust boundary.',
    fields: [
      { key: 'confidential.fields', label: 'Confidential fields', value: 'Position size · strategy thresholds · approval identities' },
      { key: 'confidential.evidence', label: 'Evidence class', value: 'Hash-only disclosure in reports' },
      { key: 'confidential.modelContext', label: 'Model context', value: 'Confidential values are never placed in model context' },
    ],
  },
  {
    id: 'data-requirements',
    index: 11,
    title: 'Data requirements',
    summary: 'What data must be true before a decision can be made.',
    fields: [
      { key: 'data.price', label: 'Price source', value: 'Chainlink ETH/USD · VERIFIED_ORACLE' },
      { key: 'data.maxPriceAge', label: 'Max price age', value: '60 seconds', previousValue: '90 seconds', authorityNote: 'Tighter freshness requirement — reduces authority.', editable: true },
      { key: 'data.position', label: 'Position source', value: 'Aave v3 Pool · direct chain read' },
      { key: 'data.history', label: 'Historical context', value: 'The Graph · INDEXED', hint: 'Currently UNAVAILABLE — see Integrations.' },
      { key: 'data.substitution', label: 'Substitution policy', value: 'Never substitute a lower trust class for a required source' },
    ],
  },
  {
    id: 'capability-policy',
    index: 12,
    title: 'Capability policy',
    summary: 'How a single authorization is minted, bounded and spent.',
    fields: [
      { key: 'capability.expiry', label: 'Capability expiry', value: '120 seconds' },
      { key: 'capability.nonce', label: 'Nonce', value: 'Single-use, monotonic per agent' },
      { key: 'capability.binding', label: 'Bound to', value: 'action · amount · recipient · target · chain id' },
      { key: 'capability.replay', label: 'Replay handling', value: 'Spent nonce is rejected by the executor' },
    ],
  },
  {
    id: 'ens',
    index: 13,
    title: 'ENS',
    summary: 'Identity and revocation namespace.',
    fields: [
      { key: 'ens.name', label: 'ENS name', value: 'guardian.treasury.ctxlock.eth', mono: true },
      { key: 'ens.parent', label: 'Parent namespace', value: 'treasury.ctxlock.eth', mono: true },
      { key: 'ens.revocation', label: 'Revocation authority', value: 'Namespace owner' },
      { key: 'ens.role', label: 'Role', value: 'Identity only — ENS never encodes financial permission' },
    ],
  },
  {
    id: 'cre',
    index: 14,
    title: 'CRE',
    summary: 'Chainlink Runtime Environment configuration.',
    fields: [
      { key: 'cre.mode', label: 'Mode', value: 'ContextLock Simulator (official CLI)' },
      { key: 'cre.required', label: 'Required for execution', value: 'Yes — strategy output must pass CRE evaluation' },
      { key: 'cre.donClaims', label: 'DON / TEE claims', value: 'None — simulator produces no DON or TEE evidence' },
      { key: 'cre.wasmHash', label: 'Workflow hash', value: '0x6b1f83c4a09e27d5b8f1c4a70e3d96b2f5a8c1e04d7b3f6a9c2e5b8d1f4a7c0e', mono: true },
    ],
  },
  {
    id: 'ledger',
    index: 15,
    title: 'Ledger / elevation',
    summary: 'How an escalated action is recorded and elevated.',
    fields: [
      { key: 'ledger.record', label: 'Record', value: 'Every decision, approved or refused, is appended with its reason code' },
      { key: 'ledger.elevation', label: 'Elevation path', value: 'Human approval mints a single bounded capability — never a standing permission' },
      { key: 'ledger.retention', label: 'Retention', value: '90 days of sanitized decision records' },
    ],
  },
  {
    id: 'execution-networks',
    index: 16,
    title: 'Execution networks',
    summary: 'Where transactions may be submitted.',
    fields: [
      { key: 'networks.execution', label: 'Execution network', value: 'Ethereum Sepolia · chain id 11155111' },
      { key: 'networks.reality', label: 'Market data source', value: 'Ethereum Mainnet · READ ONLY' },
      { key: 'networks.mainnetWrites', label: 'Production-chain writes', value: 'PROHIBITED', hint: 'Enforced by the execution network guard, not by prompt.' },
      { key: 'networks.fork', label: 'Local fork', value: 'Permitted for testing; fork transactions are never presented as public' },
    ],
  },
  {
    id: 'simulation-requirements',
    index: 17,
    title: 'Simulation requirements',
    summary: 'What must be proved before this agent may be deployed.',
    fields: [
      { key: 'simulation.mandatory', label: 'Mandatory scenarios', value: '24 security regression scenarios' },
      { key: 'simulation.gate', label: 'Deployment gate', value: 'A clean mandatory regression is required' },
      { key: 'simulation.attacks', label: 'Required attacks', value: 'Prompt injection · amount, recipient and target mutation · replay · expiry · stale oracle · mainnet write' },
    ],
  },
  {
    id: 'generated-modules',
    index: 18,
    title: 'Generated modules / adapters',
    summary: 'What the build produces from this Blueprint.',
    fields: [
      { key: 'modules.agent', label: 'Agent modules', value: 'strategy.ts · triggers.ts · decision.ts', mono: true },
      { key: 'modules.contextlock', label: 'ContextLock modules', value: 'policy.sol · capability.ts · guard.ts', mono: true },
      { key: 'modules.adapters', label: 'Adapter bindings', value: 'chainlink-data-feeds · aave-v3 · sepolia-rpc', mono: true },
      { key: 'modules.cre', label: 'CRE workflow', value: 'workflow.wasm', mono: true },
    ],
  },
  {
    id: 'security-assertions',
    index: 19,
    title: 'Security assertions',
    summary: 'Invariants that must hold for this Blueprint to be valid.',
    fields: [
      { key: 'assert.ceiling', label: 'Hard ceiling exists', value: '$5,000 — stated explicitly, never inferred' },
      { key: 'assert.defaultDeny', label: 'Default deny', value: 'Any action not explicitly allowed is denied' },
      { key: 'assert.noMainnetWrite', label: 'No production-chain write path', value: 'Asserted at build and re-checked at deploy' },
      { key: 'assert.identitySeparate', label: 'Identity separate from authority', value: 'ENS never grants financial permission' },
      { key: 'assert.freshness', label: 'No decision on stale data', value: 'Asserted for every required source' },
    ],
  },
];

const FINDINGS: ValidationFinding[] = [
  {
    id: 'BP-114',
    group: 'trust-freshness',
    severity: 'HIGH',
    message: 'Required indexed source is unavailable',
    detail:
      'data.history requires The Graph at trust class INDEXED, but the adapter cannot authenticate. No substitution is permitted, so decisions depending on historical context will be refused.',
    sectionId: 'data-requirements',
    fieldKey: 'data.history',
  },
  {
    id: 'BP-207',
    group: 'security-invariant',
    severity: 'MEDIUM',
    message: 'Autonomous limit increased without a matching simulation',
    detail:
      'autonomous.maxAmountPerAction was raised from $1,000 to $1,500. The boundary scenarios proving the old limit were built against Blueprint r8 and are now stale.',
    sectionId: 'autonomous-policy',
    fieldKey: 'autonomous.maxAmountPerAction',
  },
  {
    id: 'BP-301',
    group: 'adapter-compatibility',
    severity: 'LOW',
    message: 'Adapter version pin trails the registered adapter',
    detail: 'chainlink-data-feeds is pinned to 1.4.0; 1.4.2 is registered. Re-pinning requires a rebuild.',
    sectionId: 'generated-modules',
    fieldKey: 'modules.adapters',
  },
];

export const BLUEPRINT: Blueprint = {
  revision: 8,
  status: 'VALID',
  isDraft: false,
  baseRevision: 7,
  sections: SECTIONS.map((section) => ({
    ...section,
    // The published revision carries no pending changes.
    fields: section.fields.map(({ previousValue, authorityExpansion, authorityNote, ...rest }) => ({
      ...rest,
      // published values reflect r8: revert the draft-only edits
      value:
        rest.key === 'autonomous.maxAmountPerAction'
          ? '$1,000'
          : rest.key === 'escalation.band'
            ? '$1,000 – $5,000'
            : rest.key === 'data.maxPriceAge'
              ? '90 seconds'
              : rest.value,
    })),
  })),
  findings: [FINDINGS[0]],
  raw: { revision: 8, agent: 'guardian', sections: SECTIONS.length },
};

export const BLUEPRINT_DRAFT: Blueprint = {
  revision: 9,
  status: 'DRAFT',
  isDraft: true,
  baseRevision: 8,
  sections: SECTIONS,
  findings: FINDINGS,
  raw: { revision: 9, agent: 'guardian', sections: SECTIONS.length, draft: true },
};

export const VALIDATION_GROUP_LABEL: Record<string, string> = {
  schema: 'Schema',
  'security-invariant': 'Security invariant',
  'missing-required': 'Missing required information',
  'trust-freshness': 'Trust / freshness',
  'adapter-compatibility': 'Adapter compatibility',
  'execution-network': 'Execution network',
};

/** Surfaces invalidated when the Blueprint changes (spec §36). */
export const STALE_ON_BLUEPRINT_CHANGE = [
  { surface: 'Strategy', detail: 'Regenerated from the new revision.' },
  { surface: 'Build', detail: 'Build r7 no longer corresponds to the Blueprint.' },
  { surface: 'Simulation', detail: 'All runs built against r8 become STALE.' },
  { surface: 'Code', detail: 'Generated files must be rebuilt.' },
  { surface: 'Deployment', detail: 'Stays on r3 until you deploy again — not invalidated.' },
];

/* ------------------------------------------------------------ architecture */

const NODES: ArchNode[] = [
  {
    id: 'operator',
    position: { x: 0, y: 40 },
    data: {
      kind: 'operator',
      label: 'Operator',
      purpose: 'Defines authority, reviews escalations and holds every deterministic control.',
      networkRole: 'OFF_CHAIN',
      status: 'ACTIVE',
      layers: ['identity', 'policy'],
      blueprintSection: 'permissions',
      capabilities: ['Approve escalation', 'Enable/disable policy', 'Emergency lock'],
    },
  },
  {
    id: 'ens',
    position: { x: 0, y: 210 },
    data: {
      kind: 'ens',
      label: 'ENS Identity',
      purpose: 'Names the agent and provides the revocation path. Grants no financial permission.',
      adapter: 'ens-resolver',
      version: '1.2.0',
      networkRole: 'EXECUTION_TESTNET',
      status: 'ACTIVE',
      liveStatus: 'HEALTHY',
      freshness: fresh('ENS resolver · Sepolia', 12, 60),
      ref: { label: 'guardian.treasury.ctxlock.eth', value: '0x9f2c4b8e1d7a3f56c0b9e84a2d1f7c36b5a0e9d8c7f4a1b2e3d6c5a4b7f8e9d0', kind: 'node', network: 'Ethereum Sepolia' },
      layers: ['identity', 'security-boundaries'],
      blueprintSection: 'ens',
      codePath: 'contextlock/identity.ts',
    },
  },
  {
    id: 'chainlink',
    position: { x: 300, y: -60 },
    data: {
      kind: 'chainlink-feed',
      label: 'Chainlink Data Feeds',
      purpose: 'Verified ETH/USD price used for every health-factor decision.',
      adapter: 'chainlink-data-feeds',
      version: '1.4.0',
      trustClass: 'VERIFIED_ORACLE',
      networkRole: 'MAINNET_READ_ONLY',
      status: 'HEALTHY',
      liveStatus: 'HEALTHY',
      freshness: fresh('Chainlink ETH/USD', 9, 60),
      layers: ['data'],
      blueprintSection: 'data-requirements',
      codePath: 'adapters/chainlink.ts',
      relatedSimulationId: 'sim_stale_oracle',
    },
  },
  {
    id: 'graph',
    position: { x: 300, y: 70 },
    data: {
      kind: 'the-graph',
      label: 'The Graph',
      purpose: 'Indexed position history for context. Currently unavailable.',
      adapter: 'the-graph',
      version: '0.9.3',
      trustClass: 'INDEXED',
      networkRole: 'MAINNET_READ_ONLY',
      status: 'UNAVAILABLE',
      liveStatus: 'UNAVAILABLE',
      freshness: unavailableFreshness('The Graph', 'API key required'),
      layers: ['data'],
      blueprintSection: 'data-requirements',
      codePath: 'adapters/the-graph.ts',
    },
  },
  {
    id: 'reality',
    position: { x: 300, y: 200 },
    data: {
      kind: 'reality-engine',
      label: 'Reality Engine',
      purpose: 'Assembles a coherent, anchored snapshot from every registered source.',
      networkRole: 'OFF_CHAIN',
      status: 'DEGRADED',
      liveStatus: 'DEGRADED',
      freshness: fresh('Reality Engine', 14, 60),
      layers: ['data'],
      blueprintSection: 'data-requirements',
      codePath: 'contextlock/reality.ts',
    },
  },
  {
    id: 'broker',
    position: { x: 300, y: 330 },
    data: {
      kind: 'adapter-broker',
      label: 'Adapter Broker',
      purpose: 'Mediates every external read and enforces the trust class required by the Blueprint.',
      networkRole: 'OFF_CHAIN',
      status: 'DEGRADED',
      liveStatus: 'DEGRADED',
      freshness: fresh('Adapter broker', 11),
      layers: ['data', 'security-boundaries'],
      blueprintSection: 'data-requirements',
      codePath: 'contextlock/broker.ts',
    },
  },
  {
    id: 'runtime',
    position: { x: 620, y: 130 },
    data: {
      kind: 'agent-runtime',
      label: 'Agent Runtime',
      purpose: 'Runs the generated strategy. Proposes actions; it never authorizes them.',
      version: 'r3',
      networkRole: 'OFF_CHAIN',
      status: 'STOPPED',
      liveStatus: 'STOPPED',
      freshness: fresh('Runtime supervisor', 6),
      ref: { label: 'image', value: 'sha256:9f4c72be18d305a7c6e94b2f0d81a35c7e46b9f2a0c85d13e7b6a4f90c21ab5d', kind: 'hash' },
      layers: ['runtime', 'execution'],
      blueprintSection: 'generated-modules',
      codePath: 'agent/strategy.ts',
      relatedEventIds: ['evt_000234'],
    },
  },
  {
    id: 'cre',
    position: { x: 620, y: 300 },
    data: {
      kind: 'cre',
      label: 'CRE Simulator',
      purpose: 'Official CRE CLI simulation of the workflow. Not a DON and not a TEE.',
      adapter: 'cre-cli',
      version: '0.4.2',
      trustClass: 'SIMULATED',
      networkRole: 'OFF_CHAIN',
      status: 'RUNNING',
      liveStatus: 'SIMULATED',
      freshness: fresh('CRE simulator', 8, 60),
      ref: { label: 'wasm', value: '0x6b1f83c4a09e27d5b8f1c4a70e3d96b2f5a8c1e04d7b3f6a9c2e5b8d1f4a7c0e', kind: 'hash' },
      layers: ['policy', 'runtime'],
      blueprintSection: 'cre',
      codePath: 'cre/workflow.ts',
    },
  },
  {
    id: 'policy',
    position: { x: 940, y: 210 },
    data: {
      kind: 'policy',
      label: 'ContextLock Policy',
      purpose: 'The deterministic authority boundary. Every action is allowed, escalated or denied here.',
      networkRole: 'EXECUTION_TESTNET',
      status: 'DISABLED',
      liveStatus: 'DISABLED',
      freshness: fresh('Policy registry read', 4),
      ref: { label: 'Policy Registry', value: '0xCBd9417e2c8b05d3f6a91e4c7b2d8f0a5e937F24', kind: 'address', network: 'Ethereum Sepolia' },
      layers: ['policy', 'security-boundaries', 'execution'],
      blueprintSection: 'permissions',
      codePath: 'contextlock/policy.sol',
      relatedSimulationId: 'sim_recipient_mutation',
      relatedEventIds: ['evt_000236'],
    },
  },
  {
    id: 'ledger',
    position: { x: 940, y: 40 },
    data: {
      kind: 'ledger',
      label: 'Ledger / Approval',
      purpose: 'Records every decision and carries human approval for escalated actions.',
      networkRole: 'OFF_CHAIN',
      status: 'HEALTHY',
      liveStatus: 'HEALTHY',
      freshness: fresh('Ledger', 10),
      layers: ['policy', 'identity'],
      blueprintSection: 'ledger',
      codePath: 'contextlock/ledger.ts',
    },
  },
  {
    id: 'capability',
    position: { x: 1240, y: 210 },
    data: {
      kind: 'capability',
      label: 'Capability',
      purpose: 'A single, bounded, expiring authorization for one specific action.',
      networkRole: 'EXECUTION_TESTNET',
      status: 'NOT_ISSUED',
      liveStatus: 'NOT_ISSUED',
      freshness: fresh('Capability issuer', 4),
      ref: { label: 'Capability Issuer', value: '0x31aF7c02Be95d418A6b0c3E7f2D5a9B4c8E16034', kind: 'address', network: 'Ethereum Sepolia' },
      capabilities: ['action', 'amount', 'recipient', 'target', 'chain id', 'nonce', 'expiry'],
      layers: ['policy', 'execution', 'security-boundaries'],
      blueprintSection: 'capability-policy',
      codePath: 'contextlock/capability.ts',
      relatedSimulationId: 'sim_replay',
    },
  },
  {
    id: 'executor',
    position: { x: 1540, y: 210 },
    data: {
      kind: 'executor',
      label: 'Executor',
      purpose: 'Submits the transaction. Refuses anything without a valid, unspent capability.',
      networkRole: 'EXECUTION_TESTNET',
      status: 'READY',
      liveStatus: 'READY',
      freshness: fresh('Executor', 5),
      ref: { label: 'Executor', value: '0x8B2e5D41cF07a936B1d4A8e0C5f3B7a209E64C1F', kind: 'address', network: 'Ethereum Sepolia' },
      layers: ['execution', 'security-boundaries'],
      blueprintSection: 'execution-networks',
      codePath: 'contextlock/executor.ts',
      relatedSimulationId: 'sim_wrong_chain',
    },
  },
  {
    id: 'aave',
    position: { x: 1840, y: 130 },
    data: {
      kind: 'aave',
      label: 'Aave v3 Pool',
      purpose: 'The only contract this agent may write to.',
      adapter: 'aave-v3',
      version: '3.1.0',
      networkRole: 'EXECUTION_TESTNET',
      status: 'HEALTHY',
      liveStatus: 'HEALTHY',
      freshness: fresh('Aave v3 · Sepolia', 7),
      ref: { label: 'Aave v3 Pool', value: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951', kind: 'address', network: 'Ethereum Sepolia' },
      layers: ['execution'],
      blueprintSection: 'protocols',
      codePath: 'adapters/aave.ts',
    },
  },
  {
    id: 'treasury',
    position: { x: 1840, y: 300 },
    data: {
      kind: 'treasury',
      label: 'Treasury',
      purpose: 'Source of funds. Only USDC may be moved, and only to the Aave pool.',
      networkRole: 'EXECUTION_TESTNET',
      status: 'HEALTHY',
      liveStatus: 'HEALTHY',
      freshness: fresh('Treasury safe', 9),
      ref: { label: 'Treasury safe', value: '0x4E81bA07c9F3d2610a8B5e7C4d9F02a6B3c1E58D', kind: 'address', network: 'Ethereum Sepolia' },
      layers: ['execution', 'security-boundaries'],
      blueprintSection: 'assets',
    },
  },
];

const EDGES: ArchEdge[] = [
  { id: 'e_op_ens', source: 'operator', target: 'ens', kind: 'AUTHORIZATION', label: 'AUTHORIZATION', layers: ['identity'], note: 'The operator owns the namespace and holds the revocation path.' },
  { id: 'e_ens_runtime', source: 'ens', target: 'runtime', kind: 'CONTEXT', label: 'CONTEXT', layers: ['identity', 'runtime'], note: 'The runtime presents this identity; it does not derive authority from it.' },
  { id: 'e_chainlink_broker', source: 'chainlink', target: 'broker', kind: 'READ', label: 'READ', layers: ['data'] },
  { id: 'e_graph_broker', source: 'graph', target: 'broker', kind: 'READ', label: 'READ', layers: ['data'], note: 'Currently unavailable — no substitute is used.' },
  { id: 'e_reality_broker', source: 'reality', target: 'broker', kind: 'CONTEXT', label: 'CONTEXT', layers: ['data'] },
  { id: 'e_broker_runtime', source: 'broker', target: 'runtime', kind: 'CONTEXT', label: 'CONTEXT', layers: ['data', 'runtime'], note: 'Trust class and freshness are enforced before context reaches the agent.' },
  { id: 'e_broker_trigger', source: 'broker', target: 'runtime', kind: 'TRIGGER', label: 'TRIGGER', layers: ['runtime'] },
  { id: 'e_runtime_cre', source: 'runtime', target: 'cre', kind: 'POLICY', label: 'POLICY', layers: ['policy', 'runtime'], requiresCre: true, note: 'Strategy output must pass CRE evaluation before the policy layer sees it.' },
  { id: 'e_cre_policy', source: 'cre', target: 'policy', kind: 'POLICY', label: 'POLICY', layers: ['policy'], requiresCre: true },
  { id: 'e_runtime_policy', source: 'runtime', target: 'policy', kind: 'POLICY', label: 'POLICY', layers: ['policy'], note: 'The proposed action is evaluated deterministically.' },
  { id: 'e_policy_ledger', source: 'policy', target: 'ledger', kind: 'ESCALATE', label: 'ESCALATE', layers: ['policy'], note: 'Actions inside the escalation band require human approval.' },
  { id: 'e_ledger_policy', source: 'ledger', target: 'policy', kind: 'AUTHORIZATION', label: 'AUTHORIZATION', layers: ['policy', 'identity'] },
  { id: 'e_policy_capability', source: 'policy', target: 'capability', kind: 'AUTHORIZATION', label: 'AUTHORIZATION', layers: ['policy', 'execution'], note: 'A capability is only minted after an ALLOW verdict.' },
  { id: 'e_capability_executor', source: 'capability', target: 'executor', kind: 'EXECUTE', label: 'EXECUTE', layers: ['execution'] },
  { id: 'e_executor_aave', source: 'executor', target: 'aave', kind: 'EXECUTE', label: 'EXECUTE', layers: ['execution'] },
  { id: 'e_treasury_executor', source: 'treasury', target: 'executor', kind: 'AUTHORIZATION', label: 'AUTHORIZATION', layers: ['execution', 'security-boundaries'] },
  { id: 'e_aave_chainlink', source: 'aave', target: 'chainlink', kind: 'READ', label: 'READ', layers: ['data'] },
];

export const ARCHITECTURE: ArchitectureGraph = { revision: 8, nodes: NODES, edges: EDGES };

export const EDGE_KIND_LABEL: Record<string, string> = {
  READ: 'Reads data from',
  CONTEXT: 'Supplies context to',
  TRIGGER: 'Triggers',
  POLICY: 'Submits for policy evaluation',
  AUTHORIZATION: 'Authorizes',
  EXECUTE: 'Executes against',
  ESCALATE: 'Escalates to',
};

export const ARCH_LAYERS: { id: string; label: string; description: string }[] = [
  { id: 'identity', label: 'Identity', description: 'Who the agent is and how it can be revoked.' },
  { id: 'data', label: 'Data', description: 'Where context comes from and at what trust class.' },
  { id: 'policy', label: 'Policy', description: 'Where actions are allowed, escalated or denied.' },
  { id: 'execution', label: 'Execution', description: 'How a transaction actually reaches the chain.' },
  { id: 'runtime', label: 'Runtime', description: 'The agent process itself.' },
  { id: 'live-health', label: 'Live health', description: 'Observed state overlaid on the graph.' },
  { id: 'security-boundaries', label: 'Security boundaries', description: 'Where authority is enforced.' },
];

/* -------------------------------------------------------------- permissions */

export const PERMISSIONS: PermissionsModel = {
  posture: 'PASS',
  executionSummary: 'Ethereum Sepolia only',
  mainnetWrites: 'PROHIBITED',
  policyRevision: 8,
  rules: [
    { id: 'CL-10', verdict: 'ALLOW', label: 'Read Aave position', detail: 'Direct chain read of the treasury position on the approved market.', provenSimulationIds: ['sim_baseline_repay'], policyRef: 'CL-10' },
    { id: 'CL-11', verdict: 'ALLOW', label: 'Read verified price', detail: 'Chainlink ETH/USD, VERIFIED_ORACLE, no older than 60 seconds.', provenSimulationIds: ['sim_stale_oracle'], policyRef: 'CL-11' },
    { id: 'CL-04', verdict: 'ALLOW', label: 'Repay USDC debt ≤ $1,000', detail: 'Autonomous, to the Aave v3 Pool only, within the rolling window budget.', provenSimulationIds: ['sim_baseline_repay', 'sim_amount_boundary'], policyRef: 'CL-04' },
    { id: 'CL-05', verdict: 'ESCALATE', label: 'Repay USDC debt $1,000 – $5,000', detail: 'Requires human approval, which mints one bounded capability and no standing permission.', provenSimulationIds: ['sim_escalation_band'], policyRef: 'CL-05' },
    { id: 'CL-06', verdict: 'DENY', label: 'Any amount above $5,000', detail: 'Hard ceiling. No approval path exists for this.', provenSimulationIds: ['sim_amount_above_ceiling'], policyRef: 'CL-06' },
    { id: 'CL-02', verdict: 'DENY', label: 'Borrow', detail: 'Not in the action allowlist at any amount.', provenSimulationIds: ['sim_borrow_denied'], policyRef: 'CL-02' },
    { id: 'CL-03', verdict: 'DENY', label: 'Withdraw collateral', detail: 'Not in the action allowlist at any amount.', provenSimulationIds: ['sim_borrow_denied'], policyRef: 'CL-03' },
    { id: 'CL-17', verdict: 'DENY', label: 'Send to an external recipient', detail: 'Only the Aave v3 Pool is an allowlisted recipient.', provenSimulationIds: ['sim_recipient_mutation'], policyRef: 'CL-17' },
    { id: 'CL-42', verdict: 'DENY', label: 'Any write on Ethereum Mainnet', detail: 'Production-chain execution is disabled for this project.', provenSimulationIds: ['sim_mainnet_write'], policyRef: 'CL-42' },
  ],
  panels: [
    {
      id: 'capability-bindings',
      title: 'Capability bindings',
      description: 'What a single authorization is bound to. Changing any bound field invalidates it.',
      items: [
        { label: 'Bound fields', value: 'action · amount · recipient · target · chain id' },
        { label: 'Expiry', value: '120 seconds' },
        { label: 'Nonce', value: 'Single-use, monotonic per agent' },
        { label: 'Reuse', value: 'Rejected by the executor', tone: 'deny' },
      ],
    },
    {
      id: 'recipients',
      title: 'Recipient and target restrictions',
      description: 'The complete allowlist. Anything absent is denied.',
      items: [
        { label: 'Permitted recipient', value: 'Aave v3 Pool · 0x6Ae4…8951', mono: true },
        { label: 'Permitted target', value: 'Aave v3 Pool · 0x6Ae4…8951', mono: true },
        { label: 'Permitted asset', value: 'USDC only' },
        { label: 'Everything else', value: 'DENY · RECIPIENT_NOT_ALLOWED', tone: 'deny' },
      ],
    },
    {
      id: 'expiry',
      title: 'Expiry and nonce rules',
      description: 'How a stale or replayed authorization is refused.',
      items: [
        { label: 'Capability expiry', value: '120 seconds from issuance' },
        { label: 'Expired capability', value: 'DENY · CAPABILITY_EXPIRED', tone: 'deny' },
        { label: 'Replayed nonce', value: 'DENY · CAPABILITY_REPLAYED', tone: 'deny' },
        { label: 'Approval timeout', value: '15 minutes, then the escalation expires unexecuted' },
      ],
    },
    {
      id: 'data-trust',
      title: 'Data trust requirements',
      description: 'What must be true about the data before any decision is made.',
      items: [
        { label: 'Price', value: 'VERIFIED_ORACLE · ≤ 60s', tone: 'pass' },
        { label: 'Position', value: 'Direct chain read', tone: 'pass' },
        { label: 'History', value: 'INDEXED · UNAVAILABLE', tone: 'blocked' },
        { label: 'Substitution', value: 'Never permitted', tone: 'deny' },
        { label: 'Stale source', value: 'DENY · ORACLE_STALE', tone: 'deny' },
      ],
    },
    {
      id: 'confidentiality',
      title: 'Confidentiality evidence',
      description: 'What never leaves the trust boundary.',
      items: [
        { label: 'Confidential fields', value: 'Position size · thresholds · approver identity' },
        { label: 'In model context', value: 'Never', tone: 'pass' },
        { label: 'In reports', value: 'Hash-only disclosure' },
        { label: 'In analytics', value: 'Excluded' },
      ],
    },
    {
      id: 'identity',
      title: 'Identity and revocation',
      description: 'Identity is separate from financial permission.',
      items: [
        { label: 'Identity', value: 'guardian.treasury.ctxlock.eth', mono: true },
        { label: 'Revocation authority', value: 'Namespace owner' },
        { label: 'Effect of revocation', value: 'Previously issued capabilities stop being honoured' },
        { label: 'Grants financial permission', value: 'No — that is the policy’s job', tone: 'pass' },
      ],
    },
    {
      id: 'organization',
      title: 'Organization aggregate rules',
      description: 'Worst-case combined authority across every principal.',
      items: [
        { label: 'Guardian', value: '$5,000 per 24h' },
        { label: 'Rebalancer', value: '$2,500 per 24h' },
        { label: 'Reporter', value: 'EXECUTION: NONE', tone: 'blocked' },
        { label: 'Aggregate ceiling', value: '$7,500 per 24h', tone: 'warn' },
        { label: 'Shared principals', value: 'None — each agent has its own policy hash', tone: 'pass' },
      ],
    },
  ],
};

/** Authority changes between the live revision and the open draft. */
export const AUTHORITY_DIFF = [
  {
    field: 'autonomous.maxAmountPerAction',
    label: 'Autonomous amount per action',
    before: '$1,000',
    after: '$1,500',
    expansion: true,
    note: 'Agent may autonomously move an additional $500 per action.',
  },
  {
    field: 'escalation.band',
    label: 'Escalation band',
    before: '$1,000 – $5,000',
    after: '$1,500 – $5,000',
    expansion: true,
    note: 'The band that requires human approval starts $500 higher.',
  },
  {
    field: 'data.maxPriceAge',
    label: 'Max price age',
    before: '90 seconds',
    after: '60 seconds',
    expansion: false,
    note: 'Tighter freshness requirement — reduces the conditions under which the agent may act.',
  },
];
