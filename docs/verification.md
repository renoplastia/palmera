# Verificación — Demostración de Calidad

> Regla de oro en Palm: **No se asume que funciona, se verifica ejecutablemente.**

## Niveles de Verificación del Core

### Nivel 1 — Comprobación Estricta de Tipos (TypeScript)
Todo código o feature escrita debe compilar limpiamente bajo las reglas estrictas de TypeScript configuradas en `tsconfig.json`.

Comando:
```bash
npx tsc --noEmit --skipLibCheck
```

### Nivel 2 — Verificación de Compilación de Next.js
Antes de marcar cualquier feature como completada, se debe validar que el empaquetador y el compilador de Next.js construyan la aplicación para producción sin advertencias críticas o errores.

Comando:
```bash
npm run build
```

### Nivel 3 — Integridad del Cliente Prisma y Migraciones
Si una tarea modifica el esquema de base de datos (`prisma/schema.prisma`), se debe comprobar que el cliente Prisma de TypeScript se regenere perfectamente.

Comando:
```bash
npx prisma generate
```

---

## Anti-patrones de Verificación (Evitar)

- ❌ **"En mi local compila, no sé por qué falla en Vercel."** → Esto ocurre por omitir la validación de tipos (`tsc`) o no probar una construcción limpia de producción (`npm run build`).
- ❌ **Ignorar Warnings de TypeScript con comentarios `// @ts-ignore`**. → Esto debilita la resiliencia del core y provoca fallos silenciosos en producción.
- ❌ **Marcar una feature como `done` en `feature_list.json` con errores de compilación activos**.

---

## Verificación Final del Entorno

Antes de finalizar la sesión de desarrollo, ejecuta el arnés de verificación:

```bash
./init.sh
```

El script `./init.sh` consolidará todos estos niveles (comprobación de dependencias, tipado y construcción base) e imprimirá un reporte consolidado. Si el script termina en rojo, la feature **no** se considera finalizada y se debe reportar el estado como `blocked` o resolver el error.
