# Revisión de arquitectura y datos · 0.5.0

26 de octubre de 2026. Alcance: organización React, ciclo de cuenta, búsqueda, medidas, temas e importación. La app usa las convenciones de Next con vinext y exportación estática para GitHub Pages. No tiene un servidor Next desplegado.

## Organización

`app/page.tsx` pasa de 992 líneas a una entrada de cinco líneas. Carga `components/workout-app.tsx`, que coordina navegación, descanso y avisos. Las vistas están en `components/views/`; el editor de rutinas, en `components/plan/`; las imágenes y demostraciones, en `components/exercises/`.

`hooks/use-workout-account.ts` posee el ciclo de autenticación y persistencia. El shell no crea repositorios ni configura sus listeners. La lógica de registros, conflictos y almacenamiento sigue en `lib/`; los componentes no escriben directamente en Firestore. La caché local continúa sin ser fuente de verdad.

Las vistas secundarias se cargan con `React.lazy` y `Suspense`. El temporizador permanece montado para continuar al cambiar de sección. Se mantiene la navegación de una aplicación estática: dividir componentes no requiere inventar rutas de servidor ni perder el descanso al navegar.

## Hallazgos y cambios

| Hallazgo | Corrección |
| --- | --- |
| Vistas y editores definidos en la entrada de la app | Módulos independientes con importaciones explícitas; helpers internos privados. |
| Autenticación mezclada con presentación | Hook de cuenta separado; estados y acciones retornados al shell. |
| Un cierre de sesión fallido invalidaba los callbacks de sincronización | La secuencia cambia al recibir un cambio de identidad real, no antes de intentar cerrar sesión. |
| El registro de caminatas por herramientas rellenaba RPE y distancia sin recibirlos | Valida solo los datos aportados; no inventa esos campos, rechaza callbacks de una cuenta anterior y anuncia estado pendiente en vez de guardado remoto. |
| Errores de la carga asíncrona del usuario podían quedar fuera del catch de inicialización | Captura dentro del callback, estado visible de error y edición bloqueada. |
| Cambiar de identidad podía conservar temporalmente el estado anterior | Se limpia la vista al comenzar la carga de la nueva cuenta. |
| Todas las vistas secundarias se importaban al arrancar | Carga bajo demanda con estado de espera. |
| Un fallo al cargar una vista podía desmontar toda la app | Error boundary por vista, con recuperación y navegación disponibles en el shell. |
| Fecha de Hoy calculada al importar el módulo | Se calcula al renderizar la vista, no al cargar el bundle. |
| Una actualización podía recargar automáticamente un formulario en edición | El aviso se muestra en todas las vistas; la recarga requiere pulsar Actualizar. El service worker y el tema del sistema tienen hooks propios. |
| El lint omitía componentes, hooks y stories | El comando y CI incluyen esos directorios; CI comprueba también TypeScript. |
| Suscripciones de móvil y carrusel reflejadas mediante efectos y estado duplicado | `useSyncExternalStore`, con limpieza de ambos eventos del carrusel. |
| Búsqueda sobre descripciones largas | Solo nombres y atributos; exige todos los conceptos, permite erratas y ordena por relevancia. |
| Búsqueda costosa en la ruta de escritura del input | `useDeferredValue` mantiene la escritura prioritaria; resultados virtualizados. |
| Navegación alfabética compite con relevancia al buscar | Se mantiene la guía en exploración; al escribir se muestran resultados ordenados sin guía alfabética. |
| Lista de selección en Hoy sin referencias visuales | Miniaturas junto al nombre y estado; fallback cuando no hay imagen. |
| Campos numéricos opcionales dependían del tratamiento nativo de decimales | Texto con teclado decimal, parseo explícito de coma/punto y vacío como ausencia. |
| Panel de semana imponía tokens oscuros | Usa superficie, texto y borde del tema activo. |
| Importación externa inexistente | CSV de entrenamientos y medidas de Hevy, vista previa compartida con Base y IDs estables para reimportar. |

Los wrappers genéricos de `components/ui` conservan roles ARIA válidos en lugar de cambiar su contrato DOM solo para satisfacer `prefer-tag-over-role`. Hay excepciones acotadas para esa regla, para el wrapper Label cuyo vínculo lo aporta el consumidor y para PaginationLink cuyo contenido llega por props. No se desactivan los controles de teclado, interacción o contraste. La entrega de la instancia externa de Embla a su propietario conserva un efecto explícito; sus valores derivados usan una suscripción.

## Hevy

En Perfil → Cuenta y datos → Copias de seguridad aparece **Importar CSV de Hevy**. Desde Hevy se exporta en Perfil → Ajustes → Exportar e importar datos → Exportar datos. Se lee el archivo en el navegador y solo la confirmación de la vista previa añade los registros a Base.

