declare module 'node:http' {
  export interface IncomingMessage {
    method?: string;
    url?: string;
    on(evento: 'data', listener: (fragmento: unknown) => void): this;
    on(evento: 'end', listener: () => void): this;
    on(evento: 'error', listener: (error: Error) => void): this;
  }

  export interface ServerResponse {
    statusCode: number;
    setHeader(nombre: string, valor: string | number): void;
    end(datos?: string): void;
  }

  export interface Server {
    listen(puerto: number, listener?: () => void): this;
  }

  export function createServer(
    listener: (peticion: IncomingMessage, respuesta: ServerResponse) => void
  ): Server;
}

declare const process: {
  env: Record<string, string | undefined>;
};
