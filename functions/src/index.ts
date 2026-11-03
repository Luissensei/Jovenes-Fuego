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

function isValidDate(value: string): boolean {
  if (value.length !== 10 || value[4] !== "-" || value[7] !== "-") {
    return false;
  }
  const digits = value.slice(0, 4) + value.slice(5, 7) + value.slice(8, 10);
  if (!Array.from(digits).every((character) => character >= "0" && character <= "9")) {
    return false;
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function isValidTime(value: string): boolean {
  if (value.length !== 5 || value[2] !== ":") return false;
  const hours = Number(value.slice(0, 2));
  const minutes = Number(value.slice(3, 5));
  return Number.isInteger(hours) && Number.isInteger(minutes) &&
    hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

async function loadVisiblePublicProfiles() {
  const snapshot = await db.collection("publicProfiles").limit(200).get();
  const memberSnapshots = snapshot.docs.length > 0
    ? await db.getAll(...snapshot.docs.map((document) =>
      db.collection("members").doc(document.id),
    ))
    : [];

  return snapshot.docs.flatMap((document, index) => {
    const data = document.data();
    const memberData = memberSnapshots[index]?.data();

    // La marca de no publicación se respeta tanto en el perfil público
    // como en la ficha privada del miembro.
    if (data.nopub === true || memberData?.nopub === true) return [];

    const points = Number(data.points ?? data.puntos ?? 0);
    const image = text(data.pic, 1500);
    return [{
      id: document.id,
      name: typeof data.name === "string" ? data.name : "",
      nick: typeof data.nick === "string" ? data.nick : "",
      pic: image.startsWith("https://") ? image : "",
      points: Number.isFinite(points) && points >= 0 ? points : 0,
    }];
  });
}

export const getMyApplicationProfile = onCall(async (request) => {
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
    const role = text(data.role, 40).toLowerCase();
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
        name: text(data.name, 120),
        user: text(data.user, 120),
        role,
      },
    };
  } catch (cause) {
    if (cause instanceof HttpsError) throw cause;
    throw new HttpsError(
      "internal",
      "No se pudo consultar el perfil de aplicación.",
    );
  }
});

export const getPublicProfiles = onCall(async () => {
  try {
    return {profiles: await loadVisiblePublicProfiles()};
  } catch {
    throw new HttpsError("internal", "No se pudieron consultar los perfiles públicos.");
  }
});

export const getPrivateMembers = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const role = await requireAuthorizedRole(request.auth.uid);

  try {
    const snapshot = await db.collection("members").limit(500).get();
    const members = snapshot.docs.map((document) => {
      const data = document.data();
      if (role === "lider" || role === "líder") {
        // Los líderes solo necesitan datos mínimos para identificar y pasar lista.
        return {
          id: document.id,
          name: text(data.name, 120),
          nick: text(data.nick, 60),
          pic: text(data.pic, 1500).startsWith("https://")
            ? text(data.pic, 1500)
            : "",
        };
      }
      return {id: document.id, ...data};
    });

    return {members};
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
  const publicRef = db.collection("publicProfiles").doc(memberId);
  const [memberSnapshot, publicSnapshot] = await Promise.all([
    memberRef.get(),
    publicRef.get(),
  ]);
  if (!memberSnapshot.exists) {
    throw new HttpsError("not-found", "No se encontró el joven seleccionado.");
  }

  const batch = db.batch();
  batch.set(memberRef, patch, {merge: true});

  if (publicSnapshot.exists) {
    const publicPatch: Record<string, string | boolean> = {};
    if (typeof patch.name === "string") publicPatch.name = patch.name;
    if (typeof patch.nick === "string") publicPatch.nick = patch.nick;
    if (typeof patch.pic === "string") publicPatch.pic = patch.pic;
    if (typeof patch.nopub === "boolean") publicPatch.nopub = patch.nopub;
    if (Object.keys(publicPatch).length > 0) {
      batch.set(publicRef, publicPatch, {merge: true});
    }
  }

  await batch.commit();
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

  if (title.length < 3 || !isValidDate(date)) {
    throw new HttpsError("invalid-argument", "Indica un título y una fecha real válidos.");
  }
  if (time && !isValidTime(time)) {
    throw new HttpsError("invalid-argument", "La hora debe estar entre 00:00 y 23:59.");
  }
  if (typeof data.published !== "boolean") {
    throw new HttpsError("invalid-argument", "Indica si la actividad debe publicarse.");
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
    if (count >= 50) {
      throw new HttpsError("resource-exhausted", "Esta conexión alcanzó el límite diario de 50 peticiones de oración.");
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
    const [profiles, attendanceSnapshot] = await Promise.all([
      loadVisiblePublicProfiles(),
      db.collection("attendanceMeetings").orderBy("date", "desc").limit(1001).get(),
    ]);

    const publicIds = new Set(profiles.map((profile) => profile.id));
    const attendanceCounts = new Map<string, number>();
    attendanceSnapshot.docs.slice(0, 1000).forEach((meeting) => {
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

    return {
      topPlayers,
      faithful,
      attendanceLimited: attendanceSnapshot.size > 1000,
    };
  } catch {
    throw new HttpsError("internal", "No se pudo preparar la clasificación pública.");
  }
});

export const getAttendanceMeetings = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAuthorizedRole(request.auth.uid);

  const snapshot = await db.collection("attendanceMeetings")
    .orderBy("date", "desc")
    .limit(300)
    .get();

  return {
    meetings: snapshot.docs.map((document) => {
      const data = document.data();
      const participants = Array.isArray(data.participants)
        ? data.participants.flatMap((item) => {
          if (typeof item !== "object" || item === null) return [];
          const row = item as Record<string, unknown>;
          if (typeof row.memberId !== "string" ||
            typeof row.name !== "string" ||
            !["Presente", "Ausente", "Justificado"].includes(String(row.status))) {
            return [];
          }
          return [{
            memberId: row.memberId,
            name: row.name,
            status: row.status as "Presente" | "Ausente" | "Justificado",
          }];
        })
        : [];

      return {
        id: document.id,
        name: text(data.name, 100),
        date: text(data.date, 20),
        createdAt: text(data.createdAt, 40),
        participants,
      };
    }),
  };
});

