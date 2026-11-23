import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiCheckCircle, FiUserPlus, FiXCircle } from 'react-icons/fi'
import { registrarCliente } from '../services/clientes.js'
import { obtenerMensajeError } from '../services/mensajes.js'
import { colores, sombras, radios, btnPrimario, btnGhost, input } from '../styles/tokens.js'

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validar(datos) {
  if (!datos.nombre.trim()) return 'El nombre es obligatorio.'
  if (datos.nombre.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.'
  if (!datos.correo.trim()) return 'El correo es obligatorio.'
  if (!CORREO_VALIDO.test(datos.correo.trim())) return 'Ingresa un correo válido.'
  if (!datos.celular.trim()) return 'El celular es obligatorio.'
  if (!datos.direccion.trim()) return 'La dirección es obligatoria.'
  if (datos.contrasena.length < 6) return 'La contraseña debe tener al menos 6 caracteres.'
  if (datos.contrasena !== datos.confirmacion) return 'Las contraseñas no coinciden.'
  return ''
}

function Registro() {
  const navigate = useNavigate()
  const [tipoCuenta, setTipoCuenta] = useState(null)
  const [datos, setDatos] = useState({
    nombre: '',
    correo: '',
    celular: '',
    direccion: '',
    contrasena: '',
    confirmacion: ''
  })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [registrado, setRegistrado] = useState(false)

  const cambiar = (event) => {
    const { name, value } = event.target
    setDatos(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const enviar = async (event) => {
    event.preventDefault()
    if (enviando) return

    const mensajeValidacion = validar(datos)
    if (mensajeValidacion) {
      setError(mensajeValidacion)
      return
    }

    if (tipoCuenta === 'ADMINISTRADOR') {
      // El backend actual no expone un endpoint público de registro para
      // cuentas de dueño/administrador; esa creación se gestiona desde el
      // panel administrativo. No se inventa ninguna operación nueva.
      setError('El registro de cuentas de dueño debe gestionarse desde el panel administrativo del restaurante.')
      return
    }

    setEnviando(true)
    setError('')
    try {
      await registrarCliente({
        nombre: datos.nombre.trim(),
        correo: datos.correo.trim(),
        celular: datos.celular.trim(),
        direccion: datos.direccion.trim(),
        contrasena: datos.contrasena
      })
      setRegistrado(true)
    } catch (err) {
      if ([404, 405, 501].includes(err?.response?.status)) {
        setError('El registro no está disponible en este momento. Comunícate con el restaurante para crear tu cuenta.')
      } else {
        setError(obtenerMensajeError(err, 'No fue posible completar el registro. Intenta nuevamente.'))
      }
    } finally {
      setEnviando(false)
    }
  }

  if (registrado) {
    return (
      <div style={{
        backgroundColor: colores.fondo, display: 'flex', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', padding: '16px'
      }}>
        <div style={{
          width: '100%', maxWidth: '440px', padding: '2rem', borderRadius: `${radios.xl}px`,
          boxShadow: sombras.nivel3, background: colores.tarjeta, textAlign: 'center'
        }}>
          <FiCheckCircle size={38} style={{ color: colores.exito }} />
          <h4 className="mt-3" style={{ fontWeight: 700, color: colores.texto }}>Cuenta creada</h4>
          <p style={{ color: colores.textoSuave, fontSize: '14px' }}>
            Tu cuenta está lista. Ya puedes hacer tus pedidos en NEXDINE.
          </p>
          <button
            type="button"
            className="btn w-100"
            style={{ ...btnPrimario }}
            onClick={() => navigate('/login')}
          >
            Continuar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: colores.fondo, display: 'flex', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', padding: '24px 16px'
    }}>
      <div style={{
        width: '100%', maxWidth: '480px', padding: '2rem', borderRadius: `${radios.xl}px`,
        boxShadow: sombras.nivel3, background: colores.tarjeta
      }}>
        <div className="text-center mb-4">
          <i className="fa-solid fa-utensils fa-2x" style={{ color: colores.primario }}></i>
          <h3 className="mt-2" style={{ color: colores.primario, fontWeight: 'bold', letterSpacing: '2px' }}>
            NEXDINE
          </h3>
          <p style={{ color: colores.textoSuave, margin: 0, fontSize: '14px' }}>
            {tipoCuenta === 'ADMINISTRADOR' ? 'Crea la cuenta del dueño del restaurante' : 'Crea tu cuenta de cliente'}
          </p>
        </div>

        {error && (
          <div role="alert" style={{
            backgroundColor: colores.errorFondo, color: colores.errorTexto,
            borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px',
            marginBottom: '14px', display: 'flex', gap: '8px'
          }}>
            <FiXCircle style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {tipoCuenta === null ? (
          <div>
            <p className="small text-muted mb-3">Selecciona el tipo de cuenta que deseas crear.</p>

            <button
              type="button"
              className="btn w-100 text-start mb-2"
              onClick={() => setTipoCuenta('CLIENTE')}
              style={{ border: `1px solid ${colores.borde}`, borderRadius: '12px', padding: '14px', backgroundColor: colores.tarjeta }}
            >
              <span className="d-flex align-items-center gap-3">
                <span style={{
                  width: '40px', height: '40px', borderRadius: '50%', backgroundColor: colores.mint,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: colores.primario, flexShrink: 0
                }}>
                  <i className="fa-solid fa-user"></i>
                </span>
                <span>
                  <strong className="d-block" style={{ color: colores.texto }}>Registrar cliente</strong>
                  <small className="text-muted">Crea una cuenta para que el cliente realice pedidos.</small>
                </span>
              </span>
            </button>

            <button
              type="button"
              className="btn w-100 text-start mb-2"
              onClick={() => setTipoCuenta('ADMINISTRADOR')}
              style={{ border: `1px solid ${colores.borde}`, borderRadius: '12px', padding: '14px', backgroundColor: colores.tarjeta }}
            >
              <span className="d-flex align-items-center gap-3">
                <span style={{
                  width: '40px', height: '40px', borderRadius: '50%', backgroundColor: colores.mint,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: colores.primario, flexShrink: 0
                }}>
                  <i className="fa-solid fa-shield-halved"></i>
                </span>
                <span>
                  <strong className="d-block" style={{ color: colores.texto }}>Registrar para el dueño de la empresa</strong>
                  <small className="text-muted">Crea la cuenta correspondiente al dueño/administrador del restaurante.</small>
                </span>
              </span>
            </button>

            <small className="d-block text-muted text-center mt-2">
              Los clientes no realizan pedidos de administración.
            </small>
          </div>
        ) : (
        <form onSubmit={enviar} noValidate>
          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="registro-nombre">Nombre completo</label>
            <input
              id="registro-nombre"
              type="text"
              name="nombre"
              className="form-control"
              style={input}
              value={datos.nombre}
              onChange={cambiar}
              autoComplete="name"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="registro-correo">Correo</label>
            <input
              id="registro-correo"
              type="email"
              name="correo"
              className="form-control"
              style={input}
              value={datos.correo}
              onChange={cambiar}
              autoComplete="email"
              required
            />
          </div>

          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <label className="form-label fw-semibold" htmlFor="registro-celular">Celular</label>
              <input
                id="registro-celular"
                type="tel"
                name="celular"
                className="form-control"
                style={input}
                value={datos.celular}
                onChange={cambiar}
                autoComplete="tel"
                required
              />
            </div>
            <div className="col-sm-6">
              <label className="form-label fw-semibold" htmlFor="registro-direccion">Dirección</label>
              <input
                id="registro-direccion"
                type="text"
                name="direccion"
                className="form-control"
                style={input}
                value={datos.direccion}
                onChange={cambiar}
                autoComplete="street-address"
                required
              />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <label className="form-label fw-semibold" htmlFor="registro-contrasena">Contraseña</label>
              <input
                id="registro-contrasena"
                type="password"
                name="contrasena"
                className="form-control"
                style={input}
                value={datos.contrasena}
                onChange={cambiar}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div className="col-sm-6">
              <label className="form-label fw-semibold" htmlFor="registro-confirmacion">Confirmar contraseña</label>
              <input
                id="registro-confirmacion"
                type="password"
                name="confirmacion"
                className="form-control"
                style={input}
                value={datos.confirmacion}
                onChange={cambiar}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn w-100 d-flex align-items-center justify-content-center gap-2"
            style={{ ...btnPrimario }}
            disabled={enviando}
          >
            {enviando ? (
              <>
                <span className="spinner-border spinner-border-sm"></span>
                Creando cuenta...
              </>
            ) : (
              <>
                <FiUserPlus /> Crear cuenta
              </>
            )}
          </button>
        </form>
        )}

        <div className="text-center mt-3">
          <small style={{ color: colores.textoSuave }}>
            ¿Ya tienes cuenta? <Link to="/login" style={{ color: colores.secundario, fontWeight: 600 }}>Inicia sesión</Link>
          </small>
        </div>

        {tipoCuenta !== null && (
          <button
            type="button"
            className="btn w-100 mt-2 d-flex align-items-center justify-content-center gap-2"
            style={{ ...btnGhost, minHeight: '42px' }}
            onClick={() => { setTipoCuenta(null); setError(''); setRegistrado(false) }}
          >
            <FiArrowLeft /> Cambiar tipo de cuenta
          </button>
        )}

        <button
          type="button"
          className="btn w-100 mt-3 d-flex align-items-center justify-content-center gap-2"
          style={{ ...btnGhost, minHeight: '42px' }}
          onClick={() => navigate('/login')}
        >
          <FiArrowLeft /> Volver al inicio de sesión
        </button>

        <small style={{ display: 'block', color: colores.textoSuave, fontSize: '11.5px', marginTop: '14px', textAlign: 'center' }}>
          El registro crea una cuenta de cliente para hacer pedidos.
        </small>
      </div>
    </div>
  )
}

export default Registro
