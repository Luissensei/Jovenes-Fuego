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

  const userData = userSnapshot.data() ?? {};
  if (userData.status === "inactive") {
    throw new HttpsError("permission-denied", "Esta cuenta está suspendida.");
  }
  const role = String(userData.role ?? "").trim().toLowerCase();
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


async function recordAudit(
  action: string,
  actorUid: string,
  targetUid = "",
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.collection("audit").add({
      action,
      actorUid,
      ...(targetUid ? {targetUid} : {}),
      createdAt: new Date().toISOString(),
      metadata,
    });
  } catch (error) {
    // No se revierte una operación principal por una falla secundaria del historial.
    console.error("No se pudo registrar la auditoría:", error);
  }
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

function safePublicPhoto(value: unknown): string {
  const image = text(value, 60000);
  if (/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)) return image;
  return image.startsWith("https://") ? image.slice(0, 2000) : "";
}

async function loadVisiblePublicProfiles(includeAppearance = true) {
  const [modernSnapshot, rankingSnapshot] = await Promise.all([
    db.collection("publicProfiles").limit(100).get(),
    db.collection("public").doc("ranking").get(),
  ]);

  const rankingData = rankingSnapshot.data() ?? {};
  if (rankingData.off === true) return [];

  type Candidate = {
    id: string;
    name: string;
    nick: string;
    points: number;
    modern: Record<string, unknown>;
  };
  const byId = new Map<string, Candidate>();

  if (Array.isArray(rankingData.all)) {
    (rankingData.all as unknown[]).slice(0, 100).forEach((entry, index) => {
      if (!entry || typeof entry !== "object") return;
      const data = entry as Record<string, unknown>;
      const name = text(data.n, 120);
      if (!name) return;
      const memberId = text(data.i, 150);
      const id = memberId || `public-profile-${index}`;
      const rawPoints = Number(data.t ?? 0);
      byId.set(id, {
        id,
        name,
        nick: "",
        points: Number.isFinite(rawPoints) && rawPoints >= 0 ? rawPoints : 0,
        modern: {},
      });
    });
  }

  modernSnapshot.docs.forEach((document) => {
    const data = document.data();
    const name = text(data.name, 120);
    if (!name || data.nopub === true) return;
    const previous = byId.get(document.id);
    const rawPoints = Number(data.points ?? data.puntos ?? previous?.points ?? 0);
    byId.set(document.id, {
      id: document.id,
      name,
      nick: text(data.nick, 60) || previous?.nick || "",
      points: Number.isFinite(rawPoints) && rawPoints >= 0 ? rawPoints : 0,
      modern: data,
    });
  });

  const candidates = [...byId.values()];
  const memberIds = candidates
    .map((item) => item.id)
    .filter((id) => !id.startsWith("public-profile-"));
  const memberSnapshots = memberIds.length
    ? await db.getAll(...memberIds.map((id) => db.collection("members").doc(id)))
    : [];
  const photoSnapshots = includeAppearance && memberIds.length
    ? await db.getAll(...memberIds.map((id) => db.collection("photos").doc(id)))
    : [];

  const members = new Map(
    memberSnapshots.map((snapshot) => [snapshot.id, snapshot.data() ?? {}]),
  );
  const photos = new Map(
    photoSnapshots.map((snapshot) => [snapshot.id, snapshot.data() ?? {}]),
  );

  return candidates.flatMap((candidate) => {
    const member = members.get(candidate.id);
    if (member?.nopub === true || candidate.modern.nopub === true) return [];
    const photo = photos.get(candidate.id) ?? {};
    const modern = candidate.modern;
    const flames = Number(photo.w ?? modern.flames ?? 0);
    const ownedItems = Array.isArray(photo.u)
      ? photo.u.filter((value): value is string => typeof value === "string")
        .map((value) => value.slice(0, 120)).slice(0, 400)
      : [];

    return [{
      id: candidate.id,
      name: candidate.name,
      nick: candidate.nick || text(member?.nick, 60),
      pic: includeAppearance ? safePublicPhoto(photo.p) || safePublicPhoto(modern.pic) : "",
      points: candidate.points,
      frame: includeAppearance ? text(photo.f ?? modern.frame, 50) : "",
      avatar: includeAppearance ? text(photo.a ?? modern.avatar, 80) : "",
      background: includeAppearance ? text(photo.b ?? modern.background, 50) : "",
      title: includeAppearance ? text(photo.t ?? modern.title, 80) : "",
      flames: includeAppearance && Number.isFinite(flames) && flames >= 0 ? Math.min(flames, 100000) : 0,
      ownedItems: includeAppearance ? ownedItems : [],
    }];
  });
}

export const resolveUsernameLogin = onCall(async (request) => {
  const username = text(request.data?.username, 60).toLowerCase();
  if (!/^[a-z0-9._-]{1,60}$/.test(username)) {
    return {found: false};
  }

  const ip = String(request.rawRequest.ip ?? "unknown").slice(0, 100);
  const day = new Date().toISOString().slice(0, 10);
  const rateKey = createHash("sha256").update(ip + "|" + day).digest("hex");
  const rateRef = db.collection("publicUsernameLookupRateLimits").doc(rateKey);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateRef);
    const count = Number(snapshot.data()?.count ?? 0);
    if (count >= 500) {
      throw new HttpsError("resource-exhausted", "Se alcanzó el límite diario de consultas de usuario. Intenta más tarde.");
    }
    transaction.set(rateRef, {
      count: FieldValue.increment(1),
      day,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    }, {merge: true});
  });

  const lookup = await db.collection("public").doc(`al_${username}`).get();
  const email = text(lookup.data()?.e, 180).toLowerCase();
  if (!lookup.exists || !email.includes("@")) return {found: false};
  return {found: true, email};
});

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
        groups: Array.isArray(data.groups)
          ? data.groups.filter((item): item is string => typeof item === "string")
            .map((item) => text(item, 80)).filter(Boolean).slice(0, 30)
          : [],
        permissions: Array.isArray(data.permissions)
          ? cleanStringArray(data.permissions, manageablePermissions)
          : defaultLeaderPermissions,
        status: text(data.status, 30) || "active",
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



const defaultLeaderPermissions = [
  "members", "attendance", "reports", "followups", "devotionals", "visitors",
  "events", "checkins", "turns", "ranking", "games", "profile",
];

