import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppwriteService } from '../services/appwrite.service';

export const authGuard: CanActivateFn = async (route, state) => {
    const auth = inject(AppwriteService);
    const router = inject(Router);

    // If we don't have a user, try to fetch it first (in case of page refresh)
    if (!auth.user()) {
        await auth.checkSession();
    }

    if (auth.user()) {
        const isAdmin = auth.isAdmin();
        const isUploadRoute = state.url.includes('/upload');

        if (isUploadRoute && !isAdmin) {
            return router.createUrlTree(['/slideshow']);
        }

        return true;
    }

    return router.createUrlTree(['/login']);
};
