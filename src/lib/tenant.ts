import { headers } from "next/headers";
import db from "@/lib/db";

/**
 * Resolución centralizada de tenant_id a partir de subdominio/host.
 * Usado tanto en middleware (edge) como en server components / API routes.
 *
 * Arquitectura single-DB: subdominio → lookup en tabla `Tenant` (DB única) → tenantId.
 * Fallback solo en desarrollo/localhost sin subdominio → no tenant (ruta plataforma).
 */

export async function resolveTenantBySubdomain(subdomain: string) {
  const normalized = subdomain.trim().toLowerCase();
  if (!normalized || normalized === "www") return null;
  try {
    const tenant = await db.tenant.findUnique({ where: { slug: normalized } });
    if (!tenant) return null;
    if (!tenant.isActive) return { tenant, blocked: true as const };
    return { tenant, blocked: false as const };
  } catch {
    // DB no disponible en dev (mock fallback no resuelve tenant real)
    return null;
  }
}

/** Extrae tenantSlug de headers seteados por middleware (x-tenant-slug). */
export async function getTenantSlugFromHeaders(): Promise<string | null> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  return slug && slug.trim().length > 0 ? slug.trim().toLowerCase() : null;
}

/** Extrae tenantId de headers si middleware ya resolvió tenant (x-tenant-id). */
export async function getTenantIdFromHeaders(): Promise<string | null> {
  const h = await headers();
  const id = h.get("x-tenant-id");
  return id && id.trim().length > 0 ? id.trim() : null;
}

/** Legacy alias: mantiene compatibilidad con código que importaba getCurrentTenant */
export async function getCurrentTenant() {
  const slug = await getTenantSlugFromHeaders();
  if (!slug) return null;
  const res = await resolveTenantBySubdomain(slug);
  return res?.tenant ?? null;
}