export const createAttendanceMeeting = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAuthorizedRole(request.auth.uid);

  const meetingName = text(request.data?.name, 100);
  const meetingDate = text(request.data?.date, 20);
  if (!meetingName || !isValidDate(meetingDate)) {
    throw new HttpsError("invalid-argument", "Debes indicar un nombre y una fecha real válidos.");
  }

  const meeting = await db.collection("attendanceMeetings").add({
    name: meetingName,
    date: meetingDate,
    createdBy: request.auth.uid,
    createdAt: new Date().toISOString(),
    participants: [],
  });
  return {success: true, meetingId: meeting.id};
});

export const saveMeetingAttendance = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAuthorizedRole(request.auth.uid);

  const meetingId = text(request.data?.meetingId, 150);
  const rawParticipants = request.data?.participants;
  if (!meetingId || !Array.isArray(rawParticipants) || rawParticipants.length > 500) {
    throw new HttpsError("invalid-argument", "La reunión o la lista de asistencia no es válida.");
  }

  const participantIds = rawParticipants.map((item) =>
    typeof item === "object" && item !== null
      ? text((item as Record<string, unknown>).memberId, 150)
      : "",
  );
  if (participantIds.some((id) => !id) ||
    new Set(participantIds).size !== participantIds.length) {
    throw new HttpsError("invalid-argument", "Hay jóvenes vacíos o repetidos en la lista.");
  }

  const validStatuses = ["Presente", "Ausente", "Justificado"];
  const refs = participantIds.map((id) => db.collection("members").doc(id));
  const memberSnapshots = refs.length ? await db.getAll(...refs) : [];
  const participants = rawParticipants.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      throw new HttpsError("invalid-argument", "Un participante no tiene un formato válido.");
    }
    const row = item as Record<string, unknown>;
    const status = text(row.status, 20);
    const memberSnapshot = memberSnapshots[index];
    if (!validStatuses.includes(status)) {
      throw new HttpsError("invalid-argument", "Uno de los estados de asistencia no es válido.");
    }
    if (!memberSnapshot?.exists) {
      throw new HttpsError("not-found", "Uno de los jóvenes ya no existe en la colección members.");
    }
    const name = text(memberSnapshot.data()?.name, 120) || "Joven sin nombre";
    return {memberId: participantIds[index], name, status};
  });

  const meetingRef = db.collection("attendanceMeetings").doc(meetingId);
  const meetingSnapshot = await meetingRef.get();
  if (!meetingSnapshot.exists) {
    throw new HttpsError("not-found", "No se encontró la reunión seleccionada.");
  }

  await meetingRef.update({
    participants,
    updatedAt: new Date().toISOString(),
    updatedBy: request.auth.uid,
  });
  return {success: true};
});