async function requireModulePermission(uid: string, moduleId: string): Promise<AuthorizedRole> {
  const role = await requireAuthorizedRole(uid);
  if (role === "admin" || role === "administrador" || role === "pastor") return role;

  const snapshot = await db.collection("users").doc(uid).get();
  const stored = snapshot.data()?.permissions;
  const permissions = Array.isArray(stored)
    ? cleanStringArray(stored, manageablePermissions)
    : defaultLeaderPermissions;
  if (!permissions.includes(moduleId)) {
    throw new HttpsError("permission-denied", "Tu cuenta no tiene permiso para consultar este módulo.");
  }
  return role;
}

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
  "events", "checkins", "turns", "reports", "ranking", "games", "profile",
];

function cleanStringArray(value: unknown, allowed?: string[]): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item): item is string => typeof item === "string")
    .map((item) => text(item, 80))
    .filter((item) => item && (!allowed || allowed.includes(item))))].slice(0, 30);
}

export const adminListLeaders = onCall({enforceAppCheck: true}, async (request) => {
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

export const adminCreateLeader = onCall({enforceAppCheck: true}, async (request) => {
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

export const adminUpdateLeader = onCall({enforceAppCheck: true}, async (request) => {
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
  const previousIsAdmin = ["admin", "administrador"].includes(previousRole);
  const nextIsAdmin = ["admin", "administrador"].includes(role);
  if (nextIsAdmin && !previousIsAdmin) {
    throw new HttpsError(
      "permission-denied",
      "No se puede elevar una cuenta a administrador desde la gestión de líderes.",
    );
  }
  const demotingAdmin = previousIsAdmin && (!nextIsAdmin || !active);
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
    if (!active) await adminAuth.revokeRefreshTokens(uid);
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

export const getPublicRankingMetrics = onCall(async () => {
  try {
    const profiles = await loadVisiblePublicProfiles(false);
    return {metrics: profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      points: profile.points,
    }))};
  } catch {
    throw new HttpsError("internal", "No se pudieron consultar las métricas públicas del ranking.");
  }
});

export const getPrivateMembers = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const requestedModule = text(request.data?.module, 30);
  const moduleId = ["members", "attendance", "checkins", "reports"].includes(requestedModule)
    ? requestedModule
    : "members";
  const role = await requireModulePermission(request.auth.uid, moduleId);

  try {
    const snapshot = await db.collection("members").limit(500).get();
    const members = snapshot.docs.map((document) => {
      const data = document.data();
      if (moduleId !== "members" || role === "lider" || role === "líder") {
        // Attendance, check-in and reports only need identifiers and display names.
        // Never send full member records to operational lists.
        return {
          id: document.id,
          name: text(data.name, 120),
          nick: text(data.nick, 60),
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
    br: 120, mn: 120, nt: 1000, bau: 20, con: 20, dis: 20, pic: 60000, ac: 120,
  };

  for (const [field, max] of Object.entries(limits)) {
    if (source[field] !== undefined) {
      patch[field] = text(source[field], max);
    }
  }
  for (const field of ["nopub"]) {
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
  if (patch.pic && !/^https:\/\//i.test(String(patch.pic)) &&
    !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]{1,59000}$/.test(String(patch.pic))) {
    throw new HttpsError("invalid-argument", "La foto debe ser una dirección HTTPS o una imagen JPEG comprimida válida.");
  }

  const memberRef = db.collection("members").doc(memberId);
  const publicRef = db.collection("publicProfiles").doc(memberId);
  const photoRef = db.collection("photos").doc(memberId);
  const [memberSnapshot, publicSnapshot] = await Promise.all([
    memberRef.get(),
    publicRef.get(),
  ]);
  if (!memberSnapshot.exists) {
    throw new HttpsError("not-found", "No se encontró el joven seleccionado.");
  }

  const batch = db.batch();
  batch.set(memberRef, patch, {merge: true});

  if (typeof patch.pic === "string") {
    const values = {p: patch.pic, c: new Date().toISOString()};
    const photoSnapshot = await photoRef.get();
    if (photoSnapshot.exists) {
      batch.set(photoRef, values, {merge: true});
    } else {
      batch.set(photoRef, {p: patch.pic, f: "", a: "", b: "", t: "", u: [], w: 0, c: values.c});
    }
  }

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
  await recordAudit("member.updated", request.auth.uid, memberId, {fields: Object.keys(patch)});
  return {success: true, memberId};
});

type WeeklyActivityRecord = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  published: boolean;
  editable?: boolean;
};

function mapLegacyWeeklyActivity(
  id: string,
  data: Record<string, unknown>,
  editable = false,
): WeeklyActivityRecord | null {
  const title = text(data.t ?? data.title, 120);
  const date = text(data.d ?? data.date, 10);
  if (!title || !isValidDate(date)) return null;
  return {
    id,
    title,
    description: text(data.n ?? data.description, 1200),
    date,
    time: text(data.h ?? data.time, 10),
    location: text(data.p ?? data.location, 120),
    published: data.published !== false,
    editable,
  };
}

function mapModernWeeklyActivity(
  id: string,
  data: Record<string, unknown>,
): WeeklyActivityRecord | null {
  const title = text(data.title, 120);
  const date = text(data.date, 10);
  if (!title || !isValidDate(date)) return null;
  return {
    id,
    title,
    description: text(data.description, 1200),
    date,
    time: text(data.time, 10),
    location: text(data.location, 120),
    published: data.published === true,
    editable: true,
  };
}

function mergeWeeklyActivityRecords(
  groups: WeeklyActivityRecord[][],
): WeeklyActivityRecord[] {
  const merged = new Map<string, WeeklyActivityRecord>();
  groups.forEach((items) => {
    items.forEach((item) => {
      const key = `${item.title.trim().toLocaleLowerCase("es")}|${item.date}`;
      merged.set(key, item);
    });
  });
  return [...merged.values()].sort((left, right) =>
    left.date.localeCompare(right.date) ||
    left.time.localeCompare(right.time) ||
    left.title.localeCompare(right.title, "es"),
  );
}

function photoDate(value: unknown): string {
  if (typeof value === "string") return text(value, 40);
  if (value && typeof value === "object" &&
    typeof (value as {toDate?: unknown}).toDate === "function") {
    const date = (value as {toDate: () => Date}).toDate();
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }
  return "";
}

function mapPhotoRecord(id: string, data: Record<string, unknown>, defaultStatus: string) {
  return {
    id,
    title: text(data.title, 120),
    description: text(data.description, 2000),
    imageUrl: text(data.imageUrl, 2000),
    authorName: text(data.authorName, 120),
    status: text(data.status, 30) || defaultStatus,
    createdAt: photoDate(data.createdAt),
    approvedAt: photoDate(data.approvedAt) || undefined,
  };
}

function validPhotoUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

type ManagedModule = "followups" | "visitors" | "inbox" | "turns";

type ManagedDefinition = {
  collection: string;
  permission: string;
  fields: string[];
  statuses: string[];
  required: string[];
};

const managedDefinitions: Record<ManagedModule, ManagedDefinition> = {
  followups: {
    collection: "followups",
    permission: "followups",
    fields: ["name", "date", "reason", "notes"],
    statuses: ["Pendiente", "En proceso", "Completado"],
    required: ["name", "date", "reason"],
  },
  visitors: {
    collection: "visitors",
    permission: "visitors",
    fields: ["name", "phone", "email", "date", "source", "notes"],
    statuses: ["Nuevo", "Contactado", "Integrado"],
    required: ["name", "phone", "date"],
  },
  inbox: {
    collection: "inbox",
    permission: "prayers",
    fields: ["senderName", "subject", "senderContact", "message"],
    statuses: ["Nuevo", "En revisión", "Respondido", "Archivado"],
    required: ["senderName", "subject", "message"],
  },
  turns: {
    collection: "turnos",
    permission: "turns",
    fields: ["service", "responsibleName", "date", "startTime", "endTime", "notes"],
    statuses: ["Pendiente", "Confirmado", "Completado"],
    required: ["service", "responsibleName", "date", "startTime", "endTime"],
  },
};

function managedDefinition(value: unknown): {module: ManagedModule; definition: ManagedDefinition} {
  const module = text(value, 30) as ManagedModule;
  const definition = managedDefinitions[module];
  if (!definition) throw new HttpsError("invalid-argument", "El módulo solicitado no está permitido.");
  return {module, definition};
}

function managedPayload(
  definition: ManagedDefinition,
  value: unknown,
): Record<string, string> {
  const source = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const payload: Record<string, string> = {};
  definition.fields.forEach((field) => {
    payload[field] = text(source[field], field === "notes" || field === "message" ? 3000 : 500);
  });
  return payload;
}

function managedRecordDate(value: unknown): string {
  const parsed = photoDate(value);
  return parsed ? parsed.slice(0, 10) : text(value, 20);
}

function mapManagedRecord(id: string, data: Record<string, unknown>, editable = true) {
  return {
    id,
    ...data,
    status: text(data.status, 40) || "Pendiente",
    createdAt: photoDate(data.createdAt),
    updatedAt: photoDate(data.updatedAt),
    editable,
  };
}

export const adminListManagedRecords = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const {module, definition} = managedDefinition(request.data?.module);
  if (module === "inbox") await requireAdminOrPastor(request.auth.uid);
  else await requireModulePermission(request.auth.uid, definition.permission);

  const collectionRef = db.collection(definition.collection);
  const snapshotPromise = collectionRef.limit(400).get();
  const membersPromise = module === "followups" ? db.collection("members").limit(700).get() : null;
  const [snapshot, membersSnapshot] = await Promise.all([
    snapshotPromise,
    membersPromise ?? Promise.resolve(null),
  ]);

  const members = new Map(
    (membersSnapshot?.docs ?? []).map((document) => [
      document.id,
      text(document.data().name, 120) || document.id,
    ]),
  );

  const records = snapshot.docs.flatMap<{id: string; createdAt: string; updatedAt: string; editable: boolean; [key: string]: unknown}>((document) => {
    const data = document.data();
    if (module === "inbox" && data.k === "p") return [];

    if (module === "inbox" && "k" in data) {
      const message = text(data.message ?? data.t ?? data.text ?? data.body, 3000);
      if (!message) return [];
      return [{
        id: `legacy:${document.id}`,
        senderName: text(data.senderName ?? data.name ?? data.n, 120) || "Anónimo",
        subject: text(data.subject ?? data.title, 160) || "Mensaje recibido",
        senderContact: text(data.senderContact ?? data.contact ?? data.email ?? data.phone, 200),
        message,
        status: "Nuevo",
        createdAt: photoDate(data.createdAt ?? data.c) || photoDate(data.d),
        updatedAt: "",
        editable: false,
      }];
    }

    if (module === "followups" && !("name" in data) && ("m" in data || "t" in data)) {
      const memberId = text(data.m, 150);
      return [{
        id: `legacy:${document.id}`,
        name: members.get(memberId) ?? memberId ?? "Joven sin nombre",
        date: managedRecordDate(data.d) || managedRecordDate(data.c),
        reason: text(data.t, 500) || "Seguimiento",
        notes: text(data.n, 3000),
        status: "Completado",
        createdAt: photoDate(data.c),
        updatedAt: "",
        editable: false,
      }];
    }

    if (module === "visitors" && ("created" in data || "vs" in data || "st" in data)) {
      const visits = Array.isArray(data.vs) ? data.vs : [];
      const originalStatus = text(data.st, 40);
      return [{
        id: `legacy:${document.id}`,
        name: text(data.name, 120),
        phone: text(data.phone, 80),
        email: "",
        date: managedRecordDate(data.created),
        source: text(data.by, 300),
        notes: visits.length ? `Visitas registradas: ${visits.length}` : "",
        status: originalStatus === "miembro"
          ? "Integrado"
          : visits.length > 1 ? "Contactado" : "Nuevo",
        createdAt: photoDate(data.created),
        updatedAt: "",
        editable: false,
      }];
    }

    const safeData: Record<string, unknown> = {};
    definition.fields.forEach((field) => {
      safeData[field] = text(data[field], field === "notes" || field === "message" ? 3000 : 500);
    });
    return [mapManagedRecord(document.id, {
      ...safeData,
      status: text(data.status, 40) || definition.statuses[0],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })];
  });

  records.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return {records};
});

export const adminCreateManagedRecord = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const {module, definition} = managedDefinition(request.data?.module);
  if (module === "inbox") await requireAdminOrPastor(request.auth.uid);
  else await requireModulePermission(request.auth.uid, definition.permission);

  const payload = managedPayload(definition, request.data?.record);
  if (definition.required.some((field) => !payload[field]?.trim())) {
    throw new HttpsError("invalid-argument", "Completa todos los campos obligatorios.");
  }
  if (module !== "inbox" && !isValidDate(payload.date)) {
    throw new HttpsError("invalid-argument", "Indica una fecha válida.");
  }
  if (module === "turns" && (!isValidTime(payload.startTime) || !isValidTime(payload.endTime))) {
    throw new HttpsError("invalid-argument", "Indica horas válidas para el turno.");
  }

  const requestedStatus = text(request.data?.status, 40);
  const status = requestedStatus || definition.statuses[0];
  if (!definition.statuses.includes(status)) {
    throw new HttpsError("invalid-argument", "El estado del registro no es válido.");
  }

  const now = new Date().toISOString();
  const ref = await db.collection(definition.collection).add({
    ...payload,
    status,
    createdAt: now,
    updatedAt: now,
    createdBy: request.auth.uid,
    updatedBy: request.auth.uid,
  });
  await recordAudit(`managed.${module}.created`, request.auth.uid, ref.id, {module});
  return {success: true, id: ref.id};
});

