import { Component, inject, signal, computed, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MediaService } from '../../services/media.service';
import { AppwriteService } from '../../services/appwrite.service';

@Component({
  selector: 'app-slideshow',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="slideshow-wrapper" [style.height]="auth.isAdmin() ? 'calc(100vh - 120px)' : '100vh'">
      <div class="slideshow-container" *ngIf="mediaService.items().length > 0; else empty">
        <div class="media-display">
          <div 
            class="media-item" 
            *ngFor="let item of mediaService.items(); let i = index"
            [class.active]="activeIndex() === i"
          >
            <img *ngIf="item.type === 'image'" [src]="item.url" [alt]="item.name" class="hd-media">
            <video 
              #videoPlayer
              *ngIf="item.type === 'video'" 
              [src]="item.url" 
              [autoplay]="activeIndex() === i"
              [muted]="true"
              controls
              (ended)="next()"
              class="hd-media"
            ></video>
          </div>
        </div>

        <div class="controls-overlay" *ngIf="auth.isAdmin()">
          <div class="top-bar">
            <div class="left-group">
              <span class="counter">{{ activeIndex() + 1 }} / {{ mediaService.items().length }}</span>
              <span class="file-name">{{ currentItem()?.name }}</span>
            </div>
            <button class="play-btn" (click)="togglePlay()">
               {{ isPlaying() ? 'PAUSE' : 'PLAY' }}
            </button>
          </div>

          <div class="navigation" (click)="$event.stopPropagation()">
            <button class="nav-btn prev" (click)="prev()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button class="nav-btn next" (click)="next()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div class="progress-bar-container">
            <div 
              class="progress-bar" 
              [style.width.%]="progress()"
            ></div>
          </div>
        </div>
      </div>

      <ng-template #empty>
        <div class="empty-state">
          <div class="empty-icon">📺</div>
          <h2>No media found in Bucket</h2>
          <p>Please upload some HD images or videos first.</p>
          <a routerLink="/upload" class="action-btn">Go to Upload</a>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .slideshow-wrapper {
      height: calc(100vh - 120px);
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
      border-radius: 1.5rem;
      overflow: hidden;
      position: relative;
    }

    .slideshow-container {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .media-display {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .media-item {
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 1s ease-in-out;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .media-item.active {
      opacity: 1;
      pointer-events: auto;
    }

    .hd-media {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      box-shadow: 0 0 100px rgba(0,0,0,0.8);
    }

    .controls-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 15%, rgba(0,0,0,0) 85%, rgba(0,0,0,0.7) 100%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: none;
      padding: 1.5rem;
      z-index: 10;
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      pointer-events: auto;
    }

    .left-group {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .counter {
      background: rgba(255, 255, 255, 0.1);
      padding: 0.4rem 1rem;
      border-radius: 2rem;
      font-weight: 700;
      font-size: 0.8rem;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      color: #60a5fa;
    }

    .file-name {
      font-weight: 500;
      color: rgba(255,255,255,0.8);
      font-size: 0.9rem;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .play-btn {
      background: #60a5fa;
      color: #000;
      border: none;
      padding: 0.5rem 1.2rem;
      border-radius: 0.5rem;
      font-weight: 800;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .play-btn:hover {
      background: #93c5fd;
      transform: scale(1.05);
    }

    .navigation {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      transform: translateY(-50%);
      display: flex;
      justify-content: space-between;
      padding: 0 1.5rem;
      pointer-events: none;
    }

    .nav-btn {
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      backdrop-filter: blur(10px);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: auto;
    }

    .nav-btn:hover {
      background: rgba(96, 165, 250, 0.3);
      border-color: #60a5fa;
      transform: scale(1.15);
      color: #60a5fa;
    }

    .nav-btn svg {
      width: 1.8rem;
      height: 1.8rem;
    }

    .progress-bar-container {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
      pointer-events: auto;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      width: 0;
      transition: width 0.1s linear;
      box-shadow: 0 0 15px rgba(96, 165, 250, 0.5);
    }

    .empty-state {
      text-align: center;
      padding: 4rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1.5rem;
    }

    .empty-state h2 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 1rem;
      color: #f1f5f9;
    }

    .empty-state p {
      color: #94a3b8;
      margin-bottom: 2rem;
    }

    .action-btn {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 0.75rem 2rem;
      border-radius: 0.75rem;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.2s;
    }

    .action-btn:hover {
      background: #2563eb;
    }
  `],
})
export class SlideshowComponent implements OnInit, OnDestroy {
  mediaService = inject(MediaService);
  auth = inject(AppwriteService);

  activeIndex = signal(0);
  isPlaying = signal(true);
  progress = signal(0);

  private intervalId: any;
  private readonly IMAGE_DURATION = 6000; // 6 seconds for HD images
  private lastUpdate = Date.now();

  currentItem = computed(() => {
    const items = this.mediaService.items();
    return items.length > 0 ? items[this.activeIndex()] : null;
  });

  ngOnInit() {
    this.startTimer();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  togglePlay() {
    this.isPlaying.update(v => !v);
  }

  next() {
    if (this.mediaService.items().length === 0) return;
    const nextIndex = (this.activeIndex() + 1) % this.mediaService.items().length;
    this.activeIndex.set(nextIndex);
    this.progress.set(0);
    this.lastUpdate = Date.now();
  }

  prev() {
    if (this.mediaService.items().length === 0) return;
    const prevIndex = (this.activeIndex() - 1 + this.mediaService.items().length) % this.mediaService.items().length;
    this.activeIndex.set(prevIndex);
    this.progress.set(0);
    this.lastUpdate = Date.now();
  }

  private startTimer() {
    this.intervalId = setInterval(() => {
      if (!this.isPlaying()) {
        this.lastUpdate = Date.now();
        return;
      }

      const item = this.currentItem();
      if (!item) return;

      if (item.type === 'image') {
        const now = Date.now();
        const delta = now - this.lastUpdate;
        const newProgress = Math.min(100, (delta / this.IMAGE_DURATION) * 100);

        this.progress.set(newProgress);

        if (newProgress >= 100) {
          this.next();
        }
      } else {
        // Video progress is normally handled by video element events or duration
        this.progress.set(100);
      }
    }, 100);
  }

  private stopTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
