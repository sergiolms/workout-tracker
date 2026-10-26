# Comparación funcional de openGym y Base

26 de octubre de 2026. Base: `ce3aece`, versión 0.5.0. openGym: `08eabf4f480f43fd789592577463cca1b504976e`.

La revisión del 23 de octubre fue una selección de referencias de diseño y entrenamiento, no un inventario completo. Esta revisión amplía el alcance a planificación, registro, análisis, datos, accesibilidad y plataformas. Se han contrastado documentación, módulos de producción y pruebas de openGym con el código actual de Base. No se han ejecutado las pruebas de openGym ni certificado todas sus funciones. Tampoco se ha realizado una prueba nueva con VoiceOver, TalkBack o un móvil físico. La existencia de una prueba en el repositorio es evidencia de intención y cobertura, no de que la hayamos ejecutado.

## Inventario por capacidad

“Parcial” significa que existe una parte útil, pero no toda la capacidad de la referencia. Las prioridades son para Base: P1 próxima entrega, P2 posterior, P3 opcional.

| Capacidad de openGym | Situación en Base | Decisión recomendada |
| --- | --- | --- |
| Rutinas, planificación y semanas | Tenemos rutinas, tramos, semanas y semanas de descarga | Conservar el modelo; mejorar el siguiente entrenamiento sugerido |
| Rotación A/B/C independiente del calendario y reprogramación de un día | Parcial: orden de rutinas y progreso del plan; sin modo de rotación equivalente | P2: secuencia flexible sin obligar a editar el plan por faltar un día |
| Plantillas iniciales editables | Sin selector equivalente de programas iniciales | P2: opcionales al crear plan; nunca insertar ni reponer datos en una cuenta existente |
| Catálogo, imágenes, búsqueda y filtros | Cubierto: imágenes, búsqueda tolerante a errores, zona y material | Priorizar calidad de nombres y relevancia sobre cantidad de ejercicios |
| Mapa muscular para explorar ejercicios | Sin equivalente | P2: ofrecerlo como alternativa, conservando búsqueda y filtros de texto |
| Inventario personal de material | Filtros de material, pero sin inventario propio | P2: recordar “mi gimnasio” para reducir resultados inútiles |
| Crear ejercicios con medios propios | Sin editor completo de ejercicios personalizados | P1/P2: nombre, modalidad, equipo y medio opcional; separar identidad de nombre |
| Referencia de sesión anterior | Cubierto con datos fantasma | Añadir historial del ejercicio sin abandonar la sesión |
| Aproximaciones y superseries | Cubierto | Mantener; no presentarlo como novedad pendiente |
| Ejercicios de fuerza por tiempo | El modelo de series almacena repeticiones y carga | P1: segundos para planchas, agarres y transportes |
| Peso corporal, lastre, asistencia y peso por mancuerna | Parcial: existe modalidad por repeticiones sin carga, pero no un modelo completo de estas diferencias | P1: definir qué significa cada kg antes de calcular marcas y volumen |
| Registro por lado | Sin equivalente estructurado | P2: izquierda/derecha solo cuando el ejercicio lo necesite |
| Drop sets, rest-pause y pirámides | Sin equivalente estructurado | P3: opciones avanzadas, no columnas permanentes |
| RIR/RPE por serie | RIR por ejercicio y RPE opcional en actividad | P2: opcional; mantener lenguaje comprensible y no inferir esfuerzo como hecho |
| Calculadora de discos | Sin equivalente | P2: útil para barra; ajuste por discos disponibles, oculto para máquinas |
| Descanso automático, omitir y pantalla encendida | Cubierto en web dentro de sus límites | Mejorar feedback final; no prometer avisos en segundo plano propios de una app nativa |
| Vista compacta/lista durante la sesión | Parcial: navegación guiada por ejercicio | P1: “solo series”, con opciones secundarias plegadas; conservar vista con imagen |
| Deslizar para copiar/borrar serie y deshacer | Menús y marcado rápido; deshacer de acciones recientes | P2: gestos como atajo con botón equivalente, nunca única forma |
| Progresión por políticas y descarga por estancamiento | Parcial: recomendación explicada subir/mantener/bajar, según rango, reserva y molestias | P2: comenzar con progresión doble configurable y motivo visible; cambios propuestos, no cargas alteradas silenciosamente |
| Historial por ejercicio, mejores series y 1RM estimado | Referencia anterior; Progreso muestra actividad, plan y medidas, sin análisis equivalente por ejercicio | P1: últimas sesiones, mejor serie, carga/repeticiones y gráfica; 1RM siempre identificado como estimación |
| Volumen semanal por músculo y ejercicio | Sin equivalente | P2: series de trabajo realizadas, periodo y criterios de cómputo visibles |
| Mapa de recuperación y balance estructural | Sin equivalente | P3: no copiar como diagnóstico; datos observados antes que puntuaciones de apariencia precisa |
| Calendario de actividad | Cubierto: mensual, navegación y detalle del día | Conservar el formato pedido; un año completo sería otra vista opcional |
| Peso, objetivos y medidas | Peso/cintura, gráficas e historial; sin objetivo visual equivalente | P2: objetivo opcional y progreso sin colorear toda bajada como éxito |
| Fotos de progreso y comparación | Sin equivalente | P3: opt-in, almacenamiento privado, eliminación y exportación claras |
| Corregir historial y registrar una sesión pasada | Edición cubierta; sin flujo completo de crear entrenamiento pasado independiente | P2: “Registrar entrenamiento pasado” con fecha y series, sin tener que iniciarlo como sesión de hoy |
| Importar Strong, FitNotes, Gravl y CSV genérico | Solo Hevy CSV y copia Base | P2: adaptadores al mismo flujo de revisión y duplicados |
| Hevy API, rutinas e identificación de ejercicios | Solo CSV de entrenamientos y peso/cintura; metadatos especiales en notas | P1/P2: conservar tipos de serie y esfuerzo en campos propios; API y rutinas después, sin reemplazar el plan existente |
| Apple Health XML | Sin equivalente | P2 si interesa recuperar peso histórico; distinto de sincronizar con Salud |
| Compartir plan y PDF | Copia JSON de la cuenta; sin exportación pequeña de rutina/plan ni impresión específica | P1/P2: compartir solo rutinas elegidas, sin medidas ni entrenamientos personales; importar como nuevas |
| Copias y concurrencia | Cubierto con JSON, vista previa, Firebase por entidad, conflictos y cambios pendientes | Mantener Firebase como autoridad. No trasladar su servidor JSON ni hacer autoritativa la caché local |
| Historial grande | Páginas en UI; primera carga remota reúne todo el historial | P1 técnica: consultas por fecha/cursor y agregados para calendario y estadísticas |
| Passkeys, usuarios, invitaciones y administración | Google/Firebase; sin administración equivalente | No prioritario para el uso actual |
| Idiomas y RTL | Interfaz enfocada en español | P3 según usuarios; evitar cadenas y formatos imposibles de internacionalizar |
| Coach de IA y MCP local | Sin equivalente funcional completo de coach | P3: no aporta tanto como un registro fiable y análisis comprensible |
| App nativa, reloj, Salud/Health Connect y avisos nativos | Base es web/PWA | Proyecto separado si se necesita. El código actual de openGym ya incluye integración nativa de Salud; no confundir con permisos de una web |