export const adminUpdateManagedRecord = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const {module, definition} = managedDefinition(request.data?.module);
  if (module === "inbox") await requireAdminOrPastor(request.auth.uid);
  else await requireModulePermission(request.auth.uid, definition.permission);

  const id = text(request.data?.id, 150);
  if (!id || id.startsWith("legacy:")) {
    throw new HttpsError("failed-precondition", "Los registros históricos se conservan en solo lectura.");
  }
  const payload = managedPayload(definition, request.data?.record);
  if (definition.required.some((field) => !payload[field]?.trim())) {
    throw new HttpsError("invalid-argument", "Completa todos los campos obligatorios.");
  }
  if (module !== "inbox" && !isValidDate(payload.date)) {
    throw new HttpsError("invalid-argument", "Indica una fecha válida.");
  }
  if (module === "turns" && (!isValidTime(payload.startTime) || !isValidTime(payload.endTime))) {
    throw new HttpsError("invalid-argument", "Indica horas válidas para el turno.");
  }

  const ref = db.collection(definition.collection).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new HttpsError("not-found", "No se encontró el registro que intentas editar.");
  await ref.update({
    ...payload,
    updatedAt: new Date().toISOString(),
    updatedBy: request.auth.uid,
  });
  await recordAudit(`managed.${module}.updated`, request.auth.uid, id, {module});
  return {success: true};
});

