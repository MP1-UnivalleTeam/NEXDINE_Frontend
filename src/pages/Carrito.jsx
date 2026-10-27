import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiTrash2, FiArrowLeft, FiShoppingCart, FiMinus, FiPlus, FiCoffee,
  FiMapPin, FiChevronRight, FiCheckCircle, FiAlertCircle
} from 'react-icons/fi'
import api from '../services/api.js'
import { useCarrito } from '../context/CarritoContext.jsx'
import CuponDescuento from '../components/CuponDescuento.jsx'
import SelectorPropina from '../components/SelectorPropina.jsx'
import Sugerencias from '../components/Sugerencias.jsx'
import ModalPersonalizacion from '../components/ModalPersonalizacion.jsx'
import SelectorSucursal from '../components/SelectorSucursal.jsx'
import { obtenerSugerencias } from '../services/pedidos.js'
import { obtenerContextoMenu, obtenerSucursalesDisponibles } from '../utils/contextoMenu.js'
import { colores, sombras, radios, tarjeta, btnPrimario, btnGhost, cifrasTabulares } from '../styles/tokens.js'

const CLAVE_TOKEN = 'sessionToken'

function formatoPrecio(valor) {
  const numero = Number.isFinite(Number(valor)) ? Number(valor) : 0
  return `$${new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numero)}`
}

