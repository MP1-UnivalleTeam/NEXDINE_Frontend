import { useNavigate } from 'react-router-dom'
import { FiTrash2, FiArrowLeft, FiShoppingCart } from 'react-icons/fi'
import { useCarrito } from '../context/CarritoContext.jsx'
import CuponDescuento from '../components/CuponDescuento.jsx'
import SelectorPropina from '../components/SelectorPropina.jsx'
import Sugerencias from '../components/Sugerencias.jsx'

/**
 * Carrito de compras.
 *
 * Heurísticas de Nielsen:
 *   · Visibilidad del estado: total items, subtotal y total siempre visibles.
 *   · Control y libertad: volver al menú, quitar items, vaciar carrito.
 *   · Consistencia: mismos cards y colores del menú.
 *   · Prevención de errores: confirmar antes de vaciar.
 */
function Carrito() {
  const navigate = useNavigate()
  const {
    items, quitarItem, vaciarCarrito,
    subtotal, propina, totalItems
  } = useCarrito()

  const total = subtotal + propina.valor

  if (items.length === 0) {
    return (
      <div className="container mt-5">
        <div className="text-center py-5">
          <FiShoppingCart style={{ fontSize: '3rem', color: '#ccc' }} />
          <h4 className="mt-3">Tu carrito está vacío</h4>
          <p className="text-muted">Agrega productos del menú para continuar</p>
          <button
            className="btn"
            style={{ backgroundColor: '#1a3c34', color: 'white' }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft style={{ marginRight: '5px' }} /> Volver al menú
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <FiShoppingCart style={{ marginRight: '8px' }} />
          Tu Carrito ({totalItems} {totalItems === 1 ? 'producto' : 'productos'})
        </h2>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft style={{ marginRight: '5px' }} /> Seguir comprando
        </button>
      </div>

      <div className="row">
        <div className="col-lg-8">
          {/* Items del carrito */}
          {items.map(item => (
            <div
              key={item.key}
              className="card mb-2"
              style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}
            >
              <div className="card-body d-flex align-items-center gap-3">
                {item.producto.imagen ? (
                  <img
                    src={item.producto.imagen}
                    alt={item.producto.nombre}
                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '60px', height: '60px', backgroundColor: '#f0f0f0',
                      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <i className="fa-solid fa-utensils text-muted"></i>
                  </div>
                )}
                <div className="flex-grow-1">
                  <h6 className="mb-1">{item.producto.nombre}</h6>
                  {item.opciones.length > 0 && (
                    <small className="text-muted d-block">
                      {item.opciones.map(o => o.nombre).join(', ')}
                    </small>
                  )}
                  <small className="text-muted">Cantidad: {item.cantidad}</small>
                </div>
                <div className="text-end">
                  <strong style={{ color: '#1a3c34' }}>
                    ${((item.precioUnitario + item.adicionalOpciones) * item.cantidad).toLocaleString('es-CO')}
                  </strong>
                  <br />
                  <button
                    className="btn btn-sm btn-link text-danger p-0"
                    onClick={() => quitarItem(item.key)}
                  >
                    <FiTrash2 style={{ marginRight: '4px' }} /> Quitar
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            className="btn btn-sm btn-outline-danger mt-2"
            onClick={() => {
              if (window.confirm('¿Vaciar el carrito? Se eliminarán todos los productos.')) {
                vaciarCarrito()
              }
            }}
          >
            <FiTrash2 style={{ marginRight: '5px' }} /> Vaciar carrito
          </button>

          {/* Sugerencias */}
          {items.length > 0 && (
            <Sugerencias
              productoActual={items[items.length - 1].producto}
              onAgregar={() => {}}
            />
          )}
        </div>

        <div className="col-lg-4">
          {/* Resumen */}
          <div className="sticky-top" style={{ top: '20px' }}>
            <CuponDescuento />
            <SelectorPropina />

            <div className="card" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
              <div className="card-body">
                <h6 className="mb-3">Resumen</h6>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Subtotal</span>
                  <span>${subtotal.toLocaleString('es-CO')}</span>
                </div>
                {cupon && (
                  <div className="d-flex justify-content-between mb-2 text-success">
                    <span>Descuento ({cupon.codigo})</span>
                    <span>-${cupon.descuento?.toLocaleString('es-CO') || '0'}</span>
                  </div>
                )}
                {propina.valor > 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Propina</span>
                    <span>${propina.valor.toLocaleString('es-CO')}</span>
                  </div>
                )}
                <hr />
                <div className="d-flex justify-content-between">
                  <strong>Total</strong>
                  <strong style={{ color: '#1a3c34', fontSize: '1.1rem' }}>
                    ${total.toLocaleString('es-CO')}
                  </strong>
                </div>
                <button
                  className="btn w-100 mt-3"
                  style={{ backgroundColor: '#1a3c34', color: 'white' }}
                  onClick={() => navigate('/pedido')}
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Carrito
