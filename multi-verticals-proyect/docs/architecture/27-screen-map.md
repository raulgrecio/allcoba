# Allcoba — Mapa de pantallas y flujos

> Documento de briefing para diseño UI/UX
> Versión: 2.0
> Verticales incluidas: Dating · Automoción
> Canales: App móvil (iOS + Android) · Web

---

## Para el diseñador

Este documento define **qué hace cada pantalla y cómo se conecta con las demás**.
No define colores, tipografías, radios ni componentes visuales — eso es tu trabajo.

El primer paso antes de diseñar pantallas es crear:

1. **Style guide** — paleta, tipografía, iconografía, espaciado, elevación
2. **Librería de componentes** — botones, inputs, cards, navegación, badges
3. **Prototipo de flujos** — pantallas conectadas con transiciones

---

## Referencias visuales aportadas

Las siguientes referencias definen la dirección estética. No son copias — son inspiración de mecánicas y atmósfera:

- **Bondly Dating App** (Behance) — atmósfera, jerarquía visual, uso de la foto
- **Mobile Dating App UI** (Dribbble shot 25886858) — deck de swipe, cards
- **Webcam Models Mobile App** (Dribbble shot 25649865) — perfil oscuro, stats, galería
- **Dating App** (Dribbble shot 24118212) — flujo de match, mapa de proximidad
- **Airbnb** — neutralidad entre verticales, búsqueda, ficha de servicio

**Tensión creativa a resolver:**
La vertical Dating tiene una atmósfera inmersiva y personal (fotos a pantalla completa, oscuridad, gestualidad). La vertical Masajes tiene que ser funcional y confiable (búsqueda, ficha, reserva). La misma app alberga ambas. El reto del diseñador es crear un sistema visual que permita estas dos atmósferas sin que la app parezca partida en dos.

---

## Mecánicas clave a entender antes de diseñar

### Roles — Presenter y Chooser

Toda la app gira en torno a dos roles con experiencias radicalmente distintas:

**Presenter** — publica su perfil o ficha. Espera. No puede iniciar contacto. Recibe mensajes filtrados por sus propias reglas. En Dating tiene foto obligatoria. En Masajes es un negocio con catálogo y agenda.

**Chooser** — navega, explora, decide. Es el único que puede iniciar el primer contacto. En Dating es anónimo por defecto (nadie ve su foto ni su nombre hasta que él decide). En Masajes es un cliente que busca y reserva.

El mismo usuario puede ser Presenter en una vertical y Chooser en otra.

### Privacidad por capas — solo Dating

El perfil del Presenter en Dating se revela progresivamente:

- **Capa 1** — visible para todos en el deck (foto, alias, edad, intereses básicos)
- **Capa 2** — se desbloquea automáticamente cuando hay match (más fotos, más información personal)
- **Capa 3** — el Presenter decide activamente compartirla con un match específico (contacto directo, info más íntima)

El Chooser siempre es anónimo. Los Presenters solo ven su reputación acumulada, nunca su identidad real.

### Plantilla de filtrado — solo Presenter

El Presenter define reglas automáticas para gestionar quién le contacta:

- **Aceptar** → llega a la bandeja principal con notificación
- **Archivar** → se guarda sin notificación, el Presenter lo revisa cuando quiere
- **Rechazar** → el Chooser recibe un mensaje genérico, nunca sabe que fue rechazado

El Chooser siempre ve "mensaje enviado" — nunca sabe si fue archivado o rechazado.

### Vertical como cobertura social
Un usuario puede usar la app en la vertical Masajes como "cobertura" mientras también usa Dating. El diseño debe ser suficientemente neutro para que alguien usando Masajes no parezca estar en una app de citas. Esto afecta especialmente a la pantalla de selección de vertical y a la navegación principal.