function EncabezadoCarrito({ sucursal, totalItems, irAlMenu }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 1000, backgroundColor: colores.tarjeta,
      borderBottom: `1px solid ${colores.borde}`, boxShadow: sombras.nivel1
    }}>
      <div className="container d-flex align-items-center justify-content-between gap-3" style={{ maxWidth: '1200px', minHeight: '68px' }}>
        <div className="d-flex align-items-center gap-3">
          <button type="button" onClick={irAlMenu} aria-label="Ir al menú" style={{
            display: 'flex', alignItems: 'center', gap: '9px', border: 0,
            background: 'transparent', padding: 0, textAlign: 'left'
          }}>
            <span style={{
              width: '38px', height: '38px', borderRadius: radios.md,
              backgroundColor: colores.primario, color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FiCoffee size={20} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <strong style={{ color: colores.primario, fontSize: '14px' }}>NEXDINE</strong>
              <small style={{ color: colores.secundario, fontSize: '9px', letterSpacing: '0.12em' }}>GOURMET POS</small>
            </span>
          </button>
          <span className="d-none d-md-block" style={{ height: '28px', borderLeft: `1px solid ${colores.borde}` }} />
          <div className="d-none d-md-flex align-items-center gap-2" style={{
            backgroundColor: colores.superficie, borderRadius: radios.sm, padding: '7px 10px'
          }}>
            <FiMapPin size={16} color={colores.secundario} />
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <small style={{ color: colores.textoSuave, fontSize: '10px' }}>Ubicación</small>
              <strong style={{ color: colores.texto, fontSize: '11px' }}>
                {sucursal?.nombre || 'Selecciona una sucursal'}
              </strong>
            </span>
          </div>
        </div>

        <nav className="d-flex align-items-center gap-3">
          <button type="button" onClick={irAlMenu} className="btn btn-link d-none d-sm-inline-flex align-items-center"
            style={{ color: colores.texto, textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            Menú Digital
          </button>
          <span aria-current="page" className="d-none d-md-inline" style={{
            color: colores.primario, fontSize: '13px', fontWeight: 700,
            borderBottom: `2px solid ${colores.primario}`, padding: '24px 0'
          }}>
            Bolsa de Pedido
          </span>
          <span aria-label={`${totalItems} productos en el carrito`} style={{
            position: 'relative', display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', width: '38px', height: '38px',
            color: colores.primario, backgroundColor: colores.superficie,
            borderRadius: radios.md
          }}>
            <FiShoppingCart size={19} />
            <span style={{
              position: 'absolute', top: '-4px', right: '-5px', minWidth: '18px',
              height: '18px', padding: '0 4px', borderRadius: radios.full,
              backgroundColor: colores.primario, color: '#fff', fontSize: '10px',
              fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>{totalItems}</span>
          </span>
        </nav>
      </div>
    </header>
  )
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
    subtotal, descuento, impuestos, propina, total, cupon, sucursal, totalItems,
    agregarItem, setSucursal
  } = useCarrito()
  const [recomendaciones, setRecomendaciones] = useState([])
  const [cargandoRecomendaciones, setCargandoRecomendaciones] = useState(false)
  const [errorRecomendaciones, setErrorRecomendaciones] = useState('')
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState(obtenerSucursalesDisponibles)
  const [requiereSucursal, setRequiereSucursal] = useState(false)
  const [productoParaPersonalizar, setProductoParaPersonalizar] = useState(null)
  const [avisoProductoAgregado, setAvisoProductoAgregado] = useState('')
  const [intentoRecomendaciones, setIntentoRecomendaciones] = useState(0)

  useEffect(() => {
    if (items.length > 0) return undefined

    let cancelado = false
    const cargarRecomendaciones = async () => {
      setCargandoRecomendaciones(true)
      setErrorRecomendaciones('')
      setRequiereSucursal(false)

      try {
        const contexto = obtenerContextoMenu()
        let respuestaMenu
        let esMenuPublico = false

        if (contexto?.startsWith('/menu?')) {
          const token = sessionStorage.getItem(CLAVE_TOKEN)
          if (!token) {
            setRecomendaciones([])
            return
          }
          respuestaMenu = await api.get('/api/menu/por-sesion', { params: { token } })
        } else {
          const slug = contexto?.match(/^\/menu\/([^/?#]+)/)?.[1]
          if (!slug) {
            setRecomendaciones([])
            return
          }
          esMenuPublico = true
          respuestaMenu = await api.get(`/api/menu/${encodeURIComponent(decodeURIComponent(slug))}`)
        }

        if (cancelado) return

        const sucursales = Array.isArray(respuestaMenu.data?.sucursales)
          ? respuestaMenu.data.sucursales
          : obtenerSucursalesDisponibles()
        setSucursalesDisponibles(sucursales)

        const sucursalId = sucursal?.id || respuestaMenu.data?.sucursalId
        if (!sucursal?.id && respuestaMenu.data?.sucursalId) {
          setSucursal({
            id: respuestaMenu.data.sucursalId,
            nombre: respuestaMenu.data.sucursalNombre || ''
          })
        }

        if (esMenuPublico && sucursales.length > 1 && !sucursalId) {
          setRecomendaciones([])
          setRequiereSucursal(true)
          return
        }

        const productosMenu = (Array.isArray(respuestaMenu.data?.menu) ? respuestaMenu.data.menu : [])
          .flatMap(categoria => (
            Array.isArray(categoria.productos)
              ? categoria.productos.map(producto => ({
                ...producto,
                categoria: producto.categoria || categoria.nombre
              }))
              : []
          ))
          .filter(producto => producto?.id && producto.disponible !== false)

        if (productosMenu.length === 0) {
          setRecomendaciones([])
          return
        }

        const productoSemilla = productosMenu[0]
        const sugerencias = await obtenerSugerencias(productoSemilla.id, {
          sucursalId,
          excluir: [productoSemilla.id]
        })

        if (cancelado) return

        const categoriaPorProducto = new Map(
          productosMenu.map(producto => [String(producto.id), producto.categoria])
        )
        setRecomendaciones(
          (Array.isArray(sugerencias) ? sugerencias : [])
            .filter(producto => producto?.id && producto.disponible !== false)
            .map(producto => ({
              ...producto,
              categoria: categoriaPorProducto.get(String(producto.id)) || ''
            }))
            .slice(0, 4)
        )
      } catch (error) {
        if (!cancelado) {
          setErrorRecomendaciones('No se pudieron cargar recomendaciones del menú. Intenta nuevamente.')
          setRecomendaciones([])
        }
      } finally {
        if (!cancelado) setCargandoRecomendaciones(false)
      }
    }

    cargarRecomendaciones()
    return () => { cancelado = true }
  }, [items.length, sucursal?.id, setSucursal, intentoRecomendaciones])

  const irAlMenu = () => navigate(obtenerContextoMenu() || '/menu')

  const agregarRecomendacion = (producto, opciones = [], cantidad = 1) => {
    agregarItem(producto, opciones, cantidad)
    setAvisoProductoAgregado(`${producto.nombre} se agregó a tu pedido.`)
    setProductoParaPersonalizar(null)
  }

  const abrirRecomendacion = (producto) => {
    if (!producto?.id || producto.disponible === false) return
    if (producto.tieneOpciones) {
      setProductoParaPersonalizar(producto)
    } else {
      agregarRecomendacion(producto)
    }
  }

  const modalPersonalizacion = productoParaPersonalizar && (
    <ModalPersonalizacion
      producto={productoParaPersonalizar}
      onAgregar={agregarRecomendacion}
      onCerrar={() => setProductoParaPersonalizar(null)}
    />
  )

  if (items.length === 0) {
    return (
      <>
        <EncabezadoCarrito sucursal={sucursal} totalItems={totalItems} irAlMenu={irAlMenu} />
        <main style={{ minHeight: 'calc(100vh - 68px)', backgroundColor: colores.fondo, padding: '20px 16px 36px' }}>
          <div className="container" style={{ maxWidth: '1200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colores.textoSuave, fontSize: '12px', marginBottom: '18px' }}>
              <button type="button" className="btn btn-link p-0" onClick={irAlMenu} style={{ color: colores.secundario, textDecoration: 'none', fontSize: '12px' }}>
                <FiArrowLeft style={{ marginRight: '5px' }} /> Volver a Categorías
              </button>
              <FiChevronRight size={13} />
              <span>Bolsa de Pedido</span>
              {sucursal?.nombre && (
                <span className="ms-auto d-none d-sm-inline-flex align-items-center gap-2" style={{
                backgroundColor: colores.superficie, borderRadius: radios.full, padding: '6px 11px',
                fontSize: '10px', fontWeight: 700, color: colores.textoSuave
              }}>
                  PEDIDO PARA · {sucursal.nombre}
                </span>
              )}
            </div>

            <section style={{
              ...tarjeta, minHeight: '200px', padding: '30px 20px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              background: `linear-gradient(135deg, ${colores.mint}66, ${colores.tarjeta} 58%)`
            }}>
              <div style={{
                width: '54px', height: '54px', margin: '0 auto 12px', borderRadius: '50%',
                backgroundColor: colores.mint, color: colores.primario,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FiShoppingCart size={23} />
              </div>
              <h1 style={{ fontWeight: 700, color: colores.primario, fontSize: '20px', marginBottom: '6px' }}>
                Tu carrito está vacío
              </h1>
              <p style={{ color: colores.textoSuave, maxWidth: '480px', margin: '0 auto 14px', fontSize: '13px' }}>
                Aún no has agregado platos a tu orden. Explora el menú
                {sucursal?.nombre ? <> en <strong>{sucursal.nombre}</strong></> : null} y encuentra algo que te guste.
              </p>
              <div>
                <button type="button" className="btn" style={{ ...btnPrimario, minHeight: '42px', padding: '0 18px' }} onClick={irAlMenu}>
                  <FiArrowLeft style={{ marginRight: '6px' }} /> Explorar el menú
                </button>
              </div>
              <small style={{ color: colores.textoSuave, fontSize: '11px', marginTop: '10px' }}>
                <FiCheckCircle style={{ marginRight: '5px' }} /> Los precios y la disponibilidad se confirman al pedir.
              </small>
            </section>

            <section style={{ marginTop: '20px' }}>
              <div className="d-flex align-items-end justify-content-between gap-3 mb-3">
                <div>
                  <small style={{ color: colores.secundario, fontWeight: 700, letterSpacing: '0.06em', fontSize: '10px' }}>
                    <FiCoffee style={{ marginRight: '5px' }} /> DESCUBRE EL MENÚ
                  </small>
                  <h2 style={{ color: colores.primario, fontSize: '19px', fontWeight: 700, margin: '3px 0 0' }}>
                    Recomendados para ti
                  </h2>
                </div>
                <button type="button" className="btn btn-link p-0 d-none d-sm-inline-flex align-items-center gap-1"
                  onClick={irAlMenu} style={{ color: colores.secundario, fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
                  Ver menú completo <FiChevronRight />
                </button>
              </div>

              {requiereSucursal && (
                <div style={{ ...tarjeta, padding: '18px', maxWidth: '520px' }}>
                  <p style={{ color: colores.texto, fontWeight: 600, marginBottom: '10px' }}>
                    Selecciona una sucursal para mostrar solo productos disponibles allí.
                  </p>
                  <SelectorSucursal
                    sucursales={sucursalesDisponibles}
                    seleccionada={sucursal}
                    onSeleccionar={setSucursal}
                  />
                </div>
              )}

              {cargandoRecomendaciones && (
                <div role="status" className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3">
                  {[0, 1, 2, 3].map(indice => (
                    <div className="col" key={indice}>
                      <div style={{ ...tarjeta, height: '220px', backgroundColor: colores.superficie }} />
                    </div>
                  ))}
                </div>
              )}

              {errorRecomendaciones && (
                <div role="alert" style={{
                  ...tarjeta, padding: '16px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: '12px', color: colores.errorTexto
                }}>
                  <span><FiAlertCircle style={{ marginRight: '8px' }} />{errorRecomendaciones}</span>
                  <button type="button" className="btn" style={{ ...btnGhost, minHeight: '38px' }}
                    onClick={() => setIntentoRecomendaciones(intento => intento + 1)}>
                    Reintentar
                  </button>
                </div>
              )}

              {!cargandoRecomendaciones && !errorRecomendaciones && !requiereSucursal && recomendaciones.length > 0 && (
                <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3">
                  {recomendaciones.map(producto => (
                    <div className="col" key={producto.id}>
                      <article style={{ ...tarjeta, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {producto.imagen ? (
                          <img src={producto.imagen} alt={producto.nombre} style={{ width: '100%', height: '132px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ height: '132px', backgroundColor: colores.superficie, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colores.textoSuaveClaro }}>
                            <FiCoffee size={26} />
                          </div>
                        )}
                        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <small style={{ color: colores.secundario, fontWeight: 700, textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.04em' }}>
                            {producto.categoria || 'Recomendado'}
                          </small>
                          <h3 style={{ color: colores.texto, fontSize: '14px', fontWeight: 700, margin: '4px 0' }}>
                            {producto.nombre}
                          </h3>
                          <p style={{
                            color: colores.textoSuave, fontSize: '11px', margin: '0 0 12px',
                            display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden'
                          }}>
                            {producto.descripcion?.trim() || 'Preparado para disfrutar.'}
                          </p>
                          <div className="mt-auto d-flex align-items-center justify-content-between gap-2">
                            <strong style={{ color: colores.primario, fontSize: '14px', whiteSpace: 'nowrap' }}>
                              {formatoPrecio(producto.precio)}
                            </strong>
                            <button type="button" className="btn" aria-label={`Agregar ${producto.nombre}`}
                              style={{ ...btnPrimario, minHeight: '36px', padding: '0 10px', fontSize: '11px' }}
                              onClick={() => abrirRecomendacion(producto)}>
                              <FiPlus style={{ marginRight: '4px' }} /> Agregar
                            </button>
                          </div>
                        </div>
                      </article>
                    </div>
                  ))}
                </div>
              )}

              {!cargandoRecomendaciones && !errorRecomendaciones && !requiereSucursal && recomendaciones.length === 0 && (
                <div style={{ ...tarjeta, padding: '20px', textAlign: 'center', color: colores.textoSuave, fontSize: '13px' }}>
                  No hay recomendaciones disponibles para esta selección.
                  <button type="button" className="btn btn-link" onClick={irAlMenu} style={{ color: colores.secundario }}>
                    Explorar el menú
                  </button>
                </div>
              )}
            </section>

            {avisoProductoAgregado && (
              <div role="status" style={{ color: colores.exitoTexto, fontSize: '13px', marginTop: '12px' }}>
                <FiCheckCircle style={{ marginRight: '6px' }} />{avisoProductoAgregado}
              </div>
            )}

            <div className="row mt-3">
              <div className="col-md-6"><CuponDescuento /></div>
              <div className="col-md-6"><SelectorPropina /></div>
            </div>
          </div>
        </main>
        {modalPersonalizacion}
      </>
    )
  }

  return (
    <>
      <EncabezadoCarrito sucursal={sucursal} totalItems={totalItems} irAlMenu={irAlMenu} />
      <main style={{ minHeight: 'calc(100vh - 68px)', backgroundColor: colores.fondo, padding: '24px 16px' }}>
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
      </main>
      {modalPersonalizacion}
    </>
  )
}

export default Carrito
