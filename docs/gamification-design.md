# Gamificación de Zero to Hero

> Archivo de la propuesta inicial. Las etapas del brazo, las reglas de XP y la combinación de saldos descritas aquí fueron sustituidas por el [gimnasio virtual](virtual-gym-implementation.md) y su [economía](economy/README.md). Este documento no describe el comportamiento de la app.

Propuesta de producto del 27 de octubre de 2026. Base revisada: `d6373c6`.
No implementada. Los valores de XP y los umbrales son propuestas de equilibrio, pendientes de probar con ejemplos de uso.

Revisión de la dirección visual: se está evaluando un [gimnasio virtual isométrico con créditos](virtual-gym-concept.md) en lugar del brazo descrito en este borrador. Las secciones de brazo y de recompensas sin tienda quedan pendientes de sustituir según esa decisión.

## La experiencia

Terminas una sesión y ves cuánto aporta a tu siguiente nivel. El brazo cambia por etapas; la cinta pasa de holgada a tensa y termina rompiéndose en un hito. Los logros reconocen lo que has hecho y permiten elegir recompensas visuales. También puedes asociar un premio personal a una meta.

El brazo será una ilustración original, sin personajes, nombres ni imágenes de la referencia. Representa la progresión dentro de la app, no una medición del cuerpo. La movilidad y las actividades también contribuyen; no hace falta practicar fuerza para usar el sistema.

## 1. Experiencia y niveles

Una sola puntuación: XP acumulada. No se gasta. El nivel se calcula a partir de ella; no se guarda como otro contador editable.

| Acción | Propuesta inicial de XP | Regla |
| --- | --- | --- |
| Entrenamiento de fuerza finalizado | Hasta 100 | Proporción de series de trabajo realizadas respecto a las previstas al comenzar. Tope de fuerza: 100 XP por día. |
| Actividad registrada | 1 por minuto, hasta 30 al día | Se suman las actividades del día. Pasos y distancia no vuelven a puntuar esa actividad. |
| Movilidad realizada | 3 por movimiento distinto, hasta 15 al día | Un mismo movimiento cuenta una vez en el día, aunque aparezca en la rutina corta y en la larga. |

Ejemplo: una sesión con 10 series previstas y 6 realizadas aporta 60 XP. Completar las restantes lleva esa contribución a 100; no concede otros 100. El cálculo se redondea al final, no después de cada cambio de checkbox.

Los límites diarios son límites de puntuación, no objetivos que haya que llenar. No se muestran como otra barra pendiente. El usuario continúa registrando todo aunque alcance un límite.

No dan XP las aproximaciones, abrir la app, introducir medidas, aumentar kilos ni añadir series por encima del plan. Las anotaciones de dolor o esfuerzo no condicionan premios. Un entrenamiento todavía abierto muestra una previsión, pero no una recompensa definitiva.

Hay que conservar las series previstas al comenzar: el modelo actual no tiene ese snapshot. Modificar una rutina después no debe cambiar el denominador de un entrenamiento terminado. Una sesión libre fija su objetivo al iniciarse; cambiarlo durante la sesión exige una actualización explícita de ese objetivo, no se deduce de la rutina actual al guardar.

### Ritmo de niveles

Umbral acumulado propuesto para el nivel L:

`25 × (L − 1)² + 75 × (L − 1)`

| Nivel | XP acumulada | Hito visual |
| --- | --- | --- |
| 1 | 0 | Brazo inicial, cinta holgada |
| 2 | 100 | Primera subida de nivel |
| 5 | 700 | Segundo dibujo del brazo; cinta ajustada |
| 10 | 2.700 | Tercer dibujo; cinta tensa |
| 15 | 5.950 | Cuarto dibujo; cinta al límite |
| 20 | 10.450 | La cinta se rompe |

Después de la rotura siguen los niveles, sin agrandar el brazo indefinidamente. Se añaden variantes de cinta, detalles y emblemas. No se reinicia el progreso por temporadas.

Como simulación de equilibrio: 3 sesiones completas, 4 actividades de 20 minutos y 3 días con 5 movimientos de movilidad sumarían 425 XP semanales. Manteniendo exactamente ese patrón, el nivel 10 llegaría en unas 6–7 semanas y el 20 en unas 25. No es una recomendación de entrenamiento ni una previsión de cambios físicos.

## 2. Logros

Los logros no son una segunda fuente de XP. Pueden conceder una recompensa visual, y cada uno tiene condición, progreso y fecha de obtención.

