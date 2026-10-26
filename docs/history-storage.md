# Historial por fechas y estado parcial

Implementación local del 26 de octubre de 2026.

## Lectura

`PagedCloudRepository` mantiene separados el estado de trabajo y los registros históricos. Al abrir la cuenta carga configuración, rutinas, tramos, sesiones activas, resúmenes mensuales y el mes actual. Si hay un entrenamiento activo antiguo, carga también su mes. Las referencias anteriores de los ejercicios de las rutinas y las series vinculadas a un entrenamiento se obtienen por ID, sin descargar todos los meses intermedios.

Los detalles se consultan por `historyDate`, con límites de mes y cursores de fecha e ID, en bloques de 100 documentos. Se usa un índice de campo simple de Firestore, no un índice compuesto que haya que desplegar por separado. Calendario, volumen semanal, gráficas e historiales solicitan su intervalo y muestran carga o error antes de presentar cálculos de ese intervalo. Los meses ya visitados permanecen en la caché de la sesión.

Los totales de la cuenta, las semanas realizadas, la siguiente rutina de una rotación y el selector de ejercicios usan resúmenes mensuales. Cuando un mes está descargado, se recalcula desde el estado local para reflejar las ediciones pendientes. Los resúmenes se actualizan junto a los registros en una transacción. Si cambia la revisión de la cuenta mientras se preparan, se vuelven a leer los datos afectados y se recalculan antes de confirmar.

### React Query: datos, lecturas y escrituras

La caché de TanStack Query es el único estado observable de la cuenta. `AccountSync` lee y actualiza esa caché; no mantiene otro `AppState`, snapshots ni suscripciones propias. React consume la consulta de cuenta con `useQuery`. Las ediciones actualizan esa consulta inmediatamente y las escrituras usan mutaciones serializadas por cuenta. El estado de guardado también se observa a través de Query.

`useHistoryMonths` comparte las cargas de intervalos con claves que incluyen cuenta y mes. Las consultas devuelven registros reconciliados, no confirmaciones booleanas. Una vez incorporados al estado de cuenta, desaparecen al dejar de tener consumidores (`gcTime: 0`), evitando conservar snapshots históricos obsoletos por mes. Los meses cargados siguen descritos en `AppState.history`; el listener aplica sus cambios remotos a la consulta de cuenta mediante conciliación con los cambios optimistas.

`AccountSync` conserva únicamente la base necesaria para la conciliación de tres vías, revisiones, conflictos y la escritura ordenada de la cola duradera de IndexedDB. No hay otro almacén externo, temporizador de sincronización ni cola paralela de mutaciones. Query serializa las escrituras; la cola duradera permite reconstruir lo pendiente al volver a abrir. Cambiar de cuenta desconecta el coordinador, cancela consultas y limpia la caché del cliente. Una respuesta tardía no puede publicar datos de la cuenta anterior.

### Uso sin cuenta

El primer acceso ofrece «Usar sin cuenta (sólo local)» y «Sincronizar con una cuenta». Se recuerda la elección. Sin cuenta, el repositorio IndexedDB guarda el diario completo bajo la clave de invitado, separada de las cachés de usuarios de Firebase. Las escrituras locales funcionan sin red y usan una transacción con conciliación: dos pestañas pueden combinar ediciones distintas y se pide resolver cambios incompatibles. BroadcastChannel avisa a las otras pestañas de los guardados.

Conectar una cuenta no publica ni reemplaza automáticamente el diario local. Si contiene datos, se carga el historial completo de la cuenta y se ofrece la revisión de importación existente. Las rutinas y la estructura del plan solo se sustituyen si se elige expresamente. Las marcas de movilidad, calentamiento y clases se incorporan sin duplicados. Las sesiones todavía en curso se conservan en el diario local. Cerrar la revisión mantiene ambos diarios separados; la copia local no se borra al conectar o cerrar sesión. En Perfil se puede exportar, conectar una cuenta o volver a la elección de acceso.


`AppState.history` describe qué está cargado y contiene esos resúmenes. Es información de lectura del cliente: `stateRecords` no la escribe como parte de la cuenta y la copia exportada la excluye. Una ausencia en un estado parcial no equivale a un borrado: solo se envían diferencias entre la base conocida y los cambios del usuario.

## Cuenta completa a petición

La preparación inicial del formato, las copias de seguridad, las importaciones, la reconciliación de cambios pendientes después de recargar, la restauración de la papelera y la selección explícita de «Todo» pueden requerir una lectura completa. La exportación no descarga un JSON parcial como si fuera una copia de la cuenta. La restauración comprueba colisiones con los registros que no estaban visibles.

## Actualización del formato

El puntero existente `appState/records-v1` pasa a `schema: 2` y señala otra colección privada del mismo usuario. La preparación copia los registros, añade fechas consultables y resúmenes, comprueba valores, identificadores, fechas y número de registros, y solo entonces cambia el puntero mediante una transacción. Si la cuenta cambió durante la preparación, no activa la copia. La colección previa y el documento original permanecen como recuperación; no se ejecuta ninguna plantilla de planes ni se sustituyen datos del usuario.

Una aplicación antigua no puede escribir usando el puntero anterior: su comprobación de colección detecta el cambio y pide actualizar. Todo sigue bajo `users/{uid}` y las mismas reglas de acceso del propietario.

## Responsabilidades

- `history-summary.ts`: agregados mensuales y combinación con datos locales completos del mes.
- `paged-cloud-repository.ts`: lectura por cursores, preparación del formato y escrituras concurrentes.
- `account-query.ts`: configuración compartida del cliente Query.
- `account-sync.ts`: conciliación, actualizaciones de Query y mutaciones de guardado con recuperación duradera.
- `account-session.ts` y `local-repository.ts`: adaptación a Firebase o IndexedDB según el modo elegido.
- `history-source.tsx`: solicitud de intervalos desde React y estados de carga/error.
- `mobility-history.ts`: agrupar las marcas originales por día y rutina, sin inventar duración ni intensidad.
- `use-today-session.ts` y `use-plan-editor.ts`: coordinación de las vistas.
- `today-session.ts` y `plan-editing.ts`: transformaciones comprobables sin React.
- `components/today/` y `components/plan/`: presentación de ejercicios, calentamiento, semana, rutinas, tramos y su editor.

## Verificación

Las pruebas de lógica cubren cargas parciales, cursores, borradores de otros meses, borrados y cambios de fecha, series vinculadas fuera del intervalo, fallo de verificación de la copia y reintentos ante cambios concurrentes. El emulador oficial ejecuta el adaptador real con consultas por fechas y dos clientes, sin escribir datos de prueba en la cuenta del usuario.

En Chrome personal con datos en memoria, a 390 px: calendario con movilidad, detalle del día, marcado desde el editor, actualización del historial y scroll del diálogo sin desbordamiento horizontal. Hoy conserva el marcado de una serie y muestra el resumen parcial con una serie realizada. El control local volvió a desactivarse antes del recorrido de Plan y del cambio de tema; esos recorridos, lectores de pantalla y móvil físico siguen pendientes.
