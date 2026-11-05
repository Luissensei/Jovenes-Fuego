import styles from '../styles/ManagementPages.module.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {getMembersForAdministration, type MemberAdminRecord} from '../../services/youthPortal';
import {
  createBonusRecord,
  createPastoralNote,
  listManagementRecords,
  saveManagementSetting,
  type ManagementRecord,
} from '../../services/repositories/management';

import {
  ShieldCheck,
  Users,
  Star,
  BookOpen,
  ClipboardList,
  Settings,
  RefreshCw,
  Plus,
  LockKeyhole,
} from 'lucide-react';



type ModuleKind = 'bonus' | 'pastoral' | 'leaders' | 'audit' | 'settings';

type RecordItem = ManagementRecord;

const configurations = {
  bonus: {
    title: 'Puntos extras',
    description: 'Reconoce la participación y el compromiso de los jóvenes.',
    collection: 'bonus',
    icon: Star,
  },
  pastoral: {
    title: 'Notas pastorales',
    description: 'Registro privado de acompañamiento pastoral.',
    collection: 'pastoral',
    icon: BookOpen,
  },
  leaders: {
    title: 'Líderes y usuarios',
    description: 'Consulta de cuentas y roles autorizados.',
    collection: 'users',
    icon: Users,
  },
  audit: {
    title: 'Auditorías',
    description: 'Consulta de los registros de actividad del sistema.',
    collection: 'audit',
    icon: ClipboardList,
  },
  settings: {
    title: 'Configuración',
    description: 'Administración de preferencias de la aplicación.',
    collection: 'settings',
    icon: Settings,
  },
};

function valueText(value: unknown): string {
  if (value === null || value === undefined) return '—';

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'object' && 'toDate' in value) {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleString('es-CO');
    }
  }

  return '—';
}

function displayName(row: RecordItem): string {
  return valueText(row.name ?? row.memberName ?? row.title ?? row.user ?? row.email ?? row.id);
}

export default function ManagementPage({ kind }: { kind: ModuleKind }) {
  const config = configurations[kind];
  const Icon = config.icon;

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [recordSearch, setRecordSearch] = useState('');

  const [members, setMembers] = useState<MemberAdminRecord[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId),
    [members, selectedMemberId],
  );
  const memberName = selectedMember ? String(selectedMember.name ?? selectedMember.nick ?? '') : '';
  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLocaleLowerCase('es');
    if (!query) return members;
    return members.filter((member) => [
      member.name, member.nick, member.phone, member.id,
    ].some((value) => String(value ?? '').toLocaleLowerCase('es').includes(query)));
  }, [members, memberSearch]);
  const [reason, setReason] = useState('');
  const [points, setPoints] = useState('10');
  const [noteTitle, setNoteTitle] = useState('');
  const [note, setNote] = useState('');
  const [settingKey, setSettingKey] = useState('');
  const [settingValue, setSettingValue] = useState('');
  const mountedRef = useRef(false);
  const filteredRecords = useMemo(() => {
    const query = recordSearch.trim().toLocaleLowerCase('es');
    if (!query) return records;
    return records.filter((record) => Object.values(record).some((value) => {
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value).toLocaleLowerCase('es').includes(query);
      }
      if (Array.isArray(value)) {
        return value.join(' ').toLocaleLowerCase('es').includes(query);
      }
      return false;
    }));
  }, [records, recordSearch]);

  const loadRecords = useCallback(async () => {
    if (mountedRef.current) {
      setLoading(true);
      setError('');
    }
    try {
      const result = await listManagementRecords(kind);
      if (mountedRef.current) setRecords(result);
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo cargar la información.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    mountedRef.current = true;
    void loadRecords();
    return () => { mountedRef.current = false; };
  }, [loadRecords]);

  useEffect(() => {
    if (kind !== 'bonus' && kind !== 'pastoral') return;
    let active = true;
    setMembersLoading(true);
    getMembersForAdministration()
      .then((result) => {
        if (active) setMembers(result);
      })
      .catch((cause) => {
        console.error('Error cargando jóvenes para el selector:', cause);
        if (active) {
          setMembers([]);
          setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los jóvenes.');
        }
      })
      .finally(() => {
        if (active) setMembersLoading(false);
      });
    return () => { active = false; };
  }, [kind]);

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (kind === 'bonus') {
        const amount = Number(points);
        if (!selectedMember || !memberName.trim() || !reason.trim() ||
          !Number.isInteger(amount) || amount <= 0 || amount > 10000) {
          throw new Error('Selecciona un joven, indica el motivo y una cantidad entera válida de puntos.');
        }
        await createBonusRecord({
          memberId: selectedMember.id,
          reason: reason.trim(),
          points: amount,
        });
        if (!mountedRef.current) return;
        setSelectedMemberId('');
        setMemberSearch('');
        setReason('');
        setPoints('10');
        setMessage('Los puntos extra fueron registrados.');
      }

      if (kind === 'pastoral') {
        if (!selectedMember || !memberName.trim() || !noteTitle.trim() || !note.trim()) {
          throw new Error('Completa el nombre, el título y la nota.');
        }
        await createPastoralNote({
          memberId: selectedMember.id,
          title: noteTitle.trim(),
          note: note.trim(),
        });
        if (!mountedRef.current) return;
        setSelectedMemberId('');
        setMemberSearch('');
        setNoteTitle('');
        setNote('');
        setMessage('La nota pastoral fue guardada.');
      }

      if (kind === 'settings') {
        const key = settingKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        if (!key || !settingValue.trim()) {
          throw new Error('Escribe el nombre y el valor del ajuste.');
        }
        await saveManagementSetting({key, value: settingValue.trim()});
        if (!mountedRef.current) return;
        setSettingKey('');
        setSettingValue('');
        setMessage('La configuración fue guardada.');
      }

      if (mountedRef.current) await loadRecords();
    } catch (err) {
      console.error(err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar el registro.');
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  const readOnly = kind === 'leaders' || kind === 'audit';
  const canCreate = !readOnly;

  return (
    <section className={`${styles.scope} management-page`}>
      <header className="management-header">
        <div className="management-icon">
          <Icon size={27} />
        </div>

        <div>
          <span className="management-kicker">JÓVENES DE FUEGO</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
      </header>

      <div className="management-summary">
        <div>
          <span>Registros disponibles</span>
          <strong>{records.length}</strong>
        </div>
        <div className="management-summary-icon">
          <ShieldCheck size={24} />
        </div>
      </div>

      {error && (
        <div className="management-message error">
          <LockKeyhole size={18} />
          {error}
        </div>
      )}

      {message && (
        <div className="management-message success">
          <ShieldCheck size={18} />
          {message}
        </div>
      )}

      {canCreate && (
        <form className="management-form" onSubmit={saveRecord}>
          <h2>
            {kind === 'bonus'
              ? 'Asignar puntos extra'
              : kind === 'pastoral'
                ? 'Crear nota pastoral'
                : 'Agregar o actualizar ajuste'}
          </h2>

          {kind === 'bonus' && (
            <>
              <div className="management-member-picker">
                <label htmlFor="bonus-member-search">Buscar joven</label>
                <input id="bonus-member-search" type="search" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Escribe nombre, apodo o teléfono..." autoComplete="off" />
                <label htmlFor="bonus-member-select">Seleccionar joven</label>
                <select id="bonus-member-select" value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)} required disabled={membersLoading || members.length === 0}>
                  <option value="">{membersLoading ? 'Cargando jóvenes...' : members.length === 0 ? 'No hay jóvenes disponibles' : 'Selecciona un joven'}</option>
                  {filteredMembers.map((member) => <option key={member.id} value={member.id}>{String(member.name ?? 'Sin nombre')}{member.nick ? ` · @${member.nick}` : ''}</option>)}
                </select>
                {selectedMember && <small>Seleccionado: {memberName} · ID vinculado correctamente</small>}
                {!membersLoading && members.length > 0 && filteredMembers.length === 0 && <small>No hay coincidencias. Prueba otro nombre o apodo.</small>}
              </div>

              <label>
                Motivo de los puntos
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explica por qué recibe puntos..."
                  required
                />
              </label>

              <label>
                Cantidad de puntos
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  required
                />
              </label>
            </>
          )}

          {kind === 'pastoral' && (
            <>
              <div className="management-member-picker">
                <label htmlFor="pastoral-member-search">Buscar joven</label>
                <input id="pastoral-member-search" type="search" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Escribe nombre, apodo o teléfono..." autoComplete="off" />
                <label htmlFor="pastoral-member-select">Seleccionar joven</label>
                <select id="pastoral-member-select" value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)} required disabled={membersLoading || members.length === 0}>
                  <option value="">{membersLoading ? 'Cargando jóvenes...' : members.length === 0 ? 'No hay jóvenes disponibles' : 'Selecciona un joven'}</option>
                  {filteredMembers.map((member) => <option key={member.id} value={member.id}>{String(member.name ?? 'Sin nombre')}{member.nick ? ` · @${member.nick}` : ''}</option>)}
                </select>
                {selectedMember && <small>Seleccionado: {memberName} · ID vinculado correctamente</small>}
                {!membersLoading && members.length > 0 && filteredMembers.length === 0 && <small>No hay coincidencias. Prueba otro nombre o apodo.</small>}
              </div>

              <label>
                Título de la nota
                <input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Asunto de la nota"
                  required
                />
              </label>

              <label>
                Nota pastoral
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Escribe la nota de acompañamiento..."
                  rows={5}
                  required
                />
              </label>

              <p className="management-private-note">
                <LockKeyhole size={15} />
                Información privada para el equipo pastoral autorizado.
              </p>
            </>
          )}

          {kind === 'settings' && (
            <>
              <label>
                Nombre del ajuste
                <input
                  value={settingKey}
                  onChange={(e) => setSettingKey(e.target.value)}
                  placeholder="Ejemplo: nombre_comunidad"
                  required
                />
              </label>

              <label>
                Valor
                <textarea
                  value={settingValue}
                  onChange={(e) => setSettingValue(e.target.value)}
                  placeholder="Escribe el valor del ajuste..."
                  required
                />
              </label>
              <p className="management-private-note">
                Los ajustes se guardan en documentos de la colección settings.
              </p>
            </>
          )}

          <button className="management-submit" disabled={saving}>
            <Plus size={17} />
            {saving ? 'Guardando...' : 'Guardar registro'}
          </button>
        </form>
      )}

      <div className="management-records">
        <div className="management-records-heading">
          <h2>
            {kind === 'leaders'
              ? 'Cuentas registradas'
              : kind === 'audit'
                ? 'Historial de actividad'
                : 'Registros'}
          </h2>

          <button
            type="button"
            onClick={() => void loadRecords()}
            disabled={loading}
            title="Actualizar"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <label className="management-record-search">
          <span>Buscar en los registros</span>
          <input
            type="search"
            value={recordSearch}
            onChange={(event) => setRecordSearch(event.target.value)}
            placeholder="Buscar por nombre, fecha, estado o contenido..."
            aria-label="Buscar en los registros de este módulo"
          />
        </label>
        <div className="management-record-count" aria-live="polite">
          {filteredRecords.length} de {records.length} registros
        </div>

        {loading && (
          <div className="management-empty">Cargando información...</div>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="management-empty">
            Todavía no hay registros disponibles.
          </div>
        )}

        {!loading && records.length > 0 && filteredRecords.length === 0 && (
          <div className="management-empty">
            No hay registros que coincidan con esa búsqueda.
          </div>
        )}

        {!loading && filteredRecords.length > 0 && (
          <div className="management-list">
            {filteredRecords.map((row) => (
              <article className="management-record" key={row.id}>
                <div className="management-record-top">
                  <strong>{displayName(row)}</strong>

                  {kind === 'leaders' && (
                    <span className="management-role">
                      {valueText(row.role)}
                    </span>
                  )}

                  {kind === 'bonus' && (
                    <span className="management-role">
                      +{valueText(row.points)} puntos
                    </span>
                  )}
                </div>

                {kind === 'bonus' && (
                  <>
                    <p>{valueText(row.reason)}</p>
                    <small>{valueText(row.createdAt)}</small>
                  </>
                )}

                {kind === 'pastoral' && (
                  <>
                    <p><b>{valueText(row.title)}</b></p>
                    <p className="management-note-content">
                      {valueText(row.note)}
                    </p>
                    <small>{valueText(row.createdAt)}</small>
                  </>
                )}

                {kind === 'leaders' && (
                  <>
                    <p>Usuario: {valueText(row.user ?? row.email ?? row.id)}</p>
                    <small>ID: {row.id}</small>
                  </>
                )}

                {kind === 'audit' && (
                  <>
                    <p>{valueText(row.action ?? row.description ?? row.type)}</p>
                    <small>
                      {valueText(row.createdAt)} · {valueText(row.userName ?? row.userId)}
                    </small>
                  </>
                )}

                {kind === 'settings' && (
                  <>
                    <p><b>Clave:</b> {valueText(row.key ?? row.id)}</p>
                    <p className="management-note-content">
                      <b>Valor:</b> {valueText(row.value)}
                    </p>
                    <small>Actualizado: {valueText(row.updatedAt)}</small>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <footer className="management-footer">
        <ShieldCheck size={15} />
        Información protegida · Firebase original.
      </footer>
    </section>
  );
}

export function BonusPage() {
  return <ManagementPage kind="bonus" />;
}

export function PastoralPage() {
  return <ManagementPage kind="pastoral" />;
}

export function LeadersPage() {
  return <ManagementPage kind="leaders" />;
}

export function AuditPage() {
  return <ManagementPage kind="audit" />;
}

export function SettingsPage() {
  return <ManagementPage kind="settings" />;
}
