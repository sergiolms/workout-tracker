# Persistencia y Firebase

**Firebase es la fuente de verdad.** IndexedDB es una caché por UID de Google
para consultar los datos sin conexión. Al conectar, la app descarga el documento
de Firebase y actualiza la caché. No compara relojes para decidir qué copia subir
ni realiza escrituras remotas durante el arranque.

La migración del antiguo registro local `main` y la excepción por correo del
propietario se han eliminado. No se importan ni reinyectan planes o sesiones del
registro antiguo. Se conserva la compatibilidad de lectura de los formatos de
plan e historial que ya existen en Firebase.

Para editar se necesita haber leído Firebase. Sin conexión se muestra la caché en
modo lectura. Los cambios hechos tras la conexión se guardan provisionalmente en
local y solo se anuncian como «Sincronizado» al recibir confirmación de Firebase.
Los fallos se reintentan al recuperar conexión y cada 30 segundos.

Cada escritura usa una transacción de Firestore que comprueba la revisión
`updatedAt` leída por este dispositivo. Si otro dispositivo cambia el documento,
la escritura se rechaza y los cambios pendientes permanecen en local para poder
descargarlos. La app pide recargar la versión de Firebase; nunca sobrescribe
silenciosamente los cambios ajenos ni cambia la revisión esperada para forzar un
reintento.

Antes de sustituir la caché se guardan copias de recuperación de los estados
local y remoto en el almacén `state` de la base `base-workout`, con claves
`backup:<uid>:local:<revision>` y `backup:<uid>:cloud:<revision>`. Desde el perfil
se puede descargar una copia JSON del estado mostrado. Cerrar sesión conserva
las cachés y elimina solo los borradores de entrada rápida.

IndexedDB pertenece al navegador y al dominio: GitHub Pages, localhost y otros
alojamientos tienen bases distintas. Firebase permite trasladar la copia entre
ellos. Borrar los datos del navegador también borra esta base local.

## Configuración

1. Crea una aplicación web dentro del proyecto de Firebase.
2. Activa **Authentication → Sign-in method → Google**.
3. Incluye `sergiolms.github.io` y `localhost` en los dominios autorizados de Auth.
4. Crea una base de datos de **Cloud Firestore** (base `(default)`).
5. Completa las variables `NEXT_PUBLIC_FIREBASE_*` de `.env.local` para desarrollo.
   En GitHub Pages, configura las mismas variables en **Settings → Secrets and
   variables → Actions → Variables** y vuelve a compilar/publicar.
6. Publica `firestore.rules` con Firebase CLI (`firebase deploy --only firestore:rules`).

Los datos se guardan en `users/{uid}/appState/main`. La aplicación elimina campos
opcionales `undefined` antes de escribirlos. La inicialización usa una lectura del
servidor para distinguir una conexión real de la caché de Firestore.

## Verificación

```sh
node --test lib/*.test.mjs
GITHUB_PAGES=true PAGES_BASE_PATH=/workout-tracker NEXT_PUBLIC_BASE_PATH=/workout-tracker npm run build
```

Las pruebas cubren recuperación desde Firebase en dispositivos nuevos, cachés
obsoletas o vacías, lectura y escritura fallidas, recuperación de la conexión,
conflictos entre dos dispositivos, orden de escrituras, aislamiento de cuentas
y ausencia de importación del registro local antiguo. Para confirmar una cuenta
real, accede con ella y comprueba que el perfil indica «Sincronizado».
