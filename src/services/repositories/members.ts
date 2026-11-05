/** Campos observados en la aplicación original. Opcionales porque el esquema histórico es flexible. */
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
