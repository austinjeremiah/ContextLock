'use client';

/**
 * Integrations & Data Sources (spec §19).
 *
 * Registered adapters, data trust, credentials and source health.
 *
 * Rules encoded here:
 *  - A credential is never shown as a value. Only its logical name, scope,
 *    storage boundary, status and what uses it.
 *  - An unavailable source says so and names what is missing. It is never
 *    quietly replaced by a source of a lower trust class.
 *  - Trust class is a property of the source, not a label that can be raised.
 */
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileUp, KeyRound, Plug, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { StudioPage } from '@/components/studio/PageScaffold';
import {
  Badge,
  BlockerBanner,
  Card,
  FreshnessBadge,
  KeyValue,
  NetworkRoleBadge,
  Section,
  StatusBadge,
  TabStrip,
  TimeAgo,
  TrustClassBadge,
} from '@/components/studio/primitives';
import { Modal, StandardConfirmation } from '@/components/studio/dialogs';
import { useWorkbench } from '@/lib/studio/workbench';
import { PROJECT, agentById } from '@/lib/studio/mock/core';
import {
  ADAPTERS,
  CREDENTIALS,
  CREDENTIAL_BOUNDARY_LABEL,
  OPENAPI_INTEGRATIONS,
} from '@/lib/studio/mock/engineering';
import type { Adapter, Credential } from '@/lib/studio/types';

type Tab = 'adapters' | 'sources' | 'credentials' | 'openapi';

