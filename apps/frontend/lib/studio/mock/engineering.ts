/**
 * Mock backend — engineering surfaces.
 *
 * Generated code files and the integration registry.
 *
 * Rules encoded in the data:
 *  - Generated files are read-only once a build succeeds, so the built artifact
 *    still corresponds to the Blueprint that produced it.
 *  - A file whose build revision trails the Blueprint is marked stale.
 *  - Credentials carry a storage boundary and a status, never a value.
 */
import { fresh, isoAgo, unavailableFreshness } from './core';
import type { Adapter, CodeFile, Credential, OpenApiIntegration } from '../types';

/* -------------------------------------------------------------------- code */

export const BUILD_REVISION = 7;

export const CODE_FILES: CodeFile[] = [
  {
    path: 'agent/strategy.ts',
    name: 'strategy.ts',
    group: 'generated-agent',
    language: 'typescript',
    marks: ['generated', 'locked', 'stale'],
    readOnly: true,
    revision: 7,
    blueprintSection: 'objective',
    coveredByTest: 'tests/strategy.test.ts',
    content: `import { readPosition, readVerifiedPrice } from '../adapters';
import type { Decision, MarketContext } from '../contextlock/types';

/**
 * Generated from Blueprint r7 · section 2 (Objective) and section 5 (Triggers).
 *
 * The strategy proposes an action. It never authorizes one: the proposal is
 * evaluated by the ContextLock policy, which is the only place a verdict is
 * produced.
 */
const HEALTH_FACTOR_THRESHOLD = 1.25;
const HEALTH_FACTOR_TARGET = 1.3;

export async function evaluate(context: MarketContext): Promise<Decision | null> {
  const position = await readPosition(context.snapshotId);
  const price = await readVerifiedPrice(context.snapshotId);

  // Refuse to reason about a position priced from stale data. The policy layer
  // would deny this anyway; failing here keeps the reason precise.
  if (price.ageSeconds > context.maxPriceAgeSeconds) {
    return null;
  }

  if (position.healthFactor >= HEALTH_FACTOR_THRESHOLD) {
    return null;
  }

  const repayAmount = amountToReachTarget(position, price, HEALTH_FACTOR_TARGET);

  return {
    action: 'repayDebt',
    asset: 'USDC',
    amount: repayAmount,
    recipient: context.pool,
    target: context.pool,
    rationale: \`health factor \${position.healthFactor.toFixed(2)} below \${HEALTH_FACTOR_THRESHOLD}\`,
  };
}

function amountToReachTarget(
  position: Awaited<ReturnType<typeof readPosition>>,
  price: Awaited<ReturnType<typeof readVerifiedPrice>>,
  target: number,
): number {
  const collateralValue = position.collateral * price.value;
  const requiredDebt = collateralValue / target;
  return Math.max(0, Math.ceil(position.debt - requiredDebt));
}
`,
    previousContent: `import { readPosition, readVerifiedPrice } from '../adapters';
import type { Decision, MarketContext } from '../contextlock/types';

const HEALTH_FACTOR_THRESHOLD = 1.25;
const HEALTH_FACTOR_TARGET = 1.3;

export async function evaluate(context: MarketContext): Promise<Decision | null> {
  const position = await readPosition(context.snapshotId);
  const price = await readVerifiedPrice(context.snapshotId);

  if (position.healthFactor >= HEALTH_FACTOR_THRESHOLD) {
    return null;
  }

  const repayAmount = amountToReachTarget(position, price, HEALTH_FACTOR_TARGET);

  return {
    action: 'repayDebt',
    asset: 'USDC',
    amount: repayAmount,
    recipient: context.pool,
    target: context.pool,
    rationale: 'health factor below threshold',
  };
}
`,
  },
  {
    path: 'agent/triggers.ts',
    name: 'triggers.ts',
    group: 'generated-agent',
    language: 'typescript',
    marks: ['generated', 'locked'],
    readOnly: true,
    revision: 7,
    blueprintSection: 'triggers',
    content: `/** Generated from Blueprint r7 · section 5 (Triggers). */
export const triggers = {
  evaluationIntervalSeconds: 60,
  cooldownSecondsAfterAction: 300,
  manualTriggerPermitted: true,
} as const;

/**
 * A manual trigger runs the identical evaluation path. It does not bypass the
 * policy layer, and it does not widen any limit.
 */
export function shouldEvaluate(lastActionAt: number | null, now: number): boolean {
  if (lastActionAt === null) return true;
  return now - lastActionAt >= triggers.cooldownSecondsAfterAction * 1000;
}
`,
  },
  {
    path: 'contextlock/policy.sol',
    name: 'policy.sol',
    group: 'contextlock-modules',
    language: 'sol',
    marks: ['generated', 'locked'],
    readOnly: true,
    revision: 7,
    blueprintSection: 'permissions',
    coveredByTest: 'tests/policy.test.ts',
    content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Generated from Blueprint r7 · sections 7-9 (Permissions, Autonomous
///         and Escalation policy). The deterministic authority boundary: every
///         action is allowed, escalated or denied here.
contract ContextLockPolicy {
    uint256 public constant AUTONOMOUS_MAX = 1_000e6;   // USDC, 6 decimals
    uint256 public constant ESCALATION_MAX = 5_000e6;   // hard ceiling
    uint256 public constant MAX_PRICE_AGE = 60;         // seconds

    enum Verdict { DENY, ESCALATE, ALLOW }

    bool public enabled;
    address public immutable admin;
    mapping(address => bool) public allowedRecipient;
    mapping(bytes4 => bool) public allowedAction;

    error NotAdmin();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address admin_) {
        admin = admin_;
        // Financial authority always begins disabled. Enabling it is a separate,
        // explicit operator decision.
        enabled = false;
    }

    function evaluate(
        bytes4 action,
        uint256 amount,
        address recipient,
        uint256 priceAge
    ) external view returns (Verdict) {
        if (!enabled) return Verdict.DENY;              // POLICY_DISABLED
        if (!allowedAction[action]) return Verdict.DENY; // ACTION_NOT_PERMITTED
        if (!allowedRecipient[recipient]) return Verdict.DENY; // RECIPIENT_NOT_ALLOWED
        if (priceAge > MAX_PRICE_AGE) return Verdict.DENY;     // ORACLE_STALE
        if (amount > ESCALATION_MAX) return Verdict.DENY;      // AMOUNT_ABOVE_CEILING
        if (amount > AUTONOMOUS_MAX) return Verdict.ESCALATE;  // ESCALATION_REQUIRED
        return Verdict.ALLOW;
    }

    function setEnabled(bool value) external onlyAdmin {
        enabled = value;
    }
}
`,
  },
  {
    path: 'contextlock/capability.ts',
    name: 'capability.ts',
    group: 'contextlock-modules',
    language: 'typescript',
    marks: ['generated', 'locked'],
    readOnly: true,
    revision: 7,
    blueprintSection: 'capability-policy',
    coveredByTest: 'tests/capability.test.ts',
    content: `import { keccak256, encodeAbiParameters } from 'viem';

/**
 * Generated from Blueprint r7 · section 12 (Capability policy).
 *
 * A capability authorizes exactly one action. It is bound to every field that
 * matters, so mutating any of them after issuance invalidates it.
 */
export interface Capability {
  action: string;
  amount: bigint;
  recipient: \`0x\${string}\`;
  target: \`0x\${string}\`;
  chainId: number;
  nonce: bigint;
  expiresAt: number;
}

export const EXPIRY_SECONDS = 120;

export function digest(capability: Capability): \`0x\${string}\` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'string' }, { type: 'uint256' }, { type: 'address' },
        { type: 'address' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' },
      ],
      [
        capability.action,
        capability.amount,
        capability.recipient,
        capability.target,
        BigInt(capability.chainId),
        capability.nonce,
        BigInt(capability.expiresAt),
      ],
    ),
  );
}

export function isExpired(capability: Capability, now: number): boolean {
  return now >= capability.expiresAt;
}
`,
  },
  {
    path: 'contextlock/guard.ts',
    name: 'guard.ts',
    group: 'contextlock-modules',
    language: 'typescript',
    marks: ['generated', 'locked'],
    readOnly: true,
    revision: 7,
    blueprintSection: 'execution-networks',
    coveredByTest: 'tests/network.test.ts',
    content: `/**
 * Generated from Blueprint r7 · section 16 (Execution networks).
 *
 * The execution network boundary. Production-chain execution is not a setting
 * that can be toggled at runtime — there is no branch here that permits it.
 */
export const EXECUTION_CHAIN_ID = 11155111; // Ethereum Sepolia
const PRODUCTION_CHAIN_IDS = new Set([1, 10, 8453, 42161, 137]);

export type GuardResult =
  | { ok: true }
  | { ok: false; reasonCode: 'WRONG_CHAIN' | 'MAINNET_WRITE_PROHIBITED' };

export function guardChain(chainId: number): GuardResult {
  if (PRODUCTION_CHAIN_IDS.has(chainId)) {
    return { ok: false, reasonCode: 'MAINNET_WRITE_PROHIBITED' };
  }
  if (chainId !== EXECUTION_CHAIN_ID) {
    return { ok: false, reasonCode: 'WRONG_CHAIN' };
  }
  return { ok: true };
}
`,
  },
  {
    path: 'adapters/chainlink.ts',
    name: 'chainlink.ts',
    group: 'adapter-modules',
    language: 'typescript',
    marks: ['template-owned'],
    readOnly: true,
    revision: 7,
    blueprintSection: 'data-requirements',
    content: `import { getContract } from 'viem';
import { aggregatorV3Abi } from './abi/aggregatorV3';

/** Trust class: VERIFIED_ORACLE. Freshness is enforced by the caller. */
export async function readVerifiedPrice(client: unknown, feed: \`0x\${string}\`) {
  const contract = getContract({ address: feed, abi: aggregatorV3Abi, client: client as never });
  const [roundId, answer, , updatedAt] = await contract.read.latestRoundData();

  return {
    value: Number(answer) / 1e8,
    roundId,
    updatedAt: Number(updatedAt),
    ageSeconds: Math.floor(Date.now() / 1000) - Number(updatedAt),
    trustClass: 'VERIFIED_ORACLE' as const,
  };
}
`,
  },
  {
    path: 'adapters/the-graph.ts',
    name: 'the-graph.ts',
    group: 'adapter-modules',
    language: 'typescript',
    marks: ['template-owned', 'stale'],
    readOnly: true,
    revision: 7,
    blueprintSection: 'data-requirements',
    content: `/**
 * Trust class: INDEXED.
 *
 * This adapter is registered but cannot authenticate — no API key is
 * configured. It reports UNAVAILABLE rather than degrading to another source:
 * substituting a lower trust class for a required one is never permitted.
 */
export async function readPositionHistory(): Promise<never> {
  throw new AdapterUnavailable('the-graph', 'credential_missing');
}

export class AdapterUnavailable extends Error {
  readonly reasonCode = 'DATA_SOURCE_UNAVAILABLE';
  constructor(readonly adapter: string, readonly cause: string) {
    super(\`adapter \${adapter} unavailable: \${cause}\`);
  }
}
`,
  },
  {
    path: 'tests/policy.test.ts',
    name: 'policy.test.ts',
    group: 'tests',
    language: 'typescript',
    marks: ['generated'],
    readOnly: true,
    revision: 7,
    content: `import { describe, expect, it } from 'vitest';
import { evaluate, Verdict } from '../contextlock/policy';

describe('policy', () => {
  it('denies a recipient outside the allowlist', () => {
    expect(evaluate({ amount: 740n, recipient: ATTACKER })).toBe(Verdict.DENY);
  });

  it('denies an amount above the hard ceiling', () => {
    expect(evaluate({ amount: 7_500n, recipient: POOL })).toBe(Verdict.DENY);
  });

  it('escalates an amount inside the escalation band', () => {
    expect(evaluate({ amount: 2_300n, recipient: POOL })).toBe(Verdict.ESCALATE);
  });

  it('treats the autonomous limit as inclusive', () => {
    expect(evaluate({ amount: 1_000n, recipient: POOL })).toBe(Verdict.ALLOW);
    expect(evaluate({ amount: 1_001n, recipient: POOL })).toBe(Verdict.ESCALATE);
  });
});
`,
  },
  {
    path: 'cre/workflow.ts',
    name: 'workflow.ts',
    group: 'cre-workflow',
    language: 'typescript',
    marks: ['generated', 'locked'],
    readOnly: true,
    revision: 7,
    blueprintSection: 'cre',
    content: `/**
 * Generated from Blueprint r7 · section 14 (CRE).
 *
 * Compiled to WASM and run by the official CRE CLI simulator. A simulator run
 * is a real simulation of this workflow; it is not DON execution and produces
 * no TEE evidence.
 */
import { evaluate } from '../agent/strategy';

export async function onCronTrigger(context: WorkflowContext) {
  const decision = await evaluate(context.market);
  if (!decision) return { submitted: false, reason: 'no action required' };

  // The workflow never issues a capability. It hands the proposal to the
  // policy layer, which is the only component that can authorize.
  return context.submitForPolicyEvaluation(decision);
}

export interface WorkflowContext {
  market: Parameters<typeof evaluate>[0];
  submitForPolicyEvaluation(decision: NonNullable<Awaited<ReturnType<typeof evaluate>>>): Promise<{
    submitted: boolean;
    reason?: string;
  }>;
}
`,
  },
  {
    path: 'deployment/deploy.ts',
    name: 'deploy.ts',
    group: 'deployment',
    language: 'typescript',
    marks: ['generated'],
    readOnly: true,
    revision: 7,
    content: `import { EXECUTION_CHAIN_ID } from '../contextlock/guard';

/**
 * Deployment plan. The policy is deployed with financial authority disabled;
 * enabling it is a separate operator decision made after the deployment is
 * verified.
 */
export const plan = [
  { contract: 'ContextLockPolicy', action: 'DEPLOY', constructorArgs: ['{{ADMIN}}'] },
  { contract: 'CapabilityIssuer', action: 'DEPLOY', constructorArgs: ['{{POLICY}}'] },
  { contract: 'Executor', action: 'DEPLOY', constructorArgs: ['{{CAPABILITY_ISSUER}}'] },
] as const;

export const network = { chainId: EXECUTION_CHAIN_ID, name: 'Ethereum Sepolia' };
export const policyStartsDisabled = true;
`,
  },
  {
    path: 'config/agent.config.json',
    name: 'agent.config.json',
    group: 'config',
    language: 'json',
    marks: ['generated'],
    readOnly: true,
    revision: 7,
    content: `{
  "agent": "guardian",
  "blueprintRevision": 7,
  "executionNetwork": { "name": "Ethereum Sepolia", "chainId": 11155111 },
  "marketSource": { "name": "Ethereum Mainnet", "access": "READ_ONLY" },
  "productionChainExecution": "DISABLED",
  "adapters": ["chainlink-data-feeds", "aave-v3", "sepolia-rpc", "mainnet-read"],
  "cre": { "mode": "CONTEXTLOCK_SIMULATOR", "required": true },
  "limits": {
    "autonomousPerAction": 1000,
    "escalationBand": [1000, 5000],
    "hardCeiling": 5000,
    "window": "24h",
    "windowLimit": 5000
  },
  "dataRequirements": { "maxPriceAgeSeconds": 60, "substitutionPermitted": false }
}
`,
  },
];

export const CODE_GROUPS: { id: CodeFile['group']; label: string }[] = [
  { id: 'generated-agent', label: 'Generated agent' },
  { id: 'contextlock-modules', label: 'ContextLock modules' },
  { id: 'adapter-modules', label: 'Adapter modules' },
  { id: 'tests', label: 'Tests' },
  { id: 'cre-workflow', label: 'CRE workflow' },
  { id: 'deployment', label: 'Deployment' },
  { id: 'config', label: 'Config' },
];

export const CODE_MARK_LABEL: Record<string, { label: string; tone: 'pass' | 'warn' | 'sim' | 'blocked' | 'neutral'; title: string }> = {
  generated: { label: 'GENERATED', tone: 'sim', title: 'Produced by the build from the Blueprint' },
  'template-owned': { label: 'TEMPLATE', tone: 'neutral', title: 'Owned by the adapter template, upgraded with it' },
  modified: { label: 'MODIFIED', tone: 'warn', title: 'Edited by hand; artifact correspondence is invalidated' },
  stale: { label: 'STALE', tone: 'warn', title: 'Built against an older Blueprint revision' },
  locked: { label: 'LOCKED', tone: 'blocked', title: 'Generated from the Blueprint; edit the Blueprint instead' },
};

/* ------------------------------------------------------------ integrations */

export const ADAPTERS: Adapter[] = [
  {
    id: 'adp_chainlink_feeds',
    name: 'Chainlink Data Feeds',
    adapterId: 'chainlink-data-feeds',
    version: '1.4.0',
    type: 'Price oracle',
    network: 'Ethereum Mainnet',
    networkRole: 'MAINNET_READ_ONLY',
    capabilities: ['readPrice', 'readRound'],
    trustClass: 'VERIFIED_ORACLE',
    status: 'HEALTHY',
    lifecycle: 'Stable · 1.4.2 available',
    usedByAgentIds: ['agt_guardian', 'agt_rebalancer'],
    freshness: fresh('Chainlink ETH/USD', 9, 60),
    conformance: 'PASS',
    provenance: [
      { key: 'aggregator', value: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', mono: true },
      { key: 'decimals', value: '8' },
      { key: 'heartbeat', value: '3600s' },
      { key: 'deviation_threshold', value: '0.5%' },
    ],
  },
  {
    id: 'adp_aave_v3',
    name: 'Aave v3',
    adapterId: 'aave-v3',
    version: '3.1.0',
    type: 'Lending protocol',
    network: 'Ethereum Sepolia',
    networkRole: 'EXECUTION_TESTNET',
    capabilities: ['readPosition', 'repayDebt'],
    trustClass: 'READ_ONLY',
    status: 'HEALTHY',
    lifecycle: 'Stable',
    usedByAgentIds: ['agt_guardian'],
    freshness: fresh('Aave v3 · Sepolia', 7),
    conformance: 'PASS',
    provenance: [
      { key: 'pool', value: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951', mono: true },
      { key: 'write_methods', value: 'repayDebt only' },
      { key: 'approval', value: 'bounded per capability' },
    ],
  },
  {
    id: 'adp_the_graph',
    name: 'The Graph',
    adapterId: 'the-graph',
    version: '0.9.3',
    type: 'Indexer',
    network: 'Ethereum Mainnet',
    networkRole: 'MAINNET_READ_ONLY',
    capabilities: ['readPositionHistory'],
    trustClass: 'INDEXED',
    status: 'UNAVAILABLE',
    lifecycle: 'Subgraph active; credential missing',
    usedByAgentIds: ['agt_guardian', 'agt_reporter'],
    freshness: unavailableFreshness('The Graph', 'API key required'),
    blockerReason:
      'The adapter cannot authenticate. No indexed data is served, and no lower-trust source is substituted for it.',
    conformance: null,
    provenance: [
      { key: 'subgraph', value: 'aave/protocol-v3', mono: true },
      { key: 'error', value: 'authentication failed (no API key)' },
      { key: 'credential', value: 'cred_the_graph', mono: true },
    ],
  },
  {
    id: 'adp_sepolia_rpc',
    name: 'Sepolia RPC',
    adapterId: 'sepolia-rpc',
    version: '1.0.0',
    type: 'Chain access',
    network: 'Ethereum Sepolia',
    networkRole: 'EXECUTION_TESTNET',
    capabilities: ['call', 'sendRawTransaction', 'getLogs'],
    trustClass: 'READ_ONLY',
    status: 'HEALTHY',
    lifecycle: 'Stable',
    usedByAgentIds: ['agt_guardian', 'agt_rebalancer'],
    freshness: fresh('Sepolia RPC', 4),
    conformance: 'PASS',
    provenance: [
      { key: 'chain_id', value: '11155111' },
      { key: 'endpoint', value: 'configured provider (redacted)' },
    ],
  },
  {
    id: 'adp_mainnet_read',
    name: 'Mainnet RPC',
    adapterId: 'mainnet-read',
    version: '1.0.0',
    type: 'Chain access',
    network: 'Ethereum Mainnet',
    networkRole: 'MAINNET_READ_ONLY',
    capabilities: ['call', 'getLogs'],
    trustClass: 'READ_ONLY',
    status: 'HEALTHY',
    lifecycle: 'Stable',
    usedByAgentIds: ['agt_guardian', 'agt_reporter'],
    freshness: fresh('Mainnet RPC', 11, 60),
    conformance: 'PASS',
    provenance: [
      { key: 'chain_id', value: '1' },
      { key: 'access', value: 'READ ONLY — no write method is exposed' },
    ],
  },
  {
    id: 'adp_uniswap_v3',
    name: 'Uniswap v3',
    adapterId: 'uniswap-v3',
    version: '3.0.2',
    type: 'DEX',
    network: 'Ethereum Sepolia',
    networkRole: 'EXECUTION_TESTNET',
    capabilities: ['readPool', 'swapExactInput'],
    trustClass: 'READ_ONLY',
    status: 'HEALTHY',
    lifecycle: 'Stable',
    usedByAgentIds: ['agt_rebalancer'],
    freshness: fresh('Uniswap v3 · Sepolia', 8),
    conformance: 'PASS',
    provenance: [
      { key: 'pool', value: '0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1', mono: true },
      { key: 'fee_tier', value: '0.05%' },
    ],
  },
];

export const CREDENTIALS: Credential[] = [
  {
    id: 'cred_the_graph',
    name: 'The Graph API key',
    scope: 'the-graph adapter · read',
    boundary: 'SECRET_MANAGER',
    status: 'UNAVAILABLE',
    lastVerified: null,
    usedBy: ['adp_the_graph'],
    rotatable: true,
    reconnectable: true,
  },
  {
    id: 'cred_sepolia_rpc',
    name: 'Sepolia RPC endpoint',
    scope: 'sepolia-rpc adapter · read and submit',
    boundary: 'SECRET_MANAGER',
    status: 'HEALTHY',
    lastVerified: isoAgo(240),
    usedBy: ['adp_sepolia_rpc'],
    rotatable: true,
    reconnectable: false,
  },
  {
    id: 'cred_mainnet_rpc',
    name: 'Mainnet RPC endpoint',
    scope: 'mainnet-read adapter · read only',
    boundary: 'SECRET_MANAGER',
    status: 'HEALTHY',
    lastVerified: isoAgo(300),
    usedBy: ['adp_mainnet_read'],
    rotatable: true,
    reconnectable: false,
  },
  {
    id: 'cred_cre_session',
    name: 'CRE session',
    scope: 'Chainlink CRE CLI',
    boundary: 'CRE_LOCAL_SESSION',
    status: 'UNAVAILABLE',
    lastVerified: null,
    usedBy: [],
    rotatable: false,
    reconnectable: true,
  },
  {
    id: 'cred_deploy_signer',
    name: 'Testnet deployment signer',
    scope: 'Sepolia · deployment transactions',
    boundary: 'LOCAL_BRIDGE',
    status: 'READY',
    lastVerified: isoAgo(1800),
    usedBy: [],
    rotatable: true,
    reconnectable: true,
  },
];

export const CREDENTIAL_BOUNDARY_LABEL: Record<string, string> = {
  LOCAL_BRIDGE: 'Local Bridge',
  CRE_LOCAL_SESSION: 'CRE local session',
  SECRET_MANAGER: 'Secret manager',
  NONE_PUBLIC: 'None / public',
};

export const OPENAPI_INTEGRATIONS: OpenApiIntegration[] = [
  {
    id: 'oas_risk_feed',
    name: 'Treasury risk feed',
    specVersion: 'OpenAPI 3.1',
    allowedHost: 'risk.internal.treasury.example',
    authType: 'Bearer token (secret manager)',
    generatedAdapter: 'adapter-risk-feed@0.1.0',
    validation: [
      { message: 'Schema is valid OpenAPI 3.1', status: 'PASS' },
      { message: 'All operations declare response schemas', status: 'PASS' },
      { message: 'Single allowed host; no wildcard origins', status: 'PASS' },
      { message: 'No write operations declared', status: 'PASS' },
      { message: 'Trust class cannot be inferred from a spec — set to UNVERIFIED', status: 'WARN' },
    ],
    conformance: 'WARN',
  },
];
