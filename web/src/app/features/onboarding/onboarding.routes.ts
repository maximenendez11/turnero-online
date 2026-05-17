import { Route } from '@angular/router';

export const ONBOARDING_CREATE_BASE = '/c/create-business';

const loadStep = () =>
  import('./pages/onboarding-step.component').then((m) => m.OnboardingStepComponent);

/** Pasos del asistente dentro del panel de cliente (`/c/...`). */
export const customerOnboardingRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'profile' },
  {
    path: 'profile',
    loadComponent: loadStep,
    data: {
      stepId: 'business-profile',
      step: 1,
      total: 4,
      title: 'Perfil del negocio',
      description: 'Nombre, categoría y datos principales de tu comercio.',
      prev: null,
      next: `${ONBOARDING_CREATE_BASE}/services`,
    },
  },
  {
    path: 'services',
    loadComponent: loadStep,
    data: {
      stepId: 'services',
      step: 2,
      total: 4,
      title: 'Primer servicio',
      description: 'Definí duración y precio del servicio que vas a ofrecer.',
      prev: `${ONBOARDING_CREATE_BASE}/profile`,
      next: `${ONBOARDING_CREATE_BASE}/schedule`,
    },
  },
  {
    path: 'schedule',
    loadComponent: loadStep,
    data: {
      stepId: 'schedule',
      step: 3,
      total: 4,
      title: 'Disponibilidad',
      description: 'Zona horaria e intervalo entre turnos.',
      prev: `${ONBOARDING_CREATE_BASE}/services`,
      next: `${ONBOARDING_CREATE_BASE}/review`,
    },
  },
  {
    path: 'review',
    loadComponent: loadStep,
    data: {
      stepId: 'review',
      step: 4,
      total: 4,
      title: 'Revisión',
      description: 'Confirmá los datos antes de publicar tu negocio.',
      prev: `${ONBOARDING_CREATE_BASE}/schedule`,
      next: '/app/dashboard',
      finish: true,
    },
  },
];

/** Redirecciones desde rutas legacy fullscreen. */
export const legacyOnboardingRedirects: Route[] = [
  { path: 'onboarding/business-profile', redirectTo: `${ONBOARDING_CREATE_BASE}/profile`, pathMatch: 'full' },
  { path: 'onboarding/services', redirectTo: `${ONBOARDING_CREATE_BASE}/services`, pathMatch: 'full' },
  { path: 'onboarding/schedule', redirectTo: `${ONBOARDING_CREATE_BASE}/schedule`, pathMatch: 'full' },
  { path: 'onboarding/review', redirectTo: `${ONBOARDING_CREATE_BASE}/review`, pathMatch: 'full' },
];
