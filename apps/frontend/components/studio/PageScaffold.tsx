'use client';

/**
 * Page scaffold used by every workbench page.
 *
 * Registers the page with the shell (opens/focuses its editor tab, sets the
 * Context Agent page kind, clears stale selection) and renders the standard
 * page header. Pages supply their own body.
 */
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { PageHeader } from './primitives';
import { metaForSegment } from '@/lib/studio/nav';
import { usePageRegistration } from '@/lib/studio/workbench';
import { PROJECT, agentBySlug } from '@/lib/studio/mock/core';

export function useStudioPage(segment: string) {
  const searchParams = useSearchParams();
  const agentSlug = searchParams.get('agent') ?? PROJECT.agents[0].slug;
  const agent = agentBySlug(agentSlug);
  const meta = metaForSegment(segment);
  return { agent, agentSlug, meta, project: PROJECT, searchParams };
}

export function StudioPage({
  segment,
  title,
  subtitle,
  badges,
  actions,
  banners,
  children,
  live,
  stale,
  /** Full-bleed pages (canvas, split views) skip the padded content column. */
  bleed,
  /** Optional class on the page surface, for per-page styling variants. */
  surfaceClass,
}: {
  segment: string;
  title?: string;
  subtitle?: string;
  badges?: ReactNode;
  actions?: ReactNode;
  banners?: ReactNode;
  children: ReactNode;
  live?: boolean;
  stale?: boolean;
  bleed?: boolean;
  surfaceClass?: string;
}) {
  const searchParams = useSearchParams();
  const agentSlug = searchParams.get('agent') ?? PROJECT.agents[0].slug;
  const meta = metaForSegment(segment);

  usePageRegistration({
    id: `${segment}:${agentSlug}`,
    title: meta.tabTitle,
    href: `/projects/${PROJECT.id}/${segment}?agent=${agentSlug}`,
    pageKind: meta.pageKind,
    live,
    stale,
  });

  if (bleed) {
    return (
      /* Banners take their natural height; the body takes what is left. Using
         height: 100% here made the body a full pane tall *below* the banners,
         which overflowed and left the page unable to scroll. */
      /*
        data-lenis-prevent on the whole bleed surface: these pages scroll pane by
        pane, and Lenis — bound to the page column — was intercepting wheel
        events before they reached those panes. The left list scrolled only
        because it carried the attribute individually; the detail pane did not.
      */
      <div
        className={`cl-bleed${surfaceClass ? ` ${surfaceClass}` : ''}`}
        data-lenis-prevent
        style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}
      >
        {banners ? <div style={{ flex: '0 0 auto', padding: '12px 16px 0' }}>{banners}</div> : null}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>{children}</div>
      </div>
    );
  }

  return (
    <div className={`cl-page-pad${surfaceClass ? ` ${surfaceClass}` : ''}`}>
      {banners}
      <PageHeader title={title ?? meta.title} subtitle={subtitle ?? meta.purpose} badges={badges} actions={actions} />
      {children}
    </div>
  );
}
