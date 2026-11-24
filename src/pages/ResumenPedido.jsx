import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiPackage, FiRefreshCw } from 'react-icons/fi'
import api from '../services/api.js'
import PagoPedido from '../components/PagoPedido.jsx'
import EstadoPagoBadge from '../components/EstadoPagoBadge.jsx'
import { obtenerResumenPedido } from '../services/pedidos.js'
import { obtenerMensajeError } from '../services/mensajes.js'
import { obtenerContextoMenu } from '../utils/contextoMenu.js'
import { etiquetaEstado } from '../utils/pedidos.js'
import { etiquetaMetodoPago } from '../utils/pagos.js'
import { colores, tarjeta, btnPrimario, btnGhost } from '../styles/tokens.js'

const dps = (valor) => Number(valor ?? 0).toLocaleString('es-CO')

function textoPersonalizaciones(item) {
  if (Array.isArray(item?.personalizaciones)) {
    return item.personalizaciones
      .map(valor => (valor == null ? '' : String(valor)))
      .filter(Boolean)
      .join(', ')
  }
  if (typeof item?.personalizaciones === 'string') {
    return item.personalizaciones
  }
  return ''
}

function importeItem(item) {
  const importe = Number(item?.importe)
  if (Number.isFinite(importe)) return importe
  const precio = Number(item?.precioUnitario) + Number(item?.adicionalOpciones)
  return precio * Number(item?.cantidad || 0)
}

/**
 * RF052 — Resumen detallado de cuenta.
 *
 * El desglose completo proviene del backend, incluida la tasa aplicada al
 * pedido. Los pedidos históricos muestran la tasa con la que fueron creados,
 * no la tasa configurada actualmente.
 */
