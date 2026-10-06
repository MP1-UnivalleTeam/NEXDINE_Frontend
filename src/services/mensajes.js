/**
 * FASE 10 — Manejo centralizado de errores HTTP.
 *
 * Traduce el código de respuesta y el cuerpo del backend en un mensaje
 * comprensible, evitando textos genéricos como "Error" o "Algo salió mal".
 *
 * Significado de los códigos (se mantiene el del backend):
 *   400 → datos inválidos
 *   401 → sesión no válida
 *   403 → sin permisos o fuera del ámbito
 *   404 → recurso inexistente
 *   409 → conflicto
 *   500 → error interno
 */

const PREDEFINIDOS = {
  400: 'Los datos enviados no son válidos.',
  401: 'No ha iniciado sesión.',
  403: 'No tiene permisos para realizar esta acción.',
  404: 'El recurso solicitado no existe.',
  409: 'La operación no se puede realizar porque existe un conflicto.',
  500: 'Ocurrió un error en el servidor. Intente nuevamente.'
}

/**
 * Extrae el mensaje real del backend si está disponible.
 *
 * @param {object} err Error de Axios
 * @param {string} [fallback] Mensaje por defecto para el contexto de la pantalla
 * @returns {string} Mensaje comprensible para el usuario
 */
export function obtenerMensajeError(err, fallback = '') {
  // Sin respuesta del servidor: error de red
  if (!err || !err.response) {
    return err?.message === 'Network Error'
      ? 'No fue posible conectar con el servidor. Verifique su conexión.'
      : (fallback || 'No fue posible completar la operación.')
  }

  const { status, data } = err.response

  // El backend envía { "error": "..." }
  const mensajeBackend =
    typeof data === 'string' && data.trim() !== '' ? data.trim() : data?.error

  if (mensajeBackend) {
    return mensajeBackend
  }

  return PREDEFINIDOS[status] || fallback || 'No fue posible completar la operación.'
}

/**
 * Mensajes de éxito estándar de la aplicación.
 */
export const MENSAJES = {
  PRODUCTO_CREADO: 'Producto creado correctamente',
  PRODUCTO_ACTUALIZADO: 'Producto actualizado correctamente',
  PRODUCTO_ELIMINADO: 'Producto eliminado correctamente',
  DISPONIBILIDAD_ACTUALIZADA: 'Disponibilidad actualizada correctamente',

  SUCURSAL_CREADA: 'Sucursal creada correctamente',
  SUCURSAL_ACTUALIZADA: 'Sucursal actualizada correctamente',
  SUCURSAL_ACTIVADA: 'Sucursal activada correctamente',
  SUCURSAL_DESACTIVADA: 'Sucursal desactivada correctamente',
  SUCURSAL_ELIMINADA: 'Sucursal eliminada correctamente',

  MESA_CREADA: 'Mesa creada correctamente',
  MESA_ACTIVADA: 'Mesa activada correctamente',
  MESA_DESACTIVADA: 'Mesa desactivada correctamente',

  USUARIO_CREADO: 'Usuario creado correctamente',
  USUARIO_ACTUALIZADO: 'Usuario actualizado correctamente',
  USUARIO_ACTIVADO: 'Usuario activado correctamente',
  USUARIO_SUSPENDIDO: 'Usuario suspendido correctamente',
  USUARIO_ELIMINADO: 'Usuario eliminado correctamente',

  CATEGORIA_CREADA: 'Categoría creada correctamente',
  CATEGORIA_ACTUALIZADA: 'Categoría actualizada correctamente'
}

/** Textos de los botones mientras hay una operación en curso. */
export const CARGANDO = {
  GUARDANDO: 'Guardando...',
  ELIMINANDO: 'Eliminando...',
  ACTUALIZANDO: 'Actualizando...',
  CREANDO: 'Creando...'
}