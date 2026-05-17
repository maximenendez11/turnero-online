import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { redirectIfAuthenticatedGuard } from './core/guards/redirect-if-authenticated.guard';
import { onboardingCreateGuard } from './core/guards/onboarding-create.guard';
import { workspaceBusinessGuard } from './core/guards/workspace-business.guard';
import { tenantGuard } from './core/guards/tenant.guard';
import { adminBusinessCanDeactivate } from './features/workspace/pages/admin-business-page.deactivate';
import {
  customerOnboardingRoutes,
  legacyOnboardingRedirects,
} from './features/onboarding/onboarding.routes';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./features/marketing/pages/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'auth/login',
    canActivate: [redirectIfAuthenticatedGuard],
    loadComponent: () => import('./features/auth/pages/auth-page.component').then((m) => m.AuthPageComponent),
    data: {
      title: 'Iniciar sesión',
      subtitle: 'Ingresa para gestionar tus reservas.',
      submitLabel: 'Continuar con email',
      secondaryLabel: 'Olvidé mi contraseña',
      secondaryHref: '/auth/forgot-password',
      intent: 'customer',
    },
  },
  {
    path: 'auth/register',
    canActivate: [redirectIfAuthenticatedGuard],
    loadComponent: () => import('./features/auth/pages/auth-page.component').then((m) => m.AuthPageComponent),
    data: {
      title: 'Crear cuenta',
      subtitle: 'Registrate para publicar tu negocio o reservar turnos en minutos.',
      submitLabel: 'Crear cuenta con email',
      secondaryLabel: 'Ya tengo cuenta',
      secondaryHref: '/auth/login',
      intent: 'customer',
    },
  },
  {
    path: 'auth/forgot-password',
    canActivate: [redirectIfAuthenticatedGuard],
    loadComponent: () => import('./features/auth/pages/auth-page.component').then((m) => m.AuthPageComponent),
    data: {
      title: 'Recuperar Acceso',
      subtitle: 'Te enviaremos instrucciones por correo.',
      submitLabel: 'Enviar enlace',
      secondaryLabel: 'Volver al login',
      secondaryHref: '/auth/login',
    },
  },
  ...legacyOnboardingRedirects,
  {
    path: 'buscar',
    loadComponent: () =>
      import('./features/booking/pages/business-search.component').then((m) => m.BusinessSearchComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard, workspaceBusinessGuard],
    loadComponent: () =>
      import('./features/workspace/layout/workspace-layout.component').then((m) => m.WorkspaceLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'settings/business', pathMatch: 'full', redirectTo: 'business' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/workspace/pages/admin-dashboard-page.component').then(
            (m) => m.AdminDashboardPageComponent,
          ),
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/workspace/pages/admin-bookings-page.component').then((m) => m.AdminBookingsPageComponent),
      },
      {
        path: 'business',
        loadComponent: () =>
          import('./features/workspace/pages/admin-business-page.component').then((m) => m.AdminBusinessPageComponent),
        canDeactivate: [adminBusinessCanDeactivate],
      },
      {
        path: 'staff',
        loadComponent: () =>
          import('./features/workspace/pages/admin-staff-page.component').then((m) => m.AdminStaffPageComponent),
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('@app/features/workspace/pages/admin-customers-page.component').then(
            (m) => m.AdminCustomersPageComponent,
          ),
      },
    ],
  },
  {
    path: 'c/auth/login',
    redirectTo: '/auth/login?intent=customer',
    pathMatch: 'full',
  },
  {
    path: 'c/auth/register',
    redirectTo: '/auth/register?intent=customer',
    pathMatch: 'full',
  },
  {
    path: 'c',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workspace/layout/workspace-layout.component').then((m) => m.WorkspaceLayoutComponent),
    data: { workspaceNavMode: 'customer' },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'appointments' },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/customer/pages/customer-page.component').then((m) => m.CustomerPageComponent),
        data: {
          title: 'Mis turnos',
          subtitle: 'Turnos vinculados al email de tu cuenta.',
        },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/customer/pages/customer-page.component').then((m) => m.CustomerPageComponent),
        data: {
          title: 'Mi perfil',
          subtitle: 'Datos de tu cuenta y preferencias.',
        },
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/booking/pages/business-search.component').then((m) => m.BusinessSearchComponent),
        data: { embeddedInWorkspace: true },
      },
      {
        path: 'create-business',
        canActivate: [onboardingCreateGuard],
        children: customerOnboardingRoutes,
      },
    ],
  },
  {
    path: ':tenantSlug',
    canActivate: [tenantGuard],
    loadComponent: () =>
      import('./features/booking/pages/business-landing.component').then((m) => m.BusinessLandingComponent),
  },
  {
    path: ':tenantSlug/book/service',
    canActivate: [tenantGuard],
    loadComponent: () =>
      import('./features/booking/pages/booking-page.component').then((m) => m.BookingPageComponent),
    data: {
      step: 1,
      title: 'Elige tu Servicio',
      subtitle: 'Selecciona el servicio ideal para tu reserva.',
      cta: 'Continuar',
      next: '../date-time',
    },
  },
  {
    path: ':tenantSlug/book/date-time',
    canActivate: [tenantGuard],
    loadComponent: () =>
      import('./features/booking/pages/booking-page.component').then((m) => m.BookingPageComponent),
    data: {
      step: 2,
      title: 'Fecha y Horario',
      subtitle: 'Escoge una franja horaria disponible.',
      prev: '../service',
      cta: 'Confirmar datos',
      next: '../confirm',
    },
  },
  {
    path: ':tenantSlug/book/confirm',
    canActivate: [tenantGuard],
    loadComponent: () =>
      import('./features/booking/pages/booking-page.component').then((m) => m.BookingPageComponent),
    data: {
      step: 3,
      title: 'Confirmacion',
      subtitle: 'Verifica tus datos antes de finalizar.',
      prev: '../date-time',
      cta: 'Reservar',
      next: '../success/ABC123',
    },
  },
  {
    path: ':tenantSlug/book/success/:bookingCode',
    canActivate: [tenantGuard],
    loadComponent: () =>
      import('./features/booking/pages/booking-page.component').then((m) => m.BookingPageComponent),
    data: {
      step: 4,
      title: 'Reserva Confirmada',
      subtitle: 'Tu turno fue creado correctamente.',
      prev: '../confirm',
    },
  },
  {
    path: ':tenantSlug/manage/:bookingCode',
    canActivate: [tenantGuard],
    loadComponent: () =>
      import('./features/customer/pages/customer-page.component').then((m) => m.CustomerPageComponent),
    data: {
      title: 'Gestion de Reserva',
      subtitle: 'Cancela o reprograma tu turno desde esta vista.',
    },
  },
  {
    path: '**',
    redirectTo: '/',
  },
];