Se admiten las cabeceras de Hevy para entrenamientos y para peso/cintura. Se convierten unidades declaradas por cabecera: libras a kg, pulgadas a cm y millas a km. CSV con BOM, CRLF, campos entrecomillados, comas internas, saltos de línea y comillas escapadas. Las fechas sin zona usan la zona local del dispositivo; se admiten fechas ISO y meses en español/inglés. Una fecha no reconocida o un número inválido bloquea el archivo completo con un error, evitando una importación parcial silenciosa.

Se conservan series, cargas, repeticiones, aproximaciones, notas y duración de sesión. El RPE, las referencias de superserie y los valores de tiempo/distancia quedan en notas; no se convierten a un RIR inventado. El editor muestra el RIR importado como no registrado. Los tipos especiales de serie cuentan como trabajo y se señalan en notas y en la vista previa. Los ejercicios conservan el nombre exportado: no se asigna una imagen por una coincidencia aproximada que podría ser incorrecta.

El CSV no importa ni sustituye rutinas o tramos. Peso y cintura son las medidas compatibles; otros tipos se anuncian como no importados. Los límites son 20 MB, 100.000 filas y los límites por registro de la importación de Base. Repetir un archivo no duplica sus IDs. No se detectan como iguales registros manuales preexistentes con IDs distintos.

openGym ofrece además importación mediante API de Hevy Pro. Esa vía, la importación de rutinas y un mapeo verificado de ejercicios por ID quedan fuera de esta implementación; no se pide ni almacena una API key.

## Límites de la revisión

La primera carga de Firebase aún reúne el historial completo por páginas; las actualizaciones posteriores son incrementales. La carga inicial por rangos de fechas requiere adaptar estadísticas y calendario y sigue pendiente. No se presenta la división de archivos como solución a ese límite.

Las comprobaciones visuales usan Chrome personal y datos de demostración en memoria. No se han escrito entrenamientos o medidas ficticias en la cuenta ni se ha probado un dispositivo móvil físico.

## Dependencias y verificación

Se actualizan React/React DOM/RSC a 19.3.1, vinext de beta a 1.3.1, Firebase a 12.19.0 y sus herramientas compatibles. Shadcn pasa a desarrollo, igual que Storybook. El lockfile fija también correcciones transitivas compatibles de gRPC, undici y fflate mediante overrides explícitos: los paquetes padre fijaban versiones afectadas incluso al actualizar. La comprobación del adaptador real de Firestore se repite con el SDK actualizado. `npm audit` devuelve cero vulnerabilidades conocidas en esta instalación; no equivale a una garantía sobre futuras publicaciones.

- 112 pruebas de lógica y tres pruebas del adaptador de producción con el emulador oficial de Firestore, todas correctas.
- TypeScript y lint de aplicación, componentes, hooks y stories sin errores ni avisos.
- Exportación estática para `/workout-tracker/` y build de Storybook correctos. Permanecen avisos de tamaño del catálogo y sourcemaps de plugins; no impiden el build.
- Chrome personal: medida `72,6` guardada en memoria después de tocar cintura sin escribir; consulta `press hombros máquina` y errata `press hombor maquina` con dos resultados pertinentes y fotos cargadas; añadir un ejercicio y verlo con miniatura en la rutina.
- Panel de semana claro y oscuro, con estilos computados de cada tema y sin desbordamiento a 320 px. Búsqueda comprobada a 390 px.
- Vista previa de Hevy: importa un entrenamiento de demostración y al repetirlo muestra cero nuevos, un duplicado y confirmación desactivada. El parser se prueba con CSV; la selección de archivo por la extensión no se ha automatizado.
- Recorrido de las cinco vistas y el perfil de la app conectada a Firebase; confirmación de carga de las vistas diferidas y consola sin errores. El temporizador continúa al salir y volver; se deja detenido y reiniciado. No se cambia el tema de la cuenta.
- El selector de Hoy carga sus dos fotos de demostración en oscuro. Un fallo provocado en Storybook muestra el panel de recuperación del error boundary, conservando el resto de la página.

## Gate de interfaz antislop

Dirección vigente: diario deportivo, ENERGY 2 / RHYTHM 2 / MOTION 2. Alcance de este gate: interfaz y textos modificados en esta revisión.

