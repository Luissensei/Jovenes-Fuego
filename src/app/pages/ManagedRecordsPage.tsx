import styles from '../styles/ManagedRecordsPage.module.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
  RefreshCw,
  CalendarDays,
} from 'lucide-react';

import {getMembersForAdministration, type MemberAdminRecord} from '../../services/youthPortal';

import {
  createManagedRecord,
  deleteManagedRecord,
  listManagedRecords,
  updateManagedRecord,
  updateManagedRecordStatus,
  type ManagedCollection,
  type ManagedRecord,
} from '../../services/repositories/managedRecords';

export type ManagedField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'date' | 'time' | 'tel' | 'textarea' | 'member';
  required?: boolean;
  hidden?: boolean;
  listHidden?: boolean;
};

export type ManagedPageConfig = {
  collection: ManagedCollection;
  eyebrow: string;
  title: string;
  description: string;
  createLabel: string;
  fields: ManagedField[];
  statusOptions: string[];
  emptyTitle: string;
  emptyDescription: string;
};

type Props = {
  config: ManagedPageConfig;
};

function getToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function initialForm(fields: ManagedField[]) {
  const result: Record<string, string> = {};

  fields.forEach((field) => {
    result[field.key] =
      field.type === 'date' ? getToday() : '';
  });

  return result;
}

