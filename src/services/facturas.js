import api from './api.js'

/**
 * Facturación electrónica (RF030).
 *
 *   GET  /api/facturacion/emisor               → datos del emisor del restaurante
 *   PUT  /api/facturacion/emisor               → guarda los datos (administrador)
 *   POST /api/pedidos/{pedidoId}/factura       → emite la factura (consecutivo oficial)
 *   POST /api/facturas/enviar  (multipart)     → envía el PDF al correo indicado
 *
 * Si el servidor no responde, la interfaz trabaja en modo provisional.
 * La validación DIAN (CUFE) requiere un proveedor tecnológico autorizado.
 */

const CLAVE_EMISOR = 'nexdine.facturacion.emisor'

export const EMISOR_VACIO = {
  razonSocial: '',
  nit: '',
  regimen: 'Responsable de IVA',
  direccion: '',
  ciudad: '',
  telefono: '',
  correo: ''
}

export async function obtenerEmisor() {
  try {
    const response = await api.get('/api/facturacion/emisor')
    return { ...EMISOR_VACIO, ...response.data, origen: 'servidor' }
  } catch {
    return { ...EMISOR_VACIO, ...leerEmisorLocal(), origen: 'local' }
  }
}

export async function guardarEmisorServidor(emisor) {
  // eslint-disable-next-line no-unused-vars
  const { origen, configurado, ...datos } = emisor
  const response = await api.put('/api/facturacion/emisor', datos)
  return { ...EMISOR_VACIO, ...response.data, origen: 'servidor' }
}

export function leerEmisorLocal() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_EMISOR) || '{}')
  } catch {
    return {}
  }
}

export function guardarEmisorLocal(emisor) {
  try {
    // eslint-disable-next-line no-unused-vars
    const { origen, ...datos } = emisor
    localStorage.setItem(CLAVE_EMISOR, JSON.stringify(datos))
  } catch {
    // Almacenamiento no disponible: los datos solo duran mientras el modal esté abierto.
  }
}

/** Emite la factura en el servidor. Devuelve { numero, fecha, cufe }. */
export async function emitirFactura(pedidoId, cliente) {
  const response = await api.post(`/api/pedidos/${pedidoId}/factura`, cliente)
  return response.data
}

export async function enviarFacturaPorCorreo({ pedidoId, numero, correo, pdf }) {
  const datos = new FormData()
  datos.append('pedidoId', pedidoId)
  datos.append('numero', numero)
  datos.append('correo', correo)
  datos.append('archivo', pdf, `factura-${numero}.pdf`)
  const response = await api.post('/api/facturas/enviar', datos)
  return response.data
}