### Bloqueo de capturas — solo Dating
En la app móvil, la vertical Dating bloquea capturas de pantalla a nivel del sistema operativo. El diseñador debe saberlo: no hay necesidad de watermarks visibles en Dating, y los usuarios no pueden compartir pantallazos de perfiles.

---

## Canales

- 📱 Solo app móvil
- 🌐 Solo web
- 📱🌐 Ambos

---

## BLOQUE 1 — Onboarding

Flujo de entrada común a todas las verticales. Se muestra al registrarse por primera vez.

---

### S-01 · Splash / bienvenida — 📱
Primera pantalla al abrir la app. Establece el carácter de la marca antes de cualquier acción. El usuario no puede hacer nada aquí excepto continuar.

**Flujo:** → S-02

---

### S-02 · Selección de vertical — 📱🌐
El usuario elige en qué contexto quiere usar Allcoba. Es también la pantalla a la que se vuelve para cambiar de vertical desde la navegación principal.

**Mecánica:** Cada vertical es una opción seleccionable. Las verticales no disponibles en la zona del usuario aparecen deshabilitadas con indicación de "próximamente". Al seleccionar una vertical el usuario accede a su experiencia específica.

**Flujo:** → S-03 (si no tiene cuenta) o directamente al home de la vertical elegida

---

### S-03 · Registro / Login — 📱🌐
Crear cuenta o entrar. El identificador principal es el número de teléfono. Mínima fricción.

**Mecánica:** Input de teléfono con selector de prefijo de país. Al enviar el número se genera un código OTP. Opción de login con Google como alternativa. Al final de la pantalla: textos legales obligatorios (Términos y Privacidad) con links.

**Flujo:** → S-04

---

### S-04 · Verificación OTP — 📱🌐
Confirmar que el número de teléfono es real mediante un código de 6 dígitos enviado por SMS.

**Mecánica:** 6 inputs individuales. Validación automática al completar los 6 dígitos sin necesidad de pulsar botón. Si el código es incorrecto, feedback inmediato. Link para reenviar el código (deshabilitado con countdown los primeros 30 segundos). Link para cambiar el número.

**Estados a diseñar:** vacío / en progreso / código correcto / código incorrecto / código expirado

**Flujo:** → S-05

---

### S-05 · Elegir rol — 📱🌐
El usuario declara si quiere ser Presenter o Chooser en la vertical que ha elegido.

**Mecánica:** Dos opciones claras. Cada opción explica brevemente qué implica ese rol en esa vertical. Solo se puede elegir una. Nota informativa: el rol se puede cambiar desde ajustes. En algunos mercados el rol puede estar predeterminado por la configuración regional — en ese caso esta pantalla muestra confirmación, no elección.

**Flujo:** → Setup de perfil según rol y vertical elegidos

---

## BLOQUE 2 — Dating · Chooser

---

### S-06 · Crear perfil anónimo — 📱🌐
El Chooser construye su identidad en la app. Es anónima por diseño.

**Mecánica:** La foto de perfil es opcional — el sistema debe verse bien sin foto, usando solo un avatar generado (emoji, ilustración, inicial). El alias es el único campo obligatorio. El resto (intereses, idiomas, preferencias) es opcional pero mejora la experiencia. El sistema nunca pide nombre real.

**Campos opcionales a diseñar:** avatar / alias / intereses (selección de tags) / idiomas / orientación / tipo de relación que busca / rango de edad que busca

**Flujo:** → S-07

---

### S-07 · Preferencias de búsqueda — 📱🌐
El Chooser configura qué Presenters verá en su deck.

**Mecánica:** Rango de edad (slider doble), distancia máxima (slider con opción "sin límite"), toggle para ver solo perfiles verificados. Estas preferencias se pueden cambiar en cualquier momento desde ajustes.

**Flujo:** → S-08

---

### S-08 · Permiso de ubicación — 📱
Solicitar acceso a la geolocalización del dispositivo. Solo app — en web se usa input de ciudad.

