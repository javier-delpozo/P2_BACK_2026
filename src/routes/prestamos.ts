import type { ServerResponse } from 'node:http';
import { estado } from '../data.ts';
import { enviarError, enviarJson } from '../http.ts';
import { normalizarTexto, obtenerBooleanoQuery, obtenerId } from '../utils.ts';

export function listarPrestamos(url: URL, res: ServerResponse): void {
  const activo = url.searchParams.get('activo');
  const usuario = url.searchParams.get('usuario');
  const libroId = url.searchParams.get('libroId');
  let resultado = [...estado.prestamos];

  if (activo !== null) {
    const valorActivo = obtenerBooleanoQuery(activo);
    if (valorActivo === null) {
      enviarError(res, 400, 'El query param activo debe ser true o false.');
      return;
    }
    resultado = resultado.filter((prestamo) => prestamo.activo === valorActivo);
  }

  if (usuario !== null) {
    if (usuario.trim().length === 0) {
      enviarError(res, 400, 'El query param usuario debe ser un texto no vacío.');
      return;
    }
    const usuarioBuscado = normalizarTexto(usuario);
    resultado = resultado.filter(
      (prestamo) => normalizarTexto(prestamo.usuario) === usuarioBuscado
    );
  }

  if (libroId !== null) {
    const id = obtenerId(libroId);
    if (id === null) {
      enviarError(res, 400, 'El query param libroId debe ser un identificador válido.');
      return;
    }
    resultado = resultado.filter((prestamo) => prestamo.libroId === id);
  }

  enviarJson(res, 200, resultado);
}
