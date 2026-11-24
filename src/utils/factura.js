import { cargarPdf } from './exportar.js'
import { formatearDinero } from './dinero.js'
import { etiquetaTipoServicio } from './pedidos.js'
import { etiquetaMetodoPago, infoEstadoPago } from './pagos.js'

const VERDE = [17, 54, 46]
const GRIS_TEXTO = [100, 116, 139]
const TEXTO = [30, 41, 59]

export const TIPOS_DOCUMENTO = [
  { valor: 'CC', etiqueta: 'Cédula de ciudadanía' },
  { valor: 'NIT', etiqueta: 'NIT' },
  { valor: 'CE', etiqueta: 'Cédula de extranjería' },
  { valor: 'PP', etiqueta: 'Pasaporte' },
  { valor: 'CF', etiqueta: 'Consumidor final' }
]

function textoPersonalizaciones(item) {
  if (Array.isArray(item?.personalizaciones)) return item.personalizaciones.filter(Boolean).join(', ')
  return typeof item?.personalizaciones === 'string' ? item.personalizaciones : ''
}

function importeItem(item) {
  const importe = Number(item?.importe)
  if (Number.isFinite(importe)) return importe
  return (Number(item?.precioUnitario || 0) + Number(item?.adicionalOpciones || 0)) * Number(item?.cantidad || 0)
}

function unitarioItem(item) {
  const cantidad = Number(item?.cantidad) || 0
  if (cantidad > 0) return importeItem(item) / cantidad
  return Number(item?.precioUnitario || 0)
}

/**
 * Construye la representación gráfica (PDF) de la factura de un pedido.
 * Devuelve el documento jsPDF para descargarlo o convertirlo en Blob.
 *
 * @param {object} datos
 * @param {object} datos.pedido   resumen del pedido (mismo formato de /resumen)
 * @param {object} datos.emisor   { razonSocial, nit, direccion, telefono, correo, ciudad, regimen }
 * @param {object} datos.cliente  { tipoDocumento, documento, nombre, correo, telefono, direccion }
 * @param {object} datos.factura  { numero, fecha, cufe, provisional }
 */
