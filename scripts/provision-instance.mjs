import "dotenv/config";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import process from "node:process";
import bcrypt from "bcryptjs";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DEFAULT_MODES = ["VENTAS", "COMUNICACION", "GESTION_PROYECTOS"];

function parseArgs() {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = process.argv[index + 1];
    if (!next || next.startsWith("--")) {
      args.set(key, "true");
      continue;
    }
    args.set(key, next);
    index += 1;
  }
  return args;
}

function required(value, label) {
  if (!value || String(value).trim().length === 0) {
    throw new Error(`Missing required value: ${label}`);
  }
  return String(value).trim();
}

function normalizeSlug(value) {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (slug.length < 3) {
    throw new Error("Instance slug must contain at least 3 valid characters.");
  }
  return slug;
}

function databaseNameForSlug(slug) {
  return `palmera_${slug.replace(/-/g, "_")}`;
}

function quoteIdentifier(identifier) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe database identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function databaseExistsResult(rows) {
  return rows.length > 0;
}

function buildDatabaseUrl(adminDatabaseUrl, databaseName) {
  const url = new URL(adminDatabaseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function ensureDatabase(adminDatabaseUrl, databaseName) {
  const adminPool = new pg.Pool({ connectionString: adminDatabaseUrl });
  try {
    const exists = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
    if (databaseExistsResult(exists.rows)) {
      console.log(`Database already exists: ${databaseName}`);
      return;
    }
    await adminPool.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    console.log(`Database created: ${databaseName}`);
  } finally {
    await adminPool.end();
  }
}

function runPrismaDbPush(databaseUrl) {
  const result = spawnSync("npx", ["prisma", "db", "push"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error("Prisma db push failed for the new instance database.");
  }
}

async function seedInstance(databaseUrl, instance) {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await bcrypt.hash(instance.adminPassword, 10);

    await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.upsert({
        where: { slug: instance.slug },
        update: {
          name: instance.name,
          domain: instance.domain,
          isActive: true,
        },
        create: {
          slug: instance.slug,
          name: instance.name,
          domain: instance.domain,
          isActive: true,
        },
      });

      await tx.user.upsert({
        where: {
          tenantId_email: {
            tenantId: tenant.id,
            email: instance.adminEmail,
          },
        },
        update: {
          name: instance.adminName,
          passwordHash,
          role: "ADMIN",
        },
        create: {
          tenantId: tenant.id,
          name: instance.adminName,
          email: instance.adminEmail,
          passwordHash,
          role: "ADMIN",
        },
      });

      const settings = [
        ["company_name", instance.name],
        ["company_email", instance.adminEmail],
        ["company_timezone", instance.timezone],
        ["maintenance_mode", "false"],
        ["palmera_active_modes", JSON.stringify(instance.modes)],
        ["data_transfer_policy", JSON.stringify({ default: "deny", requiresExplicitApiGrant: true })],
      ];

      for (const [key, value] of settings) {
        await tx.setting.upsert({
          where: { tenantId_key: { tenantId: tenant.id, key } },
          update: { value },
          create: { tenantId: tenant.id, key, value },
        });
      }
    });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main() {
  const args = parseArgs();
  const slug = normalizeSlug(required(args.get("slug") || process.env.PALMERA_INSTANCE_SLUG, "--slug or PALMERA_INSTANCE_SLUG"));
  const name = required(args.get("name") || process.env.PALMERA_INSTANCE_NAME, "--name or PALMERA_INSTANCE_NAME");
  const adminEmail = required(args.get("admin-email") || process.env.PALMERA_INSTANCE_ADMIN_EMAIL, "--admin-email or PALMERA_INSTANCE_ADMIN_EMAIL").toLowerCase();
  const adminName = required(args.get("admin-name") || process.env.PALMERA_INSTANCE_ADMIN_NAME, "--admin-name or PALMERA_INSTANCE_ADMIN_NAME");
  const adminPassword = args.get("admin-password") || process.env.PALMERA_INSTANCE_ADMIN_PASSWORD || crypto.randomBytes(18).toString("base64url");
  const domain = args.get("domain") || process.env.PALMERA_INSTANCE_DOMAIN || `${slug}.palmera.io`;
  const timezone = args.get("timezone") || process.env.PALMERA_INSTANCE_TIMEZONE || "Europe/Madrid";
  const modes = (args.get("modes") || process.env.PALMERA_INSTANCE_MODES || DEFAULT_MODES.join(","))
    .split(",")
    .map((mode) => mode.trim())
    .filter(Boolean);

  const adminDatabaseUrl = required(process.env.PALMERA_PLATFORM_DATABASE_URL || process.env.PLATFORM_DATABASE_URL, "PALMERA_PLATFORM_DATABASE_URL");
  const databaseName = args.get("database-name") || process.env.PALMERA_INSTANCE_DATABASE_NAME || databaseNameForSlug(slug);
  const databaseUrl = args.get("database-url") || process.env.PALMERA_INSTANCE_DATABASE_URL || buildDatabaseUrl(adminDatabaseUrl, databaseName);

  await ensureDatabase(adminDatabaseUrl, databaseName);
  runPrismaDbPush(databaseUrl);
  await seedInstance(databaseUrl, { slug, name, domain, adminEmail, adminName, adminPassword, timezone, modes });

  console.log("");
  console.log("Instance provisioned successfully.");
  console.log(`Slug: ${slug}`);
  console.log(`Domain: ${domain}`);
  console.log(`Database: ${databaseName}`);
  console.log(`DATABASE_URL=${databaseUrl}`);
  if (!args.get("admin-password") && !process.env.PALMERA_INSTANCE_ADMIN_PASSWORD) {
    console.log(`Generated admin password: ${adminPassword}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