## Qué cambiaría en la experiencia de Base

1. **Entrenar con menos decisiones.** Abrir el siguiente ejercicio con series y valores anteriores preparados. Carga, repeticiones y hecho a primera vista; notas, ajustes y esfuerzo opcional detrás de una acción. Añadir “Historial” en contexto. Evitar una pantalla llena de controles antes de poder empezar.
2. **Progreso que responda preguntas.** “¿Estoy mejorando en este ejercicio?”, “¿Qué hice la última vez?” y “¿Cuántas series he hecho esta semana?”. Los totales acumulados actuales no responden bien estas preguntas. No convertir la sección en una pared de gráficas.
3. **Identidad estable para ejercicios.** `ExerciseLog` identifica el ejercicio por nombre y las relaciones de la sesión también usan nombres (`lib/storage.ts:5`, `lib/exercise-log.ts:29`). Renombrados, traducciones, ejercicios personalizados y fusiones de Hevy necesitan IDs estables y una instantánea del nombre original. Resolverlo antes de construir comparaciones históricas amplias.
4. **Recuperar errores.** El borrado de medidas pide confirmación y es irreversible en la UI. Ofrecer papelera o restauración temporal también para entrenamientos y actividades. Una confirmación reduce errores, pero no los repara.
5. **Datos importados comprensibles.** Separar coincidencias seguras, ejercicios pendientes de vincular y campos que no tienen representación. Mantener el original y permitir corregir el vínculo; nunca asignar una imagen solo por fuzzy match.
6. **Mostrar estados de sincronización accionables.** Mantener guardado local/pendiente/confirmado/conflicto diferenciados. Añadir detalle de cambios pendientes y última confirmación cuando haya problemas, sin ocupar la pantalla cuando todo esté bien.

