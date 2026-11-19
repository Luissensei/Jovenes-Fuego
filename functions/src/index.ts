import {createHash, createHmac, randomInt, timingSafeEqual} from "node:crypto";
import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "./vercelAdapter.js";
import {initializeApp, getApps, cert} from "firebase-admin/app";
import {getFirestore, FieldValue, FieldPath, type QueryDocumentSnapshot} from "firebase-admin/firestore";
import {getAuth as getAdminAuth} from "firebase-admin/auth";

setGlobalOptions({maxInstances: 10});

function initializeFirebaseAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const rawCredential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawCredential) return initializeApp();

  let serviceAccount: Record<string, unknown>;
  try {
    serviceAccount = JSON.parse(rawCredential) as Record<string, unknown>;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON no contiene JSON válido.");
  }

  if (serviceAccount.project_id !== "jovenes-de-fuego") {
    throw new Error("La credencial de Vercel no pertenece al proyecto Firebase original.");
  }

  return initializeApp({
    credential: cert(serviceAccount as never),
    projectId: "jovenes-de-fuego",
  });
}

const app = initializeFirebaseAdminApp();
const db = getFirestore(app);
const adminAuth = getAdminAuth(app);

type AuthorizedRole = "admin" | "administrador" | "pastor" | "lider" | "líder";

function text(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.trim().replace(/\u0000/g, "").slice(0, maxLength)
    : "";
}

async function loadAuthorizedUser(uid: string) {
  const userSnapshot = await db.collection("users").doc(uid).get();
  if (!userSnapshot.exists) {
    throw new HttpsError("permission-denied", "No tienes un perfil autorizado.");
  }

  const userData = userSnapshot.data() ?? {};
  if (String(userData.status ?? "").trim().toLowerCase() === "inactive") {
    throw new HttpsError("permission-denied", "Esta cuenta está suspendida.");
  }
  const role = String(userData.role ?? "").trim().toLowerCase();
  const allowed: AuthorizedRole[] = ["admin", "administrador", "pastor", "lider", "líder"];
  if (!allowed.includes(role as AuthorizedRole)) {
    throw new HttpsError("permission-denied", "Tu rol no tiene permiso para esta operación.");
  }
  return {role: role as AuthorizedRole, userData};
}

async function requireAuthorizedRole(uid: string): Promise<AuthorizedRole> {
  return (await loadAuthorizedUser(uid)).role;
}

async function requireAdminOrPastor(uid: string): Promise<AuthorizedRole> {
  const role = await requireAuthorizedRole(uid);
  if (role !== "admin" && role !== "administrador" && role !== "pastor") {
    throw new HttpsError("permission-denied", "Esta operación está reservada para administración y pastoral.");
  }
  return role;
}

/** Gestión de PIN juvenil: administración, pastoral y líderes activos.
 * @param {string} uid UID del usuario que solicita gestionar los PIN.
 * @return {Promise<AuthorizedRole>} Rol autorizado del solicitante.
 */
async function requireYouthPinManager(uid: string): Promise<AuthorizedRole> {
  return requireAuthorizedRole(uid);
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
  const [modernSnapshot, rankingSnapshot, membersSnapshot] = await Promise.all([
    db.collection("publicProfiles").limit(100).get(),
    db.collection("public").doc("ranking").get(),
    db.collection("members").limit(500).get(),
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

  // Migración compatible: los perfiles históricos viven en "members".
  // La colección se consulta con Admin SDK, pero solo se publican campos de
  // identidad juvenil; nunca teléfono, dirección, notas ni datos familiares.
  // "nopub" es la exclusión explícita conservada por el panel administrativo.
  membersSnapshot.docs.forEach((document) => {
    const data = document.data();
    const name = text(data.name, 120);
    if (!name || data.nopub === true || byId.has(document.id)) return;
    const rawPoints = Number(data.points ?? data.puntos ?? 0);
    byId.set(document.id, {
      id: document.id,
      name,
      nick: text(data.nick, 60),
      points: Number.isFinite(rawPoints) && rawPoints >= 0 ? rawPoints : 0,
      modern: {},
    });
  });

  const candidates = [...byId.values()];
  const memberIds = candidates
    .map((item) => item.id)
    .filter((id) => !id.startsWith("public-profile-"));
  // Reuse the first 500 legacy member documents already loaded above.
  // Only fetch candidates from the ranking/public profiles that were not in
  // that page, avoiding a second read of the same member documents.
  const members = new Map(
    membersSnapshot.docs.map((snapshot) => [snapshot.id, snapshot.data() ?? {}]),
  );
  const missingMemberIds = memberIds.filter((id) => !members.has(id));
  if (missingMemberIds.length) {
    const missingMemberSnapshots = await db.getAll(
      ...missingMemberIds.map((id) => db.collection("members").doc(id)),
    );
    missingMemberSnapshots.forEach((snapshot) => {
      if (snapshot.exists) members.set(snapshot.id, snapshot.data() ?? {});
    });
  }
  const photoSnapshots = includeAppearance && memberIds.length
    ? await db.getAll(...memberIds.map((id) => db.collection("photos").doc(id)))
    : [];
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

/**
 * Authenticates a username without disclosing the email address mapped to it.
 * The Firebase Identity Toolkit verifies the password; Admin SDK then issues
 * a short-lived custom sign-in token for the verified UID.
 */
export const signInWithUsername = onCall(async (request) => {
  const username = text(request.data?.username, 60).toLowerCase();
  const password = typeof request.data?.password === "string"
    ? request.data.password
    : "";

  if (!/^[a-z0-9._-]{1,60}$/.test(username) || !password || password.length > 4096) {
    throw new HttpsError("unauthenticated", "Usuario o contraseña incorrectos.");
  }

  const ip = String(request.rawRequest.ip ?? "unknown").slice(0, 100);
  const window = Math.floor(Date.now() / (15 * 60 * 1000));
  const rateKey = createHash("sha256").update(ip + "|" + window).digest("hex");
  const rateRef = db.collection("publicUsernameLoginRateLimits").doc(rateKey);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateRef);
    const count = Number(snapshot.data()?.count ?? 0);
    if (count >= 30) {
      throw new HttpsError(
        "resource-exhausted",
        "Demasiados intentos. Espera 15 minutos y vuelve a intentarlo.",
      );
    }
    transaction.set(rateRef, {
      count: FieldValue.increment(1),
      window,
      expiresAt: new Date((window + 2) * 15 * 60 * 1000),
    }, {merge: true});
  });

  const lookup = await db.collection("public").doc(`al_${username}`).get();
  const mappedEmail = text(lookup.data()?.e, 180).toLowerCase();
  const email = lookup.exists && mappedEmail.includes("@")
    ? mappedEmail
    : `${username}@jovenesdefuego.app`;
  const apiKey = process.env.FIREBASE_WEB_API_KEY ??
    "AIzaSyA3jQcyTX6q1D5ior7j3zJUfaQy_31RQ88";

  try {
    const identityResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email, password, returnSecureToken: true}),
      },
    );
    if (!identityResponse.ok) {
      throw new HttpsError("unauthenticated", "Usuario o contraseña incorrectos.");
    }

    const identity = await identityResponse.json() as {idToken?: string};
    if (!identity.idToken) {
      throw new HttpsError("unauthenticated", "Usuario o contraseña incorrectos.");
    }

    const decoded = await adminAuth.verifyIdToken(identity.idToken, true);
    const customToken = await adminAuth.createCustomToken(decoded.uid);
    return {customToken};
  } catch (cause) {
    if (cause instanceof HttpsError) throw cause;
    throw new HttpsError("unauthenticated", "Usuario o contraseña incorrectos.");
  }
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
    if (String(data.status ?? "").trim().toLowerCase() === "inactive") {
      throw new HttpsError("permission-denied", "Esta cuenta está suspendida.");
    }
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
    const error = cause instanceof Error ? cause : new Error(String(cause));
    // Diagnóstico privado: nunca registrar tokens, credenciales ni datos del perfil.
    console.error("getMyApplicationProfile Firestore read failed:", {
      errorName: error.name.slice(0, 80),
      errorMessage: error.message.slice(0, 500),
      stack: error.stack?.slice(0, 3000),
    });
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
  // Reutiliza el mismo documento para validar el rol y leer los permisos:
  // los líderes ya no generan una segunda lectura de users/{uid} por llamada.
  const {role, userData} = await loadAuthorizedUser(uid);
  if (role === "admin" || role === "administrador" || role === "pastor") return role;

  const stored = userData.permissions;
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

  // Firestore distingue mayúsculas, tildes y espacios en los valores de role.
  // Escaneamos users por páginas y normalizamos el rol para no ocultar líderes
  // históricos guardados como "Líder", "LIDER", " Lider " u otras variantes.
  const leaderDocuments: QueryDocumentSnapshot[] = [];
  let cursor: QueryDocumentSnapshot | undefined;
  let hasMorePages = true;
  while (hasMorePages) {
    let query = db.collection("users")
      .orderBy(FieldPath.documentId())
      .limit(500);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    leaderDocuments.push(...page.docs.filter((document) => {
      const role = String(document.data().role ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return ["lider", "pastor", "admin", "administrador"].includes(role);
    }));
    hasMorePages = page.size === 500;
    if (hasMorePages) cursor = page.docs[page.docs.length - 1];
  }
  const visible = leaderDocuments.slice(0, 200);

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
    throw new HttpsError("invalid-argument", "Las cuentas deben asignarse como líder o pastor. La administración se asigna por separado.");
  }
  if (permissions.length === 0) {
    throw new HttpsError("invalid-argument", "Asigna al menos un permiso de módulo.");
  }

  // Primero buscamos la cuenta de Firebase Authentication. Si ya existe,
  // vinculamos su UID al perfil de la aplicación en lugar de intentar crearla
  // otra vez (lo que provocaba auth/email-already-exists).
  let userRecord: Awaited<ReturnType<typeof adminAuth.getUserByEmail>>;
  let createdAuthAccount = false;
  try {
    userRecord = await adminAuth.getUserByEmail(email);
  } catch (cause) {
    const code = (cause as {code?: string})?.code;
    if (code !== "auth/user-not-found") {
      throw new HttpsError("internal", "No se pudo comprobar la cuenta de Firebase.");
    }
    try {
      userRecord = await adminAuth.createUser({
        email,
        displayName: name,
        emailVerified: false,
        disabled: false,
      });
      createdAuthAccount = true;
    } catch (createCause) {
      const createCode = (createCause as {code?: string})?.code;
      if (createCode === "auth/email-already-exists") {
        // Una creación simultánea pudo ganar la carrera: recuperamos esa cuenta.
        try {
          userRecord = await adminAuth.getUserByEmail(email);
        } catch {
          throw new HttpsError("already-exists", "Ya existe una cuenta con ese correo, pero no se pudo recuperar.");
        }
      } else {
        throw new HttpsError("internal", "No se pudo crear la cuenta de autenticación.");
      }
    }
  }

  const userRef = db.collection("users").doc(userRecord.uid);
  const existingProfile = await userRef.get();
  const existingRole = String(existingProfile.data()?.role ?? "")
    .trim().toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (["admin", "administrador"].includes(existingRole)) {
    if (createdAuthAccount) await adminAuth.deleteUser(userRecord.uid).catch(() => undefined);
    throw new HttpsError("failed-precondition", "Este correo ya pertenece a una cuenta administradora. No se puede convertir desde la gestión de líderes.");
  }

  let setupLink = "";
  try {
    if (createdAuthAccount) {
      setupLink = await adminAuth.generatePasswordResetLink(email);
    }
    const now = new Date().toISOString();
    const auditRef = db.collection("audit").doc();
    const batch = db.batch();
    batch.set(userRef, {
      name,
      user: email,
      email,
      role,
      groups,
      permissions,
      status: userRecord.disabled ? "inactive" : "active",
      ...(existingProfile.exists ? {} : {
        createdAt: now,
        createdBy: request.auth.uid,
      }),
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, {merge: true});
    batch.set(auditRef, {
      action: existingProfile.exists ? "leader.updated-from-admin" : (createdAuthAccount ? "leader.created" : "leader.linked"),
      actorUid: request.auth.uid,
      targetUid: userRecord.uid,
      createdAt: now,
      metadata: {email, role, linkedExistingAuthAccount: !createdAuthAccount},
    });
    await batch.commit();
  } catch {
    if (createdAuthAccount) {
      await adminAuth.deleteUser(userRecord.uid).catch(() => undefined);
    }
    throw new HttpsError("internal", "No se pudo guardar el perfil del líder. La cuenta existente de Firebase se conservó.");
  }

  return {
    uid: userRecord.uid,
    setupLink,
    linkedExistingAccount: !createdAuthAccount,
    accountDisabled: userRecord.disabled,
  };
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

/**
 * Derives the PIN/session signing key from the server-only Firebase credential.
 * Never falls back to a hard-coded public string.
 * @return {Buffer} A stable keyed digest.
 */
function getYouthPinPepper(): Buffer {
  const secret = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!secret) {
    throw new HttpsError(
      "failed-precondition",
      "La seguridad del PIN juvenil no está configurada. Configura FIREBASE_SERVICE_ACCOUNT_JSON en el entorno privado del servidor.",
    );
  }
  return createHash("sha256").update(secret).digest();
}

