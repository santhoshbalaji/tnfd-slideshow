import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaService } from '../../services/media.service';
import { SettingsService } from '../../services/settings.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="upload-container">
      <header class="section-header">
        <h1>Upload Media Files</h1>
        <p>Add PowerPoint (.pptx), Images, and Videos to your slideshow (Stored on Appwrite)</p>
      </header>

      <section class="settings-card">
        <div class="settings-header">
          <div class="settings-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="settings-title">
            <h3>Slideshow Settings</h3>
            <p>Customize automated playback behavior</p>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <label>Auto-Transition Timer</label>
            <div class="label-right">
              <span class="saving-txt" *ngIf="settingsService.isSaving()">Saving...</span>
              <span class="value-badge">{{ settingsService.getDurationInSeconds() }}s</span>
            </div>
          </div>
          <div class="setting-control">
            <input 
              type="range" 
              min="5" 
              max="300" 
              step="5"
              [ngModel]="settingsService.getDurationInSeconds()"
              (ngModelChange)="settingsService.updateDuration($event)"
              class="duration-slider"
              [disabled]="settingsService.isSaving()"
            >
            <div class="slider-marks">
              <span>5s</span>
              <span>60s</span>
              <span>120s</span>
              <span>180s</span>
              <span>240s</span>
              <span>5m</span>
            </div>
          </div>
          <p class="setting-hint">Duration to display each slide before advancing. Native PowerPoint timings will still be respected if shorter than this value.</p>
        </div>

        <div class="setting-divider"></div>

        <div class="setting-item">
          <div class="setting-label">
            <label>Video Slide Duration</label>
            <div class="label-right">
              <span class="saving-txt" *ngIf="settingsService.isSaving()">Saving...</span>
              <span class="value-badge video-badge-sm">{{ settingsService.getVideoDurationInSeconds() }}s</span>
            </div>
          </div>
          <div class="setting-control">
            <input 
              type="range" 
              min="10" 
              max="600" 
              step="10"
              [ngModel]="settingsService.getVideoDurationInSeconds()"
              (ngModelChange)="settingsService.updateVideoDuration($event)"
              class="duration-slider video-slider"
              [disabled]="settingsService.isSaving()"
            >
            <div class="slider-marks">
              <span>10s</span>
              <span>2m</span>
              <span>4m</span>
              <span>6m</span>
              <span>8m</span>
              <span>10m</span>
            </div>
          </div>
          <p class="setting-hint">🎬 Set this to match the duration of your longest embedded video. The app will wait this long before advancing past a video slide.</p>
        </div>
      </section>

      <div 
        class="drop-zone" 
        [class.dragging]="isDragging()"
        [class.uploading]="isUploading()"
        (dragover)="$event.preventDefault(); isDragging.set(true)"
        (dragleave)="isDragging.set(false)"
        (drop)="onDrop($event)"
        (click)="!isUploading() && fileInput.click()"
      >
        <input 
          #fileInput 
          type="file" 
          multiple 
          accept=".pptx,.ppt,image/*,video/*" 
          (change)="onFileSelected($event)" 
          hidden
        >
        <div class="upload-icon" *ngIf="!isUploading()">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
        </div>
        <div class="loader" *ngIf="isUploading()"></div>
        
        <h3>{{ isUploading() ? 'Uploading...' : 'Drop your PowerPoint presentations here' }}</h3>
        <p>{{ isUploading() ? 'Please wait' : 'or click to browse from your device' }}</p>
      </div>

      <div class="media-table-container" *ngIf="mediaService.items().length > 0">
        <table class="media-table">
          <thead>
            <tr>
              <th>Preview</th>
              <th>Name</th>
              <th>Type</th>
              <th>Size</th>
              <th>Slides</th>
              <th class="video-dur-th" title="Seconds to wait on a video slide before advancing">🎬 Video Dur.</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of mediaService.items()">
              <td class="preview-cell">
                <div class="table-preview">
                  <ng-container [ngSwitch]="item.type">
                    <img *ngSwitchCase="'image'" [src]="item.url" class="img-preview-sm">
                    <div *ngSwitchCase="'video'" class="video-preview-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                    </div>
                    <div *ngSwitchDefault class="pptx-icon-small">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                  </ng-container>
                </div>
              </td>
              <td class="name-cell">{{ item.name }}</td>
              <td>
                <span class="type-badge" [ngClass]="item.type">{{ item.type }}</span>
              </td>
              <td>{{ (item.size / 1024 / 1024) | number:'1.1-1' }} MB</td>
              <td>
                <span class="slide-count-badge" *ngIf="item.type === 'pptx' && item.slideCount; else otherTypeCount">{{ item.slideCount }}</span>
                <ng-template #otherTypeCount><span class="no-video-txt">—</span></ng-template>
              </td>
              <td class="video-dur-cell">
                <div class="video-dur-input-wrap" *ngIf="item.videoSlides?.length; else noVideo">
                  <input
                    type="number"
                    class="video-dur-input"
                    [value]="item.videoSlideDuration ? (item.videoSlideDuration / 1000) : ''"
                    placeholder="sec"
                    min="5"
                    max="600"
                    (change)="onVideoSlideDurationChange(item.id, $event)"
                    title="Seconds to display this presentation's video slides before advancing"
                  >
                  <span class="video-dur-unit">s</span>
                </div>
                <ng-template #noVideo>
                  <span class="no-video-txt" *ngIf="item.slideCount; else scanning">—</span>
                  <ng-template #scanning><span class="slide-count-loading">…</span></ng-template>
                </ng-template>
              </td>
              <td>
                <div class="action-btns">
                  <a
                    class="download-btn-small"
                    [href]="mediaService.getDownloadUrl(item.id)"
                    [download]="item.name"
                    title="Download"
                    (click)="$event.stopPropagation()"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </a>
                  <button class="remove-btn-small" (click)="onDelete($event, item.id, item.name)">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination">
          <button 
            [disabled]="currentPage() === 0" 
            (click)="goToPage(currentPage() - 1)"
            class="pg-btn"
          >
            Previous
          </button>
          <span class="pg-info">
            Page {{ currentPage() + 1 }} of {{ totalPages() }}
            <small>({{ mediaService.total() }} items)</small>
          </span>
          <button 
            [disabled]="currentPage() >= totalPages() - 1" 
            (click)="goToPage(currentPage() + 1)"
            class="pg-btn"
          >
            Next
          </button>
        </div>
      </div>

      <div class="empty-state" *ngIf="mediaService.items().length === 0 && !isUploading()">
        <p>No media files uploaded yet. Start by adding some PowerPoint (.pptx), Images, or Videos!</p>
      </div>

      <!-- Custom Confirmation Modal -->
      <div class="modal-overlay" *ngIf="showConfirm()">
        <div class="modal-content">
          <div class="modal-header">
            <div class="warning-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3>Delete Presentation</h3>
          </div>
          <p>Are you sure you want to delete <strong>"{{ itemToDelete()?.name }}"</strong>? This action cannot be undone.</p>
          <div class="modal-actions">
            <button class="cancel-btn" (click)="cancelDelete()">Cancel</button>
            <button class="confirm-btn" (click)="confirmDelete()">Delete</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .upload-container {
      max-width: 900px;
      margin: 0 auto;
      padding-bottom: 5rem;
    }

    .settings-card {
      background: #1e293b;
      border-radius: 1.5rem;
      border: 1px solid #334155;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .settings-header {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .settings-icon {
      width: 3rem;
      height: 3rem;
      background: rgba(96, 165, 250, 0.1);
      color: #60a5fa;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.6rem;
    }

    .settings-title h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
    }

    .settings-title p {
      font-size: 0.9rem;
      color: #94a3b8;
      margin: 0;
    }

    .setting-item {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .setting-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .label-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .saving-txt {
      font-size: 0.8rem;
      color: #60a5fa;
      font-weight: 500;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: .5; }
    }

    .setting-label label {
      font-weight: 600;
      color: #cbd5e1;
    }

    .value-badge {
      background: #3b82f6;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 700;
      box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
    }

    .value-badge.video-badge-sm {
      background: #d97706;
      box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.3);
    }

    .setting-divider {
      height: 1px;
      background: #334155;
      margin: 0.5rem 0;
    }

    .setting-control {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .duration-slider {
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      background: #334155;
      border-radius: 3px;
      outline: none;
    }

    .duration-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      background: #60a5fa;
      border-radius: 50%;
      cursor: pointer;
      border: 3px solid #1e293b;
      box-shadow: 0 0 0 1px #334155;
      transition: all 0.2s;
    }

    .duration-slider::-webkit-slider-thumb:hover {
      background: #93c5fd;
      transform: scale(1.1);
    }

    .video-slider::-webkit-slider-thumb {
      background: #d97706;
    }

    .video-slider::-webkit-slider-thumb:hover {
      background: #f59e0b;
      transform: scale(1.1);
    }

    .slider-marks {
      display: flex;
      justify-content: space-between;
      padding: 0 4px;
    }

    .slider-marks span {
      font-size: 0.75rem;
      color: #64748b;
    }

    .setting-hint {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0;
      font-style: italic;
    }

    .section-header {
      margin-bottom: 2.5rem;
      text-align: center;
    }

    .section-header h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .section-header p {
      color: #94a3b8;
      font-size: 1.1rem;
    }

    .drop-zone {
      background: #1e293b;
      border: 2px dashed #334155;
      border-radius: 1.5rem;
      padding: 4rem 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      margin-bottom: 3rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .drop-zone:hover, .drop-zone.dragging {
      border-color: #60a5fa;
      background: #1e293b;
      transform: translateY(-2px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    }

    .drop-zone.uploading {
      cursor: wait;
      opacity: 0.7;
      border-color: #60a5fa;
    }

    .upload-icon {
      width: 4rem;
      height: 4rem;
      color: #60a5fa;
      margin-bottom: 1rem;
    }

    .loader {
      width: 4rem;
      height: 4rem;
      border: 4px solid #334155;
      border-top-color: #60a5fa;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .media-table-container {
      background: #1e293b;
      border-radius: 1rem;
      border: 1px solid #334155;
      overflow-x: auto;
      margin-top: 2rem;
    }

    .media-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      table-layout: fixed;
    }

    .media-table th {
      background: #0f172a;
      padding: 0.6rem 0.75rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .media-table td {
      padding: 0.65rem 0.75rem;
      border-bottom: 1px solid #334155;
      color: #f1f5f9;
      vertical-align: middle;
      overflow: hidden;
    }

    .media-table tr:last-child td {
      border-bottom: none;
    }

    /* Column widths */
    .media-table th:nth-child(1), .media-table td:nth-child(1) { width: 56px; }  /* Preview */
    .media-table th:nth-child(2), .media-table td:nth-child(2) { width: auto; }  /* Name */
    .media-table th:nth-child(3), .media-table td:nth-child(3) { width: 60px; }  /* Type */
    .media-table th:nth-child(4), .media-table td:nth-child(4) { width: 72px; }  /* Size */
    .media-table th:nth-child(5), .media-table td:nth-child(5) { width: 60px; text-align: center; } /* Slides */
    .media-table th:nth-child(6), .media-table td:nth-child(6) { width: 110px; text-align: center; } /* Video dur */
    .media-table th:nth-child(7), .media-table td:nth-child(7) { width: 80px; text-align: center; } /* Actions */

    .preview-cell {
      width: 56px;
    }

    .table-preview {
      width: 60px;
      height: 40px;
      background: #0f172a;
      border-radius: 0.5rem;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .table-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .pptx-icon-small {
      width: 1.5rem;
      height: 1.5rem;
      color: #ea580c; /* Orange for PPTX */
    }

    .video-preview-sm {
      width: 1.5rem;
      height: 1.5rem;
      color: #60a5fa;
    }

    .img-preview-sm {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .type-badge.image { background: rgba(52, 211, 153, 0.1); color: #34d399; }
    .type-badge.video { background: rgba(96, 165, 250, 0.1); color: #60a5fa; }
    .type-badge.pptx { background: rgba(234, 88, 12, 0.1); color: #ea580c; }

    .name-cell {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .remove-btn-small {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .remove-btn-small:hover {
      background: #ef4444;
      color: white;
    }

    .remove-btn-small svg {
      width: 1.25rem;
      height: 1.25rem;
    }

    .pagination {
      padding: 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1.5rem;
      background: #0f172a;
      border-top: 1px solid #334155;
    }

    .pg-btn {
      background: #334155;
      color: #fff;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .pg-btn:hover:not(:disabled) {
      background: #475569;
    }

    .pg-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pg-info {
      font-size: 0.9rem;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .pg-info small {
      font-size: 0.75rem;
    }

    .empty-state {
      text-align: center;
      padding: 4rem;
      color: #64748b;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1.5rem;
    }

    .modal-content {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 1.5rem;
      padding: 2rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .warning-icon {
      color: #ef4444;
      width: 2rem;
      height: 2rem;
    }

    .modal-content h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
    }

    .modal-content p {
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 2rem;
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .cancel-btn {
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      border: 1px solid #334155;
      background: transparent;
      color: #94a3b8;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .confirm-btn {
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      border: none;
      background: #ef4444;
      color: white;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }

    .cancel-btn:hover {
      background: #334155;
      color: white;
    }

    .confirm-btn:hover {
      background: #dc2626;
      transform: scale(1.02);
    }

    .action-btns {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: center;
    }

    .download-btn-small {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #34d399;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }

    .download-btn-small:hover {
      background: rgba(16, 185, 129, 0.2);
      border-color: rgba(16, 185, 129, 0.4);
      color: #6ee7b7;
    }

    .download-btn-small svg {
      width: 16px;
      height: 16px;
    }

    .video-dur-th {
      white-space: nowrap;
    }

    .video-dur-cell {
      text-align: center;
    }

    .video-dur-input-wrap {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(217, 119, 6, 0.1);
      border: 1px solid rgba(217, 119, 6, 0.3);
      border-radius: 8px;
      padding: 2px 8px 2px 4px;
    }

    .video-dur-input {
      width: 56px;
      background: transparent;
      border: none;
      outline: none;
      color: #fcd34d;
      font-size: 0.85rem;
      font-weight: 700;
      text-align: right;
      appearance: textfield;
      -moz-appearance: textfield;
    }

    .video-dur-input::-webkit-outer-spin-button,
    .video-dur-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .video-dur-unit {
      font-size: 0.75rem;
      color: #d97706;
      font-weight: 600;
    }

    .slide-count-badge {
      display: inline-block;
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .slide-count-loading {
      color: #475569;
      font-size: 0.85rem;
    }

    .no-video-txt {
      color: #475569;
      font-size: 1rem;
    }
  `],
})
export class UploadComponent {
  mediaService = inject(MediaService);
  settingsService = inject(SettingsService);
  isDragging = signal(false);
  isUploading = signal(false);

  currentPage = signal(0);
  pageSize = signal(10);
  totalPages = computed(() => Math.ceil(this.mediaService.total() / this.pageSize()) || 1);

  showConfirm = signal(false);
  itemToDelete = signal<{ id: string, name: string } | null>(null);

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (this.isUploading()) return;

    if (event.dataTransfer?.files) {
      this.handleFiles(event.dataTransfer.files);
    }
  }

  onFileSelected(event: any) {
    const files = event.target.files as FileList;
    if (files && !this.isUploading()) {
      this.handleFiles(files);
    }
  }

  onDelete(event: Event, id: string, name: string) {
    event.stopPropagation();
    this.itemToDelete.set({ id, name });
    this.showConfirm.set(true);
  }

  async confirmDelete() {
    const item = this.itemToDelete();
    if (item) {
      await this.mediaService.deleteFile(item.id);
      this.showConfirm.set(false);
      this.itemToDelete.set(null);

      // If we are on a page that becomes empty, go back
      if (this.mediaService.items().length === 0 && this.currentPage() > 0) {
        this.goToPage(this.currentPage() - 1);
      } else {
        this.refresh();
      }
    }
  }

  cancelDelete() {
    this.showConfirm.set(false);
    this.itemToDelete.set(null);
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.refresh();
  }

  onVideoSlideDurationChange(fileId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const seconds = parseFloat(input.value);
    if (!isNaN(seconds) && seconds >= 5) {
      this.mediaService.updateFileVideoSlideDuration(fileId, Math.round(seconds * 1000));
    }
  }

  private refresh() {
    this.mediaService.loadMedia(this.pageSize(), this.currentPage() * this.pageSize());
  }

  private async handleFiles(files: FileList) {
    this.isUploading.set(true);
    try {
      const uploadPromises = Array.from(files).map(file =>
        this.mediaService.uploadFile(file)
      );
      await Promise.all(uploadPromises);
      this.goToPage(0); // Back to first page to see new uploads
    } catch (e) {
      alert('Failed to upload some files. Please check the console.');
    } finally {
      this.isUploading.set(false);
    }
  }
}
