import { Injectable, inject, signal } from '@angular/core';
import { AppwriteService } from './appwrite.service';
import { ID, Query, ImageGravity } from 'appwrite';

export interface MediaItem {
    id: string;
    url: string;
    type: 'image' | 'video';
    name: string;
    size: number;
}

@Injectable({
    providedIn: 'root'
})
export class MediaService {
    private appwrite = inject(AppwriteService);
    private readonly BUCKET_ID = 'media-bucket';

    private mediaItems = signal<MediaItem[]>([]);
    readonly items = this.mediaItems.asReadonly();

    constructor() {
        this.loadMedia();
    }

    async loadMedia() {
        try {
            const response = await this.appwrite.storage.listFiles(this.BUCKET_ID, [
                Query.orderDesc('$createdAt')
            ]);

            const items = response.files.map(file => ({
                id: file.$id,
                url: this.getFilePreview(file.$id, file.mimeType), // HD preview for images
                type: file.mimeType.startsWith('image/') ? 'image' : 'video' as 'image' | 'video',
                name: file.name,
                size: file.sizeOriginal
            }));

            this.mediaItems.set(items);
        } catch (e) {
            console.error('Error loading media:', e);
        }
    }

    async uploadFile(file: File) {
        try {
            const response = await this.appwrite.storage.createFile(
                this.BUCKET_ID,
                ID.unique(),
                file
            );

            await this.loadMedia(); // Refresh list
            return response;
        } catch (e) {
            console.error('Error uploading file:', e);
            throw e;
        }
    }

    async deleteFile(id: string) {
        try {
            await this.appwrite.storage.deleteFile(this.BUCKET_ID, id);
            this.mediaItems.update(items => items.filter(i => i.id !== id));
        } catch (e) {
            console.error('Error deleting file:', e);
        }
    }

    getFilePreview(fileId: string, mimeType: string): string {
        if (mimeType.startsWith('image/')) {
            // Get HD preview for images (no cropping, high quality)
            return this.appwrite.storage.getFilePreview(
                this.BUCKET_ID,
                fileId,
                2000, // Width
                2000, // Height
                ImageGravity.Top, // Gravity
                100    // Quality
            ).toString();
        } else {
            // For videos, return the view URL
            return this.appwrite.storage.getFileView(this.BUCKET_ID, fileId).toString();
        }
    }
}
