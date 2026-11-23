import { useCallback, useEffect, useState } from 'react'
import {
  FiAlertCircle, FiCheckCircle, FiCreditCard, FiDollarSign, FiLock, FiRefreshCw,
  FiTruck, FiXCircle
} from 'react-icons/fi'
import {
  confirmarPago,
  obtenerPago,
  registrarMontoEfectivo,
  registrarPagoEnLinea,
  seleccionarMetodoPago
} from '../services/pagos.js'
import { obtenerMensajeError } from '../services/mensajes.js'
import { formatearDinero } from '../utils/dinero.js'
import EstadoPagoBadge from './EstadoPagoBadge.jsx'
import {
  esBackendPagoNoDisponible,
  estaPagado,
  etiquetaMetodoPago,
  normalizarEstadoPago,
  pagoDesdePedido
} from '../utils/pagos.js'
import {
  colores, tarjeta, radios, btnPrimario, btnGhost, input, cifrasTabulares
} from '../styles/tokens.js'

const ROLES_CONFIRMACION = ['MESERO', 'ADMINISTRADOR', 'SUPERADMIN']

const METODOS = [
  { valor: 'EFECTIVO', etiqueta: 'Efectivo', icono: FiDollarSign },
  { valor: 'TARJETA', etiqueta: 'Tarjeta', icono: FiCreditCard },
  { valor: 'CONTRA_ENTREGA', etiqueta: 'Contra entrega', icono: FiTruck, soloDomicilio: true },
  { valor: 'PAGO_EN_LINEA', etiqueta: 'Pago en línea', icono: FiLock, soloEnLinea: true }
]

