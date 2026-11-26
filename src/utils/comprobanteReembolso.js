import { cargarPdf } from './exportar.js'
import { formatearDinero } from './dinero.js'

const VERDE = [17, 54, 46]
const GRIS = [100, 116, 139]
const TEXTO = [30, 41, 59]

const ESTADOS = {
  EN_PROCESO: 'En proceso',
  COMPLETADO: 'Completado',
  RECHAZADO: 'Rechazado'
}

/** Oculta todo menos los últimos 4 dígitos del celular o tarjeta. */
export function enmascarar(destino) {
  const limpio = String(destino || '').replace(/\s/g, '')
  if (limpio.length <= 4) return limpio || '—'
  return `•••• ${limpio.slice(-4)}`
}

/**
 * RF032: comprobante en PDF (formato tipo factura) que informa al cliente
 * que su reembolso está en proceso.
 */
export async function generarComprobanteReembolso({ reembolso, emisor }) {
  const { jsPDF, autoTable } = await cargarPdf()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  const m = 40

  doc.setFillColor(...VERDE)
  doc.rect(0, 0, ancho, 96, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text(emisor?.razonSocial || 'Restaurante', m, 34)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const lineas = [
    emisor?.nit ? `NIT ${emisor.nit}` : null,
    [emisor?.direccion, emisor?.ciudad].filter(Boolean).join(', ') || null,
    [emisor?.telefono ? `Tel. ${emisor.telefono}` : null, emisor?.correo].filter(Boolean).join(' · ') || null
  ].filter(Boolean)
  lineas.forEach((linea, i) => doc.text(linea, m, 50 + i * 11))

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('COMPROBANTE DE REEMBOLSO', ancho - m, 34, { align: 'right' })
  doc.setFontSize(13)
  doc.text(`Pedido ${reembolso.numeroSeguimiento || ''}`, ancho - m, 54, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Fecha: ${new Date(reembolso.fechaCreacion || Date.now()).toLocaleString('es-CO')}`, ancho - m, 70, { align: 'right' })
  doc.text(`Estado: ${ESTADOS[reembolso.estado] || reembolso.estado}`, ancho - m, 82, { align: 'right' })

  let y = 124
  doc.setTextColor(...TEXTO)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(
    reembolso.estado === 'COMPLETADO' ? 'Tu reembolso fue realizado' : 'Tu reembolso está en proceso',
    m, y
  )
  y += 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...GRIS)
  const explicacion = reembolso.metodo === 'NEQUI'
    ? 'El dinero se transferirá a la cuenta Nequi indicada. Puede tardar hasta 3 días hábiles.'
    : 'El dinero se devolverá a la tarjeta con la que pagaste. Según tu banco, puede tardar entre 5 y 10 días hábiles.'
  doc.text(doc.splitTextToSize(explicacion, ancho - m * 2), m, y)
  y += 26

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    margin: { left: m, right: m },
    styles: { fontSize: 10, cellPadding: 7, textColor: TEXTO },
    columnStyles: { 0: { fontStyle: 'bold', textColor: GRIS, cellWidth: 170 } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    body: [
      ['Cliente', reembolso.cliente || '—'],
      ['Pedido', reembolso.numeroSeguimiento || '—'],
      ['Total del pedido', reembolso.totalPedido != null ? formatearDinero(reembolso.totalPedido) : '—'],
      ['Monto a reembolsar', formatearDinero(reembolso.monto)],
      ['Medio de reembolso', reembolso.metodo === 'NEQUI' ? 'Nequi' : 'Tarjeta'],
      ['Cuenta / tarjeta', enmascarar(reembolso.destino)],
      ['Motivo', reembolso.motivo || '—'],
      ['Referencia', reembolso.referenciaExterna || 'Se asignará al completar el reembolso']
    ]
  })

  const pie = alto - 60
  doc.setDrawColor(226, 232, 240)
  doc.line(m, pie - 10, ancho - m, pie - 10)
  doc.setFontSize(8)
  doc.setTextColor(...GRIS)
  doc.text('Este comprobante no es una factura. Consérvalo para cualquier reclamación.', m, pie + 4)
  doc.text('Generado con NexDine', m, pie + 16)
  return doc
}
