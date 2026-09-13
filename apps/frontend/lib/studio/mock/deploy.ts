/**
 * Mock backend — deployment preflight.
 *
 * Rules encoded in the data:
 *  - Costs are kept in separate sections. They are paid in different currencies
 *    at different times, so merging them into one total would be misleading.
 *  - The deployment gate requires a clean mandatory security regression. This
 *    project currently has one failing scenario, so preflight reports BLOCKED
 *    rather than a green path to deploy.
 *  - Policy begins disabled on every deployment. It is never deployed enabled.
 */
import { isoAgo } from './core';
import type { CostSection, DeploymentPlanItem, DeploymentProgressStep, PreflightStep } from '../types';

export const PREFLIGHT_STEPS: PreflightStep[] = [
  {
    index: 1,
    id: 'pf_build',
    name: 'Build',
    status: 'PASS',
    detail: 'Build r7 produced 24 files and a CRE workflow binary.',
  },
  {
    index: 2,
    id: 'pf_security',
    name: 'Security',
    status: 'FAIL',
    detail: '23 of 24 mandatory security scenarios passed. 1 failed: DATA_SOURCE_UNAVAILABLE.',
    blockerId: 'BLK-121',
  },
  {
    index: 3,
    id: 'pf_cre',
    name: 'CRE Simulation',
    status: 'PASS',
    detail: 'Official CLI simulation passed. No DON, no TEE evidence.',
  },
  {
    index: 4,
    id: 'pf_reality',
    name: 'Reality',
    status: 'WARN',
    detail: 'Snapshot coherent, but the indexed source is UNAVAILABLE.',
    blockerId: 'BLK-114',
  },
  {
    index: 5,
    id: 'pf_network',
    name: 'Network',
    status: 'PASS',
    detail: 'Ethereum Sepolia · chain id 11155111. Production-chain execution disabled.',
  },
  {
    index: 6,
    id: 'pf_wallet',
    name: 'Wallet',
    status: 'PENDING',
    detail: 'Connect a testnet wallet to check the deploying balance.',
  },
  {
    index: 7,
    id: 'pf_cost',
    name: 'Cost',
    status: 'READY',
    detail: 'Estimate refreshed against the current fee.',
  },
  {
    index: 8,
    id: 'pf_runtime',
    name: 'Runtime image',
    status: 'READY',
    detail: 'sha256:9f4c72be…21ab5d built and verified.',
  },
  {
    index: 9,
    id: 'pf_approval',
    name: 'Approval',
    status: 'REQUIRED',
    detail: 'Operator approval is required before any deployment transaction is submitted.',
  },
];

export const DEPLOYMENT_BLOCKERS = [
  {
    id: 'BLK-121',
    title: 'Mandatory security regression is not clean',
    detail:
      'sim_graph_unavailable fails: the adapter broker returned UNAVAILABLE before the policy layer was reached, so the denial did not come from the layer that is supposed to produce it. The deployment gate requires a clean mandatory regression.',
    action: 'Open Simulation',
    href: '/simulation?scenario=sim_graph_unavailable',
  },
  {
    id: 'BLK-114',
    title: 'The Graph adapter cannot authenticate',
    detail:
      'A required indexed source is unavailable. Decisions depending on it will be refused, and no lower-trust source is substituted.',
    action: 'Configure Credential',
    href: '/integrations',
  },
];

export const DEPLOYMENT_PLAN: DeploymentPlanItem[] = [
  { contract: 'ContextLockPolicy', action: 'DEPLOY', estimatedGas: 1_842_000 },
  { contract: 'CapabilityIssuer', action: 'DEPLOY', estimatedGas: 1_236_500 },
  { contract: 'Executor', action: 'DEPLOY', estimatedGas: 964_200 },
  {
    contract: 'AaveAdapterLib',
    action: 'REUSE',
    address: '0x2C8bA1f0e97D3465a0b7C1e84F29d60A3b5E71c4',
    estimatedGas: 0,
  },
  {
    contract: 'ChainlinkReaderLib',
    action: 'REUSE',
    address: '0x7fD1a09C4e35B826d0a7F1c93E48b502a6D31F8e',
    estimatedGas: 0,
  },
];

