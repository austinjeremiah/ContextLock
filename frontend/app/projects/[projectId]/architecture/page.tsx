'use client';

/**
 * Architecture (spec §13).
 *
 * How the agent obtains identity, context, policy decisions and execution
 * authority. The live overlay reuses this same graph rather than generating a
 * second one, the node inspector opens inside the center workspace (never over
 * the Agent Sidebar), and an accessible node list mirrors the canvas (§45).
 */
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Activity,
  Download,
  Layers,
  List,
  Lock,
  Maximize,
  Unlock,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { StudioPage } from '@/components/studio/PageScaffold';
import { ArchFlowNode } from '@/components/studio/architecture/ArchNode';
import {
  Badge,
  BlockchainRef,
  FreshnessBadge,
  KeyValue,
  StatusBadge,
} from '@/components/studio/primitives';
import { Popover, MenuLabel } from '@/components/studio/shell/Popover';
import { useWorkbench } from '@/lib/studio/workbench';
import { PROJECT } from '@/lib/studio/mock/core';
import { ARCHITECTURE, ARCH_LAYERS, EDGE_KIND_LABEL } from '@/lib/studio/mock/design';
import type { ArchLayer, ArchNodeData } from '@/lib/studio/types';

const nodeTypes = { arch: ArchFlowNode };

const ALL_LAYERS: ArchLayer[] = [
  'identity',
  'data',
  'policy',
  'execution',
  'runtime',
  'live-health',
  'security-boundaries',
];

export default function ArchitecturePage() {
  return (
    <ReactFlowProvider>
      <ArchitectureCanvas />
    </ReactFlowProvider>
  );
}

