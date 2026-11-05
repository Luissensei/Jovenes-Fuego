import styles from '../styles/CheckinPage.module.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Camera,
  CameraOff,
  Users,
  CheckCircle2,
  Search,
} from 'lucide-react';

import {getMembersForAdministration} from '../../services/youthPortal';
import type {MemberRecord} from '../../services/repositories/members';

import {
  createCheckin,
  listCheckins,
  type CheckinRecord,
} from '../../services/repositories/checkins';

function getToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function CheckinPage() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [meetingName, setMeetingName] = useState('Servicio juvenil');
  const [date, setDate] = useState(getToday());
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const scannerCallback = useRef<(value: string) => void>(() => {});
  const mountedRef = useRef(false);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId),
    [members, selectedMemberId],
  );

  useEffect(() => {
    let active = true;
    mountedRef.current = true;
    async function loadCheckinData() {
      setLoading(true);
      setError('');
      try {
        const [memberItems, checkinItems] = await Promise.all([
          getMembersForAdministration('checkins'),
          listCheckins(),
        ]);
        if (!active) return;
        setMembers(memberItems as MemberRecord[]);
        setCheckins(checkinItems);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los datos del check-in.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadCheckinData();
    return () => {
      active = false;
      mountedRef.current = false;
    };
  }, []);

  const processQr = useCallback(async (value: string) => {
    if (saving) return;

    setError('');
    setMessage('');

    const prefix = 'JDF_MEMBER:';

    if (!value.startsWith(prefix)) {
      setError('El código QR no pertenece a un perfil de Jóvenes de Fuego.');
      setScanning(false);
      return;
    }

    const memberId = value.slice(prefix.length).trim();
    const member = members.find((item) => item.id === memberId);

    if (!member) {
      setError('No encontramos este joven en la lista de miembros.');
      setScanning(false);
      return;
    }

    const memberName = String(member.name ?? '').trim();

    if (!memberName) {
      setError('El perfil del joven no tiene un nombre registrado.');
      setScanning(false);
      return;
    }

    const alreadyRegistered = checkins.some(
      (item) =>
        item.memberId === memberId &&
        item.date === date &&
        item.meetingName === meetingName.trim(),
    );

    if (alreadyRegistered) {
      setError(`${memberName} ya tiene un registro para este servicio.`);
      setScanning(false);
      return;
    }

    setSaving(true);

    try {
      await createCheckin({memberId, memberName, meetingName: meetingName.trim(), date});
      if (!mountedRef.current) return;
      setCheckins((items) => [{
        id: `${memberId}-${date}-${meetingName.trim()}`,
        memberId, memberName, meetingName: meetingName.trim(), date,
        createdAt: new Date().toISOString(),
      }, ...items]);
      setMessage(`Asistencia registrada para ${memberName}.`);
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo registrar la asistencia.');
      }
    } finally {
      if (mountedRef.current) {
        setSaving(false);
        setScanning(false);
      }
    }
  }, [saving, members, checkins, date, meetingName]);

  useEffect(() => {
    scannerCallback.current = (value) => {
      void processQr(value);
    };
  }, [processQr]);

  useEffect(() => {
    if (!scanning) return;

    let active = true;
    let scanner: import('html5-qrcode').Html5QrcodeScanner | null = null;

    void import('html5-qrcode')
      .then(({Html5QrcodeScanner}) => {
        if (!active) return;
        scanner = new Html5QrcodeScanner(
          'checkin-qr-reader',
          {
            fps: 10,
            qrbox: {width: 230, height: 230},
            rememberLastUsedCamera: true,
          },
          false,
        );
        scanner.render(
          (decodedText) => scannerCallback.current(decodedText),
          () => {},
        );
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error
          ? cause.message
          : 'No se pudo iniciar el lector QR.');
        setScanning(false);
      });

    return () => {
      active = false;
      if (scanner) {
        void scanner.clear().catch((cause) => {
          console.warn('No se pudo cerrar el escáner QR:', cause);
        });
      }
    };
  }, [scanning]);

  const normalizedSearch = search.trim().toLocaleLowerCase('es');
  const normalizedMeetingName = meetingName.trim();

  const filteredMembers = useMemo(() => members.filter((member) =>
    `${member.name ?? ''} ${member.nick ?? ''} ${member.id}`
      .toLocaleLowerCase('es')
      .includes(normalizedSearch),
  ), [members, normalizedSearch]);

  const todayCheckins = useMemo(() => checkins.filter(
    (item) => item.date === date && item.meetingName === normalizedMeetingName,
  ), [checkins, date, normalizedMeetingName]);

  async function registerSelectedMember() {
    if (!selectedMember) {
      setError('Selecciona un joven.');
      return;
    }

    const memberName = String(selectedMember.name ?? '').trim();

    if (!memberName) {
      setError('El perfil del joven no tiene nombre.');
      return;
    }

    setError('');
    setMessage('');

    if (
      todayCheckins.some(
        (item) => item.memberId === selectedMember.id,
      )
    ) {
      setError('Este joven ya está registrado para este servicio.');
      return;
    }

    setSaving(true);

    try {
      await createCheckin({memberId: selectedMember.id, memberName, meetingName: meetingName.trim(), date});
      if (!mountedRef.current) return;
      setCheckins((items) => [{
        id: `${selectedMember.id}-${date}-${meetingName.trim()}`,
        memberId: selectedMember.id, memberName,
        meetingName: meetingName.trim(), date,
        createdAt: new Date().toISOString(),
      }, ...items]);
      setMessage(`Asistencia registrada para ${memberName}.`);
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo registrar la asistencia.');
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  return (
    <main className={`${styles.scope} checkin-page`}>
      <header className="checkin-hero">
        <div>
          <span className="checkin-eyebrow">
            <QrCode size={15} /> REGISTRO DIGITAL
          </span>
          <h1>Check-in QR</h1>
          <p>
            Registra la asistencia de los jóvenes mediante códigos QR.
          </p>
        </div>
        <div className="checkin-hero-icon">
          <QrCode size={56} />
        </div>
      </header>

      <section className="checkin-config card">
        <h2>Configurar servicio</h2>

        <div className="checkin-fields">
          <label>
            Nombre del servicio
            <input
              value={meetingName}
              onChange={(event) => setMeetingName(event.target.value)}
              maxLength={100}
              required
            />
          </label>

          <label>
            Fecha
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
        </div>
      </section>

      <section className="checkin-summary">
        <article>
          <Users size={21} />
          <span>Jóvenes registrados</span>
          <strong>{members.length}</strong>
        </article>

        <article>
          <CheckCircle2 size={21} />
          <span>Presentes en este servicio</span>
          <strong>{todayCheckins.length}</strong>
        </article>
      </section>

      {error && <div className="checkin-alert error" role="alert">{error}</div>}
      {message && <div className="checkin-alert success" role="status">{message}</div>}

      <div className="checkin-grid">
        <section className="checkin-panel">
          <div className="checkin-panel-heading">
            <Camera size={21} />
            <div>
              <h2>Escanear código QR</h2>
              <p>Utiliza la cámara del dispositivo.</p>
            </div>
          </div>

          {scanning ? (
            <>
              <div id="checkin-qr-reader" />
              <button
                className="checkin-secondary"
                onClick={() => setScanning(false)}
              >
                <CameraOff size={17} /> Cerrar cámara
              </button>
            </>
          ) : (
            <div className="checkin-camera-placeholder">
              <QrCode size={55} />
              <p>Activa la cámara para escanear el código de un joven.</p>
              <button
                className="checkin-primary"
                onClick={() => {
                  setError('');
                  setScanning(true);
                }}
                disabled={loading || saving || members.length === 0 || !meetingName.trim()}
              >
                <Camera size={17} /> Activar escáner
              </button>
            </div>
          )}

          {saving && <p>Registrando asistencia...</p>}
        </section>

        <section className="checkin-panel">
          <div className="checkin-panel-heading">
            <QrCode size={21} />
            <div>
              <h2>Generar QR personal</h2>
              <p>Genera el código identificador de un joven.</p>
            </div>
          </div>

          <div className="checkin-search">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, apodo o ID..."
              aria-label="Buscar joven para generar el código QR"
            />
          </div>

          <select
            value={selectedMemberId}
            onChange={(event) => setSelectedMemberId(event.target.value)}
            disabled={loading || members.length === 0}
            aria-label="Seleccionar joven para generar el código QR"
          >
            <option value="">{loading ? 'Cargando jóvenes...' : members.length === 0 ? 'No hay jóvenes disponibles' : 'Seleccionar joven'}</option>
            {filteredMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name || 'Joven sin nombre'}{member.nick ? ` · @${member.nick}` : ''}
              </option>
            ))}
          </select>
          {!loading && members.length > 0 && filteredMembers.length === 0 && (
            <p className="checkin-no-results">No encontramos jóvenes con ese nombre, apodo o identificador.</p>
          )}

          {selectedMember && (
            <div className="checkin-qr-result">
              <QRCodeSVG
                value={`JDF_MEMBER:${selectedMember.id}`}
                size={185}
                level="M"
                includeMargin
              />
              <strong>{selectedMember.name}</strong>
              <small>Identificador QR de Jóvenes de Fuego</small>
            </div>
          )}

          <button
            className="checkin-primary"
            onClick={() => void registerSelectedMember()}
            disabled={!selectedMember || saving || loading}
          >
            <CheckCircle2 size={17} />
            {saving ? 'Registrando...' : 'Registrar manualmente'}
          </button>
        </section>
      </div>

      <section className="checkin-panel">
        <h2>Últimos registros</h2>

        {loading ? (
          <p>Cargando registros...</p>
        ) : todayCheckins.length === 0 ? (
          <p>No hay registros para este servicio todavía.</p>
        ) : (
          <div className="checkin-list">
            {todayCheckins.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.memberName}</strong>
                  <small>{item.meetingName}</small>
                </div>
                <span>{item.date}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