export const adminUpdateManagedRecordStatus = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const {module, definition} = managedDefinition(request.data?.module);
  if (module === "inbox") await requireAdminOrPastor(request.auth.uid);
  else await requireModulePermission(request.auth.uid, definition.permission);

  const id = text(request.data?.id, 150);
  const status = text(request.data?.status, 40);
  if (!id || id.startsWith("legacy:") || !definition.statuses.includes(status)) {
    throw new HttpsError("invalid-argument", "El registro o estado no es válido.");
  }
  const ref = db.collection(definition.collection).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new HttpsError("not-found", "No se encontró el registro solicitado.");
  await ref.update({
    status,
    updatedAt: new Date().toISOString(),
    updatedBy: request.auth.uid,
  });
  await recordAudit(`managed.${module}.status`, request.auth.uid, id, {module, status});
  return {success: true};
});

export const adminDeleteManagedRecord = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const {module, definition} = managedDefinition(request.data?.module);
  if (module === "inbox") await requireAdminOrPastor(request.auth.uid);
  else await requireModulePermission(request.auth.uid, definition.permission);

  const id = text(request.data?.id, 150);
  if (!id || id.startsWith("legacy:")) {
    throw new HttpsError("failed-precondition", "Los registros históricos se conservan en solo lectura.");
  }
  const ref = db.collection(definition.collection).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new HttpsError("not-found", "No se encontró el registro solicitado.");
  await ref.delete();
  await recordAudit(`managed.${module}.deleted`, request.auth.uid, id, {module});
  return {success: true};
});

export const adminListDevotionals = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireModulePermission(request.auth.uid, "devotionals");
  const snapshot = await db.collection("devotionals").limit(300).get();
  const devotionals = snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      title: text(data.title, 120),
      verse: text(data.verse, 2000),
      reference: text(data.reference, 120),
      author: text(data.author, 100),
      category: text(data.category, 50),
      date: text(data.date, 10),
      content: text(data.content, 10000),
      createdAt: photoDate(data.createdAt),
    };
  }).sort((left, right) =>
    right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt),
  );
  return {devotionals};
});

export const adminCreateDevotional = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireModulePermission(request.auth.uid, "devotionals");

  const data = request.data ?? {};
  const title = text(data.title, 120);
  const verse = text(data.verse, 2000);
  const reference = text(data.reference, 120);
  const author = text(data.author, 100);
  const category = text(data.category, 50);
  const date = text(data.date, 10);
  const content = text(data.content, 10000);

  if (!title || !verse || !reference || !author || !category || !content || !isValidDate(date)) {
    throw new HttpsError("invalid-argument", "Completa los campos y verifica la fecha del devocional.");
  }

  const result = await db.collection("devotionals").add({
    title, verse, reference, author, category, date, content,
    createdAt: new Date().toISOString(),
    createdBy: request.auth.uid,
  });
  return {success: true, id: result.id};
});

export const adminDeleteDevotional = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireModulePermission(request.auth.uid, "devotionals");
  const id = text(request.data?.id, 150);
  if (!id) throw new HttpsError("invalid-argument", "Selecciona un devocional válido.");
  const ref = db.collection("devotionals").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "No se encontró el devocional solicitado.");
  await ref.delete();
  return {success: true};
});

export const adminListBonusRecords = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdmin(request.auth.uid);
  const snapshot = await db.collection("bonus").limit(500).get();
  const records = snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      memberId: text(data.memberId, 150),
      memberName: text(data.memberName, 120),
      reason: text(data.reason, 1000),
      points: Math.max(0, Math.min(10000, Number(data.points) || 0)),
      createdAt: photoDate(data.createdAt),
    };
  }).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return {records};
});

export const adminCreateBonusRecord = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdmin(request.auth.uid);
  const memberId = text(request.data?.memberId, 150);
  const reason = text(request.data?.reason, 1000);
  const points = Number(request.data?.points);
  if (!memberId || !reason || !Number.isInteger(points) || points < 1 || points > 10000) {
    throw new HttpsError("invalid-argument", "Selecciona un joven, indica el motivo y un valor entero entre 1 y 10000 puntos.");
  }
  const member = await db.collection("members").doc(memberId).get();
  if (!member.exists) throw new HttpsError("not-found", "El joven seleccionado ya no existe.");
  const memberName = text(member.data()?.name, 120);
  if (!memberName) throw new HttpsError("failed-precondition", "El perfil no contiene un nombre válido.");

  const ref = await db.collection("bonus").add({
    memberId,
    memberName,
    reason,
    points,
    createdAt: new Date().toISOString(),
    createdBy: request.auth.uid,
  });
  await db.collection("audit").add({
    action: "bonus.created",
    actorUid: request.auth.uid,
    targetUid: memberId,
    createdAt: new Date().toISOString(),
    metadata: {points, bonusId: ref.id},
  });
  return {success: true, id: ref.id};
});

