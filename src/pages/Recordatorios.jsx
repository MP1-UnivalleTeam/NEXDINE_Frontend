import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiBell, FiEdit2, FiTrash2, FiX, FiAlertTriangle, FiClock, FiMail, FiMonitor } from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import { UbicacionActual } from '../components/EncabezadoPagina.jsx'
import {
  PLANTILLAS, FRECUENCIAS, DIAS_SEMANA, recordatorioVacio, listarRecordatorios, guardarRecordatorio,
  eliminarRecordatorio, describirFrecuencia, proximaOcurrencia
} from '../services/recordatorios.js'
import { colores, radios, sombras, tarjeta, btnPrimario, btnGhost, input, estiloBadge } from '../styles/tokens.js'

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const etiqueta = { display: 'block', fontSize: '12.5px', fontWeight: 600, color: colores.texto, marginBottom: '5px' }

function Interruptor({ activo, onCambiar, etiquetaAccesible }) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-label={etiquetaAccesible} onClick={onCambiar} style={{
      width: '44px', height: '24px', borderRadius: radios.full, border: 'none', padding: '2px', cursor: 'pointer',
      backgroundColor: activo ? colores.exito : colores.borde, display: 'flex',
      justifyContent: activo ? 'flex-end' : 'flex-start', transition: 'background-color 0.15s ease', flexShrink: 0
    }}>
      <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  )
}

