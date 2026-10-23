# Auditoría visual y funcional de BASE

23 de octubre de 2026. Alcance de la versión 0.3.0: Hoy, Plan, catálogo y editor, Progreso, gráficas, historiales, Timer, Movilidad, Perfil, temas y persistencia. Referencia solicitada: [openGym](./opengym-review.md).

## Diagnóstico

La interfaz anterior repartía el énfasis entre demasiadas cajas, textos de ayuda y controles. Plan mezclaba consulta semanal, biblioteca y estructura. Progreso añadía a la misma página gráficas, calendario y todos los historiales. El catálogo competía con los ejercicios elegidos por el espacio de la pantalla. El descanso tenía dos ámbitos visibles que podían contradecirse. Cambiar únicamente los tokens de color no resolvía esos problemas.

## Dirección de diseño y decisiones

Lectura: aplicación personal de entrenamiento para móvil, con el lenguaje directo de openGym y la identidad verde de BASE. Antislop durante los cambios, por elección explícita del usuario. ENERGY 1 / RHYTHM 2 / MOTION 2.

- Color: fondo claro neutro cálido y superficies blancas; oscuro con un matiz verde muy contenido. El verde identifica selección, acción y progreso sin teñir todas las cajas.
- Tipografía: fuente del sistema para mantener familiaridad y lectura en iPhone. Títulos de 36–48 px con peso claro; los datos y el ejercicio tienen más presencia que sus etiquetas.
- Composición: separar por tarea. Las pestañas locales reducen la cantidad de información simultánea sin añadir destinos al menú principal.
- Superficies: una tarjeta agrupa una unidad de información; filas y separadores relacionan los elementos de una misma unidad. Las sombras se reservan para menús, diálogos y el botón central elevado.
- Espaciado: mayor separación entre tareas y menor dentro de cada grupo. El editor usa todo su espacio; buscar ejercicios y filtrar son pasos superpuestos.
- Imágenes: las demostraciones existentes acompañan al ejercicio; Movilidad reutiliza sus ilustraciones existentes como referencias visuales de cada movimiento.
- Movimiento: el menú conserva su deslizamiento, los desplegables revelan contenido y las confirmaciones mantienen su respuesta propia. Se respeta movimiento reducido.
- Calendario: un mes por vista, sin día impreso en la celda, por petición del usuario. Los nombres accesibles, el título al pasar el ratón y el detalle al tocar conservan la fecha exacta.

## Hallazgos corregidos

