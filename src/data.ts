import type { Libro, Prestamo } from './types.ts';

const crearLibrosIniciales = (): Libro[] => [
  {
    id: 1,
    titulo: 'Clean Code',
    autor: 'Robert C. Martin',
    anio: 2008,
    disponible: true
  },
  {
    id: 2,
    titulo: 'El Quijote',
    autor: 'Miguel de Cervantes',
    anio: 1605,
    disponible: true
  },
  {
    id: 3,
    titulo: 'Sapiens',
    autor: 'Yuval Noah Harari',
    anio: 2011,
    disponible: false
  }
];

const crearPrestamosIniciales = (): Prestamo[] => [
  {
    id: 1,
    libroId: 3,
    usuario: 'Ana',
    fechaPrestamo: '2026-10-01',
    fechaDevolucion: null,
    activo: true
  }
];

export const estado = {
  libros: crearLibrosIniciales(),
  prestamos: crearPrestamosIniciales(),
  siguienteLibroId: 4,
  siguientePrestamoId: 2
};

export function reiniciarDatos(): void {
  estado.libros = crearLibrosIniciales();
  estado.prestamos = crearPrestamosIniciales();
  estado.siguienteLibroId = 4;
  estado.siguientePrestamoId = 2;
}
