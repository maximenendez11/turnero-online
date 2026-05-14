/** Placeholder: ajustar montos y listas cuando definan comercial. */
export type PricingItemIcon = 'check' | 'plus';

export type PricingTierData = {
  name: string;
  baseArs: number;
  featured?: boolean;
  items: { icon: PricingItemIcon; text: string }[];
};

export const LANDING_PRICING_TIERS: PricingTierData[] = [
  {
    name: 'Básico',
    baseArs: 13_453,
    items: [
      { icon: 'check', text: 'Reservas online ilimitadas' },
      { icon: 'check', text: 'Recordatorios por email' },
      { icon: 'check', text: 'Recordatorios por WhatsApp' },
      { icon: 'check', text: 'Novedades de profesionales' },
      { icon: 'check', text: 'Términos y condiciones configurables' },
      { icon: 'check', text: 'Cupones de descuento' },
      { icon: 'check', text: 'Comentarios en turnos' },
      { icon: 'check', text: 'Asistencia técnica' },
    ],
  },
  {
    name: 'Profesional',
    baseArs: 22_495,
    items: [
      { icon: 'check', text: 'Lo incluido en BÁSICO, más:' },
      { icon: 'plus', text: 'Carga de cobros en turnos' },
      { icon: 'plus', text: 'Archivos adjuntos en turnos' },
      { icon: 'plus', text: 'Rotación de sucursal' },
      { icon: 'plus', text: 'Servicios recurrentes' },
      { icon: 'plus', text: 'Servicios por cupos' },
      { icon: 'plus', text: 'Agenda dinámica' },
      { icon: 'plus', text: 'Posibilidad de exigir señas' },
      { icon: 'plus', text: 'WhatsApp Marketing' },
    ],
  },
  {
    name: 'Empresa',
    baseArs: 29_982,
    featured: true,
    items: [
      { icon: 'check', text: 'Lo incluido en PROFESIONAL, más:' },
      { icon: 'plus', text: 'Rol administrativo disponible' },
      { icon: 'plus', text: 'Rol cajero disponible' },
      { icon: 'plus', text: 'Descargar clientes/pacientes en Excel' },
      { icon: 'plus', text: 'Funcionalidad de caja' },
      { icon: 'plus', text: 'Informes de ventas y caja' },
      { icon: 'plus', text: 'Liquidación de sueldos' },
      { icon: 'plus', text: 'Gestión de stock de productos' },
    ],
  },
];
