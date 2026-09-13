# ContextLock

An authorization layer for AI agents that transact on-chain. The agent never holds a private key.
It holds a **capability**: an EIP-712 signed assertion that authorizes exactly one transaction, for
a bounded window, against a specific target and calldata hash, revocable, and re-validated on-chain
by a contract the agent cannot influence.

ContextLock also contains a **Studio**: a workbench that designs an agent from a prompt, registers
an ENS identity for it, builds it in a network-isolated sandbox, simulates it, and deploys it to a
local Anvil fork of Ethereum mainnet where it runs against real protocol state under the full
authorization path.

---

## Status

| Component | State |
|---|---|
| Contracts | Deployed on Sepolia. Not audited. |
| ENSv2 | Live on Sepolia. Identity and revocation are load-bearing at execution time. |
| Chainlink CRE | Confidential workflow implemented and exercised with the **official CRE CLI simulator**, triggered by real Sepolia events. Not a live DON. Nothing executed in a real TEE. |
| Ledger | Key Ring, WebHID signing and approver selection implemented and tested. |
| Network | Sepolia only. Every deploy script asserts `chainId == 11155111`. |
| Tests | 266 passing, 0 failing, 1 skipped (hardware-gated; it reports SKIPPED, never PASSED). |

---

## Problem

An agent that moves funds needs signing authority. A private key grants *ambient* authority —
anything the key can do, the holder can do, for as long as it exists. Wallet-level spending caps
constrain magnitude and nothing else. They cannot express:

- which agent is acting, and whether that identity is still valid at execution time
- which contract is being called, and with which exact calldata
- whether current market conditions still justify the action
- whether the authorization that permitted this is still within its own validity window

Prompt injection makes this operationally urgent rather than theoretical. An agent's instructions
arrive inside the data it reads, and that data is attacker-controlled. A model instructed to refuse
malicious requests is not an authorization boundary, because the model is the component under
attack. ContextLock places the boundary outside the model, in code the model cannot reach.

## Threat model

**Assumed hostile:** the agent process, the relayer, target contracts, the RPC endpoint, and all
API input including prices, news and on-chain data.

**Assumed honest:** the capability issuer key (hot, with bounded blast radius), the policy
administrator, and chain consensus.

Full surface analysis and reporting process: [`SECURITY.md`](SECURITY.md).

---

## Authorization model

### Three verdicts

`ALLOW` · `ESCALATE` · `DENY`

Binary authorization forces every threshold into a cliff: either the autonomous limit is set low
enough to be useless, or a compromised agent inherits a large budget. Three verdicts keep the
autonomous limit low while leaving larger actions reachable through explicit human acceptance of a
specific risk.

`DENY` is terminal by construction, not by policy. In `ContextLockExecutor`, the human-approval
branch is reachable only from `ESCALATE`; a capability whose authorization verdict is `DENY` reverts
at `AuthorizationNotAllow` before any approval is read. This was verified live on Sepolia by
recording a genuine, valid human approval against a denied capability and observing execution still
refuse.

### The capability

Fifteen fields, all covered by the EIP-712 signature
([`ContextLockTypes.sol`](contracts/src/ContextLockTypes.sol)):

```solidity
struct Capability {
    uint8   version;             // schema version; executor rejects anything else
    bytes32 agentIdentityHash;   // ENS identity, checked live at execution
    address agent;
    uint256 chainId;
    address executor;            // binds the capability to one executor instance
    address target;
    uint256 value;
    bytes32 calldataHash;        // exact calldata, not a selector
    bytes32 intentHash;
    bytes32 policyHash;
    bytes32 authorizationId;
    bytes32 contextCommitment;   // commitment to the market context that was evaluated
    uint64  issuedAt;
    uint64  expiresAt;
    uint256 nonce;
}
```

EIP-712 provides no replay protection on its own. Replay protection here comes from the on-chain
nonce, the expiry window, and the independent `approvedUntil` on the authorization record.

`EvaluationRequest` — what the policy evaluator rules on — deliberately covers `target`, `value` and
`calldataHash` but **not** `nonce`, `expiresAt` or `authorizationId`. Those describe a particular
capability issued against an approved request, not the request itself. The executor recomputes the
request hash from the capability it is executing and compares it against the stored authorization,
so an authorization approved for one transaction cannot be spent on a different one.

