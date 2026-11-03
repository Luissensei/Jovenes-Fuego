import {createHash} from "node:crypto";
import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";

setGlobalOptions({maxInstances: 10});

const app = getApps()[0] ?? initializeApp();
const db = getFirestore(app);

type AuthorizedRole = "admin" | "administrador" | "pastor" | "lider" | "líder";

function text(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.trim().replace(/\u0000/g, "").slice(0, maxLength)
    : "";
}

async function requireAuthorizedRole(uid: string): Promise<AuthorizedRole> {
  const userSnapshot = await db.collection("users").doc(uid).get();
  if (!userSnapshot.exists) {
    throw new HttpsError("permission-denied", "No tienes un perfil autorizado.");
  }

  const role = String(userSnapshot.data()?.role ?? "").trim().toLowerCase();
  const allowed: AuthorizedRole[] = ["admin", "administrador", "pastor", "lider", "líder"];
  if (!allowed.includes(role as AuthorizedRole)) {
    throw new HttpsError("permission-denied", "Tu rol no tiene permiso para esta operación.");
  }
  return role as AuthorizedRole;
}

async function requireAdminOrPastor(uid: string): Promise<AuthorizedRole> {
  const role = await requireAuthorizedRole(uid);
  if (role !== "admin" && role !== "administrador" && role !== "pastor") {
    throw new HttpsError("permission-denied", "Esta operación está reservada para administración y pastoral.");
  }
  return role;
}

export const getPublicProfiles = onCall(async () => {
  try {
    const snapshot = await db.collection("publicProfiles").limit(200).get();
    return {
      profiles: snapshot.docs.map((document) => {
        const data = document.data();
        const points = Number(data.points ?? data.puntos ?? 0);
        return {
          id: document.id,
          name: typeof data.name === "string" ? data.name : "",
          nick: typeof data.nick === "string" ? data.nick : "",
          pic: typeof data.pic === "string" ? data.pic : "",
          points: Number.isFinite(points) && points >= 0 ? points : 0,
        };
      }),
    };
  } catch {
    throw new HttpsError("internal", "No se pudieron consultar los perfiles públicos.");
  }
});

export const getPrivateMembers = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAdminOrPastor(request.auth.uid);

  try {
    const snapshot = await db.collection("members").limit(500).get();
    return {
      members: snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })),
    };
  } catch {
    throw new HttpsError("internal", "No se pudieron consultar las fichas de los jóvenes.");
  }
});

export const adminUpdateMember = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAdminOrPastor(request.auth.uid);

  const memberId = text(request.data?.memberId, 150);
  const rawPatch = request.data?.patch;
  if (!memberId || typeof rawPatch !== "object" || rawPatch === null) {
    throw new HttpsError("invalid-argument", "La ficha del joven no es válida.");
  }

  const source = rawPatch as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  const limits: Record<string, number> = {
    name: 120, nick: 60, phone: 40, from: 120, bd: 20, ap: 120,
    br: 120, mn: 120, nt: 1000, con: 120, dis: 120, pic: 1500,
  };

  for (const [field, max] of Object.entries(limits)) {
    if (source[field] !== undefined) {
      patch[field] = text(source[field], max);
    }
  }
  for (const field of ["ac", "nopub"]) {
    if (source[field] !== undefined) {
      if (typeof source[field] !== "boolean") {
        throw new HttpsError("invalid-argument", "Uno de los campos booleanos no es válido.");
      }
      patch[field] = source[field];
    }
  }

  if (Object.keys(patch).length === 0) {
    throw new HttpsError("invalid-argument", "No hay cambios válidos para guardar.");
  }
  if (patch.name !== undefined && String(patch.name).trim().length < 2) {
    throw new HttpsError("invalid-argument", "El nombre debe tener al menos 2 caracteres.");
  }
  if (patch.pic && !/^https:\/\//i.test(String(patch.pic))) {
    throw new HttpsError("invalid-argument", "La foto debe ser una dirección HTTPS.");
  }

  const memberRef = db.collection("members").doc(memberId);
  const memberSnapshot = await memberRef.get();
  if (!memberSnapshot.exists) {
    throw new HttpsError("not-found", "No se encontró el joven seleccionado.");
  }
  await memberRef.set(patch, {merge: true});

  const publicRef = db.collection("publicProfiles").doc(memberId);
  const publicSnapshot = await publicRef.get();
  if (publicSnapshot.exists) {
    const publicPatch: Record<string, string> = {};
    if (typeof patch.name === "string") publicPatch.name = patch.name;
    if (typeof patch.nick === "string") publicPatch.nick = patch.nick;
    if (typeof patch.pic === "string") publicPatch.pic = patch.pic;
    if (Object.keys(publicPatch).length > 0) {
      await publicRef.set(publicPatch, {merge: true});
    }
  }
  return {success: true, memberId};
});

