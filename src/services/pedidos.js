import api from './api.js'

/**
 * Servicio de pedidos como invitado.
 *
 * El backend es la autoridad: el frontend solo envía los datos
 * y muestra los resultados. Ningún importe se calcula aquí.
 */
export async function crearPedidoInvitado(datos) {
  const params = new URLSearchParams()
  params.append('nombre', datos.nombre)
  params.append('telefono', datos.telefono)
  params.append('tipoServicio', datos.tipoServicio)
  if (datos.direccion) params.append('direccion', datos.direccion)
  if (datos.referencia) params.append('referencia', datos.referencia)
  if (datos.sucursalId) params.append('sucursalId', datos.sucursalId)
  // RF016: correo opcional para recibir los cambios de estado.
  if (datos.correo) params.append('correo', datos.correo)

  const response = await api.post('/api/pedidos/invitado', params)
  return response.data
}

export async function agregarItemPedido(pedidoId, item) {
  const params = new URLSearchParams()
  params.append('productoId', item.producto.id)
  params.append('cantidad', item.cantidad)
  if (item.opciones?.length) {
    item.opciones.forEach(o => params.append('opcionIds', o.id))
  }
  if (item.observaciones) params.append('observaciones', item.observaciones)

  const response = await api.post(`/api/pedidos/${pedidoId}/items`, params)
  return response.data
}

export async function obtenerResumenPedido(pedidoId) {
  const response = await api.get(`/api/pedidos/${pedidoId}/resumen`)
  return response.data
}

export async function confirmarPedido(pedidoId, { propina, cuponCodigo }) {
  const params = new URLSearchParams()
  if (propina?.tipo === 'porcentaje' && Number(propina.porcentaje) > 0) {
    params.append('propinaTipo', 'PORCENTAJE')
    params.append('propinaPorcentaje', propina.porcentaje)
  } else if (Number(propina?.valor) > 0) {
    params.append('propinaTipo', 'PERSONALIZADA')
    params.append('propinaValor', propina.valor)
  }
  if (cuponCodigo) params.append('cuponCodigo', cuponCodigo)

  const response = await api.post(`/api/pedidos/${pedidoId}/confirmar`, params)
  return response.data
}

export async function obtenerOpcionesProducto(productoId) {
  const response = await api.get(`/api/productos/${productoId}/opciones`)
  return response.data
}

export async function obtenerSugerencias(productoId, { sucursalId, excluir = [] } = {}) {
  const params = new URLSearchParams()
  params.append('productoId', productoId)
  if (sucursalId) params.append('sucursalId', sucursalId)
  excluir.filter(Boolean).forEach(id => params.append('excluir', id))
  const response = await api.get(`/api/sugerencias?${params.toString()}`)
  return response.data
}

export async function validarCupon(codigo, subtotal) {
  const params = new URLSearchParams({ codigo })
  if (subtotal != null) params.append('subtotal', subtotal)
  const response = await api.post('/api/cupones/validar', params)
  return response.data
}

export async function listarPedidosActivos() {
  const response = await api.get('/api/pedidos/activos')
  return response.data
}

export async function registrarPedidoManual(datos) {
  const response = await api.post('/api/pedidos/manual', datos)
  return response.data
}

export async function actualizarEstadoPedido(pedidoId, estado, motivo) {
  // RF009 + RF033: la cancelación va por su propio endpoint y exige motivo.
  if (estado === 'CANCELADO') return cancelarPedido(pedidoId, motivo)
  const response = await api.put(`/api/pedidos/${pedidoId}/estado`, null, {
    params: { estado }
  })
  return response.data
}

/** Cancela un pedido (personal o el propio cliente) indicando el motivo. */
export async function cancelarPedido(pedidoId, motivo) {
  const response = await api.post(`/api/pedidos/${pedidoId}/cancelar`, null, {
    params: { motivo }
  })
  return response.data
}

/** RF010: historial de pedidos del cliente que inició sesión. */
export async function listarMisPedidos() {
  const response = await api.get('/api/pedidos/mis-pedidos')
  return Array.isArray(response.data) ? response.data : []
}

export async function obtenerMenuPorMesa(codigoMesa) {
  const response = await api.get('/api/menu', { params: { mesa: codigoMesa } })
  return response.data
}
