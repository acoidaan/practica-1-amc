import { TestBed } from '@angular/core/testing';
import type { NormalizedAutomatonDefinition } from '../../core/models';
import { AutomatonDiagram } from './automaton-diagram';

const definition: NormalizedAutomatonDefinition = {
  type: 'AFND',
  states: ['q0', 'q1', 'q2'],
  initialState: 'q0',
  finalStates: ['q2'],
  transitions: [
    { id: 't0', from: 'q0', symbol: 'a', to: ['q1', 'q2'] },
    { id: 't1', from: 'q1', symbol: 'b', to: ['q1'] },
  ],
  lambdaTransitions: [{ id: 'l0', from: 'q1', to: ['q0'] }],
};

describe('AutomatonDiagram', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [AutomatonDiagram] }).compileComponents();
  });

  it('renders states, finals, transitions and the initial arrow', async () => {
    const fixture = TestBed.createComponent(AutomatonDiagram);
    fixture.componentRef.setInput('definition', definition);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.state-node')).toHaveLength(3);
    expect(host.querySelectorAll('.final-circle')).toHaveLength(1);
    expect(host.querySelectorAll('.transition-edge')).toHaveLength(4);
    expect(host.querySelector('.initial-arrow')).not.toBeNull();
    expect(host.textContent).toContain("'a'");
    expect(host.textContent).toContain('λ');
  });

  it('highlights active states and all arcs represented by an active transition row', () => {
    const fixture = TestBed.createComponent(AutomatonDiagram);
    fixture.componentRef.setInput('definition', definition);
    fixture.componentRef.setInput('activeStates', ['q1', 'q2']);
    fixture.componentRef.setInput('activeTransitionIds', ['t0']);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.state-node-active')).toHaveLength(2);
    expect(host.querySelectorAll('.transition-edge-active')).toHaveLength(2);
  });

  it('creates distinct automatic positions and can reset a moved layout', () => {
    const fixture = TestBed.createComponent(AutomatonDiagram);
    fixture.componentRef.setInput('definition', definition);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(new Set(Object.values(component.positions).map(({ x, y }) => `${x},${y}`)).size).toBe(3);
    const original = component.positionOf('q0');
    component.onStateKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowRight' }),
      'q0',
    );
    expect(component.positionOf('q0').x).toBe(original.x + 12);

    component.resetLayout();
    expect(component.positionOf('q0')).toEqual(original);
  });
});
