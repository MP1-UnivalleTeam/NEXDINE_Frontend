import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiBarChart2, FiChevronLeft, FiChevronRight, FiDownload, FiFileText,
  FiAlertTriangle, FiRefreshCw, FiEye, FiEyeOff
} from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import {
  PERIODOS, calcularRango, desplazarReferencia, describirRango, aFechaISO, desdeFechaISO,
  obtenerReporteVentas, generarReporteEjemplo
} from '../services/reportes.js'
import { exportarPdf, exportarExcel, esEndpointNoDisponible } from '../utils/exportar.js'
import { formatearDinero } from '../utils/dinero.js'
import { etiquetaTipoServicio, etiquetaEstado } from '../utils/pedidos.js'
import { etiquetaMetodoPago } from '../utils/pagos.js'
import { colores, radios, tarjeta, btnPrimario, btnGhost, input, cifrasTabulares } from '../styles/tokens.js'

const numero = (valor) => Number(valor || 0).toLocaleString('es-CO')
const porcentaje = (parte, total) => (total > 0 ? `${Math.round((parte / total) * 100)}%` : '0%')

const mayusculaInicial = (texto) => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '')

function etiquetaPunto(punto, periodo, corto = false) {
  if (punto.hora != null) return `${String(punto.hora).padStart(2, '0')}:00`
  const fecha = desdeFechaISO(punto.fecha)
  if (periodo === 'SEMANAL') {
    return fecha.toLocaleDateString('es-CO', corto ? { weekday: 'short' } : { weekday: 'long', day: 'numeric', month: 'short' })
  }
  return corto ? String(fecha.getDate()) : fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
}

/* ---------------------------------------------------------------- Gráfico */

