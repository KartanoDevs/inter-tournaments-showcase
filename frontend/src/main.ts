import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { VERSIONS } from './environments/version';

console.log(
  '%c CV Inter %c  front v%s · back v%s ',
  'background:#00E5FF;color:#090B14;font-family:Orbitron,sans-serif;font-weight:700;padding:2px 6px;border-radius:3px;',
  'background:#12162D;color:#00E5FF;font-family:Inter,sans-serif;padding:2px 6px;border-radius:3px;',
  VERSIONS.frontend,
  VERSIONS.backend,
);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
