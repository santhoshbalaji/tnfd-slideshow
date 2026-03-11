import { Injectable, inject, signal } from '@angular/core';
import { AppwriteService } from './appwrite.service';
import { ID, Query, ImageGravity } from 'appwrite';

export interface MediaItem {
    id: string;
    url: string;
    type: 'image' | 'video' | 'pptx';
    name: string;
    size: number;
    slideCount?: number;
    videoSlides?: number[];     // Slide numbers (1-indexed) that contain embedded video
    videoSlideDuration?: number; // Per-file override for video slide timer (ms)
}

@Injectable({
    providedIn: 'root'
})
export class MediaService {
    private appwrite = inject(AppwriteService);
    private readonly BUCKET_ID = 'media-bucket';

    private mediaItems = signal<MediaItem[]>([]);
    readonly items = this.mediaItems.asReadonly();

    private totalCount = signal<number>(0);
    readonly total = this.totalCount.asReadonly();

    constructor() {
        this.loadMedia();
        this.initRealtime();
    }

    private initRealtime() {
        // Subscribe to all file changes in the media bucket
        this.appwrite.client.subscribe(`buckets.${this.BUCKET_ID}.files`, (response: any) => {
            console.log('[REALTIME] Media change detected:', response.events);
            // Refresh the list when files are created, updated or deleted
            this.loadMedia(100, 0);
        });
    }

    async loadMedia(limit: number = 10, offset: number = 0) {
        try {
            const response = await this.appwrite.storage.listFiles(this.BUCKET_ID, [
                Query.orderDesc('$createdAt'),
                Query.limit(limit),
                Query.offset(offset)
            ]);

            const mediaFiles = response.files.filter(file => {
                const mimeType = file.mimeType.toLowerCase();
                const name = file.name.toLowerCase();
                return (
                    mimeType.startsWith('image/') ||
                    mimeType.startsWith('video/') ||
                    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                    mimeType === 'application/vnd.ms-powerpoint' ||
                    name.endsWith('.pptx') ||
                    name.endsWith('.ppt')
                );
            });

            const items = mediaFiles.map(file => {
                const mimeType = file.mimeType.toLowerCase();
                let type: 'image' | 'video' | 'pptx' = 'pptx';

                if (mimeType.startsWith('image/')) type = 'image';
                else if (mimeType.startsWith('video/')) type = 'video';

                return {
                    id: file.$id,
                    url: this.appwrite.storage.getFileView(this.BUCKET_ID, file.$id).toString(),
                    type,
                    name: file.name,
                    size: file.sizeOriginal,
                    slideCount: type === 'pptx' ? undefined : 1
                };
            });

            this.mediaItems.set(items);
            this.totalCount.set(response.total);

            // Enrich slide counts and per-file settings in the background
            this.enrichSlideCounts();
            this.enrichFileSettings();
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
            // Also attempt to delete the per-file settings document if it exists
            try {
                await this.appwrite.databases.deleteDocument(
                    this.appwrite.DATABASE_ID,
                    this.appwrite.SETTINGS_COLLECTION_ID,
                    `video_${id}`
                );
            } catch { /* Settings doc may not exist, ignore */ }
        } catch (e) {
            console.error('Error deleting file:', e);
        }
    }

    async updateFileVideoSlideDuration(fileId: string, durationMs: number) {
        // Update local state immediately for responsive UI
        this.mediaItems.update(items =>
            items.map(i => i.id === fileId ? { ...i, videoSlideDuration: durationMs } : i)
        );
        // Persist to Appwrite
        const docId = `video_${fileId}`;
        try {
            await this.appwrite.databases.updateDocument(
                this.appwrite.DATABASE_ID,
                this.appwrite.SETTINGS_COLLECTION_ID,
                docId,
                { videoSlideDuration: durationMs }
            );
        } catch {
            // Document doesn't exist yet — create it
            try {
                await this.appwrite.databases.createDocument(
                    this.appwrite.DATABASE_ID,
                    this.appwrite.SETTINGS_COLLECTION_ID,
                    docId,
                    { videoSlideDuration: durationMs }
                );
            } catch (e) {
                console.error('Failed to save per-file settings:', e);
            }
        }
    }

