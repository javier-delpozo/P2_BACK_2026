import type { IncomingMessage, ServerResponse } from 'node:http';
import { estado } from '../data.ts';
import { enviarError, enviarJson, enviarSinContenido, leerObjetoJson } from '../http.ts';
import type { Libro, Prestamo } from '../types.ts';
import {
  fechaActual,
  normalizarTexto,
  obtenerAnio,
  obtenerBooleanoQuery,
  obtenerId,
  textoNoVacio
} from '../utils.ts';

function existeDuplicado(titulo: string, autor: string, idIgnorado?: number): boolean {
  return estado.libros.some(
    (libro) =>
      libro.id !== idIgnorado &&
      normalizarTexto(libro.titulo) === normalizarTexto(titulo) &&
      normalizarTexto(libro.autor) === normalizarTexto(autor)
  );
}

function buscarLibro(id: number): Libro | undefined {
  return estado.libros.find((libro) => libro.id === id);
}

function validarCamposControlados(cuerpo: Record<string, unknown>): string | null {
  if (Object.hasOwn(cuerpo, 'id')) {
    return 'El campo id no se puede modificar ni establecer manualmente.';
  }

  return null;
}

function obtenerDisponible(
  cuerpo: Record<string, unknown>,
  obligatorio: boolean
): { correcto: true; valor?: boolean } | { correcto: false; error: string } {
  if (!Object.hasOwn(cuerpo, 'disponible')) {
    return obligatorio
      ? { correcto: false, error: 'El campo disponible es obligatorio.' }
      : { correcto: true };
  }

  if (typeof cuerpo.disponible !== 'boolean') {
    return { correcto: false, error: 'El campo disponible debe ser true o false.' };
  }

  return { correcto: true, valor: cuerpo.disponible };
}

function validarId(valor: string | undefined, res: ServerResponse): number | null {
  const id = obtenerId(valor);
  if (id === null) {
    enviarError(res, 400, 'El id del libro debe ser un número entero positivo.');
  }
  return id;
}

export function listarLibros(url: URL, res: ServerResponse): void {
  const disponible = url.searchParams.get('disponible');
  const autor = url.searchParams.get('autor');
  const titulo = url.searchParams.get('titulo');
  let resultado = [...estado.libros];

  if (disponible !== null) {
    const valorDisponible = obtenerBooleanoQuery(disponible);
    if (valorDisponible === null) {
      enviarError(res, 400, 'El query param disponible debe ser true o false.');
      return;
    }
    resultado = resultado.filter((libro) => libro.disponible === valorDisponible);
  }

  if (autor !== null) {
    if (autor.trim().length === 0) {
      enviarError(res, 400, 'El query param autor debe ser un texto no vacío.');
      return;
    }
    const autorBuscado = normalizarTexto(autor);
    resultado = resultado.filter((libro) =>
      normalizarTexto(libro.autor).includes(autorBuscado)
    );
  }

  if (titulo !== null) {
    if (titulo.trim().length === 0) {
      enviarError(res, 400, 'El query param titulo debe ser un texto no vacío.');
      return;
    }
    const tituloBuscado = normalizarTexto(titulo);
    resultado = resultado.filter((libro) =>
      normalizarTexto(libro.titulo).includes(tituloBuscado)
    );
  }

  enviarJson(res, 200, resultado);
}

export async function crearLibro(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const cuerpo = await leerObjetoJson(req, res);
  if (!cuerpo) {
    return;
  }

  const errorControlados = validarCamposControlados(cuerpo);
  if (errorControlados) {
    enviarError(res, 400, errorControlados);
    return;
  }

  const titulo = textoNoVacio(cuerpo.titulo);
  const autor = textoNoVacio(cuerpo.autor);
  const resultadoAnio = obtenerAnio(cuerpo, true);

  if (!titulo) {
    enviarError(res, 400, 'El campo titulo es obligatorio y no puede estar vacío.');
    return;
  }

  if (!autor) {
    enviarError(res, 400, 'El campo autor es obligatorio y no puede estar vacío.');
    return;
  }

  if (!resultadoAnio.correcto) {
    enviarError(res, 400, resultadoAnio.error);
    return;
  }

  if (existeDuplicado(titulo, autor)) {
    enviarError(res, 409, 'Ya existe un libro con el mismo título y autor.');
    return;
  }

  const libro: Libro = {
    id: estado.siguienteLibroId++,
    titulo,
    autor,
    anio: resultadoAnio.valor!,
    disponible: true
  };

  estado.libros.push(libro);
  res.setHeader('location', `/libros/${libro.id}`);
  enviarJson(res, 201, libro);
}