### Executor validation sequence

[`ContextLockExecutor.sol`](contracts/src/ContextLockExecutor.sol) validates in this order. Every
check reverts **before** any external interaction; no code path touches the target before all
validation passes.

| # | Check | Revert |
|---|---|---|
| 1 | Reentrancy guard | `Reentrancy` |
| 2 | Schema version | `UnsupportedVersion` |
| 3 | `chainId` matches `block.chainid` | `ChainMismatch` |
| 4 | Executor address binding | `ExecutorMismatch` |
| 5 | Non-zero target | `ZeroTarget` |
| 6 | `expiresAt > issuedAt`, lifetime ≤ `MAX_CAPABILITY_LIFETIME` | `InvalidTimeWindow` |
| 7 | Not expired | `CapabilityExpired` |
| 8 | Not issued beyond `MAX_CLOCK_SKEW` in the future | `IssuedInFuture` |
| 9 | Nonce unused for this identity | `NonceUsed` |
| 10 | `keccak256(calldata)` equals `calldataHash` | `CalldataHashMismatch` |
| 11 | `msg.value` equals `cap.value` | `ValueMismatch` |
| 12 | Issuer signature (ECDSA or ERC-1271) | `InvalidSignature` |
| 13 | **ENS identity current, read live** | `IdentityNotCurrent` |
| 14 | Policy enabled for this identity | `PolicyDisabled` |
| 15 | Target allowed, binding version unchanged | `TargetNotAllowed`, `BindingVersionChanged` |
| 16 | Value within hard cap | `ValueExceedsHardCap` |
| 17 | Authorization exists | `AuthorizationMissing` |
| 18 | Verdict is `ALLOW`, **or** `ESCALATE` with a valid approval | `AuthorizationNotAllow`, `HumanApprovalRequired`, `HumanApprovalUnavailable` |
| 19 | Recomputed request hash matches the stored authorization | `AuthorizationRequestMismatch` |
| 20 | Policy hash and context commitment match | `AuthorizationPolicyMismatch`, `AuthorizationContextMismatch` |
| 21 | Authorization not stale | `AuthorizationStale` |
| 22 | Target call | `TargetCallFailed` |

The nonce is consumed on success, not on attempt: if the target call reverts, the whole transaction
reverts and the consumption rolls back with it. Making consumption survive a failed target call
would require a two-transaction reservation design. The tests assert the real behaviour rather than
a stronger claim.

### Policy engine

[`packages/policy/src/index.ts`](packages/policy/src/index.ts) is a pure, deterministic function
from `(EvaluationRequest, MarketContext, PrivatePolicy)` to `(Verdict, ReasonCode, RiskBand)`.
Determinism is a requirement, not a preference: the enclave result is attested and verified by DON
consensus, so a non-deterministic decision would fail consensus.

Reason codes are produced by this function and never by the agent:

```
ALLOW_POLICY_MATCH

DENY_AGENT_NOT_AUTHORIZED   DENY_TARGET_NOT_ALLOWED   DENY_ACTION_NOT_ALLOWED
DENY_AMOUNT_TOO_HIGH        DENY_CONTEXT_STALE        DENY_SLIPPAGE
DENY_VOLATILITY             DENY_LIQUIDITY            DENY_POLICY_DISABLED
DENY_MALFORMED_CONTEXT

ESCALATE_AMOUNT             ESCALATE_RISK             ESCALATE_POLICY_RULE
```

Amounts are integer base units throughout (6-decimal, USDC-style). No floats.

There is one implementation and two execution sites. The CRE project directory contains a
**symlink**, `workflows/cre-policy/contextlock-cre/policy/policy.ts →
packages/policy/src/index.ts`, so the confidential workflow compiles the same source the Studio and
the simulator run. It is not a reimplementation that can drift.

---

## Integrations

### ENSv2

Each agent holds its own ENSv2 name. This is structural rather than cosmetic: separate names mean
separate principals with separate policies and separate blast radius, instead of one agent
accumulating authority over everything. The Studio treats two agents sharing a `policyHash` as a
blocking issue.

