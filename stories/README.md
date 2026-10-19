# Catálogo de componentes

Iniciar: `npm run storybook` → http://127.0.0.1:6006/.

- **Guía / Componentes en acción** reúne los controles reales en una sesión ficticia.
- **Entrenamiento / Experiencia de sesión** permite probar deshacer, saltar el descanso, los datos fantasma, el selector inferior y el resumen antes de finalizar.
- Las historias individuales permiten cambiar valores y estados desde **Controls**.
- El selector **Tema** de la barra superior alterna claro y oscuro.
- RIR y molestias admiten teclado; los controles conservan sus etiquetas y estados accesibles.
- Los gestos de navegación necesitan un dispositivo táctil. Los controles, los modales, los bordes del navegador y las zonas con scroll horizontal quedan excluidos del gesto.
- Las animaciones respetan la preferencia de movimiento reducido del sistema.

Las historias usan estado en memoria; no importan Firebase ni persisten datos de la cuenta. El decorador activa únicamente la respuesta visual. Los estilos y componentes se comparten con la aplicación.

`npm run build-storybook` genera `storybook-static/` para revisar o alojar el catálogo por separado. Este directorio está ignorado y no se incluye en GitHub Pages de la app.

Comprobaciones: `npm test`, `npm run typecheck`, `npm run lint` y `npm run build-storybook`.