**Mecánica:** Pantalla explicativa antes del diálogo del sistema operativo. Si el usuario rechaza, se ofrece un fallback con input de ciudad o código postal. El diseño no debe ser alarmista — la ubicación es necesaria para el deck y el mapa pero no para todas las funciones.

**Flujo:** → S-09 (home del Chooser / deck)

---

### S-09 · Deck de swipe — 📱
**La pantalla más importante de la app para el Chooser en Dating.**

**Mecánica:** El Chooser ve perfiles de Presenters uno a uno. La foto del Presenter ocupa toda la pantalla. La información del Presenter (nombre, edad, estado, tags, distancia) se superpone sobre la foto. El Chooser expresa su interés mediante gestos o botones:
- Pasar (no interesado)
- Guardar / like (interesado, sin notificar aún al Presenter)
- Super interés (interés destacado)
- Ver perfil completo (sin expresar interés aún)

Visualmente se apilan varias cards — la del Presenter actual y las siguientes detrás.

**Gestos:**
- Swipe derecha = like / guardar
- Swipe izquierda = pasar
- Swipe arriba = super interés
- Tap en la foto = ver perfil completo

**Estados a diseñar:** card normal / card en swipe derecha (feedback visual) / card en swipe izquierda (feedback visual) / sin más perfiles (estado vacío) / cargando

**Nota importante:** Esta pantalla solo existe en app. En web el equivalente es una búsqueda en formato listado o grid.

**Flujo:** Tap en foto o botón info → S-10 / Like → guarda y siguiente card / Swipe derecha → S-13 (opcional enviar mensaje inmediatamente)

---

### S-10 · Perfil público del Presenter — Capa 1 — 📱🌐
Vista completa del Presenter antes del match. Solo se ve la Capa 1 (información pública).

**Mecánica:** Foto grande en la parte superior, información debajo. Las fotos de Capa 2 existen pero aparecen bloqueadas/ocultas. El Chooser puede guardar el perfil o iniciar el contacto desde aquí. Si ya ha enviado un mensaje, el botón de contactar lo refleja.

**Contenido visible:** foto principal / alias / edad / badge de verificación / indicador de estado online / distancia / stats (número de conexiones, score de reputación, tiempo en la app) / tags de intereses / bio

**Contenido bloqueado hasta match:** fotos adicionales / información de Capa 2

**Flujo:** Botón contactar → S-13 / Botón guardar → añade a S-12

---

### S-11 · Mapa de proximidad — 📱
Vista alternativa al deck. Los Presenters aparecen como pins sobre un mapa.

**Mecánica:** Mapa a pantalla completa. Cada Presenter es un pin con su foto. Al seleccionar un pin aparece un popup con información básica y botón de ver perfil completo. El usuario puede ver quién está cerca en tiempo real. Filtros para afinar los resultados visibles en el mapa.

**Flujo:** Tap en pin → popup / Tap en "Ver perfil" en popup → S-10

---

### S-12 · Guardados / likes activos — 📱🌐
Lista de Presenters a los que el Chooser ha dado like o super like.

**Mecánica:** Grid o lista de perfiles guardados. Indicador visual si alguno ya ha respondido (match). El Chooser puede eliminar un guardado o contactar directamente desde aquí. Estado vacío si no hay guardados.

**Flujo:** Tap en perfil → S-10 / Tap en contactar → S-13

---

### S-13 · Enviar interés — primer contacto — 📱🌐
El Chooser inicia el contacto. Es el único que puede hacerlo — los Presenters no pueden escribir primero.

**Mecánica:** El Chooser puede añadir un mensaje al enviar su interés (opcional). Si no escribe nada, se envía solo el interés. Sugerencias de mensajes rápidos para reducir la fricción. Confirmación de que el perfil del Chooser permanece anónimo hasta que el Presenter acepte. Una vez enviado, el Presenter lo evaluará con su plantilla de filtrado (el Chooser no sabe cómo funciona esa plantilla).

