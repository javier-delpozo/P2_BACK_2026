import type { IncomingMessage, ServerResponse } from 'node:http';

export function enviarJson(res: ServerResponse, estado: number, datos: unknown): void {
  const cuerpo = JSON.stringify(datos);
  res.statusCode = estado;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('content-length', new TextEncoder().encode(cuerpo).length);
  res.end(cuerpo);
}

export function enviarError(res: ServerResponse, estado: number, mensaje: string): void {
  enviarJson(res, estado, { error: mensaje });
}

export function enviarSinContenido(res: ServerResponse): void {
  res.statusCode = 204;
  res.end();
}

async function leerTexto(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let cuerpo = '';

    req.on('data', (fragmento) => {
      cuerpo += String(fragmento);
    });
    req.on('end', () => resolve(cuerpo));
    req.on('error', reject);
  });
}

export async function leerObjetoJson(
  req: IncomingMessage,
  res: ServerResponse
): Promise<Record<string, unknown> | null> {
  try {
    const texto = await leerTexto(req);
    const datos: unknown = texto.trim() === '' ? {} : JSON.parse(texto);

    if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
      enviarError(res, 400, 'El cuerpo de la petición debe ser un objeto JSON.');
      return null;
    }

    return datos as Record<string, unknown>;
  } catch {
    enviarError(res, 400, 'El cuerpo de la petición no contiene un JSON válido.');
    return null;
  }
}