// -----------------------------------------------------------------------------
// Persistencia protegida para seguimiento, visitantes y devocionales.
// Todas estas operaciones usan Admin SDK desde Functions; el navegador no
// necesita permisos directos sobre las colecciones privadas.
// -----------------------------------------------------------------------------

function isoValue(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 40);
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const timestamp = value as {toDate?: () => Date};
    if (typeof timestamp.toDate === "function") {
      const date = timestamp.toDate();
      return date instanceof Date && Number.isFinite(date.getTime())
        ? date.toISOString()
        : "";
    }
  }
  return "";
}

async function ensureOwnedRecord(
  collectionName: string,
  recordId: string,
  uid: string,
  role: AuthorizedRole,
) {
  const ref = db.collection(collectionName).doc(recordId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "No se encontró el registro.");
  }
  const data = snapshot.data() ?? {};
  if (role === "lider" || role === "líder") {
    if (data.createdBy !== uid) {
      throw new HttpsError("permission-denied", "Solo puedes modificar los registros que creaste.");
    }
  }
  return {ref, data};
}

const followupStatuses = ["Pendiente", "En proceso", "Completado"];
const visitorStatuses = ["Nuevo", "Contactado", "Integrado"];

export const getFollowups = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const role = await requireAuthorizedRole(request.auth.uid);
  const snapshot = await db.collection("followups").limit(500).get();
  const items = snapshot.docs.flatMap((document) => {
    const data = document.data();
    if ((role === "lider" || role === "líder") &&
      data.createdBy !== request.auth?.uid) return [];
    return [{
      id: document.id,
      name: text(data.name, 120),
      date: text(data.date, 10),
      reason: text(data.reason, 120),
      notes: text(data.notes, 2000),
      status: followupStatuses.includes(String(data.status))
        ? String(data.status)
        : "Pendiente",
      createdAt: isoValue(data.createdAt),
    }];
  }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return {items};
});

export const createFollowup = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAuthorizedRole(request.auth.uid);
  const data = request.data ?? {};
  const name = text(data.name, 120);
  const date = text(data.date, 10);
  const reason = text(data.reason, 120);
  const notes = text(data.notes, 2000);
  if (name.length < 2 || !isValidDate(date) || !reason || !notes) {
    throw new HttpsError("invalid-argument", "Completa un nombre, fecha real, motivo y observaciones válidas.");
  }
  const ref = db.collection("followups").doc();
  const now = new Date().toISOString();
  await ref.set({
    name, date, reason, notes,
    status: "Pendiente",
    createdAt: now,
    createdBy: request.auth.uid,
    updatedAt: now,
    updatedBy: request.auth.uid,
  });
  return {success: true, id: ref.id};
});

export const updateFollowupStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const role = await requireAuthorizedRole(request.auth.uid);
  const id = text(request.data?.id, 150);
  const status = text(request.data?.status, 30);
  if (!id || !followupStatuses.includes(status)) {
    throw new HttpsError("invalid-argument", "El seguimiento o su estado no son válidos.");
  }
  const {ref} = await ensureOwnedRecord("followups", id, request.auth.uid, role);
  await ref.update({
    status,
    updatedAt: new Date().toISOString(),
    updatedBy: request.auth.uid,
  });
  return {success: true};
});

export const deleteFollowup = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const role = await requireAuthorizedRole(request.auth.uid);
  const id = text(request.data?.id, 150);
  if (!id) throw new HttpsError("invalid-argument", "Selecciona un seguimiento válido.");
  const {ref} = await ensureOwnedRecord("followups", id, request.auth.uid, role);
  await ref.delete();
  return {success: true};
});

export const getVisitors = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const role = await requireAuthorizedRole(request.auth.uid);
  const snapshot = await db.collection("visitors").limit(500).get();
  const items = snapshot.docs.flatMap((document) => {
    const data = document.data();
    if ((role === "lider" || role === "líder") &&
      data.createdBy !== request.auth?.uid) return [];
    return [{
      id: document.id,
      name: text(data.name, 120),
      phone: role === "admin" || role === "administrador" || role === "pastor"
        ? text(data.phone, 40)
        : "",
      email: role === "admin" || role === "administrador" || role === "pastor"
        ? text(data.email, 160)
        : "",
      date: text(data.date, 10),
      source: text(data.source, 120),
      notes: role === "admin" || role === "administrador" || role === "pastor"
        ? text(data.notes, 1000)
        : "",
      status: visitorStatuses.includes(String(data.status))
        ? String(data.status)
        : "Nuevo",
      createdAt: isoValue(data.createdAt),
    }];
  }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return {items};
});

