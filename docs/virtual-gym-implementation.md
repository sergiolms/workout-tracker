# Gimnasio virtual: primera versión

Entrada: **Perfil → Mi gimnasio**. El juego ocupa su propia pantalla (`?view=gym`), con «Volver a la app». No añade controles, modales ni notificaciones a Hoy. Se carga de forma diferida, incluidos sus estilos.

## Qué incluye

- Sala isométrica original en SVG, con arrastre directo con ratón o tacto, ajuste a casillas, colisiones y alternativa de teclado. Al soltar en una posición válida se guarda; el giro se guarda directamente. Al seleccionar un objeto se muestran Girar, Guardar y Vender con su precio; tocar fuera cierra la selección sin deshacer lo guardado. El equipo gratuito y los premios no se pueden vender. No utiliza imágenes de las referencias cinematográficas.
- Habitación de 6×6 y equipo básico gratuito; ampliaciones a 8×8 y 10×10 y una sala anexa de 6×6.
- Tienda de 26 objetos, acabados, conjuntos de ropa y ampliaciones. La navegación del juego solo tiene Tienda e Inventario, con un menú compacto para las categorías. Las compras se confirman en un modal, sin previsualizar ni colocar objetos en la sala. El inventario solo muestra objetos guardados; los colocados y los expuestos reaparecen al guardarlos.
- XP, niveles sin un límite de cinco etapas y logros escalonados de fuerza, actividad, movilidad y semanas activas. Cinco piezas gratuitas se desbloquean por hitos.
- Devolución por el precio pagado, una sola vez. Las ampliaciones son permanentes.
- Controles y superficies adaptados a claro/oscuro; acciones de 44 px, foco visible y alternativa al puntero para colocar objetos.

Las [reglas económicas](economy/README.md) y `lib/gym/economy.json` son la referencia vigente. Los documentos iniciales del brazo se conservan como archivo de diseño, no como especificación actual.

Los logros y la trayectoria están en **Perfil → Logros**, separados del juego. La sección muestra primero las formas repetibles de obtener créditos (actividad diaria y bonus semanal), sus importes, progreso y límites. Los hitos muestran la condición y el trofeo que desbloquean una sola vez. El saldo del gimnasio abre también esta explicación. El panel de materiales de la sala permite previsualizar y guardar suelo y paredes juntos, sin una doble navegación de pestañas. Los acabados incluyen juntas de ladrillo, panelado de madera, tablas y goma con textura vectorial.

La vitrina de trofeos cuesta 120 créditos y admite cuatro premios. Cada trofeo tiene un diseño propio: mancuerna, rayo, flor, calendario y estrella. Se pueden exponer desde el inventario y retirar seleccionando la vitrina. Al guardar o vender la vitrina, los trofeos vuelven al inventario sin perderse.

El personaje tiene cuerpo, cuatro peinados, cuatro tonos de piel y ropa inicial gratuita. Tres conjuntos cuestan 30, 60 y 90 créditos. La apariencia se guarda en el estado privado del gimnasio; los desplazamientos y animaciones transitorios no generan escrituras. Pasea por rutas de casillas libres; esterillas y plataformas son transitables y ajustan la altura de los pies. Usa esterillas para estirar, mancuernas para curl, banco para press sentado, poleas para tirones, bicicleta para pedalear, cinta para correr y dispensador para beber. La secuencia separa acercamiento, uso y salida; las máquinas solo se ocupan durante su interacción, no se atraviesan al caminar. Objetos inaccesibles se saltan. Se puede detener desde su configuración y respeta movimiento reducido. No concede XP ni modifica entrenamientos.

## Persistencia y concurrencia

`lib/gym/engine.ts` calcula contribuciones, XP, saldo y logros sin efectos. `GymState` conserva recibos por origen, compras con su precio y versión de catálogo, distribución y acabados. No existe un segundo contador de saldo sincronizable. Catálogo y dibujos son recursos comunes del bundle, sin copias por usuario en Firebase.

El progreso se inicializa automáticamente al abrir el diario, sin activación manual. La operación es idempotente y conserva el estado existente. La activación toma los identificadores existentes como línea de base. El historial anterior no acuña moneda ni XP, pero sí cuenta para hitos y trofeos. Las cuentas existentes reciben un reconocimiento automático e idempotente: se carga el historial completo, incluidos meses no visibles, se deduplican orígenes y se guarda la trayectoria reconocida sin cambiar los entrenamientos, las compras ni el saldo. Los registros antiguos de ejercicios sin resumen de sesión se agrupan por sesión o día/rutina. La fuerza usa el número de series previstas congelado al comenzar; las aproximaciones no puntúan. Cada origen conserva el máximo reconocido y su día original, incluso si después se corrige o elimina. Las importaciones quedan excluidas. La zona horaria queda fijada al activar.

El diario sigue usando React Query como caché observable. El guardado normal calcula las contribuciones de forma optimista y las confirma junto con el registro de origen. Solo los comandos de gimnasio pueden cambiar compras, devoluciones, distribución o importaciones:

- **Local:** una transacción de IndexedDB lee, valida y escribe. BroadcastChannel comunica el resultado a las otras pestañas.
- **Cuenta:** el repositorio paginado vuelve a leer la revisión de Firebase y confirma el saldo y la compra en una transacción con comparación de revisión. Los conflictos se reintentan y vuelven a comprobar el saldo. El identificador estable de compra hace idempotente un reintento.
- **Sin conexión con cuenta:** se puede consultar el gimnasio; las modificaciones requieren conexión. El modo local funciona sin conexión.

Los documentos privados siguen bajo las reglas de propietario ya existentes. No se ha desplegado ninguna regla ni escrito en cuentas reales durante estas pruebas. Esta economía es cosmética y se basa en actividad autorregistrada; no pretende demostrar que el entrenamiento ocurrió.

## Copias y cambio de modo

La copia del diario incluye el gimnasio. Importarlo es una elección explícita: sustituye el actual, no suma saldos. Guarda una copia anterior recuperable desde Perfil → Logros. El diario local original se conserva al conectar una cuenta. Importar registros no genera una segunda recompensa.

## Verificación

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run build-storybook
node scripts/simulate-gym-economy.mjs
```

`lib/gym.test.mjs` cubre elegibilidad, deduplicación, correcciones, topes, importaciones, colisiones y compras concurrentes. Las pruebas del repositorio paginado usan un backend transaccional en memoria; no son una ejecución del emulador oficial de Firestore. La prueba de integración `tests/virtual-gym.test.mjs` monta la app real, abre el gimnasio desde Perfil, obtiene créditos mediante IndexedDB, compra, vuelve, recarga y devuelve.

Storybook → **Juego / Gimnasio virtual** ofrece primer acceso, equipado, ampliado y sólo lectura. Todos esos ejemplos usan datos ficticios en memoria.

## Fuera de esta entrega

No incluye rankings, dinero real, multijugador, visitas a gimnasios de otros usuarios, temporadas ni una economía servida por un backend antifraude. No existe una recompensa física ni una representación de cambios corporales. La variedad y el ritmo de compras necesitarán ajustes basados en uso real; la simulación solo comprueba las reglas matemáticas.
