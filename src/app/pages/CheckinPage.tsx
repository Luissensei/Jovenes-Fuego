
import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Camera,
  CameraOff,
  Users,
  CheckCircle2,
  Search,
} from 'lucide-react';

import {
  subscribeMembers,
  type MemberRecord,
} from '../../services/repositories/members';

import {
  createCheckin,
  subscribeCheckins,
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

  const selectedMember = members.find(
    (member) => member.id === selectedMemberId,
  );

  useEffect(() => {
    let unsubscribeMembers: (() => void) | null = null;
    let unsubscribeCheckins: (() => void) | null = null;

    try {
      unsubscribeMembers = subscribeMembers(
        (items) => setMembers(items),
        (cause) => {
          setError(cause.message);
          setLoading(false);
        },
      );

      unsubscribeCheckins = subscribeCheckins(
        (items) => {
          setCheckins(items);
          setLoading(false);
        },
        (cause) => {
          setError(cause.message);
          setLoading(false);
        },
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Error cargando datos.',
      );
      setLoading(false);
    }

    return () => {
      unsubscribeMembers?.();
      unsubscribeCheckins?.();
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
      await createCheckin({
        memberId,
        memberName,
        meetingName,
        date,
      });

      setMessage(`Asistencia registrada para ${memberName}.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo registrar la asistencia.',
      );
    } finally {
      setSaving(false);
      setScanning(false);
    }
  }, [saving, members, checkins, date, meetingName]);

  useEffect(() => {
    scannerCallback.current = (value) => {
      void processQr(value);
    };
  }, [processQr]);

  useEffect(() => {
    if (!scanning) return;

    const scanner = new Html5QrcodeScanner(
      'checkin-qr-reader',
      {
        fps: 10,
        qrbox: { width: 230, height: 230 },
        rememberLastUsedCamera: true,
      },
      false,
    );

    scanner.render(
      (decodedText) => {
        scannerCallback.current(decodedText);
      },
      () => {},
    );

    return () => {
      void scanner.clear().catch((cause) => {
        console.warn('No se pudo cerrar el escáner QR:', cause);
      });
    };
  }, [scanning]);

  const filteredMembers = members.filter((member) =>
    String(member.name ?? '')
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const todayCheckins = checkins.filter(
    (item) =>
      item.date === date &&
      item.meetingName === meetingName.trim(),
  );

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
      await createCheckin({
        memberId: selectedMember.id,
        memberName,
        meetingName,
        date,
      });

      setMessage(`Asistencia registrada para ${memberName}.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo registrar la asistencia.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="checkin-page">
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
                disabled={saving || !meetingName.trim()}
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
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar joven..."
            />
          </div>

          <select
            value={selectedMemberId}
            onChange={(event) => setSelectedMemberId(event.target.value)}
          >
            <option value="">Seleccionar joven</option>
            {filteredMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name || 'Joven sin nombre'}
              </option>
            ))}
          </select>

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
            disabled={!selectedMember || saving}
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
