# Repositorios

Cada módulo debe tener un repositorio tipado para las operaciones Firestore. Las pantallas no deben invocar directamente `getDocs`, `setDoc`, `updateDoc` o `deleteDoc`. Cada función debe tener pruebas de contrato y documentar la forma del documento actual antes de usarse.