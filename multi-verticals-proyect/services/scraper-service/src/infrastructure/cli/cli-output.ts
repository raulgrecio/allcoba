/**
 * cli-output — salida intencional a stdout para reportes CLI dirigidos al
 * usuario (tablas, resúmenes con color).
 *
 * Es deliberadamente distinta de:
 *   - el logger (Pino): observabilidad estructurada, eventos del servicio.
 *   - un `console.log` suelto: que se lee como depuración olvidada.
 *
 * Usar esta función deja explícito que el texto es output esperado del comando.
 */
export function printReport(text: string): void {
  process.stdout.write(`${text}\n`);
}
