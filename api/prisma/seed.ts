import { DepositMode, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAdmin() {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'Admin123!';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: adminPassword,
        role: 'ADMIN',
      },
    });
  }
}

async function seedDemoBusiness() {
  const slug = 'peluqueria-demo';

  const business = await prisma.business.upsert({
    where: { slug },
    update: {
      name: 'Peluqueria Demo',
      description: 'Peluqueria premium para pruebas de reservas.',
      address: 'Sarmiento 581, Pellegrini',
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
      openingHours: 'Lunes a Sabado 09:00 a 19:00',
      bookingIntervalMin: 30,
      maxAppointmentsPerSlot: 1,
      whatsapp: '+5491134567890',
      instagram: '@peluqueriademo',
      status: 'active',
    },
    create: {
      slug,
      name: 'Peluqueria Demo',
      description: 'Peluqueria premium para pruebas de reservas.',
      address: 'Sarmiento 581, Pellegrini',
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
      openingHours: 'Lunes a Sabado 09:00 a 19:00',
      bookingIntervalMin: 30,
      maxAppointmentsPerSlot: 1,
      whatsapp: '+5491134567890',
      instagram: '@peluqueriademo',
      status: 'active',
    },
  });

  const service1 = await prisma.businessService.upsert({
    where: { id: `${business.id}-service-1` },
    update: {
      name: 'Corte Ejecutivo',
      description: 'Corte de precision con asesoramiento de estilo.',
      durationMin: 45,
      price: 45,
      depositMode: DepositMode.none,
      depositValue: 0,
      isActive: true,
    },
    create: {
      id: `${business.id}-service-1`,
      businessId: business.id,
      name: 'Corte Ejecutivo',
      description: 'Corte de precision con asesoramiento de estilo.',
      durationMin: 45,
      price: 45,
      depositMode: DepositMode.none,
      depositValue: 0,
      isActive: true,
    },
  });

  const service2 = await prisma.businessService.upsert({
    where: { id: `${business.id}-service-2` },
    update: {
      name: 'The Full Luxe',
      description: 'Corte premium + barba + mascarilla de carbon.',
      durationMin: 75,
      price: 65,
      depositMode: DepositMode.none,
      depositValue: 0,
      isActive: true,
    },
    create: {
      id: `${business.id}-service-2`,
      businessId: business.id,
      name: 'The Full Luxe',
      description: 'Corte premium + barba + mascarilla de carbon.',
      durationMin: 75,
      price: 65,
      depositMode: DepositMode.none,
      depositValue: 0,
      isActive: true,
    },
  });

  const service3 = await prisma.businessService.upsert({
    where: { id: `${business.id}-service-3` },
    update: {
      name: 'Esculpido de Barba',
      description: 'Perfilado y diseno de barba con navaja clasica.',
      durationMin: 30,
      price: 30,
      depositMode: DepositMode.none,
      depositValue: 0,
      isActive: true,
    },
    create: {
      id: `${business.id}-service-3`,
      businessId: business.id,
      name: 'Esculpido de Barba',
      description: 'Perfilado y diseno de barba con navaja clasica.',
      durationMin: 30,
      price: 30,
      depositMode: DepositMode.none,
      depositValue: 0,
      isActive: true,
    },
  });

  const staff = await prisma.staffMember.upsert({
    where: { id: `${business.id}-staff-1` },
    update: {
      fullName: 'Lucas Gardon',
      bio: 'Barbero senior especializado en fades y corte clasico.',
      isActive: true,
    },
    create: {
      id: `${business.id}-staff-1`,
      businessId: business.id,
      fullName: 'Lucas Gardon',
      bio: 'Barbero senior especializado en fades y corte clasico.',
      isActive: true,
    },
  });

  await prisma.staffService.upsert({
    where: {
      staffId_serviceId: {
        staffId: staff.id,
        serviceId: service1.id,
      },
    },
    update: {},
    create: {
      staffId: staff.id,
      serviceId: service1.id,
    },
  });

  await prisma.staffService.upsert({
    where: {
      staffId_serviceId: {
        staffId: staff.id,
        serviceId: service2.id,
      },
    },
    update: {},
    create: {
      staffId: staff.id,
      serviceId: service2.id,
    },
  });

  await prisma.staffService.upsert({
    where: {
      staffId_serviceId: {
        staffId: staff.id,
        serviceId: service3.id,
      },
    },
    update: {},
    create: {
      staffId: staff.id,
      serviceId: service3.id,
    },
  });

  console.log(`Seed ready. Booking URL: /${slug}/book/service`);
}

async function main() {
  await seedAdmin();
  await seedDemoBusiness();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
