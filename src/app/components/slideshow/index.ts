import { Component, inject, signal, computed, OnInit, OnDestroy, effect, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MediaService } from '../../services/media.service';
import { AppwriteService } from '../../services/appwrite.service';
import { SettingsService } from '../../services/settings.service';
import { init } from 'pptx-preview';

@Component({
  selector: 'app-slideshow',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="slideshow-wrapper" (mousemove)="onMouseMove()">
      <div class="slideshow-container" *ngIf="mediaService.items().length > 0; else empty">

        <!-- Double-buffer: Two iframes layered. The "back" one preloads; they swap on transition. -->
        <div class="media-display">
          <!-- Buffer A -->
          <div class="slide-frame" [class.on-top]="activeBuffer() === 'A'" [class.fading-in]="bufferTransitioning() && activeBuffer() === 'A'">
            <div #frameA class="pptx-container">
               <ng-container *ngIf="itemA(); let item">
                 <img *ngIf="item.type === 'image'" [src]="item.url" class="full-media">
                 <video *ngIf="item.type === 'video'" [src]="item.url" class="full-media" muted playsinline (ended)="onVideoEnded()"></video>
               </ng-container>
            </div>
          </div>
          <!-- Buffer B -->
          <div class="slide-frame" [class.on-top]="activeBuffer() === 'B'" [class.fading-in]="bufferTransitioning() && activeBuffer() === 'B'">
            <div #frameB class="pptx-container">
               <ng-container *ngIf="itemB(); let item">
                  <img *ngIf="item.type === 'image'" [src]="item.url" class="full-media">
                  <video *ngIf="item.type === 'video'" [src]="item.url" class="full-media" muted playsinline (ended)="onVideoEnded()"></video>
               </ng-container>
            </div>
          </div>
        </div>

        <div class="controls-overlay" [class.visible]="controlsVisible()">
          <div class="top-bar">
            <div class="left-group">
              <span class="counter">FILE {{ activeIndex() + 1 }} / {{ mediaService.items().length }}</span>
              <span class="slide-counter">SLIDE {{ currentSlideIndex() }} / {{ currentItem()?.slideCount || '...' }}</span>
              <span class="video-badge" *ngIf="isVideoSlide()">🎬 VIDEO</span>
              <span class="file-name">{{ currentItem()?.name }}</span>
            </div>
            <div class="center-group">
              <button class="file-nav-btn" (click)="switchToFile(activeIndex() - 1)">PREV FILE</button>
              <button class="play-btn" (click)="togglePlay()">
                 {{ isPlaying() ? 'PAUSE' : 'PLAY' }}
              </button>
              <button class="file-nav-btn" (click)="switchToFile(activeIndex() + 1)">NEXT FILE</button>
              <button class="file-nav-btn" (click)="forceRefresh()">REFRESH</button>
            </div>
          </div>

          <div class="navigation" (click)="$event.stopPropagation()">
            <button class="nav-btn prev" (click)="prevSlide()" title="Previous Slide">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button class="nav-btn next" (click)="nextSlide()" title="Next Slide">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div class="progress-bar-container">
            <div 
              class="progress-bar" 
              [class.video]="isVideoSlide()"
              [style.width.%]="progress()"
            ></div>
          </div>
        </div>
      </div>

      <ng-template #empty>
        <div class="empty-state">
          <h2>No PowerPoint presentations found</h2>
          <p>Please upload some PowerPoint (.pptx) files first.</p>
          <a routerLink="/upload" class="action-btn">Go to Upload</a>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .slideshow-wrapper {
      width: 100vw;
      height: 100vh;
      background: #000;
      position: fixed;
      inset: 0;
      z-index: 1000;
      overflow: hidden;
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

    /* Both iframes sit stacked on top of each other */
    .slide-frame {
      position: absolute;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background: #000;
      opacity: 0;
      transition: opacity 0.8s ease-in-out;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    /* Force 16:9 aspect ratio for the content if it's not already */
    :host ::ng-deep .pptx-wrapper,
    :host ::ng-deep .pptx-container {
       width: 100vw !important;
       height: 100vh !important;
       max-width: 100vw !important;
       max-height: 100vh !important;
       display: flex !important;
       align-items: center !important;
       justify-content: center !important;
       background: #000 !important;
    }

    :host ::ng-deep canvas, 
    :host ::ng-deep svg, 
    :host ::ng-deep img,
    .full-media {
       width: 100% !important;
       height: 100% !important;
       object-fit: contain; /* ensures full slide is visible without cropping */
    }

    :host ::ng-deep .pptx-slide {
      box-shadow: none !important;
      border: none !important;
      margin: 0 !important;
      width: 100% !important;
      height: 100% !important;
    }

    /* Hide library native controls */
    :host ::ng-deep .pptx-preview-wrapper-next,
    :host ::ng-deep .pptx-preview-wrapper-pagination {
      display: none !important;
    }

    /* The active (front) buffer is fully visible */
    .slide-frame.on-top {
      opacity: 1;
      z-index: 2;
    }

    /* The incoming buffer starts at full opacity so it reveals smoothly underneath */
    .slide-frame.fading-in {
      opacity: 1;
      z-index: 3;
      animation: fadeIn 0.8s ease-in-out forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .controls-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 15%, rgba(0,0,0,0) 85%, rgba(0,0,0,0.7) 100%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: none;
      padding: 2rem;
      z-index: 100;
      opacity: 0;
      transition: opacity 0.5s ease;
    }

    .controls-overlay.visible {
      opacity: 1;
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
      gap: 1.5rem;
    }

    .counter {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      color: #fff;
      padding: 0.5rem 1.5rem;
      border-radius: 2rem;
      font-weight: 700;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .slide-counter {
      background: rgba(59, 130, 246, 0.2);
      backdrop-filter: blur(10px);
      color: #93c5fd;
      padding: 0.5rem 1.5rem;
      border-radius: 2rem;
      font-weight: 700;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }

    .video-badge {
      background: rgba(245, 158, 11, 0.2);
      backdrop-filter: blur(10px);
      color: #fcd34d;
      padding: 0.5rem 1rem;
      border-radius: 2rem;
      font-weight: 700;
      font-size: 0.85rem;
      border: 1px solid rgba(245, 158, 11, 0.3);
      animation: pulse-badge 2s ease-in-out infinite;
    }

    @keyframes pulse-badge {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .file-name {
      color: #fff;
      font-weight: 500;
      font-size: 1rem;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }

    .center-group {
      display: flex;
      align-items: center;
      gap: 1rem;
      pointer-events: auto;
    }

    .play-btn {
      background: #fff;
      color: #000;
      border: none;
      padding: 0.6rem 2rem;
      border-radius: 0.75rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s;
    }

    .file-nav-btn {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0.6rem 1rem;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
      backdrop-filter: blur(10px);
      transition: all 0.2s;
    }

    .file-nav-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .navigation {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      transform: translateY(-50%);
      display: flex;
      justify-content: space-between;
      padding: 0 3rem;
      pointer-events: none;
    }

    .nav-btn {
      width: 5rem;
      height: 5rem;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      backdrop-filter: blur(10px);
      transition: all 0.3s;
      pointer-events: auto;
    }

    .nav-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1);
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
      background: #3b82f6;
      width: 0;
      transition: width 0.1s linear;
    }

    .progress-bar.video {
      background: #f59e0b;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      color: #fff;
      gap: 1rem;
    }

    .action-btn {
      background: #3b82f6;
      color: #fff;
      padding: 0.75rem 2rem;
      border-radius: 0.75rem;
      text-decoration: none;
      font-weight: 700;
    }

    .action-btn:hover {
      background: #2563eb;
    }
  `],
})
export class SlideshowComponent implements OnInit, OnDestroy, AfterViewInit {
  mediaService = inject(MediaService);
  auth = inject(AppwriteService);
  settingsService = inject(SettingsService);

  @ViewChild('frameA') frameA!: ElementRef<HTMLDivElement>;
  @ViewChild('frameB') frameB!: ElementRef<HTMLDivElement>;

  private previewerA?: any;
  private previewerB?: any;
  private cachedBuffers = new Map<string, ArrayBuffer>();

  activeIndex = signal(0);
  currentSlideIndex = signal(1);
  isPlaying = signal(true);
  progress = signal(0);
  controlsVisible = signal(false);

  // Double-buffer: which iframe is currently "on top" (visible)
  activeBuffer = signal<'A' | 'B'>('A');
  // True during the crossfade animation window
  bufferTransitioning = signal(false);

  // Buffer-specific items to prevent flickering during crossfade
  itemA = signal<any>(null);
  itemB = signal<any>(null);

  private intervalId: any;
  private controlsTimeout: any;
  private refreshIntervalId: any;
  private lastUpdate = Date.now();
  // Track whether the back buffer has finished loading
  private backBufferReady = false;

  currentItem = computed(() => {
    const items = this.mediaService.items();
    return items.length > 0 ? items[this.activeIndex()] : null;
  });

  // True when the currently displayed slide has an embedded video
  isVideoSlide = computed(() => {
    const item = this.currentItem();
    const slideIdx = this.currentSlideIndex();
    return !!(item?.videoSlides?.includes(slideIdx));
  });

  constructor() {
    effect(() => {
      const items = this.mediaService.items();
      if (items.length > 0 && this.activeIndex() >= items.length) {
        this.activeIndex.set(0);
        this.progress.set(0);
        this.lastUpdate = Date.now();
      }
    });
  }

  ngOnInit() {
    this.mediaService.loadMedia(100, 0);

    // Refresh media and settings every 2 minutes
    this.refreshIntervalId = setInterval(() => {
      this.mediaService.loadMedia(100, 0);
      this.settingsService.loadSettings();
    }, 2 * 60 * 1000);
  }

  ngAfterViewInit() {
    // Give the media list a tick to populate, then load the first slide
    setTimeout(() => this.initFirstSlide(), 500);
  }

  ngOnDestroy() {
    this.stopTimer();
    if (this.controlsTimeout) clearTimeout(this.controlsTimeout);
    if (this.refreshIntervalId) clearInterval(this.refreshIntervalId);
  }

  private initFirstSlide() {
    const items = this.mediaService.items();
    if (items.length === 0) {
      // Retry until media loads
      setTimeout(() => this.initFirstSlide(), 500);
      return;
    }
    // Load current slide into front buffer, next slide into back buffer
    this.loadBuffer(this.activeBuffer(), this.activeIndex(), this.currentSlideIndex());
    this.preloadBackBuffer();
    this.startTimer();
  }

  // Returns the div element for a given buffer key
  private getFrame(buffer: 'A' | 'B'): HTMLDivElement {
    return buffer === 'A' ? this.frameA.nativeElement : this.frameB.nativeElement;
  }

  private getPreviewer(buffer: 'A' | 'B'): any {
    const frame = buffer === 'A' ? this.frameA : this.frameB;
    if (!frame) {
      console.warn(`[PPTX] Frame ${buffer} not found in template yet`);
      return null;
    }

    // For 16:9 TV, we want standard 16:9 base or window dimensions
    const width = window.innerWidth || 1920;
    const height = (width * 9) / 16;

    const options = {
      mode: 'slide' as const,
      width: width,
      height: height
    };

    if (buffer === 'A') {
      if (!this.previewerA) {
        console.log('[PPTX] Initializing Previewer A with options:', options);
        this.previewerA = init(frame.nativeElement, options);
      }
      return this.previewerA;
    } else {
      if (!this.previewerB) {
        console.log('[PPTX] Initializing Previewer B with options:', options);
        this.previewerB = init(frame.nativeElement, options);
      }
      return this.previewerB;
    }
  }

  private backBuffer(): 'A' | 'B' {
    return this.activeBuffer() === 'A' ? 'B' : 'A';
  }

  // Load a specific slide into a buffer div
  private async loadBuffer(buffer: 'A' | 'B', fileIndex: number, slideIndex: number) {
    const items = this.mediaService.items();
    if (!items.length || fileIndex < 0 || fileIndex >= items.length) {
      console.warn('No items or invalid index', { length: items.length, fileIndex });
      return;
    }

    const item = items[fileIndex];
    if (!item) return;

    // Set buffer-specific item for template rendering (images/videos)
    if (buffer === 'A') this.itemA.set(item);
    else this.itemB.set(item);

    if (item.type !== 'pptx') {
      console.log(`[SLIDESHOW] Handled ${item.type} media for buffer ${buffer}: ${item.name}`);
      // For images and videos, we clear any previous PPTX content to be safe
      const frame = this.getFrame(buffer);
      const wrapper = frame.querySelector('.pptx-wrapper');
      if (wrapper) wrapper.innerHTML = '';

      if (item.type === 'video') {
        // Only trigger auto-play if we are loading into the ALREADY active buffer
        // (e.g. initial load or manual switch). 
        // Preloaded videos in back-buffer will be played during crossfadeTo.
        if (buffer === this.activeBuffer()) {
          setTimeout(() => this.autoPlayVideos(buffer), 300);
        }
      }
      return;
    }

    console.log(`Loading buffer ${buffer} for file: ${item.name}, slide: ${slideIndex}`);

    let arrayBuffer = this.cachedBuffers.get(item.id);

    if (!arrayBuffer) {
      try {
        console.log(`Fetching PPTX from: ${item.url}`);
        const response = await fetch(item.url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        arrayBuffer = await response.arrayBuffer();
        this.cachedBuffers.set(item.id, arrayBuffer);
        console.log(`Successfully fetched and cached ${item.name}`);
      } catch (err) {
        console.error('Failed to fetch PPTX. This might be a CORS issue. Error:', err);
        return;
      }
    }

    const previewer = this.getPreviewer(buffer);
    if (!previewer) return;

    try {
      console.log(`[PPTX] Rendering ${item.name} to buffer ${buffer}`);

      const startTime = Date.now();
      await previewer.preview(arrayBuffer);
      console.log(`[PPTX] Preview generated in ${Date.now() - startTime}ms. Switching to slide ${slideIndex}`);

      console.log(`[PPTX] Total slides detected: ${previewer.slideCount}`);

      previewer.renderSingleSlide(slideIndex - 1);
      console.log(`[PPTX] renderSingleSlide(${slideIndex - 1}) called`);

      // Auto-play videos if present
      setTimeout(() => this.autoPlayVideos(buffer), 500);
    } catch (err) {
      console.error('[PPTX] Failed to render PPTX. Library error:', err);
    }
  }

  private autoPlayVideos(buffer: 'A' | 'B') {
    const frame = this.getFrame(buffer);
    const videos = frame.querySelectorAll('video');
    console.log(`[PPTX] Found ${videos.length} videos in buffer ${buffer}`);
    videos.forEach(video => {
      video.muted = true; // Auto-play often requires muting
      video.play().catch(err => console.error('[PPTX] Video play failed:', err));
    });
  }

  // Pre-load the NEXT slide into the invisible back buffer
  private async preloadBackBuffer() {
    this.backBufferReady = false;
    const items = this.mediaService.items();
    if (!items.length) return;

    let nextFile = this.activeIndex();
    let nextSlide = this.currentSlideIndex() + 1;
    const totalSlides = this.currentItem()?.slideCount || 999;

    if (nextSlide > totalSlides) {
      nextFile = (nextFile + 1) % items.length;
      nextSlide = 1;
    }

    const back = this.backBuffer();
    await this.loadBuffer(back, nextFile, nextSlide);
    this.backBufferReady = true;
  }

  // Perform the actual crossfade: swap buffers, then preload the next slide
  private crossfadeTo(fileIndex: number, slideIndex: number) {
    const incoming = this.backBuffer();

    // If the back buffer doesn't have the slide we want, load it now
    const items = this.mediaService.items();
    if (items.length && (fileIndex !== this.activeIndex() || slideIndex !== this.currentSlideIndex() + 1)) {
      this.loadBuffer(incoming, fileIndex, slideIndex);
    }

    // Start the crossfade: bring incoming on top with fade
    this.bufferTransitioning.set(true);
    this.activeBuffer.set(incoming);

    // Update our logical state
    this.activeIndex.set(fileIndex);
    this.currentSlideIndex.set(slideIndex);
    this.progress.set(0);
    this.lastUpdate = Date.now();

    // If the new active buffer is a native video, start it now
    const newItem = items[fileIndex];
    if (newItem?.type === 'video') {
      setTimeout(() => this.autoPlayVideos(incoming), 100);
    }

    // After animation completes, clear transition flag and preload the next
    setTimeout(() => {
      this.bufferTransitioning.set(false);
      this.preloadBackBuffer();
    }, 900); // slightly longer than the 0.8s CSS transition
  }

  onVideoEnded() {
    console.log('[SLIDESHOW] Standalone video ended, advancing...');
    this.advanceSlide();
  }

  private advanceSlide() {
    const items = this.mediaService.items();
    if (!items.length) return;

    const item = this.currentItem();
    const totalSlides = item?.slideCount || 1;

    let nextFile = this.activeIndex();
    let nextSlide = this.currentSlideIndex() + 1;

    console.log(`[SLIDESHOW] Advance: Current File ${nextFile + 1}, Slide ${this.currentSlideIndex()}/${totalSlides}`);

    if (nextSlide > totalSlides) {
      console.log('[SLIDESHOW] Reached end of slides for this file, moving to next file');
      nextFile = (nextFile + 1) % items.length;
      nextSlide = 1;
    }

    this.crossfadeTo(nextFile, nextSlide);
  }

  public switchToFile(index: number) {
    const totalFiles = this.mediaService.items().length;
    if (totalFiles === 0) return;
    const newIndex = (index + totalFiles) % totalFiles;
    this.crossfadeTo(newIndex, 1);
  }

  onMouseMove() {
    this.controlsVisible.set(true);
    if (this.controlsTimeout) clearTimeout(this.controlsTimeout);
    this.controlsTimeout = setTimeout(() => {
      this.controlsVisible.set(false);
    }, 3000);
  }

  togglePlay() {
    this.isPlaying.update((v: boolean) => !v);
  }

  nextSlide() {
    this.advanceSlide();
  }

  prevSlide() {
    const items = this.mediaService.items();
    if (!items.length) return;

    let prevFile = this.activeIndex();
    let prevSlide = this.currentSlideIndex() - 1;

    if (prevSlide < 1) {
      prevFile = (prevFile - 1 + items.length) % items.length;
      prevSlide = items[prevFile] ? (items[prevFile].slideCount || 1) : 1;
    }

    this.crossfadeTo(prevFile, prevSlide);
  }

  forceRefresh() {
    console.log('[PPTX] Manual refresh triggered');
    this.cachedBuffers.clear();
    this.initFirstSlide();
  }

  private startTimer() {
    this.intervalId = setInterval(() => {
      if (!this.isPlaying()) {
        this.lastUpdate = Date.now();
        return;
      }
      if (this.mediaService.items().length === 0) return;
      if (this.bufferTransitioning()) return;

      const now = Date.now();
      const delta = now - this.lastUpdate;

      const item = this.currentItem();
      const isStandaloneVideo = item?.type === 'video';
      const isPptxVideo = this.isVideoSlide() && item?.type === 'pptx';

      // For standalone videos, we don't advance via timer; we wait for (ended) event.
      if (isStandaloneVideo) {
        this.progress.set(50); // Just show some pending state or keep at current
        return;
      }

      // For PPTX video slides: prefer per-file duration, fall back to global setting.
      const perFileDuration = item?.videoSlideDuration;
      const duration = isPptxVideo
        ? (perFileDuration ?? this.settingsService.videoSlideDuration())
        : this.settingsService.slideDuration();

      const newProgress = Math.min(100, (delta / duration) * 100);
      this.progress.set(newProgress);

      if (newProgress >= 100) {
        this.advanceSlide();
      }
    }, 100);
  }

  private stopTimer() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
