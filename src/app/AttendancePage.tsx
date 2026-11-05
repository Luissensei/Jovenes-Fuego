import styles from './styles/AttendancePage.module.css';
import {useEffect, useMemo, useState} from 'react';
import type {FormEvent} from 'react';
import {RefreshCw} from 'lucide-react';

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadData(preferredMeetingId?: string) {
    setLoading(true);
    setError('');
    try {
      const [meetingRows, memberRows] = await Promise.all([
        listAttendanceMeetings(),
        getMembersForAdministration('attendance'),
      ]);
      setMeetings(meetingRows);
      setMembers(memberRows);
      setSelectedMeetingId((current) => {
        const target = preferredMeetingId || current;
        return target && meetingRows.some((meeting) => meeting.id === target)
          ? target
          : meetingRows[0]?.id ?? '';
      });
    } catch (cause) {
      setError(cause instanceof Error
        ? cause.message
        : 'No se pudo cargar la asistencia.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

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
      setMeetingName('');
      await loadData(result.meetingId);
      setMessage('Reunión creada correctamente.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la reunión.');
    } finally {
      setSaving(false);
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
      await loadData(selectedMeeting.id);
      setMessage('Asistencia guardada correctamente.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la asistencia.');
    } finally {
      setSaving(false);
    }
  }

  const presentCount = members.filter((member) => attendance[member.id] === 'Presente').length;
  const lateCount = members.filter((member) => attendance[member.id] === 'Tarde').length;
  const absentCount = members.filter((member) => ['Ausente', 'Falta'].includes(attendance[member.id] ?? 'Ausente')).length;
  const justifiedCount = members.filter((member) => attendance[member.id] === 'Justificada').length;

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
          <div className="attendance-card"><h3>Presentes</h3><strong>{presentCount}</strong></div>
          <div className="attendance-card"><h3>Llegadas tarde</h3><strong>{lateCount}</strong></div>
          <div className="attendance-card"><h3>Ausentes</h3><strong>{absentCount}</strong></div>
          <div className="attendance-card"><h3>Justificados</h3><strong>{justifiedCount}</strong></div>
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
            <div className="attendance-list">
              {members.map((member) => {
                const currentStatus = attendance[member.id] ?? 'Ausente';
                return (
                  <article key={member.id} className="attendance-member">
                    <div className="attendance-member-info">
                      <strong>{member.name || 'Joven sin nombre'}</strong>
                      <span>Marca el estado de asistencia</span>
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
