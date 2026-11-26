import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiRotateCcw, FiX, FiSend, FiDownload, FiCheck, FiSlash, FiCheckCircle } from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import { UbicacionActual } from '../components/EncabezadoPagina.jsx'
import {
  listarReembolsos, listarPendientesDeReembolso, registrarReembolso,
  actualizarEstadoReembolso, enviarComprobanteReembolso
} from '../services/reembolsos.js'
import { obtenerEmisor } from '../services/facturas.js'
import { generarComprobanteReembolso, enmascarar } from '../utils/comprobanteReembolso.js'
import { formatearDinero } from '../utils/dinero.js'
import { nombreArchivoSeguro } from '../utils/exportar.js'
import { colores, radios, sombras, tarjeta, btnPrimario, btnGhost, input, estiloBadge, cifrasTabulares } from '../styles/tokens.js'

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const etiqueta = { display: 'block', fontSize: '12.5px', fontWeight: 600, color: colores.texto, marginBottom: '5px' }
const ESTADOS = {
  EN_PROCESO: { texto: 'En proceso', fondo: colores.advertenciaFondo, color: colores.advertenciaTexto },
  COMPLETADO: { texto: 'Completado', fondo: colores.exitoFondo, color: colores.exitoTexto },
  RECHAZADO: { texto: 'Rechazado', fondo: colores.errorFondo, color: colores.errorTexto }
}

