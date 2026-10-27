import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiHeart, FiTrash2, FiShoppingCart, FiArrowLeft, FiAlertTriangle, FiCoffee, FiPlus, FiCheckCircle
} from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import ModalPersonalizacion from '../components/ModalPersonalizacion.jsx'
import { listarFavoritos, eliminarFavorito } from '../services/favoritos.js'
import { useCarrito } from '../context/CarritoContext.jsx'
import { obtenerContextoMenu } from '../utils/contextoMenu.js'
import { formatearDinero } from '../utils/dinero.js'
import { colores, tarjeta, btnPrimario, btnGhost, estiloBadge, cifrasTabulares } from '../styles/tokens.js'

function Favoritos() {
  const navigate = useNavigate()
  const { agregarItem, totalItems } = useCarrito()
  const [currentUser, setCurrentUser] = useState(null)
  const [favoritos, setFavoritos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [eliminando, setEliminando] = useState(null)
  const [productoParaPersonalizar, setProductoParaPersonalizar] = useState(null)

  useEffect(() => {
    let cancelado = false

    const iniciar = async () => {
      try {
        const response = await api.get('/api/auth/me')
        const usuario = response.data
        if (usuario?.rol !== 'CLIENTE') {
          navigate(
            usuario?.rol === 'MESERO'
              ? '/mesas'
              : usuario?.rol === 'COCINERO'
                ? '/pedidos'
                : '/dashboard'
          )
          return
        }
        if (cancelado) return
        setCurrentUser(usuario)

        try {
          const lista = await listarFavoritos()
          if (!cancelado) setFavoritos(Array.isArray(lista) ? lista : [])
        } catch (err) {
          if (!cancelado) {
            setError(err.response?.data?.error || 'No fue posible cargar tus favoritos.')
          }
        }
      } catch {
        navigate('/login')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    iniciar()
    return () => { cancelado = true }
  }, [navigate])

  const handleLogout = async () => {
    try {
      await api.get('/logout')
    } catch {
      navigate('/login')
      return
    }
    navigate('/login')
  }

  const quitarFavorito = async (producto) => {
    if (eliminando) return
    setEliminando(producto.id)
    setError('')
    try {
      await eliminarFavorito(producto.id)
      setFavoritos(prev => prev.filter(item => item.id !== producto.id))
      setAviso(`${producto.nombre} se quitó de tus favoritos.`)
    } catch (err) {
      setError(err.response?.data?.error || 'No fue posible quitar el producto de tus favoritos.')
    } finally {
      setEliminando(null)
    }
  }

  const irAlMenu = () => {
    const ruta = obtenerContextoMenu()
    if (!ruta || ruta.includes('mesa=null')) {
      setAviso('')
      setError('Escanea el código QR de tu mesa para abrir el menú y guardar productos.')
      return
    }
    navigate(ruta)
  }

  const rutaMenu = obtenerContextoMenu()
  const tieneContextoMesa = Boolean(rutaMenu && !rutaMenu.includes('mesa=null'))

  const agregarAlCarrito = (producto, opciones, cantidad) => {
    agregarItem(producto, opciones, cantidad)
    setAviso(`${producto.nombre} se agregó a tu pedido.`)
    setProductoParaPersonalizar(null)
  }

  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: colores.fondo }}>
        <div className="spinner-border" style={{ color: colores.primario }}></div>
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <div className="nexdine-shell" style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', backgroundColor: colores.fondo }}>
      <Sidebar currentUser={currentUser} rutaActual="/favoritos" onLogout={handleLogout} />

      <div className="nexdine-main" style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '12px', marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>
              Mis favoritos
              <span style={{ ...estiloBadge(colores.mint, colores.secundario), marginLeft: '10px', verticalAlign: 'middle' }}>
                {favoritos.length}
              </span>
            </h2>
            <small style={{ color: colores.textoSuave }}>
              Guardados en tu perfil para pedirlos más rápido.
            </small>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {tieneContextoMesa && (
              <button type="button" className="btn" onClick={irAlMenu} style={{ ...btnGhost, minHeight: '42px' }}>
                <FiArrowLeft style={{ marginRight: '6px' }} /> Ir al menú
              </button>
            )}
            {totalItems > 0 && (
              <button type="button" className="btn" onClick={() => navigate('/carrito')} style={{ ...btnPrimario, minHeight: '42px' }}>
                <FiShoppingCart style={{ marginRight: '6px' }} /> Ver pedido ({totalItems})
              </button>
            )}
          </div>
        </div>

        {aviso && (
          <div role="status" style={{
            ...tarjeta, padding: '12px 16px', marginBottom: '14px',
            backgroundColor: colores.exitoFondo, color: colores.exitoTexto,
            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px'
          }}>
            <FiCheckCircle /> {aviso}
          </div>
        )}

        {error && (
          <div role="alert" style={{
            ...tarjeta, padding: '12px 16px', marginBottom: '14px',
            backgroundColor: colores.errorFondo, color: colores.errorTexto,
            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px'
          }}>
            <FiAlertTriangle /> {error}
          </div>
        )}

        {favoritos.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <FiHeart style={{ fontSize: '2rem', color: colores.textoSuaveClaro }} />
            <div style={{ fontWeight: 700, color: colores.texto, marginTop: '8px' }}>Todavía no tienes favoritos</div>
            <small style={{ display: 'block', marginBottom: '14px' }}>
              Abre el menú desde el código QR de tu mesa y toca el corazón de los productos que quieras guardar.
            </small>
            {tieneContextoMesa ? (
              <button type="button" className="btn" onClick={irAlMenu} style={{ ...btnPrimario, minHeight: '42px' }}>
                Explorar el menú
              </button>
            ) : (
              <small style={{ color: colores.textoSuave, display: 'block' }}>
                Escanea el QR de tu mesa para explorar la carta.
              </small>
            )}
          </div>
        ) : (
          <div className="row g-3">
            {favoritos.map(producto => {
              const noDisponible = producto.disponible === false
              return (
                <div key={producto.id} className="col-12 col-sm-6 col-xl-4">
                  <article style={{ ...tarjeta, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', opacity: noDisponible ? 0.8 : 1 }}>
                    <div style={{ position: 'relative', aspectRatio: '16 / 10', backgroundColor: colores.superficie }}>
                      {producto.imagen ? (
                        <img
                          src={producto.imagen}
                          alt={producto.nombre}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FiCoffee size={26} style={{ color: colores.textoSuaveClaro }} />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => quitarFavorito(producto)}
                        disabled={eliminando === producto.id}
                        aria-label={`Quitar ${producto.nombre} de favoritos`}
                        title="Quitar de favoritos"
                        style={{
                          position: 'absolute', top: '10px', right: '10px',
                          width: '36px', height: '36px', borderRadius: '50%',
                          border: `1px solid ${colores.borde}`, backgroundColor: colores.tarjeta,
                          color: colores.error, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: eliminando === producto.id ? 'wait' : 'pointer'
                        }}
                      >
                        <FiHeart fill={colores.error} size={16} />
                      </button>
                      {noDisponible && (
                        <span style={{ position: 'absolute', top: '10px', left: '10px', ...estiloBadge(colores.errorFondo, colores.errorTexto) }}>
                          No disponible
                        </span>
                      )}
                    </div>

                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <h5 style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: colores.texto }}>
                        {producto.nombre}
                      </h5>
                      <p style={{ margin: '6px 0 10px', fontSize: '12.5px', color: colores.textoSuave, minHeight: '32px' }}>
                        {producto.descripcion || ''}
                      </p>
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <strong className="tnum" style={{ color: colores.primario, fontSize: '17px', ...cifrasTabulares }}>
                          {formatearDinero(producto.precio)}
                        </strong>
                        <button
                          type="button"
                          className="btn"
                          disabled={noDisponible || !tieneContextoMesa}
                          title={tieneContextoMesa ? 'Agregar al pedido' : 'Escanea el QR de tu mesa para pedir'}
                          onClick={() => setProductoParaPersonalizar(producto)}
                          style={{
                            ...btnPrimario, minHeight: '40px', padding: '0 14px', fontSize: '12.5px',
                            display: 'flex', alignItems: 'center', gap: '5px'
                          }}
                        >
                          <FiPlus /> Agregar
                        </button>
                      </div>
                    </div>
                  </article>
                </div>
              )
            })}
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          color: colores.textoSuave, fontSize: '12px', marginTop: '18px'
        }}>
          <FiTrash2 /> Quita un favorito con el corazón de la tarjeta. Para agregar más, escanea el QR de tu mesa.
        </div>
      </div>

      {productoParaPersonalizar && (
        <ModalPersonalizacion
          producto={productoParaPersonalizar}
          onAgregar={agregarAlCarrito}
          onCerrar={() => setProductoParaPersonalizar(null)}
        />
      )}
    </div>
  )
}

export default Favoritos
