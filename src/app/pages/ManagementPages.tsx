import styles from '../styles/ManagementPages.module.css';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth, db } from '../../services/firebase/client';

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

import './ManagementPages.css';

type ModuleKind = 'bonus' | 'pastoral' | 'leaders' | 'audit' | 'settings';

type RecordItem = Record<string, unknown> & {
  id: string;
};

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

  const [memberName, setMemberName] = useState('');
  const [reason, setReason] = useState('');
  const [points, setPoints] = useState('10');

  const [noteTitle, setNoteTitle] = useState('');
  const [note, setNote] = useState('');

  const [settingKey, setSettingKey] = useState('');
  const [settingValue, setSettingValue] = useState('');

  useEffect(() => {
    const database = db;

    if (!database) {
      setError('Firebase no está configurado en este entorno.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const unsubscribe = onSnapshot(
      collection(database, config.collection),
      (snapshot) => {
        const result = snapshot.docs.map((item) => ({
          ...item.data(),
          id: item.id,
        })) as RecordItem[];

        setRecords(result);
        setLoading(false);
      },
      (err) => {
        console.error(`Error leyendo ${config.collection}:`, err);
        setError(
          err.code === 'permission-denied'
            ? 'No tienes permisos para consultar esta información. Revisa las reglas de Firebase Staging.'
            : 'No se pudo cargar la información. Comprueba tu conexión.',
        );
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [config.collection]);

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!db || !auth?.currentUser) {
      setError('Debes iniciar sesión para realizar esta acción.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (kind === 'bonus') {
        const amount = Number(points);

        if (!memberName.trim() || !reason.trim() || !Number.isFinite(amount) || amount <= 0) {
          throw new Error('Completa el nombre, el motivo y una cantidad válida de puntos.');
        }

        await addDoc(collection(db, 'bonus'), {
          memberName: memberName.trim(),
          reason: reason.trim(),
          points: amount,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser.uid,
        });

        setMemberName('');
        setReason('');
        setPoints('10');
        setMessage('Los puntos extra fueron registrados.');
      }

      if (kind === 'pastoral') {
        if (!memberName.trim() || !noteTitle.trim() || !note.trim()) {
          throw new Error('Completa el nombre, el título y la nota.');
        }

        await addDoc(collection(db, 'pastoral'), {
          memberName: memberName.trim(),
          title: noteTitle.trim(),
          note: note.trim(),
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser.uid,
        });

        setMemberName('');
        setNoteTitle('');
        setNote('');
        setMessage('La nota pastoral fue guardada.');
      }

      if (kind === 'settings') {
        const key = settingKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

        if (!key || !settingValue.trim()) {
          throw new Error('Escribe el nombre y el valor del ajuste.');
        }

        await setDoc(
          doc(db, 'settings', key),
          {
            key,
            value: settingValue.trim(),
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.uid,
          },
          { merge: true },
        );

        setSettingKey('');
        setSettingValue('');
        setMessage('La configuración fue guardada.');
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el registro.',
      );
    } finally {
      setSaving(false);
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
              <label>
                Nombre del joven
                <input
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Nombre del participante"
                  required
                />
              </label>

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
              <label>
                Nombre de la persona
                <input
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Nombre del joven"
                  required
                />
              </label>

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
            onClick={() => window.location.reload()}
            title="Actualizar"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {loading && (
          <div className="management-empty">Cargando información...</div>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="management-empty">
            Todavía no hay registros disponibles.
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="management-list">
            {records.map((row) => (
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
        Información protegida · Firebase Staging.
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
