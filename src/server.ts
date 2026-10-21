import { createServer } from 'node:http';
import { manejarPeticion } from './app.ts';
import { enviarError } from './http.ts';

const puerto = Number(process.env.PORT) || 3000;

const servidor = createServer((req, res) => {
  manejarPeticion(req, res).catch(() => {
    enviarError(res, 500, 'Se ha producido un error interno en el servidor.');
  });
});

servidor.listen(puerto, () => {
  console.log(`Servidor disponible en http://localhost:${puerto}`);
});
