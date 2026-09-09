import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const prismaClientSingleton = () => {
  // Single DB para toda la plataforma (Vercel + Supabase).
  // Usa pooler en modo transaction para serverless — ver Supabase pooling docs.
  // DATABASE_URL debe apuntar al pooler (port 6543) con pgbouncer=true.
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Allow build-time without DB (fallback to mock JSON handled at API layer)
    console.warn("[db] DATABASE_URL not set — Prisma will fail at runtime if DB is required");
  }

  const pool = new pg.Pool({
    connectionString: connectionString || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
    // Serverless (Vercel) optimizado para Supabase pooler transaction mode
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    // Supabase pooler requiere SSL
    ssl: connectionString?.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const db = globalThis.prismaGlobal ?? prismaClientSingleton();

export const prisma = db;
export default db;

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = db;
}

/**
 * Helpers RLS — defensa en profundidad + compatibilidad PgBouncer transaction pooling
 *
 * En Supabase con RLS, cada tabla de negocio tiene policy:
 *   USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
 * El backend debe setear `app.tenant_id` LOCAL a la transacción (true = solo dentro tx),
 * NUNCA global (false), para evitar fuga cross-tenant por reutilización de conexión.
 *
 * Patrón correcto:
 *   await db.$transaction(async (tx) => {
 *     await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
 *     return tx.contact.findMany({ where: { tenantId } }); // doble filtro: RLS + where
 *   });
 *
 * Para llamadas simples sin transacción explícita, también filtrar siempre por tenantId en where.
 */

/** Ejecuta fn dentro de una transacción con RLS context seteado correctamente (local=true). */
export async function withTenantContext<T>(
  tenantId: string,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return await db.$transaction(async (tx) => {
    // set_config con tercer param true = LOCAL to transaction, evita leak entre requests
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    // tx es PrismaClient transaccional; casteo seguro para callback
    return await fn(tx as unknown as PrismaClient);
  });
}

/** Non-transactional helper: just returns tenantId sanitizer + warning. Use with WHERE filters + RLS. */
export function assertTenantId(tenantId: unknown): string {
  if (!tenantId || typeof tenantId !== "string" || tenantId.trim().length === 0) {
    throw new Error("tenantId requerido para operación multi-tenant");
  }
  return tenantId.trim();
}