| Familia | Ejemplos propuestos | Qué reconoce |
| --- | --- | --- |
| Empezar | Primera sesión, primera actividad, primera movilidad | Usar cada registro por primera vez |
| Acumular | 10, 25, 50 y 100 entrenamientos; 100, 500 y 1.000 minutos de actividad | Trabajo registrado a lo largo del tiempo |
| Cumplir el plan | 1, 4 y 12 semanas con el objetivo cumplido | Constancia respecto a un objetivo personal |
| Movilidad | 5, 20 y 50 días con movilidad | Una práctica sostenida, sin exigir sesiones largas |
| Volver | Primer entrenamiento tras una pausa de 14 días | Retomar, sin restar lo anterior |

Las semanas cumplidas son acumuladas, no tienen que ser consecutivas. Una semana de descanso no destruye una cadena ni impide continuar. No hay puntos por afirmar que se ha descansado.

La primera entrega tendrá unas 12–15 definiciones, con sus escalones, en lugar de una colección enorme de insignias. No se premia repetir siempre el ejercicio más fácil, completar todos los días del calendario ni registrar una ausencia de dolor.

Los récords personales pueden tener una celebración propia en una fase posterior. Requieren comparar el mismo ejercicio, modalidad, unidad y criterio de carga; no basta con elegir el mayor número de kilos. No darían XP adicional.

## 3. Metas semanales

Una meta principal: las sesiones que el usuario quiere hacer esa semana. Como máximo dos metas complementarias, elegidas entre actividad y movilidad. No se generan tareas aleatorias para rellenar una pantalla.

Se proponen a partir del plan o se configuran expresamente. Una rotación no fija por sí sola cuántas veces hay que entrenar cada semana: en ese caso se pregunta la frecuencia. Una semana de descarga o descanso se refleja en el objetivo.

El objetivo queda registrado al comenzar la semana. Puede ajustarse por un cambio real de plan, con confirmación; completar menos sesiones después de reducirlo no desbloquea retroactivamente un premio anterior. Las semanas usan una zona horaria estable del diario. Viajar o cambiar el reloj no crea otra semana premiable.

Las metas muestran progreso, pero no conceden otra capa de XP. Alimentan los logros de constancia y los premios personales. Una pausa conserva el nivel; no obliga a comprar ni gastar un comodín.

## 4. Premios

### Recompensas que entrega la app

- **Evolución del brazo:** hitos principales de nivel. El dibujo y la rotura de la cinta son el centro de la identidad visual.
- **Cintas y detalles:** patrones de cinta, una muñequera u otros detalles pequeños asociados a logros. Los tipos de piel y la representación inicial se eligen desde el principio; no se convierten en premios.
- **Emblema de perfil:** una insignia elegida entre las obtenidas, con fecha e historia del logro. No se muestran todas a la vez en Hoy.
- **Variantes de acento:** combinaciones revisadas para claro y oscuro. Elegir tema y disponer de contraste accesible sigue disponible desde el principio.

Sin monedas, tienda ni cajas aleatorias en esta primera versión. El historial, las estadísticas, la exportación y los ajustes no se bloquean detrás de un nivel.

### Premios personales

El usuario puede escribir una recompensa y asociarla a un logro o a un número de semanas cumplidas: por ejemplo, «Tarde de cine al completar cuatro semanas». La app avisa cuando se alcanza la condición y permite marcarla como disfrutada.

Son compromisos personales, no premios financiados por la app. No tienen precio obligatorio ni requieren subir pruebas. La primera versión permite un premio activo para no añadir otra lista de tareas.

## 5. Dónde aparece

**Hoy:** un bloque compacto con el brazo, nivel y progreso al siguiente nivel. Se puede minimizar. La sesión actual mantiene la prioridad. Nada de varias barras para fuerza, resistencia o salud que aparenten medir capacidades que no estamos midiendo.

**Después de guardar:** el resumen de la sesión añade la XP obtenida. Si hay varios hitos juntos se agrupan en una sola celebración. No se abre un modal al marcar cada serie ni se acumulan toasts por cada logro.

**Progreso:** sección de nivel con la evolución del brazo, logros obtenidos, próximos hitos y la meta semanal. Los logros no obtenidos explican la condición; el progreso tiene sentido concreto, como «7 de 10 sesiones».

**Perfil:** elección de recompensa visual, premio personal, animaciones y opción de ocultar la gamificación. Desactivarla no borra ni modifica el entrenamiento.

Las animaciones son breves y se pueden omitir. Movimiento reducido ofrece un cambio de estado estático. Nivel, condición del logro y progreso tienen etiquetas legibles; el color y el brazo no son la única forma de entenderlos. La comprobación visual deberá hacerse en ambos temas y en móvil.