function getRecordValue(record: ManagedRecord, key: string) {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

export default function ManagedRecordsPage({ config }: Props) {
  const [records, setRecords] = useState<ManagedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(
    () => initialForm(config.fields),
  );

  const mountedRef = useRef(false);
  const [members, setMembers] = useState<MemberAdminRecord[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const loadRecords = useCallback(async (showLoading = true) => {
    if (mountedRef.current) {
      if (showLoading) setLoading(true);
      setError('');
    }
    try {
      const items = await listManagedRecords(config.collection);
      if (mountedRef.current) setRecords(items);
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los registros.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [config.collection]);

  useEffect(() => {
    mountedRef.current = true;
    void loadRecords();
    return () => { mountedRef.current = false; };
  }, [loadRecords]);

  useEffect(() => {
    if (!config.fields.some((field) => field.type === 'member')) return;
    let active = true;
    setMembersLoading(true);
    getMembersForAdministration('followups')
      .then((items) => { if (active) setMembers(items); })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los jóvenes.');
      })
      .finally(() => { if (active) setMembersLoading(false); });
    return () => { active = false; };
  }, [config.fields]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return records;

    return records.filter((record) =>
      config.fields.some((field) =>
        getRecordValue(record, field.key)
          .toLowerCase()
          .includes(term),
      ) ||
      record.status.toLowerCase().includes(term),
    );
  }, [records, search, config.fields]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    config.statusOptions.forEach((status) => {
      counts[status] = records.filter(
        (record) => record.status === status,
      ).length;
    });

    return counts;
  }, [records, config.statusOptions]);

  function openCreate() {
    setEditingId(null);
    setForm(initialForm(config.fields));
    setError('');
    setMessage('');
    setShowForm(true);
  }

  function openEdit(record: ManagedRecord) {
    const values = initialForm(config.fields);

    config.fields.forEach((field) => {
      values[field.key] = getRecordValue(record, field.key);
    });

    setEditingId(record.id);
    setForm(values);
    setError('');
    setMessage('');
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(initialForm(config.fields));
  }

  function changeField(key: string, value: string) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      if (editingId) {
        await updateManagedRecord(
          config.collection,
          editingId,
          form,
        );
        setMessage('Registro actualizado correctamente.');
      } else {
        await createManagedRecord(
          config.collection,
          {
            ...form,
            status: config.statusOptions[0],
          },
        );
        setMessage('Registro creado correctamente.');
      }

      if (!mountedRef.current) return;
      setShowForm(false);
      setEditingId(null);
      setForm(initialForm(config.fields));
      await loadRecords(false);
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo guardar el registro.');
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  async function handleStatusChange(
    record: ManagedRecord,
    status: string,
  ) {
    setError('');
    setMessage('');
    setProcessingId(record.id);

    try {
      await updateManagedRecordStatus(
        config.collection,
        record.id,
        status,
      );
      if (!mountedRef.current) return;
      setMessage('Estado actualizado correctamente.');
      await loadRecords(false);
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado.');
      }
    } finally {
      if (mountedRef.current) setProcessingId(null);
    }
  }

  async function handleDelete(record: ManagedRecord) {
    const title = config.fields
      .map((field) => getRecordValue(record, field.key))
      .find(Boolean) || 'este registro';

    if (!window.confirm(`¿Deseas eliminar "${title}"?`)) return;

    setError('');
    setMessage('');
    setProcessingId(record.id);

    try {
      await deleteManagedRecord(config.collection, record.id);
      if (!mountedRef.current) return;
      setMessage('Registro eliminado correctamente.');
      await loadRecords(false);
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el registro.');
      }
    } finally {
      if (mountedRef.current) setProcessingId(null);
    }
  }

  return (
    <main className={`${styles.scope} managed-page`}>
      <header className="managed-hero">
        <div>
          <span className="managed-eyebrow">{config.eyebrow}</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>

        <button
          type="button"
          className="managed-primary"
          onClick={openCreate}
        >
          <Plus size={18} />
          {config.createLabel}
        </button>
      </header>

      <section className="managed-stat-grid">
        <article className="managed-stat">
          <span>Total de registros</span>
          <strong>{records.length}</strong>
        </article>

        {config.statusOptions.slice(0, 3).map((status) => (
          <article className="managed-stat" key={status}>
            <span>{status}</span>
            <strong>{statusCounts[status] ?? 0}</strong>
          </article>
        ))}
      </section>

      {error && (
        <div className="managed-alert error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="managed-alert success" role="status">
          {message}
        </div>
      )}

      <section className="managed-toolbar">
        <div className="managed-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar registros..."
          />
          {search && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={() => setSearch('')}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <span className="managed-results">
          {filtered.length} resultados
        </span>
      </section>

      {loading ? (
        <div className="managed-empty">
          <RefreshCw className="managed-loading-icon" size={25} />
          <strong>Cargando información...</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="managed-empty">
          <CalendarDays size={34} />
          <strong>{config.emptyTitle}</strong>
          <p>
            {search
              ? 'No se encontraron resultados para tu búsqueda.'
              : config.emptyDescription}
          </p>
          {!search && (
            <button
              type="button"
              className="managed-primary"
              onClick={openCreate}
            >
              <Plus size={17} /> {config.createLabel}
            </button>
          )}
        </div>
      ) : (
        <section className="managed-record-list">
          {filtered.map((record) => {
            const titleField = config.fields[0];
            const title = titleField
              ? getRecordValue(record, titleField.key)
              : record.id;

            const descriptionField = config.fields[1];
            const description = descriptionField
              ? getRecordValue(record, descriptionField.key)
              : '';

            return (
              <article className="managed-record" key={record.id}>
                <div className="managed-record-main">
                  <div className="managed-record-heading">
                    <h3>{title || 'Sin título'}</h3>
                    <span className="managed-status">
                      {record.status || 'Sin estado'}
                    </span>
                  </div>

                  {description && (
                    <p className="managed-record-description">
                      {description}
                    </p>
                  )}

                  <div className="managed-record-details">
                    {config.fields.filter((field) => !field.listHidden && field.key !== config.fields[0]?.key && field.key !== config.fields[1]?.key).map((field) => {
                      const value = getRecordValue(record, field.key);

                      if (!value) return null;

                      return (
                        <span key={field.key}>
                          <strong>{field.label}:</strong> {value}
                        </span>
                      );
                    })}
                  </div>

                  {record.createdAt && (
                    <small className="managed-created">
                      Registrado: {new Date(record.createdAt).toLocaleString('es-CO')}
                    </small>
                  )}
                  {record.editable === false && (
                    <small className="managed-created">Registro histórico · solo consulta</small>
                  )}
                </div>

                <div className="managed-record-actions">
                  <label className="managed-status-label">
                    <span>Cambiar estado</span>
                    <select
                      value={record.status}
                      disabled={processingId === record.id || record.editable === false}
                      onChange={(event) =>
                        void handleStatusChange(record, event.target.value)
                      }
                    >
                      {!config.statusOptions.includes(record.status) && (
                        <option value={record.status}>
                          {record.status}
                        </option>
                      )}

                      {config.statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="managed-action-buttons">
                    <button
                      type="button"
                      aria-label="Editar registro"
                      title="Editar"
                      onClick={() => openEdit(record)}
                      disabled={processingId === record.id || record.editable === false}
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      aria-label="Eliminar registro"
                      title="Eliminar"
                      className="managed-delete"
                      onClick={() => void handleDelete(record)}
                      disabled={processingId === record.id || record.editable === false}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showForm && (
        <div className="managed-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <form className="managed-modal" onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-labelledby="managed-modal-title">
            <header className="managed-modal-header">
              <div>
                <span className="managed-eyebrow">
                  {editingId ? 'ACTUALIZAR' : 'NUEVO REGISTRO'}
                </span>
                <h2 id="managed-modal-title">{editingId ? 'Editar registro' : config.createLabel}</h2>
              </div>

              <button
                type="button"
                className="managed-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Cerrar"
              >
                <X />
              </button>
            </header>

            {config.fields.filter((field) => !field.hidden).map((field) => (
              <div className="managed-form-field" key={field.key}>
                <label htmlFor={`managed-${field.key}`}>
                  {field.label}
                </label>

                {field.type === 'member' ? (
                  <select
                    id={`managed-${field.key}`}
                    value={form[field.key] ?? ''}
                    onChange={(event) => {
                      const member = members.find((item) => item.id === event.target.value);
                      setForm((previous) => ({
                        ...previous,
                        [field.key]: event.target.value,
                        name: String(member?.name ?? member?.nick ?? ''),
                      }));
                    }}
                    required={field.required !== false}
                    disabled={membersLoading || members.length === 0}
                  >
                    <option value="">{membersLoading ? 'Cargando jóvenes...' : members.length ? 'Selecciona un joven' : 'No hay jóvenes disponibles'}</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {String(member.name ?? 'Sin nombre')}{member.nick ? ` · @${member.nick}` : ''}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={`managed-${field.key}`}
                    value={form[field.key] ?? ''}
                    onChange={(event) => changeField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    required={field.required !== false}
                    rows={4}
                    maxLength={5000}
                  />
                ) : (
                  <input
                    id={`managed-${field.key}`}
                    type={field.type ?? 'text'}
                    value={form[field.key] ?? ''}
                    onChange={(event) => changeField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    required={field.required !== false}
                    maxLength={500}
                  />
                )}
              </div>
            ))}

            <div className="managed-modal-actions">
              <button
                type="button"
                className="managed-secondary"
                onClick={closeForm}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="managed-primary"
                disabled={saving}
              >
                <Save size={17} />
                {saving ? 'Guardando...' : 'Guardar registro'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
