
export interface Adjudicado {
  id_adjudicado: number;
  contrato_fk: string;
  codigo_fk: number;
  cantidad_minima: number;
  cantidad_maxima: number;
  cantidad_consumida: number;
  cantidad_disponible: number;
  estatus_cantidad: string;
  precio_unitario: number;
  iva: number;
  ieps: number;
  importe_maximo: number;
}

export interface Articulo {
  codigo: number;
  descripcion_articulo: string;
  unidad_medida: string;
  partida_especifica: number;
  precio_medio: number | string;
  ultima_fecha: string;
  estatus: string | null;
  imagen_producto: string | null;
}

export interface Contrato {
  id_contrato: number;
  licitacion_fk: string;
  contrato: string;
  proveedor_fk: string;
  monto_maximo: number;
  inicio_vigencia: string;
  fin_vigencia: string;
}

export interface Licitacion {
  id_licitacion: number;
  licitacion: string;
  denominacion: string;
  bases_pdf: string | null;
  fecha_convocatoria: string | null;
  aclaracion_dudas_pdf: string | null;
  fecha_dudas: string | null;
  apertura_propuestas_pdf: string | null;
  fecha_apertura: string | null;
  acta_fallo_pdf: string | null;
  fecha_fallo: string | null;
}

export interface Proveedor {
  id_proveedor: number;
  proveedor: string;
  domicilio: string;
  ciudad: string;
  correo_electronico: string | null;
  telefono: string | null;
  giro_comercial: string;
  logotipo_imagen: string;
}

export interface Usuario {
  rud: number;
  nombre: string;
  contrasena: number;
  correo_electronico: string | null;
  rol: string;
}