    private async enrichFileSettings() {
        const items = this.mediaItems();
        const results = await Promise.allSettled(
            items.map(item =>
                this.appwrite.databases.getDocument(
                    this.appwrite.DATABASE_ID,
                    this.appwrite.SETTINGS_COLLECTION_ID,
                    `video_${item.id}`
                )
            )
        );

        results.forEach((result, i) => {
            if (result.status === 'fulfilled' && result.value?.['videoSlideDuration']) {
                const fileId = items[i].id;
                const duration = result.value['videoSlideDuration'];
                this.mediaItems.update(currentItems =>
                    currentItems.map(it =>
                        it.id === fileId ? { ...it, videoSlideDuration: duration } : it
                    )
                );
            }
        });
    }

    private async enrichSlideCounts() {
        const items = this.mediaItems();
        for (const item of items) {
            if (item.type === 'pptx' && item.slideCount === undefined) {
                try {
                    const result = await this.scanPptx(item.url);
                    if (result.count || result.videoSlides.length) {
                        this.mediaItems.update(currentItems =>
                            currentItems.map(i =>
                                i.id === item.id
                                    ? { ...i, slideCount: result.count || i.slideCount, videoSlides: result.videoSlides }
                                    : i
                            )
                        );
                    }
                } catch (e) {
                    console.error(`Error enriching slide data for ${item.name}:`, e);
                }
            }
        }
    }

    private async scanPptx(url: string): Promise<{ count: number; videoSlides: number[] }> {
        try {
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            // Decode leniently — PPTX is a ZIP; most content is binary but XML sections are readable
            const content = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buffer));

            // 1. Count slides by looking for slide file references
            const slideRegex = /ppt\/slides\/slide(\d+)\.xml[^s]/g;
            const slideNumbers = new Set<number>();
            let match: RegExpExecArray | null;
            while ((match = slideRegex.exec(content)) !== null) {
                slideNumbers.add(parseInt(match[1], 10));
            }

            // 2. Detect video slides
            // A PPTX ZIP contains ppt/slides/_rels/slideN.xml.rels files.
            // We split the binary text on ZIP local-file-header magic bytes and check each block.
            // Video relationship types include:
            //   http://schemas.openxmlformats.org/officeDocument/2006/relationships/video
            //   http://schemas.openxmlformats.org/officeDocument/2006/relationships/media  (with video extensions)
            const videoSlides = new Set<number>();

            // Strategy 1: find rels headers that reference both a slide number and a video type
            const relsHeaderRegex = /ppt\/slides\/_rels\/slide(\d+)\.xml\.rels/g;
            let relsMatch: RegExpExecArray | null;
            while ((relsMatch = relsHeaderRegex.exec(content)) !== null) {
                const slideNum = parseInt(relsMatch[1], 10);
                // Look at the ~4KB of content following the rels header
                const snippet = content.substring(relsMatch.index, relsMatch.index + 4096);
                if (
                    snippet.toLowerCase().includes('video') ||
                    /\.mp4|\.(wmv|avi|mov|m4v|mkv|webm)/i.test(snippet)
                ) {
                    videoSlides.add(slideNum);
                }
            }

            // Strategy 2: fallback — find video file extensions near slide references
            // Some PPTX layouts write media refs separately from rels
            const videoExtRegex = /ppt\/slides\/_rels\/slide(\d+)/g;
            const videoFileRegex = /\.(mp4|wmv|avi|mov|m4v|mkv|webm)/gi;
            if (videoFileRegex.test(content) && videoSlides.size === 0) {
                // We know there are videos but couldn't map them — mark slide 1 as a hint
                // (conservative: better than missing them)
                console.warn('Video files found in PPTX but could not map to slide numbers — treating slide 1 as video slide');
                videoSlides.add(1);
            }

            return {
                count: slideNumbers.size,
                videoSlides: Array.from(videoSlides).sort((a, b) => a - b)
            };
        } catch (e) {
            return { count: 0, videoSlides: [] };
        }
    }

    getDownloadUrl(fileId: string): string {
        return this.appwrite.storage.getFileDownload(this.BUCKET_ID, fileId).toString();
    }

    getFilePreview(fileId: string, mimeType: string): string {
        if (mimeType.startsWith('image/')) {
            // Get original image without cropping by omitting width/height or setting to 0
            return this.appwrite.storage.getFilePreview(
                this.BUCKET_ID,
                fileId,
                0, // Width 0 = original
                0, // Height 0 = original
                undefined, // Gravity unset
                100 // Quality
            ).toString();
        }
        // For videos and PDFs, use getFileView
        return this.appwrite.storage.getFileView(this.BUCKET_ID, fileId).toString();
    }
}
