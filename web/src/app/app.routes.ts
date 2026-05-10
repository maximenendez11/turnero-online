import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { onboardingCompleteGuard } from './core/guards/onboarding-complete.guard';
import { tenantGuard } from './core/guards/tenant.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./features/marketing/pages/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/pages/auth-page.component').then((m) => m.AuthPageComponent),
    data: {
      title: 'Iniciar Sesion',
      subtitle: 'Accede a tu workspace empresarial.',
      submitLabel: 'Ingresar',
      secondaryLabel: 'Olvide mi contrasena',
      secondaryHref: '/auth/forgot-password',
    },
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/pages/auth-page.component').then((m) => m.AuthPageComponent),
    data: {
      title: 'Crear Cuenta',
      subtitle: 'Comienza tu prueba y crea tu negocio de reservas.',
      submitLabel: 'Crear cuenta',
      secondaryLabel: 'Ya tengo cuenta',
      secondaryHref: '/auth/login',
    },
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () => import('./features/auth/pages/auth-page.component').then((m) => m.AuthPageComponent),
    data: {
      title: 'Recuperar Acceso',
      subtitle: 'Te enviaremos instrucciones por correo.',
      submitLabel: 'Enviar enlace',
      secondaryLabel: 'Volver al login',
      secondaryHref: '/auth/login',
    },
  },
  {
    path: 'onboarding/business-profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/pages/onboarding-step.component').then((m) => m.OnboardingStepComponent),
    data: {
      step: 1,
      total: 4,
      title: 'Perfil del Negocio',
      description: 'Configura identidad y datos principales de tu negocio.',
      fields: ['Nombre', 'Categoria', 'Descripcion'],
      next: '/onboarding/services',
    },
  },
  {
    path: 'onboarding/services',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/pages/onboarding-step.component').then((m) => m.OnboardingStepComponent),
    data: {
      step: 2,
      total: 4,
      title: 'Servicios Iniciales',
      description: 'Define duracion y precio de tu primer servicio.',
      fields: ['Servicio', 'Duracion', 'Precio'],
      prev: '/onboarding/business-profile',
      next: '/onboarding/schedule',
    },
  },
  {
    path: 'onboarding/schedule',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/pages/onboarding-step.component').then((m) => m.OnboardingStepComponent),
    data: {
      step: 3,
      total: 4,
      title: 'Disponibilidad',
      description: 'Zona horaria e intervalo entre turnos ofrecidos.',
      fields: ['Zona horaria', 'Intervalo de reserva'],
      prev: '/onboarding/services',
      next: '/onboarding/review',
    },
  },
  {
    path: 'onboarding/review',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/pages/onboarding-step.component').then((m) => m.OnboardingStepComponent),
    data: {
      step: 4,
      total: 4,
      title: 'Revision Final',
      description: 'Valida tu configuracion antes de activar el negocio.',
      fields: ['Resumen', 'Publicacion'],
      prev: '/onboarding/schedule',
      next: '/app/appointments',
    },
  },
  {
    path: 'app',
    canActivate: [authGuard, onboardingCompleteGuard],
    loadComponent: () =>
      import('./features/workspace/layout/workspace-layout.component').then((m) => m.WorkspaceLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'appointments' },
      { path: 'dashboard', pathMatch: 'full', redirectTo: 'appointments' },
      { path: 'settings/business', pathMatch: 'full', redirectTo: 'business' },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/workspace/pages/admin-bookings-page.component').then((m) => m.AdminBookingsPageComponent),
      },
      {
        path: 'business',
        loadComponent: () =>
          import('./features/workspace/pages/admin-business-page.component').then((m) => m.AdminBusinessPageComponent),
      },
    ],
  },
  {
    path: 'c/auth/login',
    loadComponent: () => import('./features/auth/pages/auth-page.component').then((m) => m.AuthPageComponent),
    data: {
      title: 'Login Cliente',
      subtitle: 'Gestiona tus reservas y recordatorios.',
      submitLabel: 'Entrar',
      secondaryLabel: 'No tengo cuenta',
      secondaryHref: '/c/auth/register',
    },
  },
  {
    path: 'c/auth/register',
    loadComponent: () => import('./features/auth/pages/auth-page.component').then((m) => m.AuthPageComponent),
    data: {
      title: 'Registro Cliente',
      subtitle: 'Crea tu perfil para reservar en segundos.',
      submitLabel: 'Crear perfil',
      secondaryLabel: 'Ya tengo cuenta',
      secondaryHref: '/c/auth/login',
    },
  },
  {
    path: 'c/search',
    loadComponent: () =>
      import('./features/booking/pages/business-search.component').then((m) => m.BusinessSearchComponent),
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
    path: 'c/appointments',
    loadComponent: () =>
      import('./features/customer/pages/customer-page.component').then((m) => m.CustomerPageComponent),
    data: {
      title: 'Mis Turnos',
      subtitle: 'Historial y proximas reservas del cliente.',
    },
  },
  {
    path: 'c/profile',
    loadComponent: () =>
      import('./features/customer/pages/customer-page.component').then((m) => m.CustomerPageComponent),
    data: {
      title: 'Mi Perfil',
      subtitle: 'Datos personales y preferencias de reserva.',
    },
  },
  {
    path: '**',
    redirectTo: '/',
  },
];