export const getPublicWeeklyActivities = onCall(async () => {
  try {
    const snapshot = await db.collection("weeklyActivities").limit(80).get();
    const activities = snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        title: text(data.title, 120),
        description: text(data.description, 1200),
        date: text(data.date, 20),
        time: text(data.time, 20),
        location: text(data.location, 120),
        published: data.published === true,
      };
    }).filter((item) => item.published)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    return {activities};
  } catch {
    throw new HttpsError("internal", "No se pudieron consultar las actividades.");
  }
});

export const adminListWeeklyActivities = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAdminOrPastor(request.auth.uid);
  const snapshot = await db.collection("weeklyActivities").limit(100).get();
  const activities = snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      title: text(data.title, 120),
      description: text(data.description, 1200),
      date: text(data.date, 20),
      time: text(data.time, 20),
      location: text(data.location, 120),
      published: data.published === true,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
  return {activities};
});

export const adminSaveWeeklyActivity = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAdminOrPastor(request.auth.uid);

  const data = request.data ?? {};
  const title = text(data.title, 120);
  const description = text(data.description, 1200);
  const date = text(data.date, 20);
  const time = text(data.time, 10);
  const location = text(data.location, 120);
  const published = data.published === true;
  const id = text(data.id, 150);

  if (title.length < 3 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpsError("invalid-argument", "Indica un título y una fecha válidos.");
  }
  if (time && !/^\d{2}:\d{2}$/.test(time)) {
    throw new HttpsError("invalid-argument", "La hora no tiene un formato válido.");
  }

  const ref = id
    ? db.collection("weeklyActivities").doc(id)
    : db.collection("weeklyActivities").doc();
  const previous = id ? await ref.get() : null;
  if (id && !previous?.exists) {
    throw new HttpsError("not-found", "No se encontró la actividad que intentas editar.");
  }

  await ref.set({
    title, description, date, time, location, published,
    updatedAt: new Date().toISOString(),
    updatedBy: request.auth.uid,
    ...(previous?.exists ? {} : {createdAt: new Date().toISOString()}),
  }, {merge: true});
  return {success: true, id: ref.id};
});

export const submitPublicPrayerRequest = onCall(async (request) => {
  const message = text(request.data?.message, 1200);
  const requester = text(request.data?.requester, 80) || "Anónimo";
  const category = text(request.data?.category, 50) || "General";
  if (message.length < 8) {
    throw new HttpsError("invalid-argument", "Escribe una petición de al menos 8 caracteres.");
  }

  const ip = String(request.rawRequest.ip ?? "unknown").slice(0, 100);
  const day = new Date().toISOString().slice(0, 10);
  const key = createHash("sha256").update(ip + "|" + day).digest("hex");
  const rateRef = db.collection("publicPrayerRateLimits").doc(key);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateRef);
    const count = Number(snapshot.data()?.count ?? 0);
    if (count >= 3) {
      throw new HttpsError("resource-exhausted", "Ya se alcanzó el límite diario de peticiones desde esta conexión.");
    }
    transaction.set(rateRef, {
      count: FieldValue.increment(1),
      day,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    }, {merge: true});
  });

  const ref = db.collection("publicPrayerRequests").doc();
  await ref.set({
    requester,
    category,
    message,
    status: "Pendiente",
    createdAt: new Date().toISOString(),
    source: "portal-joven",
  });
  return {success: true, id: ref.id};
});

