import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { obtenerMensajeError } from '../services/mensajes.js'
import { rutaInicio } from '../config/navegacion.js'
import { colores, sombras, radios, btnPrimario } from '../styles/tokens.js'

function Login() {
  const [nombre, setNombre] = useState('')
  const [contraseña, setContraseña] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [verificandoSesion, setVerificandoSesion] = useState(true)
  const navigate = useNavigate()


  useEffect(() => {
    let cancelado = false
    api.get('/api/auth/check', { timeout: 5000 })
      .then((response) => {
        if (!cancelado) navigate(rutaInicio(response.data?.rol), { replace: true })
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelado) setVerificandoSesion(false)
      })
    return () => { cancelado = true }
  }, [navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (cargando) return

    setError('')
    if (!nombre.trim() || !contraseña) {
      setError('Ingresa tu usuario y contraseña.')
      return
    }

    const params = new URLSearchParams()
    params.append('nombre', nombre.trim())
    params.append('contraseña', contraseña)

    setCargando(true)
    try {
      const response = await api.post('/login', params)
      navigate(rutaInicio(response.data?.rol), { replace: true })
    } catch (err) {
      const estado = err.response?.status
      if (estado === 401) {
        setError('Usuario o contraseña incorrectos.')
      } else if (estado === 403) {
        setError('Usuario suspendido')
      } else {
        setError(obtenerMensajeError(err, 'No fue posible iniciar sesión. Intenta nuevamente.'))
      }
    } finally {
      setCargando(false)
    }
  }

  if (verificandoSesion) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: colores.fondo,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px'
      }}>
        <div className="spinner-border" style={{ color: colores.primario }} role="status"></div>
        <small style={{ color: colores.textoSuave }}>Verificando sesión...</small>
      </div>
    )
  }

  const suspendido = error === 'Usuario suspendido'

  return (
    <div style={{
      backgroundColor: colores.fondo,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px 16px'
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
            <label className="form-label fw-semibold" htmlFor="login-usuario">Usuario</label>
            <input
              id="login-usuario"
              type="text"
              name="nombre"
              className="form-control"
              placeholder="Ej: jesus"
              autoComplete="username"
              required
              value={nombre}
              onChange={(event) => { setNombre(event.target.value); setError('') }}
              disabled={cargando}
            />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="login-contrasena">Contraseña</label>
            <input
              id="login-contrasena"
              type="password"
              name="contraseña"
              className="form-control"
              placeholder="Contraseña"
              autoComplete="current-password"
              required
              value={contraseña}
              onChange={(event) => { setContraseña(event.target.value); setError('') }}
              disabled={cargando}
            />
          </div>

          {error && !suspendido && (
            <div role="alert" className="alert alert-danger small mb-3">
              <i className="fa-solid fa-circle-exclamation me-1"></i>
              <span>{error}</span>
            </div>
          )}

          {suspendido && (
            <div role="alert" className="alert small mb-3 d-flex align-items-center gap-2" style={{
              backgroundColor: colores.advertenciaFondo,
              border: `1px solid ${colores.advertencia}`,
              color: colores.advertenciaTexto,
              borderRadius: `${radios.sm}px`
            }}>
              <i className="fa-solid fa-ban fa-lg text-warning"></i>
              <div>
                <strong>Cuenta suspendida</strong><br />
                Tu cuenta ha sido desactivada. Contacta al administrador.
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn w-100 d-flex align-items-center justify-content-center gap-2"
            style={{ ...btnPrimario, border: 'none' }}
            disabled={cargando}
          >
            {cargando ? (
              <>
                <span className="spinner-border spinner-border-sm"></span>
                Ingresando...
              </>
            ) : (
              <>
                <i className="fa-solid fa-right-to-bracket"></i> Iniciar sesión
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-3">
          <small style={{ color: colores.textoSuave }}>
            ¿Eres cliente y no tienes cuenta?{' '}
            <Link to="/registro" style={{ color: colores.secundario, fontWeight: 600 }}>
              Regístrate
            </Link>
          </small>
        </div>

        <small style={{ display: 'block', color: colores.textoSuave, fontSize: '11.5px', marginTop: '10px', textAlign: 'center' }}>
          El acceso usa el nombre de usuario registrado en el restaurante.
        </small>
      </div>
    </div>
  )
}

export default Login
