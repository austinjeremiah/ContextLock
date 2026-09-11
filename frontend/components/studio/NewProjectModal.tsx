'use client';

/**
 * New-project modal (spec §9.1).
 *
 * Fields: name · single agent or multi-agent organization · optional template ·
 * start from description. Creating a project never establishes authority — the
 * project starts as a draft with policy disabled and no deployment.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from './dialogs';
import { PROJECT_TEMPLATES } from '@/lib/studio/mock/core';

export function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [shape, setShape] = useState<'single' | 'organization'>('single');
  const [templateId, setTemplateId] = useState<string>('tpl_blank');
  const [description, setDescription] = useState('');

  const create = () => {
    onClose();
    // Until the backend exists, a new project opens the composer of the demo
    // project so the build flow stays walkable end to end.
    router.push(`/projects/prj_treasury_guardian/build?new=1`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New agent project"
      subtitle="The project starts as a draft. No identity, policy or deployment is created yet."
      wide
      footer={
        <>
          <button type="button" className="cl-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="cl-btn cl-btn-primary" onClick={create} disabled={!name.trim()}>
            Create Project
          </button>
        </>
      }
    >
      <div className="cl-field">
        <label className="cl-field-label" htmlFor="np-name">
          Project name
        </label>
        <input
          id="np-name"
          className="cl-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Treasury Guardian"
          autoComplete="off"
        />
      </div>

      <div className="cl-field">
        <span className="cl-field-label">Shape</span>
        <div className="cl-grid cl-grid-2">
          {(
            [
              {
                id: 'single' as const,
                title: 'Single agent',
                body: 'One principal with one identity, one policy and one budget.',
              },
              {
                id: 'organization' as const,
                title: 'Multi-agent organization',
                body: 'Several agents as distinct principals, each with its own identity, policy and budget.',
              },
            ]
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              className="cl-card"
              onClick={() => setShape(option.id)}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: shape === option.id ? 'var(--cl-ink)' : 'var(--cl-line)',
                background: shape === option.id ? 'rgba(0,66,175,0.06)' : 'var(--cl-panel)',
                padding: 0,
              }}
            >
              <div className="cl-card-body">
                <div className="cl-strong" style={{ fontSize: 12.5 }}>
                  {option.title}
                </div>
                <p className="cl-meta" style={{ marginTop: 5, whiteSpace: 'normal' }}>
                  {option.body}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="cl-field">
        <label className="cl-field-label" htmlFor="np-template">
          Template <span className="cl-dim">(optional)</span>
        </label>
        <select id="np-template" className="cl-select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {PROJECT_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="cl-field-hint">
          A template pre-fills protocols and data requirements. It never pre-fills a financial ceiling — you set that
          yourself.
        </span>
      </div>

      <div className="cl-field" style={{ marginBottom: 0 }}>
        <label className="cl-field-label" htmlFor="np-description">
          Start from a description <span className="cl-dim">(optional)</span>
        </label>
        <textarea
          id="np-description"
          className="cl-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Build an Aave guardian that repays my USDC debt when the health factor falls below 1.25…"
        />
        <span className="cl-field-hint">Do not paste secrets, private keys or API credentials here.</span>
      </div>
    </Modal>
  );
}
