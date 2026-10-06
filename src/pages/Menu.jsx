import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import api from '../services/api.js'
import BuscadorProductos from '../components/BuscadorProductos.jsx'
import SelectorTipoServicio, { TIPOS_SERVICIO } from '../components/SelectorTipoServicio.jsx'
import { filtrarMenu, contarProductos } from '../utils/buscadorProductos.js'

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
 * Compara el menú recibido con el actual.
 * Si no cambió, devuelve true para NO re-renderizar (evita parpadeos).
 */
const menuSinCambios = (actual, nuevo) => {
  return JSON.stringify(actual ?? null) === JSON.stringify(nuevo ?? null)
}

function Menu() {
  const [searchParams] = useSearchParams()
  const { slug } = useParams()

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

  /**
   * Menú público por slug. NO crea sesión, NO usa sessionStorage.
   */
  const cargarMenuPublico = async () => {
    try {
      const response = await api.get(`/api/menu/${slug}`)
      setCategorias(response.data.menu || [])
      setNombreRestaurante(response.data.restaurante || '')
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
        return
      }

      const token = sessionStorage.getItem(CLAVE_TOKEN)
      if (!token) return

      const response = await api.get(`/api/menu/por-sesion?token=${encodeURIComponent(token)}`)

      const nuevos = response.data.menu || []
      setCategorias(prev => (menuSinCambios(prev, nuevos) ? prev : nuevos))
      setNombreMesa(prev => response.data.mesa || prev)

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

  // FASE 11 — Un ÚNICO intervalo para actualizar el menú.
// Funciona tanto para QR como para el menú público por slug.
  useEffect(() => {
    const intervalo = setInterval(actualizarMenuEnSegundoPlano, INTERVALO_MENU_MS)
    return () => clearInterval(intervalo)
  }, [esMenuPublico, slug])

  // Polling de revalidación de sesión cada 60s; se limpia al desmontar.
// Solo aplica al flujo QR (menú público no tiene sesión).
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
   * El backend es la autoridad: si el código no corresponde a una mesa
   * activa responde 404 y no se muestra el menú.
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

  if (loading) {
    return <div className="text-center mt-5"><div className="spinner-border"></div></div>
  }

  // Popup de sesión expirada
  if (sesionExpirada) {
    return (
      <div className="container mt-5">
        <div className="card text-center" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
          <div className="card-body p-5">
            <i className="fa-solid fa-clock-rotate-left fa-3x text-warning mb-3"></i>
            <h4 className="mb-2">Tu sesión ha expirado</h4>
            <p className="text-muted mb-0">Escanea nuevamente el código QR de tu mesa.</p>
          </div>
        </div>
      </div>
    )
  }

  // QR inválido / error
  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger text-center">
          <i className={`fa-solid ${esMenuPublico ? 'fa-store' : 'fa-qrcode'} me-2`}></i>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          {esMenuPublico
            ? nombreRestaurante || 'Menú'
            : `Menú${nombreMesa ? ` — ${nombreMesa}` : ''}`}
        </h2>
        {!esMenuPublico && <span className="badge bg-success">Sesión activa</span>}
      </div>

      {/* RF003 — Tipo de servicio.
          Solo tiene sentido en el enlace público: el QR ya representa una
          mesa física con su contexto asociado (RF001/RF004/RF022).
          En QR no se muestra, no se llama al backend y no se toca la sesión. */}
      {esMenuPublico && (
        <SelectorTipoServicio
          seleccionado={tipoServicio}
          onConfirmar={confirmarTipoServicio}
          error={errorTipoServicio}
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
        <div className="text-center py-5">
          <i className="fa-solid fa-magnifying-glass fa-2x text-muted mb-3 d-block"></i>
          <p className="mb-1">No se encontraron productos</p>
          <small className="text-muted">
            Pruebe con otro texto o cambie el filtro de categoría.
          </small>
        </div>
      ) : categorias.length === 0 ? (
        <div className="text-center text-muted mt-5">
          <p>No hay productos disponibles en este momento.</p>
        </div>
      ) : (
        menuFiltrado.map(categoria => (
          <div key={categoria.nombre} className="mb-4">
            <h4 className="border-bottom pb-2" style={{ color: '#1a3c34' }}>
              {categoria.nombre}
            </h4>
            <div className="row mt-2">
              {categoria.productos.map(item => (
                <div key={item.id} className="col-md-4 mb-3">
                  <div className="card h-100">
                    {item.imagen ? (
                      <img src={item.imagen} className="card-img-top" alt={item.nombre}
                        style={{ height: '180px', objectFit: 'cover' }} />
                    ) : (
                      <div className="card-img-top d-flex align-items-center justify-content-center bg-light"
                        style={{ height: '180px' }}>
                        <i className="fa-solid fa-utensils text-muted fa-3x"></i>
                      </div>
                    )}
                    <div className="card-body">
                      <h5 className="card-title">{item.nombre}</h5>
                      <p className="card-text text-muted">{item.descripcion || ''}</p>
                      <p className="card-text">
                        <strong>${parseFloat(item.precio).toLocaleString('es-CO')}</strong>
                      </p>
                      {!item.disponible && (
                        <span className="badge bg-danger">No disponible</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {codigoMesa && (
        <div className="mt-4 p-3 bg-light rounded">
          <small className="text-muted">Mesa: {nombreMesa || codigoMesa}</small>
        </div>
      )}
    </div>
  )
}

export default Menu