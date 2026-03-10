import { Injectable, signal, inject } from '@angular/core';
import { AppwriteService } from './appwrite.service';

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    private appwrite = inject(AppwriteService);

    // Default: 30 seconds per slide, 2 minutes for video slides
    slideDuration = signal<number>(30000);
    videoSlideDuration = signal<number>(120000);
    isSaving = signal<boolean>(false);

    constructor() {
        this.loadSettings();
    }

    async loadSettings() {
        try {
            const document = await this.appwrite.databases.getDocument(
                this.appwrite.DATABASE_ID,
                this.appwrite.SETTINGS_COLLECTION_ID,
                this.appwrite.GLOBAL_SETTINGS_ID
            );

            if (document['slideDuration']) {
                this.slideDuration.set(document['slideDuration']);
            }
            if (document['videoSlideDuration']) {
                this.videoSlideDuration.set(document['videoSlideDuration']);
            }
        } catch (e: any) {
            console.warn('Settings not found or database error, using defaults:', e.message);
        }
    }

    private async saveToAppwrite(data: Record<string, number>) {
        if (!this.appwrite.isAdmin()) return;
        this.isSaving.set(true);
        try {
            await this.appwrite.databases.updateDocument(
                this.appwrite.DATABASE_ID,
                this.appwrite.SETTINGS_COLLECTION_ID,
                this.appwrite.GLOBAL_SETTINGS_ID,
                data
            );
        } catch {
            // Document may not exist yet — create it
            try {
                await this.appwrite.databases.createDocument(
                    this.appwrite.DATABASE_ID,
                    this.appwrite.SETTINGS_COLLECTION_ID,
                    this.appwrite.GLOBAL_SETTINGS_ID,
                    {
                        slideDuration: this.slideDuration(),
                        videoSlideDuration: this.videoSlideDuration(),
                        ...data
                    }
                );
            } catch (createError) {
                console.error('Failed to create settings document:', createError);
            }
        } finally {
            this.isSaving.set(false);
        }
    }

    async updateDuration(seconds: number) {
        const ms = seconds * 1000;
        this.slideDuration.set(ms);
        await this.saveToAppwrite({ slideDuration: ms });
    }

    async updateVideoDuration(seconds: number) {
        const ms = seconds * 1000;
        this.videoSlideDuration.set(ms);
        await this.saveToAppwrite({ videoSlideDuration: ms });
    }

    getDurationInSeconds() {
        return this.slideDuration() / 1000;
    }

    getVideoDurationInSeconds() {
        return this.videoSlideDuration() / 1000;
    }
}