function GraficoVentas({ serie, periodo }) {
  const [activo, setActivo] = useState(null)
  const maximo = Math.max(...serie.map(p => Number(p.total) || 0), 0)
  const tope = maximo > 0 ? maximo * 1.1 : 1
  const pasoEtiqueta = serie.length > 16 ? Math.ceil(serie.length / 10) : 1
  const alto = 220

  if (serie.length === 0) {
    return <div style={{ color: colores.textoSuave, fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>Sin ventas en este periodo.</div>
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        {/* Eje Y */}
        <div className="tnum" style={{
          height: `${alto}px`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          fontSize: '11px', color: colores.textoSuave, textAlign: 'right', minWidth: '58px', ...cifrasTabulares
        }}>
          <span>{formatearDinero(tope)}</span>
          <span>{formatearDinero(tope / 2)}</span>
          <span>$0</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            role="img"
            aria-label={`Ventas por ${serie[0]?.hora != null ? 'hora' : 'día'}. Máximo ${formatearDinero(maximo)}.`}
            onMouseLeave={() => setActivo(null)}
            style={{
              height: `${alto}px`, position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '2px',
              borderBottom: `1px solid ${colores.borde}`,
              backgroundImage: `linear-gradient(${colores.borde} 1px, transparent 1px)`,
              backgroundSize: `100% ${alto / 2}px`
            }}
          >
            {serie.map((punto, i) => {
              const valor = Number(punto.total) || 0
              const resaltado = activo === i
              return (
                <div
                  key={`${punto.fecha}-${punto.hora ?? i}`}
                  onMouseEnter={() => setActivo(i)}
                  onFocus={() => setActivo(i)}
                  onBlur={() => setActivo(null)}
                  tabIndex={0}
                  aria-label={`${etiquetaPunto(punto, periodo)}: ${formatearDinero(valor)}, ${numero(punto.pedidos)} pedidos`}
                  style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default', outline: 'none' }}
                >
                  <div style={{
                    width: '100%', maxWidth: '44px', margin: '0 auto',
                    height: `${Math.max((valor / tope) * 100, valor > 0 ? 1.5 : 0)}%`,
                    borderRadius: '4px 4px 0 0',
                    backgroundColor: colores.primario,
                    opacity: activo == null || resaltado ? 1 : 0.45,
                    transition: 'opacity 0.12s ease'
                  }} />
                </div>
              )
            })}
          </div>

          {/* Eje X */}
          <div style={{ display: 'flex', gap: '2px', marginTop: '6px' }}>
            {serie.map((punto, i) => (
              <span key={i} style={{
                flex: 1, minWidth: 0, textAlign: 'center', fontSize: '11px', color: colores.textoSuave,
                overflow: 'hidden', whiteSpace: 'nowrap', textTransform: 'capitalize'
              }}>
                {i % pasoEtiqueta === 0 ? etiquetaPunto(punto, periodo, true) : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      {activo != null && serie[activo] && (
        <div role="tooltip" style={{
          position: 'absolute', top: 0,
          left: `calc(66px + (100% - 66px) * ${(activo + 0.5) / serie.length})`,
          transform: `translateX(${activo > serie.length / 2 ? '-105%' : '5%'})`,
          backgroundColor: colores.tarjeta, border: `1px solid ${colores.borde}`, borderRadius: radios.sm,
          boxShadow: '0 6px 18px rgba(15, 23, 42, 0.12)', padding: '8px 10px', fontSize: '12px',
          pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 2
        }}>
          <div style={{ color: colores.textoSuave, marginBottom: '2px' }}>
            {mayusculaInicial(etiquetaPunto(serie[activo], periodo))}
          </div>
          <div className="tnum" style={{ color: colores.texto, fontWeight: 700, fontSize: '14px', ...cifrasTabulares }}>
            {formatearDinero(serie[activo].total)}
          </div>
          <div style={{ color: colores.textoSuave }}>{numero(serie[activo].pedidos)} pedidos</div>
        </div>
      )}
    </div>
  )
}

function Desglose({ titulo, filas, total }) {
  return (
    <div style={{ ...tarjeta, padding: '18px', height: '100%' }}>
      <h6 style={{ fontWeight: 700, color: colores.texto, marginBottom: '14px' }}>{titulo}</h6>
      {filas.length === 0 ? (
        <small style={{ color: colores.textoSuave }}>Sin datos.</small>
      ) : filas.map(fila => (
        <div key={fila.etiqueta} style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '13px', marginBottom: '4px' }}>
            <span style={{ color: colores.texto }}>{fila.etiqueta}</span>
            <span className="tnum" style={{ color: colores.texto, fontWeight: 600, ...cifrasTabulares }}>
              {formatearDinero(fila.total)}
              <span style={{ color: colores.textoSuave, fontWeight: 400 }}> · {porcentaje(fila.total, total)}</span>
            </span>
          </div>
          <div style={{ height: '8px', backgroundColor: colores.superficie, borderRadius: radios.full, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: porcentaje(fila.total, total),
              backgroundColor: colores.primario, borderRadius: radios.full
            }} />
          </div>
          <small style={{ color: colores.textoSuave }}>{numero(fila.pedidos)} pedidos</small>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- Página */

function Reportes() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [sucursales, setSucursales] = useState([])
  const [sucursalId, setSucursalId] = useState('')
  const [periodo, setPeriodo] = useState('SEMANAL')
  const [referencia, setReferencia] = useState(() => new Date())
  const [reporte, setReporte] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [sinBackend, setSinBackend] = useState(false)
  const [verEjemplo, setVerEjemplo] = useState(false)
  const [exportando, setExportando] = useState('')

  const rango = useMemo(() => calcularRango(periodo, referencia), [periodo, referencia])
  const textoRango = describirRango(periodo, rango)
  const esSuperadmin = currentUser?.rol === 'SUPERADMIN'

  useEffect(() => {
    api.get('/api/auth/me')
      .then(({ data }) => {
        if (data?.rol !== 'ADMINISTRADOR' && data?.rol !== 'SUPERADMIN') {
          navigate(data?.rol === 'CLIENTE' ? '/menu' : '/pedidos')
          return
        }
        setCurrentUser(data)
        if (data.rol === 'SUPERADMIN') {
          api.get('/mesas/sucursales').then(r => setSucursales(Array.isArray(r.data) ? r.data : [])).catch(() => {})
        }
      })
      .catch(() => navigate('/login'))
  }, [navigate])

  const cargar = useCallback(async () => {
    if (!currentUser) return
    setCargando(true)
    setError('')
    try {
      const datos = await obtenerReporteVentas({ periodo, ...rango, sucursalId })
      setReporte(datos)
      setSinBackend(false)
    } catch (err) {
      if (esEndpointNoDisponible(err)) {
        setSinBackend(true)
        setReporte(null)
      } else {
        setError(err.response?.data?.error || 'No fue posible cargar el reporte.')
      }
    } finally {
      setCargando(false)
    }
  }, [currentUser, periodo, rango, sucursalId])

  useEffect(() => { cargar() }, [cargar])

  const datos = useMemo(() => {
    if (reporte) return reporte
    if (sinBackend && verEjemplo) return generarReporteEjemplo({ periodo, ...rango })
    return null
  }, [reporte, sinBackend, verEjemplo, periodo, rango])

  const handleLogout = async () => {
    try { await api.get('/logout') } catch { /* sesión ya cerrada */ }
    navigate('/login')
  }

  const nombreSucursal = sucursales.find(s => s.id === sucursalId)?.nombre
  const tituloReporte = `Reporte de ventas ${PERIODOS.find(p => p.valor === periodo)?.etiqueta.toLowerCase()}`
  const subtitulo = `${textoRango}${nombreSucursal ? ` · Sucursal ${nombreSucursal}` : ''}${datos?.ejemplo ? ' · DATOS DE EJEMPLO' : ''}`
  const nombreArchivo = `reporte-ventas-${periodo.toLowerCase()}-${aFechaISO(rango.desde)}${datos?.ejemplo ? '-ejemplo' : ''}`

  const filasServicio = (datos?.porServicio || []).map(f => ({ ...f, etiqueta: etiquetaTipoServicio(f.tipoServicio) }))
  const filasMetodo = (datos?.porMetodoPago || []).map(f => ({ ...f, etiqueta: etiquetaMetodoPago(f.metodo) }))

  const indicadores = datos ? [
    { etiqueta: 'Ventas totales', valor: formatearDinero(datos.totalVentas) },
    { etiqueta: 'Pedidos', valor: numero(datos.numeroPedidos) },
    { etiqueta: 'Ticket promedio', valor: formatearDinero(datos.ticketPromedio) },
    { etiqueta: 'Propinas', valor: formatearDinero(datos.propinas) },
    { etiqueta: 'Impuestos', valor: formatearDinero(datos.impuestos) },
    { etiqueta: 'Descuentos', valor: formatearDinero(datos.descuentos) },
    { etiqueta: 'Cancelados', valor: numero(datos.pedidosCancelados) }
  ] : []

  const exportar = async (formato) => {
    if (!datos) return
    setExportando(formato)
    try {
      const serie = datos.serie || []
      const productos = datos.topProductos || []
      const pedidos = datos.pedidos || []
      if (formato === 'pdf') {
        await exportarPdf({
          titulo: tituloReporte,
          subtitulo,
          resumen: indicadores,
          nombreArchivo,
          tablas: [
            { titulo: serie[0]?.hora != null ? 'Ventas por hora' : 'Ventas por día', columnas: ['Fecha', 'Pedidos', 'Total'],
              filas: serie.map(p => [etiquetaPunto(p, periodo), numero(p.pedidos), formatearDinero(p.total)]) },
            { titulo: 'Por tipo de servicio', columnas: ['Servicio', 'Pedidos', 'Total', '%'],
              filas: filasServicio.map(f => [f.etiqueta, numero(f.pedidos), formatearDinero(f.total), porcentaje(f.total, datos.totalVentas)]) },
            { titulo: 'Por método de pago', columnas: ['Método', 'Pedidos', 'Total', '%'],
              filas: filasMetodo.map(f => [f.etiqueta, numero(f.pedidos), formatearDinero(f.total), porcentaje(f.total, datos.totalVentas)]) },
            { titulo: 'Productos más vendidos', columnas: ['Producto', 'Cantidad', 'Total'],
              filas: productos.map(p => [p.nombre, numero(p.cantidad), formatearDinero(p.total)]) },
            { titulo: 'Detalle de pedidos', columnas: ['Pedido', 'Fecha', 'Servicio', 'Pago', 'Estado', 'Total'],
              filas: pedidos.map(p => [p.numeroSeguimiento, new Date(p.fecha).toLocaleString('es-CO'), etiquetaTipoServicio(p.tipoServicio),
                etiquetaMetodoPago(p.metodoPago), etiquetaEstado(p.estado), formatearDinero(p.total)]) }
          ]
        })
      } else {
        await exportarExcel({
          nombreArchivo,
          hojas: [
            { nombre: 'Resumen', columnas: [{ titulo: 'Indicador', clave: 'indicador', ancho: 24 }, { titulo: 'Valor', clave: 'valor', ancho: 22 }],
              filas: [
                { indicador: 'Reporte', valor: tituloReporte },
                { indicador: 'Periodo', valor: subtitulo },
                { indicador: 'Ventas totales', valor: Number(datos.totalVentas) || 0 },
                { indicador: 'Pedidos', valor: Number(datos.numeroPedidos) || 0 },
                { indicador: 'Ticket promedio', valor: Number(datos.ticketPromedio) || 0 },
                { indicador: 'Propinas', valor: Number(datos.propinas) || 0 },
                { indicador: 'Impuestos', valor: Number(datos.impuestos) || 0 },
                { indicador: 'Descuentos', valor: Number(datos.descuentos) || 0 },
                { indicador: 'Pedidos cancelados', valor: Number(datos.pedidosCancelados) || 0 }
              ] },
            { nombre: 'Ventas', columnas: [
              { titulo: serie[0]?.hora != null ? 'Hora' : 'Fecha', clave: 'fecha', ancho: 16 },
              { titulo: 'Pedidos', clave: 'pedidos', formato: 'numero' },
              { titulo: 'Total', clave: 'total', formato: 'dinero', ancho: 16 }],
              filas: serie.map(p => ({ fecha: p.hora != null ? `${p.fecha} ${String(p.hora).padStart(2, '0')}:00` : p.fecha, pedidos: Number(p.pedidos) || 0, total: Number(p.total) || 0 })) },
            { nombre: 'Por servicio', columnas: [
              { titulo: 'Servicio', clave: 'etiqueta', ancho: 18 }, { titulo: 'Pedidos', clave: 'pedidos', formato: 'numero' },
              { titulo: 'Total', clave: 'total', formato: 'dinero', ancho: 16 }],
              filas: filasServicio.map(f => ({ etiqueta: f.etiqueta, pedidos: Number(f.pedidos) || 0, total: Number(f.total) || 0 })) },
            { nombre: 'Por método de pago', columnas: [
              { titulo: 'Método', clave: 'etiqueta', ancho: 20 }, { titulo: 'Pedidos', clave: 'pedidos', formato: 'numero' },
              { titulo: 'Total', clave: 'total', formato: 'dinero', ancho: 16 }],
              filas: filasMetodo.map(f => ({ etiqueta: f.etiqueta, pedidos: Number(f.pedidos) || 0, total: Number(f.total) || 0 })) },
            { nombre: 'Productos', columnas: [
              { titulo: 'Producto', clave: 'nombre', ancho: 30 }, { titulo: 'Cantidad', clave: 'cantidad', formato: 'numero' },
              { titulo: 'Total', clave: 'total', formato: 'dinero', ancho: 16 }],
              filas: productos.map(p => ({ nombre: p.nombre, cantidad: Number(p.cantidad) || 0, total: Number(p.total) || 0 })) },
            { nombre: 'Pedidos', columnas: [
              { titulo: 'Pedido', clave: 'numero', ancho: 14 }, { titulo: 'Fecha', clave: 'fecha', ancho: 20 },
              { titulo: 'Servicio', clave: 'servicio', ancho: 14 }, { titulo: 'Método de pago', clave: 'metodo', ancho: 18 },
              { titulo: 'Estado', clave: 'estado', ancho: 14 }, { titulo: 'Total', clave: 'total', formato: 'dinero', ancho: 14 }],
              filas: pedidos.map(p => ({
                numero: p.numeroSeguimiento, fecha: new Date(p.fecha).toLocaleString('es-CO'),
                servicio: etiquetaTipoServicio(p.tipoServicio), metodo: etiquetaMetodoPago(p.metodoPago),
                estado: etiquetaEstado(p.estado), total: Number(p.total) || 0
              })) }
          ]
        })
      }
    } catch {
      setError('No fue posible generar el archivo de exportación.')
    } finally {
      setExportando('')
    }
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
      <Sidebar currentUser={currentUser} rutaActual="/reportes" onLogout={handleLogout} />

      <div className="nexdine-main" style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Reportes de ventas</h2>
            <small style={{ color: colores.textoSuave }}>{mayusculaInicial(textoRango)}</small>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={() => exportar('pdf')} disabled={!datos || Boolean(exportando)}
              style={{ ...btnGhost, minHeight: '44px' }}>
              <FiFileText style={{ marginRight: '6px' }} /> {exportando === 'pdf' ? 'Generando…' : 'Exportar PDF'}
            </button>
            <button type="button" className="btn" onClick={() => exportar('excel')} disabled={!datos || Boolean(exportando)}
              style={{ ...btnPrimario, minHeight: '44px' }}>
              <FiDownload style={{ marginRight: '6px' }} /> {exportando === 'excel' ? 'Generando…' : 'Exportar Excel'}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ ...tarjeta, padding: '14px 16px', marginBottom: '18px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div role="group" aria-label="Periodo" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {PERIODOS.map(p => {
              const activo = periodo === p.valor
              return (
                <button key={p.valor} type="button" onClick={() => setPeriodo(p.valor)} aria-pressed={activo} style={{
                  minHeight: '40px', padding: '0 14px', borderRadius: radios.full, fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                  border: `1px solid ${activo ? colores.primario : colores.borde}`,
                  backgroundColor: activo ? colores.primario : colores.tarjeta,
                  color: activo ? 'white' : colores.texto
                }}>
                  {p.etiqueta}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button type="button" className="btn" aria-label="Periodo anterior" onClick={() => setReferencia(r => desplazarReferencia(periodo, r, -1))}
              style={{ ...btnGhost, minHeight: '40px', padding: '0 10px' }}>
              <FiChevronLeft />
            </button>
            <input type="date" aria-label="Fecha de referencia" value={aFechaISO(referencia)}
              onChange={(e) => e.target.value && setReferencia(desdeFechaISO(e.target.value))}
              style={{ ...input, height: '40px', padding: '0 10px' }} />
            <button type="button" className="btn" aria-label="Periodo siguiente" onClick={() => setReferencia(r => desplazarReferencia(periodo, r, 1))}
              style={{ ...btnGhost, minHeight: '40px', padding: '0 10px' }}>
              <FiChevronRight />
            </button>
            <button type="button" className="btn" onClick={() => setReferencia(new Date())}
              style={{ ...btnGhost, minHeight: '40px', fontSize: '13px' }}>
              Hoy
            </button>
          </div>

          {esSuperadmin && sucursales.length > 0 && (
            <select aria-label="Sucursal" value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}
              style={{ ...input, height: '40px', padding: '0 10px', minWidth: '180px' }}>
              <option value="">Todas las sucursales</option>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          )}

          <button type="button" className="btn ms-md-auto" onClick={cargar} disabled={cargando}
            style={{ ...btnGhost, minHeight: '40px', fontSize: '13px' }}>
            <FiRefreshCw style={{ marginRight: '5px' }} /> Actualizar
          </button>
        </div>

        {sinBackend && (
          <div role="note" style={{
            ...tarjeta, backgroundColor: colores.advertenciaFondo, border: `1px solid ${colores.advertenciaFondo}`,
            color: colores.advertenciaTexto, padding: '12px 16px', marginBottom: '18px',
            display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '13.5px'
          }}>
            <FiAlertTriangle style={{ flexShrink: 0 }} />
            <span style={{ flex: '1 1 300px' }}>
              {verEjemplo
                ? <><strong>Estás viendo datos de ejemplo.</strong> No corresponden a ventas reales.</>
                : 'El servidor todavía no tiene el servicio de reportes de ventas. Puedes previsualizar el módulo con datos de ejemplo.'}
            </span>
            <button type="button" className="btn" onClick={() => setVerEjemplo(v => !v)}
              style={{ ...btnGhost, minHeight: '38px', fontSize: '13px' }}>
              {verEjemplo ? <><FiEyeOff style={{ marginRight: '6px' }} /> Ocultar ejemplo</> : <><FiEye style={{ marginRight: '6px' }} /> Ver con datos de ejemplo</>}
            </button>
          </div>
        )}

        {error && (
          <div role="alert" style={{ ...tarjeta, backgroundColor: colores.errorFondo, color: colores.errorTexto, padding: '12px 16px', marginBottom: '18px', fontSize: '13.5px' }}>
            {error}
          </div>
        )}

        {cargando ? (
          <div role="status" style={{ ...tarjeta, padding: '56px', textAlign: 'center', color: colores.textoSuave }}>
            <div className="spinner-border" style={{ color: colores.primario }}></div>
            <div style={{ marginTop: '10px' }}>Cargando reporte…</div>
          </div>
        ) : !datos ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <FiBarChart2 style={{ fontSize: '2rem', color: colores.textoSuaveClaro }} className="mb-2" />
            <div style={{ fontWeight: 600, color: colores.texto }}>Sin datos para mostrar</div>
            <small>Elige un periodo o consulta los datos de ejemplo.</small>
          </div>
        ) : (
          <>
            {/* Indicadores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '18px' }}>
              {indicadores.map((dato, i) => (
                <div key={dato.etiqueta} style={{ ...tarjeta, padding: '14px 16px', ...(i === 0 ? { gridColumn: 'span 2' } : {}) }}>
                  <small style={{ color: colores.textoSuave, fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                    {dato.etiqueta}
                  </small>
                  <div className="tnum" style={{ color: colores.texto, fontWeight: 800, fontSize: i === 0 ? '28px' : '20px', marginTop: '4px', ...cifrasTabulares }}>
                    {dato.valor}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...tarjeta, padding: '18px', marginBottom: '18px' }}>
              <h6 style={{ fontWeight: 700, color: colores.texto, marginBottom: '16px' }}>
                {(datos.serie || [])[0]?.hora != null ? 'Ventas por hora' : 'Ventas por día'}
              </h6>
              <GraficoVentas serie={datos.serie || []} periodo={periodo} />
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-lg-4">
                <Desglose titulo="Por tipo de servicio" filas={filasServicio} total={datos.totalVentas} />
              </div>
              <div className="col-12 col-lg-4">
                <Desglose titulo="Por método de pago" filas={filasMetodo} total={datos.totalVentas} />
              </div>
              <div className="col-12 col-lg-4">
                <div style={{ ...tarjeta, padding: '18px', height: '100%' }}>
                  <h6 style={{ fontWeight: 700, color: colores.texto, marginBottom: '10px' }}>Productos más vendidos</h6>
                  <table className="table table-sm mb-0" style={{ fontSize: '13px' }}>
                    <thead><tr><th>Producto</th><th className="text-end">Cant.</th><th className="text-end">Total</th></tr></thead>
                    <tbody>
                      {(datos.topProductos || []).slice(0, 8).map(p => (
                        <tr key={p.nombre}>
                          <td>{p.nombre}</td>
                          <td className="text-end tnum">{numero(p.cantidad)}</td>
                          <td className="text-end tnum">{formatearDinero(p.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div style={{ ...tarjeta, padding: '18px' }}>
              <h6 style={{ fontWeight: 700, color: colores.texto, marginBottom: '10px' }}>Detalle de pedidos</h6>
              <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
                <table className="table table-sm table-hover mb-0" style={{ fontSize: '13px', minWidth: '640px' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: colores.tarjeta }}>
                    <tr><th>Pedido</th><th>Fecha</th><th>Servicio</th><th>Pago</th><th>Estado</th><th className="text-end">Total</th></tr>
                  </thead>
                  <tbody>
                    {(datos.pedidos || []).map(p => (
                      <tr key={p.numeroSeguimiento}>
                        <td><strong>{p.numeroSeguimiento}</strong></td>
                        <td>{new Date(p.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td>{etiquetaTipoServicio(p.tipoServicio)}</td>
                        <td>{etiquetaMetodoPago(p.metodoPago)}</td>
                        <td>{etiquetaEstado(p.estado)}</td>
                        <td className="text-end tnum">{formatearDinero(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Reportes
