import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiAlertTriangle, FiArrowRight, FiCheckCircle, FiClock, FiDollarSign, FiShoppingBag, FiXCircle, FiRefreshCw
} from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import EncabezadoPagina from '../components/EncabezadoPagina.jsx'
import { usePedidosActivos } from '../hooks/usePedidosActivos.js'
import { obtenerReporteVentas } from '../services/reportes.js'
import { listarPendientesDeReembolso } from '../services/reembolsos.js'
import { obtenerHorarios } from '../services/horarios.js'
import { MODULOS } from '../config/navegacion.js'
import { formatearDinero } from '../utils/dinero.js'
import { normalizarEstado } from '../utils/pedidos.js'
import { colores, radios, tarjeta, btnGhost, cifrasTabulares } from '../styles/tokens.js'

const ETAPAS = [
  { estado: 'PENDIENTE', etiqueta: 'Por confirmar', color: '#F59E0B' },
  { estado: 'CONFIRMADO', etiqueta: 'En cola de cocina', color: '#3B82F6' },
  { estado: 'EN_PREPARACION', etiqueta: 'Preparando', color: '#8B5CF6' },
  { estado: 'LISTO', etiqueta: 'Listos para entregar', color: '#10B981' }
]

const ACCESOS = ['mesas', 'pedidos', 'cocina', 'paraLlevar', 'domicilios', 'reportes']

function minutosDesde(fecha) {
  if (!fecha) return 0
  return Math.max(0, Math.round((Date.now() - new Date(fecha).getTime()) / 60000))
}

