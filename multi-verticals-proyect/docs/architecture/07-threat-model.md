# 07 · Threat model

> Análisis de amenazas y contramedidas. Se revisa en cada release mayor.

---

## Superficie de ataque por criticidad

### CRÍTICO

| Amenaza                     | Vector                 | Contramedida                                                     |
| --------------------------- | ---------------------- | ---------------------------------------------------------------- |
| Robo de sesión del provider | XSS, MITM              | JWT en memoria (no localStorage), HTTPS forzado, SameSite=Strict |
| Credential stuffing         | Brechas externas       | Argon2id, MFA obligatorio, rate limiting por IP + usuario        |
| Acceso a Key Management DB  | Credenciales filtradas | DB separada, acceso sólo desde key-service, firewall por IP      |
| IDOR entre providers        | Bug en query           | Middleware tenant isolation + RLS PostgreSQL (doble barrera)     |

### ALTO

| Amenaza                | Vector                  | Contramedida                                                          |
| ---------------------- | ----------------------- | --------------------------------------------------------------------- |
| SQL Injection          | Input malicioso         | Drizzle ORM con queries parametrizadas, nunca string interpolation    |
| Prompt injection en IA | Input del consumer      | Sanitización, delimitadores en prompt, validación estricta del output |
| Mass assignment        | Payload malicioso       | Zod schema en cada endpoint, lista blanca de campos permitidos        |
| Insider threat (dev)   | Acceso root al servidor | DEK nunca en disco, logs redactados, audit log de accesos             |
| Envenenamiento ETL     | Fuentes scrapeadas      | Validación de schema, score de confianza, revisión humana             |

### MEDIO

| Amenaza                        | Vector                      | Contramedida                                                        |
| ------------------------------ | --------------------------- | ------------------------------------------------------------------- |
| SSRF en scraper                | URL controlada por atacante | Validar URLs contra allowlist de dominios, sin acceso a red interna |
| Exposición de puertos internos | Mala configuración          | PostgreSQL y key-service sin puerto público, Cloudflare Tunnel      |
| Secrets en logs                | Log de objetos completos    | Pino redact lista, tests que verifican ausencia de campos sensibles |
| DoS en worker IA               | Input muy largo             | Truncar a 2000 chars antes de pasar al modelo                       |

---

## Reglas que nunca se violan

```
1. provider_id siempre del JWT, nunca del body/query/params
2. DEK nunca en logs, nunca en respuestas HTTP, nunca en disco
3. Datos PII nunca en tablas globales, sólo en schemas de provider cifrados
4. El modelo IA nunca hace llamadas a red durante inferencia
5. Las claves de cifrado nunca se loguean (Pino redact cubre esto)
6. Ningún endpoint devuelve datos de otro tenant aunque el JWT sea válido
```

---

## Checklist de seguridad para cada PR

- [ ] ¿El endpoint obtiene el `provider_id` del JWT y no del request?
- [ ] ¿Las queries usan parámetros, no interpolación de strings?
- [ ] ¿Los campos nuevos están en el schema Zod de validación?
- [ ] ¿Hay algún campo sensible nuevo que añadir a `pino.redact`?
- [ ] ¿El test de tenant isolation cubre el nuevo endpoint?
- [ ] ¿Se loguea algo que no debería?

---

## Gestión de incidentes

**Si se detecta acceso no autorizado a datos de un provider:**

1. Revocar todos los refresh tokens del provider afectado (tabla `revoked_tokens`)
2. Rotar la DEK del provider (re-cifrar con nueva DEK, ver `02-encryption.md`)
3. Auditar el access log de la Key Management DB
4. Notificar al provider según RGPD (72 horas máximo)
5. Post-mortem documentado en `docs/incidents/`

**Si se sospecha compromiso de la Key Management DB:**

1. Poner en mantenimiento toda la plataforma
2. Rotar todas las KEK y DEK (requiere re-login de todos los providers)
3. Cambiar credenciales de acceso a la KM DB
4. Revisar logs de acceso desde el key-service
