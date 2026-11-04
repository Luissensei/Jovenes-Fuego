import {createHash} from "node:crypto";
import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getAuth as getAdminAuth} from "firebase-admin/auth";

setGlobalOptions({maxInstances: 10});

const app = getApps()[0] ?? initializeApp();
const db = getFirestore(app);
const adminAuth = getAdminAuth(app);

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



async function requireAdmin(uid: string): Promise<AuthorizedRole> {
  const role = await requireAuthorizedRole(uid);
  if (role !== "admin" && role !== "administrador") {
    throw new HttpsError("permission-denied", "Esta operación está reservada para administradores.");
  }
  return role;
}

const leaderRoles = ["lider", "líder", "pastor", "admin", "administrador"];
const manageablePermissions = [
  "members", "attendance", "followups", "devotionals", "visitors",
  "prayers", "events", "checkins", "turns", "reports", "ranking", "games", "profile",
];

function cleanStringArray(value: unknown, allowed?: string[]): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item): item is string => typeof item === "string")
    .map((item) => text(item, 80))
    .filter((item) => item && (!allowed || allowed.includes(item))))].slice(0, 30);
}

export const adminListLeaders = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdmin(request.auth.uid);

  const snapshot = await db.collection("users").limit(400).get();
  const visible = snapshot.docs.filter((document) => {
    const role = String(document.data().role ?? "").trim().toLowerCase();
    return leaderRoles.includes(role);
  }).slice(0, 200);

  const leaders = await Promise.all(visible.map(async (document) => {
    const data = document.data();
    let authRecord: Awaited<ReturnType<typeof adminAuth.getUser>> | null = null;
    try {
      authRecord = await adminAuth.getUser(document.id);
    } catch {
      authRecord = null;
    }
    return {
      id: document.id,
      name: text(data.name, 120),
      email: text(data.email, 180) || authRecord?.email || text(data.user, 180),
      user: text(data.user, 180),
      role: String(data.role ?? "lider").trim().toLowerCase(),
      groups: cleanStringArray(data.groups),
      permissions: cleanStringArray(data.permissions, manageablePermissions),
      active: authRecord ? !authRecord.disabled && data.status !== "inactive" : data.status !== "inactive",
    };
  }));

  return {leaders};
});

export const adminCreateLeader = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdmin(request.auth.uid);

  const name = text(request.data?.name, 100);
  const email = text(request.data?.email, 180).toLowerCase();
  const role = text(request.data?.role, 30).toLowerCase() || "lider";
  const groups = cleanStringArray(request.data?.groups);
  const permissions = cleanStringArray(request.data?.permissions, manageablePermissions);

  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Indica un nombre y un correo electrónico válidos.");
  }
  if (!["lider", "líder", "pastor"].includes(role)) {
    throw new HttpsError("invalid-argument", "Las cuentas nuevas deben crearse como líder o pastor. La administración se asigna por separado.");
  }
  if (permissions.length === 0) {
    throw new HttpsError("invalid-argument", "Asigna al menos un permiso de módulo.");
  }

  let userRecord: Awaited<ReturnType<typeof adminAuth.createUser>>;
  try {
    userRecord = await adminAuth.createUser({
      email,
      displayName: name,
      emailVerified: false,
      disabled: false,
    });
  } catch (cause) {
    const code = (cause as {code?: string})?.code;
    if (code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "Ya existe una cuenta con ese correo.");
    }
    throw new HttpsError("internal", "No se pudo crear la cuenta de autenticación.");
  }

  let setupLink = "";
  try {
    setupLink = await adminAuth.generatePasswordResetLink(email);
    const userRef = db.collection("users").doc(userRecord.uid);
    const auditRef = db.collection("audit").doc();
    const batch = db.batch();
    batch.set(userRef, {
      name,
      user: email,
      email,
      role,
      groups,
      permissions,
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: request.auth.uid,
      updatedAt: new Date().toISOString(),
    });
    batch.set(auditRef, {
      action: "leader.created",
      actorUid: request.auth.uid,
      targetUid: userRecord.uid,
      createdAt: new Date().toISOString(),
    });
    await batch.commit();
  } catch {
    await adminAuth.deleteUser(userRecord.uid).catch(() => undefined);
    throw new HttpsError("internal", "No se pudo completar el registro. La cuenta temporal fue retirada.");
  }

  return {uid: userRecord.uid, setupLink};
});

export const adminUpdateLeader = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdmin(request.auth.uid);

  const uid = text(request.data?.uid, 150);
  const role = text(request.data?.role, 30).toLowerCase();
  const active = request.data?.active === true;
  const groups = cleanStringArray(request.data?.groups);
  const permissions = cleanStringArray(request.data?.permissions, manageablePermissions);

  if (!uid || uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "No puedes modificar tu propia cuenta desde este panel.");
  }
  if (!leaderRoles.includes(role) || !permissions.length) {
    throw new HttpsError("invalid-argument", "El rol o los permisos no son válidos.");
  }

  const userRef = db.collection("users").doc(uid);
  const existing = await userRef.get();
  if (!existing.exists) throw new HttpsError("not-found", "No se encontró el usuario.");

  const previousRole = String(existing.data()?.role ?? "").trim().toLowerCase();
  const demotingAdmin = ["admin", "administrador"].includes(previousRole) &&
    (!["admin", "administrador"].includes(role) || !active);
  if (demotingAdmin) {
    const admins = await db.collection("users")
      .where("role", "in", ["admin", "administrador"]).limit(20).get();
    const otherActiveAdmins = admins.docs.filter((item) =>
      item.id !== uid && item.data().status !== "inactive",
    );
    if (otherActiveAdmins.length === 0) {
      throw new HttpsError("failed-precondition", "Debe permanecer al menos un administrador activo.");
    }
  }

  try {
    await adminAuth.updateUser(uid, {disabled: !active, displayName: text(existing.data()?.name, 100)});
  } catch {
    throw new HttpsError("not-found", "No se encontró la cuenta de autenticación asociada.");
  }

  await userRef.set({
    role,
    groups,
    permissions,
    status: active ? "active" : "inactive",
    updatedAt: new Date().toISOString(),
    updatedBy: request.auth.uid,
    ...(active ? {reactivatedAt: new Date().toISOString()} : {disabledAt: new Date().toISOString()}),
  }, {merge: true});

  await db.collection("audit").add({
    action: active ? "leader.updated" : "leader.access-suspended",
    actorUid: request.auth.uid,
    targetUid: uid,
    createdAt: new Date().toISOString(),
    metadata: {role, groups, permissions},
  });

  return {success: true};
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