/**
 * Creates a server-only digest for a youth PIN.
 * @param {string} memberId The member document ID.
 * @param {string} pin The PIN supplied by the user.
 * @return {string} The keyed digest.
 */
function youthPinDigest(memberId: string, pin: string): string {
  return createHmac("sha256", getYouthPinPepper())
    .update(memberId + ":" + pin)
    .digest("hex");
}

/**
 * Compares a submitted PIN with its stored keyed digest.
 * @param {string} memberId The member document ID.
 * @param {string} pin The submitted PIN.
 * @param {unknown} stored The stored digest.
 * @return {boolean} Whether the PIN matches.
 */
function matchesYouthPin(
  memberId: string,
  pin: string,
  stored: unknown,
): boolean {
  if (typeof stored !== "string" || !/^[a-f0-9]{64}$/i.test(stored)) {
    return false;
  }
  const supplied = Buffer.from(youthPinDigest(memberId, pin), "hex");
  const expected = Buffer.from(stored, "hex");
  return supplied.length === expected.length &&
    timingSafeEqual(supplied, expected);
}

/**
 * Creates a short-lived signed session for a youth profile.
 * @param {string} memberId The authenticated member identifier.
 * @return {string} A signed session token valid for 24 hours.
 */
function createYouthCommunitySession(memberId: string): string {
  const payload = Buffer.from(JSON.stringify({
    memberId,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  })).toString("base64url");
  const signature = createHmac("sha256", getYouthPinPepper()).update(payload).digest("base64url");
  return payload + "." + signature;
}

/**
 * Validates a signed youth session and returns its member identifier.
 * @param {unknown} value The submitted community session token.
 * @return {string} The authenticated member identifier.
 */
function requireYouthCommunitySession(value: unknown): string {
  const token = text(value, 1200);
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) {
    throw new HttpsError("unauthenticated", "Tu sesión juvenil venció. Ingresa nuevamente con tu PIN.");
  }
  const expected = createHmac("sha256", getYouthPinPepper()).update(payload).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    throw new HttpsError("unauthenticated", "La sesión juvenil no es válida.");
  }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new HttpsError("unauthenticated", "La sesión juvenil no es válida.");
  }
  let decoded: {memberId?: unknown; expiresAt?: unknown};
  try {
    decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as typeof decoded;
  } catch {
    throw new HttpsError("unauthenticated", "La sesión juvenil no es válida.");
  }
  const memberId = validYouthMemberId(decoded.memberId);
  if (typeof decoded.expiresAt !== "number" || decoded.expiresAt <= Date.now()) {
    throw new HttpsError("unauthenticated", "Tu sesión juvenil venció. Ingresa nuevamente con tu PIN.");
  }
  return memberId;
}

async function getCommunityMember(memberId: string): Promise<{name: string; nick: string}> {
  const [memberSnapshot, publicSnapshot] = await Promise.all([
    db.collection("members").doc(memberId).get(),
    db.collection("publicProfiles").doc(memberId).get(),
  ]);
  const member = memberSnapshot.data() ?? {};
  const profile = publicSnapshot.data() ?? {};
  if (!memberSnapshot.exists || member.nopub === true || profile.nopub === true) {
    throw new HttpsError("permission-denied", "Este perfil no puede participar en la comunidad.");
  }
  return {
    name: text(profile.name, 120) || text(member.name, 120) || "Joven",
    nick: text(profile.nick, 60) || text(member.nick, 60),
  };
}

/**
 * Validates a public portal member identifier.
 * @param {unknown} value The requested identifier.
 * @return {string} A validated member ID.
 */
function validYouthMemberId(value: unknown): string {
  const memberId = text(value, 150);
  if (
    !memberId ||
    memberId.length >= 40 ||
    memberId.startsWith("public-profile-") ||
    !/^[A-Za-z0-9_-]+$/.test(memberId)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Selecciona un perfil juvenil válido.",
    );
  }
  return memberId;
}

const youthPinLockMessage =
  "Se bloquearon temporalmente los intentos. Espera 15 minutos y vuelve a intentarlo.";

export const getYouthProfilePinStatus = onCall(async (request) => {
  const memberId = validYouthMemberId(request.data?.memberId);
  const snapshot = await db.collection("youthProfilePins").doc(memberId).get();
  const data = snapshot.data() ?? {};
  return {
    configured: typeof data.pinHash === "string",
    activationPending: typeof data.activationHash === "string" &&
      Number(data.activationExpiresAt ?? 0) > Date.now(),
  };
});

export const activateYouthProfilePin = onCall(async (request) => {
  const memberId = validYouthMemberId(request.data?.memberId);
  const activationPin = text(request.data?.activationPin, 8);
  const newPin = text(request.data?.newPin, 4);
  if (!/^\d{8}$/.test(activationPin) || !/^\d{4}$/.test(newPin)) {
    throw new HttpsError(
      "invalid-argument",
      "El PIN temporal debe tener 8 dígitos y el PIN personal 4.",
    );
  }
  const weakPins = [
    "0000", "1111", "2222", "3333", "4444", "5555",
    "6666", "7777", "8888", "9999", "1234", "4321",
  ];
  if (weakPins.includes(newPin)) {
    throw new HttpsError(
      "invalid-argument",
      "Elige un PIN personal menos predecible.",
    );
  }

  const ref = db.collection("youthProfilePins").doc(memberId);
  const now = Date.now();
  const result = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() ?? {};
    if (typeof data.pinHash === "string") return "already-configured";
    if (typeof data.activationHash !== "string") return "no-activation";
    if (Number(data.lockedUntil ?? 0) > now) return "locked";
    if (Number(data.activationExpiresAt ?? 0) <= now) return "expired";

    if (!matchesYouthPin(memberId, activationPin, data.activationHash)) {
      const attempts = Number(data.attempts ?? 0) + 1;
      transaction.set(ref, {
        attempts,
        lockedUntil: attempts >= 5 ? now + 15 * 60 * 1000 : 0,
        lastAttemptAt: now,
      }, {merge: true});
      return attempts >= 5 ? "locked" : "invalid";
    }

    transaction.set(ref, {
      pinHash: youthPinDigest(memberId, newPin),
      pinConfiguredAt: new Date(now).toISOString(),
      attempts: 0,
      lockedUntil: 0,
      activationHash: FieldValue.delete(),
      activationExpiresAt: FieldValue.delete(),
      updatedAt: new Date(now).toISOString(),
    }, {merge: true});
    return "ok";
  });

  if (result === "already-configured") {
    throw new HttpsError(
      "failed-precondition",
      "Este perfil ya tiene un PIN personal. Ingresa con él.",
    );
  }
  if (result === "no-activation") {
    throw new HttpsError(
      "failed-precondition",
      "Solicita a administración un PIN temporal para activar tu perfil.",
    );
  }
  if (result === "expired") {
    throw new HttpsError(
      "failed-precondition",
      "El PIN temporal venció. Solicita uno nuevo a administración.",
    );
  }
  if (result === "locked") {
    throw new HttpsError("resource-exhausted", youthPinLockMessage);
  }
  if (result !== "ok") {
    throw new HttpsError(
      "permission-denied",
      "El PIN temporal no es correcto.",
    );
  }

  const profiles = await loadVisiblePublicProfiles();
  const profile = profiles.find((item) => item.id === memberId);
  if (!profile) {
    throw new HttpsError(
      "not-found",
      "No se encontró un perfil público para este joven.",
    );
  }
  return {profile, communitySession: createYouthCommunitySession(memberId)};
});

export const verifyYouthProfilePin = onCall(async (request) => {
  const memberId = validYouthMemberId(request.data?.memberId);
  const pin = text(request.data?.pin, 4);
  if (!/^\d{4}$/.test(pin)) {
    throw new HttpsError(
      "invalid-argument",
      "Escribe tu PIN personal de 4 dígitos.",
    );
  }

  const ref = db.collection("youthProfilePins").doc(memberId);
  const now = Date.now();
  const result = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() ?? {};
    if (typeof data.pinHash !== "string") return "not-configured";
    if (Number(data.lockedUntil ?? 0) > now) return "locked";

    if (!matchesYouthPin(memberId, pin, data.pinHash)) {
      const attempts = Number(data.attempts ?? 0) + 1;
      transaction.set(ref, {
        attempts,
        lockedUntil: attempts >= 5 ? now + 15 * 60 * 1000 : 0,
        lastAttemptAt: now,
      }, {merge: true});
      return attempts >= 5 ? "locked" : "invalid";
    }

    transaction.set(ref, {
      attempts: 0,
      lockedUntil: 0,
      lastVerifiedAt: new Date(now).toISOString(),
    }, {merge: true});
    return "ok";
  });

  if (result === "not-configured") {
    throw new HttpsError(
      "failed-precondition",
      "Este perfil todavía no tiene PIN. Solicita el PIN temporal a administración.",
    );
  }
  if (result === "locked") {
    throw new HttpsError("resource-exhausted", youthPinLockMessage);
  }
  if (result !== "ok") {
    throw new HttpsError(
      "permission-denied",
      "El PIN personal no es correcto.",
    );
  }

  const profiles = await loadVisiblePublicProfiles();
  const profile = profiles.find((item) => item.id === memberId);
  if (!profile) {
    throw new HttpsError(
      "not-found",
      "No se encontró un perfil público para este joven.",
    );
  }
  return {profile, communitySession: createYouthCommunitySession(memberId)};
});


/** Private community feed: every read requires a recent youth PIN session. */
/** Avisos oficiales publicados por el equipo pastoral para todos los jóvenes. */
export const adminPublishYouthCommunityAnnouncement = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdminOrPastor(request.auth.uid);
  const title = text(request.data?.title, 100);
  const message = text(request.data?.message, 800);
  if (title.length < 4 || message.length < 8) {
    throw new HttpsError("invalid-argument", "El título debe tener al menos 4 caracteres y el aviso 8.");
  }
  const ref = db.collection("youthCommunityAnnouncements").doc();
  const createdAt = new Date().toISOString();
  await ref.set({
    title, message, createdAt, createdBy: request.auth.uid,
    status: "published",
  });
  return {success: true, id: ref.id};
});

export const getYouthCommunityAnnouncements = onCall(async (request) => {
  const memberId = requireYouthCommunitySession(request.data?.communitySession);
  await getCommunityMember(memberId);
  const snapshot = await db.collection("youthCommunityAnnouncements")
    .orderBy("createdAt", "desc").limit(100).get();
  const announcements = snapshot.docs
    .filter((document) => document.data().status === "published")
    .slice(0, 20)
    .map((document) => {
      const data = document.data();
      return {
        id: document.id,
        title: text(data.title, 100),
        message: text(data.message, 800),
        createdAt: text(data.createdAt, 40),
      };
    });
  return {announcements};
});

export const getYouthCommunityFeed = onCall(async (request) => {
  const memberId = requireYouthCommunitySession(request.data?.communitySession);
  await getCommunityMember(memberId);
  const mode = text(request.data?.mode, 20) || "all";
  if (!["all", "mine"].includes(mode)) {
    throw new HttpsError("invalid-argument", "La vista de comunidad no es válida.");
  }

  // Conserva los bloqueos históricos para que esas publicaciones sigan ocultas.
  const [blockedByMeSnapshot, blockedMeSnapshot] = await Promise.all([
    db.collection("youthCommunityBlocks").where("blockerId", "==", memberId).limit(300).get(),
    db.collection("youthCommunityBlocks").where("blockedId", "==", memberId).limit(300).get(),
  ]);
  const blockedIds = new Set([
    ...blockedByMeSnapshot.docs.map((item) => text(item.data().blockedId, 150)),
    ...blockedMeSnapshot.docs.map((item) => text(item.data().blockerId, 150)),
  ]);

  const candidateSnapshot = mode === "mine"
    ? await db.collection("youthCommunityPosts").where("memberId", "==", memberId).limit(100).get()
    : await db.collection("youthCommunityPosts").orderBy("createdAt", "desc").limit(40).get();

  const candidates = candidateSnapshot.docs
    .filter((document) => {
      const data = document.data();
      const authorId = text(data.memberId, 150);
      if (!authorId || data.deleted === true || data.status === "hidden" || blockedIds.has(authorId)) return false;
      return mode !== "mine" || authorId === memberId;
    })
    .sort((left, right) =>
      text(right.data().createdAt, 40).localeCompare(text(left.data().createdAt, 40)),
    )
    .slice(0, 30);

  const posts = await Promise.all(candidates.map(async (document) => {
    const data = document.data();
    const authorId = text(data.memberId, 150);
    const comments = await document.ref.collection("comments")
      .orderBy("createdAt", "desc").limit(2).get();
    return {
      id: document.id,
      memberId: authorId,
      author: text(data.author, 120),
      nickname: text(data.nickname, 60),
      type: text(data.type, 20) || "text",
      content: text(data.content, 2000),
      reference: text(data.reference, 160),
      linkUrl: text(data.linkUrl, 500),
      createdAt: text(data.createdAt, 40),
      reactionCount: Number(data.reactionCount ?? 0),
      commentCount: Number(data.commentCount ?? 0),
      reactedByMe: Array.isArray(data.reactions) && data.reactions.includes(memberId),
      isMine: authorId === memberId,
      recentComments: comments.docs.map((comment) => {
        const item = comment.data();
        return {
          id: comment.id,
          memberId: text(item.memberId, 150),
          author: text(item.author, 120),
          content: text(item.content, 500),
          createdAt: text(item.createdAt, 40),
        };
      }).reverse(),
    };
  }));

  return {posts};
});

