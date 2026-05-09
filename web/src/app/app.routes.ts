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
      total: 5,
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
      total: 5,
      title: 'Servicios Iniciales',
      description: 'Define duracion, precio y modalidad de pago por servicio.',
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
      total: 5,
      title: 'Horario y Disponibilidad',
      description: 'Define apertura, intervalos y limites por franja.',
      fields: ['Zona horaria', 'Apertura', 'Intervalo de reserva'],
      prev: '/onboarding/services',
      next: '/onboarding/payments',
    },
  },
  {
    path: 'onboarding/payments',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/pages/onboarding-step.component').then((m) => m.OnboardingStepComponent),
    data: {
      step: 4,
      total: 5,
      title: 'Pagos y Depositos',
      description: 'Configura reserva gratis o deposito obligatorio.',
      fields: ['Modo', 'Porcentaje deposito', 'Politica de reembolso'],
      prev: '/onboarding/schedule',
      next: '/onboarding/review',
    },
  },
  {
    path: 'onboarding/review',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/pages/onboarding-step.component').then((m) => m.OnboardingStepComponent),
    data: {
      step: 5,
      total: 5,
      title: 'Revision Final',
      description: 'Valida tu configuracion antes de activar el negocio.',
      fields: ['Confirmacion legal', 'Facturacion', 'Publicacion'],
      prev: '/onboarding/payments',
      next: '/app/dashboard',
    },
  },
  {
    path: 'app/dashboard',
    canActivate: [authGuard, onboardingCompleteGuard],
    loadComponent: () =>
      import('./features/app-shell/pages/workspace-page.component').then((m) => m.WorkspacePageComponent),
    data: {
      title: 'Dashboard',
      description: 'Vision general de turnos, ingresos y ocupacion.',
      highlights: ['Turnos del dia', 'Ingresos', 'Retencion'],
    },
  },
  {
    path: 'app/calendar',
    canActivate: [authGuard, onboardingCompleteGuard],
    loadComponent: () =>
      import('./features/app-shell/pages/workspace-page.component').then((m) => m.WorkspacePageComponent),
    data: {
      title: 'Calendario Maestro',
      description: 'Gestiona agenda, conflictos y disponibilidad del staff.',
      highlights: ['Vista diaria', 'Bloques ocupados', 'Arrastrar y soltar'],
    },
  },
  {
    path: 'app/appointments',
    canActivate: [authGuard, onboardingCompleteGuard],
    loadComponent: () =>
      import('./features/app-shell/pages/workspace-page.component').then((m) => m.WorkspacePageComponent),
    data: {
      title: 'Turnos',
      description: 'Listado de reservas con filtros y estados.',
      highlights: ['Confirmados', 'Pendientes', 'Cancelados'],
    },
  },
  {
    path: 'app/services',
    canActivate: [authGuard, onboardingCompleteGuard],
    loadComponent: () =>
      import('./features/app-shell/pages/workspace-page.component').then((m) => m.WorkspacePageComponent),
    data: {
      title: 'Servicios',
      description: 'Administra catalogo, duraciones, precios e imagenes.',
      highlights: ['Catalogo', 'Depositos', 'Politicas'],
    },
  },
  {
    path: 'app/staff',
    canActivate: [authGuard, onboardingCompleteGuard],
    loadComponent: () =>
      import('./features/app-shell/pages/workspace-page.component').then((m) => m.WorkspacePageComponent),
    data: {
      title: 'Staff',
      description: 'Equipo, especialidades, horarios y dias libres.',
      highlights: ['Empleados', 'Especialidades', 'Ausencias'],
    },
  },
  {
    path: 'app/customers',
    canActivate: [authGuard, onboardingCompleteGuard],
    loadComponent: () =>
      import('./features/app-shell/pages/workspace-page.component').then((m) => m.WorkspacePageComponent),
    data: {
      title: 'Clientes',
      description: 'Base de clientes, historial y no-shows.',
      highlights: ['Historial', 'Etiquetas', 'Reincidencia'],
    },
  },
  {
    path: 'app/analytics',
    canActivate: [authGuard, onboardingCompleteGuard],
    loadComponent: () =>
      import('./features/app-shell/pages/workspace-page.component').then((m) => m.WorkspacePageComponent),
    data: {
      title: 'Analiticas',
      description: 'Rendimiento de agenda, ingresos y retencion.',
      highlights: ['Ocupacion', 'Revenue', 'Cancellations'],
    },
  },
  {
    path: 'app/subscription',
    canActivate: [authGuard, onboardingCompleteGuard],
    loadComponent: () =>
      import('./features/app-shell/pages/workspace-page.component').then((m) => m.WorkspacePageComponent),
    data: {
      title: 'Suscripcion',
      description: 'Planes, facturas y estado de trial.',
      highlights: ['Plan actual', 'Facturacion', 'Proxima renovacion'],
    },
  },
  {
    path: 'app/settings/business',
    canActivate: [authGuard, onboardingCompleteGuard],
    loadComponent: () =>
      import('./features/app-shell/pages/workspace-page.component').then((m) => m.WorkspacePageComponent),
    data: {
      title: 'Configuracion del Negocio',
      description: 'Datos legales, contacto, direccion y marca.',
      highlights: ['Identidad', 'Contacto', 'Moneda y zona horaria'],
    },
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
      next: '../staff',
    },
  },
  {
    path: ':tenantSlug/book/staff',
    canActivate: [tenantGuard],
    loadComponent: () =>
      import('./features/booking/pages/booking-page.component').then((m) => m.BookingPageComponent),
    data: {
      step: 2,
      title: 'Elige Profesional',
      subtitle: 'Selecciona el especialista disponible.',
      cta: 'Siguiente',
      prev: '../service',
      next: '../date-time',
    },
  },
  {
    path: ':tenantSlug/book/date-time',
    canActivate: [tenantGuard],
    loadComponent: () =>
      import('./features/booking/pages/booking-page.component').then((m) => m.BookingPageComponent),
    data: {
      step: 3,
      title: 'Fecha y Horario',
      subtitle: 'Escoge una franja horaria disponible.',
      prev: '../staff',
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
      step: 4,
      title: 'Confirmacion',
      subtitle: 'Verifica tus datos antes de finalizar.',
      prev: '../date-time',
      cta: 'Ir a pago',
      next: '../payment',
    },
  },
  {
    path: ':tenantSlug/book/payment',
    canActivate: [tenantGuard],
    loadComponent: () =>
      import('./features/booking/pages/booking-page.component').then((m) => m.BookingPageComponent),
    data: {
      step: 5,
      title: 'Deposito',
      subtitle: 'Completa el pago del deposito si aplica.',
      prev: '../confirm',
      cta: 'Finalizar reserva',
      next: '../success/ABC123',
    },
  },
  {
    path: ':tenantSlug/book/success/:bookingCode',
    canActivate: [tenantGuard],
    loadComponent: () =>
      import('./features/booking/pages/booking-page.component').then((m) => m.BookingPageComponent),
    data: {
      step: 5,
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