Identity is read **live at execution** by
[`EnsAgentIdentityVerifier.sol`](contracts/src/identity/EnsAgentIdentityVerifier.sol) and never
cached, which is what makes revocation immediate: revoking a name invalidates capabilities that are
already issued and not yet expired.

- Contract: `EnsAgentIdentityVerifier` — `isIdentityCurrent(bytes32,address)`
- Resolution: [`packages/ens/`](packages/ens/), pinned to a specific published Sepolia deployment
  set (several are in circulation and resolution differs between them)
- Live identity: `contextlock-20260906-a83dc9.eth`, registered by
  [`scripts/ens-register.ts`](scripts/ens-register.ts), with registration transaction hashes
  recorded in [`deployments/ens-sepolia.json`](deployments/ens-sepolia.json)

### Chainlink CRE

[`workflows/cre-policy/contextlock-policy/workflow.ts`](workflows/cre-policy/contextlock-policy/workflow.ts)
is a confidential workflow (`cre.handlerInTee` with an explicit Nitro constraint) triggered by
`CapabilityRequested` events from `ContextLockGateway` on Sepolia. It fetches the private policy and
a risk-feed credential from the Vault DON via `runtime.getSecret()`, evaluates the policy, and
returns a report consumed by
[`ContextLockCreConsumer.sol`](contracts/src/ContextLockCreConsumer.sol).

The confidentiality boundary, stated as the CRE documentation states it:

- **Confidential:** Vault DON secrets, the request and response payloads of HTTP calls made from
  inside the enclave, and intermediate values computed there.
- **Not confidential:** this source and the compiled binary. The Workflow DON provides the binary to
  the enclave. ContextLock does not claim its policy *algorithm* is secret — only the policy
  *values* are.

Only a verdict, a reason code, a coarse risk band and commitments cross back out through
`usingTheDons()`. No threshold, no secret and no raw context does.

`secrets.yaml` maps secret IDs to environment variable *names* and contains no values;
[`scripts/secret-scan.sh`](scripts/secret-scan.sh) asserts this separately.

**Observable property.** For a single Sepolia transaction with identical amount, agent, target and
policy version, varying only the confidential market context produces:

| Private context | Result |
|---|---|
| benign | `ALLOW:ALLOW_POLICY_MATCH:LOW` |
| volatility 5000 bps | `ESCALATE:ESCALATE_RISK:HIGH` |
| slippage 900 bps | `DENY:DENY_SLIPPAGE:HIGH` |
| liquidity floor breached | `DENY:DENY_LIQUIDITY:HIGH` |

Nothing observable in the transaction changed. The verdict did. Reproduce with
`npm run demo:cre-private-context`.

### Ledger

**Key Ring** — [`packages/ledger/src/key-ring.ts`](packages/ledger/src/key-ring.ts)

- There is no `getSecret()`. The only public method is `withSecret(use)`, which passes plaintext to
  a callback and never returns it. An agent-reachable API that returns a credential is the pattern
  this is designed to eliminate.
- No plaintext fallback. If the ring is unavailable, the network is down, or `WALLET_PASS` is wrong,
  it throws. It never reads the secret from `.env`, never uses a cached copy, and never degrades.
- `WALLET_PASS` is referenced, never handled — read from the ambient environment and passed through;
  never generated, prompted for, logged, or defaulted.
- Decrypted buffers are overwritten and temporary files unlinked after use.
- Errors are reconstructed from a fixed message set, never from raw CLI output, because CLI stderr
  can echo input.

**Approval** — [`ContextLockApprovalRegistry.sol`](contracts/src/ContextLockApprovalRegistry.sol)

Consulted only on the `ESCALATE` branch. Approvals are consumed `onlyExecutor`, so an agent cannot
self-approve. An escalation covering two capabilities is two separate on-device approvals, one per
digest, recorded individually.

**Device integration** —
[`apps/frontend/components/studio/ledger/useLedgerDevice.ts`](apps/frontend/components/studio/ledger/useLedgerDevice.ts)

There is no API that reports "the device is locked", so the connection state machine is derived from
a single `getAddress()` call and the status code it returns: `0x5515` means powered but locked, any
other error means the Ethereum app is not frontmost, and a returned address means ready. `0x6985` is
a user rejection, which is a legitimate outcome rather than a fault — the authorization stays
`ESCALATE` and nothing executes.

