import api from './api.js'

export async function obtenerPago(pedidoId) {
  const response = await api.get(`/api/pedidos/${pedidoId}/pago`)
  return response.data
}

export async function seleccionarMetodoPago(pedidoId, metodo) {
  const response = await api.put(`/api/pedidos/${pedidoId}/pago/metodo`, null, {
    params: { metodo }
  })
  return response.data
}

export async function registrarMontoEfectivo(pedidoId, montoRecibido) {
  const response = await api.put(`/api/pedidos/${pedidoId}/pago/efectivo`, null, {
    params: { montoRecibido }
  })
  return response.data
}

export async function confirmarPago(pedidoId) {
  const response = await api.post(`/api/pedidos/${pedidoId}/pago/confirmar`)
  return response.data
}

export async function cancelarPago(pedidoId) {
  const response = await api.post(`/api/pedidos/${pedidoId}/pago/cancelar`)
  return response.data
}

export async function registrarPagoEnLinea(pedidoId, monto, referencia, anticipo = false) {
  const params = new URLSearchParams()
  params.append('monto', String(monto))
  params.append('referencia', referencia)
  params.append('anticipo', String(anticipo))

  const response = await api.post(`/api/pedidos/${pedidoId}/pago/en-linea`, params)
  return response.data
}

