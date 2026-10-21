import type { ServerResponse } from 'node:http';
import { estado } from '../data.ts';
import { enviarJson } from '../http.ts';

export function obtenerEstadisticas(res: ServerResponse): void {
  const disponibles = estado.libros.filter((libro) => libro.disponible).length;
  const conteoPorAutor = new Map<string, number>();

  for (const libro of estado.libros) {
    conteoPorAutor.set(libro.autor, (conteoPorAutor.get(libro.autor) ?? 0) + 1);
  }

  let autor = '';
  let cantidad = 0;

  for (const [nombre, total] of conteoPorAutor) {
    if (total > cantidad) {
      autor = nombre;
      cantidad = total;
    }
  }

  enviarJson(res, 200, {
    totalLibros: estado.libros.length,
    librosDisponibles: disponibles,
    librosPrestados: estado.libros.length - disponibles,
    autorConMasLibros: estado.libros.length > 0 ? { autor, cantidad } : null
  });
}