- R-01 PASS: no se añaden degradados; el panel usa los tokens documentados del tema.
- R-02 PASS: el copy nuevo no incorpora rayas editoriales largas.
- R-03 PASS: panel a 320 px y búsqueda a 390 px sin desbordamiento horizontal.
- R-04 PASS: los iconos representan importar, seleccionar y entrenar; no se añaden ornamentos.
- R-05 PASS: catálogo, formulario de medida y panel mantienen composiciones distintas por contenido.
- R-06 PASS: tipografía del sistema y cifras tabulares existentes, sin nueva familia decorativa.
- R-07 PASS: no se añaden texturas ni patrones de fondo.
- R-08 PASS: las flechas de la guía de exportación expresan un recorrido real.
- R-09 PASS: no se añaden badges promocionales.
- R-10 PASS: no se añade glassmorphism.
- R-11 PASS: se mantienen filas y campos rectangulares; no se convierten en cápsulas.
- R-12 PASS: no se añaden sombras a los resultados.
- R-13 PASS: no se añaden glows.
- R-14 PASS: lista de resultados, estado de importación y panel de semana tienen funciones diferentes.
- R-15 PASS: acciones concretas: importar CSV, revisar importación y guardar medida.
- R-16 PASS: no se añade copy promocional.
- R-17 PASS: los contadores proceden del archivo, del catálogo o de la demostración rotulada.
- R-18 PASS: no se incorporan testimonios.
- R-19 PASS: no se añade movimiento continuo; la búsqueda conserva prioridad para la escritura.
- R-20 PASS: se conserva la dirección de diario deportivo escrita en DESIGN.md.
- R-21 PASS: el panel hereda el modo elegido; las pruebas no fuerzan un tema en la cuenta.
- R-22 PASS: se usan las imágenes existentes del catálogo.
- R-23 PASS: no se crean identidad visual, avatares ni navegación nuevos.
- R-24 PASS: se mantienen los cinco destinos solicitados y se recorren en la app.
- R-25 PASS: se conservan los tokens de contraste verificados de la revisión anterior; el panel claro usa texto oscuro sobre superficie clara.
- R-26 PASS: selección, búsqueda, guardado de medida e importación se prueban; importar un duplicado queda deshabilitado con explicación.
- R-27 PASS: errores de archivo, búsqueda vacía, carga diferida y estado sin cambios tienen texto visible.
- R-28 PASS: no se añade FAQ.
- R-29 PASS: se conservan neutros y un acento cálido; no se añade paleta.
- R-30 PASS: openGym informa los formatos; la interfaz continúa siendo la de Base.
- R-31 PASS: el ajuste del panel y la jerarquía están razonados en DESIGN.md.
- R-32 PASS: se conservan inputs, botones semánticos, foco y Escape de los diálogos; las miniaturas acompañan nombres visibles.
- R-33 PASS: modificaciones realizadas en los fuentes con apply_patch; el formatter solo organiza su formato.
- R-34 PASS: se comprueban los modos claro y oscuro del panel y los diálogos mantienen el proveedor de tema.
- R-35 PASS: builds, tests y recorrido interactivo registrados arriba, con sus límites explícitos.
- R-36 PASS: no se confunde RPE con RIR ni se afirma guardado remoto antes de confirmarlo; no se atribuyen pruebas a un móvil físico.
- R-37 PASS: se conserva la dirección autorizada por el usuario y los tres diales declarados.
- R-38 PASS: los datos de demostración se rotulan y nunca se importan en Firebase para las pruebas.
- Liveliness PASS: jerarquía de cifra de semana, acento en acciones, espacio entre secciones y filas de diario coherentes con ENERGY 2 / RHYTHM 2 / MOTION 2.
- C-1 PASS: las decisiones modificadas tienen una razón documentada, sin estilos de plantilla nuevos.
- C-2 PASS: las acciones nuevas tienen comportamiento comprobado o están deshabilitadas con motivo.
- C-3 PASS: las secciones nuevas resuelven importación y revisión de datos reales.
- C-4 PASS: modos, foco y tamaños comprobados dentro del alcance indicado.
- C-5 PASS: las cifras y resultados proceden de ejecuciones o demos identificadas.

## Fuentes

- [React: estado externo](https://react.dev/reference/react/useSyncExternalStore), [carga diferida](https://react.dev/reference/react/lazy) y [prioridad de actualización](https://react.dev/reference/react/useDeferredValue).
- [Hevy: exportar datos](https://help.hevyapp.com/hc/en-us/articles/43708290987415-Exporting-Your-Data-from-Hevy).
- [openGym: importaciones](https://github.com/DuarteSantos8/openGym/blob/main/docs/DATA_IMPORTS.md) y [parser CSV](https://github.com/DuarteSantos8/openGym/blob/main/frontend/src/lib/import-csv.js), consultados como referencia de formatos y casos límite. El conversor de Base está escrito para nuestro modelo.