export const adminListPastoralNotes = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdminOrPastor(request.auth.uid);
  const snapshot = await db.collection("pastoral").limit(300).get();
  const records = snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      memberId: text(data.memberId, 150),
      memberName: text(data.memberName, 120),
      title: text(data.title, 160),
      note: text(data.note, 5000),
      createdAt: photoDate(data.createdAt),
      createdBy: text(data.createdBy, 150),
    };
  }).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return {records};
});

export const adminCreatePastoralNote = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdminOrPastor(request.auth.uid);
  const memberId = text(request.data?.memberId, 150);
  const title = text(request.data?.title, 160);
  const note = text(request.data?.note, 5000);
  if (!memberId || title.length < 2 || note.length < 3) {
    throw new HttpsError("invalid-argument", "Selecciona un joven y completa el título y la nota.");
  }
  const member = await db.collection("members").doc(memberId).get();
  if (!member.exists) throw new HttpsError("not-found", "El joven seleccionado ya no existe.");
  const memberName = text(member.data()?.name, 120);
  if (!memberName) throw new HttpsError("failed-precondition", "El perfil no contiene un nombre válido.");

  const ref = await db.collection("pastoral").add({
    memberId,
    memberName,
    title,
    note,
    createdAt: new Date().toISOString(),
    createdBy: request.auth.uid,
  });
  await db.collection("audit").add({
    action: "pastoral-note.created",
    actorUid: request.auth.uid,
    targetUid: memberId,
    createdAt: new Date().toISOString(),
    metadata: {noteId: ref.id},
  });
  return {success: true, id: ref.id};
});


type AdminNotification = {
  id: string;
  kind: string;
  title: string;
  description: string;
  createdAt: string;
  path: string;
  priority: "high" | "normal";
};

/** Agrega en una sola vista los pendientes que ya existen en los módulos administrativos. */
export const adminGetNotifications = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdminOrPastor(request.auth.uid);

  const [followups, visitors, prayers, inbox, photos] = await Promise.all([
    db.collection("followups").limit(200).get(),
    db.collection("visitors").limit(200).get(),
    db.collection("publicPrayerRequests").limit(200).get(),
    db.collection("inbox").limit(300).get(),
    db.collection("fotoPend").limit(200).get(),
  ]);

  const notifications: AdminNotification[] = [];
  const add = (item: AdminNotification) => notifications.push(item);

  followups.docs.forEach((document) => {
    const data = document.data();
    const status = text(data.status, 40) || "Pendiente";
    if (!["Pendiente", "En proceso"].includes(status)) return;
    add({
      id: `followup:${document.id}`, kind: "Seguimiento",
      title: text(data.name, 120) || "Joven sin nombre",
      description: `${text(data.reason, 180) || "Seguimiento pendiente"} · ${status}`,
      createdAt: photoDate(data.updatedAt ?? data.createdAt),
      path: "/seguimiento", priority: status === "Pendiente" ? "high" : "normal",
    });
  });

  visitors.docs.forEach((document) => {
    const data = document.data();
    const status = text(data.status, 40) || "Nuevo";
    if (!["Nuevo", "Contactado"].includes(status)) return;
    add({
      id: `visitor:${document.id}`, kind: "Visitante",
      title: text(data.name, 120) || "Visitante sin nombre",
      description: `${text(data.phone, 60) || "Sin teléfono"} · ${status}`,
      createdAt: photoDate(data.updatedAt ?? data.createdAt),
      path: "/visitantes", priority: status === "Nuevo" ? "high" : "normal",
    });
  });

  prayers.docs.forEach((document) => {
    const data = document.data();
    const status = text(data.status, 30) || "Pendiente";
    if (!["Pendiente", "En oración"].includes(status)) return;
    add({
      id: `prayer:${document.id}`, kind: "Petición",
      title: text(data.requester, 80) || "Anónimo",
      description: `${text(data.category, 50) || "General"} · ${status}`,
      createdAt: photoDate(data.createdAt),
      path: "/peticiones", priority: status === "Pendiente" ? "high" : "normal",
    });
  });

  inbox.docs.forEach((document) => {
    const data = document.data();
    if (data.k === "p") return;
    const status = text(data.status, 40) || "Nuevo";
    if (!["Nuevo", "En revisión"].includes(status)) return;
    add({
      id: `inbox:${document.id}`, kind: "Mensaje",
      title: text(data.senderName ?? data.name ?? data.n, 120) || "Nuevo mensaje",
      description: `${text(data.subject ?? data.title, 140) || "Mensaje recibido"} · ${status}`,
      createdAt: photoDate(data.createdAt ?? data.c ?? data.d),
      path: "/bandeja", priority: status === "Nuevo" ? "high" : "normal",
    });
  });

  photos.docs.forEach((document) => {
    const data = document.data();
    if (text(data.status, 30).toLowerCase() !== "pendiente") return;
    add({
      id: `photo:${document.id}`, kind: "Fotografía",
      title: text(data.title, 120) || "Fotografía por revisar",
      description: `Enviada por ${text(data.authorName, 100) || "un joven"}`,
      createdAt: photoDate(data.createdAt),
      path: "/fotos", priority: "normal",
    });
  });

  notifications.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return {notifications: notifications.slice(0, 150)};
});

export const adminListAuditRecords = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdmin(request.auth.uid);
  const snapshot = await db.collection("audit").orderBy("createdAt", "desc").limit(500).get();
  const records = snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      action: text(data.action, 120),
      actorUid: text(data.actorUid ?? data.userId, 150),
      userId: text(data.actorUid ?? data.userId, 150),
      userName: text(data.userName, 120),
      targetUid: text(data.targetUid, 150),
      description: text(data.description ?? data.action, 500),
      createdAt: photoDate(data.createdAt),
    };
  });
  return {records};
});

export const adminListSettings = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdmin(request.auth.uid);
  const snapshot = await db.collection("settings").limit(200).get();
  const records = snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      key: text(data.key, 120) || document.id,
      value: text(data.value, 3000),
      updatedAt: photoDate(data.updatedAt),
      updatedBy: text(data.updatedBy, 150),
    };
  }).sort((left, right) => left.key.localeCompare(right.key, "es"));
  return {records};
});

export const adminSaveSetting = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdmin(request.auth.uid);
  const key = text(request.data?.key, 120).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const value = text(request.data?.value, 3000);
  if (!key || !value) throw new HttpsError("invalid-argument", "Indica una clave y un valor válidos.");
  await db.collection("settings").doc(key).set({
    key,
    value,
    updatedAt: new Date().toISOString(),
    updatedBy: request.auth.uid,
  }, {merge: true});
  await db.collection("audit").add({
    action: "setting.updated",
    actorUid: request.auth.uid,
    createdAt: new Date().toISOString(),
    metadata: {key},
  });
  return {success: true, key};
});

