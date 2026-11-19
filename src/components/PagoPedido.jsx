import { useCallback, useEffect, useState } from 'react'
import {
  FiCheckCircle, FiCreditCard, FiDollarSign, FiLock, FiRefreshCw, FiTruck, FiXCircle
} from 'react-icons/fi'
import {
  confirmarPago,
  obtenerPago,
  registrarMontoEfectivo,
  seleccionarMetodoPago
} from '../services/pagos.js'
import { obtenerMensajeError } from '../services/mensajes.js'
import { formatearDinero } from '../utils/dinero.js'
import {
  colores, tarjeta, radios, btnPrimario, btnGhost, estiloBadge, input, cifrasTabulares
} from '../styles/tokens.js'

const ROLES_CONFIRMACION = ['MESERO', 'ADMINISTRADOR', 'SUPERADMIN']

const METODOS = [
  { valor: 'EFECTIVO', etiqueta: 'Efectivo', icono: FiDollarSign },
  { valor: 'TARJETA', etiqueta: 'Tarjeta', icono: FiCreditCard },
  { valor: 'CONTRA_ENTREGA', etiqueta: 'Contra entrega', icono: FiTruck, soloDomicilio: true }
]

function etiquetaMetodo(metodo) {
  return METODOS.find(opcion => opcion.valor === metodo)?.etiqueta || 'Sin seleccionar'
}