export const createVisitor = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAuthorizedRole(request.auth.uid);
  const data = request.data ?? {};
  const name = text(data.name, 120);
  const phone = text(data.phone, 40);
  const email = text(data.email, 160);
  const date = text(data.date, 10);
  const source = text(data.source, 120);
  const notes = text(data.notes, 1000);
  if (name.length < 2 || phone.length < 7 || !isValidDate(date)) {
    throw new HttpsError("invalid-argument", "El nombre, teléfono y fecha de visita son obligatorios y deben ser válidos.");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "El correo electrónico no tiene un formato válido.");
  }
  const ref = db.collection("visitors").doc();
  const now = new Date().toISOString();
  await ref.set({
    name, phone, email, date,
    source: source || "Otro",
    notes,
    status: "Nuevo",
    createdAt: now,
    createdBy: request.auth.uid,
    updatedAt: now,
    updatedBy: request.auth.uid,
  });
  return {success: true, id: ref.id};
});

export const updateVisitorStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const role = await requireAuthorizedRole(request.auth.uid);
  const id = text(request.data?.id, 150);
  const status = text(request.data?.status, 30);
  if (!id || !visitorStatuses.includes(status)) {
    throw new HttpsError("invalid-argument", "El visitante o su estado no son válidos.");
  }
  const {ref} = await ensureOwnedRecord("visitors", id, request.auth.uid, role);
  await ref.update({
    status,
    updatedAt: new Date().toISOString(),
    updatedBy: request.auth.uid,
  });
  return {success: true};
});

export const deleteVisitor = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const role = await requireAuthorizedRole(request.auth.uid);
  const id = text(request.data?.id, 150);
  if (!id) throw new HttpsError("invalid-argument", "Selecciona un visitante válido.");
  const {ref} = await ensureOwnedRecord("visitors", id, request.auth.uid, role);
  await ref.delete();
  return {success: true};
});

export const getDevotionals = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAuthorizedRole(request.auth.uid);
  const snapshot = await db.collection("devotionals").limit(250).get();
  const devotionals = snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      title: text(data.title, 120),
      verse: text(data.verse, 2000),
      reference: text(data.reference, 120),
      author: text(data.author, 100),
      category: text(data.category, 40),
      date: text(data.date, 10),
      content: text(data.content, 10000),
      createdAt: isoValue(data.createdAt),
    };
  }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return {devotionals};
});

export const createDevotional = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAdminOrPastor(request.auth.uid);
  const data = request.data ?? {};
  const title = text(data.title, 120);
  const verse = text(data.verse, 2000);
  const reference = text(data.reference, 120);
  const author = text(data.author, 100);
  const category = text(data.category, 40);
  const date = text(data.date, 10);
  const content = text(data.content, 10000);
  const categories = ["Fe", "Oración", "Juventud", "Amor", "Servicio"];
  if (!title || !verse || !reference || !author || !content ||
    !categories.includes(category) || !isValidDate(date)) {
    throw new HttpsError("invalid-argument", "Completa el devocional con una categoría y fecha válidas.");
  }
  const ref = db.collection("devotionals").doc();
  await ref.set({
    title, verse, reference, author, category, date, content,
    createdAt: new Date().toISOString(),
    createdBy: request.auth.uid,
  });
  return {success: true, id: ref.id};
});

export const deleteDevotional = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAdminOrPastor(request.auth.uid);
  const id = text(request.data?.id, 150);
  if (!id) throw new HttpsError("invalid-argument", "Selecciona un devocional válido.");
  const ref = db.collection("devotionals").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "No se encontró el devocional.");
  await ref.delete();
  return {success: true};
});

// -----------------------------------------------------------------------------
// Registros administrados: bandeja de entrada y turnos.
// Se limita la colección y los campos permitidos; nunca se acepta un path
// arbitrario enviado por el navegador.
// -----------------------------------------------------------------------------

type ManagedKind = "inbox" | "turns";