## Hallazgos de accesibilidad y organización

Estos son hallazgos de inspección, no fallos reproducidos en todos los dispositivos.

| Evidencia de Base | Mejora y criterio de aceptación |
| --- | --- |
| `components/sectioned-exercise-catalog.tsx:81`: solo monta una ventana de resultados | La exploración con lector de pantalla no debe depender de elementos desmontados. Añadir modo accesible paginado o “Cargar más”, comunicar posición y conservar foco al cambiar la ventana. Mantener la rueda como atajo visual |
| `components/alphabet-wheel.tsx:42`: slider vertical con teclado y letras ocultas al lector | La base semántica existe; comprobar el salto entre secciones con VoiceOver/TalkBack. Añadir alternativa explícita “Ir a letra” y anunciar sección/resultados sin exigir arrastre preciso |
| `components/measurement-tracker.tsx:94`: guardar deshabilitado según `valid`, sin explicación de error asociada | Indicar el campo inválido y motivo, con `aria-invalid`/`aria-describedby`, al intentar guardar o salir del campo. “Opcional” debe seguir significando que puede quedar vacío |
| `components/exercise-set-editor.tsx:62`: carga y repeticiones nombran la serie, pero no el ejercicio | Incluir ejercicio en el contexto accesible del grupo. Al editar varias series no debe haber que adivinar a qué ejercicio pertenecen |
| `components/workout-feedback.tsx:21`: deshacer caduca tras cinco segundos y no pausa por foco | Mantener aviso breve según preferencia del usuario, pero pausar con foco/hover y permitir recuperar la acción después. El toast no debería retirar el botón mientras alguien lo está usando |
| `components/workout-app.tsx:317`: hay `main`, sin enlace de salto | Añadir salto a contenido, destino enfocable y gestión del foco al cambiar de vista. Probar que navegación, descanso y teclado móvil no tapen el control activo |
| `components/measurement-tracker.tsx:50`: gráfica con alternativa textual oculta | Conservarla y ofrecer también lista/tabla visible accesible a usuarios con baja visión. No depender únicamente del color de la tendencia |
| `components/view-tabs.tsx:3`: botones con `aria-pressed` | No es automáticamente un fallo: funciona como grupo de botones. Elegir contrato coherente; si se presenta como tabs, implementar tablist/tab/tabpanel y teclado correspondiente, no añadir roles sueltos |
| `app/globals.css:216`: movimiento reducido existente; varios textos auxiliares de 10–12 px | Mantener reduced-motion y comprobar ampliación 200 %, texto grande del sistema, contraste en ambos temas, orientación horizontal y teclado. No dar por hecho que CSS equivale a prueba real |
| `components/views/today-view.tsx`: 1183 líneas; `plan-view.tsx`: 774 | La separación de páginas mejoró la entrada, pero quedan componentes con responsabilidades excesivas. Extraer controlador de sesión, registro de actividad y presentación de series por responsabilidad, con pruebas de flujos |
| `lib/cloud-repository.ts:65`: acumula todas las páginas | La paginación de presentación no resuelve coste de carga. Probar cuenta sintética de varios años y consultar por intervalos con agregados compatibles |

Además de las pruebas de lógica existentes, faltan recorridos automatizados de navegador que comprueben edición, importación, navegación, foco y recuperación de errores. Complementarlos con teclado y lectores reales; un escáner automático no certifica accesibilidad.

## Orden de trabajo propuesto

1. Accesibilidad del catálogo y formularios, recuperación de borrados y foco. En paralelo de producto: identidad estable de ejercicios e historial por fecha.
2. Historial por ejercicio y modo compacto de entrenamiento; después, series por tiempo y semántica de cargas.
3. Ejercicios propios y vinculación revisable de importaciones; compartir rutinas sin datos personales.
4. Rotación flexible, volumen semanal y progresión configurable.
5. Fotos, IA, sensores y aplicación nativa solo si el uso real los justifica.

En la revisión inicial no se implementaron ni publicaron estas propuestas. El trabajo posterior autorizado se detalla a continuación; el inventario anterior describe el punto de partida 0.5.0.

## Implementación local posterior a la revisión

Trabajo autorizado el 26 de octubre. Se crearon commits separados hasta `80668e5`. Después el usuario pidió continuar sin commit ni push: las correcciones y comprobaciones posteriores quedan en el árbol de trabajo. No se ha publicado esta entrega.

### Incorporado

