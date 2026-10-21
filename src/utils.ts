export function textoNoVacio(valor: unknown): string | null {
  if (typeof valor !== 'string') {
    return null;
  }

  const texto = valor.trim();
  return texto.length > 0 ? texto : null;
}

export function normalizarTexto(valor: string): string {
  return valor.trim().toLocaleLowerCase('es');
}

export function obtenerId(valor: string | undefined): number | null {
  if (!valor || !/^\d+$/.test(valor)) {
    return null;
  }

  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export type ResultadoAnio =
  | { correcto: true; valor?: number }
  | { correcto: false; error: string };

export function obtenerAnio(
  cuerpo: Record<string, unknown>,
  obligatorio: boolean
): ResultadoAnio {
  const tieneAnio = Object.hasOwn(cuerpo, 'anio');
  const tieneAnioConEnie = Object.hasOwn(cuerpo, 'año');

  if (!tieneAnio && !tieneAnioConEnie) {
    return obligatorio
      ? { correcto: false, error: 'El campo anio o año es obligatorio.' }
      : { correcto: true };
  }

  if (tieneAnio && tieneAnioConEnie && cuerpo.anio !== cuerpo['año']) {
    return { correcto: false, error: 'Los campos anio y año no pueden tener valores distintos.' };
  }

  const valor = tieneAnio ? cuerpo.anio : cuerpo['año'];

  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 1 || valor > 9999) {
    return { correcto: false, error: 'El año debe ser un número entero entre 1 y 9999.' };
  }

  return { correcto: true, valor };
}

export function fechaActual(): string {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function obtenerBooleanoQuery(valor: string): boolean | null {
  if (valor === 'true') {
    return true;
  }

  if (valor === 'false') {
    return false;
  }

  return null;
}
