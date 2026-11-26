import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiClock, FiCopy } from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import { UbicacionActual } from '../components/EncabezadoPagina.jsx'
import { obtenerHorarios, guardarHorarios } from '../services/horarios.js'
import { colores, radios, tarjeta, btnPrimario, btnGhost, input, estiloBadge } from '../styles/tokens.js'

// 1 = lunes … 7 = domingo (igual que el backend).
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function semanaPorDefecto() {
  return DIAS.map((_, i) => ({ diaSemana: i + 1, horaApertura: '11:00', horaCierre: '22:00', activo: true }))
}

function combinar(guardados) {
  const base = semanaPorDefecto()
  if (!Array.isArray(guardados) || guardados.length === 0) return base
  return base.map(dia => {
    const g = guardados.find(h => h.diaSemana === dia.diaSemana)
    return g ? { ...g } : { ...dia, activo: false }
  })
}

/** RF044: el administrador define los horarios de atención de su sucursal. */
function Horarios() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [sucursales, setSucursales] = useState([])
  const [sucursalId, setSucursalId] = useState('')
  const [semana, setSemana] = useState(semanaPorDefecto())
  const [estado, setEstado] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })

  useEffect(() => {
    api.get('/api/auth/me')
      .then(async ({ data }) => {
        if (data?.rol !== 'ADMINISTRADOR' && data?.rol !== 'SUPERADMIN') {
          navigate(data?.rol === 'CLIENTE' ? '/menu' : '/pedidos')
          return
        }
        setCurrentUser(data)
        const lista = await api.get('/mesas/sucursales').then(r => (Array.isArray(r.data) ? r.data : [])).catch(() => [])
        setSucursales(lista)
        if (lista.length > 0) setSucursalId(lista[0].id)
      })
      .catch(() => navigate('/login'))
  }, [navigate])

  useEffect(() => {
    if (!sucursalId) return
    setCargando(true)
    obtenerHorarios(sucursalId)
      .then(datos => {
        setEstado(datos)
        setSemana(combinar(datos.horarios))
      })
      .catch(err => setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'No fue posible cargar los horarios.' }))
      .finally(() => setCargando(false))
  }, [sucursalId])

  const cambiar = (diaSemana, campo, valor) =>
    setSemana(prev => prev.map(d => (d.diaSemana === diaSemana ? { ...d, [campo]: valor } : d)))

  const copiarLunes = () => {
    const lunes = semana[0]
    setSemana(prev => prev.map(d => ({ ...d, horaApertura: lunes.horaApertura, horaCierre: lunes.horaCierre })))
  }

  const guardar = async () => {
    const invalido = semana.find(d => d.activo && d.horaApertura === d.horaCierre)
    if (invalido) {
      setMensaje({ tipo: 'error', texto: `${DIAS[invalido.diaSemana - 1]}: la apertura y el cierre no pueden ser iguales.` })
      return
    }
    setGuardando(true)
    try {
      const datos = await guardarHorarios(sucursalId, semana)
      setEstado(datos)
      setSemana(combinar(datos.horarios))
      setMensaje({ tipo: 'exito', texto: 'Horarios guardados. Fuera de ellos los clientes no podrán hacer pedidos.' })
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000)
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'No fue posible guardar los horarios.' })
    } finally {
      setGuardando(false)
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

  const colorMensaje = mensaje.tipo === 'error' ? [colores.errorFondo, colores.errorTexto] : [colores.exitoFondo, colores.exitoTexto]

  return (
    <div className="nexdine-shell" style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', backgroundColor: colores.fondo }}>
      <Sidebar currentUser={currentUser} rutaActual="/horarios" onLogout={handleLogout} />
      <div className="nexdine-main" style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0, maxWidth: '900px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div>
            <UbicacionActual />
            <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Horarios de servicio</h2>
            <small style={{ color: colores.textoSuave }}>Fuera de este horario el menú avisa que la sucursal está cerrada y no recibe pedidos.</small>
          </div>
          {sucursales.length > 1 && (
            <div>
              <label htmlFor="horario-sucursal" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: colores.texto, marginBottom: '5px' }}>Sucursal</label>
              <select id="horario-sucursal" value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} style={{ ...input, padding: '0 10px', minWidth: '220px' }}>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          )}
        </div>

        {mensaje.texto && (
          <div role={mensaje.tipo === 'error' ? 'alert' : 'status'} style={{ ...tarjeta, backgroundColor: colorMensaje[0], color: colorMensaje[1], border: 'none', padding: '12px 16px', marginBottom: '16px', fontSize: '13.5px' }}>
            {mensaje.texto}
          </div>
        )}

        {sucursales.length === 0 ? (
          <div style={{ ...tarjeta, padding: '48px 24px', textAlign: 'center', color: colores.textoSuave }}>No tienes sucursales asignadas.</div>
        ) : (
          <div style={{ ...tarjeta, padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiClock style={{ color: colores.primario }} />
                {estado && (
                  estado.configurado
                    ? <span style={estiloBadge(estado.abiertoAhora ? colores.exitoFondo : colores.errorFondo, estado.abiertoAhora ? colores.exitoTexto : colores.errorTexto)}>
                        {estado.abiertoAhora ? 'Abierta ahora' : 'Cerrada ahora'}
                      </span>
                    : <span style={estiloBadge(colores.advertenciaFondo, colores.advertenciaTexto)}>Sin horario: siempre abierta</span>
                )}
              </div>
              <button type="button" className="btn" onClick={copiarLunes} style={{ ...btnGhost, minHeight: '38px', fontSize: '13px' }}>
                <FiCopy style={{ marginRight: '6px' }} /> Copiar el horario del lunes a todos
              </button>
            </div>

            {cargando ? (
              <div role="status" style={{ padding: '32px', textAlign: 'center' }}><div className="spinner-border" style={{ color: colores.primario }}></div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {semana.map(d => (
                  <div key={d.diaSemana} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '10px 12px',
                    borderRadius: radios.md, backgroundColor: d.activo ? colores.superficie : 'transparent', border: `1px solid ${colores.borde}`
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '150px', fontWeight: 600, color: colores.texto, cursor: 'pointer', margin: 0 }}>
                      <input type="checkbox" checked={d.activo} onChange={(e) => cambiar(d.diaSemana, 'activo', e.target.checked)} style={{ width: '18px', height: '18px' }} />
                      {DIAS[d.diaSemana - 1]}
                    </label>
                    {d.activo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <input type="time" aria-label={`Apertura del ${DIAS[d.diaSemana - 1]}`} value={d.horaApertura} onChange={(e) => cambiar(d.diaSemana, 'horaApertura', e.target.value)} style={{ ...input, height: '40px', padding: '0 10px' }} />
                        <span style={{ color: colores.textoSuave }}>a</span>
                        <input type="time" aria-label={`Cierre del ${DIAS[d.diaSemana - 1]}`} value={d.horaCierre} onChange={(e) => cambiar(d.diaSemana, 'horaCierre', e.target.value)} style={{ ...input, height: '40px', padding: '0 10px' }} />
                        {d.horaCierre < d.horaApertura && <small style={{ color: colores.textoSuave }}>Cierra al día siguiente</small>}
                      </div>
                    ) : (
                      <span style={{ color: colores.textoSuave, fontSize: '13.5px' }}>Cerrado</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn" onClick={guardar} disabled={guardando || cargando} style={{ ...btnPrimario, minHeight: '44px' }}>
                {guardando ? 'Guardando…' : 'Guardar horarios'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Horarios
