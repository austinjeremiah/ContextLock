'use client';

/**
 * Deploy / Preflight (spec §20).
 *
 * Turns a verified build into a Testnet Lab deployment while making costs,
 * artifacts, networks and blockers explicit.
 *
 * Rules encoded here:
 *  - Costs stay in separate sections. They are paid in different currencies at
 *    different times, so one combined total would be misleading.
 *  - The deployment gate requires a clean mandatory security regression. While
 *    one is failing, Deploy is blocked and says exactly why.
 *  - Policy is deployed DISABLED, always. Activation is a separate decision.
 *  - The confirmation states the network, transaction count, balance
 *    requirement, revisions, CRE mode, image digest and that production-chain
 *    execution is disabled. Its button is never a bare "Confirm".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Fingerprint, Play, RefreshCw, Rocket, ScrollText, Square } from 'lucide-react';
import { StudioPage } from '@/components/studio/PageScaffold';
import {
  Badge,
  BlockchainRef,
  BlockerBanner,
  Card,
  KeyValue,
  Section,
  StatusBadge,
  TimeAgo,
} from '@/components/studio/primitives';
import { Modal } from '@/components/studio/dialogs';
import { ConnectTestnetWallet } from '@/components/studio/wallet/ConnectTestnetWallet';
import { useWorkbench } from '@/lib/studio/workbench';
import { PROJECT, agentBySlug } from '@/lib/studio/mock/core';
import {
  ARTIFACT_HASHES,
  COST_SECTIONS,
  DEPLOYMENT_BLOCKERS,
  DEPLOYMENT_PLAN,
  DEPLOY_PROGRESS_KEY,
  DEPLOY_PROGRESS_TEMPLATE,
  GAS_ASSUMPTIONS,
  LAST_ESTIMATE_AT,
  PREFLIGHT_STEPS,
} from '@/lib/studio/mock/deploy';
import { CRE } from '@/lib/studio/mock/operate';
import type { DeploymentProgressStep, PreflightStep, Status } from '@/lib/studio/types';

export default function DeployPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSelection, openBottom, pushToast } = useWorkbench();

  const agentSlug = searchParams.get('agent') ?? PROJECT.agents[0].slug;
  const agent = agentBySlug(agentSlug);

  const [wallet, setWallet] = useState({ connected: false, sufficient: false, onExecutionChain: false });
  const [estimateAt, setEstimateAt] = useState(LAST_ESTIMATE_AT);
  const [refreshing, setRefreshing] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [hashesOpen, setHashesOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState<DeploymentProgressStep[] | null>(null);
  const timers = useRef<number[]>([]);

  /* Deployment progress survives a reload (spec §51): it is recorded as it
     advances and restored on mount, so a refresh mid-deploy does not lose it. */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DEPLOY_PROGRESS_KEY);
      if (saved) setProgress(JSON.parse(saved) as DeploymentProgressStep[]);
    } catch {
      /* storage unavailable; progress simply is not restored */
    }
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const persist = useCallback((steps: DeploymentProgressStep[] | null) => {
    try {
      if (steps) window.localStorage.setItem(DEPLOY_PROGRESS_KEY, JSON.stringify(steps));
      else window.localStorage.removeItem(DEPLOY_PROGRESS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  /* The wallet step reflects the live connection rather than a stored value. */
  const steps = useMemo<PreflightStep[]>(
    () =>
      PREFLIGHT_STEPS.map((step) => {
        if (step.id !== 'pf_wallet') return step;
        if (!wallet.connected) return step;
        if (!wallet.onExecutionChain) {
          return { ...step, status: 'FAIL' as Status, detail: 'Connected wallet is not on the execution network.' };
        }
        return wallet.sufficient
          ? { ...step, status: 'PASS' as Status, detail: 'Connected on Sepolia with sufficient balance.' }
          : {
              ...step,
              status: 'BLOCKED' as Status,
              detail: `Balance is below the recommended ${GAS_ASSUMPTIONS.recommendedEth} SepoliaETH.`,
            };
      }),
    [wallet],
  );

  const blockingSteps = steps.filter((s) => s.status === 'FAIL' || s.status === 'BLOCKED');
  const canDeploy = blockingSteps.length === 0 && wallet.connected && wallet.onExecutionChain && wallet.sufficient;
  const deploying = progress !== null && progress.some((s) => s.status === 'RUNNING' || s.status === 'PENDING');
  const deployed = progress !== null && progress.every((s) => s.status !== 'PENDING' && s.status !== 'RUNNING');

  const runDeployment = () => {
    const sequence = DEPLOY_PROGRESS_TEMPLATE.map((s) => ({ ...s }));
    setProgress(sequence);
    persist(sequence);
    setConfirmOpen(false);
    openBottom('output');

    let index = 0;
    const advance = () => {
      setProgress((prev) => {
        if (!prev) return prev;
        const next = prev.map((s, i) =>
          i === index ? { ...s, status: 'RUNNING' as Status } : i < index ? { ...s, status: 'PASS' as Status } : s,
        );
        persist(next);
        return next;
      });

      const handle = window.setTimeout(() => {
        setProgress((prev) => {
          if (!prev) return prev;
          const isLast = index === prev.length - 1;
          const next = prev.map((s, i) =>
            i === index ? { ...s, status: (isLast ? 'READY' : 'PASS') as Status, at: new Date().toISOString() } : s,
          );
          persist(next);
          return next;
        });
        index += 1;
        if (index < sequence.length) advance();
        else pushToast('Deployment complete · policy remains DISABLED');
      }, 800);
      timers.current.push(handle);
    };
    advance();
  };

  const cancelDeployment = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setProgress((prev) => {
      if (!prev) return prev;
      const next = prev.map((s) => (s.status === 'RUNNING' ? { ...s, status: 'STOPPED' as Status } : s));
      persist(next);
      return next;
    });
    pushToast('Deployment cancelled. Completed steps were kept.');
  };

  const refreshEstimate = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setEstimateAt(new Date().toISOString());
      setRefreshing(false);
      pushToast('Cost estimate refreshed');
    }, 700);
  };

  return (
    <StudioPage
      segment="deploy"
      badges={
        <>
          <Badge tone="neutral">{agent.name}</Badge>
          <Badge tone="sim">{PROJECT.environment.executionNetwork}</Badge>
          <Badge tone="deny">Production-chain execution: DISABLED</Badge>
          {canDeploy ? <Badge tone="pass">Ready to deploy</Badge> : <Badge tone="blocked">Blocked</Badge>}
        </>
      }
      actions={
        <>
          <button type="button" className="cl-btn" onClick={() => pushToast('Preflight re-run')}>
            <Play size={13} aria-hidden />
            Run Preflight
          </button>
          <button
            type="button"
            className="cl-btn"
            onClick={() => router.push(`/projects/${PROJECT.id}/cre?agent=${agentSlug}`)}
          >
            Run CRE Simulation
          </button>
          <button type="button" className="cl-btn" onClick={() => setHashesOpen(true)}>
            <Fingerprint size={13} aria-hidden />
            View artifact hashes
          </button>
          <button type="button" className="cl-btn" onClick={() => setPlanOpen(true)}>
            <ScrollText size={13} aria-hidden />
            Review Deployment Plan
          </button>
          {deploying ? (
            <button type="button" className="cl-btn cl-btn-danger" onClick={cancelDeployment}>
              <Square size={12} aria-hidden />
              Cancel Deployment
            </button>
          ) : (
            <button
              type="button"
              className="cl-btn cl-btn-primary"
              onClick={() => setConfirmOpen(true)}
              disabled={!canDeploy || deployed}
              title={
                canDeploy
                  ? undefined
                  : `Blocked: ${blockingSteps.map((s) => s.name).join(', ') || 'connect a funded testnet wallet'}`
              }
            >
              <Rocket size={13} aria-hidden />
              Deploy to Testnet Lab
            </button>
          )}
        </>
      }
      banners={
        DEPLOYMENT_BLOCKERS.length > 0 && !deployed ? (
          <>
            {DEPLOYMENT_BLOCKERS.map((blocker) => (
              <BlockerBanner
                key={blocker.id}
                tone={blocker.id === 'BLK-121' ? 'deny' : 'warn'}
                title={`${blocker.id} · ${blocker.title}`}
                actions={
                  <button
                    type="button"
                    className="cl-btn cl-btn-sm"
                    onClick={() => router.push(`/projects/${PROJECT.id}${blocker.href}`)}
                  >
                    {blocker.action}
                  </button>
                }
              >
                {blocker.detail}
              </BlockerBanner>
            ))}
          </>
        ) : null
      }
    >
      {/* preflight steps */}
      <Section label="Preflight">
        <div className="cl-steps">
          {steps.map((step) => (
            <button
              key={step.id}
              type="button"
              className="cl-step"
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => setSelection({ kind: 'preflight-step', id: step.id, label: step.name })}
            >
              <span className="cl-step-index">{step.index}</span>
              <span className="cl-step-name">{step.name}</span>
              <span className="cl-step-status">
                <StatusBadge status={step.status} />
              </span>
              <span className="cl-step-detail">{step.detail}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* deployment summary */}
      <Section label="Deployment summary">
        <Card>
          <KeyValue
            rows={[
              { label: 'Execution testnet', value: `${PROJECT.environment.executionNetwork} · chain id ${PROJECT.environment.executionChainId}` },
              { label: 'Market source', value: `${PROJECT.environment.realitySource} · READ ONLY` },
              { label: 'Production-chain writes', value: <Badge tone="deny">PROHIBITED</Badge> },
              { label: 'Blueprint revision', value: `r${PROJECT.revisions.blueprint}` },
              { label: 'Build revision', value: `r${PROJECT.revisions.build}` },
              {
                label: 'Contracts',
                value: `${DEPLOYMENT_PLAN.filter((p) => p.action === 'DEPLOY').length} deploy · ${DEPLOYMENT_PLAN.filter((p) => p.action === 'REUSE').length} reuse`,
              },
              { label: 'Runtime image digest', value: 'sha256:9f4c72be…21ab5d', mono: true },
              { label: 'CRE mode', value: 'Official CLI simulator · no DON, no TEE evidence' },
              { label: 'CRE workflow hash', value: <BlockchainRef value={CRE.wasmHash} kind="hash" /> },
              { label: 'Security status', value: <StatusBadge status="FAIL" label="1 mandatory scenario failing" /> },
              { label: 'Policy at deployment', value: <Badge tone="blocked">DISABLED</Badge> },
            ]}
          />
        </Card>
      </Section>

      {/* wallet */}
      <Section label="Deployer wallet">
        <Card>
          <ConnectTestnetWallet recommendedEth={GAS_ASSUMPTIONS.recommendedEth} onStateChange={setWallet} />
        </Card>
      </Section>

      {/* cost — deliberately not one total */}
      <Section
        label="Cost estimate"
        actions={
          <div className="cl-row" style={{ gap: 8 }}>
            <span className="cl-meta">
              Refreshed <TimeAgo iso={estimateAt} />
            </span>
            <button type="button" className="cl-btn cl-btn-sm" onClick={refreshEstimate} disabled={refreshing}>
              <RefreshCw size={11} aria-hidden />
              {refreshing ? 'Refreshing…' : 'Refresh Estimate'}
            </button>
          </div>
        }
      >
        <div className="cl-grid cl-grid-2">
          {COST_SECTIONS.map((section) => (
            <Card key={section.id} title={section.title}>
              <p className="cl-meta" style={{ whiteSpace: 'normal', marginBottom: 10 }}>
                {section.description}
              </p>
              <dl className="cl-kv">
                {section.rows.map((row) => (
                  <div key={row.label} style={{ display: 'contents' }}>
                    <dt>{row.label}</dt>
                    <dd>{row.tone ? <Badge tone={row.tone}>{row.value}</Badge> : row.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </div>
        <p className="cl-meta" style={{ marginTop: 10 }}>
          These are not added together. They are paid in different currencies, at different times, by different
          parties — a single combined figure would not correspond to anything you actually pay.
        </p>
      </Section>

      {/* progress */}
      {progress ? (
        <Section label="Deployment progress">
          <div className="cl-steps">
            {progress.map((step, i) => (
              <div className="cl-step" key={step.id} style={{ cursor: 'default' }}>
                <span className="cl-step-index">{i + 1}</span>
                <span className="cl-step-name">{step.label}</span>
                <span className="cl-step-status">
                  <StatusBadge status={step.status} />
                </span>
                <span className="cl-step-detail">
                  {step.detail ?? ''} {step.at ? <TimeAgo iso={step.at} /> : null}
                </span>
              </div>
            ))}
          </div>
          {deployed ? (
            <div style={{ marginTop: 12 }}>
              <BlockerBanner
                tone="pass"
                title="READY TO ACTIVATE"
                actions={
                  <button
                    type="button"
                    className="cl-btn cl-btn-sm"
                    onClick={() => router.push(`/projects/${PROJECT.id}/policies?agent=${agentSlug}`)}
                  >
                    Open Policies
                  </button>
                }
              >
                The agent is deployed and its runtime is healthy. Financial authority remains DISABLED until you
                activate it explicitly on the Policies page — deployment never enables it.
              </BlockerBanner>
            </div>
          ) : null}
        </Section>
      ) : null}

      {/* deployment plan */}
      <Modal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        title="Deployment plan"
        subtitle="Exactly which contracts are deployed and which are reused."
        wide
        footer={
          <button type="button" className="cl-btn cl-btn-primary" onClick={() => setPlanOpen(false)}>
            Close
          </button>
        }
      >
        <table className="cl-table">
          <thead>
            <tr>
              <th>Contract</th>
              <th style={{ width: 110 }}>Action</th>
              <th style={{ width: 220 }}>Address</th>
              <th style={{ width: 130 }}>Estimated gas</th>
            </tr>
          </thead>
          <tbody>
            {DEPLOYMENT_PLAN.map((item) => (
              <tr key={item.contract}>
                <td className="cl-strong">{item.contract}</td>
                <td>
                  <Badge tone={item.action === 'DEPLOY' ? 'sim' : 'neutral'}>{item.action}</Badge>
                </td>
                <td>
                  {item.address ? (
                    <BlockchainRef value={item.address} network={PROJECT.environment.executionNetwork} />
                  ) : (
                    <span className="cl-meta">created by this deployment</span>
                  )}
                </td>
                <td className="cl-mono">{item.estimatedGas === 0 ? '—' : item.estimatedGas.toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="cl-meta" style={{ marginTop: 12 }}>
          Reused contracts are already deployed at the addresses above and are not redeployed. Their bytecode is
          verified against the expected hash before use.
        </p>
      </Modal>

      {/* artifact hashes */}
      <Modal
        open={hashesOpen}
        onClose={() => setHashesOpen(false)}
        title="Artifact hashes"
        subtitle="What exactly is being deployed."
        wide
        footer={
          <button type="button" className="cl-btn cl-btn-primary" onClick={() => setHashesOpen(false)}>
            Close
          </button>
        }
      >
        <div className="cl-col" style={{ gap: 8 }}>
          {ARTIFACT_HASHES.map((artifact) => (
            <div key={artifact.label} className="cl-row" style={{ gap: 10, justifyContent: 'space-between' }}>
              <span className="cl-strong" style={{ fontSize: 12.5 }}>
                {artifact.label}
              </span>
              <BlockchainRef value={artifact.value} kind="hash" />
            </div>
          ))}
        </div>
      </Modal>

      {/* deployment confirmation (spec §20) */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Deploy testnet agent"
        subtitle="Review exactly what this deployment does before it is submitted."
        wide
        danger
        footer={
          <>
            <button type="button" className="cl-btn" onClick={() => setConfirmOpen(false)}>
              Cancel
            </button>
            {/* Never a bare "Confirm": the action names itself. */}
            <button type="button" className="cl-btn cl-btn-primary" onClick={runDeployment}>
              Deploy Testnet Agent
            </button>
          </>
        }
      >
        <dl className="cl-statechange">
          <div className="cl-statechange-row">
            <dt>Network</dt>
            <dd>
              {PROJECT.environment.executionNetwork} · chain id {PROJECT.environment.executionChainId}
            </dd>
          </div>
          <div className="cl-statechange-row">
            <dt>Transactions</dt>
            <dd>{DEPLOYMENT_PLAN.filter((p) => p.action === 'DEPLOY').length} contract deployments</dd>
          </div>
          <div className="cl-statechange-row">
            <dt>Balance required</dt>
            <dd>
              ~{GAS_ASSUMPTIONS.estimatedEth} SepoliaETH · {GAS_ASSUMPTIONS.recommendedEth} recommended with buffer
            </dd>
          </div>
          <div className="cl-statechange-row">
            <dt>Blueprint / build</dt>
            <dd>
              r{PROJECT.revisions.blueprint} / r{PROJECT.revisions.build}
            </dd>
          </div>
          <div className="cl-statechange-row">
            <dt>Policy on deployment</dt>
            <dd>
              <Badge tone="blocked">DISABLED</Badge> — activation is a separate decision
            </dd>
          </div>
          <div className="cl-statechange-row">
            <dt>CRE mode</dt>
            <dd>Official CLI simulator · no DON, no TEE evidence</dd>
          </div>
          <div className="cl-statechange-row">
            <dt>Runtime image</dt>
            <dd className="cl-mono">sha256:9f4c72be…21ab5d</dd>
          </div>
          <div className="cl-statechange-row">
            <dt>Production-chain execution</dt>
            <dd>
              <Badge tone="deny">DISABLED</Badge>
            </dd>
          </div>
        </dl>
      </Modal>
    </StudioPage>
  );
}
