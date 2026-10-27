import { colores } from '../styles/tokens.js'

const ESTADOS = {
  PENDIENTE: {
    valor: 'PENDIENTE',
    etiqueta: 'Pendiente',
    fondo: colores.advertenciaFondo,
    texto: colores.advertenciaTexto
  },
  CONFIRMADO: {
    valor: 'CONFIRMADO',
    etiqueta: 'Confirmado',
    fondo: colores.mint,
    texto: colores.secundario
  },
  EN_PREPARACION: {
    valor: 'EN_PREPARACION',
    etiqueta: 'En preparación',
    fondo: colores.superficie,
    texto: colores.texto
  },
  LISTO: {
    valor: 'LISTO',
    etiqueta: 'Listo',
    fondo: colores.exitoFondo,
    texto: colores.exitoTexto
  },
  ENTREGADO: {
    valor: 'ENTREGADO',
    etiqueta: 'Entregado',
    fondo: colores.superficie,
    texto: colores.textoSuave
  },
  CANCELADO: {
    valor: 'CANCELADO',
    etiqueta: 'Cancelado',
    fondo: colores.errorFondo,
    texto: colores.errorTexto
  }
}

export const ESTADOS_PEDIDO = Object.values(ESTADOS)

export const ESTADOS_ACTIVOS = ESTADOS_PEDIDO.filter(
  estado => estado.valor !== 'ENTREGADO' && estado.valor !== 'CANCELADO'
)

const SIGUIENTE = {
  PENDIENTE: 'CONFIRMADO',
  CONFIRMADO: 'EN_PREPARACION',
  EN_PREPARACION: 'LISTO',
  LISTO: 'ENTREGADO'
}

const TIPOS_SERVICIO = {
  MESA: 'En mesa',
  DOMICILIO: 'Domicilio',
  PARA_LLEVAR: 'Para llevar'
}

export function normalizarEstado(estado) {
  return String(estado || '').trim().toUpperCase()
}

export function infoEstado(estado) {
  const clave = normalizarEstado(estado)
  return ESTADOS[clave] || {
    valor: clave,
    etiqueta: clave || 'Sin estado',
    fondo: colores.superficie,
    texto: colores.textoSuave
  }
}

export function etiquetaEstado(estado) {
  return infoEstado(estado).etiqueta
}

export function esEstadoFinal(estado) {
  const clave = normalizarEstado(estado)
  return clave === 'ENTREGADO' || clave === 'CANCELADO'
}

export function siguienteEstado(estado) {
  return SIGUIENTE[normalizarEstado(estado)] || null
}

export function etiquetaTipoServicio(tipo) {
  return TIPOS_SERVICIO[normalizarEstado(tipo)] || 'Pedido'
}

export function contarProductos(pedido) {
  const items = Array.isArray(pedido?.items) ? pedido.items : []
  return items.reduce((total, item) => total + (Number(item?.cantidad) || 0), 0)
}

export function describirProductos(pedido) {
  const items = Array.isArray(pedido?.items) ? pedido.items : []
  if (items.length === 0) return 'Sin productos'
  return items
    .map(item => `${Number(item?.cantidad) || 0}x ${item?.nombre || 'Producto'}`)
    .join(' · ')
}
