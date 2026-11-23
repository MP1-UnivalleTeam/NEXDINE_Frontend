import { colores } from '../styles/tokens.js'

export const ESTADOS_PAGO = {
  SIN_PAGO: {
    valor: 'SIN_PAGO',
    etiqueta: 'Sin pago',
    fondo: colores.superficie,
    texto: colores.textoSuave
  },
  PENDIENTE: {
    valor: 'PENDIENTE',
    etiqueta: 'Pago pendiente',
    fondo: colores.advertenciaFondo,
    texto: colores.advertenciaTexto
  },
  PARCIAL: {
    valor: 'PARCIAL',
    etiqueta: 'Pago parcial',
    fondo: colores.advertenciaFondo,
    texto: colores.advertenciaTexto
  },
  APROBADO: {
    valor: 'APROBADO',
    etiqueta: 'Pagado',
    fondo: colores.exitoFondo,
    texto: colores.exitoTexto
  },
  RECHAZADO: {
    valor: 'RECHAZADO',
    etiqueta: 'Pago rechazado',
    fondo: colores.errorFondo,
    texto: colores.errorTexto
  },
  CANCELADO: {
    valor: 'CANCELADO',
    etiqueta: 'Pago cancelado',
    fondo: colores.errorFondo,
    texto: colores.errorTexto
  }
}

const ALIAS_ESTADO = {
  PAGADO: 'APROBADO',
  APROBADO: 'APROBADO',
  PENDIENTE: 'PENDIENTE',
  PARCIAL: 'PARCIAL',
  RECHAZADO: 'RECHAZADO',
  CANCELADO: 'CANCELADO'
}

const ETIQUETAS_METODO_ANTERIOR = {
  ONLINE: 'Pago en línea',
  CONTRA_ENTREGA: 'Método anterior'
}

export function normalizarEstadoPago(estado) {
  const clave = String(estado || '').trim().toUpperCase()
  if (!clave) return 'SIN_PAGO'
  return ALIAS_ESTADO[clave] || clave
}

export function estaPagado(estado) {
  return normalizarEstadoPago(estado) === 'APROBADO'
}

export function pagoCancelable(estado) {
  return ['PENDIENTE', 'PARCIAL'].includes(normalizarEstadoPago(estado))
}

export function infoEstadoPago(estado) {
  const clave = normalizarEstadoPago(estado)
  return ESTADOS_PAGO[clave] || {
    valor: clave,
    etiqueta: clave.replaceAll('_', ' ').toLowerCase(),
    fondo: colores.superficie,
    texto: colores.textoSuave
  }
}

export const METODOS_PAGO = {
  EFECTIVO: {
    valor: 'EFECTIVO',
    etiqueta: 'Efectivo',
    descripcion: 'Pago en efectivo al recibir o recoger el pedido.'
  },
  TARJETA: {
    valor: 'TARJETA',
    etiqueta: 'Tarjeta',
    descripcion: 'Pago con tarjeta débito o crédito.'
  },
  TRANSFERENCIA: {
    valor: 'TRANSFERENCIA',
    etiqueta: 'Transferencia',
    descripcion: 'Transferencia bancaria; el pago se confirma al verificarla.'
  },
  PAGO_EN_LINEA: {
    valor: 'PAGO_EN_LINEA',
    etiqueta: 'Pago en línea',
    descripcion: 'Pago en línea; para domicilio requiere pago anticipado.'
  },
  CONTRA_ENTREGA: {
    valor: 'CONTRA_ENTREGA',
    etiqueta: 'Contra entrega',
    descripcion: 'Pagas al recibir tu pedido a domicilio.'
  }
}

const METODOS_POR_SERVICIO = {
  DOMICILIO: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'PAGO_EN_LINEA', 'CONTRA_ENTREGA'],
  PARA_LLEVAR: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'PAGO_EN_LINEA']
}

export function metodosPagoParaServicio(tipoServicio) {
  const claves = METODOS_POR_SERVICIO[tipoServicio] || METODOS_POR_SERVICIO.PARA_LLEVAR
  return claves.map(clave => METODOS_PAGO[clave])
}

export function etiquetaMetodoPago(metodo) {
  const clave = String(metodo || '').trim().toUpperCase()
  return METODOS_PAGO[clave]?.etiqueta
    || ETIQUETAS_METODO_ANTERIOR[clave]
    || 'Sin seleccionar'
}

export function esPagoEnLinea(metodo) {
  return String(metodo || '').trim().toUpperCase() === 'PAGO_EN_LINEA'
}

export function esBackendPagoNoDisponible(err) {
  return [404, 405, 501].includes(err?.response?.status)
}

export function pagoDesdePedido(pedido) {
  if (!pedido) return null
  return {
    id: pedido.id,
    numeroSeguimiento: pedido.numeroSeguimiento,
    estado: pedido.estado,
    tipoServicio: pedido.tipoServicio,
    total: pedido.total,
    pagoMetodo: pedido.pagoMetodo || '',
    pagoEstado: pedido.pagoEstado || '',
    pagoImporteRecibido: pedido.pagoImporteRecibido || 0,
    pagoCambio: pedido.pagoCambio || 0,
    pagoReferencia: pedido.pagoReferencia || '',
    pagoAnticipo: Boolean(pedido.pagoAnticipo)
  }
}

export function resumirPagosMesa(pedidos) {
  const lista = Array.isArray(pedidos) ? pedidos : []
  const total = lista.reduce((suma, pedido) => suma + Number(pedido.total || 0), 0)
  const pagados = lista.filter(pedido => estaPagado(pedido.pagoEstado)).length
  const pendientes = lista.length - pagados

  let estado = 'SIN_PAGO'
  if (lista.length > 0 && pendientes === 0) {
    estado = 'APROBADO'
  } else if (lista.some(pedido => normalizarEstadoPago(pedido.pagoEstado) === 'PENDIENTE')) {
    estado = 'PENDIENTE'
  } else if (lista.some(pedido => normalizarEstadoPago(pedido.pagoEstado) === 'PARCIAL')) {
    estado = 'PARCIAL'
  } else if (lista.some(pedido => ['RECHAZADO', 'CANCELADO'].includes(normalizarEstadoPago(pedido.pagoEstado)))) {
    estado = 'RECHAZADO'
  } else if (lista.some(pedido => pedido.pagoEstado)) {
    estado = 'PENDIENTE'
  }

  return { cantidad: lista.length, total, pagados, pendientes, estado }
}
