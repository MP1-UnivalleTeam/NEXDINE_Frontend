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
  RECHAZADO: 'RECHAZADO',
  CANCELADO: 'CANCELADO'
}

export function normalizarEstadoPago(estado) {
  const clave = String(estado || '').trim().toUpperCase()
  if (!clave) return 'SIN_PAGO'
  return ALIAS_ESTADO[clave] || clave
}

export function estaPagado(estado) {
  return normalizarEstadoPago(estado) === 'APROBADO'
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
  PAGO_EN_LINEA: {
    valor: 'PAGO_EN_LINEA',
    etiqueta: 'Pago en línea',
    descripcion: 'Pago anticipado con la pasarela del restaurante.'
  },
  EFECTIVO: {
    valor: 'EFECTIVO',
    etiqueta: 'Efectivo',
    descripcion: 'Pagas en efectivo al recoger tu pedido.'
  },
  CONTRA_ENTREGA: {
    valor: 'CONTRA_ENTREGA',
    etiqueta: 'Contra entrega',
    descripcion: 'Pagas al recibir tu pedido a domicilio.'
  }
}

const METODOS_POR_SERVICIO = {
  DOMICILIO: ['PAGO_EN_LINEA', 'CONTRA_ENTREGA'],
  PARA_LLEVAR: ['PAGO_EN_LINEA', 'EFECTIVO']
}

export function metodosPagoParaServicio(tipoServicio) {
  const claves = METODOS_POR_SERVICIO[tipoServicio] || METODOS_POR_SERVICIO.PARA_LLEVAR
  return claves.map(clave => METODOS_PAGO[clave])
}

export function etiquetaMetodoPago(metodo) {
  return METODOS_PAGO[String(metodo || '').toUpperCase()]?.etiqueta || 'Sin seleccionar'
}

export function esPagoEnLinea(metodo) {
  return String(metodo || '').toUpperCase() === 'PAGO_EN_LINEA'
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
    pagoCambio: pedido.pagoCambio || 0
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
  } else if (lista.some(pedido => ['RECHAZADO', 'CANCELADO'].includes(normalizarEstadoPago(pedido.pagoEstado)))) {
    estado = 'RECHAZADO'
  } else if (lista.some(pedido => pedido.pagoEstado)) {
    estado = 'PENDIENTE'
  }

  return { cantidad: lista.length, total, pagados, pendientes, estado }
}