**Flujo:** Enviar → confirmación visual → volver al deck

---

### S-14 · Match — Capa 2 desbloqueada — 📱🌐
Momento en que el Presenter acepta el contacto. Se desbloquea la Capa 2 del perfil del Presenter.

**Mecánica:** Notificación o pantalla de celebración al producirse el match. Se revelan automáticamente los contenidos de Capa 2: más fotos, información adicional del Presenter. Acceso directo al chat.

**Flujo:** → S-15 (chat)

---

### S-15 · Chat — 📱🌐
Conversación entre Chooser y Presenter tras el match.

**Mecánica:** Interfaz de mensajería estándar. El Chooser puede desde aquí compartir voluntariamente su Capa 3 (información adicional personal) si decide hacerlo. El Presenter también puede compartir su Capa 3. Esta acción es irreversible — una vez compartida, la otra persona ha visto esa información.

**Flujo:** Tras conversación suficiente → S-16 (calificar)

---

### S-16 · Calificar match — 📱🌐
El Chooser puede calificar al Presenter tras una conversación.

**Mecánica:** Score por varias dimensiones (no de texto libre únicamente). Opción de publicar como anónimo. Opción de posponer y que el sistema recuerde. La calificación contribuye al score público del Presenter visible en su perfil.

**Flujo:** → Cierra y vuelve al deck o conversaciones

---

## BLOQUE 3 — Dating · Presenter

---

### S-17 · Crear perfil público — Capa 1 — 📱🌐
El Presenter construye la parte pública de su perfil. La foto es obligatoria — sin foto aprobada el perfil no es visible.

**Mecánica:** La foto pasa por moderación automática (IA). Si es rechazada se informa del motivo y se permite subir otra. El perfil se activa solo cuando hay al menos una foto aprobada. Hay un indicador de progreso porque el perfil tiene tres capas.

**Campos Capa 1:** foto principal (obligatoria) / alias / edad / bio / tags de intereses / idiomas / tipo de relación que busca

**Flujo:** → S-18 (Capa 2) o puede pausar y completar después

---

### S-18 · Perfil — Capa 2 — 📱🌐
Información adicional que solo verán los Choosers tras hacer match.

**Mecánica:** Fotos adicionales (hasta 6, todas pasan por moderación). Información más personal que en la Capa 1. El Presenter sabe que esta información solo se revela tras match.

**Flujo:** → S-19 (Capa 3) o puede pausar

---

### S-19 · Perfil — Capa 3 — 📱🌐
Información muy personal. El Presenter la rellena pero elige cuándo compartirla con cada match de forma individual.

**Mecánica:** Explicación clara de cómo funciona la Capa 3 — nadie la ve hasta que el Presenter decide activamente compartirla. El contenido está cifrado de forma que ni la plataforma puede leerlo. Campos opcionales de contacto adicional e información íntima.

**Flujo:** → S-20 (plantilla de filtrado)

---

### S-20 · Plantilla de filtrado — 📱🌐
El Presenter define reglas automáticas para gestionar los contactos entrantes.

**Mecánica:** Una acción por defecto (qué pasa si ninguna regla coincide: aceptar / archivar / rechazar) y una lista de reglas específicas en orden de prioridad. Cada regla: condición + acción. Las reglas se evalúan en orden — la primera que coincide gana. El Presenter puede reordenar las reglas.

**Condiciones disponibles:** score de reputación del Chooser (por dimensión) / número de interacciones verificadas que tiene / si está verificado / si tiene foto de perfil / antigüedad de su cuenta en días

**Preview en tiempo real:** "Con esta configuración, un Chooser con score 3.5 y verificado sería [aceptado / archivado / rechazado]"

**Flujo:** → Perfil activo y visible

---

### S-21 · Bandeja principal — 📱🌐
Contactos que han pasado el filtro. Llegan con notificación push.