function managedCollectionConfig(kind: unknown) {
  if (kind === "inbox") {
    return {
      collection: "inbox",
      fields: {
        senderName: 120,
        subject: 160,
        senderContact: 160,
        message: 4000,
      },
      statuses: ["Nuevo", "En revisión", "Respondido", "Archivado"],
    };
  }
  if (kind === "turns") {
    return {
      collection: "turnos",
      fields: {
        service: 120,
        responsibleName: 120,
        date: 10,
        startTime: 5,
        endTime: 5,
        notes: 1000,
      },
      statuses: ["Pendiente", "Confirmado", "Completado"],
    };
  }
  throw new HttpsError("invalid-argument", "El tipo de registro solicitado no está permitido.");
}

function cleanManagedFields(
  raw: unknown,
  allowed: Record<string, number>,
): Record<string, string> {
  if (typeof raw !== "object" || raw === null) {
    throw new HttpsError("invalid-argument", "Los datos del registro no son válidos.");
  }
  const source = raw as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const [field, maxLength] of Object.entries(allowed)) {
    if (source[field] !== undefined) {
      result[field] = text(source[field], maxLength);
    }
  }
  if (Object.keys(result).length === 0) {
    throw new HttpsError("invalid-argument", "No hay campos válidos para guardar.");
  }
  return result;
}

function validateManagedFields(kind: ManagedKind, fields: Record<string, string>) {
  if (kind === "inbox") {
    if (fields.senderName !== undefined && fields.senderName.length < 2) {
      throw new HttpsError("invalid-argument", "El nombre del remitente es demasiado corto.");
    }
    if (fields.subject !== undefined && fields.subject.length < 2) {
      throw new HttpsError("invalid-argument", "El asunto es demasiado corto.");
    }
  }
  if (kind === "turns") {
    if (fields.date !== undefined && !isValidDate(fields.date)) {
      throw new HttpsError("invalid-argument", "La fecha del turno no es válida.");
    }
    if (fields.startTime && !isValidTime(fields.startTime)) {
      throw new HttpsError("invalid-argument", "La hora de inicio no es válida.");
    }
    if (fields.endTime && !isValidTime(fields.endTime)) {
      throw new HttpsError("invalid-argument", "La hora de finalización no es válida.");
    }
    if (fields.startTime && fields.endTime && fields.endTime <= fields.startTime) {
      throw new HttpsError("invalid-argument", "La hora final debe ser posterior a la hora de inicio.");
    }
  }
}

export const getManagedRecords = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const kind = request.data?.kind as ManagedKind;
  const config = managedCollectionConfig(kind);
  await requireAuthorizedRole(request.auth.uid);
  const snapshot = await db.collection(config.collection).limit(500).get();
  const items = snapshot.docs.map((document) => {
    const data = document.data();
    const fields: Record<string, string> = {};
    const fieldLimits = config.fields as Record<string, number>;
    for (const field of Object.keys(fieldLimits)) {
      fields[field] = text(data[field], fieldLimits[field]);
    }
    return {
      ...fields,
      id: document.id,
      status: text(data.status, 40),
      createdAt: isoValue(data.createdAt),
      updatedAt: isoValue(data.updatedAt),
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {items};
});

export const createManagedRecord = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAuthorizedRole(request.auth.uid);
  const kind = request.data?.kind as ManagedKind;
  const config = managedCollectionConfig(kind);
  const fields = cleanManagedFields(request.data?.fields, config.fields);
  validateManagedFields(kind, fields);
  const status = text(request.data?.status, 40) || config.statuses[0];
  if (!config.statuses.includes(status)) {
    throw new HttpsError("invalid-argument", "El estado inicial no está permitido.");
  }
  const now = new Date().toISOString();
  const ref = db.collection(config.collection).doc();
  await ref.set({
    ...fields,
    status,
    createdAt: now,
    createdBy: request.auth.uid,
    updatedAt: now,
    updatedBy: request.auth.uid,
  });
  return {success: true, id: ref.id};
});

export const updateManagedRecord = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAuthorizedRole(request.auth.uid);
  const kind = request.data?.kind as ManagedKind;
  const config = managedCollectionConfig(kind);
  const id = text(request.data?.id, 150);
  if (!id) throw new HttpsError("invalid-argument", "Selecciona un registro válido.");
  const fields = cleanManagedFields(request.data?.fields, config.fields);
  validateManagedFields(kind, fields);
  const ref = db.collection(config.collection).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "No se encontró el registro.");
  await ref.update({
    ...fields,
    updatedAt: new Date().toISOString(),
    updatedBy: request.auth.uid,
  });
  return {success: true};
});