function Kpi({ icono: Icono, etiqueta, valor, detalle }) {
  return (
    <div style={{ ...tarjeta, padding: '16px 18px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colores.textoSuave, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <Icono aria-hidden="true" /> {etiqueta}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: colores.texto, marginTop: '4px', ...cifrasTabulares }}>{valor}</div>
      {detalle && <small style={{ color: colores.textoSuave }}>{detalle}</small>}
    </div>
  )
}

/** Pantalla de inicio del administrador: qué pasa hoy y qué necesita atención. */
function Inicio() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [reporte, setReporte] = useState(null)
  const [reembolsos, setReembolsos] = useState([])
  const [cerrada, setCerrada] = useState('')

  useEffect(() => {
    api.get('/api/auth/me').then(({ data }) => setCurrentUser(data)).catch(() => navigate('/login'))
  }, [navigate])

  const { pedidos, cargando, ultimaActualizacion, recargar } = usePedidosActivos({ activo: Boolean(currentUser) })

  useEffect(() => {
    if (!currentUser) return
    const hoy = new Date()
    obtenerReporteVentas({ periodo: 'DIARIO', desde: hoy, hasta: hoy }).then(setReporte).catch(() => setReporte(null))
    listarPendientesDeReembolso().then(setReembolsos).catch(() => setReembolsos([]))
    api.get('/mesas/sucursales')
      .then(({ data }) => (Array.isArray(data) && data[0] ? obtenerHorarios(data[0].id) : null))
      .then(h => setCerrada(h && h.abiertoAhora === false ? h.mensaje : ''))
      .catch(() => setCerrada(''))
  }, [currentUser])

  const porEtapa = useMemo(() => {
    const conteo = Object.fromEntries(ETAPAS.map(e => [e.estado, []]))
    pedidos.forEach(p => {
      const estado = normalizarEstado(p.estado)
      if (conteo[estado]) conteo[estado].push(p)
    })
    return conteo
  }, [pedidos])

  const alertas = useMemo(() => {
    const lista = []
    if (cerrada) lista.push({ tipo: 'aviso', texto: cerrada, ruta: MODULOS.horarios.ruta, accion: 'Ver horarios' })
    const sinConfirmar = porEtapa.PENDIENTE.filter(p => minutosDesde(p.fechaCreacion) >= 15)
    if (sinConfirmar.length) lista.push({ tipo: 'aviso', texto: `${sinConfirmar.length} pedido(s) llevan más de 15 minutos sin confirmar.`, ruta: MODULOS.pedidos.ruta, accion: 'Revisar' })
    const listos = porEtapa.LISTO.filter(p => minutosDesde(p.fechaCreacion) >= 10)
    if (listos.length) lista.push({ tipo: 'aviso', texto: `${listos.length} pedido(s) están listos y esperan entrega.`, ruta: MODULOS.pedidos.ruta, accion: 'Entregar' })
    if (reembolsos.length) lista.push({ tipo: 'error', texto: `${reembolsos.length} pedido(s) cancelados esperan reembolso.`, ruta: MODULOS.reembolsos.ruta, accion: 'Reembolsar' })
    return lista
  }, [porEtapa, reembolsos, cerrada])

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

  const saludo = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'
  const totalActivos = ETAPAS.reduce((s, e) => s + porEtapa[e.estado].length, 0)

  return (
    <div className="nexdine-shell" style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', backgroundColor: colores.fondo }}>
      <Sidebar currentUser={currentUser} onLogout={handleLogout} />
      <main className="nexdine-main" style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0 }}>
        <EncabezadoPagina
          titulo={`${saludo}, ${currentUser.nombre}`}
          descripcion={`Resumen de hoy, ${new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}`}
          acciones={(
            <button type="button" className="btn" onClick={recargar} disabled={cargando} style={{ ...btnGhost, minHeight: '40px' }}>
              <FiRefreshCw style={{ marginRight: '6px' }} aria-hidden="true" />
              {ultimaActualizacion ? `Actualizado ${ultimaActualizacion.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : 'Actualizar'}
            </button>
          )}
        />

        {/* Indicadores del día */}
        <section aria-label="Indicadores de hoy" className="row g-3 mb-3">
          <div className="col-6 col-xl-3"><Kpi icono={FiDollarSign} etiqueta="Ventas de hoy" valor={reporte ? formatearDinero(reporte.totalVentas) : '—'} detalle="Pedidos confirmados" /></div>
          <div className="col-6 col-xl-3"><Kpi icono={FiShoppingBag} etiqueta="Pedidos de hoy" valor={reporte ? reporte.numeroPedidos : '—'} detalle={reporte ? `Ticket promedio ${formatearDinero(reporte.ticketPromedio)}` : ''} /></div>
          <div className="col-6 col-xl-3"><Kpi icono={FiClock} etiqueta="En curso ahora" valor={totalActivos} detalle="Sin entregar ni cancelar" /></div>
          <div className="col-6 col-xl-3"><Kpi icono={FiXCircle} etiqueta="Cancelados hoy" valor={reporte ? reporte.pedidosCancelados : '—'} detalle={reembolsos.length ? `${reembolsos.length} por reembolsar` : 'Sin reembolsos pendientes'} /></div>
        </section>

        <div className="row g-3">
          {/* Flujo de pedidos */}
          <section className="col-12 col-lg-7" aria-labelledby="titulo-flujo">
            <div style={{ ...tarjeta, padding: '18px', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 id="titulo-flujo" style={{ fontSize: '1rem', fontWeight: 700, color: colores.texto, margin: 0 }}>Pedidos en curso</h2>
                <a href={MODULOS.pedidos.ruta} style={{ fontSize: '13px', fontWeight: 600, color: colores.primario, textDecoration: 'none' }}>
                  Ver todos <FiArrowRight aria-hidden="true" />
                </a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                {ETAPAS.map(etapa => (
                  <a key={etapa.estado} href={MODULOS.pedidos.ruta} style={{
                    textDecoration: 'none', borderRadius: radios.md, padding: '14px', backgroundColor: colores.superficie,
                    borderTop: `4px solid ${etapa.color}`, color: colores.texto
                  }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, ...cifrasTabulares }}>{porEtapa[etapa.estado].length}</div>
                    <div style={{ fontSize: '13px', color: colores.textoSuave, fontWeight: 600 }}>{etapa.etiqueta}</div>
                  </a>
                ))}
              </div>
              {totalActivos === 0 && !cargando && (
                <p style={{ margin: '14px 0 0', color: colores.textoSuave, fontSize: '13.5px' }}>No hay pedidos en curso en este momento.</p>
              )}
            </div>
          </section>

          {/* Qué requiere atención */}
          <section className="col-12 col-lg-5" aria-labelledby="titulo-atencion">
            <div style={{ ...tarjeta, padding: '18px', height: '100%' }}>
              <h2 id="titulo-atencion" style={{ fontSize: '1rem', fontWeight: 700, color: colores.texto, marginBottom: '12px' }}>Requiere atención</h2>
              {alertas.length === 0 ? (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: colores.exitoTexto, backgroundColor: colores.exitoFondo, borderRadius: radios.md, padding: '12px 14px', fontSize: '13.5px' }}>
                  <FiCheckCircle aria-hidden="true" /> Todo al día. No hay pendientes.
                </div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {alertas.map(a => (
                    <li key={a.texto} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: radios.md,
                      backgroundColor: a.tipo === 'error' ? colores.errorFondo : colores.advertenciaFondo,
                      color: a.tipo === 'error' ? colores.errorTexto : colores.advertenciaTexto, fontSize: '13.5px'
                    }}>
                      <FiAlertTriangle style={{ flexShrink: 0 }} aria-hidden="true" />
                      <span style={{ flex: 1 }}>{a.texto}</span>
                      <a href={a.ruta} style={{ fontWeight: 700, color: 'inherit', whiteSpace: 'nowrap' }}>{a.accion}</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* Accesos rápidos a las tareas más frecuentes */}
        <section aria-labelledby="titulo-accesos" style={{ marginTop: '20px' }}>
          <h2 id="titulo-accesos" style={{ fontSize: '1rem', fontWeight: 700, color: colores.texto, marginBottom: '10px' }}>Accesos rápidos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '10px' }}>
            {ACCESOS.map(clave => MODULOS[clave]).filter(m => m.roles.includes(currentUser.rol)).map(m => (
              <a key={m.ruta} href={m.ruta} style={{ ...tarjeta, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: colores.texto }}>
                <span style={{ width: '38px', height: '38px', borderRadius: radios.md, backgroundColor: colores.mint, color: colores.primario, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fa-solid ${m.icono}`} aria-hidden="true"></i>
                </span>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: '14px' }}>{m.etiqueta}</strong>
                  <small style={{ color: colores.textoSuave }}>{m.descripcion}</small>
                </span>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default Inicio
