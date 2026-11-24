import api from './api.js'
import { esEndpointNoDisponible } from '../utils/exportar.js'

/**
 * Recordatorios automáticos.
 *
 * PENDIENTE BACKEND:
 *   GET    /api/recordatorios
 *   POST   /api/recordatorios
 *   PUT    /api/recordatorios/{id}
 *   DELETE /api/recordatorios/{id}
 *   + un programador (scheduler) que dispare los recordatorios y envíe correos.
 *
 * Mientras no existan, los recordatorios se guardan en este navegador y solo
 * se disparan como aviso en pantalla cuando la aplicación está abierta.
 */

const CLAVE = 'nexdine.recordatorios'

export const PLANTILLAS = [
  { tipo: 'CIERRE_CAJA', titulo: 'Cierre de caja', mensaje: 'Realiza el arqueo y cierre de caja del día.' },
  { tipo: 'INVENTARIO', titulo: 'Revisar inventario', mensaje: 'Verifica existencias y marca los productos agotados.' },
  { tipo: 'PEDIDOS_VENCIDOS', titulo: 'Pedidos para llevar vencidos', mensaje: 'Revisa y cancela los pedidos para llevar que no fueron recogidos.' },
  { tipo: 'REPORTE_VENTAS', titulo: 'Revisar reporte de ventas', mensaje: 'Consulta y exporta el reporte de ventas del periodo.' },
  { tipo: 'PERSONALIZADO', titulo: '', mensaje: '' }
]

export const FRECUENCIAS = [
  { valor: 'UNA_VEZ', etiqueta: 'Una vez' },
  { valor: 'DIARIA', etiqueta: 'Todos los días' },
  { valor: 'SEMANAL', etiqueta: 'Semanal' },
  { valor: 'MENSUAL', etiqueta: 'Mensual' }
]

export const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function recordatorioVacio() {
  return {
    id: null,
    tipo: 'PERSONALIZADO',
    titulo: '',
    mensaje: '',
    frecuencia: 'DIARIA',
    hora: '21:00',
    fecha: '',
    diasSemana: [1, 2, 3, 4, 5],
    diaMes: 1,
    canales: ['APP'],
    destinatarios: '',
    activo: true
  }
}

/* ------------------------------------------------------------ Programación */

function conHora(fecha, hora) {
  const [h, m] = String(hora || '00:00').split(':').map(Number)
  const resultado = new Date(fecha)
  resultado.setHours(h || 0, m || 0, 0, 0)
  return resultado
}

function diaDelMes(anio, mes, dia) {
  const ultimo = new Date(anio, mes + 1, 0).getDate()
  return new Date(anio, mes, Math.min(Math.max(1, dia), ultimo))
}

/** Última ocurrencia programada que ya pasó (o null). */
export function ultimaOcurrencia(r, ahora = new Date()) {
  if (r.frecuencia === 'UNA_VEZ') {
    if (!r.fecha) return null
    const [y, mo, d] = r.fecha.split('-').map(Number)
    const momento = conHora(new Date(y, mo - 1, d), r.hora)
    return momento <= ahora ? momento : null
  }
  if (r.frecuencia === 'DIARIA') {
    const hoy = conHora(ahora, r.hora)
    if (hoy <= ahora) return hoy
    hoy.setDate(hoy.getDate() - 1)
    return hoy
  }
  if (r.frecuencia === 'SEMANAL') {
    const dias = r.diasSemana || []
    for (let atras = 0; atras <= 7; atras++) {
      const dia = new Date(ahora); dia.setDate(ahora.getDate() - atras)
      const momento = conHora(dia, r.hora)
      if (dias.includes(dia.getDay()) && momento <= ahora) return momento
    }
    return null
  }
  if (r.frecuencia === 'MENSUAL') {
    const este = conHora(diaDelMes(ahora.getFullYear(), ahora.getMonth(), r.diaMes), r.hora)
    if (este <= ahora) return este
    return conHora(diaDelMes(ahora.getFullYear(), ahora.getMonth() - 1, r.diaMes), r.hora)
  }
  return null
}

