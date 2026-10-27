import { useNavigate } from 'react-router-dom'
import { FiTrash2, FiArrowLeft, FiShoppingCart, FiMinus, FiPlus } from 'react-icons/fi'
import { useCarrito } from '../context/CarritoContext.jsx'
import CuponDescuento from '../components/CuponDescuento.jsx'
import SelectorPropina from '../components/SelectorPropina.jsx'
import Sugerencias from '../components/Sugerencias.jsx'
import { obtenerContextoMenu } from '../utils/contextoMenu.js'
import { colores, sombras, radios, tarjeta, btnPrimario, btnGhost, cifrasTabulares } from '../styles/tokens.js'

function formatoPrecio(valor) {
  const numero = Number.isFinite(Number(valor)) ? Number(valor) : 0
  return `$${new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numero)}`
}

/**
 * Carrito de compras.
 *
 * Heurísticas de Nielsen:
 *   · Visibilidad del estado: total items, subtotal y total siempre visibles.
 *   · Control y libertad: volver al menú, quitar items, ajustar cantidades, vaciar carrito.
 *   · Consistencia: mismos cards y colores del menú (DESIGN.md).
 *   · Prevención de errores: confirmar antes de vaciar.
 *
 * El backend sigue siendo la autoridad: las cantidades y precios aquí
 * solo preparan la orden; al confirmar el pedido el servidor revalida
 * disponibilidad y precios.
 */
