import { Injectable, signal, computed } from '@angular/core';
import { Client, Account, Storage, Databases, Models } from 'appwrite';

@Injectable({
    providedIn: 'root'
})
export class AppwriteService {
    client = new Client();
    account: Account;
    storage: Storage;
    databases: Databases;


    user = signal<Models.User<Models.Preferences> | null>(null);
    isAdmin = computed(() => {
        const u = this.user();
        return !!u?.labels?.includes('admin');
    });

    private readonly PROJECT_ID = '699ee7290021c67999ee';
    private readonly ENDPOINT = 'https://sffcc.tnforest.in/v1';

    public readonly DATABASE_ID = 'slideshow';
    public readonly SETTINGS_COLLECTION_ID = 'settings';
    public readonly GLOBAL_SETTINGS_ID = 'global_slideshow_settings';


    constructor() {
        this.client
            .setEndpoint(this.ENDPOINT)
            .setProject(this.PROJECT_ID);

        this.account = new Account(this.client);
        this.storage = new Storage(this.client);
        this.databases = new Databases(this.client);

        this.checkSession();

    }

    async checkSession() {
        try {
            const user = await this.account.get();
            this.user.set(user);
        } catch {
            this.user.set(null);
        }
    }

    async login(email: string, pass: string) {
        await this.account.createEmailPasswordSession(email, pass);
        await this.checkSession();
    }

    async logout() {
        await this.account.deleteSession('current');
        this.user.set(null);
    }
}