export const deleteYouthCommunityPost = onCall(async (request) => {
  const memberId = requireYouthCommunitySession(request.data?.communitySession);
  await getCommunityMember(memberId);
  const postId = text(request.data?.postId, 150);
  if (!/^[A-Za-z0-9_-]{10,150}$/.test(postId)) {
    throw new HttpsError("invalid-argument", "La publicación no es válida.");
  }
  const postRef = db.collection("youthCommunityPosts").doc(postId);
  await db.runTransaction(async (transaction) => {
    const post = await transaction.get(postRef);
    if (!post.exists || post.data()?.deleted === true) {
      throw new HttpsError("not-found", "La publicación ya no está disponible.");
    }
    if (text(post.data()?.memberId, 150) !== memberId) {
      throw new HttpsError("permission-denied", "Solo puedes retirar tus propias publicaciones.");
    }
    transaction.update(postRef, {
      deleted: true,
      status: "hidden",
      deletedAt: new Date().toISOString(),
      deletedBy: memberId,
    });
  });
  await recordAudit("youth.community.post.remove", memberId, postId);
  return {success: true};
});

export const createYouthCommunityPost = onCall(async (request) => {
  const memberId = requireYouthCommunitySession(request.data?.communitySession);
  const author = await getCommunityMember(memberId);
  const type = text(request.data?.type, 20);
  const content = text(request.data?.content, 2000);
  const reference = text(request.data?.reference, 160);
  const linkUrl = text(request.data?.linkUrl, 500);
  if (!["text", "verse", "song", "testimony"].includes(type)) {
    throw new HttpsError("invalid-argument", "Selecciona un tipo de publicación válido.");
  }
  if (content.length < 2) {
    throw new HttpsError("invalid-argument", "Escribe algo antes de publicar.");
  }
  if (type === "verse" && !reference) {
    throw new HttpsError("invalid-argument", "Añade la referencia bíblica del versículo.");
  }
  if (type === "song" && linkUrl && !/^https:\/\/(www\.)?(youtube\.com|youtu\.be|open\.spotify\.com)\//i.test(linkUrl)) {
    throw new HttpsError("invalid-argument", "El enlace debe ser de YouTube o Spotify.");
  }
  const rateRef = db.collection("youthCommunityRateLimits").doc(memberId);
  const now = Date.now();
  const hashtags = [...new Set(content.match(/#[\p{L}\p{N}_]{2,40}/gu) ?? [])].slice(0, 12);
  const postRef = db.collection("youthCommunityPosts").doc();
  await db.runTransaction(async (transaction) => {
    const rate = await transaction.get(rateRef);
    const lastPostAt = Number(rate.data()?.lastPostAt ?? 0);
    if (now - lastPostAt < 15000) {
      throw new HttpsError("resource-exhausted", "Espera unos segundos antes de publicar nuevamente.");
    }
    transaction.create(postRef, {
      memberId, author: author.name, nickname: author.nick,
      type, content, ...(reference ? {reference} : {}), ...(linkUrl ? {linkUrl} : {}),
      createdAt: new Date(now).toISOString(), reactionCount: 0, commentCount: 0,
      reactions: [], hashtags, status: "published", deleted: false,
    });
    transaction.set(rateRef, {lastPostAt: now}, {merge: true});
  });
  return {success: true, id: postRef.id};
});

export const createYouthCommunityComment = onCall(async (request) => {
  const memberId = requireYouthCommunitySession(request.data?.communitySession);
  const author = await getCommunityMember(memberId);
  const postId = text(request.data?.postId, 150);
  const content = text(request.data?.content, 500);
  if (!/^[A-Za-z0-9_-]{10,150}$/.test(postId) || content.length < 1) {
    throw new HttpsError("invalid-argument", "El comentario no es válido.");
  }
  const postRef = db.collection("youthCommunityPosts").doc(postId);
  const commentRef = postRef.collection("comments").doc();
  const rateRef = db.collection("youthCommunityRateLimits").doc(memberId);
  const now = Date.now();
  await db.runTransaction(async (transaction) => {
    const [post, rate] = await Promise.all([
      transaction.get(postRef),
      transaction.get(rateRef),
    ]);
    if (!post.exists || post.data()?.deleted === true || post.data()?.status === "hidden") {
      throw new HttpsError("not-found", "Esta publicación ya no está disponible.");
    }
    await assertNotBlocked(memberId, text(post.data()?.memberId, 150));
    if (now - Number(rate.data()?.lastCommentAt ?? 0) < 3000) {
      throw new HttpsError("resource-exhausted", "Espera unos segundos antes de comentar nuevamente.");
    }
    transaction.create(commentRef, {
      memberId, author: author.name, content,
      createdAt: new Date(now).toISOString(),
    });
    transaction.update(postRef, {commentCount: FieldValue.increment(1)});
    transaction.set(rateRef, {lastCommentAt: now}, {merge: true});
  });
  const commentedPost = (await postRef.get()).data() ?? {};
  await notifyYouthMember(
    text(commentedPost.memberId, 150), memberId, "comment",
    author.name + " comentó tu publicación.", postId,
  );
  return {success: true, id: commentRef.id};
});

export const toggleYouthCommunityReaction = onCall(async (request) => {
  const memberId = requireYouthCommunitySession(request.data?.communitySession);
  await getCommunityMember(memberId);
  const postId = text(request.data?.postId, 150);
  if (!/^[A-Za-z0-9_-]{10,150}$/.test(postId)) {
    throw new HttpsError("invalid-argument", "La publicación no es válida.");
  }
  const postRef = db.collection("youthCommunityPosts").doc(postId);
  const result = await db.runTransaction(async (transaction) => {
    const post = await transaction.get(postRef);
    if (!post.exists || post.data()?.deleted === true || post.data()?.status === "hidden") {
      throw new HttpsError("not-found", "Esta publicación ya no está disponible.");
    }
    const reactions = Array.isArray(post.data()?.reactions)
      ? (post.data()?.reactions as unknown[]).filter((id): id is string => typeof id === "string").slice(0, 500)
      : [];
    const reacted = reactions.includes(memberId);
    const next = reacted ? reactions.filter((id) => id !== memberId) : [...reactions, memberId];
    transaction.update(postRef, {reactions: next, reactionCount: next.length});
    return !reacted;
  });
  if (result) {
    const likedPost = (await postRef.get()).data() ?? {};
    const actor = await getCommunityMember(memberId);
    await notifyYouthMember(text(likedPost.memberId, 150), memberId, "reaction", actor.name + " reaccionó a tu publicación.", postId);
  }
  return {success: true, reacted: result};
});

/** Reporte comunitario: los jóvenes pueden alertar sobre publicaciones sin exponer su identidad públicamente. */
export const reportYouthCommunityPost = onCall(async (request) => {
  const memberId = requireYouthCommunitySession(request.data?.communitySession);
  await getCommunityMember(memberId);
  const postId = text(request.data?.postId, 150);
  const reason = text(request.data?.reason, 40);
  const details = text(request.data?.details, 500);
  const allowedReasons = ["inappropriate", "bullying", "privacy", "spam", "other"];
  if (!/^[A-Za-z0-9_-]{10,150}$/.test(postId) || !allowedReasons.includes(reason)) {
    throw new HttpsError("invalid-argument", "El reporte no es válido.");
  }
  const postRef = db.collection("youthCommunityPosts").doc(postId);
  const reportRef = db.collection("youthCommunityReports").doc(`${postId}_${memberId}`);
  await db.runTransaction(async (transaction) => {
    const [post, previous] = await Promise.all([transaction.get(postRef), transaction.get(reportRef)]);
    if (!post.exists || post.data()?.deleted === true) throw new HttpsError("not-found", "La publicación ya no está disponible.");
    if (previous.exists) throw new HttpsError("already-exists", "Ya reportaste esta publicación. El equipo revisará el caso.");
    transaction.create(reportRef, {
      postId, reporterId: memberId, reason, details,
      postAuthor: text(post.data()?.author, 120), postContent: text(post.data()?.content, 2000),
      status: "pending", createdAt: new Date().toISOString(),
    });
  });
  return {success: true};
});

export const adminListYouthCommunityReports = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdminOrPastor(request.auth.uid);
  const snapshot = await db.collection("youthCommunityReports")
    .where("status", "==", "pending").limit(100).get();
  return {reports: snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id, postId: text(data.postId, 150), contentType: "post" as const, reason: text(data.reason, 40),
      details: text(data.details, 500), postAuthor: text(data.postAuthor, 120),
      postContent: text(data.postContent, 2000), createdAt: text(data.createdAt, 40),
    };
  }).sort((left, right) => right.createdAt.localeCompare(left.createdAt))};
});

export const adminModerateYouthCommunityPost = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireAdminOrPastor(request.auth.uid);
  const postId = text(request.data?.postId, 150);
  const action = text(request.data?.action, 20);
  if (!/^[A-Za-z0-9_-]{10,150}$/.test(postId) || !["hide", "restore"].includes(action)) {
    throw new HttpsError("invalid-argument", "La acción de moderación no es válida.");
  }
  const postRef = db.collection("youthCommunityPosts").doc(postId);
  const snapshot = await postRef.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "No se encontró el contenido.");
  await postRef.update({
    status: action === "hide" ? "hidden" : "published",
    moderatedAt: new Date().toISOString(), moderatedBy: request.auth.uid,
  });
  const reports = await db.collection("youthCommunityReports")
    .where("postId", "==", postId).get();
  const batch = db.batch();
  reports.docs.filter((document) => document.data().status === "pending").forEach((document) => batch.update(document.ref, {
    status: action === "hide" ? "actioned" : "reviewed",
    reviewedAt: new Date().toISOString(), reviewedBy: request.auth!.uid,
  }));
  await batch.commit();
  await recordAudit("youth.community.moderate", request.auth.uid, postId, {action});
  return {success: true};
});

export const adminListYouthPins = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireYouthPinManager(request.auth.uid);

  const [membersSnapshot, pinsSnapshot] = await Promise.all([
    db.collection("members").limit(500).get(),
    db.collection("youthProfilePins").limit(500).get(),
  ]);
  const pins = new Map<string, Record<string, unknown>>(
    pinsSnapshot.docs.map((document) => [
      document.id,
      document.data() as Record<string, unknown>,
    ]),
  );

  const members = membersSnapshot.docs.map((document) => {
    const pin: Record<string, unknown> = pins.get(document.id) ?? {};
    return {
      id: document.id,
      name: text(document.data().name, 120) || "Joven sin nombre",
      configured: typeof pin.pinHash === "string",
      activationPending: typeof pin.activationHash === "string" &&
        Number(pin.activationExpiresAt ?? 0) > Date.now(),
      locked: Number(pin.lockedUntil ?? 0) > Date.now(),
      configuredAt: text(pin.pinConfiguredAt, 40),
    };
  }).sort((left, right) => left.name.localeCompare(right.name, "es"));

  return {members};
});

export const adminIssueYouthPin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  await requireYouthPinManager(request.auth.uid);

  const memberId = validYouthMemberId(request.data?.memberId);
  const memberSnapshot = await db.collection("members").doc(memberId).get();
  if (!memberSnapshot.exists) {
    throw new HttpsError("not-found", "No se encontró el joven seleccionado.");
  }

  const temporaryPin = String(randomInt(10000000, 100000000));
  const now = Date.now();
  const expiresAt = now + 48 * 60 * 60 * 1000;
  await db.collection("youthProfilePins").doc(memberId).set({
    activationHash: youthPinDigest(memberId, temporaryPin),
    activationExpiresAt: expiresAt,
    pinHash: FieldValue.delete(),
    pinConfiguredAt: FieldValue.delete(),
    attempts: 0,
    lockedUntil: 0,
    updatedAt: new Date(now).toISOString(),
    updatedBy: request.auth.uid,
  }, {merge: true});

  await recordAudit(
    "youth.pin.reset",
    request.auth.uid,
    memberId,
    {activationExpiresAt: expiresAt},
  );
  return {
    success: true,
    temporaryPin,
    expiresAt: new Date(expiresAt).toISOString(),
  };
});


