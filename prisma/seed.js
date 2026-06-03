const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const bcrypt = require('bcryptjs');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/palm?schema=public',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seed...');
  
  // 1. Create Tenant "gastroshows"
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'gastroshows' },
    update: {},
    create: {
      slug: 'gastroshows',
      name: 'Gastroshows S.L.',
      domain: 'gastroshows.es',
      isActive: true,
    },
  });
  console.log('Tenant gastroshows upserted:', tenant.id);

  // 2. Create Admin user for this tenant
  const passwordHash = await bcrypt.hash('gastroshows123', 10);
  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@gastroshows.es',
      },
    },
    update: {
      passwordHash: passwordHash,
      name: 'Renato García',
      role: 'ADMIN',
    },
    create: {
      tenantId: tenant.id,
      name: 'Renato García',
      email: 'admin@gastroshows.es',
      passwordHash: passwordHash,
      role: 'ADMIN',
    },
  });
  console.log('Admin user upserted:', user.email);

  // 2b. Create second Tech Admin user for this tenant
  const techPasswordHash = await bcrypt.hash('G4STR0SH0WSb4rc3l0n42018', 10);
  const techUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'tech@gastroshows.es',
      },
    },
    update: {
      passwordHash: techPasswordHash,
      name: 'Tech Admin',
      role: 'ADMIN',
    },
    create: {
      tenantId: tenant.id,
      name: 'Tech Admin',
      email: 'tech@gastroshows.es',
      passwordHash: techPasswordHash,
      role: 'ADMIN',
    },
  });
  console.log('Tech admin user upserted:', techUser.email);

  // 3. Create Tenant Settings
  const settings = [
    { key: 'company_name', value: 'Gastroshows S.L.' },
    { key: 'company_email', value: 'info@gastroshows.es' },
    { key: 'company_phone', value: '+34 932 456 789' },
    { key: 'company_timezone', value: 'Europe/Madrid' },
    { key: 'maintenance_mode', value: 'false' },
    { key: 'palm_active_modes', value: JSON.stringify(['RESTAURANTE', 'GESTION_EQUIPO', 'DIRECCION']) },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: {
        tenantId_key: {
          tenantId: tenant.id,
          key: setting.key,
        },
      },
      update: {
        value: setting.value,
      },
      create: {
        tenantId: tenant.id,
        key: setting.key,
        value: setting.value,
      },
    });
  }
  console.log('Settings upserted for tenant:', tenant.id);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