export function obtenerLibro(valorId: string | undefined, res: ServerResponse): void {
  const id = validarId(valorId, res);
  if (id === null) {
    return;
  }

  const libro = buscarLibro(id);
  if (!libro) {
    enviarError(res, 404, 'No existe un libro con el id indicado.');
    return;
  }

  enviarJson(res, 200, libro);
}

export function listarPrestamosLibro(valorId: string | undefined, res: ServerResponse): void {
  const id = validarId(valorId, res);
  if (id === null) {
    return;
  }

  if (!buscarLibro(id)) {
    enviarError(res, 404, 'No existe un libro con el id indicado.');
    return;
  }

  enviarJson(res, 200, estado.prestamos.filter((prestamo) => prestamo.libroId === id));
}

export async function prestarLibro(
  valorId: string | undefined,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const id = validarId(valorId, res);
  if (id === null) {
    return;
  }

  const libro = buscarLibro(id);
  if (!libro) {
    enviarError(res, 404, 'No existe un libro con el id indicado.');
    return;
  }

  const cuerpo = await leerObjetoJson(req, res);
  if (!cuerpo) {
    return;
  }

  const usuario = textoNoVacio(cuerpo.usuario);
  if (!usuario) {
    enviarError(res, 400, 'El campo usuario es obligatorio y no puede estar vacío.');
    return;
  }

  if (!libro.disponible) {
    enviarError(res, 409, 'El libro no está disponible para préstamo.');
    return;
  }

  const usuarioNormalizado = normalizarTexto(usuario);
  const prestamosActivos = estado.prestamos.filter(
    (prestamo) => prestamo.activo && normalizarTexto(prestamo.usuario) === usuarioNormalizado
  ).length;

  if (prestamosActivos >= 2) {
    enviarError(res, 409, 'El usuario ya tiene el máximo de dos préstamos activos.');
    return;
  }

  const prestamo: Prestamo = {
    id: estado.siguientePrestamoId++,
    libroId: libro.id,
    usuario,
    fechaPrestamo: fechaActual(),
    fechaDevolucion: null,
    activo: true
  };

  estado.prestamos.push(prestamo);
  libro.disponible = false;
  res.setHeader('location', `/libros/${libro.id}/prestamos`);
  enviarJson(res, 201, prestamo);
}

export function devolverLibro(valorId: string | undefined, res: ServerResponse): void {
  const id = validarId(valorId, res);
  if (id === null) {
    return;
  }

  const libro = buscarLibro(id);
  if (!libro) {
    enviarError(res, 404, 'No existe un libro con el id indicado.');
    return;
  }

  const prestamo = estado.prestamos.find(
    (prestamoActual) => prestamoActual.libroId === id && prestamoActual.activo
  );

  if (!prestamo) {
    enviarError(res, 409, 'El libro no tiene ningún préstamo activo.');
    return;
  }

  prestamo.activo = false;
  prestamo.fechaDevolucion = fechaActual();
  libro.disponible = true;

  enviarJson(res, 200, prestamo);
}

