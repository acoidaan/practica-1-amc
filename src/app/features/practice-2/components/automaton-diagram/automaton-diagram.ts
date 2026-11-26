import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import type {
  NormalizedAutomatonDefinition,
  StateId,
} from '../../core/models';
import { formatSymbolLiteral } from '../../core/symbol-literal';

interface DiagramPoint {
  readonly x: number;
  readonly y: number;
}

interface MutableDiagramPoint {
  x: number;
  y: number;
}

interface DiagramEdge {
  readonly id: string;
  readonly from: StateId;
  readonly to: StateId;
  readonly labels: readonly string[];
  readonly transitionIds: readonly string[];
  readonly lambdaTransitionIds: readonly string[];
}

interface DragState {
  readonly pointerId: number;
  readonly state: StateId;
  readonly offsetX: number;
  readonly offsetY: number;
}

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 560;
const NODE_RADIUS = 31;
const X_MARGIN = 62;
const Y_MARGIN = 66;

/** Interactive SVG representation shared by full and step-by-step simulation. */
@Component({
  selector: 'app-automaton-diagram',
  imports: [],
  styleUrl: './automaton-diagram.css',
  templateUrl: './automaton-diagram.html',
})
export class AutomatonDiagram implements OnChanges {
  @Input({ required: true }) definition!: NormalizedAutomatonDefinition;
  @Input() activeStates: readonly StateId[] = [];
  @Input() activeTransitionIds: readonly string[] = [];
  @Input() activeLambdaTransitionIds: readonly string[] = [];