export const updateManagedRecordStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAuthorizedRole(request.auth.uid);
  const kind = request.data?.kind as ManagedKind;
  const config = managedCollectionConfig(kind);
  const id = text(request.data?.id, 150);
  const status = text(request.data?.status, 40);
  if (!id || !config.statuses.includes(status)) {
    throw new HttpsError("invalid-argument", "El registro o estado no son válidos.");
  }
  const ref = db.collection(config.collection).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "No se encontró el registro.");
  await ref.update({
    status,
    updatedAt: new Date().toISOString(),
    updatedBy: request.auth.uid,
  });
  return {success: true};
});

export const deleteManagedRecord = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAuthorizedRole(request.auth.uid);
  const kind = request.data?.kind as ManagedKind;
  const config = managedCollectionConfig(kind);
  const id = text(request.data?.id, 150);
  if (!id) throw new HttpsError("invalid-argument", "Selecciona un registro válido.");
  const ref = db.collection(config.collection).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "No se encontró el registro.");
  await ref.delete();
  return {success: true};
});

export const getCheckins = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAuthorizedRole(request.auth.uid);
  const snapshot = await db.collection("attendanceMeetings")
    .orderBy("date", "desc")
    .limit(300)
    .get();

  const items = snapshot.docs.flatMap((meeting) => {
    const data = meeting.data();
    const participants = Array.isArray(data.participants) ? data.participants : [];
    return participants.flatMap((item) => {
      if (typeof item !== "object" || item === null) return [];
      const participant = item as Record<string, unknown>;
      const status = text(participant.status, 20);
      const memberId = text(participant.memberId, 150);
      if (!memberId || !["Presente", "Ausente", "Justificado"].includes(status)) return [];
      return [{
        id: meeting.id + "_" + memberId,
        memberId,
        memberName: text(participant.name, 120),
        meetingName: text(data.name, 100),
        date: text(data.date, 10),
        createdAt: isoValue(data.updatedAt ?? data.createdAt),
      }];
    });
  });
  return {items};
});

export const createCheckin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAuthorizedRole(request.auth.uid);
  const memberId = text(request.data?.memberId, 150);
  const meetingName = text(request.data?.meetingName, 100);
  const date = text(request.data?.date, 10);
  if (!memberId || meetingName.length < 2 || !isValidDate(date)) {
    throw new HttpsError("invalid-argument", "Selecciona un joven, servicio y fecha válidos.");
  }

  const memberSnapshot = await db.collection("members").doc(memberId).get();
  if (!memberSnapshot.exists) {
    throw new HttpsError("not-found", "El joven ya no existe en el registro de miembros.");
  }
  const memberName = text(memberSnapshot.data()?.name, 120);
  if (!memberName) {
    throw new HttpsError("failed-precondition", "El perfil del joven no tiene un nombre válido.");
  }

  // Consultamos por fecha (un único campo) para evitar exigir un índice
  // compuesto durante esta migración. La comparación del servicio se hace
  // en servidor y el documento determinista protege las carreras concurrentes.
  const daySnapshot = await db.collection("attendanceMeetings")
    .where("date", "==", date)
    .limit(300)
    .get();
  const existing = daySnapshot.docs.find((document) =>
    text(document.data().name, 100).toLowerCase() === meetingName.toLowerCase(),
  );
  const meetingId = existing?.id ?? createHash("sha256")
    .update(date + "|" + meetingName.toLowerCase())
    .digest("hex");
  const meetingRef = db.collection("attendanceMeetings").doc(meetingId);
  const now = new Date().toISOString();

  await db.runTransaction(async (transaction) => {
    const meetingSnapshot = await transaction.get(meetingRef);
    if (!meetingSnapshot.exists) {
      transaction.create(meetingRef, {
        name: meetingName,
        date,
        createdBy: request.auth?.uid,
        createdAt: now,
        updatedAt: now,
        participants: [{memberId, name: memberName, status: "Presente"}],
      });
      return;
    }

    const meetingData = meetingSnapshot.data() ?? {};
    if (text(meetingData.date, 10) !== date ||
      text(meetingData.name, 100).toLowerCase() !== meetingName.toLowerCase()) {
      throw new HttpsError("already-exists", "Ya existe un servicio con ese identificador. Actualiza la lista e inténtalo de nuevo.");
    }
    const participants = Array.isArray(meetingData.participants)
      ? meetingData.participants
      : [];
    if (participants.some((item) =>
      typeof item === "object" && item !== null &&
      (item as Record<string, unknown>).memberId === memberId,
    )) {
      throw new HttpsError("already-exists", memberName + " ya tiene asistencia en este servicio.");
    }
    transaction.update(meetingRef, {
      participants: [...participants, {memberId, name: memberName, status: "Presente"}],
      updatedAt: now,
      updatedBy: request.auth?.uid,
    });
  });
  return {success: true, meetingId};
});


