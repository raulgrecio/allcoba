# Estadísticas de extracción — detección de regresiones

> Estado: **propuesta**. A desarrollar después de corregir los errores de
> extracción pendientes en los adaptadores de la vertical dating.

## Problema

Los adaptadores de scraping se rompen de forma silenciosa. Un cambio de markup
en un portal, un selector mal escrito o una URL de listado equivocada hacen que
un campo deje de extraerse — pero el proceso termina sin error y persiste el
perfil igualmente, solo que incompleto.

No hay forma de saber, tras una corrida, si la extracción de un portal **empeoró
respecto a antes**.

## Objetivo

Medir, por portal, la **tasa de relleno** (fill-rate) de cada campo y compararla
contra un baseline guardado para señalar caídas.

Premisa clave: **no todos los perfiles traen todos los datos**. Un perfil sin
WhatsApp es legítimo. Por eso se comparan **tasas (%)**, no valores absolutos:

- Antes: 9/10 perfiles con fotos → 90 %. Ahora 0/10 → 0 %. Regresión clara.
- Antes: 8/10 con WhatsApp → 80 %. Ahora 1/10 → 10 %. Algo cambió, revisar.
- Antes: 3/10 con tatuajes. Ahora 2/10. Variación normal, sin alerta.

## Mecánica propuesta

1. Tras una corrida, leer `__data/storage/providers.json`, agrupar por
   `externalRefs[].source` y calcular por campo: `presentes / total`.
2. `--save-baseline` → guardar snapshot en `__data/extraction-baseline.json`
   (tasas por portal y campo).
3. Corridas posteriores → comparar contra el baseline y marcar los campos cuya
   tasa cae por encima de un umbral.

### Campos a medir

`nickname`, `phoneNumber`, contactOptions (`whatsapp`, `telegram`, `calls`),
`images`, `photos`, `aboutMe`/`bio`, `baseCity`, `personalDetails.ageYears`,
`personalDetails.nationalityId`, `services`, `prices`/rates, `reviews`.

### Salida de ejemplo

```
bluemove   (10 perfiles)
  nickname  10/10  100%
  phone      9/10   90%
  whatsapp   8/10   80%
  images    10/10  100%
  age        9/10   90%
  city        0/10    0%   ⚠ baseline 100% — REGRESIÓN
  services    0/10    0%   ⚠ baseline 90%  — REGRESIÓN
```

## Decisiones abiertas

1. **Forma**: script `bash` + `python` (como `scripts/test-dating-vertical.sh`)
   o subcomando CLI (`pnpm cli stats`).
2. **Umbral de alerta**: fijo (p. ej. caída > 20 puntos) o configurable.
3. **Baseline**: manual (`--save-baseline`) o automático cada corrida.
4. **Histórico**: solo último baseline o serie temporal por fecha.