function Carrito() {
  const navigate = useNavigate()
  const {
    items, quitarItem, actualizarCantidad, vaciarCarrito,
    subtotal, descuento, impuestos, propina, total, cupon, sucursal, totalItems
  } = useCarrito()

  if (items.length === 0) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: colores.fondo, padding: '24px 16px'
      }}>
        <div className="container" style={{ maxWidth: '760px' }}>
          {/* Estado vacío (referencia Stitch: carrito vacío) */}
          <div style={{
            ...tarjeta,
            padding: '48px 24px',
            textAlign: 'center',
            background: `linear-gradient(180deg, ${colores.mint}33 0%, ${colores.tarjeta} 55%)`
          }}>
            <div style={{
              width: '64px', height: '64px', margin: '0 auto 16px auto',
              borderRadius: '50%', backgroundColor: colores.mint,
              color: colores.primario,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: sombras.nivel1
            }}>
              <FiShoppingCart size={26} />
            </div>
            <h4 style={{ fontWeight: 700, color: colores.texto, marginBottom: '8px' }}>
              Tu carrito está vacío
            </h4>
            <p style={{ color: colores.textoSuave, maxWidth: '420px', margin: '0 auto 20px auto' }}>
              Aún no has agregado platos a tu orden. Explora el menú
              {sucursal?.nombre ? <> de <strong>{sucursal.nombre}</strong></> : null}{' '}
              y descubre lo preparado al momento.
            </p>
            <button
              className="btn"
              style={{ ...btnPrimario, minHeight: '48px', padding: '0 22px' }}
              onClick={() => navigate(obtenerContextoMenu() || '/menu')}
            >
              <FiArrowLeft style={{ marginRight: '6px' }} /> Volver al menú
            </button>
            <div style={{ marginTop: '14px' }}>
              <small style={{ color: colores.textoSuave }}>
                <FiShoppingCart style={{ marginRight: '4px' }} />
                Puedes agregar productos con un clic desde la carta.
              </small>
            </div>
          </div>

          {/* Cupón y propina visibles incluso con carrito vacío */}
          <div className="row mt-3">
            <div className="col-lg-8">
              <CuponDescuento />
              <SelectorPropina />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colores.fondo, padding: '24px 16px' }}>
      <div className="container" style={{ maxWidth: '1200px' }}>
        {/* Encabezado */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '12px', marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>
              Tu Carrito
              <span style={{
                ...btnPrimario,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radios.full,
                minHeight: '30px',
                fontSize: '13px',
                padding: '0 12px',
                marginLeft: '10px',
                verticalAlign: 'middle'
              }}>
                {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
              </span>
            </h2>
            <small style={{ color: colores.textoSuave }}>
              Revisa las cantidades antes de confirmar tu pedido
            </small>
          </div>
          <button
            className="btn d-flex align-items-center"
            style={{ ...btnGhost, minHeight: '44px' }}
            onClick={() => navigate(obtenerContextoMenu() || '/menu')}
          >
            <FiArrowLeft style={{ marginRight: '5px' }} /> Seguir comprando
          </button>
        </div>

        <div className="row g-3">
          {/* Columna izquierda: items */}
          <div className="col-lg-7">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {items.map(item => {
                const totalLinea = (Number(item.precioUnitario) + Number(item.adicionalOpciones)) * Number(item.cantidad)
                return (
                  <div key={item.key} style={{ ...tarjeta, padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      {item.producto.imagen ? (
                        <img
                          src={item.producto.imagen}
                          alt={item.producto.nombre}
                          style={{
                            width: '64px', height: '64px', objectFit: 'cover',
                            borderRadius: radios.md, border: `1px solid ${colores.borde}`, flexShrink: 0
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '64px', height: '64px', backgroundColor: colores.superficie,
                          borderRadius: radios.md, border: `1px solid ${colores.borde}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <i className="fa-solid fa-utensils" style={{ color: colores.textoSuaveClaro }}></i>
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600, color: colores.texto,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {item.producto.nombre}
                        </div>
                        {item.opciones.length > 0 && (
                          <small style={{ color: colores.textoSuave, display: 'block' }}>
                            {item.opciones.map(o => o.nombre).join(', ')}
                          </small>
                        )}
                        <small className="tnum" style={{ color: colores.textoSuave, ...cifrasTabulares }}>
                          {item.precioUnitario > 0 ? `${formatoPrecio(item.precioUnitario)} c/u` : ''}
                          {item.adicionalOpciones > 0
                            ? `${item.precioUnitario > 0 ? ' + ' : ''}${formatoPrecio(item.adicionalOpciones)} opciones`
                            : ''}
                        </small>

                        {/* Stepper de cantidad + quitar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center',
                            border: `1px solid ${colores.borde}`, borderRadius: radios.full,
                            backgroundColor: colores.tarjeta, overflow: 'hidden'
                          }}>
                            <button
                              type="button"
                              aria-label="Disminuir cantidad"
                              disabled={item.cantidad <= 1}
                              onClick={() => actualizarCantidad(item.key, item.cantidad - 1)}
                              style={{
                                width: '36px', height: '36px', border: 'none',
                                backgroundColor: 'transparent', color: item.cantidad <= 1 ? colores.textoSuaveClaro : colores.texto,
                                cursor: item.cantidad <= 1 ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              <FiMinus size={14} />
                            </button>
                            <span className="tnum" style={{
                              minWidth: '28px', textAlign: 'center', fontWeight: 700,
                              fontSize: '14px', color: colores.texto, ...cifrasTabulares
                            }}>
                              {item.cantidad}
                            </span>
                            <button
                              type="button"
                              aria-label="Aumentar cantidad"
                              onClick={() => actualizarCantidad(item.key, item.cantidad + 1)}
                              style={{
                                width: '36px', height: '36px', border: 'none',
                                backgroundColor: colores.mint, color: colores.primario,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              <FiPlus size={14} />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="btn btn-link p-0"
                            onClick={() => quitarItem(item.key)}
                            style={{ color: colores.error, fontSize: '13px', fontWeight: 600 }}
                          >
                            <FiTrash2 style={{ marginRight: '4px' }} /> Quitar
                          </button>
                        </div>
                      </div>

                      <div className="text-end" style={{ flexShrink: 0 }}>
                        <strong className="tnum" style={{ color: colores.primario, fontSize: '16px', ...cifrasTabulares }}>
                          {formatoPrecio(totalLinea)}
                        </strong>
                        <small style={{ display: 'block', color: colores.textoSuave, fontSize: '11px' }}>
                          subtotal
                        </small>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div>
                <button
                  className="btn btn-md"
                  style={{ ...btnGhost, minHeight: '44px', color: colores.error }}
                  onClick={() => {
                    if (window.confirm('¿Vaciar el carrito? Se eliminarán todos los productos.')) {
                      vaciarCarrito()
                    }
                  }}
                >
                  <FiTrash2 style={{ marginRight: '5px' }} /> Vaciar carrito
                </button>
              </div>

              {/* Sugerencias */}
              {items.length > 0 && (
                <Sugerencias
                  productoActual={items[items.length - 1].producto}
                  excluir={items.map(item => item.producto?.id).filter(Boolean)}
                  onAgregar={() => {}}
                />
              )}
            </div>
          </div>

          {/* Columna derecha: resumen */}
          <div className="col-lg-5">
            <div className="sticky-top" style={{ top: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <CuponDescuento />
              <SelectorPropina />

              <div style={{ ...tarjeta, padding: '20px' }}>
                <h6 style={{ fontWeight: 700, color: colores.texto, marginBottom: '14px' }}>Resumen</h6>
                {sucursal?.nombre ? (
                  <small style={{ color: colores.textoSuave, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <i className="fa-solid fa-location-dot"></i>
                    Pedidos para: {sucursal.nombre}
                  </small>
                ) : (
                  <small style={{
                    color: colores.advertenciaTexto, backgroundColor: colores.advertenciaFondo,
                    borderRadius: radios.sm, padding: '8px 10px', display: 'flex',
                    gap: '6px', marginBottom: '12px', fontSize: '12.5px'
                  }}>
                    <i className="fa-solid fa-location-dot" style={{ marginTop: '3px' }}></i>
                    Sin sucursal: se solicitará una antes de confirmar el pedido.
                  </small>
                )}

                <div className="tnum" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', ...cifrasTabulares }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: colores.textoSuave }}>Subtotal</span>
                    <span style={{ color: colores.texto }}>{formatoPrecio(subtotal)}</span>
                  </div>
                  {descuento > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: colores.exitoTexto }}>
                      <span>Descuento {cupon?.codigo ? `(${cupon.codigo})` : ''}</span>
                      <span>-{formatoPrecio(descuento)}</span>
                    </div>
                  )}
                  {impuestos > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: colores.textoSuave }}>Impuestos</span>
                      <span style={{ color: colores.texto }}>{formatoPrecio(impuestos)}</span>
                    </div>
                  )}
                  {propina.valor > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: colores.textoSuave }}>Propina</span>
                      <span style={{ color: colores.texto }}>{formatoPrecio(propina.valor)}</span>
                    </div>
                  )}
                </div>
                <hr style={{ borderColor: colores.borde, opacity: 1 }} />
                <div className="tnum" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...cifrasTabulares }}>
                  <strong style={{ color: colores.texto, fontSize: '15px' }}>Total</strong>
                  <strong style={{ color: colores.primario, fontSize: '22px' }}>
                    {formatoPrecio(total)}
                  </strong>
                </div>
                <button
                  className="btn w-100 mt-3"
                  style={{ ...btnPrimario, minHeight: '50px' }}
                  onClick={() => navigate('/pedido')}
                >
                  Continuar con el pedido ({formatoPrecio(total)})
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
