import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PracticeTwoPage } from './practice-two-page';

function fileSelectionEvent(sourceText: string, fileName = 'automata.txt'): Event {
  const file = new File([sourceText], fileName);
  return { target: { files: [file], value: fileName } } as unknown as Event;
}

describe('PracticeTwoPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PracticeTwoPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('starts with a valid AFD and renders both input methods', async () => {
    const fixture = TestBed.createComponent(PracticeTwoPage);
    await fixture.whenStable();

    const page = fixture.componentInstance;
    const host = fixture.nativeElement as HTMLElement;

    expect(page.automaton?.definition.type).toBe('AFD');
    expect(host.querySelector('input[type="file"]')).not.toBeNull();
    expect(host.querySelector('#automaton-source')).not.toBeNull();
    expect(host.querySelector('#input-string')).not.toBeNull();
    expect(host.textContent).toContain('Simular de una vez');
    expect(host.textContent).toContain('Iniciar paso a paso');
  });

  it('loads the AFND example and exposes its lambda transitions', () => {
    const fixture = TestBed.createComponent(PracticeTwoPage);
    const page = fixture.componentInstance;

    page.loadExample('AFND');

    expect(page.automaton?.definition.type).toBe('AFND');
    expect(page.automaton?.definition.lambdaTransitions).toHaveLength(2);
    expect(page.parseError).toBeUndefined();
  });

  it('simulates the same trace completely or step by step', () => {
    const fixture = TestBed.createComponent(PracticeTwoPage);
    const page = fixture.componentInstance;
    page.inputText = '01';

    page.simulateAll();
    expect(page.trace?.accepted).toBe(true);
    expect(page.visibleStepIndex).toBe(2);
    expect(page.isSimulationComplete).toBe(true);

    page.startStepSimulation();
    expect(page.visibleStepIndex).toBe(0);
    expect(page.currentStep?.afterStates).toEqual(['q0']);
    page.nextStep();
    expect(page.visibleStepIndex).toBe(1);
    page.nextStep();
    expect(page.currentStep?.afterStates).toEqual(['q3']);
    expect(page.isSimulationComplete).toBe(true);
    page.previousStep();
    expect(page.visibleStepIndex).toBe(1);
  });

  it('reports invalid manual input without replacing the active automaton', () => {
    const fixture = TestBed.createComponent(PracticeTwoPage);
    const page = fixture.componentInstance;
    const previousAutomaton = page.automaton;

    page.onSourceChanged('TIPO: INVALIDO');
    page.buildAutomaton();

    expect(page.parseError).toContain('debe ser AFD o AFND');
    expect(page.automaton).toBe(previousAutomaton);
    expect(page.isSourceDirty).toBe(true);
  });

  it('loads and builds a selected text file', async () => {
    const fixture = TestBed.createComponent(PracticeTwoPage);
    const page = fixture.componentInstance;
    const source = `TIPO: AFD
ESTADOS: s f
INICIAL: s
FINALES: f
TRANSICIONES:
s 'x' f
FIN`;

    await page.onFileSelected(fileSelectionEvent(source, 'simple.txt'));

    expect(page.sourceName).toBe('simple.txt');
    expect(page.automaton?.definition.initialState).toBe('s');
    expect(page.automaton?.recognize('x')).toBe(true);
  });
});