**Mecánica:** Lista de contactos recibidos. Cada contacto muestra el avatar anónimo del Chooser (nunca su foto real), el score de reputación público, el mensaje inicial si lo envió, y el timestamp. El Presenter puede aceptar (responder = match) o gestionar desde aquí. Swipe o acción contextual para archivar, rechazar o bloquear.

**Flujo:** Tap en contacto → S-15 (chat / match) / Swipe → opciones

---

### S-22 · Archivados — 📱🌐
Contactos que la plantilla filtró automáticamente sin notificación.

**Mecánica:** Misma estructura que la bandeja principal pero sin las notificaciones. Badge informativo "archivado automáticamente". El Presenter puede mover cualquier contacto a la bandeja principal (acepta) o rechazarlo definitivamente. Filtros para ordenar por fecha o por score del Chooser.

**Flujo:** Tap en contacto → ver detalle y decidir / Botón "Mover a principal" → match

---

### S-23 · Gestión de relaciones — 📱🌐
Vista de todos los Choosers con los que el Presenter ha interactuado, organizados por estado.

**Mecánica:** Tabs por estado: activos / silenciados / bloqueados. Para los silenciados se muestra el tiempo restante de silencio. El Presenter puede cambiar el estado de cualquier relación desde aquí.

---

### S-24 · Estado de disponibilidad — 📱🌐
El Presenter controla cuándo aparece como disponible para nuevos contactos.

**Mecánica:** Toggle principal de visibilidad. Tres modos: activo (aparece en deck y búsquedas) / ocupado (aparece pero con indicador de ocupado) / invisible (el perfil existe pero no aparece en búsquedas). Opción de programar la disponibilidad por horario semanal.

---

## BLOQUE 4 — Masajes · Presenter

---

### S-25 · Alta del negocio — 🌐
Flujo guiado para dar de alta la ficha de un negocio de masajes. Preferentemente desde web por el espacio disponible.

**Mecánica:** Stepper con pasos claramente diferenciados. En cada paso se puede guardar como borrador y continuar después. Preview en tiempo real de cómo quedará la ficha pública. Al finalizar, la ficha entra en estado "pendiente de verificación".

**Pasos:** Datos básicos / Catálogo de servicios / Fotos / Agenda / Publicar

---

### S-26 · Catálogo de servicios — 🌐
El Presenter define qué servicios ofrece.

**Mecánica:** Lista de servicios con opción de añadir, editar y eliminar. Por cada servicio: nombre, categoría, duración en minutos, precio (o "consultar precio"), tiempo de descanso necesario tras el servicio (el sistema sugiere automáticamente el mismo tiempo que la duración, el Presenter lo puede cambiar), y toggle activo/inactivo. Sección separada para paquetes (combinación de servicios con precio especial).

**Concepto de buffer de descanso:** El tiempo de descanso es invisible para el cliente — simplemente esos minutos no aparecen como disponibles. Un masaje de 60 minutos con 30 minutos de buffer hace que el siguiente hueco disponible empiece 90 minutos después.

---

### S-27 · Galería de fotos — 📱🌐
Subir y ordenar las fotos del local.

**Mecánica:** Grid de fotos con estado de moderación visible para cada una (aprobada / en revisión / rechazada con motivo). Arrastrables para reordenar. La primera foto es la que aparece en las búsquedas. Las fotos con caras de personas son rechazadas automáticamente por el sistema en esta vertical — el diseño debe incluir una guía de qué tipo de fotos subir.

---

### S-28 · Configuración de agenda — 📱🌐
Definir la disponibilidad semanal.

**Mecánica:** Vista de plantilla semanal día a día. Por cada día activo el Presenter define franjas horarias (inicio y fin). El sistema genera automáticamente los slots disponibles para las próximas semanas respetando los tiempos de servicio y descanso. El Presenter puede bloquear días específicos (vacaciones, festivos). Preview de cuántos huecos disponibles quedan esta semana con la configuración actual.

---

