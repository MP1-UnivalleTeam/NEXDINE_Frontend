import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { FiShoppingCart, FiPlus, FiClock, FiArrowRight, FiAlertTriangle, FiSearch } from 'react-icons/fi'
import api from '../services/api.js'
import BuscadorProductos from '../components/BuscadorProductos.jsx'
import SelectorTipoServicio, { TIPOS_SERVICIO } from '../components/SelectorTipoServicio.jsx'
import SelectorSucursal from '../components/SelectorSucursal.jsx'
import ModalPersonalizacion from '../components/ModalPersonalizacion.jsx'
import Sugerencias from '../components/Sugerencias.jsx'
import { filtrarMenu, contarProductos } from '../utils/buscadorProductos.js'
import {
  guardarContextoMenu,
  guardarSucursalesDisponibles
} from '../utils/contextoMenu.js'
import { useCarrito } from '../context/CarritoContext.jsx'
import { colores, sombras, radios, tarjeta, btnPrimario, estiloBadge, cifrasTabulares } from '../styles/tokens.js'

const CLAVE_TOKEN = 'sessionToken'
const CLAVE_MESA = 'mesaCodigo'
const INTERVALO_VALIDACION_MS = 60000

// RF003 — Estado de interfaz para el menú público (sin sesión de mesa).
// Solo es UI: el valor real vive en la sesión del backend.
const CLAVE_TIPO_UI = 'tipoServicioUI'

// FASE 11 — Actualización automática del menú.
// Un único intervalo para toda la vista (nunca uno por producto).
const INTERVALO_MENU_MS = 45000

/**
 * Formateador de precios del menú.
 * El valor SIEMPRE proviene del backend; aquí solo se presenta.
 */
function formatoPrecio(valor) {
  const numero = Number.isFinite(Number(valor)) ? Number(valor) : 0
  return `$${new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numero)}`
}

