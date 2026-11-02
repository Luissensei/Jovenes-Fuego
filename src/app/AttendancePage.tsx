
import { useEffect, useMemo, useState } from 'react';

import {
  createAttendanceMeeting,
  saveMeetingAttendance,
  subscribeAttendanceMeetings,
  type AttendanceMeeting,
  type AttendanceParticipant,
  type AttendanceStatus,
} from '../services/attendance';

import {
  subscribeMembers,
  type MemberRecord,
} from '../services/repositories/members';

export default function AttendancePage() {
  const [meetings, setMeetings] = useState<AttendanceMeeting[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);

  const [meetingName, setMeetingName] = useState('');
  const [meetingDate, setMeetingDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Escuchar reuniones guardadas
  useEffect(() => {
    const unsubscribe = subscribeAttendanceMeetings(
      (data) => {
        setMeetings(data);
      },
      (error) => {
        setError(error.message);
      },
    );

    return () => unsubscribe();
  }, []);

  // Escuchar jóvenes registrados
  useEffect(() => {
    const unsubscribe = subscribeMembers(
      (data) => {
        setMembers(data);
      },
      (error) => {
        setError(error.message);
      },
    );

    return () => unsubscribe?.();
  }, []);

  // Seleccionar automáticamente la primera reunión
  useEffect(() => {
    if (
      meetings.length > 0 &&
      !meetings.some((meeting) => meeting.id === selectedMeetingId)
    ) {
      setSelectedMeetingId(meetings[0].id);
    }
  }, [meetings, selectedMeetingId]);

  const selectedMeeting = useMemo(
    () => meetings.find((meeting) => meeting.id === selectedMeetingId),
    [meetings, selectedMeetingId],
  );

  // Cargar asistencia guardada cuando cambia la reunión
  useEffect(() => {
    if (!selectedMeeting) {
      setAttendance({});
      return;
    }

    const savedAttendance: Record<string, AttendanceStatus> = {};

    selectedMeeting.participants.forEach((participant) => {
      savedAttendance[participant.memberId] = participant.status;
    });

    setAttendance(savedAttendance);
  }, [selectedMeeting]);

  // Crear reunión
  async function handleCreateMeeting(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = await createAttendanceMeeting({
        name: meetingName,
        date: meetingDate,
      });

      setMeetingName('');
      setSelectedMeetingId(result.meetingId);
      setMessage('Reunión creada correctamente.');
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo crear la reunión.',
      );
    } finally {
      setLoading(false);
    }
  }

  // Cambiar estado de asistencia
  function handleStatusChange(
    memberId: string,
    status: AttendanceStatus,
  ) {
    setAttendance((previous) => ({
      ...previous,
      [memberId]: status,
    }));
  }

  // Guardar asistencia
  async function handleSaveAttendance() {
    if (!selectedMeeting) {
      setError('Selecciona una reunión primero.');
      return;
    }

    setError('');
    setMessage('');
    setSaving(true);

    try {
      const participants: AttendanceParticipant[] = members.map(
        (member) => ({
          memberId: member.id,
          name: String(member.name ?? 'Sin nombre'),
          status: attendance[member.id] ?? 'Ausente',
        }),
      );

      await saveMeetingAttendance(
        selectedMeeting.id,
        participants,
      );

      setMessage('Asistencia guardada correctamente.');
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la asistencia.',
      );
    } finally {
      setSaving(false);
    }
  }

  const presentCount = members.filter(
    (member) => attendance[member.id] === 'Presente',
  ).length;

  const absentCount = members.filter(
    (member) => attendance[member.id] === 'Ausente',
  ).length;

  const justifiedCount = members.filter(
    (member) => attendance[member.id] === 'Justificado',
  ).length;

  return (
    <main className="attendance-page">
      <header className="attendance-header">
        <div>
          <h1>Control de asistencia</h1>
          <p>
            Registra y administra la asistencia de los jóvenes.
          </p>
        </div>
      </header>

      {/* Crear reunión */}
      <section className="attendance-card">
        <h2>Crear reunión</h2>

        <form onSubmit={handleCreateMeeting}>
          <div>
            <label htmlFor="meetingName">
              Nombre de la reunión
            </label>

            <input
              id="meetingName"
              type="text"
              value={meetingName}
              onChange={(event) =>
                setMeetingName(event.target.value)
              }
              placeholder="Ej. Culto de jóvenes"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label htmlFor="meetingDate">
              Fecha
            </label>

            <input
              id="meetingDate"
              type="date"
              value={meetingDate}
              onChange={(event) =>
                setMeetingDate(event.target.value)
              }
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Creando...' : 'Crear reunión'}
          </button>
        </form>
      </section>

      {/* Seleccionar reunión */}
      <section className="attendance-card">
        <h2>Seleccionar reunión</h2>

        {meetings.length === 0 ? (
          <p>No hay reuniones registradas todavía.</p>
        ) : (
          <select
            value={selectedMeetingId}
            onChange={(event) =>
              setSelectedMeetingId(event.target.value)
            }
          >
            {meetings.map((meeting) => (
              <option key={meeting.id} value={meeting.id}>
                {meeting.name} - {meeting.date}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* Resumen */}
      {selectedMeeting && (
        <section className="attendance-summary">
          <div className="attendance-card">
            <h3>Presentes</h3>
            <strong>{presentCount}</strong>
          </div>

          <div className="attendance-card">
            <h3>Ausentes</h3>
            <strong>{absentCount}</strong>
          </div>

          <div className="attendance-card">
            <h3>Justificados</h3>
            <strong>{justifiedCount}</strong>
          </div>
        </section>
      )}

      {/* Lista de jóvenes */}
      <section className="attendance-card">
        <h2>Jóvenes registrados</h2>

        {!selectedMeeting ? (
          <p>Selecciona o crea una reunión.</p>
        ) : members.length === 0 ? (
          <p>No hay jóvenes registrados en la colección members.</p>
        ) : (
          <>
            <p>
              Reunión: <strong>{selectedMeeting.name}</strong>
            </p>

            <div className="attendance-list">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="attendance-member"
                >
                  <div>
                    <strong>
                      {member.name || 'Joven sin nombre'}
                    </strong>
                  </div>

                  <select
                    value={attendance[member.id] ?? 'Ausente'}
                    onChange={(event) =>
                      handleStatusChange(
                        member.id,
                        event.target.value as AttendanceStatus,
                      )
                    }
                  >
                    <option value="Presente">Presente</option>
                    <option value="Ausente">Ausente</option>
                    <option value="Justificado">Justificado</option>
                  </select>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={saving || members.length === 0}
            >
              {saving
                ? 'Guardando asistencia...'
                : 'Guardar asistencia'}
            </button>
          </>
        )}
      </section>

      {/* Mensajes */}
      {error && (
        <div role="alert" className="attendance-error">
          {error}
        </div>
      )}

      {message && (
        <div role="status" className="attendance-success">
          {message}
        </div>
      )}
    </main>
  );
}
