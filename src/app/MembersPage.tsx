import styles from './styles/MembersPage.module.css';
import { motion } from 'motion/react';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {FormEvent} from 'react';
import {createPortal} from 'react-dom';
import {
  AlertCircle, Search, Users, RefreshCw, CalendarDays, Phone,
  UserRound, Flame, X, Save, Edit3, ShieldCheck, MapPin, Minimize2, Maximize2, Camera,
} from 'lucide-react';
import {firebaseConfigured, firebaseReadOnlyMode} from '../services/firebase/client';
import {
  getMembersForAdministration,
  getMemberHistory,
  updateMemberForAdministration,
  type MemberAdminRecord,
  type MemberHistoryItem,
  type AdminMemberPatch,
} from '../services/youthPortal';

type EditableField = {
  key: keyof AdminMemberPatch;
  label: string;
  type?: 'tel' | 'date' | 'url';
  multiline?: boolean;
  boolean?: boolean;
};

const editableFields: EditableField[] = [
  {key: 'name', label: 'Nombre completo'},
  {key: 'nick', label: 'Apodo'},
  {key: 'phone', label: 'Teléfono', type: 'tel'},
  {key: 'bd', label: 'Fecha de nacimiento'},
  {key: 'from', label: 'Lugar de procedencia'},
  {key: 'ac', label: 'Nombre del acudiente'},
  {key: 'ap', label: 'Teléfono del acudiente', type: 'tel'},
  {key: 'br', label: 'Barrio o sector'},
  {key: 'bau', label: 'Fecha de bautismo', type: 'date'},
  {key: 'con', label: 'Fecha de consagración', type: 'date'},
  {key: 'dis', label: 'Fecha de discipulado completado', type: 'date'},
  {key: 'mn', label: 'Ministerio o grupo'},
  {key: 'nt', label: 'Notas administrativas', multiline: true},
  {key: 'nopub', label: 'Ocultar perfil en el portal público', boolean: true},
];

function initials(name?: string) {
  return String(name ?? '?').trim().split(/\s+/).slice(0, 2)
    .map((part) => part[0] ?? '').join('').toLocaleUpperCase('es') || '?';
}

function toDraft(member: MemberAdminRecord): AdminMemberPatch {
  const draft: AdminMemberPatch = {};
  if (typeof member.pic === 'string') draft.pic = member.pic;
  editableFields.forEach(({key}) => {
    const value = member[key];
    if (typeof value === 'string' || typeof value === 'boolean') {
      (draft as unknown as Record<string, unknown>)[key] = value;
    }
  });
  return draft;
}

function memberImage(value: unknown): string {
  return typeof value === 'string' && (/^https:\/\//i.test(value) || /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value))
    ? value : '';
}

function compressMemberPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Este navegador no pudo procesar la fotografía.'));
        return;
      }
      try {
        for (const size of [220, 180, 144, 120]) {
          const scale = Math.min(1, size / Math.max(image.width, image.height));
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          for (const quality of [0.66, 0.56, 0.46, 0.36]) {
            const encoded = canvas.toDataURL('image/jpeg', quality);
            if (encoded.length < 58000) {
              resolve(encoded);
              return;
            }
          }
        }
        reject(new Error('La imagen es demasiado pesada incluso después de comprimirla.'));
      } catch {
        reject(new Error('No se pudo comprimir la fotografía. Usa una imagen JPG, PNG o WebP.'));
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo abrir el archivo de imagen.'));
    };
    image.src = objectUrl;
  });
}

function MemberAvatar({member}: {member: MemberAdminRecord}) {
  const [failed, setFailed] = useState(false);
  const image = memberImage(member.pic);

  return (
    <div className="member-avatar">
      {image && !failed
        ? <img src={image} alt="" loading="lazy" onError={() => setFailed(true)} />
        : initials(member.name)}
    </div>
  );
}