A 1.2-second poll runs alongside WebHID connect/disconnect events, because unplugging the cable
fires an event but entering a PIN on the device fires nothing. A guard prevents the poll
interleaving with a signature, since both share one HID pipe.

The escalation approver's address is read from the device over WebHID and fixed at deployment; it is
never typed. Signing uses `@ledgerhq/hw-transport-webhid` and `@ledgerhq/hw-app-eth`, with `viem`
serialising the unsigned EIP-1559 transaction. Chrome or Edge only — WebHID does not exist in
Firefox or Safari — in a secure context, with Ledger Live closed.

> Install note: `npx wallet-cli` resolves to an unrelated third-party package whose surface includes
> `import <privateKey>`. Use the scoped `@ledgerhq/wallet-cli`. `secrets.ts` resolves the binary by
> package name specifically so the wrong one cannot be picked up.

---

## The Studio

A workbench that takes a prompt and produces a deployed, policy-constrained agent.

**Pipeline:** requirement interview → blueprint → plan → strategy IR → sandboxed build → simulation
→ CRE evaluation → fork deployment → runtime under control-plane supervision.

**`apps/studio`** (Fastify, port 4310) — 58 HTTP routes across four groups:

| Prefix | Surface |
|---|---|
| `/api/studio/*` | projects, builds, design, blueprint, simulate, files, export, organizations, adapters, health |
| `/api/lab/*` | attacks, CRE connect/simulate/parity, scenarios, shadow, decisions, safety report, readiness |
| `/api/fork/*` | deploy, deployments, position, tick, stress, approvals (+ typed-data, decline), stop |
| `/api/control/*` | overview, activity, alerts, commands, traces, trace lookup, operations |

Notable subsystems:

- `sandbox/` — candidate code is built inside a container rather than trusted. Providers are
  `docker` (default) and `e2b`; an unknown provider fails closed and never silently falls back.
- `fork/` — drives Anvil, one process per fork, with orphan reconciliation on restart.
- `secrets.ts` — reads through the Ledger Key Ring, so a running Studio holds no plaintext
  credential.
- `quota.ts` — bounds the fork and build work a single project can request.
- `honesty.ts` — a deterministic scan run before a build is reported ready. It checks artifacts for
  four specific assertions that are not true of this project: hardware evidence, live CRE
  deployment, TEE execution, and exposure of confidential values. It matches *assertions*, not
  topics, with a 60-character negation window — a file stating "no physical device evidence exists"
  passes, and one containing `PHYSICAL_DEVICE_EVIDENCE = true` does not.

**`apps/frontend`** (Next.js 15, React 19, port 3000) — the workbench UI, 25 routes. Browser
requests to `/api/*` are rewritten server-side to the Studio API by `next.config.mjs`, so the app is
same-origin with its backend: no CORS, and the build event stream is a plain same-origin
`EventSource`.

The design system is hand-written CSS scoped under a single `.cl-studio` root, using custom
properties and container queries so a panel responds to the width of its pane rather than the
viewport. React Flow renders the architecture graph with authority-labelled edges; Monaco backs the
code surface; TanStack Query holds server state with a deliberately short stale time, because
observed chain state should not be served from cache as though it were current.

**`apps/broker`** — capability broker, with a state machine per request so a call can be held,
escalated or refused rather than only allowed or denied.
**`apps/agent-runtime`** — the container a built agent runs in: single egress path through
`gateways.ts`, hardening and identity applied at startup, checkpointed for resume.
**`apps/demo-agent`** — an intentionally untrusted agent with a hostile prompt corpus, used as the
target of the attack lab.

### Fork lab

`packages/studio-reality` forks Ethereum mainnet with Anvil and runs the agent against live protocol
state — Aave v3, Morpho Blue, Compound v3, Lido and a DEX router — rather than fixtures. It supports
state overlay, shadow execution of a candidate beside the current agent, historical replay, and an
audit record of what happened. `anvil_setBalance` is used to fund roles, which exists only on a
local node.

---

## Repository layout