function ModalRegistrar({ pendiente, onCerrar, onRegistrado }) {
  const [datos, setDatos] = useState({
    metodo: pendiente.pagoMetodo === 'TARJETA' ? 'TARJETA' : 'NEQUI',
    destino: '',
    monto: String(Math.round(Number(pendiente.pendiente) || 0)),
    correo: pendiente.correo || '',
    motivo: pendiente.motivoCancelacion || ''
  })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const cambiar = (campo) => (e) => setDatos(prev => ({ ...prev, [campo]: e.target.value }))

  useEffect(() => {
    const escape = (e) => { if (e.key === 'Escape' && !guardando) onCerrar() }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [onCerrar, guardando])

  const enviar = async (e) => {
    e.preventDefault()
    const monto = Number(datos.monto)
    if (!(monto > 0)) return setError('Indica un monto mayor que cero.')
    if (monto > Number(pendiente.pendiente)) return setError(`El monto no puede superar ${formatearDinero(pendiente.pendiente)}.`)
    if (datos.metodo === 'NEQUI' && !/^3\d{9}$/.test(datos.destino.replace(/\s/g, ''))) {
      return setError('Escribe el celular Nequi del cliente (10 dígitos, empieza por 3).')
    }
    if (datos.correo.trim() && !CORREO_VALIDO.test(datos.correo.trim())) return setError('El correo no es válido.')
    setError('')
    setGuardando(true)
    try {
      const reembolso = await registrarReembolso(pendiente.pedidoId, { ...datos, monto, correo: datos.correo.trim() })
      onRegistrado(reembolso)
    } catch (err) {
      setError(err.response?.data?.error || 'No fue posible registrar el reembolso.')
      setGuardando(false)
    }
  }

  const chip = (activo) => ({
    flex: 1, minHeight: '44px', borderRadius: radios.sm, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${activo ? colores.primario : colores.borde}`,
    backgroundColor: activo ? colores.mint : colores.tarjeta, color: colores.texto
  })

  return (
    <>
      <div onClick={() => !guardando && onCerrar()} style={{ position: 'fixed', inset: 0, backgroundColor: sombras.backdrop, backdropFilter: 'blur(4px)', zIndex: 1040 }} />
      <div className="modal show" style={{ display: 'block', zIndex: 1050 }} role="dialog" aria-modal="true" aria-labelledby="titulo-reembolso">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '520px' }}>
          <form onSubmit={enviar} style={{ ...tarjeta, boxShadow: sombras.nivel3, overflow: 'hidden', width: '100%' }}>
            <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colores.borde}` }}>
              <div>
                <h5 id="titulo-reembolso" style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Registrar reembolso</h5>
                <small style={{ color: colores.textoSuave }}>Pedido {pendiente.numeroSeguimiento} · {pendiente.cliente}</small>
              </div>
              <button type="button" aria-label="Cerrar" onClick={onCerrar} style={{ border: 'none', background: 'transparent', color: colores.textoSuave, fontSize: '20px', cursor: 'pointer' }}><FiX /></button>
            </div>
            <div style={{ padding: '18px 22px' }}>
              <span style={etiqueta}>Reembolsar a</span>
              <div role="radiogroup" aria-label="Medio de reembolso" style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button type="button" role="radio" aria-checked={datos.metodo === 'NEQUI'} onClick={() => setDatos(p => ({ ...p, metodo: 'NEQUI' }))} style={chip(datos.metodo === 'NEQUI')}>Nequi</button>
                <button type="button" role="radio" aria-checked={datos.metodo === 'TARJETA'} onClick={() => setDatos(p => ({ ...p, metodo: 'TARJETA' }))} style={chip(datos.metodo === 'TARJETA')}>Tarjeta</button>
              </div>
              {datos.metodo === 'TARJETA' && pendiente.pagoMetodo === 'TARJETA' && (
                <small style={{ color: colores.textoSuave, display: 'block', marginTop: '-6px', marginBottom: '12px' }}>
                  El pago se cobró con tarjeta en línea: el reembolso se solicita a la pasarela automáticamente.
                </small>
              )}
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label style={etiqueta} htmlFor="re-destino">{datos.metodo === 'NEQUI' ? 'Celular Nequi *' : 'Últimos 4 dígitos (opcional)'}</label>
                  <input id="re-destino" inputMode="numeric" value={datos.destino} maxLength={datos.metodo === 'NEQUI' ? 13 : 4} onChange={cambiar('destino')} style={{ ...input, width: '100%', padding: '0 12px' }} />
                </div>
                <div className="col-12 col-md-6">
                  <label style={etiqueta} htmlFor="re-monto">Monto *</label>
                  <input id="re-monto" type="number" min="1" step="1" value={datos.monto} onChange={cambiar('monto')} style={{ ...input, width: '100%', padding: '0 12px', ...cifrasTabulares }} />
                  <small style={{ color: colores.textoSuave }}>Máximo {formatearDinero(pendiente.pendiente)}</small>
                </div>
                <div className="col-12">
                  <label style={etiqueta} htmlFor="re-correo">Correo del cliente (para el comprobante)</label>
                  <input id="re-correo" type="email" value={datos.correo} onChange={cambiar('correo')} style={{ ...input, width: '100%', padding: '0 12px' }} />
                </div>
                <div className="col-12">
                  <label style={etiqueta} htmlFor="re-motivo">Motivo</label>
                  <input id="re-motivo" value={datos.motivo} maxLength={300} onChange={cambiar('motivo')} style={{ ...input, width: '100%', padding: '0 12px' }} />
                </div>
              </div>
              {error && <div role="alert" style={{ marginTop: '14px', backgroundColor: colores.errorFondo, color: colores.errorTexto, borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px' }}>{error}</div>}
            </div>
            <div style={{ borderTop: `1px solid ${colores.borde}`, backgroundColor: colores.superficie, padding: '14px 22px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn" onClick={onCerrar} disabled={guardando} style={{ ...btnGhost, minHeight: '44px' }}>Cancelar</button>
              <button type="submit" className="btn" disabled={guardando} style={{ ...btnPrimario, minHeight: '44px' }}>
                {guardando ? 'Registrando…' : 'Registrar reembolso'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

function Reembolsos() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [pendientes, setPendientes] = useState([])
  const [reembolsos, setReembolsos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [pestana, setPestana] = useState('PENDIENTES')
  const [registrando, setRegistrando] = useState(null)
  const [procesando, setProcesando] = useState('')
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })

  useEffect(() => {
    api.get('/api/auth/me')
      .then(({ data }) => {
        if (data?.rol !== 'ADMINISTRADOR' && data?.rol !== 'SUPERADMIN') {
          navigate(data?.rol === 'CLIENTE' ? '/menu' : '/pedidos')
          return
        }
        setCurrentUser(data)
      })
      .catch(() => navigate('/login'))
  }, [navigate])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [p, r] = await Promise.all([listarPendientesDeReembolso(), listarReembolsos()])
      setPendientes(p)
      setReembolsos(r)
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'No fue posible cargar los reembolsos.' })
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { if (currentUser) cargar() }, [currentUser, cargar])

  const avisar = (tipo, texto) => {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 6000)
  }

  const generarPdf = async (reembolso) => {
    const emisor = await obtenerEmisor()
    return generarComprobanteReembolso({ reembolso, emisor })
  }

  const nombrePdf = (r) => `reembolso-${nombreArchivoSeguro(r.numeroSeguimiento || r.id)}.pdf`

  const descargar = async (r) => {
    setProcesando(`pdf-${r.id}`)
    try {
      const doc = await generarPdf(r)
      doc.save(nombrePdf(r))
    } finally {
      setProcesando('')
    }
  }

  const enviarCorreo = async (r) => {
    let correo = r.correo
    if (!correo || !CORREO_VALIDO.test(correo)) {
      correo = window.prompt('Correo del cliente para enviar el comprobante:', '') || ''
      if (!CORREO_VALIDO.test(correo.trim())) {
        if (correo) avisar('error', 'El correo no es válido.')
        return
      }
      correo = correo.trim()
    }
    setProcesando(`correo-${r.id}`)
    let doc = null
    try {
      doc = await generarPdf(r)
      await enviarComprobanteReembolso(r.id, correo, doc.output('blob'), nombrePdf(r))
      avisar('exito', `Comprobante enviado a ${correo}.`)
      await cargar()
    } catch (err) {
      if (doc && err.response?.status === 503) {
        doc.save(nombrePdf(r))
        avisar('aviso', 'El servidor todavía no tiene configurado el envío de correos. Descargamos el comprobante para que lo envíes manualmente.')
      } else {
        avisar('error', err.response?.data?.error || 'No fue posible enviar el comprobante.')
      }
    } finally {
      setProcesando('')
    }
  }

  const cambiarEstado = async (r, estado) => {
    let referencia = ''
    if (estado === 'COMPLETADO') {
      referencia = window.prompt('Referencia de la transferencia o del reembolso (opcional):', r.referenciaExterna || '') ?? null
      if (referencia === null) return
    } else if (!window.confirm('¿Marcar este reembolso como rechazado?')) {
      return
    }
    setProcesando(`estado-${r.id}`)
    try {
      await actualizarEstadoReembolso(r.id, estado, referencia.trim())
      avisar('exito', estado === 'COMPLETADO' ? 'Reembolso marcado como completado.' : 'Reembolso marcado como rechazado.')
      await cargar()
    } catch (err) {
      avisar('error', err.response?.data?.error || 'No fue posible actualizar el reembolso.')
    } finally {
      setProcesando('')
    }
  }

  const handleLogout = async () => {
    try { await api.get('/logout') } catch { /* sesión ya cerrada */ }
    navigate('/login')
  }

  if (!currentUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: colores.fondo }}>
        <div className="spinner-border" style={{ color: colores.primario }}></div>
      </div>
    )
  }

  const PESTANAS = [
    { id: 'PENDIENTES', etiqueta: 'Por reembolsar', cantidad: pendientes.length },
    { id: 'EN_PROCESO', etiqueta: 'En proceso', cantidad: reembolsos.filter(r => r.estado === 'EN_PROCESO').length },
    { id: 'TODOS', etiqueta: 'Historial', cantidad: reembolsos.length }
  ]
  const visibles = pestana === 'EN_PROCESO' ? reembolsos.filter(r => r.estado === 'EN_PROCESO') : reembolsos
  const colorMensaje = mensaje.tipo === 'error'
    ? [colores.errorFondo, colores.errorTexto]
    : mensaje.tipo === 'aviso' ? [colores.advertenciaFondo, colores.advertenciaTexto] : [colores.exitoFondo, colores.exitoTexto]

  return (
    <div className="nexdine-shell" style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', backgroundColor: colores.fondo }}>
      <Sidebar currentUser={currentUser} rutaActual="/reembolsos" onLogout={handleLogout} />
      <div className="nexdine-main" style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0 }}>
        <div style={{ marginBottom: '20px' }}>
          <UbicacionActual />
          <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Reembolsos</h2>
          <small style={{ color: colores.textoSuave }}>Devoluciones a Nequi o tarjeta de pedidos cancelados que ya estaban pagados.</small>
        </div>

        {mensaje.texto && (
          <div role={mensaje.tipo === 'error' ? 'alert' : 'status'} style={{ ...tarjeta, backgroundColor: colorMensaje[0], color: colorMensaje[1], border: 'none', padding: '12px 16px', marginBottom: '16px', fontSize: '13.5px' }}>
            {mensaje.texto}
          </div>
        )}

        <div role="tablist" aria-label="Reembolsos" style={{ display: 'flex', gap: '4px', borderBottom: `1px solid ${colores.borde}`, marginBottom: '14px', overflowX: 'auto', overflowY: 'hidden' }}>
          {PESTANAS.map(p => {
            const activa = p.id === pestana
            return (
              <button key={p.id} type="button" role="tab" aria-selected={activa} onClick={() => setPestana(p.id)} style={{
                border: 'none', background: 'transparent', padding: '10px 14px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600, fontSize: '14px',
                color: activa ? colores.primario : colores.textoSuave, borderBottom: `2px solid ${activa ? colores.primario : 'transparent'}`, marginBottom: '-1px'
              }}>
                {p.etiqueta}
                <span style={{ ...estiloBadge(activa ? colores.mint : colores.superficie, activa ? colores.primario : colores.textoSuave), marginLeft: '8px', height: '20px' }}>{p.cantidad}</span>
              </button>
            )
          })}
        </div>

        {cargando ? (
          <div role="status" style={{ ...tarjeta, padding: '48px', textAlign: 'center' }}>
            <div className="spinner-border" style={{ color: colores.primario }}></div>
          </div>
        ) : pestana === 'PENDIENTES' ? (
          pendientes.length === 0 ? (
            <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
              <FiCheckCircle style={{ fontSize: '2rem', color: colores.exito }} className="mb-2" />
              <div style={{ fontWeight: 600, color: colores.texto }}>No hay pedidos pendientes de reembolso</div>
              <small>Aquí aparecen los pedidos cancelados que tenían un pago registrado.</small>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendientes.map(p => (
                <div key={p.pedidoId} style={{ ...tarjeta, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: colores.texto }}>{p.numeroSeguimiento} · {p.cliente}</div>
                    <small style={{ color: colores.textoSuave, display: 'block' }}>Motivo: {p.motivoCancelacion || '—'}</small>
                    <small style={{ color: colores.textoSuave }}>
                      Pagado {formatearDinero(p.pagado)}{Number(p.reembolsado) > 0 ? ` · ya reembolsado ${formatearDinero(p.reembolsado)}` : ''}
                    </small>
                  </div>
                  <div style={{ textAlign: 'right', ...cifrasTabulares }}>
                    <small style={{ color: colores.textoSuave, display: 'block' }}>Por reembolsar</small>
                    <strong style={{ color: colores.texto, fontSize: '17px' }}>{formatearDinero(p.pendiente)}</strong>
                  </div>
                  <button type="button" className="btn" onClick={() => setRegistrando(p)} style={{ ...btnPrimario, minHeight: '42px' }}>
                    <FiRotateCcw style={{ marginRight: '6px' }} /> Reembolsar
                  </button>
                </div>
              ))}
            </div>
          )
        ) : visibles.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <div style={{ fontWeight: 600, color: colores.texto }}>Sin reembolsos registrados</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibles.map(r => {
              const estado = ESTADOS[r.estado] || ESTADOS.EN_PROCESO
              return (
                <div key={r.id} style={{ ...tarjeta, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ color: colores.texto }}>{r.numeroSeguimiento} · {r.cliente}</strong>
                      <span style={estiloBadge(estado.fondo, estado.color)}>{estado.texto}</span>
                    </div>
                    <small style={{ color: colores.textoSuave, display: 'block' }}>
                      {r.metodo === 'NEQUI' ? 'Nequi' : 'Tarjeta'} {enmascarar(r.destino)} · {new Date(r.fechaCreacion).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                      {r.referenciaExterna ? ` · Ref. ${r.referenciaExterna}` : ''}
                    </small>
                    {r.fechaEnvioCorreo && <small style={{ color: colores.exitoTexto }}>Comprobante enviado a {r.correo}</small>}
                  </div>
                  <strong style={{ color: colores.texto, fontSize: '16px', ...cifrasTabulares }}>{formatearDinero(r.monto)}</strong>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button type="button" className="btn" disabled={Boolean(procesando)} onClick={() => enviarCorreo(r)} style={{ ...btnGhost, minHeight: '38px', fontSize: '13px' }}>
                      <FiSend style={{ marginRight: '5px' }} />{procesando === `correo-${r.id}` ? 'Enviando…' : 'Enviar comprobante'}
                    </button>
                    <button type="button" className="btn" aria-label="Descargar comprobante" title="Descargar comprobante" disabled={Boolean(procesando)} onClick={() => descargar(r)} style={{ ...btnGhost, minHeight: '38px', padding: '0 10px' }}>
                      <FiDownload />
                    </button>
                    {r.estado === 'EN_PROCESO' && (
                      <>
                        <button type="button" className="btn" disabled={Boolean(procesando)} onClick={() => cambiarEstado(r, 'COMPLETADO')} style={{ ...btnGhost, minHeight: '38px', fontSize: '13px', color: colores.exitoTexto }}>
                          <FiCheck style={{ marginRight: '5px' }} />Completado
                        </button>
                        <button type="button" className="btn" aria-label="Marcar como rechazado" title="Marcar como rechazado" disabled={Boolean(procesando)} onClick={() => cambiarEstado(r, 'RECHAZADO')} style={{ ...btnGhost, minHeight: '38px', padding: '0 10px', color: colores.errorTexto }}>
                          <FiSlash />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {registrando && (
        <ModalRegistrar
          pendiente={registrando}
          onCerrar={() => setRegistrando(null)}
          onRegistrado={async () => {
            setRegistrando(null)
            avisar('exito', 'Reembolso registrado. Ya puedes enviar el comprobante al cliente.')
            setPestana('EN_PROCESO')
            await cargar()
          }}
        />
      )}
    </div>
  )
}

export default Reembolsos
