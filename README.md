# Biblioteca API

API REST para gestionar libros y préstamos de una biblioteca.

## Ejecución

Desde la carpeta del proyecto:

```bash
npm install
npm run dev
```

El servidor se inicia en:

```text
http://localhost:3000
```

## Endpoints

### Libros

- `GET /libros`: muestra todos los libros.
- `GET /libros/:id`: muestra un libro por su id.
- `POST /libros`: crea un libro nuevo.
- `PUT /libros/:id`: sustituye todos los datos de un libro.
- `PATCH /libros/:id`: modifica los campos indicados de un libro.
- `DELETE /libros/:id`: elimina un libro.

### Préstamos

- `GET /prestamos`: muestra todos los préstamos.
- `GET /libros/:id/prestamos`: muestra el historial de préstamos de un libro.
- `POST /libros/:id/prestar`: registra el préstamo de un libro.
- `POST /libros/:id/devolver`: registra la devolución de un libro.

### Estadísticas

- `GET /estadisticas`: muestra el total de libros, los disponibles, los prestados y el autor con más libros.