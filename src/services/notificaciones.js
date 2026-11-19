import api from './api.js'

/**
 * Notificaciones del personal (por ejemplo, pago confirmado).
 * El backend las genera al confirmar un pago y las filtra por sucursal.
 */
export async function listarNotificaciones() {
  const response = await api.get('/api/notificaciones')
  return response.data
}
