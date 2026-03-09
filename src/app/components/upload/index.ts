import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaService } from '../../services/media.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="upload-container">
      <header class="section-header">
        <h1>Upload Media</h1>
        <p>Add images and videos to your slideshow (Stored on Appwrite)</p>
      </header>

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
          accept="image/*,video/*" 
          (change)="onFileSelected($event)" 
          hidden
        >
        <div class="upload-icon" *ngIf="!isUploading()">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
        </div>
        <div class="loader" *ngIf="isUploading()"></div>
        
        <h3>{{ isUploading() ? 'Uploading...' : 'Drop your media here' }}</h3>
        <p>{{ isUploading() ? 'Please wait' : 'or click to browse from your device' }}</p>
      </div>

      <div class="media-grid" *ngIf="mediaService.items().length > 0">
        <div class="media-card" *ngFor="let item of mediaService.items()">
          <div class="preview-container">
            <img *ngIf="item.type === 'image'" [src]="item.url" [alt]="item.name">
            <video *ngIf="item.type === 'video'" [src]="item.url" muted></video>
            <button class="remove-btn" (click)="mediaService.deleteFile(item.id)">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div class="type-badge" [class.video]="item.type === 'video'">
              {{ item.type }}
            </div>
          </div>
          <div class="media-info">
            <span class="file-name" [title]="item.name">{{ item.name }}</span>
            <span class="file-size">{{ (item.size / 1024 / 1024) | number:'1.1-1' }} MB</span>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="mediaService.items().length === 0 && !isUploading()">
        <p>No media uploaded yet. Start by adding some files!</p>
      </div>
    </div>
  `,
  styles: [`
    .upload-container {
      max-width: 900px;
      margin: 0 auto;
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

    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1.5rem;
    }

    .media-card {
      background: #1e293b;
      border-radius: 1rem;
      overflow: hidden;
      border: 1px solid #334155;
      transition: all 0.2s ease;
    }

    .media-card:hover {
      transform: scale(1.02);
      border-color: #475569;
    }

    .preview-container {
      aspect-ratio: 16/10;
      position: relative;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-container img, .preview-container video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .remove-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: rgba(15, 23, 42, 0.8);
      color: #f1f5f9;
      border: none;
      width: 2rem;
      height: 2rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      backdrop-filter: blur(4px);
      transition: all 0.2s;
      opacity: 0;
    }

    .media-card:hover .remove-btn {
      opacity: 1;
    }

    .remove-btn:hover {
      background: #ef4444;
    }

    .type-badge {
      position: absolute;
      bottom: 0.5rem;
      left: 0.5rem;
      background: #3b82f6;
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.2rem 0.5rem;
      border-radius: 0.3rem;
    }

    .media-info {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .file-name {
      font-size: 0.9rem;
      font-weight: 600;
      color: #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-size {
      font-size: 0.75rem;
      color: #64748b;
    }

    .empty-state {
      text-align: center;
      padding: 4rem;
      color: #64748b;
    }
  `],
})
export class UploadComponent {
  mediaService = inject(MediaService);
  isDragging = signal(false);
  isUploading = signal(false);

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

  private async handleFiles(files: FileList) {
    this.isUploading.set(true);
    try {
      const uploadPromises = Array.from(files).map(file =>
        this.mediaService.uploadFile(file)
      );
      await Promise.all(uploadPromises);
    } catch (e) {
      alert('Failed to upload some files. Please check the console.');
    } finally {
      this.isUploading.set(false);
    }
  }
}
