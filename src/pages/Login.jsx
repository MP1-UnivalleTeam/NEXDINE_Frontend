import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { colores, sombras, radios, btnPrimario } from '../styles/tokens.js'

function Login() {
  const [nombre, setNombre] = useState('')
  const [contraseña, setContraseña] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const rutaInicio = (rol) => {
    if (rol === 'CLIENTE') return '/favoritos'
    if (rol === 'MESERO') return '/mesas'
    if (rol === 'COCINERO') return '/pedidos'
    return '/dashboard'
  }

  useEffect(() => {
    // Verificar si ya hay sesión activa
    api.get('/api/auth/check')
      .then((response) => navigate(rutaInicio(response.data?.rol)))
      .catch(() => {})
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const params = new URLSearchParams()
    params.append('nombre', nombre)
    params.append('contraseña', contraseña)

    try {
      const response = await api.post('/login', params)
      navigate(rutaInicio(response.data?.rol))
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setError('Credenciales incorrectas')
        } else if (err.response.status === 403) {
          setError('Usuario suspendido')
        } else {
          setError('Error de conexión')
        }
      } else {
        setError('Error de conexión')
      }
    }
  }

  return (
    <div style={{
      backgroundColor: colores.fondo,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2rem',
        borderRadius: `${radios.xl}px`,
        boxShadow: sombras.nivel3,
        background: colores.tarjeta
      }}>
        <div className="text-center mb-4">
          <i className="fa-solid fa-utensils fa-2x" style={{ color: colores.primario }}></i>
          <h3 className="mt-2" style={{
            color: colores.primario,
            fontWeight: 'bold',
            letterSpacing: '2px'
          }}>NEXDINE</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Usuario</label>
            <input
              type="text"
              name="nombre"
              className="form-control"
              placeholder="Ej: jesus"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Contraseña</label>
            <input
              type="password"
              name="contraseña"
              className="form-control"
              placeholder="Contraseña"
              required
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
            />
          </div>

          {/* Error de credenciales incorrectas */}
          {error && error !== 'Usuario suspendido' && (
            <div className="alert alert-danger small mb-3">
              <i className="fa-solid fa-circle-exclamation me-1"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Error de usuario suspendido */}
          {error === 'Usuario suspendido' && (
            <div className="alert small mb-3 d-flex align-items-center gap-2" style={{
              backgroundColor: colores.advertenciaFondo,
              border: `1px solid ${colores.advertencia}`,
              color: colores.advertenciaTexto,
              borderRadius: `${radios.sm}px`
            }}>
              <i className="fa-solid fa-ban fa-lg text-warning"></i>
              <div>
                <strong>Usuario suspendido</strong><br />
                Tu cuenta ha sido desactivada. Contacta al administrador.
              </div>
            </div>
          )}

          <button type="submit" className="btn w-100" style={{
            ...btnPrimario,
            border: 'none'
          }}>
            <i className="fa-solid fa-right-to-bracket me-2"></i>Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
