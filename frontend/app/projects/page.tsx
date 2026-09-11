'use client';

/**
 * Projects / Home (spec §9.1).
 *
 * The one place to create or open a project before entering the IDE workbench.
 * Duplicate copies configuration but never active authority; Archive confirms.
 */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Copy, Download, FolderOpen, Plus, Search, User } from 'lucide-react';
import {
  Badge,
  CRE_MODE_LABEL,
  StatusBadge,
  TimeAgo,
} from '@/components/studio/primitives';
import { Modal, StandardConfirmation } from '@/components/studio/dialogs';
import { NewProjectModal } from '@/components/studio/NewProjectModal';
import { PROJECT_LIST, PROJECT_TEMPLATES } from '@/lib/studio/mock/core';
import type { ProjectSummary } from '@/lib/studio/types';

export default function ProjectsHome() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<ProjectSummary | null>(null);
  const [duplicated, setDuplicated] = useState<string | null>(null);
  const [archived, setArchived] = useState<string[]>([]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = PROJECT_LIST.filter((p) => !archived.includes(p.id));
    if (!q) return base;
    return base.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.organization ?? '').toLowerCase().includes(q),
    );
  }, [query, archived]);

  const organizations = useMemo(() => {
    const groups = new Map<string, ProjectSummary[]>();
    for (const p of visible) {
      const key = p.organization ?? 'Personal';
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    return [...groups.entries()];
  }, [visible]);

  return (
    <div className="cl-studio" style={{ minHeight: '100vh', background: 'var(--cl-canvas)' }}>
      {/* top area */}
      <header
        className="cl-row cl-chrome-bar"
        style={{
          height: 56,
          padding: '0 22px',
          borderBottom: '1px solid var(--cl-line-chrome)',
          gap: 14,
        }}
      >
        {/* Back to the landing page. This is the top of the product, so the
            wordmark is the only way out to the marketing site. */}
        <a
          href="/"
          className="cl-studio-mark"
          style={{ fontFamily: 'var(--serif)', fontSize: 18, letterSpacing: '-0.3px' }}
          title="Back to contextlock.com"
        >
          ContextLock Studio
        </a>
        <span className="cl-env-badge" title="Production-chain execution is disabled across all projects.">
          <span>TESTNET LAB</span>
        </span>
        <span className="cl-spacer" />
        <div className="cl-cmd-field" style={{ width: 300 }}>
          <Search size={14} aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects"
            aria-label="Search projects"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13 }}
          />
        </div>
        <button type="button" className="cl-btn cl-btn-invert" onClick={() => setNewOpen(true)}>
          <Plus size={13} aria-hidden />
          New Agent
        </button>
        <button type="button" className="cl-icon-btn" aria-label="Account menu" title="operator@treasury">
          <User size={16} aria-hidden />
        </button>
      </header>

      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '30px 24px 64px' }}>
        <div className="cl-row" style={{ alignItems: 'flex-end', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 30, letterSpacing: '-0.6px', lineHeight: 1.15 }}>
              Your agent projects
            </h1>
            <p className="cl-page-sub" style={{ marginTop: 6 }}>
              Each project holds one or more financial agents, their authority model, and everything proved about them.
            </p>
          </div>
          <span className="cl-spacer" />
          <button type="button" className="cl-btn" onClick={() => setImportOpen(true)}>
            <Download size={13} aria-hidden />
            Import
          </button>
        </div>

        {organizations.map(([org, items]) => (
          <section key={org} className="cl-section">
            <div className="cl-section-head">
              <span className="cl-label">{org}</span>
              <span className="cl-section-rule" />
              <span className="cl-meta">{items.length} project{items.length === 1 ? '' : 's'}</span>
            </div>

            <div className="cl-card">
              <div className="cl-table-scroll">
                <table className="cl-table" style={{ minWidth: 940 }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 230 }}>Project</th>
                      <th style={{ width: 62 }}>Agents</th>
                      <th style={{ width: 96 }}>State</th>
                      <th style={{ width: 86 }}>Revision</th>
                      <th style={{ width: 140 }}>Execution</th>
                      <th style={{ width: 128 }}>CRE mode</th>
                      <th style={{ width: 92 }}>Updated</th>
                      <th style={{ width: 78 }}>Alerts</th>
                      <th style={{ width: 216 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr key={p.id} data-clickable="true" onClick={() => router.push(`/projects/${p.id}/overview`)}>
                        <td>
                          <div className="cl-strong">{p.name}</div>
                          <div className="cl-meta" style={{ whiteSpace: 'normal', maxWidth: 420 }}>
                            {p.description}
                          </div>
                        </td>
                        <td>{p.agentCount}</td>
                        <td>
                          <StatusBadge status={p.lifecycle} />
                        </td>
                        <td className="cl-mono">{p.lastRevision === null ? '—' : `r${p.lastRevision}`}</td>
                        <td>
                          <Badge tone="sim">{p.executionNetwork}</Badge>
                        </td>
                        <td>
                          <span className="cl-meta">{CRE_MODE_LABEL[p.creMode]}</span>
                        </td>
                        <td className="cl-meta">
                          <TimeAgo iso={p.updatedAt} />
                        </td>
                        <td>
                          {p.alerts > 0 ? (
                            <Badge tone="deny">{p.alerts} alert{p.alerts === 1 ? '' : 's'}</Badge>
                          ) : (
                            <span className="cl-meta">none</span>
                          )}
                        </td>
                        <td>
                          <div className="cl-row" style={{ justifyContent: 'flex-end', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="cl-btn cl-btn-sm"
                              onClick={() => router.push(`/projects/${p.id}/overview`)}
                            >
                              <FolderOpen size={12} aria-hidden />
                              Open
                            </button>
                            <button
                              type="button"
                              className="cl-btn cl-btn-sm"
                              title="Copies configuration as a new draft. Identity, policy and active authority are never copied."
                              onClick={() => setDuplicated(p.name)}
                            >
                              <Copy size={12} aria-hidden />
                              Duplicate
                            </button>
                            <button type="button" className="cl-btn cl-btn-sm" onClick={() => setArchiveTarget(p)}>
                              <Archive size={12} aria-hidden />
                              Archive
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ))}

        <section className="cl-section">
          <div className="cl-section-head">
            <span className="cl-label">Templates</span>
            <span className="cl-section-rule" />
          </div>
          <div className="cl-grid cl-grid-auto">
            {PROJECT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="cl-card"
                style={{ textAlign: 'left', cursor: 'pointer', padding: 0 }}
                onClick={() => setNewOpen(true)}
              >
                <div className="cl-card-body">
                  <div className="cl-strong" style={{ fontSize: 13 }}>
                    {t.name}
                  </div>
                  <p className="cl-meta" style={{ margin: '6px 0 10px', whiteSpace: 'normal' }}>
                    {t.description}
                  </p>
                  <div className="cl-row cl-row-wrap" style={{ gap: 5 }}>
                    {t.protocols.length === 0 ? (
                      <Badge tone="neutral">No preset authority</Badge>
                    ) : (
                      t.protocols.map((p) => (
                        <Badge key={p} tone="neutral">
                          {p}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} />

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import project"
        subtitle="Accepts a validated ContextLock project bundle."
        footer={
          <>
            <button type="button" className="cl-btn" onClick={() => setImportOpen(false)}>
              Cancel
            </button>
            <button type="button" className="cl-btn cl-btn-primary" disabled>
              Import Project
            </button>
          </>
        }
      >
        <div className="cl-field">
          <label className="cl-field-label" htmlFor="import-file">
            Project bundle
          </label>
          <input id="import-file" type="file" className="cl-input" style={{ paddingTop: 4 }} accept=".json,.ctxlock" />
          <span className="cl-field-hint">
            The bundle is validated before anything is created. An imported project never carries active on-chain
            authority — identity and policy must be established again.
          </span>
        </div>
      </Modal>

      <StandardConfirmation
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (archiveTarget) setArchived((prev) => [...prev, archiveTarget.id]);
          setArchiveTarget(null);
        }}
        title="Archive project"
        consequence="Archiving hides the project from this list and stops further builds. Deployed contracts and recorded evidence are not removed, and any active runtime must be stopped separately."
        resource={archiveTarget?.name ?? ''}
        actionLabel="Archive Project"
      />

      <Modal
        open={duplicated !== null}
        onClose={() => setDuplicated(null)}
        title="Duplicated as new draft"
        footer={
          <button type="button" className="cl-btn cl-btn-primary" onClick={() => setDuplicated(null)}>
            Close
          </button>
        }
      >
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          <span className="cl-strong">{duplicated}</span> was copied as a new draft project. Configuration was copied;
          ENS identity, policy hash and any active authority were not. The copy starts with financial authority
          disabled and no deployment.
        </p>
      </Modal>
    </div>
  );
}