| Área | Problema | Cambio aplicado |
| --- | --- | --- |
| Navegación | Cabecera repetitiva y demasiada jerarquía equivalente | Marca compacta, títulos más claros y barra inferior estable, adaptada a ambos temas. |
| Hoy | Resumen repetía nombre y datos; duración fija de 45–55 min sin cálculo | Contexto compacto y duración ficticia retirada. Imagen, objetivo y nombre agrupados. |
| Hoy | Finalizar exigía llegar al final de la página | Selector y Finalizar juntos en una fila accesible durante el scroll. Se reutiliza la revisión previa al guardado. |
| Hoy | Omitir se llamaba «No hecha» | Acción explícita «Omitir ejercicio», con el deshacer existente. |
| Descanso | Perfil, ajuste general y excepción por ejercicio resultaban confusos | Un solo lugar visible por ejercicio con activación y tiempo. Disponible durante el entrenamiento y en el editor. |
| Descanso | Un efecto global podía anular un descanso habilitado para un ejercicio | Se elimina la interferencia global. La compatibilidad con preferencias antiguas se usa como valor inicial, sin reescribir el plan. |
| Plan | Tres tareas en una página larga y nombre del plan como campo siempre editable | Semana/Rutinas/Tramos y nombre editable en diálogo con guardado explícito. |
| Plan | Rutinas heredadas protegidas sin razón de producto | Se retira la etiqueta «plan base» y todas las rutinas propias ofrecen eliminación con confirmación. No se borra ningún registro al hacer esta revisión. |
| Plan | Menú de tramo manual sin comportamiento completo de teclado | Menú compartido de Base UI con foco, teclado y Escape. |
| Editor | Catálogo y rutina dividían la altura disponible | Rutina como vista principal, catálogo en diálogo independiente y filtros con aplicar/limpiar. |
| Editor | No era posible cambiar el orden de los ejercicios | Mover arriba/abajo en el menú del ejercicio; los límites se deshabilitan y se conservan sus ajustes. |
| Progreso | Todas las funciones en una única página | Resumen/Medidas/Historial. El historial distingue entrenamientos de actividad. |
| Progreso | Porcentaje de molestias incluía ejercicios omitidos | Se calcula solo sobre ejercicios con alguna serie realizada. La ausencia de registros no se presenta como 100%. |
| Calendario | Periodo fijo sin navegación ni detalle | Mes anterior/siguiente, volver al mes actual y detalle diario reutilizando las entradas y editores existentes. |
| Gráficas | Líneas sin escala y dos gráficos pequeños apilados | Una medida seleccionable, rango temporal, eje numérico, fechas y diferencia real del periodo. Un único registro no dibuja una tendencia. |
| Historial | Entrenamientos completos y «Ver todas» sin límite de render | Diez registros por página, búsqueda, mes y límites después de borrar o filtrar; también en medidas. |
| Timer | Contador pequeño y cabeceras duplicadas | Dial central con progreso real, controles claros y explicación de AMRAP/HIIT. |
| Movilidad | Lista casi solo textual | Referencias visuales existentes, lista agrupada y estado de realización separado de abrir instrucciones. |
| Perfil | Preferencias, cuenta y datos amontonados | Cuenta y datos/Apariencia y tacto; descanso retirado de aquí. |
| Temas | Portales podían perder el tema de la app | Contexto de tema compartido por diálogos y menús, también en Storybook. |
| Scroll | Segundo desplazamiento del documento | El bloqueo exterior se limita al shell de la app; el catálogo y los diálogos tienen scroll propio y Storybook conserva el suyo. |

## Pendiente: funcionalidad y datos

Estos puntos no se presentan como resueltos por la revisión visual.

| Prioridad | Hallazgo y evidencia | Siguiente cambio recomendado |
| --- | --- | --- |
| Alta | `lib/firebase.ts` lee y reemplaza `users/{uid}/appState/main`. El historial completo viaja con el estado. | Documentos independientes para entrenamientos, actividades y medidas; metadatos del plan separados y paginación remota por fecha e ID. |
| Alta | Firestore admite un máximo de 1 MiB por documento. La paginación de esta revisión limita el DOM, no el tamaño descargado ni guardado. | Migración verificable e idempotente, con copia, comprobación de integridad y convivencia temporal del formato anterior. No borrar el documento antiguo antes de comprobar el resultado. |
| Alta | `TodayView` construye el entrenamiento con día + semana + rutina. Repetir esa rutina ese día comparte identidad y borrador. | ID por instancia de entrenamiento y relación explícita con rutina, semana y ejercicios. Probar reanudación y repeticiones en el mismo día antes de migrar. |
| Alta | La sincronización protege por versión global. Dos cambios independientes pueden entrar en conflicto; hay sondeo, no un listener de cambios por registro. | Escucha de cambios y versión por entidad, con un conflicto visible cuando dos dispositivos cambian la misma serie. Firebase sigue mandando sobre la caché. |
| Media | `SectionedExerciseCatalog` memoiza secciones pero monta todo el catálogo. | Virtualizar filas/secciones manteniendo saltos de letra, teclado y extremos. La corrección del gesto no equivale a virtualización. |
| Media | `ExerciseLog` tiene una carga para todas las series. | Series con carga individual, calentamiento y superseries antes de ofrecer pirámides o análisis detallados de volumen. |
| Media | La recomendación de carga usa reglas generales en `lib/exercise-log.ts`. | Explicar el motivo y definir políticas que respeten los objetivos de RIR y el historial, con marcas reales separadas de estimaciones. |
| Media | Falta un flujo de importar una copia/exportación externa con validación. | Vista previa y duplicados antes de escribir; conservar exportación JSON actual. |
| Baja | El temporizador depende de que la app pueda seguir ejecutándose; no se ha probado en iPhone físico en esta sesión. | Pantalla encendida cuando esté soportada y aviso visual; validar en el iPhone standalone. |

