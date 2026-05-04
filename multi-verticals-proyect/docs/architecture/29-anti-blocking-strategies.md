# Estrategias Anti-Bloqueo para Scrapers (Allcoba)

Este documento resume las mejores prácticas para evitar el bloqueo durante la extracción de datos, basadas en las directrices de la industria (Bright Data) y nuestra experiencia implementando el `scraper-service`.

## 1. Huella Digital del Navegador (Browser Fingerprinting)
Los sitios avanzados como Idealista/DataDome no solo miran la IP, miran quién eres.
- **Técnica**: Usar `playwright-extra` con el plugin `stealth`.
- **Qué hace**: Oculta variables de automatización como `navigator.webdriver`, simula plugins de audio/vídeo y camufla el renderizado de Canvas.
- **Estado**: ✅ Implementado en `PlaywrightCrawler`.

## 2. Reputación de IP y Rotación
Es el factor más crítico para saltar muros de alta seguridad.
- **Técnica**: Uso de Proxies Residenciales o Móviles.
- **Por qué**: Las IPs de Data Centers (AWS, Azure) son bloqueadas al instante. Las residenciales parecen usuarios domésticos.
- **Estado**: ⏳ Pendiente de integración con proveedor externo (Bright Data / Oxylabs).

## 3. Comportamiento Humano (Human-like Interaction)
Un bot que carga la página y extrae datos en 100ms es detectado fácilmente.
- **Técnicas**:
  - **Randomized Delays**: Pausas aleatorias entre acciones (1-3 segundos).
  - **Human Scroll**: Desplazamiento progresivo por la página antes de extraer.
  - **Navegación indirecta**: Pasar por la Home antes de ir al anuncio directo (Referer real).
- **Estado**: ✅ Implementado parcialmente en `PlaywrightCrawler`.

## 4. Estrategia de Snapshots (Forensics)
Para entender por qué nos bloquean, necesitamos ver qué ve el bot.
- **Técnica**: Capturar HTML en etapas (`initial`, `after_cookies`, `final`).
- **Estado**: ✅ Implementado. Los archivos se guardan en `storage/raw/debug_*.html`.

## 5. TLS/SSL Fingerprinting
La forma en que el navegador inicia la conexión segura puede delatarlo.
- **Técnica**: Firefox suele tener una huella de TLS menos "marcada" como bot que el Chromium por defecto de Playwright.
- **Estado**: ✅ Configurado para usar Firefox como motor principal en casos de alta seguridad.

## 6. Próximos Pasos (Idealista War)
Para batir a Idealista de forma consistente, el roadmap es:
1.  Integrar un pool de **Proxies Residenciales**.
2.  Implementar **User-Agent Dinámico** que coincida con la huella TLS del motor.
3.  Añadir **Movimientos de Ratón Aleatorios** (Bezier curves) durante el desafío del deslizador.

---
*Referencia: [Bright Data - Web Scraping without getting blocked](https://brightdata.es/blog/datos-web/web-scraping-without-getting-blocked)*
