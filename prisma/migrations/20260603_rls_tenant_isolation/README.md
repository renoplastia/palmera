# RLS tenant isolation — single-DB (Supabase)

Aplicar una sola vez sobre `DATABASE_URL` única:

```bash
npx prisma migrate deploy
# o en local dev
npx prisma db push
psql "$DATABASE_URL" -f prisma/migrations/20260603_rls_tenant_isolation/migration.sql
```

Ver `docs/migracion-multitenant-erp.md` §2.4/§3 para checklist de seguridad (`set_config(..., true)` local a transacción, nunca fallback silencioso).

Para verificar que RLS está activo en todas las tablas:

```sql
select tablename, rowsecurity, forcerowsecurity from pg_tables where schemaname='public';
-- todas las tablas de negocio deben tener rowsecurity = true
```

Test automatizado: `src/__tests__/tenant-isolation.test.ts`