/** Guarda únicamente la apariencia equipada por el joven autenticado con su PIN. */
export const saveYouthProfileAppearance = onCall(async (request) => {
  const memberId = requireYouthCommunitySession(request.data?.communitySession);
  await getCommunityMember(memberId);
  const appearance = request.data?.appearance as Record<string, unknown> | undefined;
  if (!appearance || typeof appearance !== "object") {
    throw new HttpsError("invalid-argument", "La apariencia enviada no es válida.");
  }
  const values = {
    frame: text(appearance.frame, 50),
    avatar: text(appearance.avatar, 80),
    background: text(appearance.background, 50),
    title: text(appearance.title, 80),
  };
  const freeOptions = {
    frame: ["fuego"],
    avatar: ["", "paloma", "leon", "aguila"],
    background: ["brasa"],
    title: ["chispa"],
  } as const;
  const photoRef = db.collection("photos").doc(memberId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(photoRef);
    const data = snapshot.data() ?? {};
    const owned = Array.isArray(data.u)
      ? data.u.filter((value): value is string => typeof value === "string").slice(0, 400)
      : [];
    const requiredKeys = [
      ["frame", "frames"],
      ["avatar", "avs"],
      ["background", "bans"],
      ["title", "tits"],
    ] as const;
    for (const [field, prefix] of requiredKeys) {
      const value = values[field];
      const valid = (freeOptions[field] as readonly string[]).includes(value) ||
        owned.includes(`${prefix}:${value}`);
      if (!valid) {
        throw new HttpsError(
          "permission-denied",
          "Ese elemento todavía no está desbloqueado en tu perfil.",
        );
      }
    }
    transaction.set(photoRef, {
      f: values.frame,
      a: values.avatar,
      b: values.background,
      t: values.title,
      appearanceUpdatedAt: new Date().toISOString(),
    }, {merge: true});
  });
  return {success: true};
});


const youthLookCatalog = {
  "frames": {
    "fuego": 0,
    "neon": 40,
    "cielo": 40,
    "hielo": 50,
    "arco": 60,
    "esmeralda": 70,
    "rayo": 80,
    "oro": 120,
    "galaxia": 150,
    "corona": 200,
    "prisma": 110,
    "obsidiana": 125,
    "solar": 95,
    "cristal": 145,
    "emperador": 185,
    "filigrana": 155,
    "bronce": 100,
    "runa": 175,
  },
  "avatars": {
    "": 0,
    "paloma": 0,
    "leon": 0,
    "aguila": 0,
    "cordero": 20,
    "mariposa": 25,
    "lobo": 30,
    "estrella": 40,
    "guerrero": 50,
    "dragon": 60,
    "cohete": 70,
    "rey": 80,
    "volcan": 90,
    "fenix": 95,
    "delfin": 45,
    "zorro": 55,
    "pantera": 75,
    "tigre": 75,
    "fenix-real": 135,
  },
  "titles": {
    "chispa": 0,
    "valiente": 25,
    "guerrero": 40,
    "intercesor": 50,
    "adorador": 60,
    "sabio": 80,
    "leyenda": 150,
  },
  "backgrounds": {
    "brasa": 0,
    "ocaso": 30,
    "aurora": 50,
    "noche": 50,
    "volcan": 80,
    "galaxia": 100,
    "oceano": 65,
    "bosque": 70,
    "aurora-boreal": 115,
    "atardecer": 55,
    "cosmos": 125,
    "imperial": 145,
    "amatista": 95,
    "santuario": 110,
    "aurum": 130,
    "seda": 120,
    "nebula-real": 155,
  },
  "effects": {
    "ember": 0,
    "aurora": 65,
    "spark": 75,
    "ice": 85,
    "halo": 110,
    "galaxy": 140,
    "sun": 90,
    "lightning": 105,
    "bloom": 95,
    "royal": 125,
    "orbit": 135,
    "runes": 150,
    "golden": 165,
    "comet": 145,
    "crown": 175,
    "vortex": 155,
  },
  "badges": {
    "flame": 0,
    "book": 45,
    "heart": 55,
    "shield": 65,
    "star": 80,
    "crown": 120,
    "hope": 70,
    "mission": 85,
    "brave": 90,
    "joy": 55,
    "royal": 135,
    "guardian": 110,
    "victory": 125,
    "covenant": 100,
    "radiance": 145,
  },
  "hair": {
    "natural": 0,
    "waves": 35,
    "curly": 45,
    "fade": 45,
    "afro": 55,
    "braids": 65,
    "long": 65,
    "bun": 60,
    "classic": 30,
    "cap": 40,
  },
  "outfits": {
    "basic": 0,
    "hoodie": 55,
    "white": 60,
    "sport": 45,
    "denim": 70,
    "royal": 100,
    "worship": 65,
    "street": 75,
    "warrior": 90,
    "formal": 70,
    "guardian": 115,
    "imperial": 145,
    "champion": 120,
    "satin": 130,
  },
  "accessories": {
    "none": 0,
    "glasses": 25,
    "headphones": 40,
    "cross": 45,
    "wristband": 25,
    "halo": 70,
    "book": 35,
    "cap": 40,
    "crown": 80,
    "scarf": 50,
    "wings": 135,
    "sword": 125,
    "staff": 100,
    "cape": 115,
  },
} as const;
const youthLookStoragePrefix: Record<keyof typeof youthLookCatalog, string> = {
  frames: "frames", avatars: "avs", titles: "tits", backgrounds: "bans",
  effects: "fx", badges: "bdg", hair: "hair", outfits: "outfits", accessories: "accessories",
};
const youthLookEquippedPrefix: Partial<Record<keyof typeof youthLookCatalog, string>> = {
  effects: "equipped:fx:", badges: "equipped:bdg:", hair: "equipped:hair:",
  outfits: "equipped:outfit:", accessories: "equipped:accessory:",
};

/** Compra y equipa un cosmético usando precios y saldo verificados en servidor. */
export const purchaseYouthLookItem = onCall(async (request) => {
  const memberId = requireYouthCommunitySession(request.data?.communitySession);
  await getCommunityMember(memberId);
  const category = text(request.data?.category, 30) as keyof typeof youthLookCatalog;
  const itemKey = text(request.data?.itemKey, 80);
  if (!Object.prototype.hasOwnProperty.call(youthLookCatalog, category) ||
      !Object.prototype.hasOwnProperty.call(youthLookCatalog[category], itemKey)) {
    throw new HttpsError("invalid-argument", "El artículo solicitado no existe.");
  }
  const cost = (youthLookCatalog as unknown as Record<string, Record<string, number>>)[category][itemKey];
  const storageKey = `${youthLookStoragePrefix[category]}:${itemKey}`;
  const photoRef = db.collection("photos").doc(memberId);
  let result: {flames: number; ownedItems: string[]};
  await db.runTransaction(async (transaction) => {
    const [snapshot, publicSnapshot, memberSnapshot] = await Promise.all([
      transaction.get(photoRef),
      transaction.get(db.collection("publicProfiles").doc(memberId)),
      transaction.get(db.collection("members").doc(memberId)),
    ]);
    const data = snapshot.data() ?? {};
    const publicData = publicSnapshot.data() ?? {};
    const memberData = memberSnapshot.data() ?? {};
    const balanceValue = Number(data.w ?? publicData.flames ?? memberData.flames ?? 0);
    const balance = Number.isFinite(balanceValue) ? Math.max(0, Math.min(100000, Math.floor(balanceValue))) : 0;
    const owned = Array.isArray(data.u)
      ? data.u.filter((value): value is string => typeof value === "string").slice(0, 400)
      : [];
    const alreadyOwned = cost === 0 || owned.includes(storageKey);
    if (!alreadyOwned && balance < cost) {
      throw new HttpsError("failed-precondition", "No tienes suficientes Llamas para este artículo.");
    }
    const equippedPrefix = youthLookEquippedPrefix[category];
    const nextOwned = equippedPrefix
      ? owned.filter((value) => !value.startsWith(equippedPrefix))
      : [...owned];
    if (!alreadyOwned && cost > 0) nextOwned.push(storageKey);
    if (equippedPrefix) nextOwned.push(`${equippedPrefix}${itemKey}`);
    const uniqueOwned = Array.from(new Set(nextOwned)).slice(-400);
    const nextBalance = alreadyOwned ? balance : balance - cost;
    const fieldByCategory = {
      frames: "f", avatars: "a", titles: "t", backgrounds: "b",
      effects: "fx", badges: "bdg", hair: "hair", outfits: "outfit", accessories: "accessory",
    } as const;
    transaction.set(photoRef, {
      [fieldByCategory[category]]: itemKey,
      w: nextBalance,
      u: uniqueOwned,
      appearanceUpdatedAt: new Date().toISOString(),
    }, {merge: true});
    result = {flames: nextBalance, ownedItems: uniqueOwned};
  });
  return {success: true, ...result!};
});


/** Desbloquea una plantilla completa en una sola transacción: nunca cobra parcialmente. */
export const purchaseYouthLookBundle = onCall(async (request) => {
  const memberId = requireYouthCommunitySession(request.data?.communitySession);
  await getCommunityMember(memberId);
  const requested = request.data?.items;
  if (!Array.isArray(requested) || requested.length < 1 || requested.length > 9) {
    throw new HttpsError("invalid-argument", "La plantilla no es válida.");
  }
  const selections: Array<{category: keyof typeof youthLookCatalog; key: string; cost: number}> = [];
  const seen = new Set<string>();
  for (const entry of requested) {
    const category = text(entry?.category, 30) as keyof typeof youthLookCatalog;
    const key = text(entry?.itemKey, 80);
    if (!Object.prototype.hasOwnProperty.call(youthLookCatalog, category) ||
        !Object.prototype.hasOwnProperty.call(youthLookCatalog[category], key)) {
      throw new HttpsError("invalid-argument", "La plantilla contiene un artículo inválido.");
    }
    if (seen.has(category)) throw new HttpsError("invalid-argument", "La plantilla repite categorías.");
    seen.add(category);
    const cost = (youthLookCatalog as unknown as Record<string, Record<string, number>>)[category][key];
    selections.push({category, key, cost});
  }
  const photoRef = db.collection("photos").doc(memberId);
  let result: {flames: number; ownedItems: string[]} | undefined;
  await db.runTransaction(async (transaction) => {
    const [snapshot, publicSnapshot, memberSnapshot] = await Promise.all([
      transaction.get(photoRef),
      transaction.get(db.collection("publicProfiles").doc(memberId)),
      transaction.get(db.collection("members").doc(memberId)),
    ]);
    const data = snapshot.data() ?? {};
    const publicData = publicSnapshot.data() ?? {};
    const memberData = memberSnapshot.data() ?? {};
    const rawBalance = Number(data.w ?? publicData.flames ?? memberData.flames ?? 0);
    const balance = Number.isFinite(rawBalance) ? Math.max(0, Math.min(100000, Math.floor(rawBalance))) : 0;
    const owned = Array.isArray(data.u)
      ? data.u.filter((value): value is string => typeof value === "string").slice(0, 400)
      : [];
    const nextOwned = [...owned];
    let total = 0;
    const updates: Record<string, string> = {};
    const fieldByCategory = {
      frames: "f", avatars: "a", titles: "t", backgrounds: "b",
      effects: "fx", badges: "bdg", hair: "hair", outfits: "outfit", accessories: "accessory",
    } as const;
    for (const selection of selections) {
      const storageKey = `${youthLookStoragePrefix[selection.category]}:${selection.key}`;
      if (selection.cost > 0 && !nextOwned.includes(storageKey)) {
        total += selection.cost;
        nextOwned.push(storageKey);
      }
      const prefix = youthLookEquippedPrefix[selection.category];
      if (prefix) {
        for (let index = nextOwned.length - 1; index >= 0; index -= 1) {
          if (nextOwned[index].startsWith(prefix)) nextOwned.splice(index, 1);
        }
        nextOwned.push(`${prefix}${selection.key}`);
      }
      updates[fieldByCategory[selection.category]] = selection.key;
    }
    if (balance < total) {
      throw new HttpsError("failed-precondition", "No tienes suficientes Llamas para esta plantilla.");
    }
    const nextBalance = balance - total;
    const uniqueOwned = Array.from(new Set(nextOwned)).slice(-400);
    transaction.set(photoRef, {
      ...updates, w: nextBalance, u: uniqueOwned,
      appearanceUpdatedAt: new Date().toISOString(),
    }, {merge: true});
    result = {flames: nextBalance, ownedItems: uniqueOwned};
  });
  return {success: true, ...result!};
});

/** Registra resultados acotados de juegos y entrega Llamas una sola vez por partida. */
/** Guarda un historial de partida. La puntuación del cliente no genera recompensas. */
export const recordYouthGameResult = onCall(async (request) => {
  const memberId = requireYouthCommunitySession(request.data?.communitySession);
  const member = await getCommunityMember(memberId);
  const gameId = text(request.data?.gameId, 30);
  const runId = text(request.data?.runId, 80);
  const scoreValue = Number(request.data?.score);
  const allowedGames = new Set([
    "trivia", "verse", "memory", "challenge", "survival",
    "duel", "order", "truefalse", "whoami",
  ]);
  if (!allowedGames.has(gameId) ||
      !/^[a-zA-Z0-9_-]{12,80}$/.test(runId) ||
      !Number.isInteger(scoreValue) || scoreValue < 0 || scoreValue > 10000) {
    throw new HttpsError("invalid-argument", "El resultado del juego no es válido.");
  }
  const resultRef = db.collection("youthGameResults").doc(memberId + "_" + runId);
  let alreadyRecorded = false;
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(resultRef);
    if (existing.exists) {
      alreadyRecorded = true;
      return;
    }
    transaction.create(resultRef, {
      memberId,
      memberName: member.name,
      gameId,
      score: scoreValue,
      verificationStatus: "pending",
      reward: 0,
      createdAt: new Date().toISOString(),
    });
  });
  return {success: true, score: scoreValue, reward: 0, verificationStatus: "pending", alreadyRecorded};
});

