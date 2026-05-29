export interface Madrid69ApiProfile {
  id?: number;
  nombre?: string;
  edad?: number;
  descripcion?: string;
  ciudad?: string;
  zona?: string;
  telefono?: string;
  whatsapp?: string;
  verificado?: boolean;
  vip?: boolean;
  nacionalidad?: string;
  altura?: number;
  peso?: number;
  medidas?: string;
  idiomas?: string[];
  fotos?: Array<{ ruta?: string; thumbnail?: string }>;
  servicios?: Array<{ id?: number; nombre?: string; slug?: string }>;
  tarifas?: Array<{ duracion?: number; precio?: number; modalidad?: string }>;
}

export interface Madrid69Photo {
  src: string;
}

export interface Madrid69Payload {
  sourceId: string;
  sourceUrl: string;
  title?: string;
  nickname?: string;
  bio?: string;
  phone?: string;
  whatsappPhone?: string;
  photos: Madrid69Photo[];
  city?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  nationality?: string;
  languages?: string[];
  isVerified: boolean;
  isVip: boolean;
  services?: string[];
}