export function MembersPage({canEdit = false}: {canEdit?: boolean}) {
  const [members, setMembers] = useState<MemberAdminRecord[]>([]);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberAdminRecord | null>(null);
  const [detailMinimized, setDetailMinimized] = useState(false);
  const [detailClosing, setDetailClosing] = useState(false);
  const [draft, setDraft] = useState<AdminMemberPatch>({});
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [memberHistory, setMemberHistory] = useState<MemberHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const mountedRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedMember?.id) {
      setMemberHistory([]);
      setHistoryError('');
      return;
    }
    let active = true;
    setHistoryLoading(true);
    setHistoryError('');
    getMemberHistory(selectedMember.id)
      .then((items) => { if (active) setMemberHistory(items); })
      .catch((cause) => {
        if (active) setHistoryError(cause instanceof Error ? cause.message : 'No se pudo cargar el historial.');
      })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [selectedMember?.id]);

  const detailIsOpen = Boolean(selectedMember && !detailMinimized);

  useEffect(() => {
    if (!detailIsOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [detailIsOpen]);

  async function loadMembers() {
    if (mountedRef.current) {
      setLoading(true);
      setError('');
    }
    try {
      const records = await getMembersForAdministration();
      if (mountedRef.current) setMembers(records);
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error
          ? cause.message
          : 'No se pudieron consultar las fichas de los jóvenes.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
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
    setDetailMinimized(false);
    setDetailClosing(false);
    setDraft(toDraft(member));
    setMessage('');
    setError('');
  }

  function closeMember() {
    if (saving || detailClosing) return;
    setDetailClosing(true);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) {
        setSelectedMember(null);
        setDetailMinimized(false);
        setDetailClosing(false);
        setDraft({});
      }
      closeTimerRef.current = null;
    }, 220);
  }

  function changeField(key: keyof AdminMemberPatch, value: string) {
    setDraft((current) => ({...current, [key]: value}));
  }

  function changeBoolean(key: keyof AdminMemberPatch, value: boolean) {
    setDraft((current) => ({...current, [key]: value}));
  }

  async function choosePhoto(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Selecciona una fotografía JPG, PNG o WebP.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('La fotografía original debe pesar menos de 12 MB.');
      return;
    }
    setPhotoBusy(true);
    setError('');
    try {
      const imageData = await compressMemberPhoto(file);
      if (!mountedRef.current) return;
      setDraft((current) => ({...current, pic: imageData}));
      setMessage('Fotografía preparada. Guarda los cambios para publicarla en el perfil.');
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo procesar la fotografía.');
      }
    } finally {
      if (mountedRef.current) setPhotoBusy(false);
    }
  }

  function removePhoto() {
    setDraft((current) => ({...current, pic: ''}));
    setMessage('La fotografía se quitará al guardar la ficha.');
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMember) return;
    if (!canEdit) {
      setError('Tu rol puede consultar la ficha, pero no editar datos personales.');
      return;
    }
    if (firebaseReadOnlyMode) {
      setError('El proyecto Firebase original está en modo de solo lectura. No se pueden guardar cambios desde esta sesión.');
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await updateMemberForAdministration(selectedMember.id, draft);
      if (!mountedRef.current) return;
      const updated = {...selectedMember, ...draft};
      setMembers((current) => current.map((member) =>
        member.id === selectedMember.id ? updated : member,
      ));
      setSelectedMember(updated);
      setDraft(toDraft(updated));
      setMessage('Ficha actualizada correctamente.');
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo guardar la ficha.');
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  return (
    <section className={`${styles.scope} members-page`}>
      <header className="members-hero">
        <div className="members-hero-copy">
          <span className="members-kicker"><Flame size={15}/> NUESTRA COMUNIDAD</span>
          <h1 className="jf-title-reveal">Jóvenes</h1>
          <p>Consulta, abre y actualiza las fichas de los integrantes de la comunidad.</p>
        </div>
        <div className="members-total-card">
          <span className="members-total-icon"><Users size={23}/></span>
          <div><strong>{firebaseConfigured ? members.length : '—'}</strong><span>Jóvenes registrados</span></div>
        </div>
      </header>

      {!firebaseConfigured && (
        <div className="members-notice">
          <AlertCircle size={20}/><div><strong>Firebase original no está configurado</strong><p>Estás viendo la vista previa. No se muestran datos inventados ni se realizan operaciones de escritura.</p></div>
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
          {filtered.map((member, index) => (
            <motion.article
              className={`member-card ${selectedMember?.id === member.id && !detailMinimized ? "is-opening" : ""}`}
              key={member.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.24, delay: Math.min(index, 10) * 0.035, ease: 'easeOut' }}
            >
              <div className="member-card-top">
                <MemberAvatar member={member} />
                <span className={`member-status ${member.nopub === true ? 'private' : 'public'}`}><span/>{member.nopub === true ? 'No publicado' : 'Perfil público'}</span>
              </div>
              <div className="member-card-info">
                <h2><span className="jf-name-reveal">{String(member.name ?? 'Nombre sin registrar')}</span></h2>
                <p className="member-nick">{member.nick ? `@${String(member.nick)}` : 'Sin apodo registrado'}</p>
              </div>
              <div className="member-card-details">
                <div><Phone size={16}/><span>{String(member.phone ?? 'Sin teléfono registrado')}</span></div>
                <div>{member.bd ? <CalendarDays size={16}/> : <UserRound size={16}/>}<span>{member.bd ? `Nacimiento: ${String(member.bd)}` : 'Perfil de joven'}</span></div>
                {member.from && <div><MapPin size={16}/><span>{String(member.from)}</span></div>}
                {member.mn && <div><ShieldCheck size={16}/><span>{String(member.mn)}</span></div>}
              </div>
              <button type="button" className="member-detail-button" onClick={() => openMember(member)}><Edit3 size={16}/> {canEdit ? 'Abrir ficha completa' : 'Ver ficha completa'} <span>{canEdit ? 'Editar' : 'Solo lectura'}</span></button>
            </motion.article>
          ))}
        </div>
      )}

      <footer className="members-footer"><span/>Datos consultados desde Firestore · Acceso sujeto a las reglas administrativas</footer>

      {selectedMember && detailMinimized && (
        <button type="button" className="member-detail-minimized" onClick={() => setDetailMinimized(false)}>
          <Maximize2 size={16}/><span>{String(selectedMember.name ?? 'Ficha del joven')}</span><small>Restaurar ficha</small>
        </button>
      )}

      {selectedMember && !detailMinimized && createPortal((
        <div className={`${styles.portalScope} member-detail-backdrop ${detailClosing ? 'closing' : ''}`} role="presentation" onMouseDown={(event) => {if (event.target === event.currentTarget) closeMember();}}>
          <section className={`member-detail-modal ${detailClosing ? 'closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="member-detail-title">
            <header className="member-detail-header">
              <div className="member-detail-avatar">{memberImage(draft.pic) ? <img src={memberImage(draft.pic)} alt={String(draft.name ?? selectedMember.name)}/> : initials(String(draft.name ?? selectedMember.name))}</div>
              <div><span>FICHA DE LA COMUNIDAD</span><h2 id="member-detail-title">{String(draft.name ?? selectedMember.name ?? 'Joven')}</h2><small>ID: {selectedMember.id}{typeof selectedMember.created === 'string' || typeof selectedMember.created === 'number' ? ` · Registro: ${String(selectedMember.created)}` : ''}</small></div>
              {canEdit && <div className="member-detail-photo-actions"><label><Camera size={15}/>{photoBusy ? 'Procesando...' : 'Cambiar foto'}<input type="file" accept="image/*" disabled={photoBusy || saving} onChange={(event) => {const file = event.target.files?.[0]; if (file) void choosePhoto(file); event.currentTarget.value = '';}}/></label>{draft.pic && <button type="button" onClick={removePhoto} disabled={saving || photoBusy}>Quitar</button>}</div>}
              <div className="member-detail-window-actions">
                <button type="button" onClick={() => setDetailMinimized(true)} aria-label="Minimizar ficha"><Minimize2 size={18}/></button>
                <button type="button" onClick={closeMember} aria-label="Cerrar ficha"><X size={20}/></button>
              </div>
            </header>
            <form onSubmit={(event) => void saveMember(event)}>
              <div className="member-detail-fields">
                {(canEdit
                  ? editableFields
                  : editableFields.filter((field) => ['name', 'nick', 'pic'].includes(field.key))
                ).map((field) => (
                  <label key={field.key} className={field.multiline ? 'wide' : ''}>
                    {field.label}
                    {field.boolean ? (
                      <span className="member-detail-checkbox">
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={draft[field.key] === true}
                          onChange={(event) => changeBoolean(field.key, event.target.checked)}
                        />
                        <span>Este perfil no aparecerá en la selección pública ni en los rankings públicos.</span>
                      </span>
                    ) : field.multiline ? (
                      <textarea disabled={!canEdit} rows={3} maxLength={field.key === 'nt' ? 1000 : 120} value={String(draft[field.key] ?? '')} onChange={(event) => changeField(field.key, event.target.value)}/>
                    ) : (
                      <input disabled={!canEdit} type={field.type ?? 'text'} maxLength={field.key === 'pic' ? 1500 : 120} value={String(draft[field.key] ?? '')} onChange={(event) => changeField(field.key, event.target.value)}/>
                    )}
                  </label>
                ))}
              </div>
              <div className="member-detail-privacy"><ShieldCheck size={16}/>{canEdit ? 'Solo administración y pastoral pueden guardar cambios. Los campos históricos no enviados se conservan.' : 'Vista de solo lectura. Solicita a administración o pastoral cualquier corrección.'}</div>
              {error && <p className="member-detail-error" role="alert">{error}</p>}
              {message && <p className="member-detail-success" role="status">{message}</p>}
              <footer><button type="button" className="member-detail-cancel" onClick={closeMember} disabled={saving}>Cerrar</button>{canEdit && <button type="submit" className="member-detail-save" disabled={saving || firebaseReadOnlyMode}><Save size={17}/>{saving ? 'Guardando...' : firebaseReadOnlyMode ? 'Solo lectura · Staging' : 'Guardar cambios'}</button>}</footer>
            </form>
            <section className={styles.historyPanel} aria-labelledby="member-history-title">
              <header><div><span>ACTIVIDAD REGISTRADA</span><h3 id="member-history-title">Historial del joven</h3></div><small>{memberHistory.length} registros</small></header>
              {historyLoading ? <p className={styles.historyState}>Consultando asistencia y seguimientos...</p> :
                historyError ? <p className={styles.historyError} role="alert">{historyError}</p> :
                memberHistory.length === 0 ? <p className={styles.historyState}>Todavía no hay asistencias o seguimientos disponibles para este perfil, o tu rol no tiene permiso para consultarlos.</p> :
                <ol className={styles.historyList}>
                  {memberHistory.map((item) => (
                    <li key={item.id}>
                      <span className={styles.historyDot} aria-hidden="true"/>
                      <div><div className={styles.historyMeta}><b>{item.kind}</b><time>{item.date || 'Fecha no disponible'}</time></div><strong>{item.title}</strong><p>{item.detail}</p><small>{item.status}</small></div>
                    </li>
                  ))}
                </ol>
              }
            </section>
          </section>
        </div>
      ), document.body)}
    </section>
  );
}