  readonly viewBox = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;
  edges: readonly DiagramEdge[] = [];
  positions: Readonly<Record<StateId, DiagramPoint>> = {};
  private dragState: DragState | undefined;
  private layoutStorageKey = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['definition'] !== undefined && this.definition !== undefined) {
      this.edges = this.buildEdges();
      this.layoutStorageKey = `amc-automaton-layout:${this.hashDefinition()}`;
      this.positions = this.loadStoredPositions() ?? this.createAutomaticPositions();
    }
  }

  positionOf(state: StateId): DiagramPoint {
    return this.positions[state] ?? { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 };
  }

  isFinalState(state: StateId): boolean {
    return this.definition.finalStates.includes(state);
  }

  isStateActive(state: StateId): boolean {
    return this.activeStates.includes(state);
  }

  isEdgeActive(edge: DiagramEdge): boolean {
    return (
      edge.transitionIds.some((id) => this.activeTransitionIds.includes(id)) ||
      edge.lambdaTransitionIds.some((id) => this.activeLambdaTransitionIds.includes(id))
    );
  }

  edgeLabel(edge: DiagramEdge): string {
    return edge.labels.join(', ');
  }

  edgePath(edge: DiagramEdge): string {
    const from = this.positionOf(edge.from);
    const to = this.positionOf(edge.to);

    if (edge.from === edge.to) {
      return [
        `M ${from.x - 20} ${from.y - 25}`,
        `C ${from.x - 65} ${from.y - 98}, ${from.x + 65} ${from.y - 98}, ${from.x + 20} ${from.y - 25}`,
      ].join(' ');
    }

    const vectorX = to.x - from.x;
    const vectorY = to.y - from.y;
    const length = Math.hypot(vectorX, vectorY) || 1;
    const unitX = vectorX / length;
    const unitY = vectorY / length;
    const start = {
      x: from.x + unitX * NODE_RADIUS,
      y: from.y + unitY * NODE_RADIUS,
    };
    const end = {
      x: to.x - unitX * (NODE_RADIUS + 8),
      y: to.y - unitY * (NODE_RADIUS + 8),
    };

    if (this.hasReverseEdge(edge)) {
      const control = {
        x: (start.x + end.x) / 2 - unitY * 52,
        y: (start.y + end.y) / 2 + unitX * 52,
      };
      return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
    }

    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  edgeLabelPosition(edge: DiagramEdge): DiagramPoint {
    const from = this.positionOf(edge.from);
    const to = this.positionOf(edge.to);

    if (edge.from === edge.to) return { x: from.x, y: from.y - 91 };

    const vectorX = to.x - from.x;
    const vectorY = to.y - from.y;
    const length = Math.hypot(vectorX, vectorY) || 1;
    const unitX = vectorX / length;
    const unitY = vectorY / length;
    const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const curveOffset = this.hasReverseEdge(edge) ? 27 : 0;

    return {
      x: midpoint.x - unitY * curveOffset,
      y: midpoint.y + unitX * curveOffset - 7,
    };
  }

  initialArrowPath(): string {
    const initial = this.positionOf(this.definition.initialState);
    const endX = initial.x - NODE_RADIUS - 8;
    return `M ${Math.max(8, endX - 67)} ${initial.y} L ${endX} ${initial.y}`;
  }

  stateFontSize(state: StateId): number {
    if (state.length <= 4) return 14;
    if (state.length <= 7) return 11;
    return 9;
  }

  onPointerDown(event: PointerEvent, state: StateId): void {
    if (event.button !== 0) return;
    const pointer = this.svgPoint(event);
    const position = this.positionOf(state);
    this.dragState = {
      pointerId: event.pointerId,
      state,
      offsetX: pointer.x - position.x,
      offsetY: pointer.y - position.y,
    };
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  onPointerMove(event: PointerEvent): void {
    if (this.dragState === undefined || this.dragState.pointerId !== event.pointerId) return;
    const pointer = this.svgPoint(event);
    this.updatePosition(this.dragState.state, {
      x: pointer.x - this.dragState.offsetX,
      y: pointer.y - this.dragState.offsetY,
    });
  }

  onPointerUp(event: PointerEvent): void {
    if (this.dragState?.pointerId !== event.pointerId) return;
    this.dragState = undefined;
    this.storePositions();
  }

  onStateKeydown(event: KeyboardEvent, state: StateId): void {
    const movement: Readonly<Record<string, DiagramPoint>> = {
      ArrowLeft: { x: -12, y: 0 },
      ArrowRight: { x: 12, y: 0 },
      ArrowUp: { x: 0, y: -12 },
      ArrowDown: { x: 0, y: 12 },
    };
    const delta = movement[event.key];
    if (delta === undefined) return;

    const current = this.positionOf(state);
    this.updatePosition(state, { x: current.x + delta.x, y: current.y + delta.y });
    this.storePositions();
    event.preventDefault();
  }

  resetLayout(): void {
    this.positions = this.createAutomaticPositions();
    try {
      localStorage.removeItem(this.layoutStorageKey);
    } catch {
      // Storage is optional; the in-memory layout still works.
    }
  }

  private buildEdges(): readonly DiagramEdge[] {
    const groups = new Map<
      string,
      {
        from: StateId;
        to: StateId;
        labels: Set<string>;
        transitionIds: Set<string>;
        lambdaTransitionIds: Set<string>;
      }
    >();

    const groupFor = (from: StateId, to: StateId) => {
      const key = `${from}\u0000${to}`;
      let group = groups.get(key);
      if (group === undefined) {
        group = {
          from,
          to,
          labels: new Set<string>(),
          transitionIds: new Set<string>(),
          lambdaTransitionIds: new Set<string>(),
        };
        groups.set(key, group);
      }
      return group;
    };

    for (const transition of this.definition.transitions) {
      for (const destination of transition.to) {
        const group = groupFor(transition.from, destination);
        group.labels.add(formatSymbolLiteral(transition.symbol));
        group.transitionIds.add(transition.id);
      }
    }

    for (const transition of this.definition.lambdaTransitions) {
      for (const destination of transition.to) {
        const group = groupFor(transition.from, destination);
        group.labels.add('λ');
        group.lambdaTransitionIds.add(transition.id);
      }
    }

    return [...groups.values()].map((group, index) => ({
      id: `edge-${index}`,
      from: group.from,
      to: group.to,
      labels: [...group.labels],
      transitionIds: [...group.transitionIds],
      lambdaTransitionIds: [...group.lambdaTransitionIds],
    }));
  }

  private hasReverseEdge(edge: DiagramEdge): boolean {
    return (
      edge.from !== edge.to &&
      this.edges.some((candidate) => candidate.from === edge.to && candidate.to === edge.from)
    );
  }

  private createAutomaticPositions(): Readonly<Record<StateId, DiagramPoint>> {
    const states = this.definition.states;
    if (states.length === 1) {
      return { [states[0]]: { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 } };
    }

    const horizontalRadius = Math.min(330, 155 + states.length * 16);
    const verticalRadius = Math.min(205, 110 + states.length * 12);
    const positions: Record<StateId, DiagramPoint> = {};

    states.forEach((state, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / states.length;
      positions[state] = {
        x: VIEW_WIDTH / 2 + Math.cos(angle) * horizontalRadius,
        y: VIEW_HEIGHT / 2 + Math.sin(angle) * verticalRadius,
      };
    });

    return positions;
  }

  private updatePosition(state: StateId, point: MutableDiagramPoint): void {
    this.positions = {
      ...this.positions,
      [state]: {
        x: Math.min(VIEW_WIDTH - X_MARGIN, Math.max(X_MARGIN, point.x)),
        y: Math.min(VIEW_HEIGHT - Y_MARGIN, Math.max(Y_MARGIN, point.y)),
      },
    };
  }

  private svgPoint(event: PointerEvent): DiagramPoint {
    const svg = (event.currentTarget as Element).closest('svg') as SVGSVGElement | null;
    const matrix = svg?.getScreenCTM();
    if (svg === null || matrix === null || matrix === undefined) {
      return { x: event.offsetX, y: event.offsetY };
    }

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(matrix.inverse());
  }

  private hashDefinition(): string {
    const source = JSON.stringify(this.definition);
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  private loadStoredPositions(): Readonly<Record<StateId, DiagramPoint>> | undefined {
    try {
      const source = localStorage.getItem(this.layoutStorageKey);
      if (source === null) return undefined;
      const stored = JSON.parse(source) as Record<string, DiagramPoint>;
      const positions: Record<StateId, DiagramPoint> = {};

      for (const state of this.definition.states) {
        const point = stored[state];
        if (point === undefined || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
          return undefined;
        }
        positions[state] = {
          x: Math.min(VIEW_WIDTH - X_MARGIN, Math.max(X_MARGIN, point.x)),
          y: Math.min(VIEW_HEIGHT - Y_MARGIN, Math.max(Y_MARGIN, point.y)),
        };
      }
      return positions;
    } catch {
      return undefined;
    }
  }

  private storePositions(): void {
    try {
      localStorage.setItem(this.layoutStorageKey, JSON.stringify(this.positions));
    } catch {
      // Storage is optional; dragging remains available for the current page lifetime.
    }
  }
}
