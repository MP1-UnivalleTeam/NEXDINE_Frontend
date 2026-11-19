import api from './api.js'

/**
 * Consulta y creación de pedidos por tipo de servicio.
 *
 * Endpoints reales:
 *   /api/cocina/pedidos
 *   /api/para-llevar/pedidos
 *   /api/domicilios/pedidos
 *
 * Las listas requieren sesión de personal; el backend aplica el ámbito del
 * restaurante/sucursal. La creación de para llevar y domicilio está abierta,
 * igual que el flujo de invitado, y registra el pedido en la sesión actual.
 */

function construirParams(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.estado) params.append('estado', filtros.estado)
  if (filtros.pagoEstado) params.append('pagoEstado', filtros.pagoEstado)
  if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde)
  if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta)
  if (filtros.cliente) params.append('cliente', filtros.cliente)
  if (filtros.sucursalId) params.append('sucursalId', filtros.sucursalId)
  return params
}

export async function listarPedidosCocina({ estado, sucursalId } = {}) {
  const params = new URLSearchParams()
  if (estado) params.append('estado', estado)
  if (sucursalId) params.append('sucursalId', sucursalId)

  const response = await api.get('/api/cocina/pedidos', { params })
  return response.data
}

export async function actualizarEstadoCocina(pedidoId, estado) {
  const response = await api.put(`/api/cocina/pedidos/${pedidoId}/estado`, null, {
    params: { estado }
  })
  return response.data
}

export async function listarPedidosParaLlevar(filtros = {}) {
  const response = await api.get('/api/para-llevar/pedidos', {
    params: construirParams(filtros)
  })
  return response.data
}

export async function listarPedidosDomicilio(filtros = {}) {
  const response = await api.get('/api/domicilios/pedidos', {
    params: construirParams(filtros)
  })
  return response.data
}

export async function obtenerPedidoParaLlevar(pedidoId) {
  const response = await api.get(`/api/para-llevar/pedidos/${pedidoId}`)
  return response.data
}

export async function obtenerPedidoDomicilio(pedidoId) {
  const response = await api.get(`/api/domicilios/pedidos/${pedidoId}`)
  return response.data
}

export async function crearPedidoParaLlevar(datos) {
  const response = await api.post('/api/para-llevar/pedidos', datos)
  return response.data
}

export async function crearPedidoDomicilio(datos) {
  const response = await api.post('/api/domicilios/pedidos', datos)
  return response.data
}
