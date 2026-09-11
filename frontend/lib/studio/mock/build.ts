/**
 * Mock backend — Composer / build pipeline.
 *
 * The parser output is explicitly DRAFT until a deterministic Requirements
 * artifact exists, and a missing financial ceiling stays REQUIRED rather than
 * being invented.
 */
import type { Status } from '../types';

export interface DetectedRequirement {
  id: string;
  label: string;
  value: string;
  status: Status;
  note?: string;
}

export interface BuildStage {
  id: string;
  name: string;
  status: Status;
  detail: string;
  /** Which bottom-panel tab this stage's detail belongs to. */
  panel: 'output' | 'tests' | 'problems';
}

export const COMPOSER_EXAMPLES: { id: string; title: string; body: string }[] = [
  {
    id: 'ex_guardian',
    title: 'Aave liquidation guardian',
    body:
      'Build an Aave guardian for my Sepolia treasury. Watch the health factor on my Aave v3 position. If it falls below 1.25, repay USDC debt from the treasury until the health factor is back above 1.30. Never repay more than $1,000 in a single action, require my approval between $1,000 and $5,000, and never act above $5,000. Only use verified Chainlink prices no older than 60 seconds. Never borrow, never withdraw collateral, and never send funds to any address other than the Aave pool.',
  },
  {
    id: 'ex_rebalancer',
    title: 'Collateral rebalancer',
    body:
      'Keep my collateral ratio between 180% and 220% on Sepolia. Rebalance through Uniswap v3 using only the approved USDC/WETH pool. Cap each rebalance at $500 and cap the day at $2,500. Escalate anything larger. Never touch assets outside USDC and WETH.',
  },
  {
    id: 'ex_reporter',
    title: 'Read-only treasury reporter',
    body:
      'Produce a daily summary of my treasury position: collateral, debt, health factor and realized changes. This agent must have no execution authority at all — it should never be able to submit a transaction.',
  },
];

export const COMPOSER_SLASH_HELPERS: { command: string; description: string; insert: string }[] = [
  {
    command: '/limits',
    description: 'State the autonomous limit, escalation band and hard ceiling.',
    insert:
      'Limits: autonomous up to $___ per action; escalate between $___ and $___; never act above $___ under any circumstances.',
  },
  {
    command: '/protocol',
    description: 'Name the protocols and the exact venues allowed.',
    insert: 'Protocols: ___ (only the ___ market). No other venue may be used.',
  },
  {
    command: '/data',
    description: 'State required data sources, trust class and freshness.',
    insert: 'Data: use verified Chainlink price feeds no older than ___ seconds. Refuse to act on stale data.',
  },
  {
    command: '/forbid',
    description: 'State the actions that must never be possible.',
    insert: 'Never: borrow, withdraw collateral, send funds to any address outside the allowlist, or write to mainnet.',
  },
];

export const DETECTED_REQUIREMENTS: DetectedRequirement[] = [
  { id: 'req_objective', label: 'Objective', value: 'Prevent liquidation of the Aave v3 position', status: 'PASS' },
  { id: 'req_protocol', label: 'Protocol', value: 'Aave v3 · Sepolia', status: 'PASS' },
  { id: 'req_trigger', label: 'Trigger', value: 'Health factor < 1.25', status: 'PASS' },
  { id: 'req_action', label: 'Action', value: 'Repay USDC debt from treasury', status: 'PASS' },
  { id: 'req_data', label: 'Data requirement', value: 'Chainlink ETH/USD · VERIFIED_ORACLE · ≤ 60s', status: 'PASS' },
  { id: 'req_autonomous', label: 'Autonomous limit', value: '$1,000 per action', status: 'PASS' },
  { id: 'req_escalation', label: 'Escalation band', value: '$1,000 – $5,000', status: 'PASS' },
  {
    id: 'req_ceiling',
    label: 'Hard deny ceiling',
    value: 'Not stated',
    status: 'REQUIRED',
    note: 'A hard ceiling must be stated explicitly. It is never inferred from the other limits.',
  },
  { id: 'req_recipients', label: 'Recipient restriction', value: 'Aave v3 Pool only', status: 'PASS' },
  {
    id: 'req_forbidden',
    label: 'Forbidden actions',
    value: 'Borrow · withdraw collateral · external recipient',
    status: 'PASS',
  },
  {
    id: 'req_window',
    label: 'Rolling window budget',
    value: 'Not stated',
    status: 'WARN',
    note: 'Without a window budget, repeated actions inside the autonomous limit are unbounded over time.',
  },
];

export const BUILD_STAGES: BuildStage[] = [
  { id: 'stg_requirements', name: 'Requirements', status: 'PASS', detail: 'Requirements r6 produced and validated.', panel: 'output' },
  { id: 'stg_blueprint', name: 'Blueprint', status: 'PASS', detail: 'Blueprint r8 generated from requirements r6.', panel: 'output' },
  { id: 'stg_security', name: 'Security Review', status: 'PASS', detail: 'Deterministic invariants checked; 0 critical findings.', panel: 'problems' },
  { id: 'stg_user', name: 'User Review', status: 'PASS', detail: 'Blueprint r8 accepted by operator@treasury.', panel: 'output' },
  { id: 'stg_build', name: 'Build', status: 'PASS', detail: 'Build r7 produced 24 files and a CRE workflow binary.', panel: 'output' },
  {
    id: 'stg_tests',
    name: 'Tests',
    status: 'WARN',
    detail: '23 of 24 mandatory security scenarios passed; 1 failed with DATA_SOURCE_UNAVAILABLE.',
    panel: 'tests',
  },
];

export const COMPOSER_DRAFT = COMPOSER_EXAMPLES[0].body;

export const QUOTA = { used: 47, limit: 200, window: 'today' };
