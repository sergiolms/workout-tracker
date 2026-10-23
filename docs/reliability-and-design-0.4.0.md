# Revisión 0.4.0

23 de octubre de 2026. Seguimiento de la auditoría 0.3.0 y de los cambios pedidos después. La dirección visual está en [DESIGN.md](../DESIGN.md).

## Estado de publicación

Las reglas se han compilado y desplegado en `workout-db-7dda8`. Una pestaña nueva confirma el guardado en Firebase y conserva las 24 semanas, 8 rutinas y 1 entrenamiento de la cuenta comprobada. La prueba con dos pestañas ha propagado el cambio de Sistema a Oscuro sin recargar; después se restaura Sistema y se comprueba la confirmación en ambas.

La prueba real solo ha cambiado temporalmente una preferencia de tema; no se han creado ni editado registros de entrenamiento. Las pruebas de conflictos y escrituras de entrenamiento se han ejecutado con un proyecto de emulador `demo-workout-tracker` y datos ficticios. El documento original se conserva como copia de recuperación y los registros de Firebase son la fuente activa.

Secuencia de activación: reglas desplegadas y conversión comprobada, prueba reversible entre dos pestañas, push directo a main por indicación del propietario y comprobación de Pages. La PR se cierra sin fusionar. El cambio de caché a `base-shell-v4` activa el aviso de actualización de la webapp. Los clientes anteriores deben actualizarse: después de activar los registros no se permiten escrituras sobre la copia original. Un rollback debe conservar el formato por registros; volver a un cliente que escribe el documento original no constituye una recuperación válida de los datos nuevos.

## Cambios sobre los hallazgos

| Hallazgo | Implementación y límite |
| --- | --- |
| Toda la cuenta en un documento | `CloudRepository` separa rutinas, tramos, entrenamientos, ejercicios realizados, actividades, medidas, preferencias y marcas. Cada registro se guarda independientemente; el plan semanal se deriva de los tramos. |
| Conversión sin pérdida de datos | Cada dispositivo copia en su propia colección temporal. Se comprueban todos los valores y el número de registros, y una transacción comprueba que el origen no cambió antes de activar el destino. El original no se borra. Reintentar una cuenta ya convertida solo lee el destino activo. |
| Dispositivos que se pisan | La transacción compara cada campo con su base confirmada. Cambios independientes se combinan; modificar el mismo campo de dos formas distintas requiere elegir entre las dos versiones. Las eliminaciones dejan una marca para impedir que una copia atrasada resucite datos. |
| Información atrasada en otro dispositivo | Un listener de la cabecera dispara consultas incrementales por secuencia. Las lecturas atrasadas no sustituyen una revisión ya confirmada. Un fallo del listener no se anuncia como sincronizado hasta contactar de nuevo con el servidor. |
| Caché como fuente de verdad | El arranque descarga Firebase antes de permitir cambios. La caché no se sube. Solo una cola explícita de ediciones pendientes, con su base confirmada, puede recuperarse y combinarse al recargar. Si no se puede leer esa cola, no se borra ni se anuncia guardado. |
| Límite de tamaño e historial | Lectura remota por páginas de 100 con cursores; escrituras de registros modificados y actualizaciones incrementales. Se limita el tamaño de cada registro. La primera conexión aún reúne todo el historial para mantener las estadísticas y el calendario actuales: la carga inicial diferida por fechas sigue pendiente. |
| Repetir una rutina el mismo día | Cada instancia tiene un ID independiente. Una sesión en curso se puede reanudar; finalizarla permite empezar otra. Las series activas no generan un entrenamiento terminado al recargar. El plan distingue Empezar, Continuar y Repetir. |
| Catálogo pesado y rueda confusa | Filas virtualizadas con medición real y conservación de la posición. La guía lateral ocupa el alto disponible y usa marcas y letras estables, como la referencia del chat. Incluye `#`, salta letras vacías y tiene límites. No filtra ni añade inercia. |
| Una carga por ejercicio | La carga por serie convive con registros antiguos de carga uniforme. El editor de Hoy y el del historial comparten la misma tabla. Se puede aplicar una carga a todas las series. El incremento manual de carga sigue siendo de 0,5 kg. |
| Aproximaciones y superseries | Las aproximaciones se configuran y registran aparte; no cuentan como series de trabajo ni disparan recomendaciones de progresión. Los ejercicios contiguos se pueden enlazar, alternar por serie y descansar al cerrar la ronda. |
| Recomendación sin explicación | Se muestra el motivo y se respeta el RIR previsto. No se usa una aproximación o una serie sin realizar como resultado. Una sesión con cargas distintas no produce una subida general automática. El salto sugerido es configurable. Son reglas visibles sobre el registro, no una predicción ni una marca personal inventada. |
| Importación | Copias JSON de Base con validación de estructura, fechas, números, tamaños e identificadores. La vista previa diferencia registros nuevos, iguales y distintos. Los existentes se conservan por defecto. Sustituir el plan o valores distintos requiere elegirlo; una selección sin cambios no se puede importar. No se importan sesiones en curso ni formatos de otras aplicaciones sin una conversión explícita. |
| Temporizador | Wake Lock mientras el navegador lo permita, liberación al detenerlo y nueva petición al volver a una pestaña visible. El contador sigue usando un plazo real. No se promete ejecución en segundo plano ni se ha probado un iPhone físico. |

