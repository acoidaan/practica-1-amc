import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Standalone Angular entry point; startup failures are surfaced in the browser console.
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