```
contracts/            Solidity 0.8.28, via-IR, Cancun. Executor, registries, ENS verifier,
                      approval registry, golden test vectors shared with the TypeScript side.
packages/             24 workspace packages
  protocol/             capability schema and EIP-712, independent of the Solidity
  policy/               the ALLOW/ESCALATE/DENY function (one implementation)
  adapters/             typed transaction builders; no generic-call adapter, deliberately
  adapter-sdk/          scaffold, testkit, artifact format and CLI for writing new adapters
  ens/                  ENSv2 deployment discovery and registry ABIs
  ledger/               Key Ring, protected-service boundary, ERC-7730 clear signing
  bridge/               cross-chain transport for a policy decision
  studio-blueprint/     blueprint schema, graph, validator, score, explicit unknowns
  studio-plan/          blueprint → ordered plan, state machine, plan hash
  studio-strategy/      intent → IR compiler
  studio-org/           organisation model: budget, messaging, blast radius
  studio-templates/     starting points
  studio-reality/       fork lab: anvil, rpc proxy, overlay, shadow, replay, audit
  studio-lab/           attack lab and runner, CRE connect, lifecycle
  studio-simulation/    simulation engine
  studio-cre-sim/       local CRE stand-in and scheduler
  studio-control-plane/ operator commands, alerts, emergency stop
  studio-orchestrator/  plan → image → receipt
  studio-runtime/       Docker/ECS runtime, hardening, identity
  studio-events/        event store, correlation, redaction
  studio-deploy/        approval, cost, environment, hash
  studio-network/       roles, fences, broadcast, CRE modes
  studio-openapi/       import an existing HTTP API and fence it as an adapter
  studio-adapters/      Aave v3, Morpho Blue, Compound v3, Lido, Uniswap, CCIP, Chainlink, TheGraph
apps/
  studio/             Studio API (Fastify)
  frontend/           workbench UI (Next.js)
  broker/             capability broker
  agent-runtime/      agent container
  demo-agent/         untrusted agent + hostile corpus
workflows/cre-policy/ confidential workflow and the official CRE project
scripts/              operator, demo and scanner scripts
deployments/          recorded Sepolia and ENS addresses
```

### Write fences

`packages/studio-network` defines a closed, exported list of named write fences —
`BLUEPRINT_VALIDATOR`, `STRATEGY_COMPILER`, `EXECUTION_PLAN_VALIDATOR`, `ADAPTER_RESOLVER`,
`DEPLOYMENT_PREFLIGHT`, `CONTEXTLOCK_BROKER`, `SIGNER`, `RELAYER`, `AGENT_RUNTIME`, `CRE_BROADCAST`.
Every subsystem capable of producing a write calls the same guard through its own named fence, so a
refusal names the layer that caught it and removing one leaves the others. The list is exported so a
test can assert every fence exists and independently refuses; a fence added without a call site is a
test failure rather than a silent gap.

The role is a claim and the chain ID is the fact — callers assert a chain ID, not a role, so a
caller that guessed `TESTNET_EXECUTION` for a local fork is refused.

---

## Install

```bash
git clone https://github.com/austinjeremiah/ContextLock && cd ContextLock
npm install
cd contracts && forge install foundry-rs/forge-std --no-git && cd ..
cp .env.example .env
```

Optional, for the Chainlink and Ledger paths:

```bash
curl -sSL https://app.chain.link/cre/install.sh | bash   # CRE CLI v1.32.0
curl -fsSL https://bun.sh/install | bash                 # CRE TypeScript workflows
npm i -g @ledgerhq/wallet-cli                            # note the scope
```

Every environment variable, and which are genuinely required, is listed in
[`ENV_REQUIRED.md`](ENV_REQUIRED.md).

## Run

```bash
npm run build                     # workspace packages; apps/studio imports their dist/
npm run studio:api                # http://127.0.0.1:4310 — needs Docker, anvil, OPENAI_API_KEY
npm run frontend                  # http://localhost:3000
```

## Test

```bash
npm run test:all                  # every non-hardware suite, plus secret, canary,
                                  # privilege and npm audit scans
npm run contracts:test            # Foundry only
npm run test:ledger:hardware      # requires an attached device
```

