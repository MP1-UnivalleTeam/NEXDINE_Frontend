export const CLAVE_SUCURSAL = 'nexdine_sucursal'
export const CLAVE_TASA_IMPUESTO = 'nexdine_tasa_impuesto'
export const CLAVE_TIPO_SERVICIO = 'tipoServicioUI'
export const CLAVE_SUCURSALES_DISPONIBLES = 'nexdine_sucursales_disponibles'
export const CLAVE_CONTEXTO_MENU = 'nexdine_contexto_menu'

export function guardarSucursal(sucursal) {
  try {
    if (!sucursal?.id) {
      sessionStorage.removeItem(CLAVE_SUCURSAL)
      return
    }
    sessionStorage.setItem(CLAVE_SUCURSAL, JSON.stringify({
      id: String(sucursal.id),
      nombre: sucursal.nombre || '',
      direccion: sucursal.direccion || '',
      telefono: sucursal.telefono || ''
    }))
  } catch {

  }
}

export function obtenerSucursal() {
  try {
    const raw = sessionStorage.getItem(CLAVE_SUCURSAL)
    if (!raw) return null
    const data = JSON.parse(raw)
    return data?.id ? data : null
  } catch {
    return null
  }
}

export function guardarTasaImpuesto(tasa) {
  try {
    const numero = Number(tasa)
    sessionStorage.setItem(CLAVE_TASA_IMPUESTO, String(Number.isFinite(numero) ? numero : 0))
  } catch {

  }
}

export function obtenerTasaImpuesto() {
  try {
    const numero = Number(sessionStorage.getItem(CLAVE_TASA_IMPUESTO))
    return Number.isFinite(numero) ? numero : 0
  } catch {
    return 0
  }
}

export function guardarTipoServicio(tipo) {
  try {
    if (!tipo) {
      sessionStorage.removeItem(CLAVE_TIPO_SERVICIO)
      return
    }
    sessionStorage.setItem(CLAVE_TIPO_SERVICIO, tipo)
  } catch {

  }
}

export function obtenerTipoServicio() {
  try {
    return sessionStorage.getItem(CLAVE_TIPO_SERVICIO) || null
  } catch {
    return null
  }
}

export function guardarSucursalesDisponibles(lista) {
  try {
    const datos = (Array.isArray(lista) ? lista : [])
      .filter(item => item?.id)
      .map(item => ({
        id: String(item.id),
        nombre: item.nombre || '',
        direccion: item.direccion || '',
        telefono: item.telefono || ''
      }))
    if (!datos.length) {
      sessionStorage.removeItem(CLAVE_SUCURSALES_DISPONIBLES)
      return
    }
    sessionStorage.setItem(CLAVE_SUCURSALES_DISPONIBLES, JSON.stringify(datos))
  } catch {

  }
}

export function obtenerSucursalesDisponibles() {
  try {
    const data = JSON.parse(sessionStorage.getItem(CLAVE_SUCURSALES_DISPONIBLES))
    return Array.isArray(data) ? data.filter(item => item?.id) : []
  } catch {
    return []
  }
}

export function guardarContextoMenu(ruta) {
  try {
    if (!ruta) {
      sessionStorage.removeItem(CLAVE_CONTEXTO_MENU)
      return
    }
    sessionStorage.setItem(CLAVE_CONTEXTO_MENU, ruta)
  } catch {

  }
}

export function obtenerContextoMenu() {
  try {
    return sessionStorage.getItem(CLAVE_CONTEXTO_MENU) || null
  } catch {
    return null
  }
}