/** Próxima ocurrencia futura (o null si ya no habrá más). */
export function proximaOcurrencia(r, ahora = new Date()) {
  if (!r.activo) return null
  if (r.frecuencia === 'UNA_VEZ') {
    if (!r.fecha) return null
    const [y, mo, d] = r.fecha.split('-').map(Number)
    const momento = conHora(new Date(y, mo - 1, d), r.hora)
    return momento > ahora ? momento : null
  }
  if (r.frecuencia === 'DIARIA') {
    const hoy = conHora(ahora, r.hora)
    if (hoy > ahora) return hoy
    hoy.setDate(hoy.getDate() + 1)
    return hoy
  }
  if (r.frecuencia === 'SEMANAL') {
    const dias = r.diasSemana || []
    for (let adelante = 0; adelante <= 7; adelante++) {
      const dia = new Date(ahora); dia.setDate(ahora.getDate() + adelante)
      const momento = conHora(dia, r.hora)
      if (dias.includes(dia.getDay()) && momento > ahora) return momento
    }
    return null
  }
  if (r.frecuencia === 'MENSUAL') {
    const este = conHora(diaDelMes(ahora.getFullYear(), ahora.getMonth(), r.diaMes), r.hora)
    if (este > ahora) return este
    return conHora(diaDelMes(ahora.getFullYear(), ahora.getMonth() + 1, r.diaMes), r.hora)
  }
  return null
}

const VENTANA_MS = 12 * 60 * 60 * 1000

/** Recordatorios locales que deben dispararse ahora. */
export function recordatoriosPendientes(lista, ahora = new Date()) {
  return lista.filter(r => {
    if (!r.activo || !(r.canales || []).includes('APP')) return false
    const ocurrencia = ultimaOcurrencia(r, ahora)
    if (!ocurrencia || ahora - ocurrencia > VENTANA_MS) return false
    const referencia = new Date(r.ultimaEjecucion || r.creadoEn || 0)
    return ocurrencia > referencia
  })
}

export function describirFrecuencia(r) {
  if (r.frecuencia === 'UNA_VEZ') {
    return r.fecha ? `El ${new Date(`${r.fecha}T00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })} a las ${r.hora}` : 'Una vez'
  }
  if (r.frecuencia === 'DIARIA') return `Todos los días a las ${r.hora}`
  if (r.frecuencia === 'SEMANAL') {
    const dias = [...(r.diasSemana || [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => DIAS_SEMANA[d])
    return `${dias.join(', ') || 'Sin días'} a las ${r.hora}`
  }
  return `El día ${r.diaMes} de cada mes a las ${r.hora}`
}

/* ------------------------------------------------------------ Persistencia */

function leerLocal() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE) || '[]')
    return Array.isArray(datos) ? datos : []
  } catch {
    return []
  }
}

function escribirLocal(lista) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista))
    window.dispatchEvent(new Event('nexdine-recordatorios'))
  } catch {
    // Sin almacenamiento disponible.
  }
}

/** Devuelve { lista, origen: 'servidor' | 'local' }. */
export async function listarRecordatorios() {
  try {
    const response = await api.get('/api/recordatorios')
    return { lista: Array.isArray(response.data) ? response.data : [], origen: 'servidor' }
  } catch (err) {
    if (!esEndpointNoDisponible(err)) throw err
    return { lista: leerLocal(), origen: 'local' }
  }
}

export async function guardarRecordatorio(recordatorio, origen) {
  if (origen === 'servidor') {
    const response = recordatorio.id
      ? await api.put(`/api/recordatorios/${recordatorio.id}`, recordatorio)
      : await api.post('/api/recordatorios', recordatorio)
    return response.data
  }
  const lista = leerLocal()
  if (recordatorio.id) {
    // Al editar o reactivar no se disparan de golpe las ocurrencias ya pasadas.
    const actualizado = { ...recordatorio, ultimaEjecucion: new Date().toISOString() }
    escribirLocal(lista.map(r => (r.id === recordatorio.id ? actualizado : r)))
    return actualizado
  }
  const nuevo = {
    ...recordatorio,
    id: (crypto.randomUUID?.() || `r-${Date.now()}`),
    creadoEn: new Date().toISOString()
  }
  escribirLocal([...lista, nuevo])
  return nuevo
}

export async function eliminarRecordatorio(id, origen) {
  if (origen === 'servidor') {
    await api.delete(`/api/recordatorios/${id}`)
    return
  }
  escribirLocal(leerLocal().filter(r => r.id !== id))
}

export function leerRecordatoriosLocales() {
  return leerLocal()
}

export function marcarEjecutados(ids, momento = new Date()) {
  const marca = momento.toISOString()
  escribirLocal(leerLocal().map(r => (ids.includes(r.id) ? { ...r, ultimaEjecucion: marca } : r)))
}
