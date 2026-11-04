import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, Download, LoaderCircle, RotateCw, Sparkles, Trash2, UserRound, Upload } from 'lucide-react';

const CREATOR_SDK_URL = 'https://esm.sh/@three-ws/avatar@0.2.3/creator?bundle';
const VIEWER_SDK_URL = 'https://esm.sh/@three-ws/avatar@0.2.3/viewer?bundle';
const STUDIO_URL = 'https://three.ws/avatar-studio/';
const DATABASE_NAME = 'jdf-youth-avatar-library';
const STORE_NAME = 'avatars';
const MAX_AVATAR_BYTES = 12 * 1024 * 1024;

type CreatorOptions = {
  studioUrl: string;
  onExport: (blob: Blob) => void;
  onClose: () => void;
};
type CreatorInstance = { open: () => Promise<void>; close?: () => void };
type CreatorModule = { AvatarCreator: new (options: CreatorOptions) => CreatorInstance };
type StoredAvatar = { blob: Blob; savedAt: number };

function openAvatarDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Este navegador no admite almacenamiento local de avatares.'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir la biblioteca de avatares.'));
  });
}

async function readStoredAvatar(profileId: string): Promise<Blob | null> {
  const database = await openAvatarDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(profileId);
      request.onsuccess = () => {
        const value = request.result as StoredAvatar | undefined;
        resolve(value?.blob instanceof Blob ? value.blob : null);
      };
      request.onerror = () => reject(request.error ?? new Error('No se pudo leer el avatar guardado.'));
    });
  } finally {
    database.close();
  }
}

async function storeAvatar(profileId: string, blob: Blob): Promise<void> {
  const database = await openAvatarDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put({blob, savedAt: Date.now()} satisfies StoredAvatar, profileId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('No se pudo guardar el avatar.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('El navegador canceló el guardado.'));
    });
  } finally {
    database.close();
  }
}

async function removeStoredAvatar(profileId: string): Promise<void> {
  const database = await openAvatarDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(profileId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('No se pudo eliminar el avatar.'));
    });
  } finally {
    database.close();
  }
}

async function registerViewer(): Promise<void> {
  await import(/* @vite-ignore */ VIEWER_SDK_URL);
}

