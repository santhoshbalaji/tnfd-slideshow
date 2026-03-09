import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppwriteService } from '../../services/appwrite.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="login-page">
      <div class="login-card">
        <header>
          <h1>Welcome Back</h1>
          <p>Sign in to manage your slideshows</p>
        </header>

        <form (submit)="onSubmit($event)">
          <div class="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              name="email" 
              [(ngModel)]="email" 
              placeholder="name@company.com" 
              required
              [disabled]="isLoading()"
            >
          </div>

          <div class="form-group">
            <label>Password</label>
            <input 
              type="password" 
              name="password" 
              [(ngModel)]="password" 
              placeholder="••••••••" 
              required
              [disabled]="isLoading()"
            >
          </div>

          <div class="error-msg" *ngIf="error()">
            {{ error() }}
          </div>

          <button type="submit" [disabled]="isLoading()" class="submit-btn">
            <span *ngIf="!isLoading()">Sign In</span>
            <div class="spinner" *ngIf="isLoading()"></div>
          </button>
        </form>

        <footer>
          <p>Protected by Appwrite Security</p>
        </footer>
      </div>
    </div>
  `,
    styles: [`
    .login-page {
      height: calc(100vh - 120px);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .login-card {
      background: #1e293b;
      padding: 3rem;
      border-radius: 1.5rem;
      width: 100%;
      max-width: 440px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    header {
      text-align: center;
      margin-bottom: 2.5rem;
    }

    header h1 {
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      letter-spacing: -0.025em;
    }

    header p {
      color: #94a3b8;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #cbd5e1;
    }

    input {
      background: #0f172a;
      border: 1px solid #334155;
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      color: white;
      font-size: 1rem;
      transition: all 0.2s;
    }

    input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .error-msg {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      padding: 0.75rem;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .submit-btn {
      background: #3b82f6;
      color: white;
      padding: 0.75rem;
      border-radius: 0.75rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 1rem;
    }

    .submit-btn:hover:not(:disabled) {
      background: #2563eb;
      transform: translateY(-1px);
    }

    .submit-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .spinner {
      width: 1.25rem;
      height: 1.25rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    footer {
      margin-top: 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: #64748b;
    }
  `],
})
export class LoginComponent {
    private auth = inject(AppwriteService);
    private router = inject(Router);

    email = '';
    password = '';
    isLoading = signal(false);
    error = signal<string | null>(null);

    async onSubmit(event: Event) {
        event.preventDefault();
        this.isLoading.set(true);
        this.error.set(null);

        try {
            await this.auth.login(this.email, this.password);
            this.router.navigate(['/upload']);
        } catch (e: any) {
            this.error.set(e.message || 'Login failed. Please check your credentials.');
        } finally {
            this.isLoading.set(false);
        }
    }
}