- Catálogo continuo con rueda de letras. Se retiró la alternativa por páginas a petición del usuario; queda pendiente validar la accesibilidad de esta vista única con lectores de pantalla.
- Formulario de medidas separado, con errores asociados al campo, foco en el primer error y valores vacíos opcionales. El toast pausa su caducidad al recibir foco o pasar el puntero por encima. Enlace de salto al contenido posterior a la cabecera.
- Registros eliminados recuperables en Firebase, con búsqueda, mes y páginas. Restaurar no sustituye un registro que ya exista. La eliminación definitiva requiere confirmación en la interfaz. Las copias descargadas siguen siendo responsabilidad de quien las conserva.
- Historial de un ejercicio desde Progreso y desde el entrenamiento: carga, repeticiones, volumen, intervalos y detalle textual de las series. Los registros nuevos tienen identidad estable y criterio de carga. Modalidades y criterios distintos se pueden consultar por separado.
- Vista Solo series guardada en la cuenta. El registro de actividad se ha separado de Hoy en un componente propio y los fuentes nuevos se han formateado para que sean legibles.
- Series por segundos; carga total, por mancuerna, lastre, ayuda o sin carga. El historial conserva el criterio original aunque cambie la rutina. No se propone aumentar el contrapeso de ayuda como si fuese carga levantada.
- Hevy conserva RPE, tiempo, distancia, tipo y referencias de superserie en campos propios. Los ejercicios se pueden vincular al catálogo explícitamente, sin fuzzy matching automático de identidad. RIR y molestias sin registrar permanecen desconocidos; no alimentan estadísticas como si fueran datos aportados.
- Ejercicios propios con ID, notas, modalidad y foto opcional. Las fotos se reducen y se vuelven a generar antes del guardado, con límites de tamaño. Se pueden reutilizar desde las rutinas que los contienen. No se ha creado un repositorio global independiente de ejercicios propios.
- Archivo de rutinas seleccionadas y vista imprimible/PDF. No se incluyen entrenamientos ni medidas. Las fotos y las notas de los propios ejercicios sí forman parte de la rutina compartida. La importación añade rutinas con IDs nuevos; añadir tramos al final es opcional.
- Rotación de rutinas independiente del plan semanal. Solo avanza con trabajo realizado, conserva los tramos y permite volver al plan por semanas.
- Series semanales por zona principal y ejercicio, con navegación entre semanas. No se presentan como recuperación medida. 1RM estimado opcional con fórmula visible, restringido a series realizadas de 1–10 repeticiones cuyo criterio de carga total esté declarado.
- Progresión manual o propuesta al completar el rango. Ninguna política cambia la carga silenciosamente. Registro de entrenamientos pasados con revisión, reutilizando el editor existente; no completa la semana actual.
- Buscador compartido en catálogo, Progreso y vinculación de importaciones. Las listas de Progreso y vinculación comparten carga progresiva, miniaturas y alternativa de teclado, sin truncar la búsqueda a los primeros 30 resultados. Se eliminaron los contadores de elementos visibles.
- Selección provisional de ejercicios: tocar marca o desmarca; confirmar añade el grupo a la rutina. Cerrar sin confirmar descarta la selección. Los ejercicios ya confirmados se quitan desde el editor, conservando sus ajustes. Se corrigió la cadena de altura flexible que bloqueaba el scroll del editor de sesiones.
- Duplicar una serie desde su menú conserva carga, repeticiones o segundos y deja la nueva serie pendiente; no copia esfuerzo ni referencias de importación. Calculadora de discos en el menú de las series con barra durante el entrenamiento, con peso de barra y número de pares ajustables. Busca un montaje simétrico sin superar el peso elegido; los ajustes son de esa apertura y no cambian las cargas del entrenamiento.
- Perfil sustituye a Movilidad en la navegación inferior. Movilidad conserva sus rutinas e indicaciones dentro de Hoy, bajo Registrar actividad, también sin sesión de fuerza asignada. El estado de sincronización de la cabecera se muestra con nube y check, loader o enchufe desconectado, con descripción accesible.
- Estado optimista compartido con React mediante `useSyncExternalStore`, sin una segunda copia del estado en el hook de cuenta. Respuestas remotas serializadas y ordenadas por revisión; la limpieza de cambios confirmados no borra una edición posterior. Tras la primera lectura autorizada, los fallos transitorios de red permiten seguir editando con una cola local pendiente, sin reintentos en bucle. Los errores de permisos y los conflictos siguen bloqueando la edición. La caché inicial nunca se sube como fuente de verdad.

