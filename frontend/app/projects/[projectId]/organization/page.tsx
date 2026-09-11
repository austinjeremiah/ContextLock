'use client';

/**
 * Organization / Agents (spec §11).
 *
 * Agents are distinct principals, not one super-agent: separate identity,
 * separate policy hash, separate budget. A shared security primitive between two
 * agents is a blocking CRITICAL issue, and a reporting-only agent always shows
 * EXECUTION: NONE.
 */
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CornerDownRight, Copy, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { StudioPage } from '@/components/studio/PageScaffold';
import {
  Badge,
  BlockchainRef,
  BlockerBanner,
  Card,
  KeyValue,
  NetworkRoleBadge,
  Section,
  StatusBadge,
  formatUsd,
} from '@/components/studio/primitives';
import { Modal, SecurityConfirmation, StandardConfirmation } from '@/components/studio/dialogs';
import { useWorkbench } from '@/lib/studio/workbench';
import { useControlRequest } from '@/lib/studio/control-bridge';
import { PROJECT } from '@/lib/studio/mock/core';
import type { Agent } from '@/lib/studio/types';

export default function OrganizationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSelection, pushToast } = useWorkbench();

  const agents = PROJECT.agents;
  const initial = agents.find((a) => a.slug === searchParams.get('agent')) ?? agents[0];
  const [selectedId, setSelectedId] = useState(initial.id);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [revoked, setRevoked] = useState<string[]>([]);

  const selected = agents.find((a) => a.id === selectedId) ?? agents[0];
  const isRevoked = revoked.includes(selected.id);

  useControlRequest('REVOKE_AGENT', () => setRevokeOpen(true));

  /* A forbidden shared primitive between principals is a blocking issue. */
  const sharedPolicy = useMemo(() => {
    const seen = new Map<string, Agent[]>();
    for (const agent of agents) {
      seen.set(agent.policyHash, [...(seen.get(agent.policyHash) ?? []), agent]);
    }
    return [...seen.values()].filter((group) => group.length > 1);
  }, [agents]);

  const aggregate = agents.reduce((sum, a) => sum + a.orgBudgetImpact, 0);

  const go = (segment: string) => router.push(`/projects/${PROJECT.id}/${segment}?agent=${selected.slug}`);

  return (
    <StudioPage
      segment="organization"
      actions={
        <button type="button" className="cl-btn cl-btn-primary" onClick={() => setAddOpen(true)}>
          <Plus size={13} aria-hidden />
          Add Agent
        </button>
      }
      banners={
        sharedPolicy.length > 0 ? (
          <BlockerBanner
            tone="deny"
            title="CRITICAL — shared policy principal"
            actions={
              <button type="button" className="cl-btn cl-btn-sm" onClick={() => go('policies')}>
                Open Policy
              </button>
            }
          >
            {sharedPolicy
              .map((group) => group.map((a) => a.name).join(' and '))
              .join('; ')}{' '}
            share a policy hash. Agents must be separate principals: a shared policy means one agent&apos;s authority is
            indistinguishable from another&apos;s.
          </BlockerBanner>
        ) : null
      }
    >
      <div className="cl-grid" style={{ gridTemplateColumns: 'minmax(230px, 300px) minmax(0, 1fr)', alignItems: 'start' }}>
        {/* organization tree */}
        <Card title={PROJECT.organization ?? 'Agents'} flush>
          <ul>
            {agents.map((agent) => {
              const agentRevoked = revoked.includes(agent.id);
              return (
                <li key={agent.id}>
                  <button
                    type="button"
                    className="cl-list-row"
                    style={{ width: '100%', textAlign: 'left' }}
                    data-selected={agent.id === selectedId}
                    onClick={() => {
                      setSelectedId(agent.id);
                      setSelection({ kind: 'agent', id: agent.id, label: agent.name });
                    }}
                  >
                    <CornerDownRight size={12} aria-hidden style={{ opacity: 0.5, flex: '0 0 auto' }} />
                    <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <span className="cl-strong" style={{ display: 'block' }}>
                        {agent.name}
                      </span>
                      <span className="cl-meta">{agent.role}</span>
                    </span>
                    <StatusBadge status={agentRevoked ? 'REVOKED' : agent.status} />
                  </button>
                </li>
              );
            })}
          </ul>
          <div style={{ padding: 11, borderTop: '1px solid var(--cl-line)' }}>
            <div className="cl-row" style={{ justifyContent: 'space-between' }}>
              <span className="cl-meta">Organization aggregate budget</span>
              <span className="cl-strong">{formatUsd(aggregate)}</span>
            </div>
            <p className="cl-meta" style={{ marginTop: 5, whiteSpace: 'normal' }}>
              Worst-case combined authority across all principals in a single rolling window.
            </p>
          </div>
        </Card>

        {/* selected agent */}
        <div>
          <Card
            title={
              <span className="cl-row" style={{ gap: 8 }}>
                {selected.name}
                <StatusBadge status={isRevoked ? 'REVOKED' : selected.status} />
                {selected.executionClass === 'REPORTING_ONLY' ? (
                  <NetworkRoleBadge role="NONE" />
                ) : (
                  <NetworkRoleBadge role="EXECUTION_TESTNET" />
                )}
              </span>
            }
            actions={
              <div className="cl-row" style={{ gap: 6 }}>
                <button type="button" className="cl-btn cl-btn-sm" onClick={() => go('blueprint')}>
                  Open Blueprint
                </button>
                <button type="button" className="cl-btn cl-btn-sm" onClick={() => go('architecture')}>
                  Open Architecture
                </button>
                <button type="button" className="cl-btn cl-btn-sm" onClick={() => go('policies')}>
                  Open Policy
                </button>
              </div>
            }
          >
            <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>{selected.objective}</p>

            <KeyValue
              rows={[
                {
                  label: 'ENS identity',
                  value: <BlockchainRef label={selected.ensName} value={selected.ensNode} kind="node" network="Ethereum Sepolia" />,
                },
                { label: 'Agent address', value: <BlockchainRef value={selected.address} network="Ethereum Sepolia" /> },
                { label: 'Role / objective', value: selected.role },
                {
                  label: 'Execution class',
                  value:
                    selected.executionClass === 'REPORTING_ONLY' ? (
                      <span className="cl-row" style={{ gap: 8 }}>
                        <Badge tone="blocked">EXECUTION: NONE</Badge>
                        <span className="cl-meta">This agent can never obtain a capability or submit a transaction.</span>
                      </span>
                    ) : (
                      selected.executionClass.replace(/_/g, ' ')
                    ),
                },
                {
                  label: 'Allowed adapters',
                  value: (
                    <span className="cl-row cl-row-wrap" style={{ gap: 5 }}>
                      {selected.allowedAdapters.map((a) => (
                        <Badge key={a} tone="neutral">
                          {a.replace('adp_', '')}
                        </Badge>
                      ))}
                    </span>
                  ),
                },
                {
                  label: 'Individual budget',
                  value:
                    selected.budget.autonomousPerAction === 0 ? (
                      <span className="cl-meta">No budget — this agent holds no spending authority.</span>
                    ) : (
                      <>
                        {formatUsd(selected.budget.autonomousPerAction)} per action ·{' '}
                        {formatUsd(selected.budget.windowLimit)} per {selected.budget.window}
                        <div className="cl-meta">
                          Used {formatUsd(selected.budget.windowUsed)} of {formatUsd(selected.budget.windowLimit)} in the
                          current window.
                        </div>
                      </>
                    ),
                },
                {
                  label: 'Organization impact',
                  value: `${formatUsd(selected.orgBudgetImpact)} of the ${formatUsd(aggregate)} aggregate`,
                },
                { label: 'Policy hash', value: <BlockchainRef value={selected.policyHash} kind="hash" /> },
                {
                  label: 'Runtime revision',
                  value: selected.runtimeRevision === null ? 'Never deployed' : `r${selected.runtimeRevision}`,
                },
              ]}
            />
          </Card>

          {selected.executionClass === 'REPORTING_ONLY' ? (
            <div style={{ marginTop: 14 }}>
              <BlockerBanner tone="neutral" title="Reporting-only principal">
                {selected.name} has execution class NONE. There is no capability-issuing path for it, so no policy limit
                needs to exist — the absence of authority is structural, not a setting that could be raised in place.
              </BlockerBanner>
            </div>
          ) : null}

          <Section label="Agent controls">
            <div className="cl-btn-group">
              <button type="button" className="cl-btn" onClick={() => setDuplicateOpen(true)}>
                <Copy size={13} aria-hidden />
                Duplicate as New Agent
              </button>
              <button
                type="button"
                className="cl-btn"
                onClick={() => setRemoveOpen(true)}
                disabled={selected.runtimeRevision !== null}
                title={
                  selected.runtimeRevision !== null
                    ? 'This agent has been deployed and cannot be removed as a draft.'
                    : undefined
                }
              >
                <Trash2 size={13} aria-hidden />
                Remove Draft Agent
              </button>
              <span className="cl-spacer" />
              <button
                type="button"
                className="cl-btn cl-btn-danger"
                onClick={() => setRevokeOpen(true)}
                disabled={isRevoked}
              >
                <ShieldAlert size={13} aria-hidden />
                Revoke Agent
              </button>
            </div>
          </Section>
        </div>
      </div>

      {/* revoke — security confirmation */}
      <SecurityConfirmation
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        onConfirm={() => {
          setRevoked((prev) => [...prev, selected.id]);
          setRevokeOpen(false);
          pushToast(`Revocation submitted for ${selected.ensName}`);
        }}
        action="Revoke agent identity"
        currentState={<StatusBadge status="ACTIVE" />}
        requestedState={<StatusBadge status="REVOKED" />}
        network={PROJECT.environment.executionNetwork}
        resource={<BlockchainRef label={selected.ensName} value={selected.ensNode} kind="node" />}
        extraRows={[
          {
            label: 'Sibling impact',
            value:
              agents.filter((a) => a.id !== selected.id).map((a) => a.name).join(', ') +
              ' are separate principals and are not affected.',
          },
          {
            label: 'Capability impact',
            value: 'Capabilities already issued to this identity can no longer be honoured by the executor.',
          },
        ]}
        consequence="The agent loses its verifiable identity. This does not by itself change the policy's enabled state — financial authority is a separate control."
        actionLabel="Revoke Agent Identity"
      />

      {/* add agent */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add agent"
        subtitle="Creates a draft principal with its own identity, policy and budget."
        footer={
          <>
            <button type="button" className="cl-btn" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="cl-btn cl-btn-primary"
              onClick={() => {
                setAddOpen(false);
                pushToast('Draft agent created');
                router.push(`/projects/${PROJECT.id}/build`);
              }}
            >
              Create Draft Agent
            </button>
          </>
        }
      >
        <div className="cl-field">
          <label className="cl-field-label" htmlFor="agent-name">
            Agent name
          </label>
          <input id="agent-name" className="cl-input" placeholder="Settlement" autoComplete="off" />
        </div>
        <div className="cl-field">
          <label className="cl-field-label" htmlFor="agent-class">
            Execution class
          </label>
          <select id="agent-class" className="cl-select" defaultValue="REPORTING_ONLY">
            <option value="REPORTING_ONLY">Reporting only — no execution authority</option>
            <option value="READ_ONLY">Read only — may read chain state, cannot execute</option>
            <option value="WRITE_CAPABLE">Write capable — may execute within a policy</option>
          </select>
          <span className="cl-field-hint">
            Execution class cannot be widened in place later. Widening requires a new principal with a new identity.
          </span>
        </div>
        <p className="cl-meta">
          The draft starts with no ENS identity, no policy and financial authority disabled.
        </p>
      </Modal>

      {/* duplicate */}
      <StandardConfirmation
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        onConfirm={() => {
          setDuplicateOpen(false);
          pushToast(`${selected.name} duplicated as a new draft principal`);
        }}
        title="Duplicate as new agent"
        consequence="Configuration is copied. A new ENS identity, a new namespace entry and a new policy are required — identity, policy hash and any active authority are never copied, so the duplicate starts with no authority."
        resource={selected.name}
        actionLabel="Duplicate as New Agent"
      />

      {/* remove draft */}
      <StandardConfirmation
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onConfirm={() => {
          setRemoveOpen(false);
          pushToast('Draft agent removed');
        }}
        title="Remove draft agent"
        consequence="The draft principal and its unsaved configuration are removed. This is only possible because the agent has never been deployed."
        resource={selected.name}
        actionLabel="Remove Draft Agent"
      />
    </StudioPage>
  );
}
