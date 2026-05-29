import type { JobName } from '@allcoba/shared-types';

export interface QueuePort {
  /**
   * Publica un nuevo trabajo en la cola.
   */
  publish<T>(name: JobName, data: T): Promise<string | null>;

  /**
   * Suscribe un callback para procesar trabajos asíncronos recibidos de la cola.
   */
  subscribe<T>(name: JobName, handler: (data: T) => Promise<void>): Promise<void>;

  /**
   * Arranca la conexión con la base de datos de colas.
   */
  start(): Promise<void>;

  /**
   * Detiene de forma segura el consumidor de colas.
   */
  stop(): Promise<void>;
}
