import api from './api.js'

/** RF032: reembolsos a Nequi o tarjeta (solo administradores). */
export async function listarReembolsos() {
  const response = await api.get('/api/reembolsos')
  return Array.isArray(response.data) ? response.data : []
}

export async function listarPendientesDeReembolso() {
  const response = await api.get('/api/reembolsos/pendientes')
  return Array.isArray(response.data) ? response.data : []
}

export async function registrarReembolso(pedidoId, datos) {
  const response = await api.post(`/api/pedidos/${pedidoId}/reembolsos`, datos)
  return response.data
}

export async function actualizarEstadoReembolso(reembolsoId, estado, referencia) {
  const response = await api.put(`/api/reembolsos/${reembolsoId}/estado`, null, {
    params: referencia ? { estado, referencia } : { estado }
  })
  return response.data
}

export async function enviarComprobanteReembolso(reembolsoId, correo, pdf, nombre) {
  const datos = new FormData()
  datos.append('correo', correo)
  datos.append('archivo', pdf, nombre)
  const response = await api.post(`/api/reembolsos/${reembolsoId}/enviar`, datos)
  return response.data
}
