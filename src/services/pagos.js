import api from './api.js'

/**
 * Pagos de un pedido.
 *
 * El backend es la única autoridad sobre el total, el monto recibido y el
 * cambio. El frontend únicamente envía el método y el monto entregado por el
 * cliente; nunca calcula el cambio ni confirma un pago por su cuenta.
 */
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
