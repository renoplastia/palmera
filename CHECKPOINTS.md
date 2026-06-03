# CHECKPOINTS — Evaluación del estado final (Next.js & TypeScript)

> En sistemas de ingeniería de arnés, se evalúa la corrección objetiva del resultado final. Estos son los checkpoints que el revisor (`.claude/agents/reviewer.md`) y el programador usan para validar el proyecto.

## C1 — El arnés está completo

- [ ] Existen los archivos base del arnés: `AGENTS.md`, `init.sh`, `feature_list.json`, `progress/current.md`.
- [ ] Existen los documentos de soporte: `docs/architecture.md`, `docs/conventions.md`, `docs/verification.md`.
- [ ] El script de entorno `./init.sh` termina con código de salida 0 (OK).

## C2 — El estado de progreso es coherente

- [ ] Como máximo hay una sola feature en estado `in_progress` en `feature_list.json`.
- [ ] Toda feature marcada como `done` cumple con su scope y criterios de `acceptance`.
- [ ] El archivo `progress/current.md` describe únicamente la sesión activa, sin basura acumulada.

## C3 — Calidad del Código y Tipado (TypeScript)

- [ ] El código compila al 100% sin errores de tipado. La ejecución de `npx tsc --noEmit` es verde.
- [ ] No existen dependencias huérfanas en `package.json`.
- [ ] No hay `console.log()` huérfanos de debug en producción, ni TODOs huérfanos sin autor/contexto.
- [ ] Se respetan las convenciones de Next.js App Router (rutas e importaciones limpias).

## C4 — Base de Datos e Integridad del Esquema (Prisma)

- [ ] El esquema de Prisma (`prisma/schema.prisma`) contiene los modelos del Core sin lógica específica de restaurante.
- [ ] El comando `npx prisma generate` se ejecuta correctamente y genera el PrismaClient.
- [ ] Si se tocan modelos, las migraciones o el push a la DB se han validado y no rompen tablas existentes.

## C5 — Cierre Correcto de la Sesión

- [ ] El repositorio está libre de archivos temporales huérfanos o caché no ignorada.
- [ ] El archivo `progress/history.md` se actualiza agregando la bitácora de la última sesión finalizada.
- [ ] La última feature completada se marca como `done` de manera coherente en `feature_list.json`.