function mensajeDeError(err) {
  if (esBackendPagoNoDisponible(err)) {
    return 'La gestión de pagos todavía no está disponible en el servidor.'
  }
  const estado = err?.response?.status
  if (estado === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.'
  if (estado === 403) return 'No tienes permisos para gestionar el pago de este pedido.'
  return obtenerMensajeError(err, 'No fue posible gestionar el pago.')
}

/**
 * Panel de pago reutilizable.
 *
 * El estado mostrado siempre proviene del backend (resumen del pedido o
 * endpoint de pago). El frontend no declara pagos aprobados por su cuenta.
 * Si el endpoint de pagos aún no existe, se muestra el estado del pedido y
 * se deshabilitan las acciones en lugar de simular una transacción.
 */
function PagoPedido({ pedido, rol = null, onPagado, compacto = false }) {
  const pedidoId = pedido?.id
  const pagoInicial = pagoDesdePedido(pedido)
  const [pago, setPago] = useState(pagoInicial)
  const [cargando, setCargando] = useState(Boolean(pedidoId) && !pagoInicial)
  const [disponible, setDisponible] = useState(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [procesando, setProcesando] = useState('')
  const [monto, setMonto] = useState(
    pagoInicial?.pagoImporteRecibido > 0 ? String(pagoInicial.pagoImporteRecibido) : ''
  )
  const [referencia, setReferencia] = useState('')
  const [modoPagoEnLinea, setModoPagoEnLinea] = useState(false)
  const requiereAnticipo = Boolean(pagoInicial?.pagoAnticipo)

  const cargar = useCallback(async () => {
    if (!pedidoId) return
    setCargando(true)
    setError('')
    try {
      const datos = await obtenerPago(pedidoId)
      setPago(datos)
      setDisponible(true)
      setMonto(datos.pagoImporteRecibido > 0 ? String(datos.pagoImporteRecibido) : '')
    } catch (err) {
      if (esBackendPagoNoDisponible(err)) {
        setDisponible(false)
      } else {
        setError(mensajeDeError(err))
      }
    } finally {
      setCargando(false)
    }
  }, [pedidoId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const pagoActual = pago || pagoInicial
  const pagado = estaPagado(pagoActual?.pagoEstado)
  const estadoPedido = String(pagoActual?.estado || pedido?.estado || '').toUpperCase()
  const cancelado = estadoPedido === 'CANCELADO'
  const tipoServicio = pagoActual?.tipoServicio || pedido?.tipoServicio
  const esDomicilio = tipoServicio === 'DOMICILIO'
  const metodoActual = pagoActual?.pagoMetodo || ''
  const admiteEfectivo = metodoActual === 'EFECTIVO' || metodoActual === 'CONTRA_ENTREGA'
  const puedeConfirmar = ROLES_CONFIRMACION.includes(rol)
  const estadoPago = normalizarEstadoPago(pagoActual?.pagoEstado)
  const accionesDisponibles = disponible === true

  const manejarErrorOperacion = (err) => {
    if (esBackendPagoNoDisponible(err)) {
      setDisponible(false)
    }
    setError(mensajeDeError(err))
  }

  const cambiarMetodo = async (metodo) => {
    if (procesando || pagado || cancelado || !accionesDisponibles) return
    setProcesando(metodo)
    setError('')
    setAviso('')
    try {
      const datos = await seleccionarMetodoPago(pedidoId, metodo)
      setPago(datos)
      setAviso(`Método de pago actualizado a ${etiquetaMetodoPago(datos.pagoMetodo)}.`)
      if (datos.pagoMetodo !== 'EFECTIVO' && datos.pagoMetodo !== 'CONTRA_ENTREGA') {
        setMonto('')
      }
    } catch (err) {
      manejarErrorOperacion(err)
    } finally {
      setProcesando('')
    }
  }

  const registrarMonto = async () => {
    if (procesando || pagado || cancelado || !accionesDisponibles) return
    const valor = Number(String(monto).replace(',', '.'))
    if (!Number.isFinite(valor) || valor <= 0) {
      setError('Ingresa un monto recibido válido.')
      return
    }
    setProcesando('monto')
    setError('')
    setAviso('')
    try {
      const datos = await registrarMontoEfectivo(pedidoId, valor)
      setPago(datos)
      setAviso(
        datos.pagoCambio > 0
          ? `Monto registrado. Cambio calculado por el servidor: ${formatearDinero(datos.pagoCambio)}.`
          : 'Monto registrado. No hay cambio pendiente.'
      )
    } catch (err) {
      manejarErrorOperacion(err)
    } finally {
      setProcesando('')
    }
  }

  const cambiarMetodo = async (metodo) => {
    if (procesando || pagado || cancelado || !accionesDisponibles) return
    setProcesando(metodo)
    setError('')
    setAviso('')
    try {
      const datos = await seleccionarMetodoPago(pedidoId, metodo)
      setPago(datos)
      setAviso(`Método de pago actualizado a ${etiquetaMetodoPago(datos.pagoMetodo)}.`)
      setModoPagoEnLinea(metodo === 'PAGO_EN_LINEA')
      if (datos.pagoMetodo !== 'EFECTIVO' && datos.pagoMetodo !== 'CONTRA_ENTREGA') {
        setMonto('')
      }
      if (metodo === 'PAGO_EN_LINEA') {
        setReferencia('')
      }
    } catch (err) {
      manejarErrorOperacion(err)
    } finally {
      setProcesando('')
    }
  }

  const registrarPagoEnLineaHandler = async () => {
    if (procesando || pagado || cancelado || !accionesDisponibles) return
    const valor = Number(String(monto).replace(',', '.'))
    if (!Number.isFinite(valor) || valor <= 0) {
      setError('Ingresa un monto válido.')
      return
    }
    if (!referencia || referencia.trim().length === 0) {
      setError('La referencia del pago es obligatoria.')
      return
    }
    if (referencia.trim().length > 100) {
      setError('La referencia admite hasta 100 caracteres.')
      return
    }
    setProcesando('pago-en-linea')
    setError('')
    setAviso('')
    try {
      const esAnticipo = requiereAnticipo && valor < Number(pagoActual?.total || 0)
      const datos = await registrarPagoEnLinea(pedidoId, valor, referencia.trim(), esAnticipo)
      setPago(datos)
      setAviso(
        esAnticipo
          ? `Pago anticipado registrado (${formatearDinero(datos.pagoImporteRecibido)}). Falta saldo por completar.`
          : 'Pago en línea registrado correctamente.'
      )
      setReferencia('')
      setMonto('')
    } catch (err) {
      manejarErrorOperacion(err)
    } finally {
      setProcesando('')
    }
  }

  const confirmar = async () => {
    if (procesando || pagado || cancelado || !accionesDisponibles) return
    setProcesando('confirmar')
    setError('')
    setAviso('')
    try {
      const resumen = await confirmarPago(pedidoId)
      setPago(resumen)
      setAviso('Pago confirmado correctamente.')
      onPagado?.(resumen)
    } catch (err) {
      manejarErrorOperacion(err)
    } finally {
      setProcesando('')
    }
  }

  if (!pedidoId) return null

  if (cargando && !pagoActual) {
    return (
      <div style={{ ...tarjeta, padding: compacto ? '14px' : '18px', color: colores.textoSuave, fontSize: '13px' }}>
        <div className="spinner-border spinner-border-sm" style={{ color: colores.primario }}></div>
        <span style={{ marginLeft: '8px' }}>Consultando el estado del pago…</span>
      </div>
    )
  }

  if (error && !pagoActual) {
    return (
      <div style={{ ...tarjeta, padding: compacto ? '14px' : '18px' }}>
        <div role="alert" style={{
          backgroundColor: colores.errorFondo, color: colores.errorTexto,
          borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap'
        }}>
          <span><FiXCircle style={{ marginRight: '6px' }} />{error}</span>
          <button type="button" className="btn" onClick={cargar} style={{ ...btnGhost, minHeight: '34px' }}>
            <FiRefreshCw style={{ marginRight: '5px' }} /> Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!pagoActual) return null

  return (
    <section style={{ ...tarjeta, padding: compacto ? '14px' : '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div>
          <strong style={{ color: colores.texto, fontSize: '14px' }}>
            <FiDollarSign style={{ marginRight: '5px' }} /> Pago
          </strong>
          <small style={{ display: 'block', color: colores.textoSuave }}>
            Pedido {pagoActual.numeroSeguimiento || pedidoId}
          </small>
        </div>
        <EstadoPagoBadge estado={pagoActual.pagoEstado} />
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '12px', padding: '10px 12px',
        backgroundColor: colores.superficie, borderRadius: radios.sm
      }}>
        <span style={{ color: colores.textoSuave, fontSize: '13px' }}>Total del pedido</span>
        <strong className="tnum" style={{ color: colores.primario, fontSize: '18px', ...cifrasTabulares }}>
          {formatearDinero(pagoActual.total)}
        </strong>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
          borderRadius: radios.full, backgroundColor: colores.mint, color: colores.primario,
          fontSize: '11px', fontWeight: 600
        }}>
          Método: {etiquetaMetodoPago(pagoActual.pagoMetodo)}
        </span>
        {pagoActual.pagoImporteRecibido > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '4px 10px',
            borderRadius: radios.full, backgroundColor: colores.superficie,
            color: colores.textoSuave, fontSize: '11px', fontWeight: 600
          }}>
            Recibido: {formatearDinero(pagoActual.pagoImporteRecibido)}
          </span>
        )}
        {pagoActual.pagoCambio > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '4px 10px',
            borderRadius: radios.full, backgroundColor: colores.advertenciaFondo,
            color: colores.advertenciaTexto, fontSize: '11px', fontWeight: 600
          }}>
            Cambio: {formatearDinero(pagoActual.pagoCambio)}
          </span>
        )}
      </div>

      {estadoPago === 'PENDIENTE' && (
        <div role="status" style={{
          marginTop: '10px', backgroundColor: colores.advertenciaFondo, color: colores.advertenciaTexto,
          borderRadius: radios.sm, padding: '9px 11px', fontSize: '12.5px'
        }}>
          <FiAlertCircle style={{ marginRight: '5px' }} />
          Procesando pago. El estado se actualizará cuando el servidor lo confirme.
        </div>
      )}

      {estadoPago === 'RECHAZADO' && (
        <div role="alert" style={{
          marginTop: '10px', backgroundColor: colores.errorFondo, color: colores.errorTexto,
          borderRadius: radios.sm, padding: '9px 11px', fontSize: '12.5px'
        }}>
          <FiXCircle style={{ marginRight: '5px' }} />
          El pago fue rechazado. Puedes intentar nuevamente.
        </div>
      )}

      {requiereAnticipo && !pagado && (
        <div role="status" style={{
          marginTop: '10px', backgroundColor: colores.advertenciaFondo, color: colores.advertenciaTexto,
          borderRadius: radios.sm, padding: '9px 11px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <FiLock style={{ flexShrink: 0 }} />
          <span>
            Este pedido requiere <strong>pago anticipado</strong>.
            {estadoPago === 'PARCIAL'
              ? ` Se ha recibido un anticipo de ${formatearDinero(pagoActual?.pagoImporteRecibido || 0)}. Falta completar el saldo.`
              : ' Debe registrarse un pago antes de confirmar el pedido.'}
          </span>
        </div>
      )}

      {estadoPago === 'CANCELADO' && (
        <div role="alert" style={{
          marginTop: '10px', backgroundColor: colores.errorFondo, color: colores.errorTexto,
          borderRadius: radios.sm, padding: '9px 11px', fontSize: '12.5px'
        }}>
          <FiXCircle style={{ marginRight: '5px' }} />
          El pago fue cancelado.
        </div>
      )}

      {aviso && (
        <div role="status" style={{
          marginTop: '10px', backgroundColor: colores.exitoFondo, color: colores.exitoTexto,
          borderRadius: radios.sm, padding: '9px 11px', fontSize: '12.5px'
        }}>
          <FiCheckCircle style={{ marginRight: '5px' }} />{aviso}
        </div>
      )}

      {error && (
        <div role="alert" style={{
          marginTop: '10px', backgroundColor: colores.errorFondo, color: colores.errorTexto,
          borderRadius: radios.sm, padding: '9px 11px', fontSize: '12.5px'
        }}>
          <FiXCircle style={{ marginRight: '5px' }} />{error}
        </div>
      )}

      {disponible === false && (
        <div style={{
          marginTop: '10px', backgroundColor: colores.superficie, color: colores.textoSuave,
          borderRadius: radios.sm, padding: '9px 11px', fontSize: '12.5px'
        }}>
          <FiLock style={{ marginRight: '5px' }} />
          La gestión de pagos aún no está disponible en el servidor. El estado mostrado proviene del pedido.
        </div>
      )}

      {cancelado && (
        <div style={{ marginTop: '12px', color: colores.errorTexto, fontSize: '13px' }}>
          <FiLock style={{ marginRight: '5px' }} />
          No se puede gestionar el pago de un pedido cancelado.
        </div>
      )}

      {!cancelado && !pagado && accionesDisponibles && (
        <>
          <div style={{ marginTop: '12px' }}>
            <small style={{ display: 'block', color: colores.textoSuave, fontWeight: 600, marginBottom: '6px' }}>
              Método de pago
            </small>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {METODOS.map(({ valor, etiqueta, icono: Icono, soloDomicilio }) => {
                const noDisponible = soloDomicilio && !esDomicilio
                const activo = metodoActual === valor
                return (
                  <button
                    key={valor}
                    type="button"
                    disabled={Boolean(procesando) || noDisponible}
                    title={noDisponible ? 'El pago contra entrega solo aplica a pedidos a domicilio.' : etiqueta}
                    onClick={() => cambiarMetodo(valor)}
                    style={{
                      ...(activo ? btnPrimario : btnGhost),
                      minHeight: '38px',
                      fontSize: '12.5px',
                      padding: '0 12px',
                      opacity: noDisponible ? 0.45 : 1,
                      cursor: noDisponible ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Icono style={{ marginRight: '5px' }} />
                    {etiqueta}
                    {activo ? ' ✓' : ''}
                  </button>
                )
              })}
            </div>
            {!esDomicilio && (
              <small style={{ display: 'block', color: colores.textoSuave, marginTop: '6px' }}>
                El pago contra entrega solo está disponible para pedidos a domicilio.
              </small>
            )}
          </div>

          {admiteEfectivo && (
            <div style={{ marginTop: '12px' }}>
              <label htmlFor={`monto-pago-${pedidoId}`} style={{
                display: 'block', color: colores.textoSuave, fontWeight: 600, marginBottom: '6px', fontSize: '12.5px'
              }}>
                Monto recibido
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  id={`monto-pago-${pedidoId}`}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={monto}
                  disabled={Boolean(procesando)}
                  onChange={(event) => setMonto(event.target.value)}
                  placeholder={String(pagoActual.total)}
                  style={{ ...input, flex: '1 1 140px', minWidth: 0, padding: '0 10px' }}
                />
                <button
                  type="button"
                  className="btn"
                  disabled={Boolean(procesando)}
                  onClick={registrarMonto}
                  style={{ ...btnGhost, minHeight: '48px', padding: '0 14px' }}
                >
                  {procesando === 'monto' ? 'Registrando…' : 'Registrar monto'}
                </button>
              </div>
              <small style={{ display: 'block', color: colores.textoSuave, marginTop: '5px' }}>
                El backend valida que el monto cubra el total y calcula el cambio.
              </small>
            </div>
          )}

          {puedeConfirmar ? (
            <button
              type="button"
              className="btn w-100"
              disabled={Boolean(procesando) || !metodoActual}
              title={!metodoActual ? 'Selecciona un método de pago antes de confirmar.' : 'Confirmar pago'}
              onClick={confirmar}
              style={{ ...btnPrimario, minHeight: '44px', marginTop: '12px' }}
            >
              <FiCheckCircle style={{ marginRight: '6px' }} />
              {procesando === 'confirmar' ? 'Confirmando…' : 'Confirmar pago'}
            </button>
          ) : (
            <small style={{
              display: 'block', color: colores.textoSuave, marginTop: '12px',
              backgroundColor: colores.superficie, borderRadius: radios.sm, padding: '9px 11px'
            }}>
              <FiLock style={{ marginRight: '5px' }} />
              El pago será confirmado por el personal autorizado (mesero o administrador).
            </small>
          )}

          {metodoActual === 'PAGO_EN_LINEA' && (
            <div style={{ marginTop: '12px' }}>
              <label htmlFor={`referencia-pago-${pedidoId}`} style={{
                display: 'block', color: colores.textoSuave, fontWeight: 600, marginBottom: '6px', fontSize: '12.5px'
              }}>
                Referencia del pago en línea
              </label>
              <input
                id={`referencia-pago-${pedidoId}`}
                type="text"
                maxLength="100"
                value={referencia}
                disabled={Boolean(procesando)}
                onChange={(event) => setReferencia(event.target.value)}
                placeholder="Ej: TRX-123456"
                style={{ ...input, width: '100%', padding: '0 10px' }}
              />
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn w-100"
                  disabled={Boolean(procesando) || !referencia.trim()}
                  onClick={registrarPagoEnLineaHandler}
                  style={{ ...btnPrimario, minHeight: '44px', marginTop: '8px' }}
                >
                  {procesando === 'pago-en-linea'
                    ? 'Registrando pago en línea…'
                    : 'Registrar pago en línea'}
                </button>
              </div>
              <small style={{ display: 'block', color: colores.textoSuave, marginTop: '5px' }}>
                {requiereAnticipo
                  ? 'Pago anticipado: el saldo restante se puede completar en otro pago.'
                  : 'El monto debe cubrir el total del pedido para marcarlo como pagado.'}
              </small>
            </div>
          )}

          {!metodoActual && (
            <small style={{ display: 'block', color: colores.textoSuave, marginTop: '8px' }}>
              Selecciona un método para habilitar la confirmación.
            </small>
          )}
        </>
      )}

      {pagado && (
        <div role="status" style={{
          marginTop: '12px', backgroundColor: colores.exitoFondo, color: colores.exitoTexto,
          borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px'
        }}>
          <FiCheckCircle style={{ marginRight: '6px' }} />
          Pago aprobado. El pedido quedó registrado como pagado.
        </div>
      )}
    </section>
  )
}

export default PagoPedido
