import {useEffect, useMemo, useState} from 'react';
import type {FormEvent} from 'react';
import {
  AlertCircle, Search, Users, RefreshCw, CalendarDays, Phone,
  UserRound, Flame, X, Save, Edit3, ShieldCheck,
} from 'lucide-react';
import {firebaseConfigured} from '../services/firebase/client';
import {
  getMembersForAdministration,
  updateMemberForAdministration,
  type MemberAdminRecord,
  type AdminMemberPatch,
} from '../services/youthPortal';

const editableFields: {key: keyof AdminMemberPatch; label: string; type?: string; multiline?: boolean}[] = [
  {key: 'name', label: 'Nombre completo'},
  {key: 'nick', label: 'Apodo'},
  {key: 'phone', label: 'Teléfono', type: 'tel'},
  {key: 'bd', label: 'Fecha de nacimiento', type: 'date'},
  {key: 'from', label: 'Lugar de procedencia'},
  {key: 'ap', label: 'Apuntes / información adicional', multiline: true},
  {key: 'br', label: 'Barrio o sector'},
  {key: 'mn', label: 'Ministerio o grupo'},
  {key: 'con', label: 'Contacto adicional'},
  {key: 'dis', label: 'Disponibilidad'},
  {key: 'nt', label: 'Notas administrativas', multiline: true},
  {key: 'pic', label: 'URL de fotografía', type: 'url'},
];

function initials(name?: string) {
  return String(name ?? '?').trim().split(/\s+/).slice(0, 2)
    .map((part) => part[0] ?? '').join('').toLocaleUpperCase('es') || '?';
}

function toDraft(member: MemberAdminRecord): AdminMemberPatch {
  const draft: AdminMemberPatch = {};
  editableFields.forEach(({key}) => {
    const value = member[key];
    if (typeof value === 'string') (draft as unknown as Record<string, string>)[key] = value;
  });
  return draft;
}

