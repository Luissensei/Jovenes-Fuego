# Despliegue seguro de Firebase Staging

El portal juvenil, el ranking, la asistencia y otros módulos consumen Cloud Functions. El despliegue de Vercel compila el frontend, pero no publica las funciones de Firebase; ambos despliegues son procesos distintos.

## Proyecto permitido

El flujo automatizado de este repositorio solo ejecuta:

```bash
firebase deploy --only functions --project jovenes-de-fuego-staging --non-interactive
```

No despliega Hosting, Firestore Rules, Storage Rules ni ningún recurso de producción.

## Configuración necesaria una sola vez

1. En Google Cloud/Firebase, crea una cuenta de servicio dedicada exclusivamente al despliegue del proyecto `jovenes-de-fuego-staging`.
2. Concede a esa cuenta los permisos de despliegue que requiere Cloud Functions y la capacidad de actuar como la cuenta de ejecución configurada para las funciones. No reutilices credenciales de producción.
3. Genera una clave JSON de esa cuenta y guárdala como secreto de GitHub con el nombre exacto:
   `FIREBASE_SERVICE_ACCOUNT_JOVENES_DE_FUEGO_STAGING`.
4. En GitHub abre Settings → Secrets and variables → Actions y crea el secreto. No pegues la clave en el código, en Vercel, en un archivo del repositorio ni en el chat.
5. En Settings → Environments, crea el entorno `firebase-staging`. Añade allí el secreto (o mantenlo como secreto de Actions, según la política del repositorio).

## Ejecutar el despliegue

1. Abre la pestaña Actions del repositorio.
2. Selecciona **Deploy Firebase Staging Functions**.
3. Pulsa **Run workflow** y elige la rama `fix/quality-final`.
4. Comprueba que las etapas de lint y build terminen correctamente antes del despliegue.
5. Verifica que la salida confirme el proyecto `jovenes-de-fuego-staging`.

El flujo no se inicia automáticamente con un push: requiere una ejecución manual.

## Comprobar el portal juvenil

Después de desplegar:

- Abre la URL de Staging y entra en Acceso Juvenil.
- Comprueba que se muestran los perfiles públicos.
- Confirma que un perfil marcado con `nopub: true` no aparezca.
- Prueba el botón Reintentar apagando y restaurando temporalmente la conexión.
- Revisa Cloud Functions logs en el proyecto Staging si aparece un error `functions/internal`.

La función `getPublicProfiles` es una Callable Function en la región `us-central1` salvo que se cambie explícitamente la variable `VITE_FIREBASE_FUNCTIONS_REGION`. La región del frontend debe coincidir con la región en que se despliegue la función.

## Advertencias

- No despliegues reglas de Firestore con el objetivo de solucionar una Callable Function ausente.
- No uses la cuenta de servicio de producción.
- No habilites el flujo hasta confirmar que la clave pertenece al proyecto Staging.
- El despliegue de funciones y la configuración de reglas son operaciones separadas.
