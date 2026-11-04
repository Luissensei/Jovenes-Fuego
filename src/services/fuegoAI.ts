import {getAI, getGenerativeModel, GoogleAIBackend} from 'firebase/ai';
import {firebaseAiAvailable, firebaseApp} from './firebase/client';

export type AssistantAudience = 'youth' | 'admin';
export type AssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const YOUTH_INSTRUCTIONS = `Eres Fuego AI, un acompañante educativo y devocional para jóvenes cristianos de la Iglesia Cristiana Cuadrangular Alfa y Omega.
Responde en español claro, cálido, respetuoso y apropiado para adolescentes y jóvenes.
Ayuda a comprender pasajes bíblicos, preparar devocionales, hacer preguntas de reflexión, sugerir una oración y construir hábitos espirituales saludables.
Cuando expliques un versículo, separa: contexto, explicación sencilla, aplicación diaria y preguntas para reflexionar.
No inventes citas ni atribuyas palabras a la Biblia. Si no tienes el texto exacto o la traducción no fue indicada, pide que compartan el pasaje y explica la referencia sin presentar una paráfrasis como cita literal.
No afirmes conocer el estado espiritual, emocional o psicológico del joven. No diagnostiques ni sustituyas a pastores, familiares o profesionales. Si el mensaje expresa peligro inmediato, violencia o autolesión, recomienda buscar ayuda urgente de un adulto de confianza y los servicios locales de emergencia.
La selección del perfil juvenil no verifica identidad. No solicites contraseñas, teléfonos, direcciones ni información íntima. No prometas guardar conversaciones ni revelar mensajes a líderes.`;

const ADMIN_INSTRUCTIONS = `Eres Fuego AI, el asistente de apoyo administrativo de Jóvenes de Fuego, una comunidad de la Iglesia Cristiana Cuadrangular Alfa y Omega.
Responde en español y ayuda a organizar actividades, servicios, cronogramas, comunicaciones, procesos, informes y uso de los módulos.
Presenta recomendaciones concretas y formatos listos para revisar. No afirmes haber consultado Firebase ni cifras de la comunidad: solo conoces los datos que el administrador escriba explícitamente en esta conversación.
No ejecutes ni simules crear, editar, eliminar, publicar, asignar permisos o modificar registros. Cuando se solicite una operación, prepara una propuesta y explica que requiere revisión y confirmación en el módulo correspondiente.
Protege la información personal de los jóvenes. No pidas contraseñas ni datos sensibles. Para notas pastorales o situaciones delicadas, recomienda usar el módulo con permisos restringidos y no incluir detalles personales en el chat.`;

function createModel(audience: AssistantAudience, modelName = 'gemini-3.8-flash') {
  const ai = getAI(firebaseApp, {backend: new GoogleAIBackend()});
  return getGenerativeModel(ai, {
    model: modelName,
    systemInstruction: audience === 'youth' ? YOUTH_INSTRUCTIONS : ADMIN_INSTRUCTIONS,
    generationConfig: {
      maxOutputTokens: 1400,
    },
  });
}

function isTemporaryModelOverload(cause: unknown): boolean {
  const value = cause && typeof cause === 'object'
    ? cause as {message?: unknown; status?: unknown; code?: unknown}
    : {};
  const detail = [
    typeof value.message === 'string' ? value.message : '',
    value.status,
    value.code,
  ].filter(Boolean).join(' ');
  return /high demand|overload|temporarily unavailable|\b500\b|internal server error/i.test(detail);
}

export async function askFuegoAI(
  audience: AssistantAudience,
  question: string,
  history: AssistantMessage[] = [],
  context = '',
): Promise<string> {
  if (!firebaseAiAvailable) {
    throw new Error(
      'Fuego AI aún no está disponible. Comprueba que App Check Enterprise esté inicializado y que Firebase AI Logic esté habilitado en el proyecto original jovenes-de-fuego.',
    );
  }

  const cleanQuestion = question.trim().slice(0, 3000);
  if (cleanQuestion.length < 2) {
    throw new Error('Escribe una pregunta un poco más completa.');
  }

  const recentHistory = history.slice(-8).map((message) =>
    `${message.role === 'user' ? 'JOVEN/ADMINISTRADOR' : 'FUEGO AI'}: ${message.content.slice(0, 1800)}`,
  ).join('\n');

  const prompt = [
    context ? `CONTEXTO AUTORIZADO DE ESTA VISTA:\n${context.slice(0, 3000)}` : '',
    recentHistory ? `CONVERSACIÓN RECIENTE:\n${recentHistory}` : '',
    `NUEVA PREGUNTA:\n${cleanQuestion}`,
  ].filter(Boolean).join('\n\n');

  try {
    let result;

    try {
      result = await createModel(audience, 'gemini-3.8-flash').generateContent(prompt);
    } catch (primaryError) {
      // 3.8 Flash is the preferred model. Only fall back when Google reports
      // temporary saturation/server overload; do not hide auth, quota or setup errors.
      if (!isTemporaryModelOverload(primaryError)) {
        throw primaryError;
      }

      result = await createModel(audience, 'gemini-3.5-flash-lite').generateContent(prompt);
    }

    const answer = result.response.text().trim();
    if (!answer) throw new Error('El asistente no generó una respuesta. Inténtalo de nuevo.');
    return answer.slice(0, 9000);
  } catch (cause) {
    const value = cause && typeof cause === 'object' ? cause as {message?: unknown; code?: unknown; status?: unknown} : {};
    const detail = typeof value.message === 'string' ? value.message : 'Firebase no devolvió un detalle legible.';
    const code = [value.code, value.status].filter(Boolean).join(' · ');
    if (/app.?check|403|permission|unauthenticated|permission-denied/i.test(detail) || /app.?check|permission-denied/i.test(code)) {
      throw new Error(`Firebase AI Logic rechazó la solicitud (App Check o permisos). Verifica el registro Enterprise de la app web y que el dominio jovenes-fuego.vercel.app esté autorizado. Detalle: ${detail.slice(0, 240)}`);
    }
    if (/429|resource.?exhausted|quota|rate.?limit/i.test(detail) || /resource-exhausted|429/i.test(code)) {
      throw new Error('Fuego AI alcanzó el límite temporal de solicitudes de Firebase. Espera un momento y vuelve a intentarlo.');
    }
    if (/404|not.?found|model|firebase.?ai.?logic/i.test(detail) || /not-found|404/i.test(code)) {
      throw new Error(`Firebase no encontró el modelo o el servicio de IA. Confirma que Firebase AI Logic esté habilitado en jovenes-de-fuego y que gemini-3.8-flash esté disponible. Detalle: ${detail.slice(0, 240)}`);
    }
    if (/api.?key|invalid.?argument|invalid.?api/i.test(detail) || /invalid-argument/i.test(code)) {
      throw new Error(`Firebase rechazó la configuración de la solicitud de IA. Revisa que esté seleccionado Gemini Developer API y que el proyecto siga en el plan Spark sin facturación. Detalle: ${detail.slice(0, 240)}`);
    }
    throw new Error(`No se pudo consultar Fuego AI${code ? ` (${code})` : ''}. Detalle de Firebase: ${detail.slice(0, 320)}`);
  }
}
