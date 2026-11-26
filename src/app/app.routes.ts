import { Routes } from '@angular/router';

/** Top-level routes keep both practices isolated and independently loadable. */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Prácticas AMC',
    loadComponent: () =>
      import('./features/portal-home/portal-home-page').then((module) => module.PortalHomePage),
  },
  {
    path: 'practica-1',
    title: 'Práctica 1 · Par de puntos más cercano',
    loadComponent: () =>
      import('./features/practice-1/practice-one-page').then(
        (module) => module.PracticeOnePage,
      ),
  },
  {
    path: 'practica-2',
    title: 'Práctica 2 · Simulador de autómatas',
    loadComponent: () =>
      import('./features/practice-2/practice-two-page').then(
        (module) => module.PracticeTwoPage,
      ),
  },
  { path: '**', redirectTo: '' },
];
