import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'upload', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./components/login').then(m => m.LoginComponent) },
  {
    path: 'upload',
    loadComponent: () => import('./components/upload').then(m => m.UploadComponent),
    canActivate: [authGuard]
  },
  {
    path: 'slideshow',
    loadComponent: () => import('./components/slideshow').then(m => m.SlideshowComponent),
    canActivate: [authGuard]
  },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
  ]
};
