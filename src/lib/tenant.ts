import { headers } from "next/headers";
import db from "@/lib/db";

/**
 * Retrieves the current tenant based on the 'x-tenant-slug' header injected by the middleware.
 * Works inside Server Components, Route Handlers, and Server Actions.
 */
export async function getCurrentTenant() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");

  if (!tenantSlug) {
    return null;
  }

  const tenant = await db.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  return tenant;
}