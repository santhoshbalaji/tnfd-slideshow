import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppwriteService } from './services/appwrite.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar" *ngIf="auth.isAdmin()">
      <div class="nav-container">
        <a routerLink="/" class="logo">TNFD Slideshow</a>
        
        <div class="nav-links" *ngIf="auth.user() as user">
          <a routerLink="/upload" routerLinkActive="active" class="nav-link">Upload</a>
          <a routerLink="/slideshow" routerLinkActive="active" class="nav-link">Slideshow</a>
          
          <div class="user-block">
            <span class="user-name">{{ user.name }}</span>
            <button class="logout-btn" (click)="logout()">Logout</button>
          </div>
        </div>
      </div>
    </nav>

    <main class="content" [class.full-screen]="!auth.isAdmin() && auth.user()">
      <router-outlet />
    </main>
  `,
  styles: [`
    :host {
      display: block;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      background: #0f172a;
      color: #f8fafc;
    }

    .navbar {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .nav-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      text-decoration: none;
      color: #60a5fa;
      letter-spacing: -0.025em;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .nav-link {
      text-decoration: none;
      color: #94a3b8;
      font-weight: 500;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 0.95rem;
      padding: 0.5rem 0.25rem;
      border-bottom: 2px solid transparent;
    }

    .nav-link:hover {
      color: #f8fafc;
    }

    .nav-link.active {
      color: #60a5fa;
      border-bottom-color: #60a5fa;
    }

    .user-block {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-left: 1rem;
      padding-left: 2rem;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
    }

    .user-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: #cbd5e1;
    }

    .logout-btn {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.2);
      padding: 0.4rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }

    .logout-btn:hover {
      background: #ef4444;
      color: white;
    }

    .content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      transition: all 0.3s ease;
    }

    .content.full-screen {
      max-width: 100%;
      padding: 0;
      height: 100vh;
    }
  `],
})
export class App {
  auth = inject(AppwriteService);
  private router = inject(Router);

  protected readonly title = signal('tnfd-slideshow');

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
