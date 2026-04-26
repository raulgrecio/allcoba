# 📘 Sinkova - Brand & UI Guide

Este documento define la identidad de marca (Brand Identity) y las bases visuales de **Sinkova**, una plataforma web orientada a conexiones modernas y fluidas.

---

## 1. 🧬 Identidad de Marca (Brand Image)

### Nombre y Concepto: **Sinkova**
El nombre evoca la palabra *Sync* (sincronizar) y añade un sufijo que le otorga una sonoridad internacional, premium y algo misteriosa. Sinkova no es solo una plataforma de citas; es un ecosistema de conexiones perfectamente sincronizadas.

### Tono de Voz (Tone of Voice)
*   **Directo pero Elegante:** Sin adornos innecesarios. "Descubre perfiles" en lugar de "¡Mira toda esta gente increíble!".
*   **Misterioso y Exclusivo:** El Dark Mode refuerza la sensación de que el usuario está en un entorno privado, seguro y premium.
*   **Empático:** Respeta la privacidad y se comunica de forma respetuosa durante la mensajería y la gestión de la cuenta.

### Concepto de Logo
Un logotipo minimalista. Puede ser un *Wordmark* (solo texto) utilizando la fuente principal en su peso más grueso (Bold o ExtraBold), con un ligero ajuste en el *kerning* (espaciado entre letras).
*   **Isotipo (Símbolo):** Una abstracción minimalista de la letra "S", formada por dos líneas fluidas que se entrelazan o sincronizan, representando la conexión entre dos personas.

---

## 2. 🌌 Principios de Diseño Visual

1. **Dark-Mode First:** Entorno inmersivo (`bg-base`) para resaltar el contenido visual.
2. **Escalabilidad Moderna:** Descartamos los píxeles duros. Usamos medidas relativas (`rem`, `em`, `vh`, `vw`) para garantizar que la interfaz fluya y se adapte a cualquier densidad de pantalla y preferencias de accesibilidad del usuario.
3. **UGC Safe (Contenido de Usuario Seguro):** Toda fotografía está controlada por contenedores y degradados protectores.

---

## 3. 🎨 Sistema de Color (Design Tokens)

### Backgrounds & Surfaces
| Token | Hex | Uso |
| :--- | :--- | :--- |
| `bg-base` | `#09090B` | Fondo principal de la aplicación. |
| `bg-surface` | `#18181B` | Tarjetas de perfil, modales. |
| `bg-surface-hover` | `#27272A` | Estado interactivo (*hover*). |

### Brand Accents (Colores Sinkova)
| Token | Hex | Uso |
| :--- | :--- | :--- |
| `brand-primary` | `#6366F1` | Indigo vibrante. Principal acción, links, logo. |
| `brand-secondary` | `#EC4899` | Rosa eléctrico. Alertas, insignias premium. |

### Typography Colors
| Token | Hex | Uso |
| :--- | :--- | :--- |
| `text-high` | `#FAFAFA` | Títulos, información clave. |
| `text-medium` | `#A1A1AA` | Descripciones, texto de soporte. |

---

## 4. ✍️ Tipografía (Escala Relativa)

Asumiendo un tamaño base (root) estándar donde `1rem = 16px`.

*   **Fuente Principal:** `Inter` o `Plus Jakarta Sans`.

| Elemento | Peso | Tamaño (`rem`) | Line Height (`em`) | Uso |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | SemiBold (600) | `2rem` | `1.2em` | Títulos de página. |
| **H2** | SemiBold (600) | `1.5rem` | `1.3em` | Nombres en perfiles detallados. |
| **H3** | Medium (500) | `1.125rem` | `1.4em` | Títulos de tarjetas en el Grid. |
| **Body** | Regular (400) | `1rem` | `1.5em` | Biografías, mensajes. |
| **Caption** | Medium (500) | `0.875rem` | `1.4em` | Edad, ubicación, fechas. |

---

## 5. 🧩 Componentes y Espaciado Moderno

Todo el espaciado (margins, paddings) se define en incrementos de `0.25rem` (escala basada en 4).

### 5.1 Tarjetas de Perfil (Profile Grid Card)
*   **Proporción:** `aspect-ratio: 3/4` (Evitamos alturas fijas, la tarjeta crece según el Grid).
*   **Border Radius:** `1rem` (Suave y moderno).
*   **Protección UGC (Scrim):** `background: linear-gradient(to top, rgba(9,9,11, 0.9) 0%, rgba(9,9,11, 0) 100%)`.
*   **Hover State:** `transform: scale(1.02); transition: transform 0.2s ease-out;` (Escala sutil, no exagerada).

### 5.2 Botones
*   **Padding:** `0.75rem 1.5rem` (Asegura un área táctil/clic cómoda).
*   **Border Radius:** `0.5rem` (Para botones rectangulares modernos) o `2rem` (Si se requiere un estilo más fluido).
*   **Tipografía del Botón:** `font-weight: 500; font-size: 1rem;`

### 5.3 Navegación (Sidebar Web)
*   **Ancho Fijo Fluido:** `width: clamp(16rem, 20vw, 20rem)` (Asegura que el menú no sea ni muy estrecho en laptops ni excesivamente ancho en monitores ultra-wide).
*   **Padding de Items:** `0.5rem 1rem`.
*   **Separador (Gap):** `1.5rem` entre secciones principales del menú.

---

## 6. 🔣 Iconografía

*   **Librería:** **Lucide Icons**.
*   **Tamaño Base:** `1.5rem` (Escala con la tipografía).
*   **Grosor (Stroke Width):** `1.5` relativo (para mantener elegancia y limpieza).
*   **Interacción:** Los iconos inactivos usan `text-medium`. En estado activo, pueden rellenarse (Solid) con color `brand-primary`.
