import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiClock, FiPlay, FiCheck, FiRefreshCw, FiAlertCircle } from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import EncabezadoPagina from '../components/EncabezadoPagina.jsx'
import { usePedidosActivos } from '../hooks/usePedidosActivos.js'
import { actualizarEstadoPedido } from '../services/pedidos.js'
import { normalizarEstado, etiquetaTipoServicio } from '../utils/pedidos.js'
import { colores, radios, tarjeta, btnPrimario, btnGhost, estiloBadge } from '../styles/tokens.js'

/**
 * RF043 / RF035: pantalla de cocina (KDS). Las comandas llegan solas al
 * confirmarse y avanzan en tres columnas con un solo botón grande por
 * comanda. El color del tiempo de espera indica qué atender primero.
 */
const COLUMNAS = [
  { estado: 'CONFIRMADO', titulo: 'Por preparar', siguiente: 'EN_PREPARACION', accion: 'Empezar', icono: FiPlay, color: '#3B82F6' },
  { estado: 'EN_PREPARACION', titulo: 'Preparando', siguiente: 'LISTO', accion: 'Marcar listo', icono: FiCheck, color: '#8B5CF6' },
  { estado: 'LISTO', titulo: 'Listos para entregar', siguiente: null, accion: null, icono: null, color: '#10B981' }
]

function minutosDesde(fecha, ahora) {
  if (!fecha) return 0
  return Math.max(0, Math.floor((ahora - new Date(fecha).getTime()) / 60000))
}

function colorEspera(minutos) {
  if (minutos >= 20) return [colores.errorFondo, colores.errorTexto]
  if (minutos >= 10) return [colores.advertenciaFondo, colores.advertenciaTexto]
  return [colores.exitoFondo, colores.exitoTexto]
}

