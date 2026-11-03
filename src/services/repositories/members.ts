import {getMembersForAdministration} from '../youthPortal';

export type MemberRecord = {
  id: string;
  name?: string;
  phone?: string;
  created?: string | number;
  from?: string;
  bd?: string;
  ac?: boolean | string;
  ap?: string;
  br?: string;
  nick?: string;
  nopub?: boolean;
  bau?: string;
  con?: string;
  dis?: string;
  mn?: string;
  nt?: string;
  pic?: string;
  [key: string]: unknown;
};

/**
 * Compatibilidad con componentes antiguos: la lectura ya no usa onSnapshot
 * ni el SDK de Firestore. La consulta se realiza mediante la callable protegida.
 */
export function subscribeMembers(
  onData: (members: MemberRecord[]) => void,
  onError: (error: Error) => void,
): () => void {
  let active = true;
  void getMembersForAdministration()
    .then((members) => {
      if (!active) return;
      const rows = members.map((member) => ({...member})) as MemberRecord[];
      rows.sort((a, b) =>
        String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es'),
      );
      onData(rows);
    })
    .catch((cause: unknown) => {
      if (!active) return;
      onError(
        cause instanceof Error
          ? cause
          : new Error('No se pudieron cargar los jóvenes.'),
      );
    });

  return () => {
    active = false;
  };
}