// Galería: moderación y publicación protegidas por rol.
function photoResult(id: string, data: FirebaseFirestore.DocumentData) {
  const imageUrl = text(data.imageUrl, 2000);
  return {
    id,
    title: text(data.title, 120),
    description: text(data.description, 2000),
    imageUrl: imageUrl.startsWith("https://") ? imageUrl : "",
    authorName: text(data.authorName, 120),
    status: text(data.status, 30),
    createdAt: isoValue(data.createdAt),
    approvedAt: isoValue(data.approvedAt),
  };
}

export const getPhotos = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAuthorizedRole(request.auth.uid);
  const [pendingSnapshot, approvedSnapshot] = await Promise.all([
    db.collection("fotoPend").limit(300).get(),
    db.collection("photos").limit(300).get(),
  ]);
  const pending = pendingSnapshot.docs.map((document) =>
    photoResult(document.id, document.data()),
  ).filter((item) => item.status !== "Rechazada")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const approved = approvedSnapshot.docs.map((document) =>
    photoResult(document.id, document.data()),
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {pending, approved};
});

export const createPhotoRequest = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAuthorizedRole(request.auth.uid);
  const data = request.data ?? {};
  const title = text(data.title, 120);
  const description = text(data.description, 2000);
  const imageUrl = text(data.imageUrl, 2000);
  const authorName = text(data.authorName, 120);
  if (title.length < 2 || authorName.length < 2 || !/^https:\/\//i.test(imageUrl)) {
    throw new HttpsError("invalid-argument", "Indica un título, autor y enlace HTTPS válido para la imagen.");
  }
  const ref = db.collection("fotoPend").doc();
  await ref.set({
    title, description, imageUrl, authorName,
    status: "Pendiente",
    createdAt: new Date().toISOString(),
    createdBy: request.auth.uid,
  });
  return {success: true, id: ref.id};
});

export const approvePhoto = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAdminOrPastor(request.auth.uid);
  const id = text(request.data?.id, 150);
  if (!id) throw new HttpsError("invalid-argument", "Selecciona una fotografía válida.");
  const pendingRef = db.collection("fotoPend").doc(id);
  const snapshot = await pendingRef.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "La fotografía pendiente no existe.");
  const data = snapshot.data() ?? {};
  const imageUrl = text(data.imageUrl, 2000);
  if (!imageUrl.startsWith("https://")) {
    throw new HttpsError("failed-precondition", "La imagen no tiene un enlace HTTPS válido.");
  }
  const approvedRef = db.collection("photos").doc();
  const batch = db.batch();
  batch.set(approvedRef, {
    title: text(data.title, 120),
    description: text(data.description, 2000),
    imageUrl,
    authorName: text(data.authorName, 120),
    status: "Aprobada",
    createdAt: isoValue(data.createdAt) || new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    approvedBy: request.auth.uid,
  });
  batch.delete(pendingRef);
  await batch.commit();
  return {success: true};
});

export const rejectPhoto = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAdminOrPastor(request.auth.uid);
  const id = text(request.data?.id, 150);
  if (!id) throw new HttpsError("invalid-argument", "Selecciona una fotografía válida.");
  const ref = db.collection("fotoPend").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "La fotografía pendiente no existe.");
  await ref.update({
    status: "Rechazada",
    rejectedAt: new Date().toISOString(),
    rejectedBy: request.auth.uid,
  });
  return {success: true};
});

export const deleteApprovedPhoto = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAdminOrPastor(request.auth.uid);
  const id = text(request.data?.id, 150);
  if (!id) throw new HttpsError("invalid-argument", "Selecciona una fotografía válida.");
  const ref = db.collection("photos").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "La fotografía publicada no existe.");
  await ref.delete();
  return {success: true};
});


// Administración con respuestas allowlist: la app no puede leer libremente
// users, notas pastorales, auditoría ni ajustes.
type ManagementKind = "bonus" | "pastoral" | "leaders" | "audit" | "settings";

