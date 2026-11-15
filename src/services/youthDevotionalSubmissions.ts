import {httpsCallable} from 'firebase/functions';
import {functions} from './firebase/client';

export type YouthDevotionalSubmission = {
  id: string;
  memberId: string;
  memberName: string;
  message: string;
  imageDataUrl: string;
  status: string;
  createdAt: string;
};

export async function submitYouthDevotional(input: {
  memberId: string;
  message: string;
  imageDataUrl?: string;
}): Promise<void> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const memberId = input.memberId.trim();
  const message = input.message.trim();
  if (!memberId || message.length < 20 || message.length > 5000) {
    throw new Error('Escribe tu reflexión (mínimo 20 caracteres) antes de enviarla.');
  }
  if (input.imageDataUrl && (
    input.imageDataUrl.length > 420000 ||
    !/^data:image\/jpeg;base64,/.test(input.imageDataUrl)
  )) throw new Error('La imagen supera el tamaño permitido. Selecciona otra foto.');

  const send = httpsCallable<
    {memberId: string; message: string; imageDataUrl?: string},
    {success: boolean; id: string}
  >(functions, 'submitYouthDevotional');
  const response = await send({
    memberId, message,
    ...(input.imageDataUrl ? {imageDataUrl: input.imageDataUrl} : {}),
  });
  if (!response.data.success || !response.data.id) {
    throw new Error('No se pudo confirmar la entrega. Inténtalo de nuevo.');
  }
}

export async function listYouthDevotionalSubmissions(): Promise<YouthDevotionalSubmission[]> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const load = httpsCallable<Record<string, never>, {submissions: YouthDevotionalSubmission[]}>(
    functions, 'adminListYouthDevotionalSubmissions',
  );
  const response = await load({});
  return Array.isArray(response.data.submissions) ? response.data.submissions : [];
}