### S-29 · Dashboard del Presenter — 📱🌐
Vista de resumen diario para el Presenter de servicios.

**Mecánica:** Información del día de un vistazo: citas pendientes de confirmar (con indicador urgente si las hay), citas confirmadas para hoy, mensajes sin leer. Detalle de la próxima cita. Accesos rápidos a las secciones principales.

---

### S-30 · Agenda — vista día / semana / mes — 📱🌐
Gestión de citas.

**Mecánica:** Vista temporal del calendario con los slots y citas. Al tocar una cita se accede a sus detalles y acciones disponibles según el estado. Los buffers de descanso son visibles para el Presenter (pero no para el cliente). Estados de cita: pendiente de confirmar / confirmada / completada / cancelada / no-show. Cada estado tiene acciones disponibles distintas.

**Acciones por estado:**
- Pendiente → Confirmar / Cancelar
- Confirmada → Marcar completada / Marcar no-show / Cancelar
- Completada → Solo visualización
- No-show → Solo visualización (contribuye al trust score del Chooser)

---

### S-31 · Ficha de cliente — CRM — 📱🌐
Vista completa de un cliente específico del Presenter.

**Mecánica:** El Presenter ve toda la información del cliente en un solo lugar. Los datos personales (nombre, teléfono) solo son visibles si el cliente los ha compartido voluntariamente — y están cifrados, solo accesibles con la sesión activa del Presenter. El resto de la ficha (estadísticas, historial, etiquetas) es visible siempre.

**Información siempre visible:** avatar anónimo / score de reputación público / estadísticas (total citas, completadas, canceladas, no-shows, total gastado) / fechas (primera cita, última, próxima) / etiquetas generadas por IA (tipo de servicio preferido, frecuencia, disponibilidad — sin datos personales) / historial de citas

**Información visible si el cliente compartió:** nombre / teléfono / notas del Presenter

---

### S-32 · Estadísticas CRM — 🌐
Métricas del negocio. Solo web por la densidad de información.

**Mecánica:** Selector de período. KPIs principales en cards: citas totales, tasa de no-show, ingresos, ticket medio, clientes únicos, tasa de retorno. Gráfico de ocupación por día de la semana (para optimizar la plantilla horaria). Top servicios. Los datos de clientes en las estadísticas son siempre anonimizados.

---

## BLOQUE 5 — Masajes · Chooser

---

### S-33 · Búsqueda de servicios — 📱🌐
Pantalla principal del Chooser en la vertical Masajes.

**Mecánica:** Búsqueda basada en ubicación. Dos vistas intercambiables: lista y mapa. Filtros para afinar resultados (tipo de masaje, precio, duración, disponibilidad hoy, solo verificados). En la vista mapa los pins abren un popup con información básica del Presenter. La búsqueda funciona sin login pero los resultados sin login son limitados.

---

### S-34 · Ficha pública del local — 📱🌐
Página de detalle del Presenter de masajes. La versión web de esta pantalla es indexable por buscadores (SEO).

**Mecánica:** Toda la información del Presenter en una sola pantalla. La dirección exacta no se muestra hasta que se produce el contacto — se muestra solo el barrio o zona. El botón de reservar es la acción principal. Las reviews son visibles para cualquiera, sin login.

**Contenido:** galería de fotos / nombre / verificación / distancia / rating y número de reseñas / disponibilidad (próximo hueco) / descripción / catálogo de servicios con precios / paquetes / reviews / mapa de zona (sin dirección exacta)

---

### S-35 · Seleccionar servicio — 📱🌐
El Chooser elige qué servicio quiere reservar.

**Mecánica:** Lista de servicios activos del Presenter con nombre, duración y precio. Expansión para ver descripción completa. Sección de paquetes si los hay. Resumen del seleccionado siempre visible. La duración que ve el Chooser es la del servicio — no incluye el buffer de descanso (ese es interno).

**Flujo:** → S-36

---

