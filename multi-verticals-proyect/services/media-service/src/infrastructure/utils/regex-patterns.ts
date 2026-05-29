export const PHONE_REGEX = /(?:\+34|0034|\b34)?[ -.]?\b[6789](?:[ -.]?\d){8}\b/g;

// Expresión regular general para números de teléfono internacionales
export const INTERNATIONAL_PHONE_REGEX =
  /(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;

// Expresión regular estándar RFC 5322 para correos electrónicos
export const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Expresión regular para URLs con o sin esquema HTTP/HTTPS
export const URL_REGEX =
  /\b(?:https?:\/\/|www\.)[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{2,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)|[-a-zA-Z0-9@:%._+~#=]{1,256}\.(?:com|es|net|org|info|co|eu|online|club|click|top|site|xyz|cat|pro)\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;

export interface BrandPattern {
  readonly name: string;
  readonly patterns: readonly RegExp[];
}

export const BRAND_DICTIONARY: readonly BrandPattern[] = [
  {
    name: 'Idealista',
    patterns: [/idealista/i, /idealista\.com/i],
  },
  {
    name: 'MilAnuncios',
    patterns: [/milanuncios/i, /milanuncios\.com/i],
  },
  {
    name: 'Wallapop',
    patterns: [/wallapop/i, /wallapop\.com/i],
  },
  {
    name: 'MileScorts',
    patterns: [/milescorts/i, /milescorts\.com/i],
  },
  {
    name: 'bluemove',
    patterns: [
      /bluemove/i,
      /bluemove\.com/i,
      /b\s*l\s*u\s*e\s*m\s*o\s*v\s*e/i,
      /l\s*u\s*e\s*m\s*o\s*v\s*e/i,
      /l\s*u\s*e\s*m\s*o\s*y\s*e/i,
      /l\s*u\s*e\s*[i1]\s*[0o]\s*[yv]/i, // Captura el patrón "LUE I 0 Y" del OCR
    ],
  },
  {
    name: 'chicasmalas',
    patterns: [
      /chicasmalas/i,
      /chicasmalas\.es/i,
      /chicas?ma[j-l]as/i, // Captura "CHICASMAJASES" por deformación OCR
      /cicasmalas/i, // Captura "cicasmalas" por falta de 'h'
    ],
  },
  {
    name: 'ardienteplacer',
    patterns: [
      /ardienteplacer/i,
      /ardienteplacer\.com/i,
      /ardiente\s*placer/i,
      /ardie\s*nie/i,
      /ar[cd]ie[nt]/i, // Captura "arcie", "ardie", "ardiente" por aberración OCR
    ],
  },
  {
    name: 'ErosGuia',
    patterns: [
      /erosguia/i,
      /erosguia\.com/i,
      /eros\s*guia/i,
      /eros[ -.]?gu[i1][a4]/i, // Captura "erosguia" con desvíos OCR comunes (i->1, a->4)
      /o[r0o]os[ -.]?[qy986][u1lL][i1l][a4]/i, // Captura "orosyLia" del OCR
      /os[c0o][ -.]?[lL1iI][iI1eE][a4eE]/i, // Captura "OSC LIE" del OCR
      /di[1l]=[1l]/i, // Captura "dil=l" del OCR
      /[2e][6r][0o][5s][0og]/i, // Captura "26050" (deformación de "erosg") del OCR
    ],
  },
  {
    name: 'TopEscort',
    patterns: [/topescort/i, /topescortbabes/i],
  },
  {
    name: 'Fotocasa',
    patterns: [/fotocasa/i, /fotocasa\.es/i],
  },
  {
    name: 'Habitaclia',
    patterns: [/habitaclia/i, /habitaclia\.com/i],
  },
  {
    name: 'EscortAdvisor',
    patterns: [
      /escortadvisor/i,
      /escort-advisor/i,
      /escortadvisor\.com/i,
      /escortadvisor\.es/i,
      /escort[ -.]?advisor/i,
      /escort[ -.]?ad[vui1lL]+[s5][eo0]r/i, // Captura "escortadulsor", "escortaduisor", etc.
      /cort[ -.]?ad[vui1lL]+/i, // Captura "cortadvis" del OCR (recorte de escortadvisor)
      /rt[a\s]+dvis[eo0]/i, // Captura "rta dviso" del OCR (recorte de escortadvisor)
    ],
  },
  {
    name: 'EuroGirlsEscort',
    patterns: [
      /eurogirlsescort/i,
      /eurogirlsescort\.com/i,
      /euro[ -.]?girls?[ -.]?escort/i,
      /euro[ -.]?girls?/i,
      /uro[ -.]?girls?[ -.]?escort/i, // Captura "uro Girls Escort" cuando el brazo tapa la 'E'
      /uro[a-zA-Z\s|]{3,12}scop/i, // Captura "uroCLg Le SCOP" por deformación extrema OCR
      /uroCLg/i, // Captura "uroCLg" como firma única de deformación
      /euro[a-zA-Z\s|]{1,12}na[ -.]?n[ -.]?[sS]/i, // Captura "Euro Na N S" del OCR
      /e[ -.]?as[ -.]?[|1lL\s]+[s5S][cCo0][o0rR]+/i, // Captura "E AS | scor" del OCR
      /[eE3uUroO0]+[a-zA-Z\s|]{1,15}sc[oO0]r/i, // Captura "Euro ... scor", "E AS | scor", etc. del OCR
    ],
  },
];
