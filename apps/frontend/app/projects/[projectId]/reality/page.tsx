'use client';

/**
 * Reality Lab (spec §16).
 *
 * Real mainnet read-only context, local forks, snapshots and synthetic
 * overlays — without ever blurring execution authority.
 *
 * Rules encoded here:
 *  - MARKET SOURCE and EXECUTION TARGET are shown as two separate fields and
 *    are never merged into one "network" statement.
 *  - A blocked or limited mode says exactly what is missing.
 *  - A fork transaction is labelled LOCAL FORK TRANSACTION and never receives a
 *    public explorer link.
 *  - The base snapshot is immutable; an overlay is applied on top of it.
 */
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Layers, Play, Plus, RotateCcw, Save, Trash2, Undo2 } from 'lucide-react';
import { StudioPage } from '@/components/studio/PageScaffold';
import {
  Badge,
  BlockchainRef,
  BlockerBanner,
  Card,
  FreshnessBadge,
  KeyValue,
  Section,
  StatusBadge,
  TimeAgo,
  TrustClassBadge,
} from '@/components/studio/primitives';
import { Modal, StandardConfirmation } from '@/components/studio/dialogs';
import { useWorkbench } from '@/lib/studio/workbench';
import { PROJECT, agentBySlug } from '@/lib/studio/mock/core';
import { LOCAL_FORK, REALITY_MODES, SNAPSHOT, SYNTHETIC_OVERLAYS } from '@/lib/studio/mock/test';
import type { RealityMode, RealitySource } from '@/lib/studio/types';

/** A transaction that exists only on the local fork node. */
const FORK_TX_HASH = '0x9a71c05e3d84b26f07a1c4e93b25d80f6a3c17e94b0d25a8c3f61e7b48d0a297';