export const adminListPhotos = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdminOrPastor(request.auth.uid);

  const [pendingSnapshot, approvedSnapshot] = await Promise.all([
    db.collection("fotoPend").orderBy("createdAt", "desc").limit(200).get(),
    db.collection("photos").orderBy("createdAt", "desc").limit(300).get(),
  ]);

  const pending = pendingSnapshot.docs.flatMap((document) => {
    const item = mapPhotoRecord(document.id, document.data(), "Pendiente");
    return item.imageUrl && validPhotoUrl(item.imageUrl) ? [item] : [];
  });
  const approved = approvedSnapshot.docs.flatMap((document) => {
    const data = document.data();
    const item = mapPhotoRecord(document.id, data, "Aprobada");
    // Profile-photo records in photos/{memberId} use p/f/a/b/t/u/w, not gallery images.
    if (!item.imageUrl || !validPhotoUrl(item.imageUrl)) return [];
    if (data.status && !["Aprobada", "approved", "published"].includes(String(data.status))) return [];
    return [{...item, status: "Aprobada"}];
  });

  return {pending, approved};
});

export const submitPhotoRequest = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdminOrPastor(request.auth.uid);

  const title = text(request.data?.title, 120);
  const description = text(request.data?.description, 2000);
  const imageUrl = text(request.data?.imageUrl, 2000);
  const authorName = text(request.data?.authorName, 120);
  if (!title || !imageUrl || !authorName) {
    throw new HttpsError("invalid-argument", "Completa el título, enlace y autor.");
  }
  if (!validPhotoUrl(imageUrl)) {
    throw new HttpsError("invalid-argument", "La imagen debe tener un enlace HTTP o HTTPS válido.");
  }

  const result = await db.collection("fotoPend").add({
    title,
    description,
    imageUrl,
    authorName,
    status: "Pendiente",
    createdAt: new Date().toISOString(),
    createdBy: request.auth.uid,
  });
  return {success: true, id: result.id};
});

export const approvePhotoRequest = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdminOrPastor(request.auth.uid);
  const id = text(request.data?.id, 150);
  if (!id) throw new HttpsError("invalid-argument", "Selecciona una fotografía válida.");

  const pendingRef = db.collection("fotoPend").doc(id);
  const approvedRef = db.collection("photos").doc(id);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(pendingRef);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "La fotografía pendiente ya no existe.");
    }
    const data = snapshot.data() ?? {};
    const imageUrl = text(data.imageUrl, 2000);
    if (!validPhotoUrl(imageUrl)) {
      throw new HttpsError("failed-precondition", "El enlace de la fotografía ya no es válido.");
    }
    transaction.set(approvedRef, {
      title: text(data.title, 120),
      description: text(data.description, 2000),
      imageUrl,
      authorName: text(data.authorName, 120),
      status: "Aprobada",
      createdAt: photoDate(data.createdAt) || new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      approvedBy: request.auth!.uid,
    });
    transaction.delete(pendingRef);
  });
  return {success: true, id};
});

export const rejectPhotoRequest = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdminOrPastor(request.auth.uid);
  const id = text(request.data?.id, 150);
  if (!id) throw new HttpsError("invalid-argument", "Selecciona una fotografía válida.");
  const ref = db.collection("fotoPend").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "La fotografía pendiente ya no existe.");
  await ref.update({
    status: "Rechazada",
    rejectedAt: new Date().toISOString(),
    rejectedBy: request.auth.uid,
  });
  return {success: true};
});

export const deleteApprovedPhoto = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdminOrPastor(request.auth.uid);
  const id = text(request.data?.id, 150);
  if (!id) throw new HttpsError("invalid-argument", "Selecciona una fotografía válida.");
  const ref = db.collection("photos").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "La fotografía aprobada ya no existe.");
  const data = snapshot.data() ?? {};
  const imageUrl = text(data.imageUrl, 2000);
  if (!imageUrl || !validPhotoUrl(imageUrl) ||
    (data.status && !["Aprobada", "approved", "published"].includes(String(data.status)))) {
    throw new HttpsError("failed-precondition", "Este registro no pertenece a la galería pública de fotografías.");
  }
  await ref.delete();
  return {success: true};
});

export const getPublicWeeklyActivities = onCall(async () => {
  try {
    const [modernSnapshot, legacyEventsSnapshot, rankingSnapshot] = await Promise.all([
      db.collection("weeklyActivities").limit(100).get(),
      db.collection("events").limit(100).get(),
      db.collection("public").doc("ranking").get(),
    ]);

    const ranking = rankingSnapshot.data() ?? {};
    const legacyRankingActivities = ranking.off === true || !Array.isArray(ranking.ev)
      ? []
      : (ranking.ev as unknown[]).flatMap((entry, index) => {
        if (!entry || typeof entry !== "object") return [];
        const mapped = mapLegacyWeeklyActivity(
          `legacy-public-${index}`,
          entry as Record<string, unknown>,
        );
        return mapped ? [mapped] : [];
      });

    const legacyEventActivities = legacyEventsSnapshot.docs.flatMap((document) => {
      const mapped = mapLegacyWeeklyActivity(
        `legacy-event-${document.id}`,
        document.data(),
      );
      return mapped ? [mapped] : [];
    });

    const modernActivities = modernSnapshot.docs.flatMap((document) => {
      const mapped = mapModernWeeklyActivity(document.id, document.data());
      return mapped ? [mapped] : [];
    });

    const activities = mergeWeeklyActivityRecords([
      legacyRankingActivities.filter((item) => item.published),
      legacyEventActivities.filter((item) => item.published),
      modernActivities.filter((item) => item.published),
    ]).map(({editable: _editable, ...activity}) => activity);

    return {activities};
  } catch (error) {
    console.error("Error leyendo la agenda pública:", error);
    throw new HttpsError("internal", "No se pudieron consultar las actividades.");
  }
});

export const adminListWeeklyActivities = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireModulePermission(request.auth.uid, "events");

  const [modernSnapshot, legacyEventsSnapshot, rankingSnapshot] = await Promise.all([
    db.collection("weeklyActivities").limit(100).get(),
    db.collection("events").limit(100).get(),
    db.collection("public").doc("ranking").get(),
  ]);

  const ranking = rankingSnapshot.data() ?? {};
  const legacyRankingActivities = ranking.off === true || !Array.isArray(ranking.ev)
    ? []
    : (ranking.ev as unknown[]).flatMap((entry, index) => {
      if (!entry || typeof entry !== "object") return [];
      const mapped = mapLegacyWeeklyActivity(
        `legacy-public-${index}`,
        entry as Record<string, unknown>,
      );
      return mapped ? [mapped] : [];
    });

  const legacyEventActivities = legacyEventsSnapshot.docs.flatMap((document) => {
    const mapped = mapLegacyWeeklyActivity(
      `legacy-event-${document.id}`,
      document.data(),
    );
    return mapped ? [mapped] : [];
  });

  const modernActivities = modernSnapshot.docs.flatMap((document) => {
    const mapped = mapModernWeeklyActivity(document.id, document.data());
    return mapped ? [mapped] : [];
  });

  return {
    activities: mergeWeeklyActivityRecords([
      legacyRankingActivities,
      legacyEventActivities,
      modernActivities,
    ]),
  };
});