function managementConfig(kind: unknown) {
  if (kind === "bonus") return {collection: "bonus"};
  if (kind === "pastoral") return {collection: "pastoral"};
  if (kind === "leaders") return {collection: "users"};
  if (kind === "audit") return {collection: "audit"};
  if (kind === "settings") return {collection: "settings"};
  throw new HttpsError("invalid-argument", "El módulo de administración no es válido.");
}

async function requireManagementRole(uid: string, kind: ManagementKind) {
  if (kind === "pastoral") {
    await requireAdminOrPastor(uid);
    return;
  }
  const role = await requireAuthorizedRole(uid);
  if (role !== "admin" && role !== "administrador") {
    throw new HttpsError("permission-denied", "Este módulo está reservado para administración.");
  }
}

export const getManagementData = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const kind = request.data?.kind as ManagementKind;
  const config = managementConfig(kind);
  await requireManagementRole(request.auth.uid, kind);
  const snapshot = await db.collection(config.collection).limit(500).get();

  const items = snapshot.docs.map((document) => {
    const data = document.data();
    if (kind === "bonus") {
      return {
        id: document.id,
        memberName: text(data.memberName, 120),
        reason: text(data.reason, 500),
        points: Number.isFinite(Number(data.points)) ? Number(data.points) : 0,
        createdAt: isoValue(data.createdAt),
      };
    }
    if (kind === "pastoral") {
      return {
        id: document.id,
        memberName: text(data.memberName, 120),
        title: text(data.title, 160),
        note: text(data.note, 5000),
        createdAt: isoValue(data.createdAt),
      };
    }
    if (kind === "leaders") {
      // No devolver correos, tokens, claims ni datos auxiliares de Auth.
      return {
        id: document.id,
        name: text(data.name, 120),
        user: text(data.user, 120),
        role: text(data.role, 40),
      };
    }
    if (kind === "settings") {
      return {
        id: document.id,
        key: text(data.key, 120) || document.id,
        value: text(data.value, 2000),
        updatedAt: isoValue(data.updatedAt),
      };
    }
    return {
      id: document.id,
      action: text(data.action, 120),
      actorUid: text(data.actorUid ?? data.createdBy, 150),
      collection: text(data.collection, 120),
      recordId: text(data.recordId, 150),
      createdAt: isoValue(data.createdAt),
    };
  }).sort((a, b) =>
    ("createdAt" in b ? String(b.createdAt) : "").localeCompare(
      "createdAt" in a ? String(a.createdAt) : "",
    ),
  );
  return {items};
});

export const createManagementRecord = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const kind = request.data?.kind as ManagementKind;
  managementConfig(kind);
  await requireManagementRole(request.auth.uid, kind);
  const data = request.data?.data;
  if (typeof data !== "object" || data === null) {
    throw new HttpsError("invalid-argument", "Los datos del registro no son válidos.");
  }
  const source = data as Record<string, unknown>;
  const now = new Date().toISOString();

  if (kind === "bonus") {
    const memberName = text(source.memberName, 120);
    const reason = text(source.reason, 500);
    const points = Number(source.points);
    if (memberName.length < 2 || !reason || !Number.isInteger(points) ||
      points < 1 || points > 1000) {
      throw new HttpsError("invalid-argument", "Indica joven, motivo y puntos entre 1 y 1.000.");
    }
    const ref = db.collection("bonus").doc();
    await ref.set({memberName, reason, points, createdAt: now, createdBy: request.auth.uid});
    return {success: true, id: ref.id};
  }

  if (kind === "pastoral") {
    const memberName = text(source.memberName, 120);
    const title = text(source.title, 160);
    const note = text(source.note, 5000);
    if (memberName.length < 2 || !title || !note) {
      throw new HttpsError("invalid-argument", "Completa el joven, título y contenido de la nota.");
    }
    const ref = db.collection("pastoral").doc();
    await ref.set({memberName, title, note, createdAt: now, createdBy: request.auth.uid});
    return {success: true, id: ref.id};
  }

  if (kind === "settings") {
    const key = text(source.key, 120).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const value = text(source.value, 2000);
    if (!key || !value) {
      throw new HttpsError("invalid-argument", "Escribe el nombre y el valor del ajuste.");
    }
    const ref = db.collection("settings").doc(key);
    await ref.set({key, value, updatedAt: now, updatedBy: request.auth.uid}, {merge: true});
    return {success: true, id: ref.id};
  }

  throw new HttpsError("permission-denied", "Este módulo no permite crear registros.");
});
