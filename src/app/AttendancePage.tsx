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

// La fecha operativa de la iglesia se calcula siempre en Colombia,
// aunque el dispositivo tenga configurada otra zona horaria.
function localDateInput() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default function AttendancePage() {
  const [meetings, setMeetings] = useState<AttendanceMeeting[]>([]);
  const [members, setMembers] = useState<MemberAdminRecord[]>([]);

  const [meetingName, setMeetingName] = useState('');
  const [meetingDate, setMeetingDate] = useState(localDateInput);

  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [attendanceDrafts, setAttendanceDrafts] = useState<
    Record<string, Record<string, AttendanceStatus | null>>
  >({});
  const [memberSearch, setMemberSearch] = useState('');
  const [meetingSearch, setMeetingSearch] = useState('');
  const [meetingFilter, setMeetingFilter] = useState<'all' | 'pending' | 'complete'>('all');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const mountedRef = useRef(false);
  const loadSequenceRef = useRef(0);

  const loadData = useCallback(async (
    preferredMeetingId?: string,
    reloadMembers = true,
    forceRefresh = false,
  ) => {
    const sequence = ++loadSequenceRef.current;
    if (mountedRef.current) {
      setLoading(true);
      setError('');
    }
    try {
      const [meetingResult, memberResult] = await Promise.allSettled([
        listAttendanceMeetings('attendance', forceRefresh),
        reloadMembers ? getMembersForAdministration('attendance') : Promise.resolve(null),
      ]);
      if (!mountedRef.current || sequence !== loadSequenceRef.current) return;
      if (meetingResult.status === 'rejected') throw meetingResult.reason;

      let meetingRows = meetingResult.value;

      // El servicio semanal del miércoles debe estar disponible al abrir
      // asistencia, incluso si todavía no se ha creado manualmente.
      const today = localDateInput();
      const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Bogota',
        weekday: 'short',
      }).format(new Date());
      if (weekday === 'Wed' && !meetingRows.some((meeting) =>
        meeting.date === today &&
        meeting.name.trim().toLocaleLowerCase('es') ===
          'servicio de miércoles',
      )) {
        try {
          await createAttendanceMeeting({
            name: 'Servicio de miércoles',
            date: today,
          });
          meetingRows = await listAttendanceMeetings('attendance', true);
        } catch (meetingError) {
          console.error('No se pudo preparar el servicio de hoy:', meetingError);
          setError(
            meetingError instanceof Error
              ? `No se pudo preparar el servicio de hoy: ${meetingError.message}`
              : 'No se pudo preparar el servicio de hoy.',
          );
        }
      }
      setMeetings(meetingRows);
      if (memberResult.status === 'fulfilled') {
        if (memberResult.value) setMembers(memberResult.value);
      } else {
        setError(
          memberResult.reason instanceof Error
            ? `Las reuniones se cargaron, pero no se pudo consultar el directorio: ${memberResult.reason.message}`
            : 'Las reuniones se cargaron, pero no se pudo consultar el directorio de jóvenes.',
        );
      }

      setSelectedMeetingId((current) => {
        const target = preferredMeetingId || current;
        return target && meetingRows.some((meeting) => meeting.id === target)
          ? target
          : meetingRows[0]?.id ?? '';
      });
    } catch (cause) {
      if (mountedRef.current && sequence === loadSequenceRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo cargar la lista de reuniones.');
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

  const savedAttendance = useMemo<Record<string, AttendanceStatus>>(() => {
    const saved: Record<string, AttendanceStatus> = {};
    selectedMeeting?.participants.forEach((participant) => {
      saved[participant.memberId] = participant.status;
    });
    return saved;
  }, [selectedMeeting]);

  const attendanceDraft = selectedMeetingId ? attendanceDrafts[selectedMeetingId] : undefined;
  const attendance = useMemo<Record<string, AttendanceStatus>>(() => {
    const current = {...savedAttendance};
    Object.entries(attendanceDraft ?? {}).forEach(([memberId, status]) => {
      if (status) current[memberId] = status;
      else delete current[memberId];
    });
    return current;
  }, [savedAttendance, attendanceDraft]);

  const hasUnsavedChanges = useMemo(() => {
    const ids = new Set([...Object.keys(savedAttendance), ...Object.keys(attendance)]);
    return [...ids].some((memberId) => savedAttendance[memberId] !== attendance[memberId]);
  }, [savedAttendance, attendance]);

  const scheduledMeetings = useMemo<AttendanceMeeting[]>(() => {
    const today = localDateInput();
    const historyStart = new Date(`${today}T12:00:00Z`);
    historyStart.setUTCDate(historyStart.getUTCDate() - 365);
    const oneYearAgo = historyStart.toISOString().slice(0, 10);
    const earliestStoredDate = meetings.length
      ? meetings.reduce((earliest, meeting) =>
        meeting.date && meeting.date < earliest ? meeting.date : earliest, today)
      : oneYearAgo;
    const firstDate = earliestStoredDate < oneYearAgo ? earliestStoredDate : oneYearAgo;
    const lastDate = today;
    const normalizeMeetingName = (value: string) => value.trim()
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const schedule: Array<{weekday: number; name: string}> = [
      {weekday: 2, name: 'Discipulado'},
      {weekday: 3, name: 'Servicio de miércoles'},
      {weekday: 5, name: 'Servicio de viernes'},
      {weekday: 6, name: 'Servicio de jóvenes'},
      {weekday: 0, name: 'Escuela dominical'},
    ];
    const alreadyHasScheduledType = (date: string, weekday: number) => meetings.some((meeting) => {
      if (meeting.date !== date) return false;
      const name = normalizeMeetingName(meeting.name);
      if (weekday === 2) return name.includes('discipul');
      if (weekday === 3) return name.includes('miercoles');
      if (weekday === 5) return name.includes('viernes');
      if (weekday === 6) return (
        (name.includes('servicio') && name.includes('jovenes')) ||
        (name.includes('ayuno') && name.includes('juvenil'))
      );
      if (weekday === 0) return name.includes('escuela') && name.includes('dominical');
      return false;
    });
    const generated: AttendanceMeeting[] = [];
    const cursor = new Date(`${firstDate}T12:00:00Z`);
    const end = new Date(`${lastDate}T12:00:00Z`);
    for (; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const date = cursor.toISOString().slice(0, 10);
      const day = cursor.getUTCDay();
      const event = schedule.find((item) => item.weekday === day);
      if (event && !alreadyHasScheduledType(date, event.weekday)) {
        generated.push({
          id: `scheduled_${date}_${event.weekday}`,
          name: event.name,
          date,
          createdAt: '',
          participants: [],
        });
      }
    }

    // El ayuno juvenil se programa cada 15 días tomando como referencia
    // la fecha de un ayuno que ya exista en el historial real.
    const fastingDates = meetings
      .filter((meeting) => {
        const normalized = normalizeMeetingName(meeting.name);
        return normalized.includes('ayuno') &&
          (normalized.includes('juvenil') || normalized.includes('jovenes'));
      })
      .map((meeting) => meeting.date)
      .filter(Boolean)
      .sort();
    if (fastingDates.length > 0) {
      const anchor = new Date(`${fastingDates[0]}T12:00:00Z`);
      const current = new Date(anchor);
      while (current <= end) {
        const date = current.toISOString().slice(0, 10);
        const name = 'Ayuno juvenil';
        const hasFastingEvent = meetings.some((meeting) => {
          if (meeting.date !== date) return false;
          const normalized = normalizeMeetingName(meeting.name);
          return normalized.includes('ayuno') &&
            (normalized.includes('juvenil') || normalized.includes('jovenes'));
        });
        if (date >= firstDate && !hasFastingEvent) {
          const saturdayService = generated.find((meeting) =>
            meeting.date === date && meeting.name === 'Servicio de jóvenes',
          );
          if (saturdayService) {
            saturdayService.name = 'Ayuno y servicio de jóvenes';
          } else {
            generated.push({id: `scheduled_${date}_fast`, name, date, createdAt: '', participants: []});
          }
        }
        current.setUTCDate(current.getUTCDate() + 15);
      }
    }
    return generated;
  }, [meetings]);

  const allMeetings = useMemo(
    () => [...meetings, ...scheduledMeetings],
    [meetings, scheduledMeetings],
  );

  const sortedMeetings = useMemo(
    () => [...allMeetings].sort((left, right) =>
      right.date.localeCompare(left.date) || left.name.localeCompare(right.name, 'es'),
    ),
    [allMeetings],
  );

  const filteredMeetings = useMemo(() => {
    const term = meetingSearch.trim().toLocaleLowerCase('es');
    return sortedMeetings.filter((meeting) => {
      const isScheduled = meeting.id.startsWith('scheduled_');
      const registered = new Set(meeting.participants.map((participant) => participant.memberId)).size;
      const incomplete = isScheduled || registered < members.length;
      const matchesFilter = meetingFilter === 'all' ||
        (meetingFilter === 'pending' ? incomplete : !incomplete);
      const matchesSearch = !term ||
        `${meeting.name} ${meeting.date} ${formatMeetingDate(meeting.date)}`
          .toLocaleLowerCase('es').includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [sortedMeetings, meetingSearch, meetingFilter, members.length]);

  function clearAttendanceDraft(meetingId: string) {
    if (!meetingId) return;
    setAttendanceDrafts((previous) => {
      if (!previous[meetingId]) return previous;
      const next = {...previous};
      delete next[meetingId];
      return next;
    });
  }

  function formatMeetingDate(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return value;
    // Construir desde componentes UTC evita que la fecha del servicio
    // cambie al mostrarla en dispositivos con zonas horarias distintas.
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: 'UTC',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  function updateMeetingDraft(memberId: string, status: AttendanceStatus | null) {
    if (!selectedMeetingId) return;
    setAttendanceDrafts((previous) => ({
      ...previous,
      [selectedMeetingId]: {
        ...(previous[selectedMeetingId] ?? attendance),
        [memberId]: status,
      },
    }));
    setError('');
    setMessage('');
  }

  async function handleMeetingSelection(nextMeetingId: string) {
    if (nextMeetingId === selectedMeetingId) return;
    if (hasUnsavedChanges && !window.confirm(
      'Hay marcas sin guardar en esta reunión. ¿Quieres descartarlas y abrir la reunión seleccionada?',
    )) return;
    clearAttendanceDraft(selectedMeetingId);
    setMemberSearch('');
    setMessage('');
    setError('');
    const scheduled = scheduledMeetings.find((meeting) => meeting.id === nextMeetingId);
    if (scheduled) {
      setSaving(true);
      try {
        const result = await createAttendanceMeeting({name: scheduled.name, date: scheduled.date});
        await loadData(result.meetingId, false, true);
        setSelectedMeetingId(result.meetingId);
        setMessage('Servicio programado creado. Ya puedes registrar la asistencia.');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'No se pudo preparar el servicio seleccionado.');
      } finally {
        setSaving(false);
      }
      return;
    }
    setSelectedMeetingId(nextMeetingId);
  }

  async function handleCreateMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasUnsavedChanges && !window.confirm(
      'Hay marcas de asistencia sin guardar. ¿Quieres descartarlas y crear otra reunión?',
    )) return;
    clearAttendanceDraft(selectedMeetingId);
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
      await loadData(result.meetingId, false, true);
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
    updateMeetingDraft(memberId, status);
  }

  function handleClearStatus(memberId: string) {
    updateMeetingDraft(memberId, null);
  }

  async function handleSaveAttendance() {
    if (!selectedMeeting) {
      setError('Selecciona una reunión primero.');
      return;
    }

    const unregistered = members.filter((member) =>
      !attendance[member.id] && !savedAttendance[member.id],
    );
    if (unregistered.length > 0) {
      setError(`Hay ${unregistered.length} jóvenes sin estado. Marca cada uno antes de guardar.`);
      return;
    }
    const clearedMemberIds = members
      .filter((member) => savedAttendance[member.id] && !attendance[member.id])
      .map((member) => member.id);

    setError('');
    setMessage('');
    setSaving(true);
    try {
      const participants: AttendanceParticipant[] = members
        .filter((member) => Boolean(attendance[member.id]))
        .map((member) => ({
          memberId: member.id,
          name: String(member.name ?? 'Sin nombre'),
          status: attendance[member.id] as AttendanceStatus,
        }));
      await saveMeetingAttendance(selectedMeeting.id, participants, clearedMemberIds);
      if (!mountedRef.current) return;

      // Mantener la selección visible tras guardar y basarla en lo recién enviado.
      const submittedDraft = Object.fromEntries(
        participants.map((participant) => [participant.memberId, participant.status]),
      ) as Record<string, AttendanceStatus | null>;
      clearedMemberIds.forEach((memberId) => { submittedDraft[memberId] = null; });
      setAttendanceDrafts((previous) => ({
        ...previous,
        [selectedMeeting.id]: submittedDraft,
      }));
      await loadData(selectedMeeting.id, false, true);
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
    if (!selectedMeetingId || visibleMembers.length === 0) return;
    if (status === 'Ausente' && !window.confirm(
      `¿Confirmas marcar como ausentes a los ${visibleMembers.length} jóvenes visibles en la lista?`,
    )) return;
    setAttendanceDrafts((previous) => ({
      ...previous,
      [selectedMeetingId]: {
        ...(previous[selectedMeetingId] ?? attendance),
        ...Object.fromEntries(visibleMembers.map((member) => [member.id, status])),
      },
    }));
    setError('');
    setMessage('');
  }

  const attendanceCounts = useMemo(() => members.reduce((counts, member) => {
    const status = attendance[member.id];
    if (!status) counts.unregistered += 1;
    else if (status === 'Presente') counts.present += 1;
    else if (status === 'Tarde') counts.late += 1;
    else if (status === 'Justificada') counts.justified += 1;
    else if (status === 'Falta' || status === 'Ausente') counts.absent += 1;
    return counts;
  }, {present: 0, late: 0, absent: 0, justified: 0, unregistered: 0}), [members, attendance]);

  return (
    <main className={`${styles.scope} attendance-page`}>
      <header className="attendance-header">
        <div>
          <h1>Control de asistencia</h1>
          <p>Registra y administra la asistencia de los jóvenes.</p>
        </div>
        <button type="button" className="attendance-refresh" onClick={() => {
          if (hasUnsavedChanges && !window.confirm(
            'Hay marcas sin guardar. ¿Quieres descartarlas y volver a consultar los datos del servidor?',
          )) return;
          clearAttendanceDraft(selectedMeetingId);
          void loadData(selectedMeetingId, true, true);
        }} disabled={loading || saving}>
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

      <section className="attendance-card attendance-meeting-picker">
        <div className="attendance-picker-heading">
          <div>
            <h2>Elegir reunión para asistencia</h2>
            <p>Busca cualquier servicio anterior y abre también los que todavía están pendientes.</p>
          </div>
          <span className="attendance-meeting-total">{allMeetings.length} fechas</span>
        </div>
        {loading ? (
          <p>Consultando reuniones y jóvenes...</p>
        ) : allMeetings.length === 0 ? (
          <p>Todavía no hay reuniones registradas. Crea una para comenzar.</p>
        ) : (
          <>
            <label className="attendance-meeting-search">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={meetingSearch}
                onChange={(event) => setMeetingSearch(event.target.value)}
                placeholder="Buscar por servicio o fecha (ej. 18 nov 2025)..."
                aria-label="Buscar reuniones por nombre o fecha"
              />
              {meetingSearch && (
                <button type="button" onClick={() => setMeetingSearch('')} aria-label="Limpiar búsqueda">×</button>
              )}
            </label>
            <div className="attendance-meeting-filters" role="group" aria-label="Filtrar reuniones">
              <button type="button" data-active={meetingFilter === 'all'} onClick={() => setMeetingFilter('all')}>
                Todas <span>{allMeetings.length}</span>
              </button>
              <button type="button" data-active={meetingFilter === 'pending'} onClick={() => setMeetingFilter('pending')}>
                Pendientes <span>{allMeetings.filter((meeting) => meeting.id.startsWith('scheduled_') ||
                  new Set(meeting.participants.map((participant) => participant.memberId)).size < members.length,
                ).length}</span>
              </button>
              <button type="button" data-active={meetingFilter === 'complete'} onClick={() => setMeetingFilter('complete')}>
                Completas <span>{meetings.filter((meeting) =>
                  new Set(meeting.participants.map((participant) => participant.memberId)).size >= members.length,
                ).length}</span>
              </button>
            </div>
            <div className="attendance-meeting-list" aria-label="Reuniones disponibles">
              {filteredMeetings.map((meeting) => {
                const isScheduled = meeting.id.startsWith('scheduled_');
                const registered = new Set(meeting.participants.map((participant) => participant.memberId)).size;
                const pending = Math.max(0, members.length - registered);
                const isSelected = selectedMeetingId === meeting.id;
                return (
                  <button
                    type="button"
                    key={meeting.id}
                    className="attendance-meeting-option"
                    data-selected={isSelected}
                    onClick={() => void handleMeetingSelection(meeting.id)}
                    disabled={saving || loading}
                    aria-pressed={isSelected}
                  >
                    <span className="attendance-meeting-option-date">{formatMeetingDate(meeting.date)}</span>
                    <strong>{meeting.name}</strong>
                    <span className={pending > 0 ? 'attendance-meeting-state is-pending' : 'attendance-meeting-state is-complete'}>
                      {isScheduled ? 'Servicio por crear' : pending > 0 ? (registered === 0 ? 'Sin asistencia' : `${pending} pendientes`) : 'Asistencia completa'}
                    </span>
                    <span className="attendance-meeting-option-arrow" aria-hidden="true">›</span>
                  </button>
                );
              })}
              {filteredMeetings.length === 0 && (
                <p className="attendance-no-results">No hay reuniones que coincidan con esa búsqueda o filtro.</p>
              )}
            </div>
          </>
        )}
      </section>

      {selectedMeeting && (
        <section className="attendance-summary" aria-label="Resumen de asistencia">
          <div className="attendance-card attendance-count-card" data-tone="present"><h3>Presentes</h3><strong>{attendanceCounts.present}</strong></div>
          <div className="attendance-card attendance-count-card" data-tone="late"><h3>Llegadas tarde</h3><strong>{attendanceCounts.late}</strong></div>
          <div className="attendance-card attendance-count-card" data-tone="absent"><h3>Faltas y ausencias</h3><strong>{attendanceCounts.absent}</strong></div>
          <div className="attendance-card attendance-count-card" data-tone="justified"><h3>Justificados</h3><strong>{attendanceCounts.justified}</strong></div>
          <div className="attendance-card attendance-count-card" data-tone="pending"><h3>Sin registrar</h3><strong>{attendanceCounts.unregistered}</strong></div>
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
                <button type="button" onClick={() => setAllAttendance('Presente')} disabled={saving || visibleMembers.length === 0}>
                  <CheckCheck size={15}/> Visibles presentes
                </button>
                <button type="button" onClick={() => setAllAttendance('Ausente')} disabled={saving || visibleMembers.length === 0}>
                  <XCircle size={15}/> Visibles ausentes
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
                  const currentStatus = attendance[member.id];
                  return (
                    <article key={member.id} className="attendance-member">
                      <div className="attendance-member-info">
                        <strong>{member.name || 'Joven sin nombre'}</strong>
                        {member.nick && <span>@{member.nick}</span>}
                      </div>
                      <div className="attendance-member-status">
                        {!currentStatus && <span className="attendance-unmarked">Pendiente · sin registrar</span>}
                        <div className="attendance-status-options" role="group" aria-label={`Estado de asistencia de ${member.name || 'joven'}`}>
                          {attendanceOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className={`attendance-status-button tone-${option.tone}`}
                              data-selected={currentStatus === option.value}
                              aria-pressed={currentStatus === option.value}
                              title={`Marcar ${member.name || 'joven'} como ${option.label}`}
                              onClick={() => handleStatusChange(member.id, option.value)}
                              disabled={saving}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="attendance-clear-button"
                          aria-pressed={!currentStatus}
                          onClick={() => handleClearStatus(member.id)}
                          disabled={saving || !currentStatus}
                        >
                          Quitar marca
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            {hasUnsavedChanges && <p className="attendance-unsaved-note" role="status">Tienes cambios sin guardar. Los estados pendientes no se convertirán automáticamente en ausencias.</p>}
            <button type="button" className="attendance-save-button" onClick={() => void handleSaveAttendance()} disabled={saving || loading || members.length === 0}>
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