### Verificación y límites

- TypeScript y lint de la aplicación correctos. 141 pruebas de lógica correctas para identidad, modalidades, cálculo, importación, recuperación, rotación, exportación, búsqueda, discos, selección de ejercicios y estado optimista ante respuestas retrasadas.
- Cuatro pruebas del adaptador real y reglas contra el emulador oficial de Firestore. Incluyen dos clientes que guardan y restauran series por tiempo, ajustes de vista y rotación. No escriben datos de prueba en la cuenta real.
- Builds de aplicación, exportación estática con `/workout-tracker/` y Storybook. Persisten avisos de plugins y tamaño del catálogo; no se han ocultado ni presentado como resueltos.
- Chrome personal, en demostraciones en memoria: validación de medida vacía; peso `72,6` después de tocar cintura sin rellenarla; historial por ejercicio; editar segundos y marcar serie; crear ejercicio por tiempo; activar catálogo por páginas; configurar rotación; diálogo de compartir a 390 px. Se detectó y corrigió un desbordamiento del selector de archivo: el ancho interno del diálogo pasó a coincidir con sus 358 px disponibles.
- La descarga de rutinas sí produjo un archivo local: se leyó con el parser y contenía una rutina y solo las claves del formato de plan, sin `exerciseLogs`. La espera de eventos de descarga del control del navegador falló; no se usa ese intento como prueba de importación por el selector de archivos.
- El control local del navegador quedó desactivado en Work antes de terminar el recorrido. Quedan sin comprobar en navegador la restauración, la importación del archivo exportado, el diálogo de impresión y los últimos ajustes de foco/papelera. No se han probado VoiceOver, TalkBack, un móvil físico ni la ampliación al 200 %. Tampoco se ha completado una nueva pasada visual de todos los estados en ambos temas.

### Pendiente del inventario

La primera carga remota sigue leyendo todo el historial. La navegación por páginas en la interfaz no equivale a consultas remotas por fecha. Cambiarlo exige adaptar las estadísticas, el calendario y los contratos del repositorio para no confundir registros aún no descargados con registros borrados; no se ha cambiado la autoridad de Firebase para esquivar ese problema.

También quedan para entregas posteriores el inventario persistente de material, mapa muscular, registro por lado, técnicas avanzadas de series, plantillas opcionales de programas, objetivos de medidas, otros importadores y API de Hevy. Las funciones nativas, fotos de progreso e IA continúan fuera de esta entrega. La vista Hoy y el editor de Plan aún necesitan extraer más lógica por responsabilidad; dividir y formatear archivos no completa por sí solo la revisión de arquitectura.

## Fuentes primarias

- [openGym: capacidades y plataformas](https://github.com/DuarteSantos8/openGym/blob/08eabf4f480f43fd789592577463cca1b504976e/README.md).
- [Historial de ejercicio](https://github.com/DuarteSantos8/openGym/blob/08eabf4f480f43fd789592577463cca1b504976e/frontend/src/lib/exercise-history.js), [estadísticas](https://github.com/DuarteSantos8/openGym/blob/08eabf4f480f43fd789592577463cca1b504976e/frontend/src/views/Stats.jsx), [progresión](https://github.com/DuarteSantos8/openGym/blob/08eabf4f480f43fd789592577463cca1b504976e/frontend/src/lib/progression.js).
- [Registro de entrenamiento](https://github.com/DuarteSantos8/openGym/blob/08eabf4f480f43fd789592577463cca1b504976e/frontend/src/views/Workout.jsx), [rotación](https://github.com/DuarteSantos8/openGym/blob/08eabf4f480f43fd789592577463cca1b504976e/frontend/src/lib/rotation.js), [calculadora de discos](https://github.com/DuarteSantos8/openGym/blob/08eabf4f480f43fd789592577463cca1b504976e/frontend/src/lib/plates.js).
- [Importaciones y compartir planes](https://github.com/DuarteSantos8/openGym/blob/08eabf4f480f43fd789592577463cca1b504976e/docs/DATA_IMPORTS.md), [integraciones nativas de salud](https://github.com/DuarteSantos8/openGym/blob/08eabf4f480f43fd789592577463cca1b504976e/frontend/src/lib/health-sync.js).
- [Web Interface Guidelines consultadas](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md). Se han usado como lista de comprobación, no como certificado.

Se propone adaptar interacciones y modelos a Base, no copiar código ni medios. Las condiciones del código y de las imágenes de la referencia son distintas y deben comprobarse antes de reutilizarlos.