export async function actualizarLibroCompleto(
  valorId: string | undefined,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const id = validarId(valorId, res);
  if (id === null) {
    return;
  }

  const libro = buscarLibro(id);
  if (!libro) {
    enviarError(res, 404, 'No existe un libro con el id indicado.');
    return;
  }

  const cuerpo = await leerObjetoJson(req, res);
  if (!cuerpo) {
    return;
  }

  const errorControlados = validarCamposControlados(cuerpo);
  if (errorControlados) {
    enviarError(res, 400, errorControlados);
    return;
  }

  const titulo = textoNoVacio(cuerpo.titulo);
  const autor = textoNoVacio(cuerpo.autor);
  const resultadoAnio = obtenerAnio(cuerpo, true);
  const resultadoDisponible = obtenerDisponible(cuerpo, true);

  if (!titulo) {
    enviarError(res, 400, 'PUT exige un titulo no vacío.');
    return;
  }

  if (!autor) {
    enviarError(res, 400, 'PUT exige un autor no vacío.');
    return;
  }

  if (!resultadoAnio.correcto) {
    enviarError(res, 400, resultadoAnio.error);
    return;
  }

  if (!resultadoDisponible.correcto) {
    enviarError(res, 400, resultadoDisponible.error);
    return;
  }

  const tienePrestamoActivo = estado.prestamos.some(
    (prestamo) => prestamo.libroId === id && prestamo.activo
  );
  if (tienePrestamoActivo && resultadoDisponible.valor) {
    enviarError(res, 409, 'Un libro con un préstamo activo no puede marcarse como disponible.');
    return;
  }

  if (existeDuplicado(titulo, autor, id)) {
    enviarError(res, 409, 'Ya existe un libro con el mismo título y autor.');
    return;
  }

  libro.titulo = titulo;
  libro.autor = autor;
  libro.anio = resultadoAnio.valor!;
  libro.disponible = resultadoDisponible.valor!;

  enviarJson(res, 200, libro);
}

export async function actualizarLibroParcial(
  valorId: string | undefined,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const id = validarId(valorId, res);
  if (id === null) {
    return;
  }

  const libro = buscarLibro(id);
  if (!libro) {
    enviarError(res, 404, 'No existe un libro con el id indicado.');
    return;
  }

  const cuerpo = await leerObjetoJson(req, res);
  if (!cuerpo) {
    return;
  }

  const errorControlados = validarCamposControlados(cuerpo);
  if (errorControlados) {
    enviarError(res, 400, errorControlados);
    return;
  }

  const cambiaTitulo = Object.hasOwn(cuerpo, 'titulo');
  const cambiaAutor = Object.hasOwn(cuerpo, 'autor');
  const resultadoAnio = obtenerAnio(cuerpo, false);
  const resultadoDisponible = obtenerDisponible(cuerpo, false);

  if (!resultadoAnio.correcto) {
    enviarError(res, 400, resultadoAnio.error);
    return;
  }

  if (!resultadoDisponible.correcto) {
    enviarError(res, 400, resultadoDisponible.error);
    return;
  }

  if (
    !cambiaTitulo &&
    !cambiaAutor &&
    resultadoAnio.valor === undefined &&
    resultadoDisponible.valor === undefined
  ) {
    enviarError(
      res,
      400,
      'PATCH debe incluir al menos uno de estos campos: titulo, autor, anio, año o disponible.'
    );
    return;
  }

  const titulo = cambiaTitulo ? textoNoVacio(cuerpo.titulo) : libro.titulo;
  const autor = cambiaAutor ? textoNoVacio(cuerpo.autor) : libro.autor;

  if (!titulo) {
    enviarError(res, 400, 'El campo titulo no puede estar vacío.');
    return;
  }

  if (!autor) {
    enviarError(res, 400, 'El campo autor no puede estar vacío.');
    return;
  }

  if (existeDuplicado(titulo, autor, id)) {
    enviarError(res, 409, 'Ya existe un libro con el mismo título y autor.');
    return;
  }
  const tienePrestamoActivo = estado.prestamos.some(
    (prestamo) => prestamo.libroId === id && prestamo.activo
  );
  if (tienePrestamoActivo && resultadoDisponible.valor === true) {
    enviarError(res, 409, 'Un libro con un préstamo activo no puede marcarse como disponible.');
    return;
  }

  libro.titulo = titulo;
  libro.autor = autor;
  libro.anio = resultadoAnio.valor ?? libro.anio;
  libro.disponible = resultadoDisponible.valor ?? libro.disponible;

  enviarJson(res, 200, libro);
}

export function borrarLibro(valorId: string | undefined, res: ServerResponse): void {
  const id = validarId(valorId, res);
  if (id === null) {
    return;
  }

  const indice = estado.libros.findIndex((libro) => libro.id === id);
  if (indice === -1) {
    enviarError(res, 404, 'No existe un libro con el id indicado.');
    return;
  }

  const tienePrestamoActivo = estado.prestamos.some(
    (prestamo) => prestamo.libroId === id && prestamo.activo
  );

  if (tienePrestamoActivo) {
    enviarError(res, 409, 'No se puede borrar un libro que está prestado.');
    return;
  }

  estado.libros.splice(indice, 1);
  enviarSinContenido(res);
}
