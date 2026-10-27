const CENTAVOS_POR_UNIDAD = 100

export function aCentavos(valor) {
  const numero = typeof valor === 'string'
    ? Number(valor.replace(',', '.'))
    : Number(valor)
  return Number.isFinite(numero) ? Math.round(numero * CENTAVOS_POR_UNIDAD) : 0
}

export function desdeCentavos(centavos) {
  return Number(centavos || 0) / CENTAVOS_POR_UNIDAD
}

export function redondearDinero(valor) {
  return desdeCentavos(aCentavos(valor))
}

export function sumarDinero(...valores) {
  return desdeCentavos(valores.reduce((total, valor) => total + aCentavos(valor), 0))
}

export function multiplicarDinero(valor, cantidad) {
  return desdeCentavos(aCentavos(valor) * Math.max(0, Math.trunc(Number(cantidad) || 0)))
}

export function calcularImporteItem(item) {
  const precio = aCentavos(item?.precioUnitario)
  const adicional = aCentavos(item?.adicionalOpciones)
  return desdeCentavos((precio + adicional) * Math.max(0, Math.trunc(Number(item?.cantidad) || 0)))
}

export function calcularDescuentoCentavos(cupon, subtotalCentavos) {
  if (!cupon || subtotalCentavos <= 0) return 0
  if (cupon.montoMinimo && subtotalCentavos < aCentavos(cupon.montoMinimo)) return 0

  const tipo = String(cupon.tipo || '').toUpperCase()
  let descuento = 0
  if (tipo === 'PORCENTAJE') {
    descuento = Math.round(subtotalCentavos * aCentavos(cupon.valor) / 10000)
  } else if (tipo === 'MONTO_FIJO') {
    descuento = aCentavos(cupon.valor)
  } else if (cupon.descuento != null) {
    descuento = aCentavos(cupon.descuento)
  }

  return Math.min(Math.max(descuento, 0), subtotalCentavos)
}

export function calcularTotales({ items = [], cupon = null, propina = null, tasaImpuesto = 0, cargos = 0 } = {}) {
  const totalItems = items.reduce((total, item) => total + (Number(item?.cantidad) || 0), 0)
  const subtotalCentavos = items.reduce((total, item) => {
    return total + (aCentavos(item?.precioUnitario) + aCentavos(item?.adicionalOpciones))
      * Math.max(0, Math.trunc(Number(item?.cantidad) || 0))
  }, 0)

  const descuentoCentavos = calcularDescuentoCentavos(cupon, subtotalCentavos)
  const baseCentavos = Math.max(subtotalCentavos - descuentoCentavos, 0)
  const tasaCenti = Math.round((Number(tasaImpuesto) || 0) * 100)
  const impuestosCentavos = Math.round(baseCentavos * tasaCenti / 10000)

  const tipoPropina = String(propina?.tipo || '').toLowerCase()
  const propinaCentavos = tipoPropina === 'porcentaje'
    ? Math.round(subtotalCentavos * aCentavos(propina?.porcentaje) / 10000)
    : Math.max(aCentavos(propina?.valor), 0)

  const cargosCentavos = Math.max(aCentavos(cargos), 0)
  const totalCentavos = baseCentavos + impuestosCentavos + propinaCentavos + cargosCentavos

  return {
    totalItems,
    subtotal: desdeCentavos(subtotalCentavos),
    descuento: desdeCentavos(descuentoCentavos),
    base: desdeCentavos(baseCentavos),
    impuestos: desdeCentavos(impuestosCentavos),
    propina: desdeCentavos(propinaCentavos),
    cargos: desdeCentavos(cargosCentavos),
    total: desdeCentavos(totalCentavos)
  }
}

export function formatearDinero(valor) {
  const numero = Number.isFinite(Number(valor)) ? Number(valor) : 0
  return `$${new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numero)}`
}
