import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, beforeEach, test } from 'node:test';
import { manejarPeticion } from '../dist/app.js';
import { reiniciarDatos } from '../dist/data.js';

let servidor;
let baseUrl;

before(async () => {
  servidor = createServer((req, res) => {
    manejarPeticion(req, res).catch(() => {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Error de prueba.' }));
    });
  });

  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  const direccion = servidor.address();
  baseUrl = `http://127.0.0.1:${direccion.port}`;
});

beforeEach(() => {
  reiniciarDatos();
});

after(async () => {
  await new Promise((resolve, reject) => {
    servidor.close((error) => (error ? reject(error) : resolve()));
  });
});

async function peticion(ruta, metodo = 'GET', cuerpo) {
  const respuesta = await fetch(`${baseUrl}${ruta}`, {
    method: metodo,
    headers: cuerpo === undefined ? undefined : { 'content-type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
  });
  const texto = await respuesta.text();

  return {
    estado: respuesta.status,
    datos: texto ? JSON.parse(texto) : null
  };
}

test('devuelve los datos iniciales y el préstamo de Sapiens', async () => {
  const libros = await peticion('/libros');
  const prestamos = await peticion('/prestamos');

  assert.equal(libros.estado, 200);
  assert.equal(libros.datos.length, 3);
  assert.deepEqual(libros.datos.map((libro) => libro.titulo), [
    'Clean Code',
    'El Quijote',
    'Sapiens'
  ]);
  assert.equal(libros.datos[2].disponible, false);
  assert.equal(prestamos.datos[0].usuario, 'Ana');
  assert.equal(prestamos.datos[0].fechaPrestamo, '2026-10-01');
  assert.equal(prestamos.datos[0].activo, true);
});

test('consulta libros mediante ruta dinámica y query params', async () => {
  const libro = await peticion('/libros/1');
  const disponibles = await peticion('/libros?disponible=true&autor=martin');
  const prestamos = await peticion('/libros/3/prestamos');

  assert.equal(libro.estado, 200);
  assert.equal(libro.datos.titulo, 'Clean Code');
  assert.equal(disponibles.datos.length, 1);
  assert.equal(prestamos.datos.length, 1);
});

test('crea libros, valida campos y evita duplicados', async () => {
  const invalido = await peticion('/libros', 'POST', { titulo: 'Dune' });
  const creado = await peticion('/libros', 'POST', {
    titulo: 'Dune',
    autor: 'Frank Herbert',
    año: 1965
  });
  const duplicado = await peticion('/libros', 'POST', {
    titulo: ' dune ',
    autor: 'FRANK HERBERT',
    anio: 1965
  });

  assert.equal(invalido.estado, 400);
  assert.equal(creado.estado, 201);
  assert.equal(creado.datos.id, 4);
  assert.equal(creado.datos.disponible, true);
  assert.equal(duplicado.estado, 409);
  assert.equal(typeof duplicado.datos.error, 'string');
});

test('no reutiliza el id de un libro borrado', async () => {
  assert.equal((await peticion('/libros/1', 'DELETE')).estado, 204);
  const creado = await peticion('/libros', 'POST', {
    titulo: '1984',
    autor: 'George Orwell',
    anio: 1949
  });

  assert.equal(creado.datos.id, 4);
});

test('PUT reemplaza los campos editables y PATCH solo los enviados', async () => {
  const putIncompleto = await peticion('/libros/1', 'PUT', { titulo: 'Código limpio' });
  const reemplazado = await peticion('/libros/1', 'PUT', {
    titulo: 'Código limpio',
    autor: 'Robert C. Martin',
    anio: 2008,
    disponible: true
  });
  const modificado = await peticion('/libros/1', 'PATCH', { anio: 2009 });
  const cambioId = await peticion('/libros/1', 'PATCH', { id: 40 });
  const conflictoPrestado = await peticion('/libros/3', 'PATCH', { disponible: true });

  assert.equal(putIncompleto.estado, 400);
  assert.equal(reemplazado.estado, 200);
  assert.equal(modificado.datos.titulo, 'Código limpio');
  assert.equal(modificado.datos.anio, 2009);
  assert.equal(cambioId.estado, 400);
  assert.equal(conflictoPrestado.estado, 409);
});

test('presta, limita a dos préstamos activos y devuelve libros', async () => {
  const primero = await peticion('/libros/1/prestar', 'POST', { usuario: 'Ana' });
  const limite = await peticion('/libros/2/prestar', 'POST', { usuario: ' ana ' });
  const devolucion = await peticion('/libros/3/devolver', 'POST');
  const segundoTrasDevolver = await peticion('/libros/2/prestar', 'POST', { usuario: 'Ana' });

  assert.equal(primero.estado, 201);
  assert.equal(limite.estado, 409);
  assert.equal(devolucion.estado, 200);
  assert.equal(devolucion.datos.activo, false);
  assert.equal(typeof devolucion.datos.fechaDevolucion, 'string');
  assert.equal(segundoTrasDevolver.estado, 201);
});

test('impide prestar un libro no disponible y borrar uno prestado', async () => {
  const noDisponible = await peticion('/libros/3/prestar', 'POST', { usuario: 'Luis' });
  const borrado = await peticion('/libros/3', 'DELETE');

  assert.equal(noDisponible.estado, 409);
  assert.equal(borrado.estado, 409);
});

test('filtra préstamos y devuelve estadísticas', async () => {
  const activosAna = await peticion('/prestamos?activo=true&usuario=ana&libroId=3');
  const estadisticas = await peticion('/estadisticas');

  assert.equal(activosAna.estado, 200);
  assert.equal(activosAna.datos.length, 1);
  assert.deepEqual(estadisticas.datos, {
    totalLibros: 3,
    librosDisponibles: 2,
    librosPrestados: 1,
    autorConMasLibros: { autor: 'Robert C. Martin', cantidad: 1 }
  });
});

test('usa códigos y errores JSON coherentes', async () => {
  const idInvalido = await peticion('/libros/abc');
  const inexistente = await peticion('/libros/999');
  const rutaInexistente = await peticion('/otra-ruta');

  assert.deepEqual(idInvalido, {
    estado: 400,
    datos: { error: 'El id del libro debe ser un número entero positivo.' }
  });
  assert.equal(inexistente.estado, 404);
  assert.equal(rutaInexistente.estado, 404);
  assert.equal(typeof inexistente.datos.error, 'string');
});