export const adminSaveWeeklyActivity = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireModulePermission(request.auth.uid, "events");

  const data = request.data ?? {};
  const title = text(data.title, 120);
  const description = text(data.description, 1200);
  const date = text(data.date, 10);
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
  const memberId = text(request.data?.memberId, 150);

  if (message.length < 8) {
    throw new HttpsError("invalid-argument", "Escribe una petición de al menos 8 caracteres.");
  }
  if (!memberId || memberId.length >= 40 || memberId.startsWith("public-profile-")) {
    throw new HttpsError("invalid-argument", "Selecciona un perfil válido para enviar la petición.");
  }
  const [memberSnapshot, modernPublicSnapshot, rankingSnapshot] = await Promise.all([
    db.collection("members").doc(memberId).get(),
    db.collection("publicProfiles").doc(memberId).get(),
    db.collection("public").doc("ranking").get(),
  ]);
  const rankingData = rankingSnapshot.data() ?? {};
  const legacyEntries = Array.isArray(rankingData.all) ? rankingData.all as unknown[] : [];
  const publishedInLegacyRanking = rankingData.off !== true && legacyEntries.some((entry) =>
    Boolean(entry && typeof entry === "object" &&
      text((entry as Record<string, unknown>).i, 150) === memberId),
  );
  const modernProfileIsPublic = modernPublicSnapshot.exists &&
    modernPublicSnapshot.data()?.nopub !== true &&
    Boolean(text(modernPublicSnapshot.data()?.name, 120));
  if (!memberSnapshot.exists || memberSnapshot.data()?.nopub === true ||
    (!modernProfileIsPublic && !publishedInLegacyRanking)) {
    throw new HttpsError("failed-precondition", "El perfil seleccionado ya no está publicado o no está disponible.");
  }

  const ip = String(request.rawRequest.ip ?? "unknown").slice(0, 100);
  const day = new Date().toISOString().slice(0, 10);
  const ipKey = createHash("sha256").update(ip + "|" + day).digest("hex");
  const memberKey = createHash("sha256").update(ip + "|" + memberId + "|" + day).digest("hex");
  const ipRateRef = db.collection("publicPrayerRateLimits").doc(ipKey);
  const memberRateRef = db.collection("publicPrayerMemberRateLimits").doc(memberKey);
  const prayerRef = db.collection("publicPrayerRequests").doc();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await db.runTransaction(async (transaction) => {
    const [ipSnapshot, memberRateSnapshot] = await Promise.all([
      transaction.get(ipRateRef),
      transaction.get(memberRateRef),
    ]);
    const ipCount = Number(ipSnapshot.data()?.count ?? 0);
    const memberCount = Number(memberRateSnapshot.data()?.count ?? 0);

    // Shared church/mobile networks can contain many different young people.
    // Keep a broad network ceiling and a tighter per-profile ceiling.
    if (ipCount >= 100) {
      throw new HttpsError("resource-exhausted", "Esta conexión alcanzó el límite diario de solicitudes. Intenta mañana.");
    }
    if (memberCount >= 3) {
      throw new HttpsError("resource-exhausted", "Este perfil ya alcanzó el límite diario de peticiones.");
    }

    transaction.set(ipRateRef, {
      count: FieldValue.increment(1),
      day,
      expiresAt,
    }, {merge: true});
    transaction.set(memberRateRef, {
      count: FieldValue.increment(1),
      day,
      expiresAt,
    }, {merge: true});
    transaction.create(prayerRef, {
      memberId,
      requester,
      category,
      message,
      status: "Pendiente",
      createdAt: new Date().toISOString(),
      source: "portal-joven",
    });
  });

  return {success: true, id: prayerRef.id};
});

export const adminGetPrayerRequests = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAdminOrPastor(request.auth.uid);

  const [modernSnapshot, legacySnapshot] = await Promise.all([
    db.collection("publicPrayerRequests").limit(300).get(),
    db.collection("inbox").limit(500).get(),
  ]);

  const modern = modernSnapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: `request:${document.id}`,
      requester: text(data.requester, 80) || "Anónimo",
      category: text(data.category, 50) || "General",
      message: text(data.message, 1200),
      status: text(data.status, 30) || "Pendiente",
      createdAt: text(data.createdAt, 40),
    };
  });

  const legacy = legacySnapshot.docs.flatMap((document) => {
    const data = document.data();
    if (data.k !== "p") return [];
    const raw = text(data.t, 700);
    const categoryMatch = raw.match(/^\[([^\]]{1,50})\]\s*/);
    const createdAt = typeof data.c === "number" && Number.isFinite(data.c)
      ? new Date(data.c).toISOString()
      : text(data.d, 40);
    return [{
      id: `legacy:${document.id}`,
      requester: text(data.n, 80) || "Anónimo",
      category: categoryMatch?.[1] ?? "General",
      message: categoryMatch ? raw.slice(categoryMatch[0].length) : raw,
      status: text(data.status, 30) || "Pendiente",
      createdAt,
    }];
  });

  const petitions = [...modern, ...legacy]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return {petitions};
});

export const adminUpdatePrayerStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireAdminOrPastor(request.auth.uid);
  const id = text(request.data?.id, 180);
  const status = text(request.data?.status, 30);
  if (!id || !["Pendiente", "En oración", "Atendida"].includes(status)) {
    throw new HttpsError("invalid-argument", "El estado de la petición no es válido.");
  }

  const update = {
    status,
    statusUpdatedAt: new Date().toISOString(),
    statusUpdatedBy: request.auth.uid,
  };
  if (id.startsWith("request:")) {
    const documentId = id.slice("request:".length);
    await db.collection("publicPrayerRequests").doc(documentId).update(update);
  } else if (id.startsWith("legacy:")) {
    const documentId = id.slice("legacy:".length);
    const ref = db.collection("inbox").doc(documentId);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data()?.k !== "p") {
      throw new HttpsError("not-found", "No se encontró la petición histórica.");
    }
    await ref.update(update);
  } else {
    throw new HttpsError("invalid-argument", "El identificador de la petición no es válido.");
  }
  await recordAudit("prayer.status.updated", request.auth.uid, id, {status});
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

