import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiAlertCircle, FiCheckCircle, FiPercent, FiRefreshCw, FiSave, FiShield, FiToggleLeft, FiToggleRight, FiXCircle
} from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import {
  actualizarConfiguracionImpuesto,
  cambiarEstadoImpuesto,
  obtenerConfiguracionImpuesto
} from '../services/impuestos.js'
import { obtenerMensajeError } from '../services/mensajes.js'
import { colores, tarjeta, radios, btnPrimario, btnGhost, estiloBadge, input } from '../styles/tokens.js'

function formatearPorcentaje(valor) {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return '—'
  return numero.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

function formatearFecha(valor) {
  if (!valor) return '—'
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

/**
 * Configuración de impuestos (solo SUPERADMIN).
 *
 * Consulta y modifica el recurso real del backend. No existe una tasa fija en
 * el frontend: el porcentaje mostrado y el estado activo provienen de
 * /api/impuestos/configuracion.
 */
function Impuestos() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [config, setConfig] = useState(null)
  const [porcentaje, setPorcentaje] = useState('')
  const [activo, setActivo] = useState(true)
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/me')
      const usuario = response.data
      if (usuario?.rol !== 'SUPERADMIN') {
        navigate(usuario?.rol === 'CLIENTE' ? '/menu' : '/dashboard')
        return
      }
      setCurrentUser(usuario)
      await cargarConfiguracion()
    } catch {
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const cargarConfiguracion = async () => {
    setErrorCarga('')
    try {
      const datos = await obtenerConfiguracionImpuesto()
      setConfig(datos)
      setPorcentaje(datos?.porcentaje != null ? String(datos.porcentaje) : '')
      setActivo(Boolean(datos?.activo))
      setErrorForm('')
    } catch (err) {
      setConfig(null)
      if (err.response?.status === 401) {
        navigate('/login')
        return
      }
      setErrorCarga(obtenerMensajeError(err, 'No fue posible consultar la configuración de impuestos.'))
    }
  }

  const handleLogout = async () => {
    try {
      await api.get('/logout')
    } catch {
      // La navegación local continúa aunque el logout remoto falle.
    }
    navigate('/login')
  }

  const validarPorcentaje = () => {
    const texto = String(porcentaje).trim().replace(',', '.')
    if (texto === '') {
      return 'Ingresa el porcentaje de impuesto.'
    }
    const numero = Number(texto)
    if (!Number.isFinite(numero)) {
      return 'El porcentaje debe ser un número válido.'
    }
    if (numero < 0 || numero > 100) {
      return 'El porcentaje debe estar entre 0 y 100.'
    }
    if (Math.round(numero * 100) !== Number((numero * 100).toFixed(6))) {
      return 'El porcentaje admite como máximo dos decimales.'
    }
    return ''
  }

  const guardar = async (event) => {
    event.preventDefault()
    if (guardando || cambiandoEstado) return
    setErrorForm('')
    setSuccessMessage('')

    const mensajeValidacion = validarPorcentaje()
    if (mensajeValidacion) {
      setErrorForm(mensajeValidacion)
      return
    }

    setGuardando(true)
    try {
      const datos = await actualizarConfiguracionImpuesto({
        porcentaje: Number(String(porcentaje).replace(',', '.')),
        activo
      })
      setConfig(datos)
      setPorcentaje(datos?.porcentaje != null ? String(datos.porcentaje) : '')
      setActivo(Boolean(datos?.activo))
      setSuccessMessage('Configuración de impuestos guardada correctamente.')
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login')
        return
      }
      setErrorForm(obtenerMensajeError(err, 'No fue posible guardar la configuración de impuestos.'))
    } finally {
      setGuardando(false)
    }
  }

  const alternarEstado = async () => {
    if (guardando || cambiandoEstado) return
    setErrorForm('')
    setSuccessMessage('')
    setCambiandoEstado(true)
    try {
      const datos = await cambiarEstadoImpuesto(!activo)
      setConfig(datos)
      setPorcentaje(datos?.porcentaje != null ? String(datos.porcentaje) : porcentaje)
      setActivo(Boolean(datos?.activo))
      setSuccessMessage(
        datos?.activo
          ? 'Impuesto activado. Se aplicará a los pedidos nuevos.'
          : 'Impuesto desactivado. El backend aplicará 0 % a los pedidos nuevos.'
      )
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login')
        return
      }
      setErrorForm(obtenerMensajeError(err, 'No fue posible cambiar el estado del impuesto.'))
    } finally {
      setCambiandoEstado(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: colores.fondo }}>
        <div className="spinner-border" style={{ color: colores.primario }}></div>
      </div>
    )
  }

  if (!currentUser) return null

  const ocupado = guardando || cambiandoEstado
  const tasaVigente = config?.activo ? config?.porcentaje : 0

  return (
    <div className="nexdine-shell" style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', backgroundColor: colores.fondo }}>
      <Sidebar currentUser={currentUser} rutaActual="/impuestos" onLogout={handleLogout} />

      <div className="nexdine-main" style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '12px', marginBottom: '24px'
        }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>
              <FiPercent style={{ marginRight: '8px' }} />
              Impuestos
            </h2>
            <small style={{ color: colores.textoSuave }}>
              Configuración del impuesto aplicado a los pedidos nuevos del restaurante.
            </small>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn"
              onClick={cargarConfiguracion}
              disabled={ocupado}
              style={{ ...btnGhost, minHeight: '44px' }}
            >
              <FiRefreshCw style={{ marginRight: '6px' }} /> Actualizar
            </button>
            <span className="text-muted d-none d-md-inline">Hola, <strong>{currentUser.nombre}</strong></span>
            <img
              src={`https://ui-avatars.com/api/?name=${currentUser.nombre}&background=11362E&color=fff`}
              className="rounded-circle" width="40" height="40" alt="Avatar"
            />
          </div>
        </div>

        {successMessage && (
          <div role="status" style={{
            ...tarjeta, backgroundColor: colores.exitoFondo, color: colores.exitoTexto,
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
            fontSize: '14px', marginBottom: '16px'
          }}>
            <FiCheckCircle size={18} style={{ color: colores.exito, flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {(errorCarga || errorForm) && (
          <div role="alert" style={{
            ...tarjeta, backgroundColor: colores.errorFondo, color: colores.errorTexto,
            padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px', fontSize: '14px', marginBottom: '16px', flexWrap: 'wrap'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FiXCircle size={18} style={{ flexShrink: 0 }} />
              {errorCarga || errorForm}
            </span>
            <button type="button" className="btn" onClick={cargarConfiguracion} disabled={ocupado} style={{ ...btnGhost, minHeight: '36px' }}>
              Reintentar
            </button>
          </div>
        )}

        {!config && !errorCarga && (
          <div style={{ ...tarjeta, padding: '40px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <FiAlertCircle style={{ fontSize: '1.8rem', color: colores.textoSuaveClaro }} />
            <div style={{ fontWeight: 600, color: colores.texto, marginTop: '8px' }}>
              No hay configuración disponible
            </div>
            <small>Actualiza para volver a consultar la configuración del backend.</small>
          </div>
        )}

        {config && (
          <div className="row g-3">
            <div className="col-12 col-xl-5">
              <div style={{ ...tarjeta, padding: '22px', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <h5 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Tasa vigente</h5>
                  <span style={estiloBadge(
                    config.activo ? colores.exitoFondo : colores.advertenciaFondo,
                    config.activo ? colores.exitoTexto : colores.advertenciaTexto
                  )}>
                    {config.activo ? 'Activo' : 'Desactivado'}
                  </span>
                </div>

                <div style={{
                  marginTop: '18px', padding: '20px', borderRadius: radios.md,
                  backgroundColor: colores.superficie, textAlign: 'center'
                }}>
                  <div style={{ fontSize: '3rem', fontWeight: 700, color: colores.primario, lineHeight: 1 }}>
                    {formatearPorcentaje(tasaVigente)}%
                  </div>
                  <small style={{ color: colores.textoSuave, display: 'block', marginTop: '8px' }}>
                    {config.activo
                      ? 'Porcentaje aplicado por el backend a los pedidos nuevos.'
                      : 'Impuesto desactivado: el backend aplica 0 %.'}
                  </small>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                    <span style={{ color: colores.textoSuave }}>Restaurante</span>
                    <span style={{ color: colores.texto, fontFamily: 'monospace', fontSize: '11.5px' }}>
                      {config.restauranteId || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                    <span style={{ color: colores.textoSuave }}>Última modificación</span>
                    <span style={{ color: colores.texto }}>{formatearFecha(config.fechaActualizacion)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                    <span style={{ color: colores.textoSuave }}>Modificado por</span>
                    <span style={{ color: colores.texto }}>{config.modificadoPorNombre || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-xl-7">
              <form onSubmit={guardar} style={{ ...tarjeta, padding: '22px' }}>
                <h5 style={{ margin: 0, fontWeight: 700, color: colores.texto, marginBottom: '4px' }}>
                  Editar configuración
                </h5>
                <small style={{ color: colores.textoSuave, display: 'block', marginBottom: '18px' }}>
                  Solo el SUPERADMIN puede modificar estos valores. El backend valida el rango 0–100 y dos decimales.
                </small>

                <div className="mb-3">
                  <label htmlFor="porcentaje-impuesto" className="form-label small fw-semibold">
                    Porcentaje de impuesto
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="porcentaje-impuesto"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      inputMode="decimal"
                      value={porcentaje}
                      disabled={ocupado}
                      onChange={(event) => setPorcentaje(event.target.value)}
                      style={{ ...input, width: '100%', paddingRight: '42px', paddingLeft: '12px' }}
                    />
                    <span style={{
                      position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                      color: colores.textoSuave, fontWeight: 700
                    }}>%</span>
                  </div>
                  <small style={{ color: colores.textoSuave }}>
                    Ejemplo: 19 equivale a 19 %. No se permiten valores negativos ni mayores a 100.
                  </small>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '12px', flexWrap: 'wrap', backgroundColor: colores.superficie,
                  borderRadius: radios.sm, padding: '12px 14px', marginBottom: '18px'
                }}>
                  <div>
                    <strong style={{ display: 'block', color: colores.texto, fontSize: '13.5px' }}>
                      Impuesto activo
                    </strong>
                    <small style={{ color: colores.textoSuave }}>
                      Al desactivarlo, los pedidos nuevos se crean con tasa 0.
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={alternarEstado}
                    disabled={ocupado}
                    aria-pressed={activo}
                    style={{
                      ...btnGhost,
                      minHeight: '42px',
                      color: activo ? colores.exitoTexto : colores.advertenciaTexto,
                      borderColor: activo ? colores.exito : colores.advertencia,
                      display: 'inline-flex', alignItems: 'center', gap: '7px'
                    }}
                  >
                    {cambiandoEstado
                      ? 'Guardando…'
                      : activo
                        ? <><FiToggleRight size={18} /> Desactivar</>
                        : <><FiToggleLeft size={18} /> Activar</>}
                  </button>
                </div>

                <div style={{
                  backgroundColor: colores.mint, color: colores.primario,
                  borderRadius: radios.sm, padding: '11px 13px', fontSize: '12.5px',
                  display: 'flex', gap: '8px', lineHeight: 1.45
                }}>
                  <FiShield style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    Los pedidos ya creados conservan la tasa con la que fueron registrados.
                    Los cambios solo afectan a pedidos nuevos.
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn w-100"
                  disabled={ocupado}
                  style={{ ...btnPrimario, minHeight: '48px', marginTop: '18px' }}
                >
                  <FiSave style={{ marginRight: '7px' }} />
                  {guardando ? 'Guardando…' : 'Guardar configuración'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Impuestos