## Diseño revisado

Se sustituye la paleta verde que había elegido el agente por marfil/grafito y naranja quemado. El menú conserva los cinco destinos y el botón central solicitados. Las pestañas pasan a un subrayado; rutinas, perfil e historiales usan filas y separadores. El panel de semana concentra el contraste y la cifra útil. Los valores de las series se editan directamente en una tabla compacta, sin cuatro filas de botones por serie.

La tabla conserva los números completos a 320 px; los menús de cada serie permiten cambiar su tipo y quitarla. La carga base conserva los botones grandes. Los detalles menos frecuentes se despliegan y los diálogos heredan el tema.

Contrastes calculados: texto secundario claro/fondo 5,53:1; blanco/acción 5,95:1; secundario oscuro/control 6,33:1; texto/acción oscura 8,37:1. Bordes de controles: 3,74:1 en claro y 3,06:1 en oscuro, por encima del umbral de contraste no textual.

## Pruebas

- 101 pruebas de lógica: persistencia, conflictos, recuperación, conversión concurrente, importación de más de 10 MB sin superar el límite por petición, copias, series, instancias y virtualización, además de las regresiones existentes.
- Tres pruebas con el emulador oficial y el adaptador Firestore de producción: aislamiento entre cuentas, bloqueo del origen después de activar el destino y conversión de 205 medidas con paginación, consultas incrementales y conflictos.
- `typecheck`, lint de la app y de los componentes modificados, build estático y build de Storybook.
- Chrome personal: catálogo de 1.324 ejercicios con unas 10 filas montadas, `Home`/`End` y límite superior con `#`; tabla sin desbordamiento horizontal a 320 px y valores decimales legibles; entradas con coma y ajuste de 0,5; superserie Remo/Press y descanso al cerrar ronda; selección independiente de versiones; importación de demostración y detección del duplicado.
- La selección de un archivo local no se automatizó: la extensión requiere acceso a URLs de archivo. La lectura/validación está probada con JSON en los tests; la vista previa compartida y su confirmación se recorrieron con datos de demostración. No se amplió el permiso de la extensión.
- Reglas compiladas y desplegadas en el proyecto de producción. Dos pestañas de Chrome personal sincronizan una preferencia sin recargar, con confirmación de Firebase y restauración de Sistema. No se presenta esta prueba como comprobación de dos dispositivos físicos.

## Gate de interfaz antislop

ENERGY 2 / RHYTHM 2 / MOTION 2. Evidencia aplicada al código de esta revisión, a los componentes comprobados localmente y a la sincronización real entre pestañas.