function mensajeDeError(err) {
  const estado = err?.response?.status
  if (estado === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.'
  if (estado === 403) return 'No tienes permisos para gestionar el pago de este pedido.'
  if (estado === 404) return 'El pedido no está disponible para pago.'
  return obtenerMensajeError(err, 'No fue posible gestionar el pago.')
}

/**
 * Panel de pago reutilizable.
 *
 * - Consulta el pago real del pedido.
 * - Permite seleccionar EFECTIVO, TARJETA o CONTRA_ENTREGA (solo domicilio).
 * - Para efectivo/contra entrega envía el monto recibido; el cambio SIEMPRE
 *   lo calcula y devuelve el backend.
 * - Solo MESERO/ADMINISTRADOR/SUPERADMIN pueden confirmar el pago.
 */
function PagoPedido({ pedido, rol = null, onPagado, compacto = false }) {
  const pedidoId = pedido?.id
  const [pago, setPago] = useState(null)
  const [cargando, setCargando] = useState(Boolean(pedidoId))
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [procesando, setProcesando] = useState('')
  const [monto, setMonto] = useState('')

  const cargar = useCallback(async () => {
    if (!pedidoId) return
    setCargando(true)
    setError('')
    try {
      const datos = await obtenerPago(pedidoId)
      setPago(datos)
      setMonto(datos.pagoImporteRecibido > 0 ? String(datos.pagoImporteRecibido) : '')
    } catch (err) {
      setPago(null)
      setError(mensajeDeError(err))
    } finally {
      setCargando(false)
    }
  }, [pedidoId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const pagado = pago?.pagoEstado === 'PAGADO'
  const estadoPedido = pago?.estado || pedido?.estado
  const cancelado = estadoPedido === 'CANCELADO'
  const tipoServicio = pago?.tipoServicio || pedido?.tipoServicio
  const esDomicilio = tipoServicio === 'DOMICILIO'
  const metodoActual = pago?.pagoMetodo || ''
  const admiteEfectivo = metodoActual === 'EFECTIVO' || metodoActual === 'CONTRA_ENTREGA'
  const puedeConfirmar = ROLES_CONFIRMACION.includes(rol)

  const cambiarMetodo = async (metodo) => {
    if (procesando || pagado || cancelado) return
    setProcesando(metodo)
    setError('')
    setAviso('')
    try {
      const datos = await seleccionarMetodoPago(pedidoId, metodo)
      setPago(datos)
      setAviso(`Método de pago actualizado a ${etiquetaMetodo(datos.pagoMetodo)}.`)
      if (datos.pagoMetodo !== 'EFECTIVO' && datos.pagoMetodo !== 'CONTRA_ENTREGA') {
        setMonto('')
      }
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setProcesando('')
    }
  }

  const registrarMonto = async () => {
    if (procesando || pagado || cancelado) return
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
      setError(mensajeDeError(err))
    } finally {
      setProcesando('')
    }
  }

  const confirmar = async () => {
    if (procesando || pagado || cancelado) return
    setProcesando('confirmar')
    setError('')
    setAviso('')
    try {
      const resumen = await confirmarPago(pedidoId)
      await cargar()
      setAviso('Pago confirmado correctamente.')
      // Se notifica al contenedor al final: puede cerrar el modal y desmontar
      // este componente, por eso la recarga del pago ya se hizo antes.
      onPagado?.(resumen)
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setProcesando('')
    }
  }

  if (!pedidoId) return null

  if (cargando && !pago) {
    return (
      <div style={{ ...tarjeta, padding: compacto ? '14px' : '18px', color: colores.textoSuave, fontSize: '13px' }}>
        <div className="spinner-border spinner-border-sm" style={{ color: colores.primario }}></div>
        <span style={{ marginLeft: '8px' }}>Consultando el estado del pago…</span>
      </div>
    )
  }

  if (error && !pago) {
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

  if (!pago) return null

  return (
    <section style={{ ...tarjeta, padding: compacto ? '14px' : '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div>
          <strong style={{ color: colores.texto, fontSize: '14px' }}>
            <FiDollarSign style={{ marginRight: '5px' }} /> Pago
          </strong>
          <small style={{ display: 'block', color: colores.textoSuave }}>
            Pedido {pago.numeroSeguimiento || pedidoId}
          </small>
        </div>
        <span style={estiloBadge(
          pagado ? colores.exitoFondo : (cancelado ? colores.errorFondo : colores.advertenciaFondo),
          pagado ? colores.exitoTexto : (cancelado ? colores.errorTexto : colores.advertenciaTexto)
        )}>
          {pagado ? 'Pagado' : (cancelado ? 'Cancelado' : (pago.pagoEstado ? 'Pago pendiente' : 'Sin pago'))}
        </span>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '12px', padding: '10px 12px',
        backgroundColor: colores.superficie, borderRadius: radios.sm
      }}>
        <span style={{ color: colores.textoSuave, fontSize: '13px' }}>Total del pedido</span>
        <strong className="tnum" style={{ color: colores.primario, fontSize: '18px', ...cifrasTabulares }}>
          {formatearDinero(pago.total)}
        </strong>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
        <span style={estiloBadge(colores.mint, colores.primario)}>
          Método: {etiquetaMetodo(pago.pagoMetodo)}
        </span>
        {pago.pagoImporteRecibido > 0 && (
          <span style={estiloBadge(colores.superficie, colores.textoSuave)}>
            Recibido: {formatearDinero(pago.pagoImporteRecibido)}
          </span>
        )}
        {pago.pagoCambio > 0 && (
          <span style={estiloBadge(colores.advertenciaFondo, colores.advertenciaTexto)}>
            Cambio: {formatearDinero(pago.pagoCambio)}
          </span>
        )}
      </div>

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

      {cancelado && (
        <div style={{ marginTop: '12px', color: colores.errorTexto, fontSize: '13px' }}>
          <FiLock style={{ marginRight: '5px' }} />
          No se puede gestionar el pago de un pedido cancelado.
        </div>
      )}

      {!cancelado && !pagado && (
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
                    disabled={procesando || noDisponible}
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
                  placeholder={String(pago.total)}
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
              disabled={Boolean(procesando) || !pago.pagoMetodo}
              title={!pago.pagoMetodo ? 'Selecciona un método de pago antes de confirmar.' : 'Confirmar pago'}
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

          {!pago.pagoMetodo && (
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
          Pago confirmado. El pedido quedó registrado como pagado.
        </div>
      )}
    </section>
  )
}

export default PagoPedido
