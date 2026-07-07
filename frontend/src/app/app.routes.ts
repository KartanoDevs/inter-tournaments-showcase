import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { environment } from '../environments/environment';

const fullRoutes: Routes = [
    // Ruta independiente del Shell — layout fullscreen sin header ni navbar
    {
        path: 'scoreboard',
        loadComponent: () => import( './features/scoreboard/scoreboard' ).then( m => m.Scoreboard )
    },
    {
        path: '',
        loadComponent: () => import( './shared/layout/shell/shell' ).then( m => m.Shell ),
        children: [
            { path: '', redirectTo: 'torneos', pathMatch: 'full' },
            // { path: '', redirectTo: 'home', pathMatch: 'full' },
            // { path: 'home', loadComponent: () => import( './features/home/home' ).then( m => m.Home ) },
            // { path: 'roster', loadComponent: () => import( './features/roster/roster' ).then( m => m.Roster ) },
            // { path: 'contact', loadComponent: () => import( './features/contact/contact' ).then( m => m.Contact ) },
            { path: 'torneos', loadComponent: () => import( './features/tournaments/tournaments' ).then( m => m.Tournaments ) },
            { path: 'login', loadComponent: () => import( './features/auth/login/login' ).then( m => m.Login ) },
            {
                path: 'admin',
                loadComponent: () => import( './features/admin/admin-dashboard/admin-dashboard' ).then( m => m.AdminDashboardComponent ),
                canActivate: [ adminGuard ]
            }
        ]
    },
    { path: '**', redirectTo: 'home' }
];

const scoreboardOnlyRoutes: Routes = [
    {
        path: 'scoreboard',
        loadComponent: () => import( './features/scoreboard/scoreboard' ).then( m => m.Scoreboard )
    },
    { path: '**', redirectTo: 'scoreboard' }
];

export const routes: Routes = environment.scoreboardOnly
    ? scoreboardOnlyRoutes
    : fullRoutes;