export const listCheckins = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireModulePermission(request.auth.uid, "checkins");
  const snapshot = await db.collection("checkins").orderBy("createdAt", "desc").limit(500).get();
  return {checkins: snapshot.docs.map((document) => {
    const data = document.data();
    const createdAt = data.createdAt && typeof data.createdAt.toDate === "function"
      ? data.createdAt.toDate().toISOString()
      : data.createdAt instanceof Date ? data.createdAt.toISOString() : "";
    return {
      id: document.id,
      memberId: text(data.memberId, 150),
      memberName: text(data.memberName, 120),
      meetingName: text(data.meetingName, 100),
      date: text(data.date, 10),
      createdAt,
    };
  })};
});

export const createCheckin = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireModulePermission(request.auth.uid, "checkins");
  const memberId = text(request.data?.memberId, 150);
  const meetingName = text(request.data?.meetingName, 100);
  const date = text(request.data?.date, 10);
  if (!memberId || !meetingName || !isValidDate(date)) {
    throw new HttpsError("invalid-argument", "Los datos del registro QR no son válidos.");
  }
  const memberSnapshot = await db.collection("members").doc(memberId).get();
  if (!memberSnapshot.exists) throw new HttpsError("not-found", "El joven seleccionado ya no existe.");
  const memberName = text(memberSnapshot.data()?.name, 120);
  if (!memberName) throw new HttpsError("failed-precondition", "El perfil del joven no tiene nombre.");
  const existingCheckins = await db.collection("checkins").limit(2000).get();
  const duplicateExists = existingCheckins.docs.some((document) => {
    const record = document.data();
    return record.memberId === memberId &&
      record.date === date &&
      String(record.meetingName ?? "").trim().toLocaleLowerCase("es") === meetingName.toLocaleLowerCase("es");
  });
  if (duplicateExists) {
    throw new HttpsError("already-exists", `${memberName} ya tiene un registro para este servicio.`);
  }
  const id = createHash("sha256")
    .update(`${memberId}|${date}|${meetingName.toLocaleLowerCase("es")}`)
    .digest("hex").slice(0, 40);
  const checkinRef = db.collection("checkins").doc(id);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(checkinRef);
    if (existing.exists) {
      throw new HttpsError("already-exists", `${memberName} ya tiene un registro para este servicio.`);
    }
    transaction.create(checkinRef, {
      memberId, memberName, meetingName, date,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: request.auth!.uid,
    });
  });
  await recordAudit("checkin.created", request.auth.uid, memberId, {date, meetingName});
  return {success: true, id, memberName};
});

export const getAttendanceMeetings = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const requestedModule = text(request.data?.module, 30);
  const moduleId = requestedModule === "reports" ? "reports" : "attendance";
  await requireModulePermission(request.auth.uid, moduleId);

  const [modernSnapshot, legacySnapshot, membersSnapshot] = await Promise.all([
    db.collection("attendanceMeetings").orderBy("date", "desc").limit(300).get(),
    db.collection("attendance").limit(1000).get(),
    db.collection("members").limit(1000).get(),
  ]);

  const memberNames = new Map(
    membersSnapshot.docs.map((document) => [
      document.id,
      text(document.data().name, 120) || document.id,
    ]),
  );
  const validStatuses = ["Presente", "Ausente", "Tarde", "Falta", "Justificada", "Justificado"];
  const modern = modernSnapshot.docs.map((document) => {
    const data = document.data();
    const participants = Array.isArray(data.participants)
      ? data.participants.flatMap((item) => {
        if (typeof item !== "object" || item === null) return [];
        const row = item as Record<string, unknown>;
        if (typeof row.memberId !== "string" || !validStatuses.includes(String(row.status))) return [];
        return [{
          memberId: text(row.memberId, 150),
          name: text(row.name, 120) || memberNames.get(text(row.memberId, 150)) || "Joven",
          status: (row.status === "Justificado" ? "Justificada" : row.status) as
            "Presente" | "Ausente" | "Tarde" | "Falta" | "Justificada",
        }];
      })
      : [];
    return {
      id: document.id,
      name: text(data.name, 100),
      date: text(data.date, 20),
      createdAt: data.createdAt && typeof data.createdAt.toDate === "function"
        ? data.createdAt.toDate().toISOString()
        : text(data.createdAt, 40),
      participants,
    };
  });

  const serviceNames: Record<string, string> = {
    dis: "Discipulado",
    mie: "Servicio de miércoles",
    vie: "Servicio de viernes",
    ayj: "Ayuno y servicio de jóvenes",
    ayc: "Ayuno de la congregación",
    esc: "Escuela dominical",
    otr: "Otro servicio o actividad",
    gen: "Servicio",
  };
  const legacy = legacySnapshot.docs.map((document) => {
    const data = document.data();
    const [date = "", service = "gen"] = document.id.split("_");
    const records = data.r && typeof data.r === "object"
      ? data.r as Record<string, unknown>
      : {};
    const participants = Object.entries(records).flatMap(([memberId, value]) => {
      if (!value || typeof value !== "object") return [];
      const statusCode = text((value as Record<string, unknown>).s, 10);
      const statusMap: Record<string, "Presente" | "Tarde" | "Falta" | "Justificada"> = {
        P: "Presente", T: "Tarde", F: "Falta", J: "Justificada",
      };
      const status = statusMap[statusCode];
      return status ? [{
        memberId,
        name: memberNames.get(memberId) ?? memberId,
        status,
      }] : [];
    });
    return {
      id: document.id,
      name: serviceNames[service] ?? serviceNames.gen,
      date,
      createdAt: "",
      participants,
    };
  });

  const merged = new Map<string, typeof modern[number]>();
  [...legacy, ...modern].forEach((meeting) => merged.set(meeting.id, meeting));
  return {
    meetings: [...merged.values()].sort((left, right) => right.date.localeCompare(left.date)),
    historyLimited: legacySnapshot.size >= 1000 || membersSnapshot.size >= 1000,
  };
});

export const createAttendanceMeeting = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireModulePermission(request.auth.uid, "attendance");

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
  await recordAudit("attendance.meeting.created", request.auth.uid, meeting.id, {date: meetingDate});
  return {success: true, meetingId: meeting.id};
});

export const saveMeetingAttendance = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireModulePermission(request.auth.uid, "attendance");

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

  const validStatuses = ["Presente", "Tarde", "Falta", "Justificada", "Ausente"];
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
  await recordAudit("attendance.saved", request.auth.uid, meetingId, {participants: participants.length});
  return {success: true};
});
