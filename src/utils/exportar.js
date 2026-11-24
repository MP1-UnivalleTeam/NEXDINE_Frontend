/**
 * Exportación a PDF y Excel desde el navegador.
 *
 * Las librerías se cargan bajo demanda (import dinámico) para no aumentar el
 * peso inicial de la aplicación: solo se descargan cuando el usuario exporta.
 */

const VERDE_MARCA = [17, 54, 46] // colores.primario (#11362E)

export function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function nombreArchivoSeguro(texto) {
  return String(texto || 'archivo')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'archivo'
}

export async function cargarPdf() {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ])
  return { jsPDF, autoTable }
}

/**
 * Genera un PDF con encabezado de marca, tarjetas de resumen y una tabla.
 *
 * @param {object} opciones
 * @param {string} opciones.titulo
 * @param {string} [opciones.subtitulo]
 * @param {{etiqueta: string, valor: string}[]} [opciones.resumen]
 * @param {{titulo: string, columnas: string[], filas: (string|number)[][]}[]} opciones.tablas
 * @param {string} opciones.nombreArchivo  sin extensión
 */
export async function exportarPdf({ titulo, subtitulo = '', resumen = [], tablas = [], nombreArchivo }) {
  const { jsPDF, autoTable } = await cargarPdf()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const margen = 40

  doc.setFillColor(...VERDE_MARCA)
  doc.rect(0, 0, ancho, 70, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('NEXDINE', margen, 32)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(titulo, margen, 52)
  doc.setFontSize(9)
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, ancho - margen, 52, { align: 'right' })

  let y = 92
  doc.setTextColor(30, 41, 59)
  if (subtitulo) {
    doc.setFontSize(10)
    doc.text(subtitulo, margen, y)
    y += 18
  }

  if (resumen.length > 0) {
    const columnas = Math.min(resumen.length, 4)
    const anchoTarjeta = (ancho - margen * 2 - (columnas - 1) * 10) / columnas
    resumen.forEach((dato, indice) => {
      const fila = Math.floor(indice / columnas)
      const columna = indice % columnas
      const x = margen + columna * (anchoTarjeta + 10)
      const yTarjeta = y + fila * 56
      doc.setFillColor(241, 245, 249)
      doc.roundedRect(x, yTarjeta, anchoTarjeta, 46, 6, 6, 'F')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(String(dato.etiqueta).toUpperCase(), x + 10, yTarjeta + 16)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text(String(dato.valor), x + 10, yTarjeta + 35)
      doc.setFont('helvetica', 'normal')
    })
    y += Math.ceil(resumen.length / columnas) * 56 + 8
  }

  tablas.forEach(tabla => {
    if (tabla.titulo) {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text(tabla.titulo, margen, y + 10)
      doc.setFont('helvetica', 'normal')
      y += 16
    }
    autoTable(doc, {
      startY: y,
      head: [tabla.columnas],
      body: tabla.filas.map(fila => fila.map(celda => (celda == null ? '' : String(celda)))),
      margin: { left: margen, right: margen },
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: VERDE_MARCA, textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    })
    y = doc.lastAutoTable.finalY + 20
  })

  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Página ${i} de ${paginas}`, ancho - margen, doc.internal.pageSize.getHeight() - 20, { align: 'right' })
  }

  doc.save(`${nombreArchivoSeguro(nombreArchivo)}.pdf`)
}

/**
 * Genera un archivo .xlsx con una o varias hojas.
 *
 * @param {object} opciones
 * @param {{nombre: string, columnas: {titulo: string, clave: string, ancho?: number, formato?: 'dinero'|'numero'|'texto'}[], filas: object[]}[]} opciones.hojas
 * @param {string} opciones.nombreArchivo  sin extensión
 */
export async function exportarExcel({ hojas, nombreArchivo }) {
  const { default: ExcelJS } = await import('exceljs')
  const libro = new ExcelJS.Workbook()
  libro.creator = 'NexDine'
  libro.created = new Date()

  hojas.forEach(hoja => {
    const nombreHoja = String(hoja.nombre || 'Hoja').replace(/[\\/*?:[\]]/g, '').slice(0, 31)
    const ws = libro.addWorksheet(nombreHoja)
    ws.columns = hoja.columnas.map(col => ({
      header: col.titulo,
      key: col.clave,
      width: col.ancho || Math.max(12, col.titulo.length + 4)
    }))
    hoja.filas.forEach(fila => ws.addRow(fila))

    const encabezado = ws.getRow(1)
    encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF11362E' } }
    encabezado.alignment = { vertical: 'middle' }
    encabezado.height = 20

    hoja.columnas.forEach((col, indice) => {
      if (col.formato === 'dinero') ws.getColumn(indice + 1).numFmt = '"$"#,##0'
      if (col.formato === 'numero') ws.getColumn(indice + 1).numFmt = '#,##0'
    })
    ws.views = [{ state: 'frozen', ySplit: 1 }]
  })

  const buffer = await libro.xlsx.writeBuffer()
  descargarBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${nombreArchivoSeguro(nombreArchivo)}.xlsx`
  )
}

/** true cuando el backend aún no implementa el endpoint solicitado. */
export function esEndpointNoDisponible(err) {
  return !err?.response || [404, 405, 501].includes(err.response.status)
}
