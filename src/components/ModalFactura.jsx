import { useEffect, useState } from 'react'
import { FiFileText, FiX, FiDownload, FiSend, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi'
import { colores, sombras, radios, tarjeta, btnPrimario, btnGhost, input } from '../styles/tokens.js'
import { formatearDinero } from '../utils/dinero.js'
import { generarFacturaPdf, numeroFacturaProvisional, TIPOS_DOCUMENTO } from '../utils/factura.js'
import { esEndpointNoDisponible, nombreArchivoSeguro } from '../utils/exportar.js'
import {
  obtenerEmisor, guardarEmisorLocal, guardarEmisorServidor, emitirFactura, enviarFacturaPorCorreo, EMISOR_VACIO
} from '../services/facturas.js'

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const etiqueta = {
  display: 'block', fontSize: '12.5px', fontWeight: 600,
  color: colores.texto, marginBottom: '5px'
}

/**
 * Genera la factura de un pedido listo: PDF descargable y envío por correo.
 * Mientras el backend no emita facturas, trabaja en modo provisional.
 */
function ModalFactura({ pedido, onCerrar }) {
  const [emisor, setEmisor] = useState({ ...EMISOR_VACIO, origen: 'local' })
  const [cliente, setCliente] = useState({
    tipoDocumento: 'CC',
    documento: '',
    nombre: pedido?.nombre && pedido.nombre !== 'N/A' ? pedido.nombre : '',
    correo: '',
    telefono: pedido?.telefono && pedido.telefono !== 'N/A' ? pedido.telefono : '',
    direccion: pedido?.direccion || ''
  })
  const [factura, setFactura] = useState(null)
  const [procesando, setProcesando] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [exito, setExito] = useState('')

  // Abierta si al cargar faltan los datos obligatorios del emisor; luego la controla el usuario.
  const [emisorAbierto, setEmisorAbierto] = useState(true)
  const [emisorEditado, setEmisorEditado] = useState(false)

  useEffect(() => {
    let activo = true
    obtenerEmisor().then(datos => {
      if (!activo) return
      setEmisor(datos)
      setEmisorAbierto(!datos.razonSocial || !datos.nit)
    })
    return () => { activo = false }
  }, [])

  useEffect(() => {
    const manejarEscape = (evento) => {
      if (evento.key === 'Escape' && !procesando) {
        evento.stopPropagation()
        onCerrar()
      }
    }
    window.addEventListener('keydown', manejarEscape, true)
    return () => window.removeEventListener('keydown', manejarEscape, true)
  }, [onCerrar, procesando])

  const cambiarCliente = (campo) => (e) => setCliente(prev => ({ ...prev, [campo]: e.target.value }))
  const cambiarEmisor = (campo) => (e) => {
    setEmisorEditado(true)
    setEmisor(prev => ({ ...prev, [campo]: e.target.value }))
  }

  // Los datos del emisor viven en el servidor; solo un administrador puede cambiarlos.
  const guardarEmisorSiCambio = async () => {
    if (emisor.origen !== 'servidor' || (!emisorEditado && emisor.configurado)) return
    try {
      const guardado = await guardarEmisorServidor(emisor)
      setEmisor(guardado)
      setEmisorEditado(false)
    } catch (err) {
      if (err.response?.status === 403) {
        throw new Error('Solo un administrador puede guardar los datos del emisor. Pídele que los configure.')
      }
      throw err
    }
  }

  const validar = ({ requiereCorreo }) => {
    if (!emisor.razonSocial.trim() || !emisor.nit.trim()) {
      setEmisorAbierto(true)
      return 'Completa la razón social y el NIT del emisor (sección "Datos del emisor").'
    }
    if (!cliente.nombre.trim()) return 'Ingresa el nombre del cliente.'
    if (cliente.tipoDocumento !== 'CF' && !cliente.documento.trim()) {
      return 'Ingresa el número de documento del cliente o elige "Consumidor final".'
    }
    if (requiereCorreo && !CORREO_VALIDO.test(cliente.correo.trim())) {
      return 'Ingresa un correo electrónico válido para enviar la factura.'
    }
    if (cliente.correo.trim() && !CORREO_VALIDO.test(cliente.correo.trim())) {
      return 'El correo electrónico no es válido.'
    }
    return ''
  }

  // Emite una sola vez por apertura del modal; si el servidor aún no factura,
  // se usa una numeración provisional claramente marcada en el PDF.
  const asegurarFactura = async () => {
    if (factura) return factura
    await guardarEmisorSiCambio()
    let datos
    try {
      const emitida = await emitirFactura(pedido.id, cliente)
      datos = { numero: emitida.numero, fecha: emitida.fecha || new Date().toISOString(), cufe: emitida.cufe, provisional: false }
    } catch (err) {
      if (!esEndpointNoDisponible(err)) throw err
      datos = { numero: numeroFacturaProvisional(pedido), fecha: new Date().toISOString(), cufe: '', provisional: true }
    }
    setFactura(datos)
    return datos
  }

  const construirPdf = async () => {
    const datosFactura = await asegurarFactura()
    if (emisor.origen !== 'servidor') guardarEmisorLocal(emisor)
    const doc = await generarFacturaPdf({ pedido, emisor, cliente, factura: datosFactura })
    return { doc, datosFactura }
  }

  const descargar = async () => {
    const mensaje = validar({ requiereCorreo: false })
    if (mensaje) { setError(mensaje); return }
    setError(''); setExito(''); setAviso('')
    setProcesando('descargar')
    try {
      const { doc, datosFactura } = await construirPdf()
      doc.save(`factura-${nombreArchivoSeguro(datosFactura.numero)}.pdf`)
      setExito(`Factura ${datosFactura.numero} descargada.`)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'No fue posible generar la factura.')
    } finally {
      setProcesando('')
    }
  }

  const enviar = async () => {
    const mensaje = validar({ requiereCorreo: true })
    if (mensaje) { setError(mensaje); return }
    setError(''); setExito(''); setAviso('')
    setProcesando('enviar')
    let generado = null
    try {
      generado = await construirPdf()
      const pdf = generado.doc.output('blob')
      await enviarFacturaPorCorreo({
        pedidoId: pedido.id,
        numero: generado.datosFactura.numero,
        correo: cliente.correo.trim(),
        pdf
      })
      setExito(`Factura ${generado.datosFactura.numero} enviada a ${cliente.correo.trim()}.`)
    } catch (err) {
      const sinCorreo = err.response?.status === 503 || esEndpointNoDisponible(err)
      if (generado && sinCorreo) {
        generado.doc.save(`factura-${nombreArchivoSeguro(generado.datosFactura.numero)}.pdf`)
        setAviso('El servidor todavía no tiene configurado el envío de correos. Descargamos el PDF para que puedas enviarlo manualmente.')
      } else {
        setError(err.response?.data?.error || err.message || 'No fue posible enviar la factura.')
      }
    } finally {
      setProcesando('')
    }
  }

  const items = Array.isArray(pedido?.items) ? pedido.items : []
  const modoProvisional = emisor.origen !== 'servidor' || factura?.provisional

  return (
    <>
      <div onClick={() => !procesando && onCerrar()} style={{
        position: 'fixed', inset: 0, backgroundColor: sombras.backdrop,
        backdropFilter: 'blur(4px)', zIndex: 1060
      }} />
      <div className="modal show" style={{ display: 'block', zIndex: 1070 }} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="modal-factura-titulo">
        <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: '760px' }}>
          <div style={{ ...tarjeta, boxShadow: sombras.nivel3, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 3.5rem)', width: '100%' }}>
            <div style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colores.borde}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: radios.md, backgroundColor: colores.primario,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <FiFileText size={19} />
                </div>
                <div>
                  <h5 id="modal-factura-titulo" style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Generar factura electrónica</h5>
                  <small style={{ color: colores.textoSuave }}>
                    Pedido {pedido?.numeroSeguimiento || pedido?.id} · {items.length} producto(s) · Total {formatearDinero(pedido?.total)}
                  </small>
                </div>
              </div>
              <button type="button" onClick={onCerrar} disabled={Boolean(procesando)} aria-label="Cerrar" style={{
                border: 'none', background: 'transparent', color: colores.textoSuave, cursor: 'pointer', fontSize: '20px'
              }}>
                <FiX />
              </button>
            </div>

            <div style={{ padding: '18px 24px', overflowY: 'auto' }}>
              {modoProvisional && (
                <div role="note" style={{
                  backgroundColor: colores.advertenciaFondo, color: colores.advertenciaTexto,
                  borderRadius: radios.sm, padding: '10px 12px', fontSize: '12.5px', marginBottom: '16px',
                  display: 'flex', gap: '8px', alignItems: 'flex-start'
                }}>
                  <FiAlertTriangle style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    Modo provisional: el servidor aún no emite facturas electrónicas. El PDF se genera con
                    numeración provisional y sin CUFE (validación DIAN).
                  </span>
                </div>
              )}

              <h6 style={{ fontWeight: 700, color: colores.texto, marginBottom: '12px' }}>Datos del cliente</h6>
              <div className="row g-3 mb-2">
                <div className="col-12">
                  <label style={etiqueta} htmlFor="factura-correo">Correo al que se enviará la factura *</label>
                  <input id="factura-correo" type="email" autoComplete="email" placeholder="cliente@correo.com"
                    value={cliente.correo} onChange={cambiarCliente('correo')} style={{ ...input, width: '100%', padding: '0 12px' }} />
                </div>
                <div className="col-12 col-md-6">
                  <label style={etiqueta} htmlFor="factura-nombre">Nombre o razón social *</label>
                  <input id="factura-nombre" value={cliente.nombre} onChange={cambiarCliente('nombre')}
                    style={{ ...input, width: '100%', padding: '0 12px' }} />
                </div>
                <div className="col-5 col-md-2">
                  <label style={etiqueta} htmlFor="factura-tipodoc">Tipo</label>
                  <select id="factura-tipodoc" value={cliente.tipoDocumento} onChange={cambiarCliente('tipoDocumento')}
                    style={{ ...input, width: '100%', padding: '0 8px' }}>
                    {TIPOS_DOCUMENTO.map(t => <option key={t.valor} value={t.valor} title={t.etiqueta}>{t.valor}</option>)}
                  </select>
                </div>
                <div className="col-7 col-md-4">
                  <label style={etiqueta} htmlFor="factura-documento">Documento {cliente.tipoDocumento !== 'CF' ? '*' : ''}</label>
                  <input id="factura-documento" value={cliente.documento} onChange={cambiarCliente('documento')}
                    disabled={cliente.tipoDocumento === 'CF'} placeholder={cliente.tipoDocumento === 'CF' ? 'No aplica' : ''}
                    style={{ ...input, width: '100%', padding: '0 12px' }} />
                </div>
                <div className="col-12 col-md-6">
                  <label style={etiqueta} htmlFor="factura-telefono">Teléfono</label>
                  <input id="factura-telefono" value={cliente.telefono} onChange={cambiarCliente('telefono')}
                    style={{ ...input, width: '100%', padding: '0 12px' }} />
                </div>
                <div className="col-12 col-md-6">
                  <label style={etiqueta} htmlFor="factura-direccion">Dirección</label>
                  <input id="factura-direccion" value={cliente.direccion} onChange={cambiarCliente('direccion')}
                    style={{ ...input, width: '100%', padding: '0 12px' }} />
                </div>
              </div>

              <details style={{ marginTop: '14px', backgroundColor: colores.superficie, borderRadius: radios.md, padding: '12px 14px' }}
                open={emisorAbierto} onToggle={(e) => setEmisorAbierto(e.currentTarget.open)}>
                <summary style={{ fontWeight: 700, color: colores.texto, cursor: 'pointer' }}>
                  Datos del emisor {emisor.razonSocial ? `· ${emisor.razonSocial}` : ''}
                </summary>
                <div className="row g-3 mt-1">
                  {[
                    ['razonSocial', 'Razón social *', 'col-12 col-md-6'],
                    ['nit', 'NIT *', 'col-12 col-md-6'],
                    ['regimen', 'Régimen / responsabilidad', 'col-12 col-md-6'],
                    ['ciudad', 'Ciudad', 'col-12 col-md-6'],
                    ['direccion', 'Dirección', 'col-12 col-md-6'],
                    ['telefono', 'Teléfono', 'col-12 col-md-3'],
                    ['correo', 'Correo', 'col-12 col-md-3']
                  ].map(([campo, texto, clase]) => (
                    <div key={campo} className={clase}>
                      <label style={etiqueta} htmlFor={`emisor-${campo}`}>{texto}</label>
                      <input id={`emisor-${campo}`} value={emisor[campo] || ''} onChange={cambiarEmisor(campo)}
                        style={{ ...input, width: '100%', padding: '0 12px', backgroundColor: colores.tarjeta }} />
                    </div>
                  ))}
                </div>
                <small style={{ color: colores.textoSuave, display: 'block', marginTop: '8px' }}>
                  {emisor.origen === 'servidor'
                    ? 'Se guardan en el servidor para todas las facturas del restaurante (solo el administrador puede cambiarlos).'
                    : 'Sin conexión con el servidor: se guardan solo en este navegador.'}
                </small>
              </details>

              {error && (
                <div role="alert" style={{ marginTop: '14px', backgroundColor: colores.errorFondo, color: colores.errorTexto, borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px' }}>
                  {error}
                </div>
              )}
              {aviso && (
                <div role="status" style={{ marginTop: '14px', backgroundColor: colores.advertenciaFondo, color: colores.advertenciaTexto, borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px' }}>
                  {aviso}
                </div>
              )}
              {exito && (
                <div role="status" style={{ marginTop: '14px', backgroundColor: colores.exitoFondo, color: colores.exitoTexto, borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <FiCheckCircle /> {exito}
                </div>
              )}
            </div>

            <div style={{
              borderTop: `1px solid ${colores.borde}`, backgroundColor: colores.superficie,
              padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap'
            }}>
              <button type="button" className="btn" onClick={onCerrar} disabled={Boolean(procesando)} style={{ ...btnGhost, minHeight: '44px' }}>
                Cerrar
              </button>
              <button type="button" className="btn" onClick={descargar} disabled={Boolean(procesando)} style={{ ...btnGhost, minHeight: '44px' }}>
                <FiDownload style={{ marginRight: '6px' }} />
                {procesando === 'descargar' ? 'Generando…' : 'Descargar PDF'}
              </button>
              <button type="button" className="btn" onClick={enviar} disabled={Boolean(procesando)} style={{ ...btnPrimario, minHeight: '44px' }}>
                <FiSend style={{ marginRight: '6px' }} />
                {procesando === 'enviar' ? 'Enviando…' : 'Enviar por correo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ModalFactura