function Comanda({ pedido, columna, nombreMesa, ahora, actualizando, onAvanzar }) {
  const minutos = minutosDesde(pedido.fechaCreacion, ahora)
  const [fondo, texto] = colorEspera(minutos)
  const items = Array.isArray(pedido.items) ? pedido.items : []
  const Icono = columna.icono

  return (
    <article aria-label={`Comanda ${pedido.numeroSeguimiento}`} style={{ ...tarjeta, padding: '14px', borderTop: `4px solid ${columna.color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: colores.texto }}>{nombreMesa || etiquetaTipoServicio(pedido.tipoServicio)}</div>
          <small style={{ color: colores.textoSuave }}>{pedido.numeroSeguimiento}{pedido.nombre && pedido.nombre !== 'Cliente de mesa' ? ` · ${pedido.nombre}` : ''}</small>
        </div>
        <span style={{ ...estiloBadge(fondo, texto), textTransform: 'none' }} title="Tiempo desde que se hizo el pedido">
          <FiClock size={12} aria-hidden="true" /> {minutos} min
        </span>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map(item => (
          <li key={item.id} style={{ fontSize: '15px', color: colores.texto }}>
            <strong style={{ fontSize: '17px', marginRight: '6px' }}>{item.cantidad}×</strong>{item.nombre}
            {Array.isArray(item.personalizaciones) && item.personalizaciones.length > 0 && (
              <div style={{ fontSize: '13px', color: colores.textoSuave, marginLeft: '26px' }}>{item.personalizaciones.join(', ')}</div>
            )}
            {item.observaciones && (
              <div style={{ fontSize: '13px', marginLeft: '26px', color: colores.advertenciaTexto, backgroundColor: colores.advertenciaFondo, borderRadius: radios.sm, padding: '2px 6px', display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                <FiAlertCircle size={12} aria-hidden="true" /> {item.observaciones}
              </div>
            )}
          </li>
        ))}
      </ul>
      {pedido.observaciones && (
        <p style={{ fontSize: '13px', color: colores.advertenciaTexto, backgroundColor: colores.advertenciaFondo, borderRadius: radios.sm, padding: '6px 8px', margin: '0 0 10px' }}>
          Nota: {pedido.observaciones}
        </p>
      )}

      {columna.siguiente ? (
        <button type="button" className="btn w-100" disabled={actualizando} onClick={() => onAvanzar(pedido, columna.siguiente)}
          style={{ ...btnPrimario, minHeight: '52px', fontSize: '16px' }}>
          <Icono style={{ marginRight: '8px' }} aria-hidden="true" />
          {actualizando ? 'Guardando…' : columna.accion}
        </button>
      ) : (
        <div style={{ textAlign: 'center', fontSize: '13px', color: colores.exitoTexto, fontWeight: 600 }}>Esperando que sala lo entregue</div>
      )}
    </article>
  )
}

function Cocina() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [nombresMesas, setNombresMesas] = useState({})
  const [actualizando, setActualizando] = useState(null)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [ahora, setAhora] = useState(Date.now())

  useEffect(() => {
    api.get('/api/auth/me')
      .then(({ data }) => {
        setCurrentUser(data)
        api.get('/mesas')
          .then(({ data: mesas }) => setNombresMesas(Object.fromEntries((Array.isArray(mesas) ? mesas : []).map(m => [m.id, m.nombre]))))
          .catch(() => {})
      })
      .catch(() => navigate('/login'))
  }, [navigate])

  // Refresca los minutos de espera aunque no lleguen pedidos nuevos.
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const { pedidos, cargando, enTiempoReal, recargar } = usePedidosActivos({ activo: Boolean(currentUser) })

  const porColumna = useMemo(() => {
    const grupos = Object.fromEntries(COLUMNAS.map(c => [c.estado, []]))
    pedidos.forEach(p => {
      const estado = normalizarEstado(p.estado)
      if (grupos[estado]) grupos[estado].push(p)
    })
    // El más antiguo primero: se atiende en orden de llegada.
    Object.values(grupos).forEach(lista => lista.sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion)))
    return grupos
  }, [pedidos])

  const avanzar = async (pedido, estado) => {
    setActualizando(pedido.id)
    try {
      await actualizarEstadoPedido(pedido.id, estado)
      setMensaje({ tipo: 'exito', texto: `${pedido.numeroSeguimiento}: ${estado === 'LISTO' ? 'listo para entregar' : 'en preparación'}.` })
      await recargar()
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'No fue posible actualizar la comanda.' })
    } finally {
      setActualizando(null)
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3500)
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

  return (
    <div className="nexdine-shell" style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', backgroundColor: colores.fondo }}>
      <Sidebar currentUser={currentUser} onLogout={handleLogout} />
      <main className="nexdine-main" style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0 }}>
        <EncabezadoPagina
          descripcion="Las comandas llegan solas al confirmarse. Atiende primero las de más tiempo."
          acciones={(
            <>
              <span style={estiloBadge(enTiempoReal ? colores.exitoFondo : colores.superficie, enTiempoReal ? colores.exitoTexto : colores.textoSuave)}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: enTiempoReal ? colores.exito : colores.textoSuaveClaro }} />
                {enTiempoReal ? 'En vivo' : 'Se actualiza cada 15 s'}
              </span>
              <button type="button" className="btn" onClick={recargar} disabled={cargando} style={{ ...btnGhost, minHeight: '40px' }}>
                <FiRefreshCw style={{ marginRight: '6px' }} aria-hidden="true" /> Actualizar
              </button>
            </>
          )}
        />

        {mensaje.texto && (
          <div role={mensaje.tipo === 'error' ? 'alert' : 'status'} style={{
            ...tarjeta, border: 'none', padding: '10px 14px', marginBottom: '14px', fontSize: '13.5px',
            backgroundColor: mensaje.tipo === 'error' ? colores.errorFondo : colores.exitoFondo,
            color: mensaje.tipo === 'error' ? colores.errorTexto : colores.exitoTexto
          }}>
            {mensaje.texto}
          </div>
        )}

        <div className="cocina-columnas">
          {COLUMNAS.map(columna => {
            const lista = porColumna[columna.estado]
            return (
              <section key={columna.estado} aria-labelledby={`col-${columna.estado}`} style={{ backgroundColor: colores.superficie, borderRadius: radios.lg, padding: '12px', minWidth: 0 }}>
                <h2 id={`col-${columna.estado}`} style={{ fontSize: '0.95rem', fontWeight: 700, color: colores.texto, display: 'flex', alignItems: 'center', gap: '8px', margin: '2px 4px 12px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: columna.color }} aria-hidden="true" />
                  {columna.titulo}
                  <span style={{ ...estiloBadge(colores.tarjeta, colores.texto), marginLeft: 'auto' }}>{lista.length}</span>
                </h2>
                {lista.length === 0 ? (
                  <p style={{ color: colores.textoSuave, fontSize: '13px', textAlign: 'center', padding: '24px 8px', margin: 0 }}>
                    {cargando ? 'Cargando…' : 'Sin comandas'}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {lista.map(p => (
                      <Comanda key={p.id} pedido={p} columna={columna} nombreMesa={p.mesaId ? nombresMesas[p.mesaId] : ''}
                        ahora={ahora} actualizando={actualizando === p.id} onAvanzar={avanzar} />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}

export default Cocina
