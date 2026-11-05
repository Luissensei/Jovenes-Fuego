import styles from './styles/AttendancePage.module.css';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {FormEvent} from 'react';
import {RefreshCw, Search, CheckCheck, XCircle} from 'lucide-react';

import {
  createAttendanceMeeting,
  listAttendanceMeetings,
  saveMeetingAttendance,
  type AttendanceMeeting,
  type AttendanceParticipant,
  type AttendanceStatus,
} from '../services/attendance';

import {getMembersForAdministration} from '../services/youthPortal';
import type {MemberAdminRecord} from '../services/youthPortal';

const attendanceOptions: Array<{value: AttendanceStatus; label: string; tone: string}> = [
  {value: 'Presente', label: 'Presente', tone: 'present'},
  {value: 'Tarde', label: 'Tarde', tone: 'late'},
  {value: 'Falta', label: 'Falta', tone: 'missing'},
  {value: 'Justificada', label: 'Justificada', tone: 'justified'},
  {value: 'Ausente', label: 'Ausente', tone: 'absent'},
];

function localDateInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function AttendancePage() {
  const [meetings, setMeetings] = useState<AttendanceMeeting[]>([]);
  const [members, setMembers] = useState<MemberAdminRecord[]>([]);

  const [meetingName, setMeetingName] = useState('');
  const [meetingDate, setMeetingDate] = useState(localDateInput);

  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [memberSearch, setMemberSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const mountedRef = useRef(false);
  const loadSequenceRef = useRef(0);

  const loadData = useCallback(async (preferredMeetingId?: string) => {
    const sequence = ++loadSequenceRef.current;
    if (mountedRef.current) {
      setLoading(true);
      setError('');
    }
    try {
      const [meetingRows, memberRows] = await Promise.all([
        listAttendanceMeetings(),
        getMembersForAdministration('attendance'),
      ]);
      if (!mountedRef.current || sequence !== loadSequenceRef.current) return;
      setMeetings(meetingRows);
      setMembers(memberRows);
      setSelectedMeetingId((current) => {
        const target = preferredMeetingId || current;
        return target && meetingRows.some((meeting) => meeting.id === target)
          ? target
          : meetingRows[0]?.id ?? '';
      });
    } catch (cause) {
      if (mountedRef.current && sequence === loadSequenceRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo cargar la asistencia.');
      }
    } finally {
      if (mountedRef.current && sequence === loadSequenceRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadData();
    return () => {
      mountedRef.current = false;
      loadSequenceRef.current += 1;
    };
  }, [loadData]);

  const selectedMeeting = useMemo(
    () => meetings.find((meeting) => meeting.id === selectedMeetingId),
    [meetings, selectedMeetingId],
  );

  useEffect(() => {
    if (!selectedMeeting) {
      setAttendance({});
      return;
    }

    const saved: Record<string, AttendanceStatus> = {};
    selectedMeeting.participants.forEach((participant) => {
      saved[participant.memberId] = participant.status;
    });
    setAttendance(saved);
  }, [selectedMeeting]);

  async function handleCreateMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const result = await createAttendanceMeeting({
        name: meetingName,
        date: meetingDate,
      });
      if (!mountedRef.current) return;
      setMeetingName('');
      await loadData(result.meetingId);
      if (mountedRef.current) setMessage('Reunión creada correctamente.');
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo crear la reunión.');
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  function handleStatusChange(memberId: string, status: AttendanceStatus) {
    setAttendance((previous) => ({...previous, [memberId]: status}));
  }

  async function handleSaveAttendance() {
    if (!selectedMeeting) {
      setError('Selecciona una reunión primero.');
      return;
    }

    setError('');
    setMessage('');
    setSaving(true);
    try {
      const participants: AttendanceParticipant[] = members.map((member) => ({
        memberId: member.id,
        name: String(member.name ?? 'Sin nombre'),
        status: attendance[member.id] ?? 'Ausente',
      }));

      await saveMeetingAttendance(selectedMeeting.id, participants);
      if (!mountedRef.current) return;
      await loadData(selectedMeeting.id);
      if (mountedRef.current) setMessage('Asistencia guardada correctamente.');
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo guardar la asistencia.');
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  const visibleMembers = useMemo(() => {
    const term = memberSearch.trim().toLocaleLowerCase('es');
    if (!term) return members;
    return members.filter((member) =>
      `${member.name ?? ''} ${member.nick ?? ''}`.toLocaleLowerCase('es').includes(term),
    );
  }, [members, memberSearch]);

  function setAllAttendance(status: AttendanceStatus) {
    setAttendance((current) => ({
      ...current,
      ...Object.fromEntries(members.map((member) => [member.id, status])),
    }));
  }

  const attendanceCounts = useMemo(() => members.reduce((counts, member) => {
    const status = attendance[member.id] ?? 'Ausente';
    if (status === 'Presente') counts.present += 1;
    else if (status === 'Tarde') counts.late += 1;
    else if (status === 'Justificada') counts.justified += 1;
    else counts.absent += 1;
    return counts;
  }, {present: 0, late: 0, absent: 0, justified: 0}), [members, attendance]);

  return (
    <main className={`${styles.scope} attendance-page`}>
      <header className="attendance-header">
        <div>
          <h1>Control de asistencia</h1>
          <p>Registra y administra la asistencia de los jóvenes.</p>
        </div>
        <button type="button" className="attendance-refresh" onClick={() => void loadData(selectedMeetingId)} disabled={loading || saving}>
          <RefreshCw size={16}/> Actualizar
        </button>
      </header>

      <section className="attendance-card">
        <h2>Crear reunión</h2>
        <form onSubmit={(event) => void handleCreateMeeting(event)}>
          <div>
            <label htmlFor="meetingName">Nombre de la reunión</label>
            <input
              id="meetingName"
              type="text"
              value={meetingName}
              onChange={(event) => setMeetingName(event.target.value)}
              placeholder="Ej. Culto de jóvenes"
              maxLength={100}
              required
            />
          </div>
          <div>
            <label htmlFor="meetingDate">Fecha</label>
            <input
              id="meetingDate"
              type="date"
              value={meetingDate}
              onChange={(event) => setMeetingDate(event.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={saving || loading}>
            {saving ? 'Guardando...' : 'Crear reunión'}
          </button>
        </form>
      </section>

      <section className="attendance-card">
        <h2>Seleccionar reunión</h2>
        {loading ? (
          <p>Consultando reuniones y jóvenes...</p>
        ) : meetings.length === 0 ? (
          <p>No hay reuniones nuevas registradas todavía.</p>
        ) : (
          <select value={selectedMeetingId} onChange={(event) => setSelectedMeetingId(event.target.value)}>
            {meetings.map((meeting) => (
              <option key={meeting.id} value={meeting.id}>
                {meeting.name} - {meeting.date}
              </option>
            ))}
          </select>
        )}
      </section>

      {selectedMeeting && (
        <section className="attendance-summary">
          <div className="attendance-card"><h3>Presentes</h3><strong>{attendanceCounts.present}</strong></div>
          <div className="attendance-card"><h3>Llegadas tarde</h3><strong>{attendanceCounts.late}</strong></div>
          <div className="attendance-card"><h3>Ausentes</h3><strong>{attendanceCounts.absent}</strong></div>
          <div className="attendance-card"><h3>Justificados</h3><strong>{attendanceCounts.justified}</strong></div>
        </section>
      )}

      <section className="attendance-card">
        <h2>Jóvenes registrados</h2>
        {loading ? (
          <p>Cargando datos...</p>
        ) : !selectedMeeting ? (
          <p>Selecciona o crea una reunión.</p>
        ) : members.length === 0 ? (
          <p>No hay jóvenes registrados para esta cuenta.</p>
        ) : (
          <>
            <p>Reunión: <strong>{selectedMeeting.name}</strong> · {selectedMeeting.date}</p>
            <div className="attendance-tools">
              <label className="attendance-member-search">
                <Search size={16} aria-hidden="true"/>
                <input
                  type="search"
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="Buscar por nombre o apodo..."
                  aria-label="Buscar joven en la asistencia"
                />
                {memberSearch && (
                  <button type="button" onClick={() => setMemberSearch('')} aria-label="Limpiar búsqueda">×</button>
                )}
              </label>
              <div className="attendance-bulk-actions" aria-label="Acciones rápidas de asistencia">
                <button type="button" onClick={() => setAllAttendance('Presente')} disabled={saving || members.length === 0}>
                  <CheckCheck size={15}/> Todos presentes
                </button>
                <button type="button" onClick={() => setAllAttendance('Ausente')} disabled={saving || members.length === 0}>
                  <XCircle size={15}/> Todos ausentes
                </button>
              </div>
            </div>
            {visibleMembers.length === 0 ? (
              <p className="attendance-no-results">
                {members.length === 0 ? 'No hay jóvenes registrados para esta cuenta.' : 'No encontramos jóvenes con ese nombre o apodo.'}
              </p>
            ) : (
              <div className="attendance-list">
                {visibleMembers.map((member) => {
                  const currentStatus = attendance[member.id] ?? 'Ausente';
                  return (
                    <article key={member.id} className="attendance-member">
                      <div className="attendance-member-info">
                        <strong>{member.name || 'Joven sin nombre'}</strong>
                        {member.nick && <span>@{member.nick}</span>}
                      </div>
                      <div className="attendance-status-options" role="group" aria-label={`Estado de asistencia de ${member.name || 'joven'}`}>
                        {attendanceOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`attendance-status-button tone-${option.tone}`}
                            aria-pressed={currentStatus === option.value}
                            onClick={() => handleStatusChange(member.id, option.value)}
                            disabled={saving}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <button type="button" onClick={() => void handleSaveAttendance()} disabled={saving || loading || members.length === 0}>
              {saving ? 'Guardando asistencia...' : 'Guardar asistencia'}
            </button>
          </>
        )}
      </section>

      {error && <div role="alert" className="attendance-error">{error}</div>}
      {message && <div role="status" className="attendance-success">{message}</div>}
    </main>
  );
}
