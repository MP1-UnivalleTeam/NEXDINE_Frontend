import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiPackage } from 'react-icons/fi'
import { obtenerResumenPedido } from '../services/pedidos.js'
import { obtenerContextoMenu } from '../utils/contextoMenu.js'

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
 * Heurísticas de Nielsen:
 *   · Visibilidad del estado: loading, error y datos claros.
 *   · Control y libertad: volver a editar sin perder datos.
 *   · Consistencia: mismos colores y estilos del resto de la app.
 *   · Reconocimiento: desglose completo visible de un vistazo.
 */
function ResumenPedido() {
  const navigate = useNavigate()
  const { pedidoId } = useParams()
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarResumen()
  }, [pedidoId])

  const cargarResumen = async () => {
    try {
      const data = await obtenerResumenPedido(pedidoId)
      setResumen(data)
      setError('')
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Pedido no encontrado. Verifique el número de seguimiento.')
      } else {
        setError('No se pudo cargar el resumen. Intente nuevamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border" style={{ color: '#1a3c34' }}></div>
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
        <button
          className="btn btn-sm"
          style={{ backgroundColor: '#1a3c34', color: 'white' }}
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft style={{ marginRight: '5px' }} /> Volver
        </button>
      </div>
    )
  }

  if (!resumen) return null

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="mb-0">
          <FiPackage style={{ marginRight: '8px' }} />
          Resumen del pedido
        </h2>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate(obtenerContextoMenu() || '/menu')}
        >
          <FiArrowLeft style={{ marginRight: '5px' }} /> Volver al menú
        </button>
      </div>

      {resumen.numeroSeguimiento && (
        <p className="text-muted small">
          Número de seguimiento:{' '}
          <strong style={{ color: '#1a3c34' }}>{resumen.numeroSeguimiento}</strong>
          {' '}
          <span className="badge bg-secondary">{resumen.estado}</span>
        </p>
      )}

      <div className="row">
        <div className="col-12 col-lg-8">
          {/* Líneas del pedido */}
          <div className="card mb-3" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
            <div className="card-body">
              <h6 className="mb-3">Productos</h6>
              {(Array.isArray(resumen.items) ? resumen.items : []).map((item, idx) => {
                const personalizaciones = typeof item?.personalizaciones === 'string'
                  ? item.personalizaciones
                  : Array.isArray(item?.personalizaciones)
                    ? item.personalizaciones
                      .map(v => (v == null ? '' : String(v)))
                      .filter(Boolean)
                      .join(', ')
                    : ''
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
          <div className="card sticky-top" style={{ top: '20px', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
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

              {(Number(resumen.cargos) > 0) && (
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Cargos</span>
                  <span>${dps(resumen.cargos)}</span>
                </div>
              )}

              {(Number(resumen.propina) > 0) && (
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Propina</span>
                  <span>${dps(resumen.propina)}</span>
                </div>
              )}

              {(Number(resumen.impuestos) > 0) && (
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">
                    Impuestos {Number(resumen.tasaImpuesto) > 0 && `(${dps(resumen.tasaImpuesto)}%)`}
                  </span>
                  <span>${dps(resumen.impuestos)}</span>
                </div>
              )}

              <hr />
              <div className="d-flex justify-content-between">
                <strong>Total</strong>
                <strong style={{ color: '#1a3c34', fontSize: '1.2rem' }}>
                  ${dps(resumen.total)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botón volver a editar */}
      <div className="mt-4 d-flex gap-2 flex-wrap">
        <button
          className="btn flex-grow-1 flex-md-grow-0"
          style={{ backgroundColor: '#1a3c34', color: 'white' }}
          onClick={() => navigate('/carrito')}
        >
          <FiArrowLeft style={{ marginRight: '5px' }} /> Volver a editar
        </button>
      </div>
    </div>
  )
}

export default ResumenPedido
