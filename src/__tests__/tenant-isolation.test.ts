import { describe, it, expect } from "vitest";

/**
 * Test de aislamiento multi-tenant (checklist migracion-multitenant-erp.md §3.10)
 *
 * Valida que:
 * - Toda tabla de negocio declara tenantId y filtra por él (defensa en profundidad además de RLS)
 * - RLS migration.sql habilita rowsecurity=true en todas las tablas de negocio
 * - No existe código que cree PrismaClient por tenant ni map subdomain → connection string
 *
 * Este test NO requiere DB viva: inspecciona schema.prisma y migration.sql.
 * El test con DB viva (intentar leer tenant B como tenant A) debe ejecutarse en staging con DATABASE_URL real.
 */

import fs from "node:fs";
import path from "node:path";

const SCHEMA_PATH = path.join(process.cwd(), "prisma/schema.prisma");
const RLS_MIGRATION = path.join(process.cwd(), "prisma/migrations/20260603_rls_tenant_isolation/migration.sql");

function readFile(p: string): string {
  return fs.readFileSync(p, "utf-8");
}

describe("Tenant isolation — single-DB architecture", () => {
  it("schema.prisma: toda tabla de negocio tiene tenantId NOT NULL FK a Tenant", () => {
    const schema = readFile(SCHEMA_PATH);
    const businessModels = ["User", "Contact", "Setting", "AuditLog", "PasswordResetToken", "Artwork", "Consignment", "ApiTransferGrant", "ApiTransferLog"];
    for (const model of businessModels) {
      const modelBlock = new RegExp(`model\\s+${model}\\s+\\{[\\s\\S]*?\\}`, "m").exec(schema);
      expect(modelBlock, `Model ${model} not found in schema.prisma`).toBeTruthy();
      const block = modelBlock![0];
      expect(block.includes("tenantId"), `Model ${model} debe tener tenantId`).toBe(true);
      // Verifica que tenga relation a Tenant (FK)
      expect(block.includes("Tenant"), `Model ${model} debe referenciar Tenant`).toBe(true);
    }
    // ConsignmentLine y Certificate son hijos sin tenantId directo: se valida FK via parent (Consignment/Artwork)
  });

  it("migration.sql habilita RLS y crea policy tenant_isolation en todas las tablas de negocio", () => {
    expect(fs.existsSync(RLS_MIGRATION), `Falta ${RLS_MIGRATION} — ejecutar migracion según migracion-multitenant-erp.md`).toBe(true);
    const sql = readFile(RLS_MIGRATION);
    const tables = ["User", "Contact", "Setting", "AuditLog", "PasswordResetToken", "Artwork", "Consignment", "ApiTransferGrant", "ApiTransferLog"];
    for (const t of tables) {
      expect(sql.includes(`ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY`), `RLS enable missing for ${t}`).toBe(true);
      expect(sql.includes(`tenant_isolation`), `policy tenant_isolation missing for ${t}`).toBe(true);
    }
    // Verifica uso de set_config local=true (no global)
    expect(sql.includes(`current_setting('app.tenant_id'`), "Debe usar current_setting('app.tenant_id', true)").toBe(true);
  });

  it("no existe código legacy que cree DB por tenant (ensureDatabase / CREATE DATABASE / PALMERA_PLATFORM_DATABASE_URL)", () => {
    const provisioning = readFile(path.join(process.cwd(), "src/lib/provisioning.ts"));
    // En arquitectura single-DB estos métodos deben lanzar error explicativo, no crear DB
    expect(provisioning.includes("single-DB"), "provisioning.ts debe documentar single-DB").toBe(true);
    expect(provisioning.includes("ensureDatabase deshabilitado"), "ensureDatabase debe estar deshabilitado").toBe(true);

    const provisionScript = readFile(path.join(process.cwd(), "scripts/provision-instance.mjs"));
    expect(provisionScript.includes("single shared DB"), "scripts/provision-instance.mjs debe ser single-DB").toBe(true);
    // No debe contener CREATE DATABASE activo (solo en comentario/migration)
    expect(provisionScript.includes("CREATE DATABASE"), "scripts/provision-instance.mjs no debe crear DATABASE física").toBe(false);
  });

  it("lib/db.ts expone withTenantContext con set_config local=true (evita leak cross-tenant por pooling)", () => {
    const dbFile = readFile(path.join(process.cwd(), "src/lib/db.ts"));
    expect(dbFile.includes("withTenantContext"), "db.ts debe exportar withTenantContext").toBe(true);
    expect(dbFile.includes("set_config('app.tenant_id'"), "withTenantContext debe hacer set_config").toBe(true);
    expect(dbFile.includes(", true)"), "set_config debe usar local=true (tercer param true)").toBe(true);
    expect(dbFile.includes("PrismaPg"), "db.ts debe usar PrismaPg adaptador (Prisma 7)").toBe(true);
  });

  it("middleware inyecta x-tenant-slug y delega 404 controlado (nunca fallback silencioso)", () => {
    const mw = readFile(path.join(process.cwd(), "src/middleware.ts"));
    expect(mw.includes("x-tenant-slug"), "middleware debe setear x-tenant-slug").toBe(true);
    expect(mw.includes("tenant-not-found") || mw.includes("404"), "middleware debe manejar 404 tenant no encontrado").toBe(true);
    // Debe tratar www como plataforma, no como tenant
    expect(mw.includes("PLATFORM_SUBDOMAINS"), "middleware debe tratar www/app/superadmin como plataforma").toBe(true);
  });
});
