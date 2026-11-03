import {httpsCallable} from "firebase/functions";
import {functions} from "./firebase/client";

export type PublicProfile = {
  id: string;
  name: string;
  nick: string;
  pic: string;
  points: number;
};

type PublicProfilesResponse = {profiles: PublicProfile[]};

export async function getPublicProfiles(): Promise<PublicProfile[]> {
  if (!functions) {
    throw new Error("Firebase Functions no está configurado en este entorno.");
  }

  try {
    const callable = httpsCallable<Record<string, never>, PublicProfilesResponse>(
      functions,
      "getPublicProfiles",
    );
    const response = await callable({});
    return (response.data.profiles ?? []).map((profile) => ({
      id: String(profile.id),
      name: String(profile.name || profile.nick || "Perfil sin nombre"),
      nick: String(profile.nick ?? ""),
      pic: typeof profile.pic === "string" && profile.pic.startsWith("https://")
        ? profile.pic
        : "",
      points: Number.isFinite(Number(profile.points)) && Number(profile.points) >= 0
        ? Number(profile.points)
        : 0,
    }));
  } catch (error) {
    console.error("Error consultando perfiles públicos:", error);
    throw new Error(
      "No se pudieron cargar los perfiles. Comprueba que las funciones de Staging estén desplegadas.",
    );
  }
}