/** Lista partidas pendientes para revisión pastoral/administrativa. */
export const adminListYouthGameResults = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireModulePermission(request.auth.uid, "games");
  const snapshot = await db.collection("youthGameResults")
    .where("verificationStatus", "==", "pending")
    .limit(100).get();
  const results = snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      memberId: text(data.memberId, 150),
      memberName: text(data.memberName, 120) || "Joven",
      gameId: text(data.gameId, 30),
      score: Math.max(0, Math.floor(Number(data.score) || 0)),
      verificationStatus: text(data.verificationStatus, 20) || "pending",
      reward: Math.max(0, Math.floor(Number(data.reward) || 0)),
      createdAt: text(data.createdAt, 40),
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {results};
});

/**
 * La revisión humana confirma el resultado y, si corresponde, acredita Llamas
 * una sola vez. El valor de recompensa lo define el revisor autorizado.
 */
export const adminReviewYouthGameResult = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireModulePermission(request.auth.uid, "games");
  const resultId = text(request.data?.resultId, 200);
  const decision = text(request.data?.decision, 10);
  const reward = Number(request.data?.reward ?? 0);
  const verifiedScore = Number(request.data?.verifiedScore);
  const verificationNote = text(request.data?.verificationNote, 1000);
  if (!resultId || !["approve", "reject"].includes(decision) ||
      !Number.isInteger(reward) || reward < 0 || reward > 1000 ||
      (decision === "reject" && reward !== 0) ||
      (decision === "approve" && (!Number.isInteger(verifiedScore) || verifiedScore < 0 || verifiedScore > 10000 || verificationNote.length < 10))) {
    throw new HttpsError("invalid-argument", "La decisión, puntuación verificada, evidencia o recompensa no son válidas.");
  }

  const resultRef = db.collection("youthGameResults").doc(resultId);
  let memberId = "";
  let awarded = 0;
  await db.runTransaction(async (transaction) => {
    const resultSnapshot = await transaction.get(resultRef);
    if (!resultSnapshot.exists) throw new HttpsError("not-found", "La partida ya no existe.");
    const data = resultSnapshot.data() ?? {};
    if (text(data.verificationStatus, 20) !== "pending") {
      throw new HttpsError("failed-precondition", "Esta partida ya fue revisada.");
    }
    memberId = validYouthMemberId(data.memberId);
    const memberRef = db.collection("members").doc(memberId);
    const profileRef = db.collection("publicProfiles").doc(memberId);
    const photoRef = db.collection("photos").doc(memberId);
    const [memberSnapshot, profileSnapshot, photoSnapshot] = await Promise.all([
      transaction.get(memberRef), transaction.get(profileRef), transaction.get(photoRef),
    ]);
    if (!memberSnapshot.exists && !profileSnapshot.exists) {
      throw new HttpsError("failed-precondition", "El perfil del joven ya no está disponible.");
    }
    const status = decision === "approve" ? "verified" : "rejected";
    const now = new Date().toISOString();
    const clientReportedScore = Math.max(0, Math.floor(Number(data.score) || 0));
    if (decision === "approve" && reward > 0) {
      const member = memberSnapshot.data() ?? {};
      const profile = profileSnapshot.data() ?? {};
      const photo = photoSnapshot.data() ?? {};
      const rawBalance = Number(photo.w ?? profile.flames ?? member.flames ?? 0);
      const balance = Number.isFinite(rawBalance) ? Math.max(0, Math.min(1000000, Math.floor(rawBalance))) : 0;
      const nextBalance = balance + reward;
      transaction.set(photoRef, {w: nextBalance}, {merge: true});
      if (profileSnapshot.exists) transaction.set(profileRef, {flames: nextBalance}, {merge: true});
      if (memberSnapshot.exists) transaction.set(memberRef, {flames: nextBalance}, {merge: true});
      const movementId = createHash("sha256").update("youth-game-flames:" + resultId).digest("hex");
      transaction.create(db.collection("flameTransactions").doc(movementId), {
        memberId, amount: reward, balanceAfter: nextBalance,
        type: "game", description: "Recompensa por juego bíblico",
        referenceId: resultId, createdAt: now, createdBy: request.auth!.uid,
      });
      awarded = reward;
    }
    transaction.set(resultRef, {
      verificationStatus: status,
      reward: awarded,
      ...(decision === "approve" ? {
        clientReportedScore,
        score: verifiedScore,
        verificationNote,
      } : {}),
      reviewedAt: now,
      reviewedBy: request.auth!.uid,
    }, {merge: true});
  });
  await recordAudit(
    decision === "approve" ? "youth-game.verified" : "youth-game.rejected",
    request.auth.uid, resultId, {
      memberId, reward: awarded,
      ...(decision === "approve" ? {verifiedScore, verificationNote} : {}),
    },
  );
  return {success: true, verificationStatus: decision === "approve" ? "verified" : "rejected", reward: awarded};
});

/** Historial privado y verificable de movimientos de Llamas del joven. */
export const getYouthFlameHistory = onCall(async (request) => {
  const memberId = requireYouthCommunitySession(request.data?.communitySession);
  const snapshot = await db.collection("flameTransactions")
    .where("memberId", "==", memberId)
    .limit(100)
    .get();
  const movements = snapshot.docs.map((document) => {
    const data = document.data();
    const amount = Number(data.amount ?? 0);
    const balanceAfter = Number(data.balanceAfter ?? 0);
    return {
      id: document.id,
      amount: Number.isFinite(amount) ? Math.trunc(amount) : 0,
      balanceAfter: Number.isFinite(balanceAfter) ? Math.max(0, Math.trunc(balanceAfter)) : 0,
      type: text(data.type, 30),
      description: text(data.description, 160),
      createdAt: text(data.createdAt, 40),
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {movements};
});

export const getYouthGameHistory = onCall(async (request) => {
  const memberId = requireYouthCommunitySession(request.data?.communitySession);
  const snapshot = await db.collection("youthGameResults")
    .where("memberId", "==", memberId)
    .limit(30)
    .get();
  const results = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      gameId: String(data.gameId ?? ""),
      score: Number(data.score ?? 0),
      verificationStatus: String(data.verificationStatus ?? "pending"),
      createdAt: String(data.createdAt ?? ""),
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {results};
});

export const getPublicProfiles = onCall(async () => {
  try {
    const profiles = await loadVisiblePublicProfiles();
    return {
      profiles: profiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        nick: profile.nick,
        pic: profile.pic,
        points: profile.points,
        frame: profile.frame,
        avatar: profile.avatar,
        background: profile.background,
        title: profile.title,
      })),
    };
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
  const moduleId = ["members", "attendance", "checkins", "reports", "followups"].includes(requestedModule)
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


export const adminGetMemberHistory = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const memberId = text(request.data?.memberId, 150);
  if (!memberId) throw new HttpsError("invalid-argument", "Selecciona un joven válido.");
  const role = await requireModulePermission(request.auth.uid, "members");
  const userSnapshot = await db.collection("users").doc(request.auth.uid).get();
  const storedPermissions = userSnapshot.data()?.permissions;
  const permissions = Array.isArray(storedPermissions)
    ? cleanStringArray(storedPermissions, manageablePermissions)
    : defaultLeaderPermissions;
  const privileged = role === "admin" || role === "administrador" || role === "pastor";
  const canSeeAttendance = privileged || permissions.includes("attendance");
  const canSeeFollowups = privileged || permissions.includes("followups");

  const [meetingsSnapshot, legacyAttendanceSnapshot, followupsSnapshot] = await Promise.all([
    canSeeAttendance
      ? db.collection("attendanceMeetings").orderBy("date", "desc").limit(120).get()
      : Promise.resolve(null),
    canSeeAttendance
      ? db.collection("attendance").limit(1000).get()
      : Promise.resolve(null),
    canSeeFollowups
      ? db.collection("followups").limit(300).get()
      : Promise.resolve(null),
  ]);

  const history: Array<{
    id: string; kind: string; date: string; title: string; detail: string; status: string;
  }> = [];

  (meetingsSnapshot?.docs ?? []).forEach((document) => {
    const data = document.data();
    const participants = Array.isArray(data.participants) ? data.participants : [];
    const participant = participants.find((item) =>
      item && typeof item === "object" &&
      text((item as Record<string, unknown>).memberId, 150) === memberId,
    ) as Record<string, unknown> | undefined;
    if (!participant) return;
    history.push({
      id: `attendance:${document.id}`, kind: "Asistencia",
      date: text(data.date, 20), title: text(data.name, 100) || "Reunión",
      detail: "Registro de asistencia",
      status: text(participant.status, 30) || "Registrada",
    });
  });

  (legacyAttendanceSnapshot?.docs ?? []).forEach((document) => {
    const data = document.data();
    const value = data.r && typeof data.r === "object"
      ? (data.r as Record<string, unknown>)[memberId]
      : null;
    if (!value || typeof value !== "object") return;
    const statusCode = text((value as Record<string, unknown>).s, 10);
    const statusMap: Record<string, string> = {
      P: "Presente", T: "Tarde", F: "Falta", J: "Justificada", A: "Ausente",
    };
    const status = statusMap[statusCode];
    if (!status) return;
    const [date = "", rawService = "gen"] = document.id.split("_");
    const service = rawService.toLocaleLowerCase("en-US");
    history.push({
      id: `legacy-attendance:${document.id}`, kind: "Asistencia",
      date, title: service, detail: "Registro histórico", status,
    });
  });

  (followupsSnapshot?.docs ?? []).forEach((document) => {
    const data = document.data();
    if (text(data.memberId ?? data.m, 150) !== memberId) return;
    const date = managedRecordDate(data.date ?? data.d ?? data.createdAt);
    history.push({
      id: `followup:${document.id}`, kind: "Seguimiento",
      date, title: text(data.reason ?? data.t, 180) || "Acompañamiento",
      detail: text(data.notes ?? data.n, 500) || "Sin observaciones",
      status: text(data.status, 40) || "Histórico",
    });
  });

  history.sort((left, right) => right.date.localeCompare(left.date));
  return {history: history.slice(0, 60)};
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
    fields: ["name", "date", "reason", "notes", "memberId"],
    statuses: ["Pendiente", "En proceso", "Completado"],
    required: ["name", "date", "reason", "memberId"],
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
  const snapshot = await collectionRef.limit(400).get();

  // Legacy follow-ups store only the member ID. Fetch names only for members
  // referenced by this page instead of scanning up to 700 member documents.
  const referencedMemberIds = module === "followups"
    ? [...new Set(snapshot.docs
      .map((document) => text(document.data().m, 150))
      .filter(Boolean))]
    : [];
  const memberSnapshots = referencedMemberIds.length
    ? await db.getAll(...referencedMemberIds.map((id) => db.collection("members").doc(id)))
    : [];
  const members = new Map(
    memberSnapshots
      .filter((document) => document.exists)
      .map((document) => [
        document.id,
        text(document.data()?.name, 120) || document.id,
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
  if (module === "followups") {
    const memberSnapshot = await db.collection("members").doc(payload.memberId).get();
    if (!payload.memberId || !memberSnapshot.exists) {
      throw new HttpsError("not-found", "Selecciona un joven registrado para el seguimiento.");
    }
    payload.name = text(memberSnapshot.data()?.name, 120) || text(memberSnapshot.data()?.nick, 60);
  }
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

/** Crea un seguimiento idempotente desde una alerta de inasistencia. */
export const adminCreateAbsenceFollowup = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireModulePermission(request.auth.uid, "followups");
  const memberId = text(request.data?.memberId, 150);
  const lastAbsenceDate = text(request.data?.lastAbsenceDate, 10);
  const consecutive = Number(request.data?.consecutive ?? 0);
  if (!memberId || !isValidDate(lastAbsenceDate) ||
      !Number.isInteger(consecutive) || consecutive < 2 || consecutive > 30) {
    throw new HttpsError("invalid-argument", "Los datos de la alerta no son válidos.");
  }
  const memberRef = db.collection("members").doc(memberId);
  const memberSnapshot = await memberRef.get();
  if (!memberSnapshot.exists) throw new HttpsError("not-found", "El joven ya no está en el directorio.");
  const memberName = text(memberSnapshot.data()?.name, 120) || "Joven";
  const followupId = createHash("sha256")
    .update("absence-followup:" + memberId + ":" + lastAbsenceDate)
    .digest("hex");
  const followupRef = db.collection("followups").doc(followupId);
  const now = new Date().toISOString();
  let created = false;
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(followupRef);
    if (existing.exists) return;
    transaction.create(followupRef, {
      name: memberName,
      memberId,
      date: lastAbsenceDate,
      reason: "Alerta de inasistencia: " + consecutive + " reuniones consecutivas",
      notes: "Seguimiento generado desde la alerta de asistencia. Contactar al joven o a su familia con cuidado pastoral y registrar el resultado.",
      status: "Pendiente",
      source: "attendance-alert",
      createdAt: now,
      updatedAt: now,
      createdBy: request.auth!.uid,
      updatedBy: request.auth!.uid,
    });
    created = true;
  });
  if (created) await recordAudit("attendance.absence-followup.created", request.auth.uid, followupId, {memberId, consecutive, lastAbsenceDate});
  return {success: true, created, id: followupId};
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
  if (module === "followups") {
    const memberSnapshot = await db.collection("members").doc(payload.memberId).get();
    if (!payload.memberId || !memberSnapshot.exists) {
      throw new HttpsError("not-found", "Selecciona un joven registrado para el seguimiento.");
    }
    payload.name = text(memberSnapshot.data()?.name, 120) || text(memberSnapshot.data()?.nick, 60);
  }
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

export const getPublicDevotionals = onCall(async () => {
  try {
    const snapshot = await db.collection("devotionals").orderBy("date", "desc").limit(8).get();
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
        flyerDataUrl: text(data.flyerDataUrl, 700000),
        flyerDataUrls: Array.isArray(data.flyerDataUrls) ? data.flyerDataUrls.filter((image: unknown) => typeof image === "string").map((image: string) => text(image, 130000)).slice(0, 5) : [],
      };
    }).filter((item) => item.flyerDataUrl || item.title);
    return {devotionals};
  } catch (error) {
    console.error("Error leyendo devocionales públicos:", error);
    throw new HttpsError("internal", "No se pudieron consultar los devocionales.");
  }
});

export const submitYouthDevotional = onCall(async (request) => {
  const memberId = text(request.data?.memberId, 150);
  const message = text(request.data?.message, 5000);
  const imageDataUrl = text(request.data?.imageDataUrl, 420000);
  if (!memberId || memberId.length >= 40 || memberId.startsWith("public-profile-")) {
    throw new HttpsError("invalid-argument", "No se pudo identificar tu perfil juvenil.");
  }
  if (message.length < 20) {
    throw new HttpsError("invalid-argument", "Escribe al menos 20 caracteres sobre tu devocional.");
  }
  if (imageDataUrl && !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(imageDataUrl)) {
    throw new HttpsError("invalid-argument", "Adjunta una imagen JPG válida.");
  }
  const [memberSnapshot, publicSnapshot] = await Promise.all([
    db.collection("members").doc(memberId).get(),
    db.collection("publicProfiles").doc(memberId).get(),
  ]);
  const member = memberSnapshot.data() ?? {};
  const profile = publicSnapshot.data() ?? {};
  if (!memberSnapshot.exists || member.nopub === true ||
      (publicSnapshot.exists && profile.nopub === true)) {
    throw new HttpsError("failed-precondition", "Tu perfil no está disponible para entregar el devocional.");
  }
  const memberName = text(member.name, 120) || text(profile.name, 120) || "Joven";
  const ip = String(request.rawRequest.ip ?? "unknown").slice(0, 100);
  const day = new Date().toISOString().slice(0, 10);
  const rateKey = createHash("sha256").update(ip + "|" + memberId + "|" + day).digest("hex");
  const rateRef = db.collection("publicDevotionalSubmissionRateLimits").doc(rateKey);
  const submissionRef = db.collection("devotionalSubmissions").doc();
  await db.runTransaction(async (transaction) => {
    const rate = await transaction.get(rateRef);
    const count = Number(rate.data()?.count ?? 0);
    if (count >= 3) throw new HttpsError("resource-exhausted", "Ya enviaste el máximo de 3 entregas hoy. Intenta mañana.");
    transaction.set(rateRef, {
      count: FieldValue.increment(1),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    }, {merge: true});
    transaction.create(submissionRef, {
      memberId, memberName, message,
      ...(imageDataUrl ? {imageDataUrl} : {}),
      status: "Pendiente",
      createdAt: new Date().toISOString(),
      source: "portal-joven",
    });
  });
  return {success: true, id: submissionRef.id};
});

export const adminListYouthDevotionalSubmissions = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireModulePermission(request.auth.uid, "devotionals");
  const snapshot = await db.collection("devotionalSubmissions").limit(250).get();
  const submissions = snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      memberId: text(data.memberId, 150),
      memberName: text(data.memberName, 120),
      message: text(data.message, 5000),
      imageDataUrl: text(data.imageDataUrl, 420000),
      status: text(data.status, 30) || "Pendiente",
      createdAt: text(data.createdAt, 40),
      pointsAwarded: Math.max(0, Math.floor(Number(data.pointsAwarded) || 0)),
      flamesAwarded: Math.max(0, Math.floor(Number(data.flamesAwarded) || 0)),
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {submissions};
});