export const ARTIFACT_HASHES: { label: string; value: string }[] = [
  { label: 'Blueprint r8', value: '0xb81c4f27a0e93d56b1c8f4a702e93d6bf5a8c1e04d7b3f6a9c2e5b8d1f4a7c0e' },
  { label: 'Build r7', value: '0x4d7a19c3e05b82f6401a9c7e3b56d80f2a6c94e17b03d58a2f6c01e93b7d45a8' },
  { label: 'CRE workflow (wasm)', value: '0x6b1f83c4a09e27d5b8f1c4a70e3d96b2f5a8c1e04d7b3f6a9c2e5b8d1f4a7c0e' },
  { label: 'CRE config', value: '0x2d90fa4c7b1e6835d0a9c72f4e8b1d63a5f07c92e4b8d1a36f0c7e59b2d84a17' },
  { label: 'Runtime image', value: 'sha256:9f4c72be18d305a7c6e94b2f0d81a35c7e46b9f2a0c85d13e7b6a4f90c21ab5d' },
  { label: 'Policy bytecode', value: '0x91c4e7b05a3d86f21e0c4b79a36d5f80c2e947b1a06d38f5c29e0b74a1d36f2a' },
];

/** Gas assumptions the one-time estimate is built from. */
export const GAS_ASSUMPTIONS = {
  totalGas: 4_042_700,
  baseFeeGwei: 1.42,
  priorityFeeGwei: 0.1,
  safetyBufferPercent: 25,
  estimatedEth: 0.00615,
  recommendedEth: 0.0125,
};

export const COST_SECTIONS: CostSection[] = [
  {
    id: 'cost_deploy',
    title: 'One-time deployment gas',
    description: 'Paid once, in Sepolia test ether, by the connected deployer wallet.',
    rows: [
      { label: 'Candidate transactions', value: '3 deploy · 2 reuse' },
      { label: 'Estimated gas', value: '4,042,700' },
      { label: 'Fee assumption', value: '1.42 gwei base + 0.1 gwei priority' },
      { label: 'Estimated cost', value: '0.00615 SepoliaETH' },
      { label: 'Safety buffer', value: '+25%' },
      { label: 'Recommended balance', value: '0.0125 SepoliaETH' },
    ],
  },
  {
    id: 'cost_execution',
    title: 'Expected execution costs',
    description: 'Informational, per agent action. Not paid at deployment time.',
    rows: [
      { label: 'Per repay action', value: '~184,000 gas · ~0.00028 SepoliaETH' },
      { label: 'Capability issuance', value: '~61,000 gas' },
      { label: 'At the window limit', value: '~6 actions per 24h' },
    ],
  },
  {
    id: 'cost_model',
    title: 'Model usage',
    description: 'Billed against your workspace allowance, not on chain.',
    rows: [
      { label: 'Used today', value: '47 of 200 runs' },
      { label: 'Expected per evaluation', value: '~2 model calls' },
      { label: 'Estimated daily', value: '~120 calls at the current trigger interval' },
    ],
  },
  {
    id: 'cost_runtime',
    title: 'Runtime hosting',
    description: 'The containerized agent process.',
    rows: [
      { label: 'Image', value: 'sha256:9f4c72be…21ab5d' },
      { label: 'Estimate', value: 'Not available for Testnet Lab', tone: 'blocked' },
    ],
  },
  {
    id: 'cost_cre',
    title: 'CRE',
    description: 'Simulator, private registry and runtime usage are classified separately.',
    rows: [
      { label: 'Mode', value: 'Official CLI simulator' },
      { label: 'Simulator usage', value: 'No charge in Testnet Lab' },
      { label: 'Private registry', value: 'Not applicable — requires Deploy Access', tone: 'blocked' },
      { label: 'DON runtime', value: 'Not applicable — no DON deployment', tone: 'blocked' },
    ],
  },
];

export const DEPLOY_PROGRESS_TEMPLATE: DeploymentProgressStep[] = [
  { id: 'dp_prepare', label: 'Preparing release', status: 'PENDING' },
  { id: 'dp_contracts', label: 'Deploying contracts', status: 'PENDING', detail: '3 transactions' },
  { id: 'dp_policy', label: 'Configuring policy DISABLED', status: 'PENDING' },
  { id: 'dp_verify', label: 'Verifying contracts', status: 'PENDING' },
  { id: 'dp_runtime', label: 'Building / verifying runtime', status: 'PENDING' },
  { id: 'dp_cre', label: 'Starting CRE simulator', status: 'PENDING' },
  { id: 'dp_start', label: 'Starting runtime', status: 'PENDING' },
  { id: 'dp_health', label: 'Running health checks', status: 'PENDING' },
  {
    id: 'dp_ready',
    label: 'READY TO ACTIVATE',
    status: 'PENDING',
    detail: 'Policy remains DISABLED until you activate it.',
  },
];

/** Key for the in-progress deployment, so progress survives a reload (spec §51). */
export const DEPLOY_PROGRESS_KEY = 'ctxlock.deploy.progress';

export const LAST_ESTIMATE_AT = isoAgo(95);