export const adminGetPrayerRequests = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAdminOrPastor(request.auth.uid);

  const snapshot = await db.collection("publicPrayerRequests").limit(200).get();
  const petitions = snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      requester: text(data.requester, 80),
      category: text(data.category, 50),
      message: text(data.message, 1200),
      status: text(data.status, 30),
      createdAt: text(data.createdAt, 40),
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {petitions};
});

export const adminUpdatePrayerStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAdminOrPastor(request.auth.uid);
  const id = text(request.data?.id, 150);
  const status = text(request.data?.status, 30);
  if (!id || !["Pendiente", "En oración", "Atendida"].includes(status)) {
    throw new HttpsError("invalid-argument", "El estado de la petición no es válido.");
  }
  await db.collection("publicPrayerRequests").doc(id).update({
    status,
    updatedAt: new Date().toISOString(),
    updatedBy: request.auth.uid,
  });
  return {success: true};
});

export const getPublicHallOfFame = onCall(async () => {
  try {
    const [profileSnapshot, attendanceSnapshot] = await Promise.all([
      db.collection("publicProfiles").limit(200).get(),
      db.collection("attendance").limit(1000).get(),
    ]);

    const profiles = profileSnapshot.docs.map((document) => {
      const data = document.data();
      const points = Number(data.points ?? data.puntos ?? 0);
      return {
        id: document.id,
        name: text(data.name, 100) || "Joven",
        nick: text(data.nick, 50),
        pic: text(data.pic, 1500),
        points: Number.isFinite(points) && points >= 0 ? points : 0,
      };
    });

    const publicIds = new Set(profiles.map((profile) => profile.id));
    const attendanceCounts = new Map<string, number>();
    attendanceSnapshot.docs.forEach((meeting) => {
      const participants = meeting.data().participants;
      if (!Array.isArray(participants)) return;
      participants.forEach((participant) => {
        if (typeof participant === "object" && participant !== null &&
          typeof participant.memberId === "string" &&
          participant.status === "Presente" && publicIds.has(participant.memberId)) {
          const id = participant.memberId;
          attendanceCounts.set(id, (attendanceCounts.get(id) ?? 0) + 1);
        }
      });
    });

    const topPlayers = [...profiles].filter((item) => item.points > 0)
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "es"))
      .slice(0, 3);
    const faithful = profiles.map((item) => ({
      id: item.id, name: item.name, nick: item.nick, pic: item.pic,
      attendances: attendanceCounts.get(item.id) ?? 0,
    })).filter((item) => item.attendances > 0)
      .sort((a, b) => b.attendances - a.attendances || a.name.localeCompare(b.name, "es"))
      .slice(0, 10);

    return {topPlayers, faithful};
  } catch {
    throw new HttpsError("internal", "No se pudo preparar la clasificación pública.");
  }
});

export const createAttendanceMeeting = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAuthorizedRole(request.auth.uid);

  const meetingName = text(request.data?.name, 100);
  const meetingDate = text(request.data?.date, 20);
  if (!meetingName || !/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) {
    throw new HttpsError("invalid-argument", "Debes indicar un nombre y fecha válidos.");
  }

  const meeting = await db.collection("attendance").add({
    name: meetingName,
    date: meetingDate,
    createdBy: request.auth.uid,
    createdAt: new Date().toISOString(),
    participants: [],
  });
  return {success: true, meetingId: meeting.id};
});