function ArchitectureCanvas() {
  const router = useRouter();
  const { setSelection, pushToast } = useWorkbench();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const [liveOverlay, setLiveOverlay] = useState(true);
  const [locked, setLocked] = useState(false);
  const [activeLayers, setActiveLayers] = useState<ArchLayer[]>(ALL_LAYERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const isLayerOn = (layers: ArchLayer[]) => layers.some((l) => activeLayers.includes(l));

  const nodes = useMemo<Node[]>(
    () =>
      ARCHITECTURE.nodes.map((node) => ({
        id: node.id,
        type: 'arch',
        position: node.position,
        selected: node.id === selectedId,
        data: { ...node.data, liveOverlay, dimmed: !isLayerOn(node.data.layers) },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveOverlay, activeLayers, selectedId],
  );

  const edges = useMemo<Edge[]>(
    () =>
      ARCHITECTURE.edges.map((edge) => {
        const visible = isLayerOn(edge.layers);
        const tone =
          edge.kind === 'EXECUTE' || edge.kind === 'AUTHORIZATION'
            ? 'var(--cl-deny)'
            : edge.kind === 'ESCALATE'
              ? 'var(--cl-warn)'
              : edge.kind === 'READ' || edge.kind === 'CONTEXT'
                ? 'var(--cl-data)'
                : 'var(--cl-ink-2)';
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          animated: liveOverlay && (edge.kind === 'EXECUTE' || edge.kind === 'POLICY'),
          style: { stroke: tone, strokeWidth: 1.4, opacity: visible ? 1 : 0.12 },
          labelStyle: {
            fill: tone,
            fontFamily: 'var(--medium)',
            fontSize: 9.5,
            letterSpacing: '0.08em',
            opacity: visible ? 1 : 0.12,
          },
          labelBgStyle: { fill: '#fdf6e3', fillOpacity: visible ? 0.95 : 0.1 },
          labelBgPadding: [4, 2] as [number, number],
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveOverlay, activeLayers],
  );

  const selected = ARCHITECTURE.nodes.find((n) => n.id === selectedId) ?? null;

  const selectNode = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      const node = ARCHITECTURE.nodes.find((n) => n.id === id);
      setSelection(node ? { kind: 'architecture-node', id: node.id, label: node.data.label } : null);
    },
    [setSelection],
  );

  const toggleLayer = (layer: ArchLayer) =>
    setActiveLayers((prev) => (prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]));

  return (
    <StudioPage
      segment="architecture"
      bleed
      live={liveOverlay}
      banners={
        <div className="cl-row cl-row-wrap" style={{ marginBottom: 12, gap: 8 }}>
          <span className="cl-page-title" style={{ fontSize: 22, marginRight: 8 }}>
            Architecture
          </span>
          <Badge tone="neutral">Blueprint r{ARCHITECTURE.revision}</Badge>
          {liveOverlay ? <Badge tone="pass">Live overlay · observed state</Badge> : <Badge tone="neutral">Configured state</Badge>}
          <span className="cl-spacer" />

          <div className="cl-btn-group">
            <button type="button" className="cl-btn cl-btn-sm" onClick={() => fitView({ duration: 300, padding: 0.15 })}>
              <Maximize size={12} aria-hidden />
              Fit
            </button>
            <button type="button" className="cl-btn cl-btn-sm" onClick={() => zoomOut({ duration: 160 })} aria-label="Zoom out">
              <ZoomOut size={12} aria-hidden />
            </button>
            <button type="button" className="cl-btn cl-btn-sm" onClick={() => zoomIn({ duration: 160 })} aria-label="Zoom in">
              <ZoomIn size={12} aria-hidden />
            </button>
            <button
              type="button"
              className="cl-btn cl-btn-sm"
              onClick={() => setLocked((v) => !v)}
              aria-pressed={locked}
              title={locked ? 'Unlock viewport' : 'Lock viewport'}
            >
              {locked ? <Lock size={12} aria-hidden /> : <Unlock size={12} aria-hidden />}
              {locked ? 'Locked' : 'Lock'}
            </button>

            <Popover
              width={300}
              label="Layers"
              trigger={({ toggle }) => (
                <button type="button" className="cl-btn cl-btn-sm" onClick={toggle}>
                  <Layers size={12} aria-hidden />
                  Layers ({activeLayers.length}/{ALL_LAYERS.length})
                </button>
              )}
            >
              {() => (
                <>
                  <MenuLabel>Show layers</MenuLabel>
                  {ARCH_LAYERS.map((layer) => (
                    <label key={layer.id} className="cl-checkbox" style={{ padding: '7px 12px' }}>
                      <input
                        type="checkbox"
                        checked={activeLayers.includes(layer.id as ArchLayer)}
                        onChange={() => toggleLayer(layer.id as ArchLayer)}
                      />
                      <span>
                        {layer.label}
                        <span className="cl-meta" style={{ display: 'block', whiteSpace: 'normal' }}>
                          {layer.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </>
              )}
            </Popover>

            <button
              type="button"
              className="cl-btn cl-btn-sm"
              onClick={() => setLiveOverlay((v) => !v)}
              aria-pressed={liveOverlay}
            >
              <Activity size={12} aria-hidden />
              Live Overlay
            </button>
            <button
              type="button"
              className="cl-btn cl-btn-sm"
              onClick={() => setListOpen((v) => !v)}
              aria-pressed={listOpen}
              title="Accessible node list"
            >
              <List size={12} aria-hidden />
              Nodes
            </button>
            <button type="button" className="cl-btn cl-btn-sm" onClick={() => pushToast('Architecture exported as SVG')}>
              <Download size={12} aria-hidden />
              Export SVG
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, borderTop: '1px solid var(--cl-line)' }}>
        {/* accessible alternate node list (spec §45) */}
        {listOpen ? (
          <div
            style={{
              flex: '0 0 250px',
              overflowY: 'auto',
              borderRight: '1px solid var(--cl-line)',
              background: 'var(--cl-panel)',
            }}
          >
            <div className="cl-explorer-head">
              <span className="cl-label">Nodes</span>
              <button
                type="button"
                className="cl-btn cl-btn-ghost cl-btn-sm"
                onClick={() => setListOpen(false)}
                aria-label="Close node list"
              >
                <X size={12} aria-hidden />
              </button>
            </div>
            <ul>
              {ARCHITECTURE.nodes.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    className="cl-nav-item"
                    data-active={node.id === selectedId}
                    onClick={() => selectNode(node.id)}
                  >
                    <span className="cl-nav-item-label">{node.data.label}</span>
                    <StatusBadge status={liveOverlay ? (node.data.liveStatus ?? node.data.status) : node.data.status} icon={false} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* canvas */}
        <div style={{ flex: '1 1 auto', minWidth: 0, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.16 }}
            minZoom={0.25}
            maxZoom={1.6}
            panOnDrag={!locked}
            zoomOnScroll={!locked}
            zoomOnPinch={!locked}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_, node) => selectNode(node.id)}
            onPaneClick={() => selectNode(null)}
            style={{ background: 'var(--cl-canvas)' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(0,66,175,0.16)" />
            <Controls showInteractive={false} position="bottom-left" />
            <MiniMap
              pannable
              zoomable
              style={{ background: 'var(--cl-panel)', border: '1px solid var(--cl-line)' }}
              maskColor="rgba(1,13,110,0.08)"
              nodeColor={() => '#2451b5'}
            />
          </ReactFlow>
        </div>

        {/* node inspector — inside the center workspace, not over the agent sidebar */}
        {selected ? (
          <div className="cl-drawer" style={{ flex: '0 0 336px', minWidth: 0 }}>
            <div className="cl-drawer-head">
              <span className="cl-label" style={{ flex: '1 1 auto' }}>
                Node inspector
              </span>
              <button
                type="button"
                className="cl-btn cl-btn-ghost cl-btn-sm"
                onClick={() => selectNode(null)}
                aria-label="Close inspector"
              >
                <X size={13} aria-hidden />
              </button>
            </div>
            <div className="cl-drawer-body">
              <NodeInspector
                nodeId={selected.id}
                data={selected.data}
                liveOverlay={liveOverlay}
                onOpen={(segment, hash) =>
                  router.push(`/projects/${PROJECT.id}/${segment}${hash ? `#${hash}` : ''}`)
                }
              />
            </div>
          </div>
        ) : null}
      </div>
    </StudioPage>
  );
}

function NodeInspector({
  nodeId,
  data,
  liveOverlay,
  onOpen,
}: {
  nodeId: string;
  data: ArchNodeData;
  liveOverlay: boolean;
  onOpen: (segment: string, hash?: string) => void;
}) {
  const status = liveOverlay ? (data.liveStatus ?? data.status) : data.status;
  const labelFor = (id: string) => ARCHITECTURE.nodes.find((n) => n.id === id)?.data.label ?? id;
  const outgoing = ARCHITECTURE.edges.filter((e) => e.source === nodeId);
  const incoming = ARCHITECTURE.edges.filter((e) => e.target === nodeId);

  return (
    <div className="cl-col" style={{ gap: 14 }}>
      <div>
        <div className="cl-h1">{data.label}</div>
        <p className="cl-meta" style={{ marginTop: 6, whiteSpace: 'normal' }}>
          {data.purpose}
        </p>
      </div>

      <div className="cl-row cl-row-wrap" style={{ gap: 5 }}>
        <StatusBadge status={status} />
        {data.trustClass ? (
          <Badge tone={data.trustClass === 'VERIFIED_ORACLE' ? 'pass' : data.trustClass === 'SIMULATED' ? 'sim' : 'data'}>
            {data.trustClass.replace(/_/g, ' ')}
          </Badge>
        ) : null}
        {data.networkRole === 'MAINNET_READ_ONLY' ? <Badge tone="data">MAINNET · READ ONLY</Badge> : null}
        {data.networkRole === 'EXECUTION_TESTNET' ? <Badge tone="sim">SEPOLIA · TESTNET</Badge> : null}
      </div>

      {data.freshness ? <FreshnessBadge freshness={data.freshness} /> : null}

      <KeyValue
        rows={[
          { label: 'Adapter / provider', value: data.adapter ?? '—', mono: Boolean(data.adapter) },
          { label: 'Version', value: data.version ?? '—' },
          { label: 'Network role', value: data.networkRole.replace(/_/g, ' ') },
          { label: 'Configured status', value: data.status },
          ...(liveOverlay && data.liveStatus ? [{ label: 'Observed status', value: data.liveStatus }] : []),
          ...(data.ref
            ? [
                {
                  label: data.ref.kind === 'address' ? 'Address' : data.ref.kind === 'hash' ? 'Hash' : 'Node',
                  value: (
                    <BlockchainRef
                      value={data.ref.value}
                      network={data.ref.network}
                      kind={data.ref.kind === 'node' ? 'node' : data.ref.kind}
                    />
                  ),
                },
              ]
            : []),
          ...(data.generatedModule ? [{ label: 'Generated module', value: data.generatedModule, mono: true }] : []),
        ]}
      />

      {data.capabilities?.length ? (
        <div>
          <div className="cl-label" style={{ marginBottom: 6 }}>
            Capabilities
          </div>
          <div className="cl-row cl-row-wrap" style={{ gap: 5 }}>
            {data.capabilities.map((c) => (
              <Badge key={c} tone="neutral">
                {c}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {outgoing.length > 0 || incoming.length > 0 ? (
        <div>
          <div className="cl-label" style={{ marginBottom: 6 }}>
            Connections
          </div>
          <div className="cl-col" style={{ gap: 7 }}>
            {outgoing.map((edge) => (
              <div key={edge.id}>
                <div style={{ fontSize: 12.5 }}>
                  {EDGE_KIND_LABEL[edge.kind]} <span className="cl-strong">{labelFor(edge.target)}</span>
                  {edge.requiresCre ? <Badge tone="sim">requires CRE</Badge> : null}
                </div>
                {edge.note ? (
                  <div className="cl-meta" style={{ whiteSpace: 'normal' }}>
                    {edge.note}
                  </div>
                ) : null}
              </div>
            ))}
            {incoming.map((edge) => (
              <div key={edge.id} className="cl-meta">
                ← <span className="cl-strong">{labelFor(edge.source)}</span> {EDGE_KIND_LABEL[edge.kind].toLowerCase()}{' '}
                this node
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Navigation only — no destructive controls live in a node inspector. */}
      <div className="cl-col" style={{ gap: 6 }}>
        {data.blueprintSection ? (
          <button type="button" className="cl-btn cl-btn-block" onClick={() => onOpen('blueprint')}>
            Open Blueprint section
          </button>
        ) : null}
        {data.codePath ? (
          <button type="button" className="cl-btn cl-btn-block" onClick={() => onOpen('code')}>
            Open Code
          </button>
        ) : null}
        <button type="button" className="cl-btn cl-btn-block" onClick={() => onOpen('activity')}>
          Open Activity
        </button>
        {data.relatedSimulationId ? (
          <button type="button" className="cl-btn cl-btn-block" onClick={() => onOpen('simulation')}>
            Run related simulation
          </button>
        ) : null}
        <button type="button" className="cl-btn cl-btn-block" onClick={() => onOpen('reality')}>
          View provenance
        </button>
      </div>
    </div>
  );
}