export const adminReviewYouthDevotionalSubmission = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireModulePermission(request.auth.uid, "devotionals");

  const submissionId = text(request.data?.submissionId, 150);
  const decision = text(request.data?.decision, 20);
  const flamesReward = Number(request.data?.flamesReward ?? 0);
  if (!submissionId || !["approve", "reject"].includes(decision) ||
      !Number.isInteger(flamesReward) || flamesReward < 0 || flamesReward > 1000 ||
      (decision === "reject" && flamesReward !== 0)) {
    throw new HttpsError("invalid-argument", "La revisión o la recompensa en Llamas no son válidas.");
  }

  const submissionRef = db.collection("devotionalSubmissions").doc(submissionId);
  const result = await db.runTransaction(async (transaction) => {
    const submissionSnapshot = await transaction.get(submissionRef);
    if (!submissionSnapshot.exists) {
      throw new HttpsError("not-found", "No se encontró la entrega del devocional.");
    }
    const submission = submissionSnapshot.data() ?? {};
    const status = text(submission.status, 30) || "Pendiente";
    if (status === "Aprobado") return {
      status, pointsAwarded: 20,
      flamesAwarded: Math.max(0, Math.floor(Number(submission.flamesAwarded) || 0)),
      changed: false,
    };
    if (status === "Rechazado") {
      throw new HttpsError("failed-precondition", "Esta entrega ya fue rechazada.");
    }
    if (status !== "Pendiente") {
      throw new HttpsError("failed-precondition", "La entrega ya fue revisada.");
    }

    const memberId = text(submission.memberId, 150);
    if (!memberId) throw new HttpsError("failed-precondition", "La entrega no tiene un joven asociado.");
    const memberRef = db.collection("members").doc(memberId);
    const publicRef = db.collection("publicProfiles").doc(memberId);
    const rankingRef = db.collection("public").doc("ranking");
    const awardId = createHash("sha256").update("devotional:" + submissionId + ":" + memberId).digest("hex");
    const awardRef = db.collection("devotionalPointAwards").doc(awardId);
    const photoRef = db.collection("photos").doc(memberId);
    const [memberSnapshot, publicSnapshot, rankingSnapshot, awardSnapshot, photoSnapshot] = await Promise.all([
      transaction.get(memberRef), transaction.get(publicRef),
      transaction.get(rankingRef), transaction.get(awardRef), transaction.get(photoRef),
    ]);
    if (!memberSnapshot.exists && !publicSnapshot.exists) {
      throw new HttpsError("failed-precondition", "El perfil del joven ya no está disponible.");
    }

    const now = new Date().toISOString();
    if (decision === "reject") {
      transaction.set(submissionRef, {
        status: "Rechazado", reviewedAt: now, reviewedBy: request.auth!.uid,
      }, {merge: true});
      return {status: "Rechazado", pointsAwarded: 0, flamesAwarded: 0, changed: true};
    }

    if (awardSnapshot.exists) {
      throw new HttpsError("failed-precondition", "Esta entrega ya tiene un registro de puntos.");
    }
    const member = memberSnapshot.data() ?? {};
    const profile = publicSnapshot.data() ?? {};
    const ranking = rankingSnapshot.data() ?? {};
    const legacyEntries = Array.isArray(ranking.all) ? ranking.all as Array<Record<string, unknown>> : [];
    const legacyEntry = legacyEntries.find((entry) => text(entry.i, 150) === memberId);
    const currentValue = profile.points ?? profile.puntos ?? legacyEntry?.t ?? member.points ?? member.puntos ?? 0;
    const current = Number(currentValue);
    const safeCurrent = Number.isFinite(current) && current >= 0 ? Math.floor(current) : 0;
    const nextPoints = safeCurrent + 20;

    if (memberSnapshot.exists) transaction.set(memberRef, {points: nextPoints}, {merge: true});
    transaction.set(publicRef, {points: nextPoints}, {merge: true});
    if (legacyEntry) {
      transaction.set(rankingRef, {all: legacyEntries.map((entry) =>
        text(entry.i, 150) === memberId ? {...entry, t: nextPoints} : entry,
      )}, {merge: true});
    }
    const photo = photoSnapshot.data() ?? {};
    const currentFlamesValue = Number(photo.w ?? profile.flames ?? member.flames ?? 0);
    const currentFlames = Number.isFinite(currentFlamesValue) && currentFlamesValue >= 0
      ? Math.min(1000000, Math.floor(currentFlamesValue))
      : 0;
    const nextFlames = currentFlames + flamesReward;
    if (flamesReward > 0) {
      transaction.set(photoRef, {w: nextFlames, updatedAt: now}, {merge: true});
      if (publicSnapshot.exists) transaction.set(publicRef, {flames: nextFlames}, {merge: true});
      if (memberSnapshot.exists) transaction.set(memberRef, {flames: nextFlames}, {merge: true});
      const movementId = createHash("sha256").update("devotional-flames:" + submissionId).digest("hex");
      transaction.create(db.collection("flameTransactions").doc(movementId), {
        memberId, amount: flamesReward, balanceAfter: nextFlames,
        type: "devotional", description: "Devocional aprobado",
        referenceId: submissionId, createdAt: now, createdBy: request.auth!.uid,
      });
    }
    transaction.create(awardRef, {
      submissionId, memberId, points: 20, flames: flamesReward,
      createdAt: now, createdBy: request.auth!.uid,
    });
    transaction.set(submissionRef, {
      status: "Aprobado", reviewedAt: now, reviewedBy: request.auth!.uid,
      pointsAwarded: 20, flamesAwarded: flamesReward,
    }, {merge: true});
    return {status: "Aprobado", pointsAwarded: 20, flamesAwarded: flamesReward, changed: true};
  });

  if (result.changed) {
    await recordAudit(
      decision === "approve" ? "devotional-submission.approved" : "devotional-submission.rejected",
      request.auth.uid, submissionId, {
        pointsAwarded: result.pointsAwarded,
        flamesAwarded: result.flamesAwarded,
      },
    );
  }
  return {
    success: true, status: result.status,
    pointsAwarded: result.pointsAwarded,
    flamesAwarded: result.flamesAwarded,
  };
});