export function MembersPage() {
  const [members, setMembers] = useState<MemberAdminRecord[]>([]);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberAdminRecord | null>(null);
  const [draft, setDraft] = useState<AdminMemberPatch>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadMembers() {
    setLoading(true);
    setError('');
    try {
      const records = await getMembersForAdministration();
      setMembers(records);
    } catch (cause) {
      setError(cause instanceof Error
        ? cause.message
        : 'No se pudieron consultar las fichas de los jóvenes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (firebaseConfigured) void loadMembers();
    else setLoading(false);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    if (!query) return members;
    return members.filter((member) =>
      [member.name, member.nick, member.phone, member.from]
        .some((value) => String(value ?? '').toLocaleLowerCase('es').includes(query)),
    );
  }, [members, search]);

  function openMember(member: MemberAdminRecord) {
    setSelectedMember(member);
    setDraft(toDraft(member));
    setMessage('');
    setError('');
  }

  function closeMember() {
    if (saving) return;
    setSelectedMember(null);
    setDraft({});
  }

  function changeField(key: keyof AdminMemberPatch, value: string) {
    setDraft((current) => ({...current, [key]: value}));
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMember) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await updateMemberForAdministration(selectedMember.id, draft);
      const updated = {...selectedMember, ...draft};
      setMembers((current) => current.map((member) =>
        member.id === selectedMember.id ? updated : member,
      ));
      setSelectedMember(updated);
      setDraft(toDraft(updated));
      setMessage('Ficha actualizada correctamente.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la ficha.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="members-page">
      <header className="members-hero">
        <div className="members-hero-copy">
          <span className="members-kicker"><Flame size={15}/> NUESTRA COMUNIDAD</span>
          <h1>Jóvenes</h1>
          <p>Consulta, abre y actualiza las fichas de los integrantes de la comunidad.</p>
        </div>
        <div className="members-total-card">
          <span className="members-total-icon"><Users size={23}/></span>
          <div><strong>{firebaseConfigured ? members.length : '—'}</strong><span>Jóvenes registrados</span></div>
        </div>
      </header>

      {!firebaseConfigured && (
        <div className="members-notice">
          <AlertCircle size={20}/><div><strong>Firebase Staging no está conectado</strong><p>Estás viendo la vista previa. No se muestran datos inventados ni se realizan cambios.</p></div>
        </div>
      )}

      {error && <div className="members-error" role="alert"><AlertCircle size={19}/><span>{error}</span><button onClick={() => void loadMembers()} aria-label="Reintentar"><RefreshCw size={17}/></button></div>}
      {message && <div className="members-notice" role="status"><ShieldCheck size={18}/><strong>{message}</strong></div>}

      {firebaseConfigured && (
        <div className="members-controls">
          <label className="members-search"><Search size={19}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, apodo, teléfono o sector..." aria-label="Buscar jóvenes"/>{search && <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">×</button>}</label>
          <span className="members-results">{filtered.length} resultados</span>
        </div>
      )}

      {loading && <div className="members-state"><div className="spinner"/><strong>Cargando comunidad</strong><span>Consultando fichas con permisos administrativos...</span></div>}

      {!loading && firebaseConfigured && !error && filtered.length === 0 && (
        <div className="members-state"><span className="members-state-icon"><Users size={30}/></span><strong>{members.length ? 'No encontramos coincidencias' : 'Aún no hay jóvenes registrados'}</strong><span>{members.length ? 'Prueba con otro nombre o apodo.' : 'Cuando existan registros autorizados aparecerán aquí.'}</span></div>
      )}

      {!loading && firebaseConfigured && !error && filtered.length > 0 && (
        <div className="members-grid">
          {filtered.map((member) => (
            <article className="member-card" key={member.id}>
              <div className="member-card-top">
                <div className="member-avatar">{member.pic ? <img src={String(member.pic)} alt="" onError={(event) => {event.currentTarget.style.display = 'none';}}/> : initials(member.name)}</div>
                <span className="member-status"><span/>Registrado</span>
              </div>
              <div className="member-card-info">
                <h2>{String(member.name ?? 'Nombre sin registrar')}</h2>
                <p className="member-nick">{member.nick ? `@${String(member.nick)}` : 'Sin apodo registrado'}</p>
              </div>
              <div className="member-card-details">
                <div><Phone size={16}/><span>{String(member.phone ?? 'Sin teléfono registrado')}</span></div>
                <div>{member.bd ? <CalendarDays size={16}/> : <UserRound size={16}/>}<span>{member.bd ? `Nacimiento: ${String(member.bd)}` : 'Perfil de joven'}</span></div>
              </div>
              <button type="button" className="member-detail-button" onClick={() => openMember(member)}><Edit3 size={16}/> Abrir ficha completa <span>Editar</span></button>
            </article>
          ))}
        </div>
      )}

      <footer className="members-footer"><span/>Datos consultados mediante una función protegida · Acceso administrativo</footer>

      {selectedMember && (
        <div className="member-detail-backdrop" role="presentation" onMouseDown={(event) => {if (event.target === event.currentTarget) closeMember();}}>
          <section className="member-detail-modal" role="dialog" aria-modal="true" aria-labelledby="member-detail-title">
            <header className="member-detail-header">
              <div className="member-detail-avatar">{initials(String(draft.name ?? selectedMember.name))}</div>
              <div><span>FICHA DE LA COMUNIDAD</span><h2 id="member-detail-title">{String(selectedMember.name ?? 'Joven')}</h2><small>ID: {selectedMember.id}</small></div>
              <button type="button" onClick={closeMember} aria-label="Cerrar ficha"><X size={20}/></button>
            </header>
            <form onSubmit={(event) => void saveMember(event)}>
              <div className="member-detail-fields">
                {editableFields.map((field) => (
                  <label key={field.key} className={field.multiline ? 'wide' : ''}>
                    {field.label}
                    {field.multiline ? (
                      <textarea rows={3} maxLength={field.key === 'nt' ? 1000 : 120} value={String(draft[field.key] ?? '')} onChange={(event) => changeField(field.key, event.target.value)}/>
                    ) : (
                      <input type={field.type ?? 'text'} maxLength={field.key === 'pic' ? 1500 : 120} value={String(draft[field.key] ?? '')} onChange={(event) => changeField(field.key, event.target.value)}/>
                    )}
                  </label>
                ))}
              </div>
              <div className="member-detail-privacy"><ShieldCheck size={16}/> Solo los roles administrativos autorizados pueden guardar estos cambios. Los campos históricos no incluidos se conservan.</div>
              {error && <p className="member-detail-error" role="alert">{error}</p>}
              {message && <p className="member-detail-success" role="status">{message}</p>}
              <footer><button type="button" className="member-detail-cancel" onClick={closeMember} disabled={saving}>Cerrar</button><button type="submit" className="member-detail-save" disabled={saving}><Save size={17}/>{saving ? 'Guardando...' : 'Guardar cambios'}</button></footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
