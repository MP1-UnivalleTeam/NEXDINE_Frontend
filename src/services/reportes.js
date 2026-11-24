import api from './api.js'

/**
 * Reportes de ventas.
 *
 * PENDIENTE BACKEND:
 *   GET /api/reportes/ventas?periodo=DIARIO|SEMANAL|QUINCENAL|MENSUAL
 *                            &desde=YYYY-MM-DD&hasta=YYYY-MM-DD[&sucursalId=]
 *   Respuesta esperada (ver README del módulo en el informe):
 *   {
 *     totalVentas, numeroPedidos, ticketPromedio, propinas, impuestos,
 *     descuentos, pedidosCancelados,
 *     serie:        [{ fecha: 'YYYY-MM-DD', total, pedidos }],
 *     porServicio:  [{ tipoServicio, total, pedidos }],
 *     porMetodoPago:[{ metodo, total, pedidos }],
 *     topProductos: [{ nombre, cantidad, total }],
 *     pedidos:      [{ numeroSeguimiento, fecha, tipoServicio, metodoPago, estado, total }]
 *   }
 */

export const PERIODOS = [
  { valor: 'DIARIO', etiqueta: 'Diario' },
  { valor: 'SEMANAL', etiqueta: 'Semanal' },
  { valor: 'QUINCENAL', etiqueta: 'Quincenal' },
  { valor: 'MENSUAL', etiqueta: 'Mensual' }
]

