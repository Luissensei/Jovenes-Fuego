import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Search, Users, RefreshCw } from 'lucide-react';
import { subscribeMembers, type MemberRecord } from '../services/repositories/members';
import { firebaseConfigured } from '../services/firebase/client';

export function MembersPage() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!firebaseConfigured) return;
    const unsubscribe = subscribeMembers(
      (items) => { setMembers(items); setLoading(false); setError(''); },
      (cause) => { setLoading(false); setError(cause.message || 'No se pudieron cargar los jóvenes.'); },
    );
    return () => unsubscribe?.();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    if (!query) return members;
    return members.filter((member) => `${member.name ?? ''} ${member.nick ?? ''} ${member.phone ?? ''}`.toLocaleLowerCase('es').includes(query));
  }, [members, search]);

  return (
    <section className="members-page">
      <div className="members-heading">
        <div><div className="eyebrow">COMUNIDAD</div><h1>Jóvenes</h1><p className="lead">Consulta las fichas guardadas en Firebase. Esta primera entrega es de solo lectura.</p></div>
        <div className="member-count"><Users size={20} /><span><strong>{firebaseConfigured ? members.length : '—'}</strong><small>jóvenes</small></span></div>
      </div>

      {!firebaseConfigured && <div className="notice"><AlertCircle size={19} /><div><strong>Firebase staging no está conectado</strong><p>Estás en vista previa. No se muestran datos inventados ni se realizan cambios.</p></div></div>}
      {error && <div className="members-error"><AlertCircle size={18} /><span>{error}</span><button onClick={() => window.location.reload()} aria-label="Reintentar"><RefreshCw size={16} /></button></div>}

      {firebaseConfigured && <div className="members-toolbar"><label className="member-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, apodo o teléfono…" aria-label="Buscar jóvenes" /></label><span className="results-count">{filtered.length} resultado{filtered.length === 1 ? '' : 's'}</span></div>}

      {loading && <div className="members-empty"><div className="spinner" />Cargando jóvenes desde staging…</div>}
      {!loading && firebaseConfigured && !error && filtered.length === 0 && <div className="members-empty"><Users size={26} /><strong>{members.length ? 'No hay coincidencias' : 'Todavía no hay jóvenes en staging'}</strong><span>{members.length ? 'Prueba con otro nombre o teléfono.' : 'Añade datos ficticios de prueba desde la consola de staging para validar el módulo.'}</span></div>}
      {!loading && firebaseConfigured && !error && filtered.length > 0 && <div className="members-list">{filtered.map((member) => {
        const initials = String(member.name ?? '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toLocaleUpperCase('es');
        return <article className="member-row" key={member.id}><div className="member-avatar">{initials || '?'}</div><div className="member-main"><strong>{member.name || 'Nombre sin registrar'}</strong><span>{member.nick ? `“${member.nick}” · ` : ''}{member.phone || 'Sin teléfono registrado'}</span></div><div className="member-meta">{member.bd ? <><small>Fecha de nacimiento</small><span>{member.bd}</span></> : <span className="muted-tag">Ficha activa</span>}</div></article>;
      })}</div>}
      <p className="read-only-note"><span /> Lectura en tiempo real · Sin botones de edición ni eliminación</p>
    </section>
  );
}
