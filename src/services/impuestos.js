import api from './api.js'

/**
 * Configuración de impuestos del restaurante.
 *
 * Contrato real del backend:
 *   GET   /api/impuestos/configuracion        (personal autenticado)
 *   PUT   /api/impuestos/configuracion        (SUPERADMIN)
 *   PATCH /api/impuestos/configuracion/estado (SUPERADMIN)
 *
 * El frontend nunca calcula ni fija la tasa: solo muestra y envía el
 * porcentaje que el backend valida (0–100, máximo dos decimales).
 */
export async function obtenerConfiguracionImpuesto() {
  const response = await api.get('/api/impuestos/configuracion')
  return response.data
}

export async function actualizarConfiguracionImpuesto({ porcentaje, activo }) {
  const response = await api.put('/api/impuestos/configuracion', {
    porcentaje,
    activo
  })
  return response.data
}

export async function cambiarEstadoImpuesto(activo) {
  const response = await api.patch('/api/impuestos/configuracion/estado', { activo })
  return response.data
}