export function aFechaISO(fecha) {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function desdeFechaISO(texto) {
  const [y, m, d] = String(texto).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** Calcula el rango [desde, hasta] (inclusive) del periodo que contiene `referencia`. */
export function calcularRango(periodo, referencia) {
  const base = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate())
  if (periodo === 'DIARIO') return { desde: base, hasta: base }
  if (periodo === 'SEMANAL') {
    const diaSemana = (base.getDay() + 6) % 7 // lunes = 0
    const desde = new Date(base); desde.setDate(base.getDate() - diaSemana)
    const hasta = new Date(desde); hasta.setDate(desde.getDate() + 6)
    return { desde, hasta }
  }
  const finMes = new Date(base.getFullYear(), base.getMonth() + 1, 0)
  if (periodo === 'QUINCENAL') {
    return base.getDate() <= 15
      ? { desde: new Date(base.getFullYear(), base.getMonth(), 1), hasta: new Date(base.getFullYear(), base.getMonth(), 15) }
      : { desde: new Date(base.getFullYear(), base.getMonth(), 16), hasta: finMes }
  }
  return { desde: new Date(base.getFullYear(), base.getMonth(), 1), hasta: finMes }
}

/** Mueve la fecha de referencia un periodo hacia adelante (+1) o atrás (-1). */
export function desplazarReferencia(periodo, referencia, direccion) {
  const nueva = new Date(referencia)
  if (periodo === 'DIARIO') nueva.setDate(nueva.getDate() + direccion)
  else if (periodo === 'SEMANAL') nueva.setDate(nueva.getDate() + 7 * direccion)
  else if (periodo === 'QUINCENAL') {
    const { desde, hasta } = calcularRango('QUINCENAL', referencia)
    if (direccion > 0) { nueva.setTime(hasta.getTime()); nueva.setDate(nueva.getDate() + 1) }
    else { nueva.setTime(desde.getTime()); nueva.setDate(nueva.getDate() - 1) }
  } else nueva.setMonth(nueva.getMonth() + direccion, 1)
  return nueva
}

export function describirRango(periodo, { desde, hasta }) {
  const largo = { day: 'numeric', month: 'long', year: 'numeric' }
  if (periodo === 'DIARIO') return desde.toLocaleDateString('es-CO', { weekday: 'long', ...largo })
  if (periodo === 'MENSUAL') return desde.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  return `${desde.toLocaleDateString('es-CO', largo)} – ${hasta.toLocaleDateString('es-CO', largo)}`
}

export async function obtenerReporteVentas({ periodo, desde, hasta, sucursalId }) {
  const params = { periodo, desde: aFechaISO(desde), hasta: aFechaISO(hasta) }
  if (sucursalId) params.sucursalId = sucursalId
  const response = await api.get('/api/reportes/ventas', { params })
  return response.data
}

// ---------------------------------------------------------------------------
// Datos de ejemplo (solo para previsualizar la interfaz mientras no exista el
// endpoint). Son deterministas para que el mismo rango muestre lo mismo.
// ---------------------------------------------------------------------------

function aleatorio(semilla) {
  let s = semilla % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

const PRODUCTOS_EJEMPLO = [
  'Hamburguesa clásica', 'Pizza margarita', 'Limonada de coco', 'Bandeja paisa',
  'Ensalada César', 'Alitas BBQ', 'Jugo natural', 'Postre de la casa'
]

export function generarReporteEjemplo({ periodo, desde, hasta }) {
  const rnd = aleatorio(Number(aFechaISO(desde).replaceAll('-', '')) + periodo.length)
  const serie = []
  if (periodo === 'DIARIO') {
    // Reporte diario: ventas por hora de servicio.
    for (let hora = 11; hora <= 22; hora++) {
      const pico = hora === 13 || hora === 20 ? 2.2 : hora === 12 || hora === 19 || hora === 21 ? 1.5 : 0.7
      const pedidos = Math.round((2 + rnd() * 3) * pico)
      serie.push({ fecha: aFechaISO(desde), hora, pedidos, total: Math.round(pedidos * (28000 + rnd() * 14000) / 100) * 100 })
    }
  }
  const dia = new Date(desde)
  while (periodo !== 'DIARIO' && dia <= hasta) {
    const finDeSemana = dia.getDay() === 0 || dia.getDay() === 5 || dia.getDay() === 6
    const pedidos = Math.round((finDeSemana ? 38 : 22) + rnd() * 18)
    serie.push({ fecha: aFechaISO(dia), pedidos, total: Math.round(pedidos * (28000 + rnd() * 14000) / 100) * 100 })
    dia.setDate(dia.getDate() + 1)
  }
  const totalVentas = serie.reduce((s, d) => s + d.total, 0)
  const numeroPedidos = serie.reduce((s, d) => s + d.pedidos, 0)
  const reparto = (partes) => {
    const pesos = partes.map(() => 0.4 + rnd())
    const suma = pesos.reduce((a, b) => a + b, 0)
    return pesos.map(p => p / suma)
  }
  const servicios = ['MESA', 'PARA_LLEVAR', 'DOMICILIO']
  const pesosServicio = reparto(servicios)
  const metodos = ['EFECTIVO', 'TARJETA', 'PAGO_EN_LINEA']
  const pesosMetodo = reparto(metodos)
  const topProductos = PRODUCTOS_EJEMPLO.map(nombre => {
    const cantidad = Math.round(numeroPedidos * (0.15 + rnd() * 0.5))
    return { nombre, cantidad, total: cantidad * Math.round((12000 + rnd() * 30000) / 100) * 100 }
  }).sort((a, b) => b.total - a.total)

  const estados = ['ENTREGADO', 'ENTREGADO', 'ENTREGADO', 'ENTREGADO', 'CANCELADO']
  const pedidos = Array.from({ length: Math.min(numeroPedidos, 40) }, (_, i) => {
    const d = serie[Math.floor(rnd() * serie.length)]
    return {
      numeroSeguimiento: `NX-${String(1000 + i)}`,
      fecha: `${d.fecha}T${String(11 + Math.floor(rnd() * 10)).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}:00`,
      tipoServicio: servicios[Math.floor(rnd() * 3)],
      metodoPago: metodos[Math.floor(rnd() * 3)],
      estado: estados[Math.floor(rnd() * estados.length)],
      total: Math.round((20000 + rnd() * 90000) / 100) * 100
    }
  }).sort((a, b) => a.fecha.localeCompare(b.fecha))

  return {
    ejemplo: true,
    totalVentas,
    numeroPedidos,
    ticketPromedio: numeroPedidos ? Math.round(totalVentas / numeroPedidos) : 0,
    propinas: Math.round(totalVentas * 0.06),
    impuestos: Math.round(totalVentas * 0.08),
    descuentos: Math.round(totalVentas * 0.02),
    pedidosCancelados: Math.round(numeroPedidos * 0.04),
    serie,
    porServicio: servicios.map((tipoServicio, i) => ({
      tipoServicio, total: Math.round(totalVentas * pesosServicio[i]), pedidos: Math.round(numeroPedidos * pesosServicio[i])
    })),
    porMetodoPago: metodos.map((metodo, i) => ({
      metodo, total: Math.round(totalVentas * pesosMetodo[i]), pedidos: Math.round(numeroPedidos * pesosMetodo[i])
    })),
    topProductos,
    pedidos
  }
}