### S-36 · Elegir slot — 📱🌐
Seleccionar fecha y hora disponible.

**Mecánica:** Selector de fecha (calendario, máximo 4 semanas hacia adelante). Para cada fecha, los huecos disponibles se muestran como opciones seleccionables. Los huecos ocupados o en buffer no aparecen — el Chooser nunca ve que hay un "descanso" entre citas, simplemente no hay disponibilidad en ese horario. Resumen del total antes de confirmar.

**Flujo:** → S-37

---

### S-37 · Confirmar reserva — 📱🌐
Último paso antes de reservar. Resumen completo.

**Mecánica:** Resumen de todo (servicio, fecha, hora, precio). Campo opcional para dejar una nota al terapeuta. Información de que la cita estará pendiente de confirmación hasta que el Presenter la acepte. Si el Presenter no confirma en 24 horas, la reserva se cancela automáticamente y el Chooser recibe notificación.

**Flujo:** Confirmar → reserva creada / → S-38

---

### S-38 · Mis citas — Chooser — 📱🌐
Lista de todas las citas del Chooser.

**Mecánica:** Tabs próximas / pasadas. Cada cita muestra el estado de forma clara. Las acciones disponibles dependen del estado: una cita pendiente se puede cancelar, una completada se puede calificar. Estado vacío con llamada a la acción de explorar servicios.

**Flujo:** Tap en cita completada → S-39

---

### S-39 · Dejar reseña — Masajes — 📱🌐
El Chooser califica su experiencia con el Presenter.

**Mecánica:** Score por varias dimensiones específicas de la vertical masajes (puntualidad, calidad del servicio, limpieza, precio justo, comunicación). Comentario de texto opcional. Opción de publicar de forma anónima. La reseña contribuye al score público visible en la ficha del Presenter.

---

## BLOQUE 6 — Pantallas comunes

---

### S-40 · Centro de notificaciones — 📱🌐
Historial de todas las notificaciones recibidas.

**Mecánica:** Lista cronológica. Las no leídas tienen tratamiento visual diferenciado. Tipos de notificación: nuevo contacto recibido / match desbloqueado / nuevo mensaje / recordatorio de cita (24h y 2h antes) / cita confirmada o cancelada / nueva reseña recibida. Swipe para marcar como leída o eliminar. Acción para marcar todo como leído.

---

### S-41 · Lista de conversaciones — 📱🌐
Todas las conversaciones activas.

**Mecánica:** Para el Presenter: tabs "Principal" y "Archivados". Para el Chooser: lista única. Preview del último mensaje, timestamp, badge de no leídos. Swipe para archivar, silenciar o bloquear. Buscador en la lista.

---

### S-42 · Chat — 📱🌐
Conversación individual entre dos usuarios.

**Mecánica:** Interfaz de mensajería. La apariencia varía según la vertical: en Dating el contexto es personal, en Masajes puede haber un banner con la cita activa entre los dos. En Dating existe la opción de compartir la Capa 3 desde el chat. En Masajes existe la opción de crear una reserva directamente desde el chat.

---

### S-43 · Mi perfil — 📱🌐
El usuario ve y edita su propia información.

**Mecánica:** La información se organiza por vertical (el usuario puede tener perfiles distintos en Dating y en Masajes). Edición de información por capas en Dating. En la sección de privacidad el usuario puede ver con quién ha compartido su Capa 3 y gestionar eso. Score de reputación propio visible.

---

### S-44 · Ajustes — 📱🌐
Configuración de la cuenta.

**Mecánica:** Secciones: cuenta (cambiar teléfono, cerrar sesión, eliminar cuenta) / notificaciones (toggle por tipo) / apariencia (tema claro/oscuro/automático) / idioma / privacidad / legales / soporte / versión.

---

### S-45 · Denunciar / bloquear — 📱🌐
Flujo de denuncia de un usuario o contenido.

