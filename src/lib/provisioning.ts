import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * TIPOS DE DESPLIEGUE
 * SaaS: Despliegue en el servidor del proveedor.
 * CLOUD_PRIVATE: Despliegue en la nube del cliente.
 * ON_PREMISE: Despliegue en el servidor local del cliente.
 */
export type DeploymentType = "SAAS" | "CLOUD_PRIVATE" | "ON_PREMISE";

export interface ProvisioningOptions {
  slug: string;
  name: string;
  adminEmail: string;
  adminName: string;
  adminPassword?: string;
  domain?: string;
  timezone?: string;
  modes?: string[];
  deploymentType: DeploymentType;
}

const DEFAULT_MODES = ["VENTAS", "COMUNICACION", "GESTION_PROYECTOS"];

/**
 * ProvisioningService
 * 
 * Este servicio actúa como el orquestador de instancias de Palmera.
 * Su objetivo es abstraer la creación de la infraestructura necesaria para que una empresa 
 * pueda empezar a usar el sistema, independientemente de dónde se aloje la instancia.
 */
export class ProvisioningService {
  /**
   * Orquestador principal de creación de instancia.
   * Dependiendo del deploymentType, ejecutará una estrategia diferente.
   */
  async provision(options: ProvisioningOptions) {
    const { deploymentType } = options;

    switch (deploymentType) {
      case "SAAS":
        return await this.provisionSaaS(options);
      case "CLOUD_PRIVATE":
        // TODO: Implementar conexión remota vía API/SSH para despliegue en nube cliente
        throw new Error("Cloud Private provisioning is not yet implemented.");
      case "ON_PREMISE":
        return await this.generateOnPremiseKit(options);
      default:
        throw new Error(`Unsupported deployment type: ${deploymentType}`);
    }
  }

  /**
   * Estrategia SaaS:
   * Crea la base de datos físicamente en el servidor del proveedor,
   * ejecuta las migraciones y crea los datos iniciales.
   */
  private async provisionSaaS(options: ProvisioningOptions) {
    const adminDatabaseUrl = process.env.PALMERA_PLATFORM_DATABASE_URL || process.env.PLATFORM_DATABASE_URL;
    if (!adminDatabaseUrl) {
      throw new Error("PLATFORM_DATABASE_URL is not defined in environment variables.");
    }

    const databaseName = `palmera_${options.slug.replace(/-/g, "_")}`;
    const databaseUrl = this.buildDatabaseUrl(adminDatabaseUrl, databaseName);

    // 1. Crear la base de datos física
    await this.ensureDatabase(adminDatabaseUrl, databaseName);

    // 2. Ejecutar Prisma db push para crear el esquema
    this.runPrismaDbPush(databaseUrl);

    // 3. Sembrar la instancia con datos iniciales (Tenant, Admin, Settings)
    const seedResult = await this.seedInstance(databaseUrl, options);

    return {
      success: true,
      databaseName,
      databaseUrl,
      ...seedResult,
      deploymentType: "SAAS"
    };
  }

  /**
   * Estrategia On-Premise:
   * No crea la base de datos (ya que el servidor es del cliente).
   * Genera un "Kit de Instalación" que el cliente debe ejecutar en su local.
   */
  private async generateOnPremiseKit(options: ProvisioningOptions) {
    const adminPassword = options.adminPassword || crypto.randomBytes(18).toString("base64url");
    
    // Generamos un objeto de configuración que el cliente usará en su .env local
    const kit = {
      env_vars: {
        PALMERA_INSTANCE_SLUG: options.slug,
        PALMERA_INSTANCE_NAME: options.name,
        PALMERA_INSTANCE_ADMIN_EMAIL: options.adminEmail,
        PALMERA_INSTANCE_ADMIN_NAME: options.adminName,
        PALMERA_INSTANCE_ADMIN_PASSWORD: adminPassword,
        PALMERA_INSTANCE_DOMAIN: options.domain || `${options.slug}.palmera.io`,
        PALMERA_INSTANCE_TIMEZONE: options.timezone || "Europe/Madrid",
        PALMERA_INSTANCE_MODES: (options.modes || DEFAULT_MODES).join(","),
      },
      instructions: "Instalar Docker, copiar el archivo .env y ejecutar 'npm run instance:provision'",
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      kit,
      deploymentType: "ON_PREMISE"
    };
  }

  // --- MÉTODOS PRIVADOS DE APOYO ---

  private buildDatabaseUrl(adminUrl: string, dbName: string) {
    const url = new URL(adminUrl);
    url.pathname = `/${dbName}`;
    return url.toString();
  }

  private async ensureDatabase(adminUrl: string, dbName: string) {
    const pool = new pg.Pool({ connectionString: adminUrl });
    try {
      const exists = await pool.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
      if (exists.rows.length === 0) {
        // Importante: CREATE DATABASE no puede ejecutarse en una transacción
        await pool.query(`CREATE DATABASE "${dbName.replace(/"/g, "")}"`);
      }
    } catch (err) {
      // Preserve AggregateError inner details (pg throws AggregateError with .errors[] and empty .message)
      const anyErr = err as any;
      const inner = Array.isArray(anyErr?.errors)
        ? anyErr.errors.map((e: any) => e?.message || String(e)).filter(Boolean).join(" | ")
        : "";
      const rawMsg = anyErr?.message || "";
      const combined = [rawMsg, inner].filter(Boolean).join(inner && rawMsg ? ": " : "");
      const fallbackMsg = combined || `${anyErr?.code || "AggregateError"} (Postgres no disponible en localhost:5432 - verifica que Postgres esté corriendo)`;
      const wrapped = new Error(`ensureDatabase failed for "${dbName}": ${fallbackMsg}`);
      (wrapped as any).cause = err;
      (wrapped as any).errors = anyErr?.errors;
      (wrapped as any).code = anyErr?.code || "ECONNREFUSED";
      throw wrapped;
    } finally {
      await pool.end();
    }
  }

  private runPrismaDbPush(databaseUrl: string) {
    const result = spawnSync("npx", ["prisma", "db", "push"], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: "utf-8",
    });

    if (result.status !== 0) {
      const stdout = (result.stdout as string) || "";
      const stderr = (result.stderr as string) || "";
      const out = [stdout, stderr].filter(Boolean).join("\n").slice(0, 4000);
      throw new Error(`Prisma db push failed during provisioning (exit ${result.status}).\n${out}`);
    }
  }

  private async seedInstance(databaseUrl: string, options: ProvisioningOptions) {
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(options.adminPassword || crypto.randomBytes(18).toString("base64url"), 10);

      const tenant = await prisma.tenant.upsert({
        where: { slug: options.slug },
        update: { name: options.name, domain: options.domain },
        create: { slug: options.slug, name: options.name, domain: options.domain, isActive: true },
      });

      await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: options.adminEmail } },
        update: { name: options.adminName, passwordHash },
        create: { tenantId: tenant.id, name: options.adminName, email: options.adminEmail, passwordHash, role: "ADMIN" },
      });

      const settings = [
        ["company_name", options.name],
        ["company_email", options.adminEmail],
        ["company_timezone", options.timezone || "Europe/Madrid"],
        ["maintenance_mode", "false"],
        ["palmera_active_modes", JSON.stringify(options.modes || DEFAULT_MODES)],
      ];

      for (const [key, value] of settings) {
        await prisma.setting.upsert({
          where: { tenantId_key: { tenantId: tenant.id, key } },
          update: { value },
          create: { tenantId: tenant.id, key, value },
        });
      }

      return { tenantId: tenant.id };
    } finally {
      await prisma.$disconnect();
      await pool.end();
    }
  }
}
