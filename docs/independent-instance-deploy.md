# Despliegue independiente por instancia

Cada cliente debe desplegarse con una base de datos propia. El subdominio identifica la instancia en la interfaz, pero la privacidad real se garantiza con una `DATABASE_URL` distinta por despliegue.

## Principio de gobierno

- Una instancia de Palmera = una base de datos PostgreSQL independiente.
- `gastroshows.palmera.io` y `sport2live.palmera.io` no deben compartir `DATABASE_URL`.
- La transferencia entre instancias queda denegada por defecto.
- Cualquier intercambio debe pasar por API y por un permiso explícito en `ApiTransferGrant`.

## Crear una nueva instancia

Configura una URL administrativa con permiso para crear bases:

```bash
export PALMERA_PLATFORM_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
```

Ejecuta el aprovisionador:

```bash
npm run instance:provision -- \
  --slug gastroshows \
  --name "Gastroshows S.L." \
  --domain gastroshows.palmera.io \
  --admin-name "Admin Gastroshows" \
  --admin-email admin@gastroshows.es \
  --admin-password "cambia-esta-clave"
```

El script crea una base `palmera_<slug>`, aplica el esquema Prisma y crea el tenant, el usuario admin y los ajustes base dentro de esa base.

## Variables por despliegue

Cada despliegue debe tener su propia `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://.../palmera_gastroshows?schema=public"
NEXTAUTH_URL="https://gastroshows.palmera.io"
NEXTAUTH_SECRET="..."
PALMERA_PLATFORM_URL="https://superadmin.palmera.io"
```

Para `sport2live`:

```bash
DATABASE_URL="postgresql://.../palmera_sport2live?schema=public"
NEXTAUTH_URL="https://sport2live.palmera.io"
NEXTAUTH_SECRET="..."
```

## Transferencia por API

Antes de exportar o importar datos desde otra instancia, la API debe llamar a `assertExplicitApiTransferGrant`. Sin un registro activo en `ApiTransferGrant`, la operación se bloquea y queda registrada en `ApiTransferLog`.