export async function generarFacturaPdf({ pedido, emisor, cliente, factura }) {
  const { jsPDF, autoTable } = await cargarPdf()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  const m = 40

  // Encabezado del emisor
  doc.setFillColor(...VERDE)
  doc.rect(0, 0, ancho, 96, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text(emisor.razonSocial || 'Restaurante', m, 34)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const lineasEmisor = [
    emisor.nit ? `NIT ${emisor.nit}` : null,
    emisor.regimen || null,
    [emisor.direccion, emisor.ciudad].filter(Boolean).join(', ') || null,
    [emisor.telefono ? `Tel. ${emisor.telefono}` : null, emisor.correo].filter(Boolean).join(' · ') || null
  ].filter(Boolean)
  lineasEmisor.forEach((linea, i) => doc.text(linea, m, 50 + i * 11))

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('FACTURA ELECTRÓNICA DE VENTA', ancho - m, 34, { align: 'right' })
  doc.setFontSize(14)
  doc.text(`N.° ${factura.numero}`, ancho - m, 54, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Fecha de emisión: ${new Date(factura.fecha).toLocaleString('es-CO')}`, ancho - m, 70, { align: 'right' })
  doc.text('Forma de pago: Contado', ancho - m, 82, { align: 'right' })

  // Datos del cliente y del pedido
  let y = 116
  const mitad = (ancho - m * 2 - 12) / 2
  const caja = (x, titulo, filas) => {
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(x, y, mitad, 92, 6, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRIS_TEXTO)
    doc.text(titulo, x + 12, y + 17)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    filas.forEach(([etiqueta, valor], i) => {
      doc.setTextColor(...GRIS_TEXTO)
      doc.text(`${etiqueta}:`, x + 12, y + 33 + i * 13)
      doc.setTextColor(...TEXTO)
      const texto = doc.splitTextToSize(String(valor || '—'), mitad - 100)[0]
      doc.text(texto, x + 88, y + 33 + i * 13)
    })
  }

  const tipoDoc = TIPOS_DOCUMENTO.find(t => t.valor === cliente.tipoDocumento)
  caja(m, 'ADQUIRIENTE', [
    ['Nombre', cliente.nombre],
    ['Documento', cliente.tipoDocumento === 'CF' ? 'Consumidor final' : `${tipoDoc?.valor || ''} ${cliente.documento || ''}`.trim()],
    ['Correo', cliente.correo],
    ['Teléfono', cliente.telefono],
    ['Dirección', cliente.direccion]
  ])
  caja(m + mitad + 12, 'PEDIDO', [
    ['Seguimiento', pedido.numeroSeguimiento || pedido.id],
    ['Servicio', etiquetaTipoServicio(pedido.tipoServicio)],
    ['Fecha pedido', pedido.fechaCreacion ? new Date(pedido.fechaCreacion).toLocaleString('es-CO') : '—'],
    ['Método pago', etiquetaMetodoPago(pedido.pagoMetodo)],
    ['Estado pago', pedido.pagoEstado ? infoEstadoPago(pedido.pagoEstado).etiqueta : 'Pendiente']
  ])
  y += 108

  // Detalle de productos
  const items = Array.isArray(pedido.items) ? pedido.items : []
  autoTable(doc, {
    startY: y,
    head: [['#', 'Descripción', 'Cant.', 'Valor unitario', 'Total']],
    body: items.map((item, i) => {
      const extra = [textoPersonalizaciones(item), item.observaciones].filter(Boolean).join(' · ')
      return [
        String(i + 1),
        extra ? `${item.nombre || 'Producto'}\n${extra}` : (item.nombre || 'Producto'),
        String(Number(item.cantidad) || 0),
        formatearDinero(unitarioItem(item)),
        formatearDinero(importeItem(item))
      ]
    }),
    margin: { left: m, right: m },
    styles: { fontSize: 9, cellPadding: 6, textColor: TEXTO },
    headStyles: { fillColor: VERDE, textColor: 255 },
    columnStyles: {
      0: { cellWidth: 24 },
      2: { halign: 'center', cellWidth: 44 },
      3: { halign: 'right', cellWidth: 90 },
      4: { halign: 'right', cellWidth: 90 }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (celda) => {
      if (celda.section === 'head' && celda.column.index >= 2) {
        celda.cell.styles.halign = celda.column.index === 2 ? 'center' : 'right'
      }
    }
  })
  y = doc.lastAutoTable.finalY + 16

  // Totales
  const tasa = Number(pedido.tasaImpuesto) || 0
  const filasTotales = [
    ['Subtotal', formatearDinero(pedido.subtotal)],
    ...(Number(pedido.descuento) > 0 ? [[`Descuento${pedido.cuponCodigo ? ` (${pedido.cuponCodigo})` : ''}`, `-${formatearDinero(pedido.descuento)}`]] : []),
    ...(pedido.baseGravable != null ? [['Base gravable', formatearDinero(pedido.baseGravable)]] : []),
    [`Impuestos${tasa > 0 ? ` (${tasa}%)` : ''}`, formatearDinero(pedido.impuestos)],
    ...(Number(pedido.cargos) > 0 ? [['Cargos', formatearDinero(pedido.cargos)]] : []),
    ['Propina (voluntaria)', formatearDinero(pedido.propina)]
  ]
  const xEtiqueta = ancho - m - 220
  if (y + filasTotales.length * 15 + 40 > alto - 90) {
    doc.addPage()
    y = 50
  }
  doc.setFontSize(9.5)
  filasTotales.forEach(([etiqueta, valor]) => {
    doc.setTextColor(...GRIS_TEXTO)
    doc.text(etiqueta, xEtiqueta, y)
    doc.setTextColor(...TEXTO)
    doc.text(valor, ancho - m, y, { align: 'right' })
    y += 15
  })
  doc.setDrawColor(226, 232, 240)
  doc.line(xEtiqueta, y - 6, ancho - m, y - 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...VERDE)
  doc.text('TOTAL', xEtiqueta, y + 12)
  doc.text(formatearDinero(pedido.total), ancho - m, y + 12, { align: 'right' })
  doc.setFont('helvetica', 'normal')

  // Pie: datos de validación electrónica
  const pie = alto - 70
  doc.setDrawColor(226, 232, 240)
  doc.line(m, pie - 10, ancho - m, pie - 10)
  doc.setFontSize(8)
  doc.setTextColor(...GRIS_TEXTO)
  doc.text(`CUFE: ${factura.cufe || 'Pendiente de validación ante la DIAN'}`, m, pie + 4)
  doc.text(
    factura.provisional
      ? 'Documento provisional: la validación electrónica y la numeración oficial las asigna el servidor de facturación.'
      : 'Representación gráfica de la factura electrónica de venta.',
    m, pie + 16
  )
  doc.text('Generado con NexDine', m, pie + 28)

  return doc
}

/** Número provisional mientras el backend no asigne la numeración oficial. */
export function numeroFacturaProvisional(pedido) {
  const base = String(pedido?.numeroSeguimiento || pedido?.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-10)
  return `PRE-${base || Date.now()}`
}
