import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { provideServiceWorker } from '@angular/service-worker';

const routes: Routes = [
  { path: '', redirectTo: 'slideshow', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./components/login').then(m => m.LoginComponent) },
  {
    path: 'upload',
    loadComponent: () => import('./components/upload').then(m => m.UploadComponent),
    canActivate: [authGuard]
  },
  {
    path: 'slideshow',
    loadComponent: () => import('./components/slideshow').then(m => m.SlideshowComponent),
  },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes), provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ]
};