function FormularioRecordatorio({ inicial, onGuardar, onCerrar, guardando }) {
  const [datos, setDatos] = useState(inicial)
  const [error, setError] = useState('')

  useEffect(() => {
    const escape = (e) => { if (e.key === 'Escape' && !guardando) onCerrar() }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [onCerrar, guardando])

  const cambiar = (campo, valor) => setDatos(prev => ({ ...prev, [campo]: valor }))

  const elegirPlantilla = (tipo) => {
    const plantilla = PLANTILLAS.find(p => p.tipo === tipo)
    setDatos(prev => ({
      ...prev, tipo,
      titulo: tipo === 'PERSONALIZADO' ? prev.titulo : plantilla.titulo,
      mensaje: tipo === 'PERSONALIZADO' ? prev.mensaje : plantilla.mensaje
    }))
  }

  const alternarDia = (dia) => cambiar('diasSemana',
    datos.diasSemana.includes(dia) ? datos.diasSemana.filter(d => d !== dia) : [...datos.diasSemana, dia])

  const alternarCanal = (canal) => cambiar('canales',
    datos.canales.includes(canal) ? datos.canales.filter(c => c !== canal) : [...datos.canales, canal])

  const enviar = (e) => {
    e.preventDefault()
    if (!datos.titulo.trim()) return setError('Escribe un título para el recordatorio.')
    if (!datos.hora) return setError('Indica la hora del recordatorio.')
    if (datos.frecuencia === 'UNA_VEZ' && !datos.fecha) return setError('Indica la fecha del recordatorio.')
    if (datos.frecuencia === 'SEMANAL' && datos.diasSemana.length === 0) return setError('Elige al menos un día de la semana.')
    if (datos.canales.length === 0) return setError('Elige al menos un canal de aviso.')
    if (datos.canales.includes('CORREO')) {
      const correos = datos.destinatarios.split(',').map(c => c.trim()).filter(Boolean)
      if (correos.length === 0 || correos.some(c => !CORREO_VALIDO.test(c))) {
        return setError('Escribe correos válidos separados por coma.')
      }
    }
    setError('')
    onGuardar({ ...datos, titulo: datos.titulo.trim(), mensaje: datos.mensaje.trim() })
  }

  const chip = (activo) => ({
    minHeight: '38px', padding: '0 12px', borderRadius: radios.full, fontWeight: 600, fontSize: '13px', cursor: 'pointer',
    border: `1px solid ${activo ? colores.primario : colores.borde}`,
    backgroundColor: activo ? colores.primario : colores.tarjeta, color: activo ? 'white' : colores.texto
  })

  return (
    <>
      <div onClick={() => !guardando && onCerrar()} style={{ position: 'fixed', inset: 0, backgroundColor: sombras.backdrop, backdropFilter: 'blur(4px)', zIndex: 1040 }} />
      <div className="modal show" style={{ display: 'block', zIndex: 1050 }} role="dialog" aria-modal="true" aria-labelledby="titulo-recordatorio">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '560px' }}>
          <form onSubmit={enviar} style={{ ...tarjeta, boxShadow: sombras.nivel3, overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 3.5rem)' }}>
            <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colores.borde}` }}>
              <h5 id="titulo-recordatorio" style={{ margin: 0, fontWeight: 700, color: colores.texto }}>
                {inicial.id ? 'Editar recordatorio' : 'Nuevo recordatorio'}
              </h5>
              <button type="button" aria-label="Cerrar" onClick={onCerrar} style={{ border: 'none', background: 'transparent', color: colores.textoSuave, fontSize: '20px', cursor: 'pointer' }}>
                <FiX />
              </button>
            </div>

            <div style={{ padding: '18px 22px', overflowY: 'auto' }}>
              <label style={etiqueta} htmlFor="rec-plantilla">Tipo</label>
              <select id="rec-plantilla" value={datos.tipo} onChange={(e) => elegirPlantilla(e.target.value)} style={{ ...input, width: '100%', padding: '0 10px', marginBottom: '14px' }}>
                {PLANTILLAS.map(p => <option key={p.tipo} value={p.tipo}>{p.titulo || 'Personalizado'}</option>)}
              </select>

              <label style={etiqueta} htmlFor="rec-titulo">Título *</label>
              <input id="rec-titulo" value={datos.titulo} maxLength={80} onChange={(e) => cambiar('titulo', e.target.value)} style={{ ...input, width: '100%', padding: '0 12px', marginBottom: '14px' }} />

              <label style={etiqueta} htmlFor="rec-mensaje">Mensaje</label>
              <textarea id="rec-mensaje" rows={2} maxLength={240} value={datos.mensaje} onChange={(e) => cambiar('mensaje', e.target.value)}
                style={{ ...input, height: 'auto', width: '100%', padding: '10px 12px', marginBottom: '14px' }} />

              <span style={etiqueta}>Frecuencia</span>
              <div role="group" aria-label="Frecuencia" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {FRECUENCIAS.map(f => (
                  <button key={f.valor} type="button" aria-pressed={datos.frecuencia === f.valor} onClick={() => cambiar('frecuencia', f.valor)} style={chip(datos.frecuencia === f.valor)}>
                    {f.etiqueta}
                  </button>
                ))}
              </div>

              <div className="row g-3 mb-1">
                {datos.frecuencia === 'UNA_VEZ' && (
                  <div className="col-7">
                    <label style={etiqueta} htmlFor="rec-fecha">Fecha *</label>
                    <input id="rec-fecha" type="date" value={datos.fecha} onChange={(e) => cambiar('fecha', e.target.value)} style={{ ...input, width: '100%', padding: '0 10px' }} />
                  </div>
                )}
                {datos.frecuencia === 'MENSUAL' && (
                  <div className="col-7">
                    <label style={etiqueta} htmlFor="rec-diames">Día del mes</label>
                    <select id="rec-diames" value={datos.diaMes} onChange={(e) => cambiar('diaMes', Number(e.target.value))} style={{ ...input, width: '100%', padding: '0 10px' }}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}{d > 28 ? ' (o último día)' : ''}</option>)}
                    </select>
                  </div>
                )}
                <div className="col-5">
                  <label style={etiqueta} htmlFor="rec-hora">Hora *</label>
                  <input id="rec-hora" type="time" value={datos.hora} onChange={(e) => cambiar('hora', e.target.value)} style={{ ...input, width: '100%', padding: '0 10px' }} />
                </div>
              </div>

              {datos.frecuencia === 'SEMANAL' && (
                <div role="group" aria-label="Días de la semana" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                  {[1, 2, 3, 4, 5, 6, 0].map(d => (
                    <button key={d} type="button" aria-pressed={datos.diasSemana.includes(d)} onClick={() => alternarDia(d)} style={{ ...chip(datos.diasSemana.includes(d)), minWidth: '50px' }}>
                      {DIAS_SEMANA[d]}
                    </button>
                  ))}
                </div>
              )}

              <span style={{ ...etiqueta, marginTop: '16px' }}>Avisar por</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <button type="button" aria-pressed={datos.canales.includes('APP')} onClick={() => alternarCanal('APP')} style={chip(datos.canales.includes('APP'))}>
                  <FiMonitor style={{ marginRight: '6px' }} /> Aviso en la aplicación
                </button>
                <button type="button" aria-pressed={datos.canales.includes('CORREO')} onClick={() => alternarCanal('CORREO')} style={chip(datos.canales.includes('CORREO'))}>
                  <FiMail style={{ marginRight: '6px' }} /> Correo
                </button>
              </div>
              {datos.canales.includes('CORREO') && (
                <>
                  <label style={etiqueta} htmlFor="rec-correos">Destinatarios (separados por coma)</label>
                  <input id="rec-correos" type="text" value={datos.destinatarios} placeholder="gerente@restaurante.com, caja@restaurante.com"
                    onChange={(e) => cambiar('destinatarios', e.target.value)} style={{ ...input, width: '100%', padding: '0 12px' }} />
                  <small style={{ color: colores.textoSuave, display: 'block', marginTop: '6px' }}>
                    El servidor envía el correo a la hora programada, aunque nadie tenga NexDine abierto.
                  </small>
                </>
              )}

              {error && (
                <div role="alert" style={{ marginTop: '14px', backgroundColor: colores.errorFondo, color: colores.errorTexto, borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px' }}>
                  {error}
                </div>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${colores.borde}`, backgroundColor: colores.superficie, padding: '14px 22px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn" onClick={onCerrar} disabled={guardando} style={{ ...btnGhost, minHeight: '44px' }}>Cancelar</button>
              <button type="submit" className="btn" disabled={guardando} style={{ ...btnPrimario, minHeight: '44px' }}>
                {guardando ? 'Guardando…' : 'Guardar recordatorio'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

function Recordatorios() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [lista, setLista] = useState([])
  const [origen, setOrigen] = useState('local')
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [permiso, setPermiso] = useState('Notification' in window ? Notification.permission : 'unsupported')
  const [pestana, setPestana] = useState('ACTIVOS')

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
      const resultado = await listarRecordatorios()
      setLista(resultado.lista)
      setOrigen(resultado.origen)
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'No fue posible cargar los recordatorios.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { if (currentUser) cargar() }, [currentUser, cargar])

  const guardar = async (datos) => {
    setGuardando(true)
    try {
      await guardarRecordatorio(datos, origen)
      setEditando(null)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'No fue posible guardar el recordatorio.')
    } finally {
      setGuardando(false)
    }
  }

  const alternarActivo = async (r) => {
    try {
      await guardarRecordatorio({ ...r, activo: !r.activo }, origen)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'No fue posible actualizar el recordatorio.')
    }
  }

  const eliminar = async (r) => {
    if (!window.confirm(`¿Eliminar el recordatorio "${r.titulo}"?`)) return
    try {
      await eliminarRecordatorio(r.id, origen)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'No fue posible eliminar el recordatorio.')
    }
  }

  const pedirPermiso = async () => {
    if (!('Notification' in window)) return
    setPermiso(await Notification.requestPermission())
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

  const todosOrdenados = [...lista].sort((a, b) => {
    const pa = proximaOcurrencia(a)?.getTime() ?? Infinity
    const pb = proximaOcurrencia(b)?.getTime() ?? Infinity
    return pa - pb
  })
  // Pestañas dinámicas: el contador de cada una se recalcula con la lista.
  const PESTANAS = [
    { id: 'ACTIVOS', etiqueta: 'Activos', filtro: r => r.activo },
    { id: 'PAUSADOS', etiqueta: 'Pausados', filtro: r => !r.activo },
    { id: 'CORREO', etiqueta: 'Con correo', filtro: r => (r.canales || []).includes('CORREO') },
    { id: 'TODOS', etiqueta: 'Todos', filtro: () => true }
  ]
  const pestanaActual = PESTANAS.find(p => p.id === pestana) || PESTANAS[0]
  const ordenados = todosOrdenados.filter(pestanaActual.filtro)

  return (
    <div className="nexdine-shell" style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', backgroundColor: colores.fondo }}>
      <Sidebar currentUser={currentUser} rutaActual="/recordatorios" onLogout={handleLogout} />

      <div className="nexdine-main" style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <UbicacionActual />
            <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Recordatorios automáticos</h2>
            <small style={{ color: colores.textoSuave }}>
              {lista.length === 0 ? 'Sin recordatorios configurados' : `${lista.filter(r => r.activo).length} de ${lista.length} activos`}
            </small>
          </div>
          <button type="button" className="btn" onClick={() => setEditando(recordatorioVacio())} style={{ ...btnPrimario, minHeight: '44px' }}>
            <FiPlus style={{ marginRight: '6px' }} /> Nuevo recordatorio
          </button>
        </div>

        {origen === 'local' && !cargando && (
          <div role="note" style={{
            ...tarjeta, backgroundColor: colores.advertenciaFondo, border: `1px solid ${colores.advertenciaFondo}`,
            color: colores.advertenciaTexto, padding: '12px 16px', marginBottom: '16px', fontSize: '13.5px',
            display: 'flex', gap: '10px', alignItems: 'flex-start'
          }}>
            <FiAlertTriangle style={{ flexShrink: 0, marginTop: '3px' }} />
            <span>
              El servidor aún no administra recordatorios. Por ahora se guardan <strong>solo en este navegador</strong> y
              se muestran como aviso cuando NexDine está abierto. Los correos se enviarán cuando el servidor tenga este servicio.
            </span>
          </div>
        )}

        {permiso === 'default' && (
          <div style={{ ...tarjeta, padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '13.5px' }}>
            <FiBell style={{ color: colores.primario }} />
            <span style={{ flex: '1 1 260px', color: colores.texto }}>Permite las notificaciones del navegador para recibir los recordatorios aunque estés en otra pestaña.</span>
            <button type="button" className="btn" onClick={pedirPermiso} style={{ ...btnGhost, minHeight: '38px', fontSize: '13px' }}>Permitir notificaciones</button>
          </div>
        )}

        {error && (
          <div role="alert" style={{ ...tarjeta, backgroundColor: colores.errorFondo, color: colores.errorTexto, padding: '12px 16px', marginBottom: '16px', fontSize: '13.5px' }}>
            {error}
          </div>
        )}

        {!cargando && lista.length > 0 && (
          <div role="tablist" aria-label="Filtrar recordatorios" style={{ display: 'flex', gap: '4px', borderBottom: `1px solid ${colores.borde}`, marginBottom: '14px', overflowX: 'auto', overflowY: 'hidden' }}>
            {PESTANAS.map(p => {
              const activa = p.id === pestanaActual.id
              const cantidad = lista.filter(p.filtro).length
              return (
                <button key={p.id} type="button" role="tab" aria-selected={activa} id={`pestana-${p.id}`}
                  aria-controls="panel-recordatorios" onClick={() => setPestana(p.id)}
                  style={{
                    border: 'none', background: 'transparent', padding: '10px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
                    fontWeight: 600, fontSize: '14px', color: activa ? colores.primario : colores.textoSuave,
                    borderBottom: `2px solid ${activa ? colores.primario : 'transparent'}`, marginBottom: '-1px'
                  }}>
                  {p.etiqueta}
                  <span style={{ ...estiloBadge(activa ? colores.mint : colores.superficie, activa ? colores.primario : colores.textoSuave), marginLeft: '8px', height: '20px', textTransform: 'none' }}>
                    {cantidad}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {cargando ? (
          <div role="status" style={{ ...tarjeta, padding: '48px', textAlign: 'center' }}>
            <div className="spinner-border" style={{ color: colores.primario }}></div>
          </div>
        ) : ordenados.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <FiClock style={{ fontSize: '2rem', color: colores.textoSuaveClaro }} className="mb-2" />
            <div style={{ fontWeight: 600, color: colores.texto }}>
              {lista.length === 0 ? 'Aún no tienes recordatorios' : `No hay recordatorios en "${pestanaActual.etiqueta}"`}
            </div>
            {lista.length === 0 && <small>Crea uno para el cierre de caja, el inventario o la revisión de ventas.</small>}
          </div>
        ) : (
          <div id="panel-recordatorios" role="tabpanel" aria-labelledby={`pestana-${pestanaActual.id}`} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ordenados.map(r => {
              const proxima = proximaOcurrencia(r)
              return (
                <div key={r.id} style={{ ...tarjeta, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', opacity: r.activo ? 1 : 0.65 }}>
                  <Interruptor activo={r.activo} onCambiar={() => alternarActivo(r)} etiquetaAccesible={`${r.activo ? 'Desactivar' : 'Activar'} ${r.titulo}`} />
                  <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: colores.texto }}>{r.titulo}</div>
                    <small style={{ color: colores.textoSuave, display: 'block' }}>{describirFrecuencia(r)}</small>
                    {r.mensaje && <small style={{ color: colores.textoSuave, display: 'block' }}>{r.mensaje}</small>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(r.canales || []).includes('APP') && <span style={estiloBadge(colores.mint, colores.primario)}><FiMonitor size={12} /> App</span>}
                    {(r.canales || []).includes('CORREO') && <span style={estiloBadge(colores.superficie, colores.textoSuave)}><FiMail size={12} /> Correo</span>}
                  </div>
                  <small style={{ color: colores.textoSuave, minWidth: '150px' }}>
                    {r.activo
                      ? (proxima ? `Próximo: ${proxima.toLocaleString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Sin próximas ejecuciones')
                      : 'Pausado'}
                  </small>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" className="btn" aria-label={`Editar ${r.titulo}`} onClick={() => setEditando(r)} style={{ ...btnGhost, minHeight: '38px', padding: '0 10px' }}>
                      <FiEdit2 />
                    </button>
                    <button type="button" className="btn" aria-label={`Eliminar ${r.titulo}`} onClick={() => eliminar(r)} style={{ ...btnGhost, minHeight: '38px', padding: '0 10px', color: colores.errorTexto }}>
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editando && (
        <FormularioRecordatorio inicial={editando} guardando={guardando} onGuardar={guardar} onCerrar={() => setEditando(null)} />
      )}
    </div>
  )
}

export default Recordatorios
