import api from './api.js'

/** RF044: horarios de servicio por sucursal. */
export async function obtenerHorarios(sucursalId) {
  const response = await api.get(`/api/horarios/sucursal/${sucursalId}`)
  return response.data
}

export async function guardarHorarios(sucursalId, horarios) {
  const response = await api.put(`/api/horarios/sucursal/${sucursalId}`, horarios)
  return response.data
}