**Mecánica:** Selector de motivo (contenido inapropiado / acoso / perfil falso / spam / menor de edad / otro). Campo descriptivo opcional. Toggle para bloquear también al usuario simultáneamente. Confirmación de que la denuncia fue recibida y será revisada.

---

## BLOQUE 7 — Web exclusivo

---

### S-46 · Landing pública — 🌐
Página de entrada para tráfico orgánico y campañas. SEO prioritario.

**Mecánica:** El tono es "plataforma de conexión" — sin mencionar explícitamente dating en la propuesta de valor principal. Secciones: propuesta de valor / cómo funciona / privacidad como diferenciador / llamada a la acción para descargar la app / sección separada para Presenters ("¿Ofreces servicios? Empieza aquí"). Sin contenido de dating explícito — el dating se descubre dentro de la app.

---

### S-47 · Ficha pública del Presenter — Web SEO — 🌐
Página indexable de cada Presenter de servicios (masajes, coches, etc.). Las fichas de Dating NO son indexables — solo las de verticales de servicios.

**Mecánica:** URL semántica (`/masajes/madrid/centro/nombre-del-local`). Todo el contenido de S-34 más markup semántico para SEO (Schema.org). Breadcrumb de navegación. CTA principal que lleva a descargar la app o reservar directamente si el usuario ya está registrado.

---

### S-48 · Búsqueda pública sin login — 🌐
Resultados de búsqueda accesibles sin registrarse. Para SEO y primer contacto.

**Mecánica:** Resultados limitados sin login (ej: primeros 10). Las fichas individuales sí son accesibles sin login. CTA para registrarse y ver todos los resultados. Mapa con funcionalidad básica sin login.

---

### S-49 · Panel Presenter — escritorio — 🌐
Versión de escritorio del panel del Presenter. Aprovecha el espacio para mostrar más información simultáneamente.

**Mecánica:** Sidebar de navegación lateral persistente. El área principal cambia según la sección. La agenda muestra vista semanal por defecto. Las estadísticas muestran más gráficos a la vez. El CRM de clientes tiene más columnas visibles.

---

### S-50 · Onboarding Presenter web — 🌐
Flujo guiado completo para dar de alta un negocio desde web.

**Mecánica:** Stepper horizontal con los pasos visibles. Formularios más completos que en móvil. Preview en tiempo real de la ficha. Posibilidad de guardar borrador en cualquier paso. Al finalizar: ficha en estado "pendiente de verificación" con instrucciones claras de qué pasa a continuación.

---

## Resumen y prioridad de diseño

**50 pantallas en total**

| Bloque | Pantallas | Total |
|--------|-----------|-------|
| Onboarding | S-01 a S-05 | 5 |
| Dating Chooser | S-06 a S-16 | 11 |
| Dating Presenter | S-17 a S-24 | 8 |
| Masajes Presenter | S-25 a S-32 | 8 |
| Masajes Chooser | S-33 a S-39 | 7 |
| Comunes | S-40 a S-45 | 6 |
| Web exclusivo | S-46 a S-50 | 5 |

---

### Orden de trabajo recomendado

**Fase 1 — Style guide y componentes**
Antes de diseñar ninguna pantalla. Define el sistema visual que luego se aplica a todo.

**Fase 2 — Flujos críticos del MVP**
Las pantallas sin las cuales no se puede validar el producto:
S-01, S-02, S-03, S-04, S-05, S-09, S-10, S-13, S-14, S-15, S-33, S-34, S-35, S-36, S-37, S-29, S-30

**Fase 3 — Flujos completos**
S-06, S-07, S-08, S-11, S-12, S-16, S-17, S-18, S-20, S-21, S-22, S-38, S-39, S-40, S-41, S-42, S-43, S-44, S-45, S-46, S-47, S-48

**Fase 4 — Pantallas avanzadas**
S-19, S-23, S-24, S-25, S-26, S-27, S-28, S-31, S-32, S-49, S-50