function Menu() {
  const [searchParams] = useSearchParams()
  const { slug } = useParams()
  const navigate = useNavigate()

  // Dos flujos coexistentes e independientes:
  //   /menu?mesa=<codigo>  → QR de mesa (con sesión temporal)
  //   /menu/<slug>         → enlace público (sin sesión)
  const esMenuPublico = Boolean(slug)
  const codigoMesa = esMenuPublico ? null : searchParams.get('mesa')

  const [categorias, setCategorias] = useState([])
  const [nombreMesa, setNombreMesa] = useState('')
  const [nombreRestaurante, setNombreRestaurante] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sesionExpirada, setSesionExpirada] = useState(false)

  // RF019 — Criterios de búsqueda
  const [textoBusqueda, setTextoBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState(null)

  // RF003 — Tipo de servicio
  const [tipoServicio, setTipoServicio] = useState(null)
  const [errorTipoServicio, setErrorTipoServicio] = useState('')

  // RF020 — Modal de personalización
  const [productoParaPersonalizar, setProductoParaPersonalizar] = useState(null)

  // RF031 — Sucursales del restaurante (solo menú público con varias sucursales)
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState([])

  // Carrito
  const {
    agregarItem, totalItems, subtotal, setSucursal, setTasaImpuesto, sucursal
  } = useCarrito()

  useEffect(() => {
    if (esMenuPublico) {
      cargarMenuPublico()
      cargarTipoServicio()
      return
    }

    if (!codigoMesa) {
      setError('No se recibió un código de mesa válido')
      setLoading(false)
      return
    }
    cargarMenu()
  }, [codigoMesa, slug])

  // RF031 / RF052 — Contexto de navegación para "Volver al menú"
  useEffect(() => {
    const ruta = esMenuPublico
      ? `/menu/${slug}`
      : `/menu?mesa=${encodeURIComponent(codigoMesa)}`
    guardarContextoMenu(ruta)
  }, [esMenuPublico, slug, codigoMesa])

  /**
   * Menú público por slug. NO crea sesión, NO usa sessionStorage.
   */
  const cargarMenuPublico = async () => {
    try {
      const response = await api.get(`/api/menu/${slug}`)
      setCategorias(response.data.menu || [])
      setNombreRestaurante(response.data.restaurante || '')
      aplicarContextoSucursal(response.data)
      guardarSucursalesDisponibles(response.data.sucursales || [])
      setSucursalesDisponibles(response.data.sucursales || [])
      setError('')
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError('Menú no disponible')
      } else {
        setError('No fue posible cargar el menú. Intente nuevamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * RF019 — Categorías filtradas por el criterio actual.
   * Se deriva de `categorias`, por lo que el polling de Fase 11
   * (productos nuevos, cambios de disponibilidad, nombre o categoría)
   * se refleja automáticamente sin una segunda fuente de datos.
   */
  const menuFiltrado = useMemo(
    () => filtrarMenu(categorias, textoBusqueda, categoriaFiltro),
    [categorias, textoBusqueda, categoriaFiltro]
  )

  const hayFiltroActivo = Boolean(textoBusqueda.trim() || categoriaFiltro)
  const totalVisibles = contarProductos(menuFiltrado)

  const aplicarBusqueda = ({ texto, categoriaId }) => {
    setTextoBusqueda(texto ?? '')
    setCategoriaFiltro(categoriaId ?? null)
  }

  /**
   * RF003 — Confirma el tipo de servicio (solo enlace público).
   *
   * No crea sesión de mesa, no inventa mesa y no toca sessionToken
   * ni mesaCodigo. La selección queda como estado del cliente.
   *
   * Los valores válidos (DOMICILIO / PARA_LLEVAR) se validan en el backend;
   * aquí se comprueba la lista para dar feedback inmediato.
   */
  const confirmarTipoServicio = async (tipo) => {
    setErrorTipoServicio('')

    const permitidos = Object.values(TIPOS_SERVICIO)
    if (!permitidos.includes(tipo)) {
      setErrorTipoServicio('Tipo de servicio inválido.')
      return
    }

    setTipoServicio(tipo)
    sessionStorage.setItem(CLAVE_TIPO_UI, tipo)
  }

  /**
   * Recupera el tipo de servicio seleccionado.
   *
   * Solo aplica al enlace público. En el flujo QR no se invoca ningún
   * endpoint de tipo de servicio: la mesa ya define el contexto.
   */
  const cargarTipoServicio = () => {
    if (!esMenuPublico) return
    setTipoServicio(sessionStorage.getItem(CLAVE_TIPO_UI) || null)
  }

  /**
   * FASE 11 — Consulta el menú sin crear ni renovar sesión.
   *
   * · QR        → GET /api/menu/por-sesion (solo lectura, no renueva)
   * · Público   → GET /api/menu/{slug}
   *
   * Solo actualiza el estado si el contenido cambió (sin parpadeos).
   * Un error de red NO bloquea el menú: se conservan los últimos datos.
   */
  const actualizarMenuEnSegundoPlano = async () => {
    try {
      if (esMenuPublico) {
        const response = await api.get(`/api/menu/${slug}`)
        const nuevos = response.data.menu || []
        setCategorias(prev => (menuSinCambios(prev, nuevos) ? prev : nuevos))
        setNombreRestaurante(prev =>
          response.data.restaurante || prev
        )
        aplicarContextoSucursal(response.data)
        return
      }

      // QR → mantener la sucursal/tasa del contexto de mesa
      const token = sessionStorage.getItem(CLAVE_TOKEN)
      if (!token) return

      const response = await api.get(`/api/menu/por-sesion?token=${encodeURIComponent(token)}`)

      const nuevos = response.data.menu || []
      setCategorias(prev => (menuSinCambios(prev, nuevos) ? prev : nuevos))
      setNombreMesa(prev => response.data.mesa || prev)
      aplicarContextoSucursal(response.data)

      // No se toca sessionToken ni mesaCodigo: la sesión no se renueva
    } catch (err) {
      // Sesión expirada → flujo existente de expiración
      if (err.response && err.response.status === 401) {
        manejarSesionExpirada()
        return
      }

      // 404 (mesa dada de baja) o error de red:
      // se conservan los últimos datos válidos y se reintenta en el
      // siguiente intervalo. No se muestra alerta invasiva.
      if (err.response && err.response.status === 404) {
        setError('La mesa ya no está disponible. Escanea nuevamente el código QR.')
      }
    }
  }

  /**
   * Compara el menú recibido con el actual.
   * Si no cambió, devuelve true para NO re-renderizar (evita parpadeos).
   */
  const menuSinCambios = (actual, nuevo) => {
    return JSON.stringify(actual ?? null) === JSON.stringify(nuevo ?? null)
  }

  /**
   * Revalida la sesión contra el backend (autoridad de vigencia).
   * Si el backend responde 401, la sesión expiró: limpia sessionStorage
   * y muestra el popup. No genera una sesión nueva.
   */
  const validarSesion = async () => {
    const token = sessionStorage.getItem(CLAVE_TOKEN)
    if (!token) return

    try {
      await api.get(`/api/mesa/sesion/estado?token=${encodeURIComponent(token)}`)
      // 200: la sesión sigue vigente, no se requiere ninguna acción
    } catch (err) {
      if (err.response && err.response.status === 401) {
        manejarSesionExpirada()
      }
      // Otros errores (red, 500) se ignoran: no invalidan la sesión
    }
  }

  /**
   * RF031 — Propaga el contexto de sucursal recibido del backend.
   */
  const aplicarContextoSucursal = (datos) => {
    if (!datos) return
    if (datos.sucursalId) {
      setSucursal({
        id: datos.sucursalId,
        nombre: datos.sucursalNombre || '',
        direccion: ''
      })
    }
    if (datos.tasaImpuesto != null) {
      setTasaImpuesto(datos.tasaImpuesto)
    }
  }

  // FASE 11 — Un ÚNICO intervalo para actualizar el menú.
  useEffect(() => {
    const intervalo = setInterval(actualizarMenuEnSegundoPlano, INTERVALO_MENU_MS)
    return () => clearInterval(intervalo)
  }, [esMenuPublico, slug])

  // Polling de revalidación de sesión cada 60s; se limpia al desmontar.
  useEffect(() => {
    if (esMenuPublico) return

    const intervalo = setInterval(validarSesion, INTERVALO_VALIDACION_MS)
    return () => clearInterval(intervalo)
  }, [esMenuPublico])

  // Al volver a la pestaña: revalida sesión y refresca el menú de inmediato.
  useEffect(() => {
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') {
        if (!esMenuPublico) {
          validarSesion()
        }
        actualizarMenuEnSegundoPlano()
      }
    }
    document.addEventListener('visibilitychange', alCambiarVisibilidad)
    return () => document.removeEventListener('visibilitychange', alCambiarVisibilidad)
  }, [esMenuPublico, slug])

  /**
   * Carga el menú validando el QR contra el backend.
   */
  const cargarMenu = async () => {
    try {
      const response = await api.get(`/api/menu?mesa=${encodeURIComponent(codigoMesa)}`)

      if (response.status === 401) {
        manejarSesionExpirada()
        return
      }

      setCategorias(response.data.menu || [])
      setNombreMesa(response.data.mesa || '')
      aplicarContextoSucursal(response.data)

      // Token en sessionStorage: desaparece al cerrar la pestaña
      if (response.data.token) {
        sessionStorage.setItem(CLAVE_TOKEN, response.data.token)
      }
      sessionStorage.setItem(CLAVE_MESA, codigoMesa)
      setError('')
    } catch (err) {
      if (err.response) {
        if (err.response.status === 404) {
          // QR inválido: la mesa no existe o está inactiva
          sessionStorage.removeItem(CLAVE_TOKEN)
          sessionStorage.removeItem(CLAVE_MESA)
          setError('QR inválido. Escanea nuevamente el código QR de tu mesa.')
        } else if (err.response.status === 401) {
          manejarSesionExpirada()
        } else {
          setError('No fue posible cargar el menú. Intente nuevamente.')
        }
      } else {
        setError('No fue posible cargar el menú. Intente nuevamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const manejarSesionExpirada = () => {
    sessionStorage.removeItem(CLAVE_TOKEN)
    sessionStorage.removeItem(CLAVE_MESA)
    setSesionExpirada(true)
    setCategorias([])
    setLoading(false)
  }

  // RF020 — El modal solo se usa si el producto tiene grupos de opciones
  // configurados; si no, el producto se agrega directamente al carrito.
  const manejarClickProducto = (item) => {
    if (!item?.disponible) return
    if (item.tieneOpciones) {
      setProductoParaPersonalizar(item)
      return
    }
    agregarItem(item, [], 1)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: colores.fondo,
        display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}>
        <div className="spinner-border" style={{ color: colores.primario }}></div>
      </div>
    )
  }

  // Popup de sesión expirada
  if (sesionExpirada) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: colores.fondo,
        display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px'
      }}>
        <div style={{
          ...tarjeta, padding: '40px', textAlign: 'center', maxWidth: '420px', width: '100%'
        }}>
          <div style={{
            width: '56px', height: '56px', margin: '0 auto 16px auto',
            borderRadius: '50%', backgroundColor: colores.advertenciaFondo,
            color: colores.advertenciaTexto,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FiClock size={24} />
          </div>
          <h4 style={{ fontWeight: 700, color: colores.texto }}>Tu sesión ha expirado</h4>
          <p style={{ color: colores.textoSuave, marginBottom: 0 }}>
            Escanea nuevamente el código QR de tu mesa.
          </p>
        </div>
      </div>
    )
  }

  // QR inválido / error
  if (error) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: colores.fondo,
        display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px'
      }}>
        <div style={{
          ...tarjeta,
          padding: '28px', textAlign: 'center', maxWidth: '440px', width: '100%',
          borderLeft: `4px solid ${colores.error}`
        }}>
          <div style={{
            width: '52px', height: '52px', margin: '0 auto 14px auto',
            borderRadius: '50%', backgroundColor: colores.errorFondo,
            color: colores.error,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FiAlertTriangle size={22} />
          </div>
          <h5 style={{ fontWeight: 700, color: colores.texto, marginBottom: '8px' }}>
            {error === 'Menú no disponible' ? 'Menú no disponible' : 'No se pudo abrir el menú'}
          </h5>
          <p style={{ color: colores.textoSuave, marginBottom: 0, fontSize: '14px' }}>{error}</p>
        </div>
      </div>
    )
  }

  const tituloMenu = esMenuPublico
    ? (nombreRestaurante || 'Menú')
    : `Menú${nombreMesa ? ` — ${nombreMesa}` : ''}`

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colores.fondo, paddingBottom: '92px' }}>
      <div className="container" style={{ maxWidth: '1200px' }}>
        <div style={{ paddingTop: '24px' }}>
          {/* Encabezado */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '12px', marginBottom: '20px'
          }}>
            <div>
              <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>{tituloMenu}</h2>
              <small style={{ color: colores.textoSuave }}>
                Explora la carta y agrega lo que te antoje
              </small>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {!esMenuPublico && (
                <span style={estiloBadge(colores.exitoFondo, colores.exitoTexto)}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colores.exito }} />
                  Sesión activa
                </span>
              )}
              {totalItems > 0 && (
                <button
                  className="btn d-none d-md-flex"
                  style={{ ...btnPrimario, minHeight: '44px', alignItems: 'center' }}
                  onClick={() => navigate('/carrito')}
                >
                  <FiShoppingCart style={{ marginRight: '6px' }} />
                  Ver pedido ({totalItems})
                </button>
              )}
            </div>
          </div>

          {/* RF003 — Tipo de servicio.
              Solo tiene sentido en el enlace público: el QR ya representa una
              mesa física con su contexto asociado (RF001/RF004/RF022). */}
          {esMenuPublico && (
            <SelectorTipoServicio
              seleccionado={tipoServicio}
              onConfirmar={confirmarTipoServicio}
              error={errorTipoServicio}
            />
          )}

          {/* RF031 — Selección explícita de sucursal en menú público
              solo cuando el restaurante tiene varias activas. */}
          {esMenuPublico && sucursalesDisponibles.length > 1 && (
            <SelectorSucursal
              sucursales={sucursalesDisponibles}
              seleccionada={sucursal}
              onSeleccionar={setSucursal}
            />
          )}

          {/* RF019 — Búsqueda de productos */}
          {categorias.length > 0 && (
            <BuscadorProductos
              categoriasDisponibles={categorias}
              texto={textoBusqueda}
              categoriaId={categoriaFiltro}
              onChange={aplicarBusqueda}
            />
          )}

          {hayFiltroActivo && totalVisibles === 0 ? (
            /* RF019 — Sin coincidencias */
            <div style={{ ...tarjeta, padding: '48px 24px', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '52px', height: '52px', margin: '0 auto 14px auto',
                borderRadius: '50%', backgroundColor: colores.superficie,
                color: colores.textoSuaveClaro,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FiSearch size={22} />
              </div>
              <div style={{ fontWeight: 700, color: colores.texto, marginBottom: '4px' }}>
                No se encontraron productos
              </div>
              <small style={{ color: colores.textoSuave }}>
                Pruebe con otro texto o cambie el filtro de categoría.
              </small>
            </div>
          ) : categorias.length === 0 ? (
            <div style={{ ...tarjeta, padding: '48px 24px', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontWeight: 700, color: colores.texto }}>Menú sin productos por ahora</div>
              <small style={{ color: colores.textoSuave }}>
                Vuelve a entrar en unos minutos; la carta se actualiza automáticamente.
              </small>
            </div>
          ) : (
            menuFiltrado.map(categoria => (
              <div key={categoria.nombre} style={{ marginBottom: '28px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px'
                }}>
                  <h4 style={{ margin: 0, fontWeight: 700, color: colores.texto, fontSize: '18px' }}>
                    {categoria.nombre}
                  </h4>
                  <span style={estiloBadge(colores.superficie, colores.textoSuave)}>
                    {categoria.productos.length} {categoria.productos.length === 1 ? 'producto' : 'productos'}
                  </span>
                </div>
                <div className="row g-3">
                  {categoria.productos.map(item => (
                    <div key={item.id} className="col-12 col-sm-6 col-lg-4">
                      <div
                        style={{
                          ...tarjeta,
                          overflow: 'hidden',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          cursor: item.disponible ? 'pointer' : 'default',
                          opacity: item.disponible ? 1 : 0.85
                        }}
                        role={item.disponible ? 'button' : undefined}
                        tabIndex={item.disponible ? 0 : -1}
                        onClick={() => manejarClickProducto(item)}
                        onKeyDown={(e) => {
                          if (item.disponible && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault()
                            manejarClickProducto(item)
                          }
                        }}
                      >
                        {/* Imagen 16:10 */}
                        <div style={{ position: 'relative', aspectRatio: '16 / 10', overflow: 'hidden', backgroundColor: colores.superficie }}>
                          {item.imagen ? (
                            <img
                              src={item.imagen}
                              alt={item.nombre}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <div style={{
                              width: '100%', height: '100%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <i className="fa-solid fa-utensils" style={{ fontSize: '1.6rem', color: colores.textoSuaveClaro }}></i>
                            </div>
                          )}
                          {!item.disponible && (
                            <span style={{
                              position: 'absolute', top: '10px', right: '10px',
                              ...estiloBadge(colores.errorFondo, colores.errorTexto),
                              boxShadow: sombras.nivel2
                            }}>
                              Agotado
                            </span>
                          )}
                        </div>

                        {/* Cuerpo */}
                        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <h5 style={{
                            margin: 0, fontWeight: 600, fontSize: '15px',
                            color: colores.texto, lineHeight: '1.35'
                          }}>
                            {item.nombre}
                          </h5>
                          <p className="truncar-2" style={{
                            margin: '6px 0 10px 0', fontSize: '12.5px',
                            color: colores.textoSuave, minHeight: '32px'
                          }}>
                            {item.descripcion || ''}
                          </p>

                          <div style={{ marginTop: 'auto' }}>
                            <div className="tnum" style={{
                              fontWeight: 700, color: colores.primario,
                              fontSize: '17px', marginBottom: '10px', ...cifrasTabulares
                            }}>
                              {formatoPrecio(item.precio)}
                            </div>
                            {item.disponible ? (
                              <button
                                type="button"
                                className="btn w-100"
                                onClick={(e) => { e.stopPropagation(); manejarClickProducto(item) }}
                                style={{
                                  ...btnPrimario,
                                  minHeight: '44px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                                aria-label={`Agregar ${item.nombre}`}
                              >
                                <FiPlus />
                                {item.tieneOpciones ? 'Personalizar' : 'Agregar'}
                              </button>
                            ) : (
                              <div style={{
                                minHeight: '44px', borderRadius: radios.sm,
                                backgroundColor: colores.superficie,
                                color: colores.textoSuaveClaro,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 600, fontSize: '13px'
                              }}>
                                No disponible
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {codigoMesa && (
            <div style={{ ...tarjeta, padding: '14px 16px' }}>
              <small style={{ color: colores.textoSuave }}>Mesa: {nombreMesa || codigoMesa}</small>
            </div>
          )}
        </div>
      </div>

      {/* RF020 — Modal de personalización */}
      {productoParaPersonalizar && (
        <ModalPersonalizacion
          producto={productoParaPersonalizar}
          onAgregar={(prod, ops, cant) => {
            agregarItem(prod, ops, cant)
            setProductoParaPersonalizar(null)
          }}
          onCerrar={() => setProductoParaPersonalizar(null)}
        />
      )}

      {/* RF034 — Sugerencias (tanto menú QR como público) */}
      {menuFiltrado.length > 0 && menuFiltrado[0]?.productos?.length > 0 && (
        <Sugerencias
          productoActual={menuFiltrado[0].productos[0]}
          onAgregar={() => {}}
        />
      )}

      {/* Barra inferior de pedido (móvil) — siempre visible con items */}
      {totalItems > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1030,
          backgroundColor: colores.tarjeta,
          borderTop: `1px solid ${colores.borde}`,
          boxShadow: sombras.nivel2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 16px max(12px, env(safe-area-inset-bottom)) 16px'
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: colores.texto, whiteSpace: 'nowrap' }}>
              {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
            </div>
            <div className="tnum" style={{ fontSize: '15px', fontWeight: 700, color: colores.primario, ...cifrasTabulares }}>
              {formatoPrecio(subtotal)}
              <small style={{ color: colores.textoSuave, fontWeight: 500 }}> subtotal</small>
            </div>
          </div>
          <button
            className="btn d-md-none"
            style={{ ...btnPrimario, minHeight: '48px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => navigate('/carrito')}
          >
            Ver pedido <FiArrowRight />
          </button>
          <button
            className="btn d-none d-md-flex"
            style={{ ...btnPrimario, minHeight: '48px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => navigate('/carrito')}
          >
            Ir al carrito <FiArrowRight />
          </button>
        </div>
      )}
    </div>
  )
}

export default Menu