export const adminListDevotionals = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireModulePermission(request.auth.uid, "devotionals");

  // Paginación para no descargar cientos de documentos con imágenes Base64
  // en una sola llamada desde dispositivos móviles.
  const pageSize = 12;
  const cursor = text(request.data?.cursor, 150);
  let query = db.collection("devotionals").orderBy("date", "desc").limit(pageSize);
  if (cursor) {
    const cursorSnapshot = await db.collection("devotionals").doc(cursor).get();
    if (!cursorSnapshot.exists) {
      throw new HttpsError("not-found", "No se encontró el punto de continuación. Actualiza la lista.");
    }
    query = query.startAfter(cursorSnapshot);
  }
  const snapshot = await query.get();
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
      flyerDataUrl: text(data.flyerDataUrl, 700000),
      flyerDataUrls: Array.isArray(data.flyerDataUrls) ? data.flyerDataUrls.filter((image: unknown) => typeof image === "string").map((image: string) => text(image, 130000)).slice(0, 5) : [],
      createdAt: photoDate(data.createdAt),
    };
  }).sort((left, right) =>
    right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt),
  );
  const lastDocument = snapshot.docs[snapshot.docs.length - 1];
  return {
    devotionals,
    nextCursor: snapshot.size === pageSize ? lastDocument?.id ?? null : null,
  };
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
  const flyerDataUrl = text(data.flyerDataUrl, 700000);
  const rawFlyerDataUrls = Array.isArray(data.flyerDataUrls) ? data.flyerDataUrls : [];
  if (rawFlyerDataUrls.length > 5) {
    throw new HttpsError("invalid-argument", "Cada historia admite máximo 5 imágenes.");
  }
  const flyerDataUrls = Array.isArray(data.flyerDataUrls)
    ? data.flyerDataUrls.filter((image: unknown): image is string => typeof image === "string").map((image: string) => text(image, 130000))
    : flyerDataUrl ? [flyerDataUrl] : [];
  const totalFlyerSize = flyerDataUrls.reduce((total: number, image: string) => total + image.length, 0);
  if (flyerDataUrls.length > 5 || totalFlyerSize > 620000 ||
      flyerDataUrls.some((image: string) => !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(image))) {
    throw new HttpsError("invalid-argument", "La historia admite hasta 5 imágenes JPG, PNG o WebP optimizadas.");
  }

  if (!title || !verse || !reference || !author || !category || !content || !isValidDate(date)) {
    throw new HttpsError("invalid-argument", "Completa los campos y verifica la fecha del devocional.");
  }

  const result = await db.collection("devotionals").add({
    title, verse, reference, author, category, date, content,
    ...(flyerDataUrls.length ? {flyerDataUrls, flyerDataUrl: flyerDataUrls[0]} : {}),
    createdAt: new Date().toISOString(),
    createdBy: request.auth.uid,
  });
  await recordAudit("devotional.created", request.auth.uid, result.id, {date});
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
  await recordAudit("devotional.deleted", request.auth.uid, id);
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

  const bonusRef = db.collection("bonus").doc();
  const memberRef = db.collection("members").doc(memberId);
  const publicRef = db.collection("publicProfiles").doc(memberId);
  const rankingRef = db.collection("public").doc("ranking");
  await db.runTransaction(async (transaction) => {
    const [memberSnapshot, publicSnapshot, rankingSnapshot] = await Promise.all([
      transaction.get(memberRef),
      transaction.get(publicRef),
      transaction.get(rankingRef),
    ]);
    if (!memberSnapshot.exists) {
      throw new HttpsError("not-found", "El perfil del joven ya no existe.");
    }
    const memberData = memberSnapshot.data() ?? {};
    const publicData = publicSnapshot.data() ?? {};
    const rankingData = rankingSnapshot.data() ?? {};
    const rankingRows = Array.isArray(rankingData.all)
      ? rankingData.all as Array<Record<string, unknown>>
      : [];
    const rankingRow = rankingRows.find((entry) => text(entry.i, 150) === memberId);
    const rawPoints = publicData.points ?? publicData.puntos ??
      rankingRow?.t ?? memberData.points ?? memberData.puntos ?? 0;
    const currentPoints = Number(rawPoints);
    const safePoints = Number.isFinite(currentPoints) && currentPoints >= 0
      ? Math.floor(currentPoints)
      : 0;
    const nextPoints = safePoints + points;
    transaction.create(bonusRef, {
      memberId, memberName, reason, points,
      createdAt: new Date().toISOString(), createdBy: request.auth!.uid,
      appliedToRanking: true,
    });
    transaction.set(memberRef, {points: nextPoints}, {merge: true});
    if (publicSnapshot.exists) {
      transaction.set(publicRef, {points: nextPoints}, {merge: true});
    }
    if (rankingRow) {
      transaction.set(rankingRef, {
        all: rankingRows.map((entry) =>
          text(entry.i, 150) === memberId ? {...entry, t: nextPoints} : entry,
        ),
      }, {merge: true});
    }
  });
  await db.collection("audit").add({
    action: "bonus.created",
    actorUid: request.auth.uid,
    targetUid: memberId,
    createdAt: new Date().toISOString(),
    metadata: {points, bonusId: bonusRef.id},
  });
  return {success: true, id: bonusRef.id};
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
    if (!("name" in data) && ("m" in data || "t" in data)) return;
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
    const legacyVisits = Array.isArray(data.vs) ? data.vs.length : 0;
    const legacyStatus = text(data.st, 40) === "miembro" ? "Integrado" : legacyVisits > 1 ? "Contactado" : "Nuevo";
    const status = text(data.status, 40) || legacyStatus;
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
    if (data.status && text(data.status, 30).toLowerCase() !== "pendiente") return;
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
  await recordAudit("photo.approved", request.auth.uid, id);
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
  await recordAudit("photo.rejected", request.auth.uid, id);
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
  await recordAudit("photo.deleted", request.auth.uid, id);
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
    ]).map((item) => {
      const {editable, ...activity} = item;
      void editable;
      return activity;
    });

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
  await recordAudit(id ? "event.updated" : "event.created", request.auth.uid, ref.id, {published});
  return {success: true, id: ref.id};
});

export const setYouthWeeklyActivityAttendance = onCall(async (request) => {
  const memberId = requireYouthCommunitySession(request.data?.communitySession);
  const member = await getCommunityMember(memberId);
  const activityId = text(request.data?.activityId, 150);
  const response = text(request.data?.response, 20);
  if (!activityId || activityId.startsWith("legacy-") ||
    !["yes", "no", "maybe"].includes(response)) {
    throw new HttpsError("invalid-argument", "La actividad o respuesta no es válida.");
  }
  const activityRef = db.collection("weeklyActivities").doc(activityId);
  const activity = await activityRef.get();
  if (!activity.exists || activity.data()?.published !== true) {
    throw new HttpsError("not-found", "Esta actividad ya no está disponible para confirmar.");
  }
  const attendanceRef = db.collection("weeklyActivityAttendance").doc(activityId + "_" + memberId);
  await attendanceRef.set({
    activityId, memberId, response, name: member.name, nick: member.nick,
    updatedAt: new Date().toISOString(),
  }, {merge: true});
  return {success: true};
});

export const getYouthWeeklyActivityAttendance = onCall(async (request) => {
  const memberId = requireYouthCommunitySession(request.data?.communitySession);
  await getCommunityMember(memberId);
  const activityIds = Array.isArray(request.data?.activityIds)
    ? (request.data.activityIds as unknown[]).map((id) => text(id, 150))
      .filter((id) => id && !id.startsWith("legacy-")).slice(0, 30)
    : [];
  if (!activityIds.length) return {responses: {}};
  const refs = activityIds.map((id) => db.collection("weeklyActivityAttendance").doc(id + "_" + memberId));
  const snapshots = await db.getAll(...refs);
  const responses: Record<string, string> = {};
  snapshots.forEach((snapshot, index) => {
    const response = snapshot.data()?.response;
    if (["yes", "no", "maybe"].includes(String(response))) responses[activityIds[index]] = String(response);
  });
  return {responses};
});

