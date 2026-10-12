import { useState, useEffect } from 'react'
import { FiPlus } from 'react-icons/fi'
import { obtenerSugerencias } from '../services/pedidos.js'
import { useCarrito } from '../context/CarritoContext.jsx'

/**
 * RF034 — Sugerencias de productos.
 *
 * Heurísticas de Nielsen:
 *   · Visibilidad del estado: loading, error y estado vacío claros.
 *   · Control y libertad: agregar sin perder el carrito.
 *   · Consistencia: mismos cards que el menú principal.
 *   · Reconocimiento: productos con imagen, precio y disponibilidad visibles.
 */
function Sugerencias({ productoActual, onAgregar }) {
  const [sugerencias, setSugerencias] = useState([])
  const [loading, setLoading] = useState(true)
  const { agregarItem } = useCarrito()

  useEffect(() => {
    if (!productoActual) return
    cargarSugerencias()
  }, [productoActual])

  const cargarSugerencias = async () => {
    try {
      const data = await obtenerSugerencias(productoActual.id)
      setSugerencias(data || [])
    } catch (err) {
      setSugerencias([])
    } finally {
      setLoading(false)
    }
  }

  const handleAgregar = (producto) => {
    agregarItem(producto, [], 1)
    if (onAgregar) onAgregar(producto)
  }

  if (loading) {
    return (
      <div className="text-center py-3">
        <div className="spinner-border spinner-border-sm" style={{ color: '#1a3c34' }}></div>
      </div>
    )
  }

  if (sugerencias.length === 0) {
    return (
      <div className="text-center py-3 text-muted">
        <i className="fa-solid fa-utensils me-1"></i>
        No hay sugerencias disponibles
      </div>
    )
  }

  return (
    <div className="mt-4">
      <h5 className="mb-3" style={{ color: '#1a3c34' }}>
        <i className="fa-solid fa-lightbulb me-2"></i>También te puede gustar
      </h5>
      <div className="row g-2">
        {sugerencias.map(producto => (
          <div key={producto.id} className="col-6 col-md-4">
            <div className="card h-100" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
              {producto.imagen ? (
                <img src={producto.imagen} className="card-img-top" alt={producto.nombre}
                  style={{ height: '100px', objectFit: 'cover' }} />
              ) : (
                <div className="card-img-top d-flex align-items-center justify-content-center bg-light"
                  style={{ height: '100px' }}>
                  <i className="fa-solid fa-utensils text-muted"></i>
                </div>
              )}
              <div className="card-body p-2">
                <h6 className="card-title small mb-1">{producto.nombre}</h6>
                <p className="card-text small text-muted mb-1">
                  ${parseFloat(producto.precio).toLocaleString('es-CO')}
                </p>
                {!producto.disponible && (
                  <span className="badge bg-danger" style={{ fontSize: '0.65rem' }}>No disponible</span>
                )}
                <button
                  type="button"
                  className="btn btn-sm w-100 mt-2"
                  style={{ backgroundColor: '#1a3c34', color: 'white' }}
                  onClick={() => handleAgregar(producto)}
                  disabled={!producto.disponible}
                >
                  <FiPlus style={{ marginRight: '4px' }} /> Agregar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Sugerencias