Contract coverage includes fuzz and invariant runs, an adversarial suite, a red-team suite, a gas
review, CRE integration, and an ENS identity test against a fork. Capability mutation is covered by
a 512-run fuzz across all fifteen signed fields.

## Demo

```bash
npm run health                    # read-only Sepolia preflight
npm run demo:all                  # six live scenes; five are attacks

npm run demo:allow                # autonomous rebalance, no human
npm run demo:deny                 # prompt injection → DENY
npm run demo:mutate               # mutated capability → CalldataHashMismatch
npm run demo:replay               # replay → NonceUsed
npm run demo:ens-revoke           # ENS revocation invalidates an unexpired capability
npm run demo:escalate:software    # ESCALATE → approval required → executes
npm run demo:cre-private-context  # identical tx, different private context, different verdict
```

A prompt that exercises all five protocols in the Studio:

> Guard my treasury across Aave, Morpho Blue and Compound: keep every health factor above 1.6 and
> repay up to $1,000 automatically. Stake idle ETH above a 0.5 ETH reserve into Lido. Keep the vault
> 50/50 WETH–USDC and rebalance on the DEX when it drifts more than 5%. Anything from $1,000 to
> $5,000 needs Ledger. Never withdraw collateral.

---

## Deployed — Ethereum Sepolia

Full manifest: [`deployments/sepolia.json`](deployments/sepolia.json)

| Contract | Address |
|---|---|
| ContextLockExecutor (canonical, v2) | `0x9ee2E72E2D7B91D9ddeD1313df5CFCb8E9316e23` |
| ContextLockGateway | `0xA2cD6003b092a4F4a69b86e75b60dcDD7737d9Bb` |
| ContextLockPolicyRegistry | `0xCBd976E8BBbA70867d581A35e5a5CF1C2ed47F24` |
| ContextLockAuthorizationRegistry | `0xFAD71bbcCfFdFbFA8B500bc9b8FF6F0C7F9De8e3` |
| ContextLockApprovalRegistry | `0xD6E420734667382e49091072e9824902d6c93574` |
| ContextLockCreConsumer | `0x0eAA86cDA5622A8384c3eC9F47aD129902A8123F` |
| EnsAgentIdentityVerifier | `0xbD44B9A7491A3168F772Ca96433c17a0B18a6149` |
| MockTreasuryTarget | `0xf20B833b26b981F8A2211473f46cf457430CE153` |

Agent identity: `contextlock-20260906-a83dc9.eth`

---

## Security properties

| Question | Answer | Mechanism |
|---|---|---|
| Can the agent obtain the issuer key? | No | No endpoint returns it; the agent package cannot import a signer. |
| Can the agent obtain a Ledger-held secret? | No | No `getSecret`; only `performProtectedAction` / `withSecret`. |
| Can the agent bypass ENS? | No | Identity read live at execution, never cached. |
| Can the agent bypass CRE? | No | Verdict read on-chain, bound to a recomputed request hash. |
| Can the agent mutate a capability? | No | 512-run fuzz across all fifteen signed fields. |
| Can the agent replay a capability? | No | On-chain nonce plus independent `approvedUntil`. |
| Can the agent forge an authorization? | No | `NotAuthorizer` / `NotForwarder`, verified live. |
| Can the agent self-approve an escalation? | No | `onlyExecutor` consumption. |
| Can a human approval override `DENY`? | No | Branch unreachable from `DENY`; verified live on Sepolia. |

Six of these are inexpressible rather than refused: there is no request the agent can construct that
reaches the question.

---

## Known limitations

- **Not audited.** ENSv2 and CRE Confidential Workflows are both beta.
- **CRE is CLI simulation.** Not a live DON, not a real enclave. No claim is made otherwise.
- The capability issuer is a **hot key**. Compromise is bounded but real.
- No emergency pause or issuer rotation on the executor.
- A nonce is consumed on success, not on attempt.
- ContextLock validates **permission, not economic soundness**. A permitted transaction may still be
  a bad trade.
- `MAX_CLOCK_SKEW` tolerates a capability issued slightly ahead of block time, which is a
  deliberate, bounded relaxation.

---

## License

MIT — [`LICENSE`](LICENSE)
