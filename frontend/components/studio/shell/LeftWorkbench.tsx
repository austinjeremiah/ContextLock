'use client';

/**
 * Left segment: Activity Rail + contextual Project Explorer (spec §5).
 *
 * The rail switches explorer view containers; explorer items carry compact
 * badges (problem counts, STALE, BLOCKED, LIVE, SIM) that always include text,
 * never colour alone.
 */
import { useRouter, usePathname } from 'next/navigation';
import { CircleHelp, PanelLeftClose, Settings } from 'lucide-react';
import { Icon } from './icons';
import { NAV_GROUPS, RAIL_VIEWS, SEGMENT_TO_RAIL, type NavItem, type RailViewId } from '@/lib/studio/nav';
import { useWorkbench } from '@/lib/studio/workbench';
import type { Tone } from '@/lib/studio/types';

export interface NavBadge {
  label: string;
  tone: Tone;
  title: string;
}

export function ActivityRail({
  projectId,
  badges,
}: {
  projectId: string;
  badges: Record<string, NavBadge[]>;
}) {
  const { rail, setRail, toggleExplorer, explorerOpen } = useWorkbench();
  const router = useRouter();

  const railHasAttention = (view: RailViewId) => {
    const groupIds = RAIL_VIEWS.find((v) => v.id === view)?.groupIds ?? [];
    return NAV_GROUPS.filter((g) => groupIds.includes(g.id)).some((g) =>
      g.items.some((item) => (badges[item.id] ?? []).some((b) => b.tone === 'deny' || b.tone === 'warn' || b.tone === 'blocked')),
    );
  };

  return (
    <nav className="cl-rail" aria-label="Activity rail">
      {RAIL_VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          className="cl-rail-btn"
          data-active={rail === view.id}
          aria-label={view.label}
          aria-current={rail === view.id ? 'true' : undefined}
          title={view.label}
          onClick={() => {
            setRail(view.id);
            if (!explorerOpen) toggleExplorer();
          }}
        >
          <Icon name={view.icon} size={18} />
          {railHasAttention(view.id) ? <span className="cl-rail-dot" /> : null}
        </button>
      ))}

      <span className="cl-rail-spacer" />

      <button type="button" className="cl-rail-btn" title="Help / docs" aria-label="Help and documentation">
        <CircleHelp size={18} strokeWidth={1.6} aria-hidden />
      </button>
      <button
        type="button"
        className="cl-rail-btn"
        title="Account / settings"
        aria-label="Account and settings"
        onClick={() => router.push(`/projects/${projectId}/settings`)}
      >
        <Settings size={18} strokeWidth={1.6} aria-hidden />
      </button>
    </nav>
  );
}

export function ProjectExplorer({
  projectId,
  projectName,
  agentSlug,
  badges,
}: {
  projectId: string;
  projectName: string;
  agentSlug: string;
  badges: Record<string, NavBadge[]>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { rail, toggleExplorer } = useWorkbench();

  const view = RAIL_VIEWS.find((v) => v.id === rail) ?? RAIL_VIEWS[0];
  const groups = NAV_GROUPS.filter((g) => view.groupIds.includes(g.id));

  const hrefFor = (item: NavItem) => {
    const [segment, query] = item.segment.split('?');
    const search = new URLSearchParams(query ?? '');
    if (agentSlug) search.set('agent', agentSlug);
    const qs = search.toString();
    return `/projects/${projectId}/${segment}${qs ? `?${qs}` : ''}`;
  };

  const isActive = (item: NavItem) => {
    const segment = item.segment.split('?')[0];
    return pathname === `/projects/${projectId}/${segment}` || pathname.startsWith(`/projects/${projectId}/${segment}/`);
  };

  return (
    <aside className="cl-explorer" aria-label="Project explorer">
      <div className="cl-explorer-head">
        <span className="cl-label cl-truncate" title={projectName}>
          {view.label}
        </span>
        <button
          type="button"
          className="cl-btn cl-btn-ghost cl-btn-sm"
          onClick={toggleExplorer}
          aria-label="Collapse explorer"
          title="Collapse explorer (⌘B)"
        >
          <PanelLeftClose size={13} aria-hidden />
        </button>
      </div>

      <div className="cl-explorer-scroll">
        {groups.map((group) => (
          <div key={group.id}>
            <div className="cl-explorer-group">
              <span className="cl-label">{group.label}</span>
            </div>
            <ul>
              {group.items.map((item) => {
                const itemBadges = badges[item.id] ?? [];
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="cl-nav-item"
                      data-active={isActive(item)}
                      onClick={() => router.push(hrefFor(item))}
                      onDoubleClick={() => router.push(hrefFor(item))}
                    >
                      <Icon name={item.icon} size={14} />
                      <span className="cl-nav-item-label">{item.label}</span>
                      {itemBadges.map((badge) => (
                        <span
                          key={badge.label}
                          className="cl-badge"
                          data-tone={badge.tone}
                          title={badge.title}
                          style={{ height: 16, padding: '0 5px', fontSize: 9 }}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
