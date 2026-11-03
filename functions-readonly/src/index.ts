import {getApps, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {setGlobalOptions} from "firebase-functions";
import {HttpsError, onCall} from "firebase-functions/v2/https";

setGlobalOptions({maxInstances: 5, region: "us-central1"});

if (getApps().length === 0) initializeApp();
const db = getFirestore();

function safeText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.trim().replace(/\u0000/g, "").slice(0, maxLength)
    : "";
}

async function loadVisiblePublicProfiles() {
  const [membersSnapshot, publicSnapshot] = await Promise.all([
    db.collection("members").limit(500).get(),
    db.collection("publicProfiles").limit(500).get(),
  ]);

  const membersById = new Map(
    membersSnapshot.docs.map((document) => [document.id, document.data()]),
  );
  const publicById = new Map(
    publicSnapshot.docs.map((document) => [document.id, document.data()]),
  );
  const ids = new Set([...membersById.keys(), ...publicById.keys()]);

  return Array.from(ids).flatMap((id) => {
    const memberData = membersById.get(id);
    const publicData = publicById.get(id);

    // Si cualquiera de las fichas indica que no se publique, se respeta.
    if (memberData?.nopub === true || publicData?.nopub === true) return [];

    const name = safeText(publicData?.name ?? memberData?.name, 120);
    const nick = safeText(publicData?.nick ?? memberData?.nick, 60);
    if (!name && !nick) return [];

    const rawPoints = Number(
      publicData?.points ?? publicData?.puntos ??
      memberData?.points ?? memberData?.puntos ?? 0,
    );
    const rawImage = safeText(publicData?.pic ?? memberData?.pic, 1500);

    // Solo se exponen campos expresamente públicos.
    return [{
      id,
      name,
      nick,
      pic: rawImage.startsWith("https://") ? rawImage : "",
      points: Number.isFinite(rawPoints) && rawPoints >= 0 ? rawPoints : 0,
    }];
  });
}

/** Lee únicamente el perfil de aplicación del usuario autenticado. */
export const readonlyGetMyApplicationProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  try {
    const snapshot = await db.collection("users").doc(request.auth.uid).get();
    if (!snapshot.exists) {
      throw new HttpsError(
        "permission-denied",
        "No existe un perfil de aplicación para esta cuenta.",
      );
    }

    const data = snapshot.data() ?? {};
    const role = safeText(data.role, 40).toLowerCase();
    const allowedRoles = [
      "admin", "administrador", "pastor", "lider", "líder", "user",
    ];
    if (!allowedRoles.includes(role)) {
      throw new HttpsError(
        "permission-denied",
        "El perfil no tiene un rol reconocido.",
      );
    }

    return {
      profile: {
        name: safeText(data.name, 120),
        user: safeText(data.user, 120),
        role,
      },
    };
  } catch (cause) {
    if (cause instanceof HttpsError) throw cause;
    throw new HttpsError("internal", "No se pudo consultar el perfil de aplicación.");
  }
});

/** Devuelve solo nombre, apodo, foto segura y puntos de los perfiles públicos. */
export const readonlyGetPublicProfiles = onCall(async () => {
  try {
    return {profiles: await loadVisiblePublicProfiles()};
  } catch {
    throw new HttpsError("internal", "No se pudieron consultar los perfiles públicos.");
  }
});

/** Devuelve únicamente actividades publicadas. */
export const readonlyGetPublicWeeklyActivities = onCall(async () => {
  try {
    const snapshot = await db.collection("weeklyActivities").limit(80).get();
    const activities = snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        title: safeText(data.title, 120),
        description: safeText(data.description, 1200),
        date: safeText(data.date, 20),
        time: safeText(data.time, 20),
        location: safeText(data.location, 120),
        published: data.published === true,
      };
    }).filter((activity) => activity.published)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    return {activities};
  } catch {
    throw new HttpsError("internal", "No se pudieron consultar las actividades.");
  }
});

/** Calcula el salón público sin alterar los puntos ni las asistencias. */
export const readonlyGetPublicHallOfFame = onCall(async () => {
  try {
    const [profiles, meetings] = await Promise.all([
      loadVisiblePublicProfiles(),
      db.collection("attendanceMeetings").orderBy("date", "desc").limit(1001).get(),
    ]);

    const publicIds = new Set(profiles.map((profile) => profile.id));
    const attendanceCounts = new Map<string, number>();

    meetings.docs.slice(0, 1000).forEach((meeting) => {
      const participants = meeting.data().participants;
      if (!Array.isArray(participants)) return;

      participants.forEach((participant) => {
        if (
          typeof participant === "object" &&
          participant !== null &&
          typeof participant.memberId === "string" &&
          participant.status === "Presente" &&
          publicIds.has(participant.memberId)
        ) {
          const id = participant.memberId;
          attendanceCounts.set(id, (attendanceCounts.get(id) ?? 0) + 1);
        }
      });
    });

    const topPlayers = [...profiles]
      .filter((profile) => profile.points > 0)
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "es"))
      .slice(0, 3);

    const faithful = profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      nick: profile.nick,
      pic: profile.pic,
      attendances: attendanceCounts.get(profile.id) ?? 0,
    })).filter((profile) => profile.attendances > 0)
      .sort((a, b) =>
        b.attendances - a.attendances || a.name.localeCompare(b.name, "es"),
      )
      .slice(0, 10);

    return {
      topPlayers,
      faithful,
      attendanceLimited: meetings.size > 1000,
    };
  } catch {
    throw new HttpsError("internal", "No se pudo preparar la clasificación pública.");
  }
});