export default function ThreeDAvatarStudio({
  profileId,
  profileName,
  fallback,
}: {
  profileId: string;
  profileName: string;
  fallback: ReactNode;
}) {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [viewerReady, setViewerReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [hasAvatar, setHasAvatar] = useState(false);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const objectUrlRef = useRef('');
  const exportedRef = useRef(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  function replacePreview(blob: Blob) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const nextUrl = URL.createObjectURL(blob);
    objectUrlRef.current = nextUrl;
    setAvatarUrl(nextUrl);
  }

  useEffect(() => {
    let active = true;
    setHasAvatar(false);
    setViewerReady(false);
    setAvatarUrl('');
    void (async () => {
      try {
        const blob = await readStoredAvatar(profileId);
        if (!active || !blob) return;
        await registerViewer();
        if (!active) return;
        replacePreview(blob);
        setViewerReady(true);
        setHasAvatar(true);
      } catch {
        if (active) setNotice('No se pudo abrir el avatar guardado en este navegador.');
      }
    })();
    return () => {
      active = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = '';
      }
    };
  }, [profileId]);

  useEffect(() => {
    if (!avatarUrl || !viewerReady || !mountRef.current) return;
    const viewer = document.createElement('three-ws-viewer');
    viewer.setAttribute('src', avatarUrl);
    viewer.setAttribute('background', 'transparent');
    viewer.setAttribute('alt', 'Avatar 3D de ' + profileName);
    viewer.setAttribute('style', 'display:block;width:100%;height:100%;min-height:260px;');
    mountRef.current.replaceChildren(viewer);
    return () => viewer.remove();
  }, [avatarUrl, viewerReady, profileName]);

  async function saveExport(blob: Blob) {
    try {
      if (blob.size < 12 || blob.size > MAX_AVATAR_BYTES) {
        throw new Error('El modelo debe pesar entre unos bytes y 12 MB.');
      }
      const magic = new Uint8Array(await blob.slice(0,4).arrayBuffer());
      if (magic[0] !== 0x67 || magic[1] !== 0x6c || magic[2] !== 0x54 || magic[3] !== 0x46) {
        throw new Error('El archivo no parece ser un modelo GLB válido.');
      }
      await storeAvatar(profileId, blob);
      await registerViewer();
      replacePreview(blob);
      setViewerReady(true);
      setHasAvatar(true);
      setNotice('¡Tu avatar 3D quedó guardado en este dispositivo!');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'No se pudo guardar el avatar 3D.');
    } finally {
      setBusy(false);
    }
  }

  async function openCreator() {
    setBusy(true);
    setNotice('Conectando con el estudio 3D…');
    exportedRef.current = false;
    try {
      const sdk = await import(/* @vite-ignore */ CREATOR_SDK_URL) as CreatorModule;
      const creator = new sdk.AvatarCreator({
        studioUrl: STUDIO_URL,
        onExport: (blob) => {
          exportedRef.current = true;
          void saveExport(blob);
        },
        onClose: () => {
          setBusy(false);
          if (!exportedRef.current) setNotice('No se realizaron cambios en el avatar.');
        },
      });
      await creator.open();
      setBusy(false);
    } catch (cause) {
      setBusy(false);
      setNotice(cause instanceof Error
        ? 'No se pudo abrir el creador 3D: ' + cause.message
        : 'No se pudo abrir el creador 3D. Comprueba tu conexión e inténtalo de nuevo.');
    }
  }


  async function importGlb(file: File) {
    if (!file.name.toLowerCase().endsWith('.glb')) {
      setNotice('Selecciona un archivo .glb para importar tu personaje 3D.');
      return;
    }
    setBusy(true);
    setNotice('Validando y guardando tu modelo 3D…');
    await saveExport(file);
  }

  async function downloadGlb() {
    try {
      const blob = await readStoredAvatar(profileId);
      if (!blob) throw new Error('No se encontró un modelo guardado.');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `avatar-jovenes-de-fuego-${profileId.replace(/[^a-z0-9_-]/gi, '').slice(0,36)}.glb`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'No se pudo descargar el avatar.');
    }
  }
  async function deleteAvatar() {
    try {
      await removeStoredAvatar(profileId);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
      setAvatarUrl('');
      setViewerReady(false);
      setHasAvatar(false);
      setNotice('Avatar 3D eliminado de este dispositivo.');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'No se pudo eliminar el avatar.');
    }
  }

  return (
    <section className="youth-3d-avatar-card" aria-label="Creador de avatar 3D">
      <div className="youth-3d-avatar-preview">
        {avatarUrl && viewerReady ? (
          <div className="youth-3d-avatar-viewer" ref={mountRef}/>
        ) : (
          <div className="youth-3d-avatar-fallback">{fallback}</div>
        )}
        <span className="youth-3d-avatar-stamp"><Sparkles size={13}/> AVATAR 3D</span>
      </div>
      <div className="youth-3d-avatar-actions">
        <div>
          <strong>{hasAvatar ? 'Tu personaje está listo' : 'Diseña tu personaje'}</strong>
          <span>{hasAvatar ? 'Arrastra el modelo para girarlo y verlo desde todos los ángulos.' : 'Crea un personaje 3D, elige su apariencia y tráelo a tu perfil.'}</span>
        </div>
        <button type="button" onClick={() => void openCreator()} disabled={busy}>
          {busy ? <LoaderCircle size={16} className="is-loading"/> : hasAvatar ? <RotateCw size={16}/> : <UserRound size={16}/>}
          {busy ? 'Abriendo estudio…' : hasAvatar ? 'Editar avatar' : 'Crear avatar 3D'}
        </button>
        <button type="button" className="youth-3d-avatar-secondary" onClick={() => uploadInputRef.current?.click()} disabled={busy}>
          <Upload size={15}/> Importar GLB
        </button>
        <input ref={uploadInputRef} className="youth-3d-avatar-file" type="file" accept=".glb,model/gltf-binary" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) void importGlb(file); }} />
        {hasAvatar && <button type="button" className="youth-3d-avatar-secondary" onClick={() => void downloadGlb()} disabled={busy}><Download size={15}/> Descargar GLB</button>}
        {hasAvatar && (
          <button type="button" className="youth-3d-avatar-remove" onClick={() => void deleteAvatar()} disabled={busy} aria-label="Eliminar avatar 3D">
            <Trash2 size={16}/>
          </button>
        )}
      </div>
      {notice && <p className="youth-3d-avatar-notice" role="status">{notice}</p>}
      <small className="youth-3d-avatar-privacy"><CheckCircle2 size={13}/> Tu modelo se guarda en este navegador. No se envía a Firebase ni se publica automáticamente.</small>
      <a className="youth-3d-avatar-help" href="https://three.ws/avatar-studio/" target="_blank" rel="noreferrer">Abrir el estudio 3D en otra pestaña</a>
    </section>
  );
}
