
import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

setGlobalOptions({maxInstances: 10});

const app = getApps()[0] ?? initializeApp();
const db = getFirestore(app);

type AuthorizedRole =
  | "admin"
  | "administrador"
  | "pastor"
  | "lider"
  | "líder";
/**
 * Verifica que el usuario tenga un rol autorizado.
 * @param {string} uid Identificador del usuario autenticado.
 * @return {Promise<AuthorizedRole>} El rol autorizado del usuario.
 */
async function requireAuthorizedRole(uid: string): Promise<AuthorizedRole> {
  const userSnapshot = await db.collection("users").doc(uid).get();

  if (!userSnapshot.exists) {
    throw new HttpsError(
      "permission-denied",
      "No tienes un perfil autorizado.",
    );
  }

  const role = String(userSnapshot.data()?.role ?? "")
    .trim()
    .toLowerCase();

  const allowedRoles: AuthorizedRole[] = [
    "admin",
    "administrador",
    "pastor",
    "lider",
    "líder",
  ];

  if (!allowedRoles.includes(role as AuthorizedRole)) {
    throw new HttpsError(
      "permission-denied",
      "Tu rol no tiene permiso para realizar esta operación.",
    );
  }

  return role as AuthorizedRole;
}

export const getPublicProfiles = onCall(async () => {
  try {
    const snapshot = await db.collection("publicProfiles")
      .limit(200)
      .get();

    return {
      profiles: snapshot.docs.map((document) => {
        const data = document.data();

        return {
          id: document.id,
          name: typeof data.name === "string" ? data.name : "",
          nick: typeof data.nick === "string" ? data.nick : "",
          pic: typeof data.pic === "string" ? data.pic : "",
          points: typeof data.points === "number" && Number.isFinite(data.points) ?
            data.points : 0,
        };
      }),
    };
  } catch {
    throw new HttpsError(
      "internal",
      "No se pudieron consultar los perfiles públicos.",
    );
  }
});

export const getPrivateMembers = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Debes iniciar sesión.",
    );
  }

  await requireAuthorizedRole(request.auth.uid);

  try {
    const snapshot = await db.collection("members")
      .limit(200)
      .get();

    return {
      members: snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })),
    };
  } catch {
    throw new HttpsError(
      "internal",
      "No se pudieron consultar las fichas de los jóvenes.",
    );
  }
});

/**
 * Crea una reunión de asistencia.
 */
export const createAttendanceMeeting = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Debes iniciar sesión.",
    );
  }

  await requireAuthorizedRole(request.auth.uid);

  const meetingName = String(request.data?.name ?? "").trim();
  const meetingDate = String(request.data?.date ?? "").trim();

  if (!meetingName || !meetingDate) {
    throw new HttpsError(
      "invalid-argument",
      "Debes indicar el nombre y la fecha de la reunión.",
    );
  }

  const meeting = await db.collection("attendance").add({
    name: meetingName,
    date: meetingDate,
    createdBy: request.auth.uid,
    createdAt: new Date().toISOString(),
    participants: [],
  });

  return {
    success: true,
    meetingId: meeting.id,
  };
});