function ResumenPedido() {
  const navigate = useNavigate()
  const { pedidoId } = useParams()
  const [resumen, setResumen] = useState(null)
  const [rol, setRol] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cargarResumen = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await obtenerResumenPedido(pedidoId)
      setResumen(data)
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Pedido no encontrado. Verifique el número de seguimiento o su sesión.')
      } else if (err.response?.status === 403) {
        setError(obtenerMensajeError(err, 'No tiene permisos para consultar este pedido.'))
      } else {
        setError(obtenerMensajeError(err, 'No se pudo cargar el resumen. Intente nuevamente.'))
      }
    } finally {
      setLoading(false)
    }
  }, [pedidoId])

  useEffect(() => {
    cargarResumen()
  }, [cargarResumen])

  useEffect(() => {
    let cancelado = false
    api.get('/api/auth/me')
      .then(response => {
        if (!cancelado) setRol(response.data?.rol || null)
      })
      .catch(() => {
        // Invitado sin sesión: puede consultar su pedido y elegir método de pago.
      })
    return () => { cancelado = true }
  }, [])

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border" style={{ color: colores.primario }}></div>
        <p className="text-muted mt-2">Cargando resumen...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          <i className="fa-solid fa-circle-exclamation me-2"></i>{error}
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-sm" style={{ ...btnPrimario, minHeight: '40px' }} onClick={cargarResumen}>
            <FiRefreshCw style={{ marginRight: '5px' }} /> Reintentar
          </button>
          <button className="btn btn-sm" style={{ ...btnGhost, minHeight: '40px' }} onClick={() => navigate(-1)}>
            <FiArrowLeft style={{ marginRight: '5px' }} /> Volver
          </button>
        </div>
      </div>
    )
  }

  if (!resumen) return null

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
        <h2 className="mb-0">
          <FiPackage style={{ marginRight: '8px' }} />
          Resumen del pedido
        </h2>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-sm btn-outline-secondary" onClick={cargarResumen}>
            <FiRefreshCw style={{ marginRight: '5px' }} /> Actualizar
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => navigate(obtenerContextoMenu() || '/menu')}
          >
            <FiArrowLeft style={{ marginRight: '5px' }} /> Volver al menú
          </button>
        </div>
      </div>

      {resumen.numeroSeguimiento && (
        <p className="text-muted small">
          Número de seguimiento:{' '}
          <strong style={{ color: colores.primario }}>{resumen.numeroSeguimiento}</strong>
          {' '}
          <span className="badge bg-secondary">{etiquetaEstado(resumen.estado)}</span>
        </p>
      )}

      <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
        <EstadoPagoBadge estado={resumen.pagoEstado} />
        <small style={{ color: colores.textoSuave }}>
          Método: {etiquetaMetodoPago(resumen.pagoMetodo)}
        </small>
      </div>

      <div className="row">
        <div className="col-12 col-lg-8">
          {/* Líneas del pedido */}
          <div className="card mb-3" style={tarjeta}>
            <div className="card-body">
              <h6 className="mb-3">Productos</h6>
              {(Array.isArray(resumen.items) ? resumen.items : []).map((item, idx) => {
                const personalizaciones = textoPersonalizaciones(item)
                return (
                  <div key={idx} className="d-flex justify-content-between align-items-start mb-3 pb-3 border-bottom">
                    <div>
                      <strong>{item.cantidad}x {item.nombre}</strong>
                      {personalizaciones && (
                        <small className="text-muted d-block">
                          <i className="fa-solid fa-pen me-1"></i>
                          {personalizaciones}
                        </small>
                      )}
                      {Number(item?.adicionalOpciones) > 0 && (
                        <small className="text-muted d-block">
                          Adicionales: ${dps(item.adicionalOpciones)} por unidad
                        </small>
                      )}
                      {item.observaciones && (
                        <small className="text-muted d-block">
                          <i className="fa-solid fa-note-sticky me-1"></i>
                          {item.observaciones}
                        </small>
                      )}
                    </div>
                    <span className="text-end">
                      ${dps(importeItem(item))}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          {/* Desglose de totales */}
          <div className="card sticky-top" style={{ top: '20px', ...tarjeta }}>
            <div className="card-body">
              <h6 className="mb-3">Desglose</h6>

              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Subtotal</span>
                <span>${dps(resumen.subtotal)}</span>
              </div>

              {(Number(resumen.descuento) > 0) && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>
                    Descuento {resumen.cuponCodigo ? `(${resumen.cuponCodigo})` : ''}
                  </span>
                  <span>-${dps(resumen.descuento)}</span>
                </div>
              )}

              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Base gravable</span>
                <span>${dps(resumen.baseGravable)}</span>
              </div>

              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">
                  Impuestos {Number(resumen.tasaImpuesto) > 0 && `(${dps(resumen.tasaImpuesto)}%)`}
                </span>
                <span>${dps(resumen.impuestos)}</span>
              </div>

              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">
                  Propina
                  {resumen.propinaTipo === 'PORCENTAJE' && Number(resumen.propinaPorcentaje) > 0
                    ? ` (${dps(resumen.propinaPorcentaje)}%)`
                    : ''}
                </span>
                <span>${dps(resumen.propina)}</span>
              </div>

              {(Number(resumen.cargos) > 0) && (
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Cargos</span>
                  <span>${dps(resumen.cargos)}</span>
                </div>
              )}

              <hr />
              <div className="d-flex justify-content-between">
                <strong>Total</strong>
                <strong style={{ color: colores.primario, fontSize: '1.2rem' }}>
                  ${dps(resumen.total)}
                </strong>
              </div>
            </div>
          </div>

          <div className="mt-3">
            {rol === 'CLIENTE' ? (
              <div style={{ ...tarjeta, padding: '14px', color: colores.textoSuave, fontSize: '13px' }}>
                El pago de este pedido lo gestiona el personal autorizado del restaurante.
              </div>
            ) : (
              <PagoPedido
                pedido={resumen}
                rol={rol}
                compacto
                onPagado={(actualizado) => {
                  if (actualizado?.id) setResumen(actualizado)
                }}
                onPagoActualizado={(actualizado) => {
                  if (actualizado?.id) setResumen(actualizado)
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Botón volver a editar */}
      <div className="mt-4 d-flex gap-2 flex-wrap">
        <button
          className="btn flex-grow-1 flex-md-grow-0"
          style={{ ...btnPrimario, minHeight: '44px' }}
          onClick={() => navigate('/carrito')}
        >
          <FiArrowLeft style={{ marginRight: '5px' }} /> Volver a editar
        </button>
      </div>
    </div>
  )
}

export default ResumenPedido