export default function RealityLabPage() {
  const searchParams = useSearchParams();
  const { setSelection, developerMode, pushToast } = useWorkbench();
  const agent = agentBySlug(searchParams.get('agent'));

  const [mode, setMode] = useState<RealityMode>('LIVE_MAINNET_MIRROR');
  const [provenanceOf, setProvenanceOf] = useState<RealitySource | null>(null);
  const [appliedOverlay, setAppliedOverlay] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [destroyOpen, setDestroyOpen] = useState(false);
  const [forkDestroyed, setForkDestroyed] = useState(false);

  const overlay = SYNTHETIC_OVERLAYS.find((o) => o.id === appliedOverlay) ?? null;

  return (
    <StudioPage
      segment="reality"
      badges={<Badge tone="neutral">{agent.name}</Badge>}
    >
      {/* Market source and execution target are deliberately two fields. */}
      <Section label="Environment">
        <div className="cl-grid cl-grid-2">
          <Card>
            <div className="cl-label" style={{ marginBottom: 8 }}>
              Market source
            </div>
            <div className="cl-display-s" style={{ marginBottom: 8 }}>
              {PROJECT.environment.realitySource}
            </div>
            <div className="cl-row cl-row-wrap" style={{ gap: 6 }}>
              <Badge tone="data" large>
                READ ONLY
              </Badge>
              <span className="cl-meta">Used for context. No write path exists to this chain.</span>
            </div>
          </Card>

          <Card>
            <div className="cl-label" style={{ marginBottom: 8 }}>
              Execution target
            </div>
            <div className="cl-display-s" style={{ marginBottom: 8 }}>
              {PROJECT.environment.executionNetwork}
            </div>
            <div className="cl-row cl-row-wrap" style={{ gap: 6 }}>
              <Badge tone="sim" large>
                TESTNET
              </Badge>
              <span className="cl-meta">Chain id {PROJECT.environment.executionChainId}. Every transaction lands here.</span>
            </div>
          </Card>
        </div>
      </Section>

      {/* mode selector */}
      <Section label="Reality mode">
        <div className="cl-grid cl-grid-2">
          {REALITY_MODES.map((option) => {
            const selectable = option.availability !== 'BLOCKED';
            const active = mode === option.mode;
            return (
              <button
                key={option.mode}
                type="button"
                className="cl-card"
                disabled={!selectable}
                onClick={() => selectable && setMode(option.mode)}
                style={{
                  textAlign: 'left',
                  padding: 0,
                  cursor: selectable ? 'pointer' : 'not-allowed',
                  borderColor: active ? 'var(--cl-ink)' : 'var(--cl-line)',
                  background: active ? 'rgba(0, 66, 175, 0.06)' : 'var(--cl-panel)',
                  opacity: selectable ? 1 : 0.72,
                }}
              >
                <div className="cl-card-head">
                  <div className="cl-card-title">{option.label}</div>
                  <StatusBadge
                    status={
                      option.availability === 'AVAILABLE'
                        ? 'READY'
                        : option.availability === 'LIMITED'
                          ? 'LIMITED'
                          : 'BLOCKED'
                    }
                  />
                </div>
                <div className="cl-card-body">
                  <p className="cl-meta" style={{ whiteSpace: 'normal' }}>
                    {option.description}
                  </p>
                  {option.blockerReason ? (
                    <p style={{ marginTop: 8, fontSize: 12.5, color: 'var(--cl-warn)' }}>{option.blockerReason}</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* live mirror */}
      {mode === 'LIVE_MAINNET_MIRROR' || mode === 'HISTORICAL_REPLAY' || mode === 'SYNTHETIC' ? (
        <>
          <Section
            label="Snapshot"
            actions={<Badge tone={overlay ? 'sim' : 'neutral'}>{overlay ? `Overlay: ${overlay.label}` : 'Base snapshot'}</Badge>}
          >
            <Card>
              <KeyValue
                rows={[
                  { label: 'Snapshot ID', value: SNAPSHOT.id, mono: true },
                  {
                    label: 'Mainnet anchor block',
                    value: <BlockchainRef label={SNAPSHOT.anchorBlock.toLocaleString('en-US')} value={SNAPSHOT.anchorHash} kind="hash" />,
                  },
                  { label: 'Created', value: <TimeAgo iso={SNAPSHOT.createdAt} /> },
                  { label: 'Age', value: `${SNAPSHOT.ageSeconds}s` },
                  { label: 'Coherence', value: SNAPSHOT.coherence },
                  { label: 'Snapshot hash', value: SNAPSHOT.hash, mono: true },
                ]}
              />
              {overlay ? (
                <div style={{ marginTop: 14 }}>
                  <BlockerBanner tone="sim" title={`Synthetic overlay applied · ${overlay.label}`}>
                    The base snapshot is unchanged underneath. Overlay effects:{' '}
                    {overlay.effects.map((e) => `${e.key} ${e.value}`).join(' · ')}
                  </BlockerBanner>
                </div>
              ) : null}
            </Card>
          </Section>

          <Section label="Sources" actions={<span className="cl-meta">Click a row for full provenance</span>}>
            <Card flush>
              <div className="cl-table-scroll">
                <table className="cl-table" style={{ minWidth: 860 }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 150 }}>Provider</th>
                      <th style={{ minWidth: 140 }}>Data</th>
                      <th style={{ minWidth: 150 }}>Value</th>
                      <th style={{ width: 150 }}>Trust class</th>
                      <th style={{ width: 110 }}>Source block</th>
                      <th style={{ width: 190 }}>Freshness</th>
                      <th style={{ width: 130 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SNAPSHOT.sources.map((source) => (
                      <tr
                        key={source.id}
                        data-clickable="true"
                        onClick={() => {
                          setProvenanceOf(source);
                          setSelection({ kind: 'reality-source', id: source.id, label: source.provider });
                        }}
                      >
                        <td className="cl-strong">{source.provider}</td>
                        <td>{source.dataType}</td>
                        <td className="cl-mono">{source.value}</td>
                        <td>
                          <TrustClassBadge trust={source.trustClass} />
                        </td>
                        <td className="cl-mono">{source.sourceBlock?.toLocaleString('en-US') ?? '—'}</td>
                        <td>
                          <FreshnessBadge freshness={source.freshness} compact />
                        </td>
                        <td>
                          <StatusBadge status={source.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Section>
        </>
      ) : null}

      {/* synthetic overlays */}
      {mode === 'SYNTHETIC' ? (
        <Section
          label="Synthetic overlays"
          actions={
            <div className="cl-row" style={{ gap: 6 }}>
              <button type="button" className="cl-btn cl-btn-sm" onClick={() => setCompareOpen(true)} disabled={!overlay}>
                Compare with Base
              </button>
              <button
                type="button"
                className="cl-btn cl-btn-sm"
                onClick={() => {
                  setAppliedOverlay(null);
                  pushToast('Overlay cleared');
                }}
                disabled={!overlay}
              >
                <Undo2 size={11} aria-hidden />
                Clear Overlay
              </button>
            </div>
          }
        >
          <div className="cl-grid cl-grid-3">
            {SYNTHETIC_OVERLAYS.map((preset) => (
              <Card key={preset.id} title={preset.label}>
                <p className="cl-meta" style={{ whiteSpace: 'normal', marginBottom: 10 }}>
                  {preset.description}
                </p>
                <dl className="cl-kv" style={{ gridTemplateColumns: 'minmax(0, 110px) minmax(0, 1fr)' }}>
                  {preset.effects.map((e) => (
                    <div key={e.key} style={{ display: 'contents' }}>
                      <dt>{e.key}</dt>
                      <dd className="cl-mono">{e.value}</dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  className={`cl-btn cl-btn-sm ${appliedOverlay === preset.id ? 'cl-btn-primary' : ''}`}
                  style={{ marginTop: 10 }}
                  onClick={() => {
                    setAppliedOverlay(preset.id);
                    pushToast(`${preset.label} applied over the base snapshot`);
                  }}
                >
                  <Layers size={11} aria-hidden />
                  {appliedOverlay === preset.id ? 'Applied' : 'Apply Overlay'}
                </button>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}

      {/* local fork */}
      {mode === 'LOCAL_MAINNET_FORK' ? (
        <>
          <Section label="Local fork">
            {forkDestroyed ? (
              <Card>
                <p className="cl-meta">No fork exists. Create one to execute against an isolated copy of mainnet.</p>
                <button
                  type="button"
                  className="cl-btn cl-btn-primary"
                  style={{ marginTop: 12 }}
                  onClick={() => {
                    setForkDestroyed(false);
                    pushToast('Fork created');
                  }}
                >
                  <Plus size={12} aria-hidden />
                  Create Fork
                </button>
              </Card>
            ) : (
              <Card>
                <KeyValue
                  rows={[
                    { label: 'Fork ID', value: LOCAL_FORK.id, mono: true },
                    { label: 'Source chain', value: LOCAL_FORK.sourceChain },
                    {
                      label: 'Forked at block',
                      value: (
                        <BlockchainRef
                          label={LOCAL_FORK.blockNumber.toLocaleString('en-US')}
                          value={LOCAL_FORK.blockHash}
                          kind="hash"
                          local
                        />
                      ),
                    },
                    { label: 'Anvil version', value: LOCAL_FORK.anvilVersion, mono: true },
                    { label: 'State', value: <StatusBadge status={LOCAL_FORK.state} /> },
                    {
                      label: 'Resource lifetime',
                      value: `${Math.round(LOCAL_FORK.lifetimeSeconds / 60)} minutes from creation`,
                    },
                    ...(developerMode
                      ? [{ label: 'Local endpoint', value: LOCAL_FORK.endpoint, mono: true }]
                      : []),
                  ]}
                />

                <div className="cl-btn-group" style={{ marginTop: 14 }}>
                  <button type="button" className="cl-btn cl-btn-sm" onClick={() => pushToast('Fork reset to its source block')}>
                    <RotateCcw size={11} aria-hidden />
                    Reset Fork
                  </button>
                  <button type="button" className="cl-btn cl-btn-sm" onClick={() => pushToast('Fork state snapshotted')}>
                    <Save size={11} aria-hidden />
                    Snapshot Fork
                  </button>
                  <button type="button" className="cl-btn cl-btn-sm" onClick={() => pushToast('Fork restored from snapshot')}>
                    <Undo2 size={11} aria-hidden />
                    Restore
                  </button>
                  <button type="button" className="cl-btn cl-btn-sm cl-btn-primary" onClick={() => pushToast('Agent running against the fork')}>
                    <Play size={11} aria-hidden />
                    Run Agent on Fork
                  </button>
                  <span className="cl-spacer" />
                  <button type="button" className="cl-btn cl-btn-sm cl-btn-danger" onClick={() => setDestroyOpen(true)}>
                    <Trash2 size={11} aria-hidden />
                    Destroy Fork
                  </button>
                </div>
              </Card>
            )}
          </Section>

          {!forkDestroyed ? (
            <Section label="Fork transactions">
              <Card flush>
                <table className="cl-table">
                  <thead>
                    <tr>
                      <th style={{ width: 170 }}>Kind</th>
                      <th>Transaction</th>
                      <th style={{ width: 130 }}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <Badge tone="sim">LOCAL FORK TRANSACTION</Badge>
                      </td>
                      <td>
                        {/* local=true: a fork transaction never gets a public explorer link */}
                        <BlockchainRef value={FORK_TX_HASH} kind="tx" local />
                      </td>
                      <td>
                        <StatusBadge status="PASS" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Card>
              <p className="cl-meta" style={{ marginTop: 8 }}>
                Fork transactions exist only on your local node. They are never given a public explorer link, because
                there is nothing public to link to.
              </p>
            </Section>
          ) : null}
        </>
      ) : null}

      {/* historical replay limits */}
      {mode === 'HISTORICAL_REPLAY' ? (
        <BlockerBanner tone="warn" title="Historical Replay is LIMITED">
          No archive RPC is registered, so replay can only reach the most recent 128 blocks. Anything older is
          unavailable — it is not approximated from another source.
        </BlockerBanner>
      ) : null}

      {/* provenance drawer */}
      <Modal
        open={provenanceOf !== null}
        onClose={() => setProvenanceOf(null)}
        title={provenanceOf ? `${provenanceOf.provider} · provenance` : ''}
        wide
        footer={
          <button type="button" className="cl-btn cl-btn-primary" onClick={() => setProvenanceOf(null)}>
            Close
          </button>
        }
      >
        {provenanceOf ? (
          <>
            <div className="cl-row cl-row-wrap" style={{ gap: 6, marginBottom: 14 }}>
              <TrustClassBadge trust={provenanceOf.trustClass} />
              <StatusBadge status={provenanceOf.status} />
              <FreshnessBadge freshness={provenanceOf.freshness} />
            </div>
            <KeyValue
              rows={[
                { label: 'Data type', value: provenanceOf.dataType },
                { label: 'Value', value: provenanceOf.value, mono: true },
                { label: 'Source block', value: provenanceOf.sourceBlock?.toLocaleString('en-US') ?? '—' },
                { label: 'Source time', value: provenanceOf.sourceTime ? <TimeAgo iso={provenanceOf.sourceTime} /> : '—' },
                { label: 'Lifecycle', value: provenanceOf.lifecycle },
                ...provenanceOf.provenance.map((p) => ({ label: p.key, value: p.value, mono: p.mono })),
              ]}
            />
          </>
        ) : null}
      </Modal>

      {/* compare with base */}
      <Modal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        title="Overlay compared with base snapshot"
        wide
        footer={
          <button type="button" className="cl-btn cl-btn-primary" onClick={() => setCompareOpen(false)}>
            Close
          </button>
        }
      >
        <table className="cl-table">
          <thead>
            <tr>
              <th>Field</th>
              <th style={{ width: 200 }}>Base</th>
              <th style={{ width: 220 }}>With {overlay?.label}</th>
            </tr>
          </thead>
          <tbody>
            {(overlay?.effects ?? []).map((e) => (
              <tr key={e.key}>
                <td className="cl-strong">{e.key}</td>
                <td className="cl-mono">{e.value.split('→')[0]?.trim() ?? '—'}</td>
                <td className="cl-mono" style={{ color: 'var(--cl-sim)' }}>
                  {e.value.split('→')[1]?.trim() ?? e.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="cl-meta" style={{ marginTop: 12 }}>
          The base snapshot {SNAPSHOT.id} is immutable. An overlay is a view on top of it and can be cleared without
          re-reading the chain.
        </p>
      </Modal>

      {/* destroy fork */}
      <StandardConfirmation
        open={destroyOpen}
        onClose={() => setDestroyOpen(false)}
        onConfirm={() => {
          setDestroyOpen(false);
          setForkDestroyed(true);
          pushToast('Fork destroyed');
        }}
        title="Destroy fork"
        consequence="The local node and all state produced on it are discarded. Nothing on a public chain is affected, because a fork never touches one."
        resource={LOCAL_FORK.id}
        actionLabel="Destroy Fork"
      />
    </StudioPage>
  );
}
