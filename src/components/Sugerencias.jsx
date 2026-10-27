import { useState, useEffect } from 'react'
import { FiPlus } from 'react-icons/fi'
import { obtenerSugerencias } from '../services/pedidos.js'
import { useCarrito } from '../context/CarritoContext.jsx'
import ModalPersonalizacion from './ModalPersonalizacion.jsx'
import { formatearDinero } from '../utils/dinero.js'
import { colores, tarjeta, radios, estiloBadge } from '../styles/tokens.js'

/**
 * RF034 — Sugerencias de productos.
 *
 * Heurísticas de Nielsen:
 *   · Visibilidad del estado: loading, error y estado vacío claros.
 *   · Control y libertad: agregar sin perder el carrito.
 *   · Consistencia: mismos cards que el menú principal.
 *   · Reconocimiento: productos con imagen, precio y disponibilidad visibles.
 */
function Sugerencias({ productoActual, onAgregar, excluir = [] }) {
  const [sugerencias, setSugerencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [productoParaPersonalizar, setProductoParaPersonalizar] = useState(null)
  const { agregarItem, sucursal } = useCarrito()
  const claveExcluir = excluir.filter(Boolean).join(',')

  useEffect(() => {
    if (!productoActual?.id) {
      setLoading(false)
      return
    }
    cargarSugerencias()
  }, [productoActual?.id, sucursal?.id, claveExcluir])

  const cargarSugerencias = async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await obtenerSugerencias(productoActual.id, {
        sucursalId: sucursal?.id,
        excluir: excluir.filter(Boolean)
      })
      setSugerencias(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(true)
      setSugerencias([])
    } finally {
      setLoading(false)
    }
  }

  const agregarSugerencia = (producto, opciones = [], cantidad = 1) => {
    if (!producto?.id) return
    agregarItem(producto, opciones, cantidad)
    if (onAgregar) onAgregar(producto)
  }

  const handleAgregar = (producto) => {
    if (!producto?.id) return
    if (producto.tieneOpciones) {
      setProductoParaPersonalizar(producto)
      return
    }
    agregarSugerencia(producto)
  }

  if (loading) {
    return (
      <div className="text-center py-3">
        <div className="spinner-border spinner-border-sm" style={{ color: colores.primario }}></div>
        <small className="text-muted d-block mt-1">Cargando sugerencias...</small>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-3 text-muted">
        <i className="fa-solid fa-triangle-exclamation me-1"></i>
        No se pudieron cargar las sugerencias
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
      <h5 className="mb-3" style={{ color: colores.primario }}>
        <i className="fa-solid fa-lightbulb me-2"></i>También te puede gustar
      </h5>
      <div className="row g-2">
        {sugerencias.map(producto => (
          <div key={producto.id} className="col-6 col-md-4">
            <div className="card h-100" style={{ border: tarjeta.border, borderRadius: radios.lg, backgroundColor: tarjeta.background, boxShadow: tarjeta.boxShadow }}>
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
                  {formatearDinero(producto.precio || 0)}
                </p>
                {!producto.disponible && (
                  <span className="badge" style={{ ...estiloBadge(colores.errorFondo, colores.errorTexto), fontSize: '0.65rem' }}>No disponible</span>
                )}
                <button
                  type="button"
                  className="btn btn-sm w-100 mt-2"
                  style={{ backgroundColor: colores.primario, color: 'white' }}
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