Fuentes de Firebase: [límites de documentos](https://firebase.google.com/docs/firestore/quotas), [paginación por cursores](https://firebase.google.com/docs/firestore/query-data/query-cursors). El esquema de sincronización no se cambia en este lote.

## Validación registrada

- 75 tests correctos: calendarios de 4, 5 y 6 filas, año anterior y febrero bisiesto; paginación de 1.000 registros; búsqueda y mes; reordenación sin pérdida de ajustes; descanso independiente y recarga desde la nube simulada; regresiones de persistencia e historial.
- Typecheck, lint de la app y lint de los componentes/stories modificados correctos.
- Build estático para `/workout-tracker` y build de Storybook correctos. Se conserva la advertencia de chunks mayores de 500 kB; el catálogo aún requiere la mejora de carga indicada arriba.
- Chrome personal: vista de 320 px sin scroll horizontal en Plan, editor, catálogo, filtros, calendario y Timer. Filtros Espalda + Polea: 43 resultados; añadir dos ejercicios, cambiar orden y ajustar un descanso no cambia el otro. Borrador cancelado sin guardar.
- Calendario: navegación septiembre/octubre, detalle de Spinning y día vacío, acceso al editor existente y cancelación; tema oscuro del diálogo verificado por su color de superficie.
- Storybook: 240 entrenamientos, página 2 muestra 11–20; búsqueda «piernas» + septiembre produce cinco registros; búsqueda sin resultados muestra el estado vacío. Gráfica de demostración con 18 medidas y escala visible en tema oscuro.
- Timer: iniciar, pausar y reiniciar comprobados en móvil; contador vuelve a 01:30. La navegación conserva su altura.
- Contraste calculado: texto/fondo claro 14,93:1; secundario/control claro 5,39:1; texto/tarjeta oscura 15,14:1; secundario/control oscuro 5,74:1. Se conservan los pares de acción del verde existente.
- No se han creado entrenamientos ni actividades de prueba en la cuenta. Los fixtures de gráficas e historiales están identificados como demostración y viven solo en memoria.

- Escritorio a 1280 px: Plan y Progreso sin desbordamiento; las métricas pasan a cuatro columnas. Menú de tramo operable con Escape. Tamaño temporal restablecido después de la prueba.
- Movilidad: referencias de la lista cargadas, instrucciones de dorsiflexión abiertas y cerradas con Escape, y cambio a rutina larga correcto. No se han marcado movimientos para probar.
- Tema «Sistema» restaurado y estado «Guardado en Firebase» confirmado. Las consolas de la app de revisión y de la gráfica en Storybook no muestran errores.

No se ha probado un iPhone físico. Las capturas de pruebas corresponden a Chrome personal con tamaños de viewport controlados.

## Gate de entrega antislop

Alcance del gate: superficies, organización e interacciones modificadas. Los hallazgos de datos pendientes de la tabla anterior no se presentan como corregidos.

- R-01 PASS: superficies neutrales y verde de función; no se añaden gradientes decorativos.
- R-02 PASS: el texto nuevo no usa rayas largas; los guiones de ausencia de datos y rangos son notación de datos.
- R-03 PASS: Plan, catálogo, filtros, calendario y Timer comprobados a 320 px; Plan y Progreso también a 1280 px sin scroll horizontal.
- R-04 PASS: se conserva la colección existente; flechas para ordenar/navegar, temporizador para descanso e iconos propios de las actividades.
- R-05 PASS: Hoy organiza una sesión, Plan separa tareas y Progreso muestra datos; no se fuerza una composición única.
- R-06 PASS: fuente del sistema y jerarquía registrada en Dirección de diseño; controles numéricos conservan cifras tabulares.
- R-07 PASS: no se añaden texturas ni patrones de fondo.
- R-08 PASS: las flechas nuevas mueven ejercicios o periodos; no decoran llamadas a la acción.
- R-09 PASS: sin nuevos badges decorativos; estados mediante texto, selección y controles.
- R-10 PASS: se mantiene el backdrop existente de los diálogos; no se añade cristal a tarjetas ni navegación.
- R-11 PASS: tarjetas de grupo a 22 px, filas y controles menores, navegación central circular por referencia expresa.
- R-12 PASS: las tarjetas nuevas no usan sombras; menús, diálogos y botón central representan superposición.
- R-13 PASS: no se añade brillo a la interfaz; se conserva solo la elevación del centro del menú elegido.
- R-14 PASS: métricas resumidas, calendario mensual, serie temporal y lista de movilidad tienen composiciones distintas por contenido.
- R-15 PASS: acciones concretas: Aplicar filtros, Añadir ejercicios, Finalizar, Mover arriba y Guardar nombre.
- R-16 PASS: se retiran texto repetido y la duración no calculada; AMRAP/HIIT tienen una explicación directa.
- R-17 PASS: datos de la cuenta calculados del historial; datos de demostración identificados en Storybook.
- R-18 PASS: no se añaden testimonios ni identidades ficticias.
- R-19 PASS: movimiento vinculado a cambio de vista, expansión o estado; movimiento reducido conservado.
- R-20 PASS: BASE conserva nombre, verde, rueda y menú; la referencia guía jerarquía y organización.
- R-21 PASS: ambos temas comprobados; se restaura la preferencia original Sistema al terminar.
- R-22 PASS: se reutilizan las demostraciones e ilustraciones existentes, sin assets inventados.
- R-23 PASS: no se añaden identidades ni destinos principales; las nuevas pestañas agrupan funciones ya existentes.
- R-24 PASS: los cinco destinos del menú mantienen sus vistas; las pestañas locales cambian el contenido.
- R-25 PASS: pares nuevos calculados con el comprobador, mínimo 5,39:1 en los pares secundarios documentados.
- R-26 PASS: filtros, reordenación, calendario, periodos de gráfica, historiales y controles de Timer comprobados; los límites se deshabilitan.
- R-27 PASS: búsqueda vacía, mes sin actividad, primera medida y ausencia de registros tienen estados explícitos. Persistencia conserva sus mensajes de carga/error.
- R-28 PASS: no se añade una FAQ.
- R-29 PASS: neutros, verde de acción y colores de estado ya presentes; sin paleta decorativa adicional.
- R-30 PASS: referencia explícita del usuario; sin copiar código, imágenes ni backend de openGym.
- R-31 PASS: color, fuente, superficies, composición, espaciado, imágenes y movimiento tienen motivo registrado arriba.
- R-32 PASS: botones nativos, nombres accesibles de fechas y menús de Base UI; Escape probado en diálogo y menú.
- R-33 PASS: cambios escritos en componentes y CSS; sin scripts que parcheen estilos en ejecución.
- R-34 PASS: superficies de diálogos y menús heredan el tema por contexto; detalle diario oscuro y gráfica oscura comprobados.
- R-35 PASS: 75 tests, tipos, lint y ambos builds correctos; recorrido manual registrado en Validación, incluidas pantallas estrechas y escritorio.
- R-36 PASS: no se añaden afirmaciones de seguridad, salud ni mejoras porcentuales de rendimiento.
- R-37 PASS: dirección y diales explícitos, derivados del producto y la referencia elegida por el usuario.
- R-38 PASS: resultados reales separados de fixtures; no se presenta ninguna función pendiente como existente.

Liveliness PASS: foco distinto por vista, verde para acción y progreso, imágenes útiles y movimiento ligado a interacción. Craftsmanship PASS en el alcance modificado: controles operativos, estados vacíos, evidencia de pruebas y limitaciones explícitas.
