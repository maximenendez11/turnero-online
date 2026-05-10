import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_WEEKDAYS = [1, 2, 3, 4, 5, 6] as const;
const DEMO_START_MIN = 9 * 60;
const DEMO_END_MIN = 19 * 60;

async function seedAdmin(): Promise<string | null> {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'Admin123!';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync(adminPassword, 10);
    const created = await prisma.user.create({
      data: {
        email: adminEmail,
        password: passwordHash,
        role: 'ADMIN',
      },
      select: { id: true },
    });
    return created.id;
  }
  return existingAdmin.id;
}

async function seedOpeningWindows(businessId: string) {
  await prisma.businessOpeningWindow.deleteMany({ where: { businessId } });
  for (const weekday of DEMO_WEEKDAYS) {
    await prisma.businessOpeningWindow.create({
      data: {
        businessId,
        weekday,
        startMin: DEMO_START_MIN,
        endMin: DEMO_END_MIN,
        sortOrder: 0,
      },
    });
  }
}

async function seedDemoBusiness(adminUserId: string | null) {
  const slug = 'peluqueria-demo';

  const business = await prisma.business.upsert({
    where: { slug },
    update: {
      name: 'Peluqueria Demo',
      description: 'Peluqueria premium para pruebas de reservas.',
      address: 'Sarmiento 581, Pellegrini',
      timezone: 'America/Argentina/Buenos_Aires',
      bookingIntervalMin: 30,
      status: 'active',
      ...(adminUserId ? { ownerUserId: adminUserId } : {}),
    },
    create: {
      slug,
      name: 'Peluqueria Demo',
      description: 'Peluqueria premium para pruebas de reservas.',
      address: 'Sarmiento 581, Pellegrini',
      timezone: 'America/Argentina/Buenos_Aires',
      bookingIntervalMin: 30,
      status: 'active',
      ownerUserId: adminUserId,
    },
  });

  await seedOpeningWindows(business.id);

  await prisma.businessService.upsert({
    where: { id: `${business.id}-service-1` },
    update: {
      name: 'Corte Ejecutivo',
      description: 'Corte de precision con asesoramiento de estilo.',
      durationMin: 45,
      price: 45,
      isActive: true,
    },
    create: {
      id: `${business.id}-service-1`,
      businessId: business.id,
      name: 'Corte Ejecutivo',
      description: 'Corte de precision con asesoramiento de estilo.',
      durationMin: 45,
      price: 45,
      isActive: true,
    },
  });

  await prisma.businessService.upsert({
    where: { id: `${business.id}-service-2` },
    update: {
      name: 'The Full Luxe',
      description: 'Corte premium + barba + mascarilla de carbon.',
      durationMin: 75,
      price: 65,
      isActive: true,
    },
    create: {
      id: `${business.id}-service-2`,
      businessId: business.id,
      name: 'The Full Luxe',
      description: 'Corte premium + barba + mascarilla de carbon.',
      durationMin: 75,
      price: 65,
      isActive: true,
    },
  });

  await prisma.businessService.upsert({
    where: { id: `${business.id}-service-3` },
    update: {
      name: 'Esculpido de Barba',
      description: 'Perfilado y diseno de barba con navaja clasica.',
      durationMin: 30,
      price: 30,
      isActive: true,
    },
    create: {
      id: `${business.id}-service-3`,
      businessId: business.id,
      name: 'Esculpido de Barba',
      description: 'Perfilado y diseno de barba con navaja clasica.',
      durationMin: 30,
      price: 30,
      isActive: true,
    },
  });

  console.log(`Seed ready. Booking URL: /${slug}/book/service`);
}

async function main() {
  const adminId = await seedAdmin();
  await seedDemoBusiness(adminId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
