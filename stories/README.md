# Catálogo de componentes

Iniciar: `npm run storybook` → http://127.0.0.1:6006/.

- **Guía / Interacciones y formularios** muestra los patrones compartidos de entrenamiento, actividad y perfil, con opciones secundarias plegadas.
- **Guía / Componentes en acción** reúne los controles reales en una sesión ficticia.
- **Guía / Revisión de temas / Claro y Oscuro** fija cada tema y reúne botones, campos válidos/erróneos/deshabilitados, checkbox, selector, switch, peso, molestias, estados de sincronización, menús anidados, popover, tooltip, modal, series, medidas, calendario y navegación. Los paneles flotantes usan el mismo contexto de tema que la app.
- **Entrenamiento / Índice de ejercicios** permite recorrer el catálogo con una rueda vertical de cinco posiciones, mediante deslizamiento o teclado.
- **Entrenamiento / Experiencia de sesión** permite probar deshacer, saltar el descanso, los datos fantasma, el selector inferior y el resumen antes de finalizar.
- Las historias individuales permiten cambiar valores y estados desde **Controls**.
- El selector **Tema** de la barra superior alterna claro y oscuro.
- RIR y molestias admiten teclado; los controles conservan sus etiquetas y estados accesibles.
- Los gestos de navegación necesitan un dispositivo táctil. Los controles, los modales, los bordes del navegador y las zonas con scroll horizontal quedan excluidos del gesto.
- Las animaciones respetan la preferencia de movimiento reducido del sistema.

Las historias usan estado en memoria; no importan Firebase ni persisten datos de la cuenta. El decorador activa únicamente la respuesta visual. Los estilos y componentes se comparten con la aplicación.

`npm run build-storybook` genera `storybook-static/` para revisar o alojar el catálogo por separado. Este directorio está ignorado y no se incluye en GitHub Pages de la app.

Comprobaciones: `npm test`, `npm run typecheck`, `npm run lint` y `npm run build-storybook`.

`lib/theme-contrast.test.mjs` comprueba el contraste de los tokens reales de ambos temas: texto principal/secundario, acciones y selecciones, avisos/errores, botones y bordes de campos. No sustituye la revisión visual de disposición, foco y contenido real.