- R-01 PASS: no se añaden degradados ni glows; el contraste del panel de semana tiene una función documentada.
- R-02 PASS: los textos nuevos usan frases y puntuación normal; no se introducen rayas largas editoriales.
- R-03 PASS: tabla probada a 320 px con cifras completas y sin desbordamiento horizontal.
- R-04 PASS: se reutilizan iconos para carga, entrenamiento, opciones y acciones reales, sin iconos ornamentales.
- R-05 PASS: las filas, tabla de series y panel semanal responden a sus contenidos, no a una cuadrícula uniforme de tarjetas.
- R-06 PASS: tipografía del sistema y cifras tabulares para lectura durante el entrenamiento.
- R-07 PASS: no se añade textura de fondo.
- R-08 PASS: no se añaden flechas ornamentales a acciones.
- R-09 PASS: no se añaden badges promocionales.
- R-10 PASS: los nuevos componentes no añaden capas de glassmorphism.
- R-11 PASS: pestañas sin cápsula, tabla con celdas de 6 px y superficies con radios menores.
- R-12 PASS: no hay sombra por fila ni por celda.
- R-13 PASS: no se añade glow a controles.
- R-14 PASS: el panel semanal, las métricas y las listas tienen jerarquías distintas.
- R-15 PASS: acciones concretas: importar selección, revisar cambios y pasar a aproximación.
- R-16 PASS: no se añade copy promocional.
- R-17 PASS: los números de las pruebas están identificados como demostración o proceden de ejecuciones registradas.
- R-18 PASS: no se añaden testimonios.
- R-19 PASS: el índice no gira solo; las marcas permanecen estables y los cambios de estado usan el movimiento existente de la app.
- R-20 PASS: la dirección del diario deportivo y sus motivos están escritos en DESIGN.md.
- R-21 PASS: los tokens claro/oscuro y los portales se comprueban en Storybook.
- R-22 PASS: se reutilizan las demostraciones existentes de los ejercicios.
- R-23 PASS: no se crean logos ni imágenes nuevas; la estructura del menú sigue la petición del usuario.
- R-24 PASS: se mantienen los cinco destinos existentes.
- R-25 PASS: contrastes de texto y controles calculados y registrados arriba.
- R-26 PASS: importación, selección de versiones, tabla, menús y guía tienen acciones; importar sin cambios se deshabilita con explicación.
- R-27 PASS: se conservan los estados vacío, guardando y error; los conflictos presentan ambas versiones.
- R-28 PASS: no se añade FAQ.
- R-29 PASS: un acento cálido sobre neutros; los colores de rendimiento conservan significado de datos.
- R-30 PASS: se consulta openGym sin copiar sus activos ni su composición.
- R-31 PASS: las decisiones principales tienen razón escrita en DESIGN.md.
- R-32 PASS: teclado en guía, campos, menús y selección de versiones; Escape y foco visible.
- R-33 PASS: cambios de interfaz escritos en fuente con apply_patch; oxfmt solo da formato.
- R-34 PASS: tabla y diálogo comprobados en oscuro; importación y catálogo comprobados en claro.
- R-35 PASS: tests y builds ejecutados; recorrido de los componentes nuevos registrado, con los límites de archivo local y producción explícitos arriba.
- R-36 PASS: la sincronización de producción se comprueba entre pestañas; no se prometen avisos de iPhone en segundo plano ni pruebas en dispositivos físicos no realizadas.
- R-37 PASS: dirección creativa autorizada, escrita y aplicada al tema y la densidad de los controles.
- R-38 PASS: demos en memoria rotuladas; no se crean registros de entrenamiento en la cuenta para las pruebas.

Fuentes técnicas: [transacciones Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions), [listeners](https://firebase.google.com/docs/firestore/query-data/listen), [cursores](https://firebase.google.com/docs/firestore/query-data/query-cursors), [emuladores](https://firebase.google.com/docs/emulator-suite/install_and_configure), [Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).
