# Historial por fechas y estado parcial

Implementación local del 26 de octubre de 2026.

## Lectura

`PagedCloudRepository` mantiene separados el estado de trabajo y los registros históricos. Al abrir la cuenta carga configuración, rutinas, tramos, sesiones activas, resúmenes mensuales y el mes actual. Si hay un entrenamiento activo antiguo, carga también su mes. Las referencias anteriores de los ejercicios de las rutinas y las series vinculadas a un entrenamiento se obtienen por ID, sin descargar todos los meses intermedios.

Los detalles se consultan por `historyDate`, con límites de mes y cursores de fecha e ID, en bloques de 100 documentos. Se usa un índice de campo simple de Firestore, no un índice compuesto que haya que desplegar por separado. Calendario, volumen semanal, gráficas e historiales solicitan su intervalo y muestran carga o error antes de presentar cálculos de ese intervalo. Los meses ya visitados permanecen en la caché de la sesión.

Los totales de la cuenta, las semanas realizadas, la siguiente rutina de una rotación y el selector de ejercicios usan resúmenes mensuales. Cuando un mes está descargado, se recalcula desde el estado local para reflejar las ediciones pendientes. Los resúmenes se actualizan junto a los registros en una transacción. Si cambia la revisión de la cuenta mientras se preparan, se vuelven a leer los datos afectados y se recalculan antes de confirmar.

`AppState.history` describe qué está cargado y contiene esos resúmenes. Es información de lectura del cliente: `stateRecords` no la escribe como parte de la cuenta y la copia exportada la excluye. Una ausencia en un estado parcial no equivale a un borrado: solo se envían diferencias entre la base conocida y los cambios del usuario.

## Cuenta completa a petición

La preparación inicial del formato, las copias de seguridad, las importaciones, la reconciliación de cambios pendientes después de recargar, la restauración de la papelera y la selección explícita de «Todo» pueden requerir una lectura completa. La exportación no descarga un JSON parcial como si fuera una copia de la cuenta. La restauración comprueba colisiones con los registros que no estaban visibles.

## Actualización del formato

El puntero existente `appState/records-v1` pasa a `schema: 2` y señala otra colección privada del mismo usuario. La preparación copia los registros, añade fechas consultables y resúmenes, comprueba valores, identificadores, fechas y número de registros, y solo entonces cambia el puntero mediante una transacción. Si la cuenta cambió durante la preparación, no activa la copia. La colección previa y el documento original permanecen como recuperación; no se ejecuta ninguna plantilla de planes ni se sustituyen datos del usuario.

Una aplicación antigua no puede escribir usando el puntero anterior: su comprobación de colección detecta el cambio y pide actualizar. Todo sigue bajo `users/{uid}` y las mismas reglas de acceso del propietario.

## Responsabilidades

- `history-summary.ts`: agregados mensuales y combinación con datos locales completos del mes.
- `paged-cloud-repository.ts`: lectura por cursores, preparación del formato y escrituras concurrentes.
- `persistence.ts`: estado optimista, caché, cola de cambios y resolución de conflictos.
- `history-source.tsx`: solicitud de intervalos desde React y estados de carga/error.
- `mobility-history.ts`: agrupar las marcas originales por día y rutina, sin inventar duración ni intensidad.
- `use-today-session.ts` y `use-plan-editor.ts`: coordinación de las vistas.
- `today-session.ts` y `plan-editing.ts`: transformaciones comprobables sin React.
- `components/today/` y `components/plan/`: presentación de ejercicios, calentamiento, semana, rutinas, tramos y su editor.

## Verificación

Las pruebas de lógica cubren cargas parciales, cursores, borradores de otros meses, borrados y cambios de fecha, series vinculadas fuera del intervalo, fallo de verificación de la copia y reintentos ante cambios concurrentes. El emulador oficial ejecuta el adaptador real con consultas por fechas y dos clientes, sin escribir datos de prueba en la cuenta del usuario.

En Chrome personal con datos en memoria, a 390 px: calendario con movilidad, detalle del día, marcado desde el editor, actualización del historial y scroll del diálogo sin desbordamiento horizontal. Hoy conserva el marcado de una serie y muestra el resumen parcial con una serie realizada. El control local volvió a desactivarse antes del recorrido de Plan y del cambio de tema; esos recorridos, lectores de pantalla y móvil físico siguen pendientes.