## 6. Qué pasa con datos antiguos y correcciones

- Propuesta inicial: comenzar el XP al activar la función. El historial previo puede conceder logros retrospectivos de trayectoria, identificados como tales, sin disparar el nivel inicial. La política de reconocimiento histórico debe decidirse antes de implementar.
- Las importaciones históricas no generan una lluvia de puntos ni notificaciones. Importar dos veces el mismo registro no duplica nada. La elegibilidad se guarda con procedencia e identidad estable; no se deduce únicamente de una fecha que se puede editar.
- Editar o borrar un entrenamiento recalcula su contribución. Cambiar de fecha recalcula el día anterior y el nuevo, incluidos sus límites. Restaurarlo reutiliza la misma identidad.
- Una corrección puede reducir la XP calculada; la falta de actividad no la reduce. Las recompensas cosméticas ya concedidas se conservan, y no hay avisos de penalización por corregir un dato.
- En modo local todo funciona con IndexedDB. Al conectar una cuenta se combinan fuentes por identificador, no se suman dos contadores de XP. Se recalculan límites y duplicados antes de confirmar la incorporación. Los elementos cosméticos previamente obtenidos se conservan.
- La XP estimada puede verse mientras se guarda. Los desbloqueos se confirman cuando termina la escritura en el almacenamiento autoritativo del modo elegido: IndexedDB local o Firebase. Al recuperar conexión se agrupan los hitos pendientes.

## 7. Implementación sobre el proyecto actual

El código no tiene todavía entidades de gamificación ni objetivos semanales persistidos. Sus piezas reutilizables son los registros identificados de entrenamiento y actividad, las marcas de movilidad, los resúmenes mensuales y la conciliación local/nube.

| Pieza propuesta | Responsabilidad |
| --- | --- |
| `lib/gamification/rules.ts` | Umbrales, límites, hitos y versión de reglas. Recursos estáticos comunes. |
| `lib/gamification/experience.ts` | Funciones puras para elegibilidad, contribuciones y niveles. |
| `lib/gamification/achievements.ts` | Condiciones, escalones y progreso de logros. |
| `lib/gamification/goals.ts` | Objetivo semanal, periodo y ajustes explícitos. |
| `lib/gamification/rewards.ts` | Definiciones de premios y desbloqueos. |
| Componentes de gamificación | Presentación del estado derivado de la caché de React Query. |

No se suma XP directamente desde un checkbox. Cada contribución referencia su registro de origen, una revisión, un día de juego y una versión de reglas. Guardar desde dos dispositivos el mismo entrenamiento concede una contribución.

La actualización del registro y la contribución correspondiente deben ser atómicas, usando las transacciones existentes de Firebase o IndexedDB. Los resúmenes mensuales permiten leer el progreso acumulado sin descargar todos los entrenamientos. La caché parcial de React Query no sirve por sí sola para contar logros de toda la cuenta.

El día de juego se calcula con la zona horaria del diario. La agrupación histórica actual usa meses UTC: al introducir límites diarios no se puede suponer que ambos calendarios coinciden. Cambiar fechas o zona exige tratar expresamente los intervalos afectados.

Se guardan de forma privada contribuciones compactas, objetivos, versión de reglas y desbloqueos. Los dibujos, animaciones, textos y definiciones son archivos comunes. No se copia el historial en otro árbol de documentos ni se crea un documento por pulsación. El diseño exacto de esos agregados debe respetar límites de tamaño e historial paginado.

Los cambios de equilibrio se versionan. Una versión futura no recalcula silenciosamente toda la trayectoria con reglas distintas.

## 8. Orden de trabajo

1. Cerrar las reglas de XP, el tratamiento del historial y los premios de la primera entrega. Simular varios patrones de uso, no solo fuerza tres días por semana.
2. Implementar el motor puro y sus pruebas: límites, series parciales, movilidad repetida, importaciones, ediciones, borrados y fechas.
3. Integrar transacciones, resúmenes y recuperación sin conexión. Probar PC/móvil, dos pestañas locales y traslado local/nube.
4. Añadir nivel, logros básicos y la evolución visual completa del brazo, con estados en Storybook para ambos temas.
5. Añadir metas semanales y el premio personal. Comprobar el recorrido completo antes de publicarlo.

La primera versión debería incluir un sistema completo y pequeño: XP, niveles, cinco etapas del brazo, logros con escalones, una meta semanal principal y un premio personal opcional. Las clasificaciones, retos entre personas y temporadas requieren otro diseño y no forman parte de esta entrega.
