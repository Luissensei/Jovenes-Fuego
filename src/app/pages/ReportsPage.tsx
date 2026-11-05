import styles from '../styles/ReportsPage.module.css';

import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  CalendarDays,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  TrendingUp,
  ClipboardList,
} from 'lucide-react';

import {
  listAttendanceMeetings,
  type AttendanceMeeting,
} from '../../services/attendance';

import {getMembersForAdministration} from '../../services/youthPortal';
import type {MemberAdminRecord} from '../../services/youthPortal';

export default function ReportsPage() {
  const [members, setMembers] = useState<MemberAdminRecord[]>([]);
  const [meetings, setMeetings] = useState<AttendanceMeeting[]>([]);
  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {

    try {
      void Promise.all([
        getMembersForAdministration(),
        listAttendanceMeetings(),
      ])
        .then(([memberRows, meetingRows]) => {
          setMembers(memberRows);
          setMeetings(meetingRows);
        })
        .catch((cause: unknown) => {
          setError(cause instanceof Error ? cause.message : 'No se pudieron consultar los informes.');
        })
        .finally(() => setLoading(false));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudieron consultar los informes.',
      );
      setLoading(false);
    }

    return () => {
    };
  }, []);

  const report = useMemo(() => {
    const filteredMeetings = meetings.filter(
      (meeting) => meeting.date.startsWith(month),
    );

    let present = 0;
    let absent = 0;
    let justified = 0;

    const memberStats = new Map<
      string,
      { name: string; present: number; absent: number; justified: number }
    >();

    filteredMeetings.forEach((meeting) => {
      meeting.participants.forEach((participant) => {
        const current = memberStats.get(participant.memberId) ?? {
          name: participant.name,
          present: 0,
          absent: 0,
          justified: 0,
        };

        if (participant.status === 'Presente' || participant.status === 'Tarde') {
          present++;
          current.present++;
        } else if (participant.status === 'Ausente' || participant.status === 'Falta') {
          absent++;
          current.absent++;
        } else if (participant.status === 'Justificada') {
          justified++;
          current.justified++;
        }

        memberStats.set(participant.memberId, current);
      });
    });

    const total = present + absent + justified;

    const ranking = Array.from(memberStats.entries())
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.present - a.present)
      .slice(0, 10);

    return {
      meetings: filteredMeetings,
      present,
      absent,
      justified,
      total,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
      ranking,
    };
  }, [meetings, month]);

  function downloadCsv() {
    const rows = [
      [
        'Joven',
        'Presentes',
        'Ausentes',
        'Justificados',
        'Total',
      ],
      ...report.ranking.map((item) => [
        item.name,
        String(item.present),
        String(item.absent),
        String(item.justified),
        String(item.present + item.absent + item.justified),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${value.replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    const blob = new Blob(
      ['\uFEFF' + csv],
      { type: 'text/csv;charset=utf-8;' },
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `informe-asistencia-${month}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main className={`${styles.scope} reports-page`}>
        <p>Cargando informes...</p>
      </main>
    );
  }

  return (
    <main className={`${styles.scope} reports-page`}>
      <header className="reports-hero">
        <div>
          <span className="reports-eyebrow">
            <TrendingUp size={16} /> ANÁLISIS DE LA COMUNIDAD
          </span>
          <h1>Informes y estadísticas</h1>
          <p>
            Consulta los resultados de asistencia y participación juvenil.
          </p>
        </div>
        <FileSpreadsheet size={55} />
      </header>

      {error && (
        <div className="reports-error" role="alert">
          {error}
        </div>
      )}

      <section className="reports-filter">
        <label htmlFor="report-month">Periodo del informe</label>
        <input
          id="report-month"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />

        <button
          type="button"
          className="reports-export"
          onClick={downloadCsv}
          disabled={report.ranking.length === 0}
        >
          <FileSpreadsheet size={17} />
          Exportar CSV
        </button>
      </section>

      <section className="reports-stats">
        <article>
          <div className="reports-icon purple"><Users /></div>
          <span>Jóvenes registrados</span>
          <strong>{members.length}</strong>
        </article>

        <article>
          <div className="reports-icon orange"><CalendarDays /></div>
          <span>Reuniones del periodo</span>
          <strong>{report.meetings.length}</strong>
        </article>

        <article>
          <div className="reports-icon green"><CheckCircle2 /></div>
          <span>Presentes</span>
          <strong>{report.present}</strong>
        </article>

        <article>
          <div className="reports-icon red"><XCircle /></div>
          <span>Ausentes</span>
          <strong>{report.absent}</strong>
        </article>
      </section>

      <section className="reports-card">
        <div className="reports-section-heading">
          <div>
            <span>RESUMEN GENERAL</span>
            <h2>Indicadores de asistencia</h2>
          </div>
          <ClipboardList size={25} />
        </div>

        <div className="reports-rate">
          <div>
            <span>Porcentaje de asistencia</span>
            <strong>{report.rate}%</strong>
          </div>

          <div className="reports-progress">
            <div style={{ width: `${report.rate}%` }} />
          </div>

          <div className="reports-breakdown">
            <span>Presentes: {report.present}</span>
            <span>Ausentes: {report.absent}</span>
            <span>Justificados: {report.justified}</span>
            <span>Total: {report.total}</span>
          </div>
        </div>
      </section>

      <section className="reports-card">
        <div className="reports-section-heading">
          <div>
            <span>PARTICIPACIÓN JUVENIL</span>
            <h2>Asistencia por joven</h2>
          </div>
          <Users size={25} />
        </div>

        {report.ranking.length === 0 ? (
          <div className="reports-empty">
            No existen registros de asistencia para este periodo.
          </div>
        ) : (
          <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Joven</th>
                  <th>Presente</th>
                  <th>Ausente</th>
                  <th>Justificado</th>
                </tr>
              </thead>

              <tbody>
                {report.ranking.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.present}</td>
                    <td>{item.absent}</td>
                    <td>{item.justified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="reports-card">
        <div className="reports-section-heading">
          <div>
            <span>ACTIVIDAD</span>
            <h2>Reuniones registradas</h2>
          </div>
        </div>

        {report.meetings.length === 0 ? (
          <div className="reports-empty">
            No hay reuniones registradas en el periodo seleccionado.
          </div>
        ) : (
          <div className="reports-meeting-list">
            {report.meetings.map((meeting) => (
              <article key={meeting.id}>
                <div>
                  <strong>{meeting.name}</strong>
                  <span>{meeting.date}</span>
                </div>
                <span>
                  {meeting.participants.length} participantes
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