export default function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSelection, pushToast } = useWorkbench();
  const agentSlug = searchParams.get('agent') ?? PROJECT.agents[0].slug;

  const [tab, setTab] = useState<Tab>('adapters');
  const [inspecting, setInspecting] = useState<Adapter | null>(null);
  const [configuring, setConfiguring] = useState<Credential | null>(null);
  const [disableTarget, setDisableTarget] = useState<Adapter | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const blocked = useMemo(() => ADAPTERS.filter((a) => a.status === 'UNAVAILABLE'), []);

  const testConnection = (adapter: Adapter) => {
    setTesting(adapter.id);
    window.setTimeout(() => {
      setTesting(null);
      pushToast(
        adapter.status === 'UNAVAILABLE'
          ? `${adapter.name}: still unavailable — ${adapter.blockerReason ?? 'connection failed'}`
          : `${adapter.name}: connection healthy`,
      );
    }, 900);
  };

  return (
    <StudioPage
      segment="integrations"
      actions={
        <>
          <button type="button" className="cl-btn" onClick={() => setImportOpen(true)}>
            <FileUp size={13} aria-hidden />
            Import OpenAPI
          </button>
          <button type="button" className="cl-btn cl-btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={13} aria-hidden />
            Add Integration
          </button>
        </>
      }
      banners={
        blocked.length > 0 ? (
          <BlockerBanner
            tone="blocked"
            title={`${blocked.length} source unavailable`}
            actions={
              <button
                type="button"
                className="cl-btn cl-btn-sm"
                onClick={() => {
                  setTab('credentials');
                  setConfiguring(CREDENTIALS.find((c) => c.id === 'cred_the_graph') ?? null);
                }}
              >
                Configure credential
              </button>
            }
          >
            {blocked.map((a) => a.name).join(', ')} cannot authenticate. No indexed data is being served, and nothing of
            a lower trust class is being substituted for it — a decision that depends on this source is refused instead.
          </BlockerBanner>
        ) : null
      }
    >
      <TabStrip<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'adapters', label: 'Adapters' },
          { id: 'sources', label: 'Data Sources' },
          { id: 'credentials', label: 'Credentials' },
          { id: 'openapi', label: 'Custom / OpenAPI' },
        ]}
      />

      {/* ---------------------------------------------------------- adapters */}
      {tab === 'adapters' ? (
        <Card flush>
          <div className="cl-table-scroll">
            <table className="cl-table" style={{ minWidth: 1080 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 170 }}>Name</th>
                  <th style={{ width: 190 }}>Adapter · version</th>
                  <th style={{ width: 120 }}>Type</th>
                  <th style={{ width: 170 }}>Network</th>
                  <th style={{ minWidth: 160 }}>Capabilities</th>
                  <th style={{ width: 150 }}>Trust class</th>
                  <th style={{ width: 130 }}>Status</th>
                  <th style={{ width: 180 }}>Lifecycle</th>
                  <th style={{ width: 130 }}>Used by</th>
                </tr>
              </thead>
              <tbody>
                {ADAPTERS.map((adapter) => (
                  <tr
                    key={adapter.id}
                    data-clickable="true"
                    onClick={() => {
                      setInspecting(adapter);
                      setSelection({ kind: 'adapter', id: adapter.id, label: adapter.name });
                    }}
                  >
                    <td className="cl-strong">{adapter.name}</td>
                    <td className="cl-mono">
                      {adapter.adapterId}
                      <span className="cl-dim"> · {adapter.version}</span>
                    </td>
                    <td>{adapter.type}</td>
                    <td>
                      <NetworkRoleBadge role={adapter.networkRole} />
                    </td>
                    <td className="cl-mono" style={{ fontSize: 11.5 }}>
                      {adapter.capabilities.join(', ')}
                    </td>
                    <td>
                      <TrustClassBadge trust={adapter.trustClass} />
                    </td>
                    <td>
                      <StatusBadge status={adapter.status} />
                    </td>
                    <td className="cl-meta">{adapter.lifecycle}</td>
                    <td className="cl-meta">
                      {adapter.usedByAgentIds.map((id) => agentById(id)?.name ?? id).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {/* ------------------------------------------------------- data sources */}
      {tab === 'sources' ? (
        <Section label="Sources and trust" actions={<span className="cl-meta">Trust class is a property of the source</span>}>
          <div className="cl-col" style={{ gap: 10 }}>
            {ADAPTERS.map((adapter) => (
              <Card key={adapter.id}>
                <div className="cl-row cl-row-wrap" style={{ gap: 10 }}>
                  <span className="cl-strong" style={{ fontSize: 14 }}>
                    {adapter.name}
                  </span>
                  <TrustClassBadge trust={adapter.trustClass} />
                  <StatusBadge status={adapter.status} />
                  <NetworkRoleBadge role={adapter.networkRole} />
                  <span className="cl-spacer" />
                  <FreshnessBadge freshness={adapter.freshness} compact />
                  <button
                    type="button"
                    className="cl-btn cl-btn-sm"
                    onClick={() => testConnection(adapter)}
                    disabled={testing === adapter.id}
                  >
                    <RefreshCw size={11} aria-hidden />
                    {testing === adapter.id ? 'Testing…' : 'Test connection'}
                  </button>
                  <button type="button" className="cl-btn cl-btn-sm" onClick={() => setInspecting(adapter)}>
                    View provenance
                  </button>
                </div>

                {adapter.blockerReason ? (
                  <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--cl-blocked)' }}>{adapter.blockerReason}</p>
                ) : null}
              </Card>
            ))}
          </div>
        </Section>
      ) : null}

      {/* -------------------------------------------------------- credentials */}
      {tab === 'credentials' ? (
        <>
          <BlockerBanner tone="neutral" title="Credential values are never displayed">
            This page shows what a credential is for, where it is stored and whether it currently works. The value
            itself is never read back into the browser, in developer mode or otherwise.
          </BlockerBanner>

          <Card flush>
            <div className="cl-table-scroll">
              <table className="cl-table" style={{ minWidth: 940 }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 180 }}>Credential</th>
                    <th style={{ minWidth: 200 }}>Scope</th>
                    <th style={{ width: 170 }}>Storage boundary</th>
                    <th style={{ width: 130 }}>Status</th>
                    <th style={{ width: 140 }}>Last verified</th>
                    <th style={{ width: 150 }}>Used by</th>
                    <th style={{ width: 210 }} />
                  </tr>
                </thead>
                <tbody>
                  {CREDENTIALS.map((credential) => (
                    <tr key={credential.id}>
                      <td className="cl-strong">{credential.name}</td>
                      <td className="cl-meta">{credential.scope}</td>
                      <td>
                        <Badge tone={credential.boundary === 'NONE_PUBLIC' ? 'warn' : 'neutral'}>
                          {CREDENTIAL_BOUNDARY_LABEL[credential.boundary]}
                        </Badge>
                      </td>
                      <td>
                        <StatusBadge status={credential.status} />
                      </td>
                      <td className="cl-meta">
                        {credential.lastVerified ? <TimeAgo iso={credential.lastVerified} /> : 'never'}
                      </td>
                      <td className="cl-meta">
                        {credential.usedBy.length === 0
                          ? '—'
                          : credential.usedBy.map((id) => ADAPTERS.find((a) => a.id === id)?.name ?? id).join(', ')}
                      </td>
                      <td>
                        <div className="cl-row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          <button type="button" className="cl-btn cl-btn-sm" onClick={() => setConfiguring(credential)}>
                            <KeyRound size={11} aria-hidden />
                            Configure
                          </button>
                          {credential.rotatable ? (
                            <button
                              type="button"
                              className="cl-btn cl-btn-sm"
                              onClick={() => pushToast(`${credential.name}: rotation requested`)}
                            >
                              Rotate
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}

      {/* ------------------------------------------------------------ openapi */}
      {tab === 'openapi' ? (
        <Section
          label="Custom integrations"
          actions={
            <button type="button" className="cl-btn cl-btn-sm" onClick={() => setImportOpen(true)}>
              <FileUp size={11} aria-hidden />
              Import OpenAPI
            </button>
          }
        >
          {OPENAPI_INTEGRATIONS.length === 0 ? (
            <Card>
              <p className="cl-meta">No custom integrations. Import an OpenAPI document to generate an adapter.</p>
            </Card>
          ) : (
            <div className="cl-col" style={{ gap: 12 }}>
              {OPENAPI_INTEGRATIONS.map((integration) => (
                <Card
                  key={integration.id}
                  title={integration.name}
                  actions={
                    <div className="cl-row" style={{ gap: 6 }}>
                      <StatusBadge status={integration.conformance} />
                      <button
                        type="button"
                        className="cl-btn cl-btn-sm"
                        onClick={() => pushToast('Conformance tests queued')}
                      >
                        <ShieldCheck size={11} aria-hidden />
                        Run conformance tests
                      </button>
                    </div>
                  }
                >
                  <KeyValue
                    rows={[
                      { label: 'Spec version', value: integration.specVersion },
                      { label: 'Allowed host', value: integration.allowedHost, mono: true },
                      { label: 'Auth type', value: integration.authType },
                      {
                        label: 'Generated adapter',
                        value: integration.generatedAdapter ?? 'not generated',
                        mono: Boolean(integration.generatedAdapter),
                      },
                    ]}
                  />
                  <div style={{ marginTop: 14 }}>
                    <div className="cl-label" style={{ marginBottom: 8 }}>
                      Validation
                    </div>
                    <div className="cl-path">
                      {integration.validation.map((row) => (
                        <div className="cl-path-step" key={row.message}>
                          <StatusBadge status={row.status} />
                          <span className="cl-path-step-detail">{row.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      ) : null}

      {/* adapter inspector */}
      <Modal
        open={inspecting !== null}
        onClose={() => setInspecting(null)}
        title={inspecting?.name ?? ''}
        subtitle={inspecting ? `${inspecting.adapterId} · ${inspecting.version}` : undefined}
        wide
        footer={
          inspecting ? (
            <>
              <button
                type="button"
                className="cl-btn cl-btn-danger"
                style={{ marginRight: 'auto' }}
                onClick={() => {
                  setDisableTarget(inspecting);
                  setInspecting(null);
                }}
                disabled={inspecting.usedByAgentIds.length > 0 && inspecting.status !== 'UNAVAILABLE'}
                title={
                  inspecting.usedByAgentIds.length > 0 && inspecting.status !== 'UNAVAILABLE'
                    ? 'In use by an agent whose Blueprint requires it'
                    : undefined
                }
              >
                Disable adapter
              </button>
              <button type="button" className="cl-btn" onClick={() => testConnection(inspecting)}>
                Test connection
              </button>
              <button type="button" className="cl-btn cl-btn-primary" onClick={() => setInspecting(null)}>
                Close
              </button>
            </>
          ) : null
        }
      >
        {inspecting ? (
          <>
            <div className="cl-row cl-row-wrap" style={{ gap: 6, marginBottom: 14 }}>
              <TrustClassBadge trust={inspecting.trustClass} />
              <StatusBadge status={inspecting.status} />
              <NetworkRoleBadge role={inspecting.networkRole} />
              <FreshnessBadge freshness={inspecting.freshness} />
            </div>

            {inspecting.blockerReason ? (
              <BlockerBanner tone="blocked" title="Unavailable">
                {inspecting.blockerReason}
              </BlockerBanner>
            ) : null}

            <KeyValue
              rows={[
                { label: 'Type', value: inspecting.type },
                { label: 'Network', value: inspecting.network },
                { label: 'Capabilities', value: inspecting.capabilities.join(', '), mono: true },
                { label: 'Lifecycle', value: inspecting.lifecycle },
                {
                  label: 'Conformance',
                  value: inspecting.conformance ? <StatusBadge status={inspecting.conformance} /> : 'not run',
                },
                {
                  label: 'Used by',
                  value:
                    inspecting.usedByAgentIds.map((id) => agentById(id)?.name ?? id).join(', ') || 'no agent',
                },
                ...inspecting.provenance.map((p) => ({ label: p.key, value: p.value, mono: p.mono })),
              ]}
            />
          </>
        ) : null}
      </Modal>

      {/* configure credential */}
      <Modal
        open={configuring !== null}
        onClose={() => setConfiguring(null)}
        title={configuring ? `Configure ${configuring.name}` : ''}
        subtitle="The value is written straight to its storage boundary and is never read back."
        footer={
          <>
            <button type="button" className="cl-btn" onClick={() => setConfiguring(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="cl-btn cl-btn-primary"
              onClick={() => {
                pushToast(`${configuring?.name} updated`);
                setConfiguring(null);
              }}
            >
              Save credential
            </button>
          </>
        }
      >
        {configuring ? (
          <>
            <KeyValue
              rows={[
                { label: 'Scope', value: configuring.scope },
                { label: 'Storage boundary', value: CREDENTIAL_BOUNDARY_LABEL[configuring.boundary] },
                { label: 'Current status', value: <StatusBadge status={configuring.status} /> },
                {
                  label: 'Used by',
                  value:
                    configuring.usedBy.map((id) => ADAPTERS.find((a) => a.id === id)?.name ?? id).join(', ') || '—',
                },
              ]}
            />
            <div className="cl-field" style={{ marginTop: 16, marginBottom: 0 }}>
              <label className="cl-field-label" htmlFor="cred-value">
                New value
              </label>
              <input
                id="cred-value"
                className="cl-input"
                type="password"
                placeholder="••••••••••••••••"
                autoComplete="off"
              />
              <span className="cl-field-hint">
                Stored in {CREDENTIAL_BOUNDARY_LABEL[configuring.boundary].toLowerCase()}. The existing value cannot be
                displayed, only replaced.
              </span>
            </div>
          </>
        ) : null}
      </Modal>

      {/* add integration */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add integration"
        subtitle="Registering a source does not grant the agent permission to use it."
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
                pushToast('Integration registered as a draft');
              }}
            >
              Register integration
            </button>
          </>
        }
      >
        <div className="cl-field">
          <label className="cl-field-label" htmlFor="int-type">
            Integration type
          </label>
          <select id="int-type" className="cl-select" defaultValue="oracle">
            <option value="oracle">Price oracle</option>
            <option value="protocol">Protocol adapter</option>
            <option value="indexer">Indexer</option>
            <option value="rpc">Chain access</option>
          </select>
        </div>
        <div className="cl-field">
          <label className="cl-field-label" htmlFor="int-trust">
            Trust class
          </label>
          <select id="int-trust" className="cl-select" defaultValue="UNVERIFIED">
            <option value="UNVERIFIED">UNVERIFIED</option>
            <option value="READ_ONLY">READ_ONLY</option>
            <option value="INDEXED">INDEXED</option>
            <option value="VERIFIED_ORACLE">VERIFIED_ORACLE</option>
          </select>
          <span className="cl-field-hint">
            Trust class must be justified by what the source actually guarantees. A Blueprint requiring a verified
            oracle will not accept an indexed source in its place.
          </span>
        </div>
        <p className="cl-meta">
          After registering, the adapter must still be named in the Blueprint&apos;s data requirements before the agent
          can read from it.
        </p>
      </Modal>

      {/* import openapi */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import OpenAPI specification"
        subtitle="The document is validated before an adapter is generated."
        footer={
          <>
            <button type="button" className="cl-btn" onClick={() => setImportOpen(false)}>
              Cancel
            </button>
            <button type="button" className="cl-btn cl-btn-primary" disabled>
              Validate and generate
            </button>
          </>
        }
      >
        <div className="cl-field">
          <label className="cl-field-label" htmlFor="oas-file">
            Specification
          </label>
          <input id="oas-file" type="file" accept=".json,.yaml,.yml" className="cl-input" style={{ paddingTop: 4 }} />
        </div>
        <div className="cl-field">
          <label className="cl-field-label" htmlFor="oas-host">
            Allowed host
          </label>
          <input id="oas-host" className="cl-input" placeholder="risk.internal.treasury.example" autoComplete="off" />
          <span className="cl-field-hint">
            A generated adapter may only reach this host. Wildcards are rejected.
          </span>
        </div>
        <p className="cl-meta">
          A generated adapter starts at trust class UNVERIFIED. Nothing in a specification can establish what a source
          guarantees.
        </p>
      </Modal>

      {/* disable adapter */}
      <StandardConfirmation
        open={disableTarget !== null}
        onClose={() => setDisableTarget(null)}
        onConfirm={() => {
          pushToast(`${disableTarget?.name} disabled`);
          setDisableTarget(null);
        }}
        title="Disable adapter"
        consequence={
          disableTarget
            ? `Any decision that requires ${disableTarget.name} will be refused rather than made from another source. Agents whose Blueprint names it will report the requirement as unmet.`
            : ''
        }
        resource={disableTarget?.adapterId ?? ''}
        actionLabel="Disable adapter"
      />
    </StudioPage>
  );
}
