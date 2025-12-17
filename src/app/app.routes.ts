import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { DefaultLayoutComponent } from './components/common/default-layout/default-layout.component';
import { LoginGuard } from './guards/login-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login-page/login-page').then(
        (m) => m.LoginPage
      ),
      canActivate: [LoginGuard],
    data: {
      title: 'Login',
      icon: 'icon-office',
      nav: false,
    },
  },
  {
    path: '',
    component: DefaultLayoutComponent,
    children: [
      {
        path: 'overview',
        loadComponent: () =>
          import(
            './components/overview-dashboard/overview-dashboard'
          ).then((m) => m.OverviewDashboard),
        canActivate: [AuthGuard],
        data: {
          title: 'Overview',
          icon: 'overview',
          nav: true,
        },
      },
      {
        path: 'crowd-entries',
        loadComponent: () =>
          import(
            './components/crowd-entries/crowd-entries'
          ).then((m) => m.CrowdEntries),
        canActivate: [AuthGuard],
        data: {
          title: 'Crowd Entries',
          icon: 'crowd',
          nav: true,
        },
      },
    ],
  },

];
