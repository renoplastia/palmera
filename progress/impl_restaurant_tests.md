Implementación de tests para ServiceCommandCenter

Archivos creados/modificados:
- src/modules/restaurant_ops/__tests__/ServiceCommandCenter.test.tsx (nuevo)
- package.json (modificado: añadido script "test" y devDependencies para vitest y testing-library)

Cómo ejecutar las pruebas:
- npm install
- npm test

Notas de verificación:
- Se añadieron dependencias de dev para vitest y testing libraries. Si en el entorno CI no está permitido instalar paquetes, ejecutar localmente.
- Se usa import relativo en el test para evitar problemas con alias de tsconfig.

Resultados esperados:
- npx tsc --noEmit debe pasar sin errores.
- npm test ejecutará vitest en entorno jsdom y las pruebas declaradas deberían pasar.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
