import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiPackage } from 'react-icons/fi'
import { obtenerResumenPedido } from '../services/pedidos.js'

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
    } catch (err) {
      setError('No se pudo cargar el resumen. Intente nuevamente.')
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <FiPackage style={{ marginRight: '8px' }} />
          Resumen del pedido
        </h2>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft style={{ marginRight: '5px' }} /> Volver
        </button>
      </div>

      <div className="row">
        <div className="col-lg-8">
          {/* Líneas del pedido */}
          <div className="card mb-3" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
            <div className="card-body">
              <h6 className="mb-3">Productos</h6>
              {resumen.items?.map((item, idx) => (
                <div key={idx} className="d-flex justify-content-between align-items-start mb-3 pb-3 border-bottom">
                  <div>
                    <strong>{item.cantidad}x {item.nombre}</strong>
                    {item.personalizaciones?.length > 0 && (
                      <small className="text-muted d-block">
                        {item.personalizaciones.join(', ')}
                      </small>
                    )}
                  </div>
                  <span className="text-end">
                    ${(item.precioUnitario * item.cantidad).toLocaleString('es-CO')}
                  </span>
                </div>
              ))}
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
                <span>${resumen.subtotal?.toLocaleString('es-CO') || '0'}</span>
              </div>

              {resumen.descuento > 0 && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>Descuento</span>
                  <span>-${resumen.descuento.toLocaleString('es-CO')}</span>
                </div>
              )}

              {resumen.cargos > 0 && (
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Cargos</span>
                  <span>${resumen.cargos.toLocaleString('es-CO')}</span>
                </div>
              )}

              {resumen.propina > 0 && (
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Propina</span>
                  <span>${resumen.propina.toLocaleString('es-CO')}</span>
                </div>
              )}

              {resumen.impuestos > 0 && (
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Impuestos</span>
                  <span>${resumen.impuestos.toLocaleString('es-CO')}</span>
                </div>
              )}

              <hr />
              <div className="d-flex justify-content-between">
                <strong>Total</strong>
                <strong style={{ color: '#1a3c34', fontSize: '1.2rem' }}>
                  ${resumen.total?.toLocaleString('es-CO') || '0'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResumenPedido
