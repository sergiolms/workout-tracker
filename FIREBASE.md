# Conectar Firebase

1. Crea una aplicación web dentro del proyecto de Firebase.
2. Activa **Authentication → Sign-in method → Anonymous**.
3. Crea una base de datos de **Cloud Firestore**.
4. Copia `.env.example` como `.env.local` y completa las seis variables `NEXT_PUBLIC_FIREBASE_*` con la configuración de la aplicación web.
5. Publica `firestore.rules` con Firebase CLI (`firebase deploy --only firestore:rules`).

La app guarda primero en IndexedDB para responder de inmediato y funcionar sin conexión. Cuando Firebase está configurado, sincroniza después el mismo estado bajo `users/{uid}/appState/main`.
