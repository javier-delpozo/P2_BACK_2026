import type { IncomingMessage, ServerResponse } from 'node:http';
import { obtenerEstadisticas } from './routes/estadisticas.ts';
import {
  actualizarLibroCompleto,
  actualizarLibroParcial,
  borrarLibro,
  crearLibro,
  devolverLibro,
  listarLibros,
  listarPrestamosLibro,
  obtenerLibro,
  prestarLibro
} from './routes/libros.ts';
import { listarPrestamos } from './routes/prestamos.ts';
import { enviarError, enviarJson } from './http.ts';

export async function manejarPeticion(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const metodo = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', 'http://localhost');
  const ruta = url.pathname.replace(/\/+$/, '') || '/';

  if (metodo === 'GET' && ruta === '/') {
    enviarJson(res, 200, { mensaje: 'API de biblioteca en funcionamiento.' });
    return;
  }

  if (ruta === '/libros') {
    if (metodo === 'GET') {
      listarLibros(url, res);
      return;
    }
    if (metodo === 'POST') {
      await crearLibro(req, res);
      return;
    }
  }

  if (metodo === 'GET' && ruta === '/prestamos') {
    listarPrestamos(url, res);
    return;
  }

  if (metodo === 'GET' && ruta === '/estadisticas') {
    obtenerEstadisticas(res);
    return;
  }

  const coincidencia = ruta.match(/^\/libros\/([^/]+)(?:\/(prestamos|prestar|devolver))?$/);
  if (coincidencia) {
    const id = coincidencia[1];
    const accion = coincidencia[2];

    if (!accion) {
      if (metodo === 'GET') {
        obtenerLibro(id, res);
        return;
      }
      if (metodo === 'PUT') {
        await actualizarLibroCompleto(id, req, res);
        return;
      }
      if (metodo === 'PATCH') {
        await actualizarLibroParcial(id, req, res);
        return;
      }
      if (metodo === 'DELETE') {
        borrarLibro(id, res);
        return;
      }
    }

    if (accion === 'prestamos' && metodo === 'GET') {
      listarPrestamosLibro(id, res);
      return;
    }

    if (accion === 'prestar' && metodo === 'POST') {
      await prestarLibro(id, req, res);
      return;
    }

    if (accion === 'devolver' && metodo === 'POST') {
      devolverLibro(id, res);
      return;
    }
  }

  enviarError(res, 404, 'La ruta solicitada no existe.');
}