export const adminGetWeeklyActivityAttendance = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await requireModulePermission(request.auth.uid, "events");
  const activityId = text(request.data?.activityId, 150);
  if (!activityId || activityId.startsWith("legacy-")) {
    throw new HttpsError("invalid-argument", "Selecciona una actividad nueva.");
  }
  const activity = await db.collection("weeklyActivities").doc(activityId).get();
  if (!activity.exists) throw new HttpsError("not-found", "No se encontró la actividad.");
  const snapshot = await db.collection("weeklyActivityAttendance")
    .where("activityId", "==", activityId).limit(500).get();
  const members = await Promise.all(snapshot.docs.map(async (document) => {
    const data = document.data();
    const memberId = text(data.memberId, 150);
    return {
      memberId,
      name: text(data.name, 120) || "Joven",
      nick: text(data.nick, 60),
      response: text(data.response, 20),
      updatedAt: text(data.updatedAt, 40),
    };
  }));
  return {
    members: members.filter((item) => item.memberId && ["yes", "no", "maybe"].includes(item.response))
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
  };
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
  // Consultar solo el historial de este joven evita recorrer toda la colección.
  const memberCheckins = await db.collection("checkins")
    .where("memberId", "==", memberId).limit(500).get();
  const duplicateExists = memberCheckins.docs.some((document) => {
    const record = document.data();
    return record.date === date &&
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

  const [modernSnapshot, legacySnapshot] = await Promise.all([
    db.collection("attendanceMeetings").orderBy("date", "desc").limit(300).get(),
    db.collection("attendance").limit(1000).get(),
  ]);

  // Resolve only member documents whose names are actually needed by this
  // attendance page; modern rows already carry their display name.
  const memberIds = new Set<string>();
  modernSnapshot.docs.forEach((document) => {
    const participants = document.data().participants;
    if (!Array.isArray(participants)) return;
    participants.forEach((item) => {
      if (typeof item !== "object" || item === null) return;
      const row = item as Record<string, unknown>;
      if (typeof row.memberId === "string" && !text(row.name, 120)) {
        const memberId = text(row.memberId, 150);
        if (memberId) memberIds.add(memberId);
      }
    });
  });
  legacySnapshot.docs.forEach((document) => {
    const records = document.data().r;
    if (!records || typeof records !== "object" || Array.isArray(records)) return;
    Object.keys(records as Record<string, unknown>).forEach((memberId) => {
      const id = text(memberId, 150);
      if (id) memberIds.add(id);
    });
  });
  const memberSnapshots = memberIds.size
    ? await db.getAll(...[...memberIds].map((memberId) => db.collection("members").doc(memberId)))
    : [];
  const memberNames = new Map(
    memberSnapshots
      .filter((document) => document.exists)
      .map((document) => [
        document.id,
        text(document.data()?.name, 120) || document.id,
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
    sab: "Servicio de jóvenes",
    vie: "Servicio de viernes",
    ayj: "Ayuno y servicio de jóvenes",
    ayc: "Ayuno de la congregación",
    esc: "Escuela dominical",
    otr: "Otro servicio o actividad",
    gen: "Servicio",
  };
  const legacy = [...legacySnapshot.docs]
    .sort((left, right) => right.id.localeCompare(left.id))
    .map((document) => {
      const data = document.data();
      const [date = "", service = "gen"] = document.id.split("_");
      const records = data.r && typeof data.r === "object"
        ? data.r as Record<string, unknown>
        : {};
      const participants = Object.entries(records).flatMap(([memberId, value]) => {
        if (!value || typeof value !== "object") return [];
        const statusCode = text((value as Record<string, unknown>).s, 10);
        const statusMap: Record<
          string,
          "Presente" | "Tarde" | "Falta" | "Justificada" | "Ausente"
        > = {
          P: "Presente", T: "Tarde", F: "Falta", J: "Justificada", A: "Ausente",
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
    historyLimited: legacySnapshot.size >= 1000,
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

  // ID determinista: evita crear reuniones duplicadas cuando dos líderes
  // abren asistencia al mismo tiempo para preparar el servicio semanal.
  const meetingId = `meeting_${meetingDate}_${createHash("sha256")
    .update(meetingName.toLocaleLowerCase("es"))
    .digest("hex").slice(0, 16)}`;
  const meetingRef = db.collection("attendanceMeetings").doc(meetingId);
  const created = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(meetingRef);
    if (existing.exists) return false;
    transaction.create(meetingRef, {
      name: meetingName,
      date: meetingDate,
      createdBy: request.auth!.uid,
      createdAt: new Date().toISOString(),
      participants: [],
    });
    return true;
  });
  if (created) {
    await recordAudit(
      "attendance.meeting.created",
      request.auth.uid,
      meetingId,
      {date: meetingDate},
    );
  }
  return {success: true, meetingId};
});

/**
 * Otorga puntos de asistencia una sola vez por joven y reunión.
 * Presente y Tarde cuentan como asistencia; las ediciones repetidas no duplican puntos.
 */
async function awardAttendancePoints(
  meetingId: string,
  participants: Array<{memberId: string; name: string; status: string}>,
  clearedMemberIds: string[],
  actorUid: string,
) {
  const desiredByMember = new Map<string, {points: number; status: string}>();
  participants.forEach((participant) => {
    const points = participant.status === "Presente" ? 10
      : participant.status === "Tarde" ? 8
      : participant.status === "Justificada" || participant.status === "Justificado" ? 2
      : 0;
    desiredByMember.set(participant.memberId, {points, status: participant.status});
  });
  clearedMemberIds.forEach((memberId) => desiredByMember.set(memberId, {points: 0, status: "Sin marca"}));

  for (const [memberId, desired] of desiredByMember) {
    const awardId = createHash("sha256").update(`${meetingId}:${memberId}`).digest("hex");
    const awardRef = db.collection("attendancePointAwards").doc(awardId);
    const memberRef = db.collection("members").doc(memberId);
    const publicRef = db.collection("publicProfiles").doc(memberId);
    const rankingRef = db.collection("public").doc("ranking");
    await db.runTransaction(async (transaction) => {
      const [awardSnapshot, memberSnapshot, publicSnapshot, rankingSnapshot] = await Promise.all([
        transaction.get(awardRef), transaction.get(memberRef),
        transaction.get(publicRef), transaction.get(rankingRef),
      ]);
      if (!memberSnapshot.exists && !publicSnapshot.exists) return;
      const member = memberSnapshot.data() ?? {};
      const profile = publicSnapshot.data() ?? {};
      const ranking = rankingSnapshot.data() ?? {};
      const legacyEntries = Array.isArray(ranking.all) ? ranking.all as Array<Record<string, unknown>> : [];
      const legacyEntry = legacyEntries.find((entry) => text(entry.i, 150) === memberId);
      const previousAward = awardSnapshot.exists ? Number(awardSnapshot.data()?.points ?? 0) : 0;
      const priorAward = Number.isFinite(previousAward) ? Math.max(0, Math.floor(previousAward)) : 0;
      const currentValue = profile.points ?? profile.puntos ?? legacyEntry?.t ?? member.points ?? member.puntos ?? 0;
      const current = Number(currentValue);
      const safeCurrent = Number.isFinite(current) && current >= 0 ? Math.floor(current) : 0;
      const delta = desired.points - priorAward;
      if (delta === 0 && desired.points === priorAward) {
        if (desired.points === 0 && awardSnapshot.exists) transaction.delete(awardRef);
        return;
      }
      const nextPoints = Math.max(0, safeCurrent + delta);
      if (memberSnapshot.exists) transaction.set(memberRef, {points: nextPoints}, {merge: true});
      if (publicSnapshot.exists || desired.points > 0) {
        transaction.set(publicRef, {points: nextPoints}, {merge: true});
      }
      if (legacyEntry) {
        transaction.set(rankingRef, {all: legacyEntries.map((entry) =>
          text(entry.i, 150) === memberId ? {...entry, t: nextPoints} : entry,
        )}, {merge: true});
      }
      if (desired.points > 0) {
        transaction.set(awardRef, {
          meetingId, memberId, points: desired.points, status: desired.status,
          updatedAt: new Date().toISOString(), updatedBy: actorUid,
          ...(awardSnapshot.exists ? {} : {createdAt: new Date().toISOString(), createdBy: actorUid}),
        }, {merge: true});
      } else if (awardSnapshot.exists) {
        transaction.delete(awardRef);
      }
    });
  }
}


/**
 * Otorga Llamas por asistencia con ajuste idempotente por reunión y joven.
 * Los cambios de estado recalculan la diferencia; nunca duplican el saldo.
 */
async function awardAttendanceFlames(
  meetingId: string,
  participants: Array<{memberId: string; name: string; status: string}>,
  clearedMemberIds: string[],
  actorUid: string,
) {
  const desiredByMember = new Map<string, {flames: number; status: string}>();
  participants.forEach((participant) => {
    const flames = participant.status === "Presente" ? 5
      : participant.status === "Tarde" ? 3
      : participant.status === "Justificada" || participant.status === "Justificado" ? 1
      : 0;
    desiredByMember.set(participant.memberId, {flames, status: participant.status});
  });
  clearedMemberIds.forEach((memberId) => {
    desiredByMember.set(memberId, {flames: 0, status: "Sin marca"});
  });

  for (const [memberId, desired] of desiredByMember) {
    const awardId = createHash("sha256").update(`${meetingId}:${memberId}`).digest("hex");
    const awardRef = db.collection("attendanceFlameAwards").doc(awardId);
    const memberRef = db.collection("members").doc(memberId);
    const publicRef = db.collection("publicProfiles").doc(memberId);
    const photoRef = db.collection("photos").doc(memberId);

    await db.runTransaction(async (transaction) => {
      const [awardSnapshot, memberSnapshot, publicSnapshot, photoSnapshot] = await Promise.all([
        transaction.get(awardRef),
        transaction.get(memberRef),
        transaction.get(publicRef),
        transaction.get(photoRef),
      ]);
      if (!memberSnapshot.exists && !publicSnapshot.exists && !photoSnapshot.exists) return;

      const previousValue = Number(awardSnapshot.data()?.flames ?? 0);
      const previousFlames = Number.isFinite(previousValue)
        ? Math.max(0, Math.floor(previousValue))
        : 0;
      const photo = photoSnapshot.data() ?? {};
      const member = memberSnapshot.data() ?? {};
      const profile = publicSnapshot.data() ?? {};
      const rawBalance = photo.w ?? profile.flames ?? member.flames ?? 0;
      const parsedBalance = Number(rawBalance);
      const currentBalance = Number.isFinite(parsedBalance) && parsedBalance >= 0
        ? Math.floor(parsedBalance)
        : 0;
      const delta = desired.flames - previousFlames;
      const nextBalance = Math.max(0, currentBalance + delta);
      const updatedAt = new Date().toISOString();
      const movementId = createHash("sha256")
        .update([awardId, text(awardSnapshot.data()?.updatedAt, 40), desired.status, desired.flames, updatedAt].join(":"))
        .digest("hex");
      const movementRef = db.collection("flameTransactions").doc(movementId);
      if (delta !== 0) {
        transaction.create(movementRef, {
          memberId,
          amount: delta,
          balanceAfter: nextBalance,
          type: "attendance",
          description: "Asistencia: " + desired.status,
          referenceId: meetingId,
          createdAt: updatedAt,
          createdBy: actorUid,
        });
      }

      if (photoSnapshot.exists || desired.flames > 0 || previousFlames > 0) {
        transaction.set(photoRef, {w: nextBalance, updatedAt: new Date().toISOString()}, {merge: true});
      }
      if (memberSnapshot.exists) {
        transaction.set(memberRef, {flames: nextBalance}, {merge: true});
      }
      if (publicSnapshot.exists) {
        transaction.set(publicRef, {flames: nextBalance}, {merge: true});
      }

      if (desired.status === "Sin marca") {
        if (awardSnapshot.exists) transaction.delete(awardRef);
        return;
      }
      transaction.set(awardRef, {
        meetingId,
        memberId,
        flames: desired.flames,
        status: desired.status,
        updatedAt: new Date().toISOString(),
        updatedBy: actorUid,
        ...(awardSnapshot.exists ? {} : {
          createdAt: new Date().toISOString(),
          createdBy: actorUid,
        }),
      }, {merge: true});
    });
  }
}

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
  const rawClearedIds = request.data?.clearedMemberIds;
  const clearedMemberIds = Array.isArray(rawClearedIds)
    ? rawClearedIds.map((id: unknown) => text(id, 150))
    : [];
  if (participantIds.some((id) => !id) ||
    new Set(participantIds).size !== participantIds.length ||
    clearedMemberIds.length > 500 ||
    clearedMemberIds.some((id) => !id) ||
    new Set(clearedMemberIds).size !== clearedMemberIds.length ||
    clearedMemberIds.some((id) => participantIds.includes(id))) {
    throw new HttpsError("invalid-argument", "Hay jóvenes vacíos, repetidos o marcas incompatibles.");
  }

  const validStatuses = ["Presente", "Tarde", "Falta", "Justificada", "Ausente"];
  const meetingRef = db.collection("attendanceMeetings").doc(meetingId);
  const meetingSnapshot = await meetingRef.get();
  const previousParticipants = meetingSnapshot.exists && Array.isArray(meetingSnapshot.data()?.participants)
    ? meetingSnapshot.data()!.participants as Array<Record<string, unknown>>
    : [];
  const previousById = new Map<string, Record<string, unknown>>();
  previousParticipants.forEach((item) => {
    const id = text(item.memberId, 150);
    if (id) previousById.set(id, item);
  });

  // En reuniones antiguas, permitir conservar/actualizar a miembros que ya no
  // están en el directorio activo, siempre que tengan un registro histórico.
  const legacyRef = db.collection("attendance").doc(meetingId);
  const legacySnapshotForValidation = !meetingSnapshot.exists ? await legacyRef.get() : null;
  const legacyRecordsForValidation = legacySnapshotForValidation?.exists &&
    legacySnapshotForValidation.data()?.r &&
    typeof legacySnapshotForValidation.data()?.r === "object"
    ? legacySnapshotForValidation.data()!.r as Record<string, unknown>
    : {};

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
      const previous = previousById.get(participantIds[index]);
      const previousStatus = text(previous?.status, 20);
      const normalizedPreviousStatus = previousStatus === "Justificado" ? "Justificada" : previousStatus;
      const legacyPrevious = legacyRecordsForValidation[participantIds[index]];
      const legacyCode = legacyPrevious && typeof legacyPrevious === "object"
        ? text((legacyPrevious as Record<string, unknown>).s, 10)
        : "";
      const hasLegacyRecord = ["P", "T", "F", "J", "A"].includes(legacyCode);
      if ((!previous || !validStatuses.includes(normalizedPreviousStatus)) && !hasLegacyRecord) {
        throw new HttpsError("not-found", "Uno de los jóvenes ya no existe en el directorio ni tiene un registro previo en esta reunión.");
      }
      return {
        memberId: participantIds[index],
        name: text(previous?.name, 120) || text(row.name, 120) || participantIds[index],
        status,
      };
    }
    const name = text(memberSnapshot.data()?.name, 120) || "Joven sin nombre";
    return {memberId: participantIds[index], name, status};
  });

  if (meetingSnapshot.exists) {
    await db.runTransaction(async (transaction) => {
      const currentMeeting = await transaction.get(meetingRef);
      if (!currentMeeting.exists) {
        throw new HttpsError("not-found", "La reunión ya no existe.");
      }
      const clearedIds = new Set(clearedMemberIds);
      const mergedParticipants = new Map(
        participants.map((participant) => [participant.memberId, participant]),
      );
      const existingParticipants = Array.isArray(currentMeeting.data()?.participants)
        ? currentMeeting.data()!.participants as Array<Record<string, unknown>>
        : [];
      // No borrar asistentes históricos que ya no figuran en el directorio activo.
      // El panel no ofrece una acción explícita para eliminar asistentes.
      existingParticipants.forEach((item) => {
        const memberId = text(item.memberId, 150);
        const status = text(item.status, 20);
        const normalizedStatus = status === "Justificado" ? "Justificada" : status;
        if (!memberId || clearedIds.has(memberId) || mergedParticipants.has(memberId) || !validStatuses.includes(normalizedStatus)) return;
        mergedParticipants.set(memberId, {
          memberId,
          name: text(item.name, 120) || "Joven sin nombre",
          status: normalizedStatus,
        });
      });
      if (mergedParticipants.size > 1000) {
        throw new HttpsError("resource-exhausted", "La reunión contiene demasiados registros para actualizarse de forma segura.");
      }
      transaction.update(meetingRef, {
        participants: [...mergedParticipants.values()],
        updatedAt: new Date().toISOString(),
        updatedBy: request.auth!.uid,
      });
    });
  } else {
    // Los eventos históricos usan IDs con formato YYYY-MM-DD_codigo.
    // Conservan los registros anteriores y actualizan solo los IDs enviados.
    const legacyIdMatch = /^(\d{4}-\d{2}-\d{2})(?:_[a-z0-9-]+)?$/i.exec(meetingId);
    if (!legacyIdMatch || !isValidDate(legacyIdMatch[1])) {
      throw new HttpsError("not-found", "No se encontró el evento seleccionado.");
    }

    await db.runTransaction(async (transaction) => {
      const legacySnapshot = await transaction.get(legacyRef);
      if (!legacySnapshot.exists) {
        throw new HttpsError("not-found", "El evento histórico ya no existe.");
      }
      const legacyData = legacySnapshot.data() ?? {};
      const previousRecords = legacyData.r && typeof legacyData.r === "object"
        ? legacyData.r as Record<string, unknown>
        : {};
      const statusCodes: Record<string, string> = {
        Presente: "P",
        Tarde: "T",
        Falta: "F",
        Justificada: "J",
        Ausente: "A",
      };
      const nextRecords: Record<string, unknown> = {...previousRecords};
      clearedMemberIds.forEach((memberId) => { delete nextRecords[memberId]; });
      participants.forEach((participant) => {
        const previous = previousRecords[participant.memberId];
        const previousRecord = previous && typeof previous === "object"
          ? previous as Record<string, unknown>
          : {};
        nextRecords[participant.memberId] = {
          ...previousRecord,
          s: statusCodes[participant.status],
        };
      });
      transaction.update(legacyRef, {
        r: nextRecords,
        updatedAt: new Date().toISOString(),
        updatedBy: request.auth!.uid,
      });
    });
  }

  await awardAttendancePoints(meetingId, participants, clearedMemberIds, request.auth.uid);
  await awardAttendanceFlames(meetingId, participants, clearedMemberIds, request.auth.uid);
  await recordAudit("attendance.saved", request.auth.uid, meetingId, {participants: participants.length});
  return {success: true};
});


// Helpers de privacidad y notificaciones para las funciones básicas de comunidad.
function socialDirectedId(left: string, right: string): string {
  return `${Buffer.from(left).toString("base64url")}.${Buffer.from(right).toString("base64url")}`;
}
async function assertNotBlocked(left: string, right: string): Promise<void> {
  const forward = db.collection("youthCommunityBlocks").doc(socialDirectedId(left, right));
  const reverse = db.collection("youthCommunityBlocks").doc(socialDirectedId(right, left));
  const [a, b] = await Promise.all([forward.get(), reverse.get()]);
  if (a.exists || b.exists) {
    throw new HttpsError("permission-denied", "Esta interacción no está disponible por la configuración de privacidad.");
  }
}
async function notifyYouthMember(recipientId: string, actorId: string, type: string, message: string, targetId = ""): Promise<void> {
  if (!recipientId || recipientId === actorId) return;
  try {
    await db.collection("youthCommunityNotifications").add({
      recipientId, actorId, type: text(type, 40), message: text(message, 180),
      ...(targetId ? {targetId: text(targetId, 150)} : {}),
      read: false, createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("No se pudo crear la notificación social:", error);
  }
}
