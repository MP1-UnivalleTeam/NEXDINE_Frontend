import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiUser, FiMapPin, FiPhone } from 'react-icons/fi'
import { crearPedidoInvitado, agregarItemPedido, confirmarPedido } from '../services/pedidos.js'
import { useCarrito } from '../context/CarritoContext.jsx'
import { obtenerMensajeError } from '../services/mensajes.js'

/**
 * RF031 — Pedido como invitado.
 *
 * Heurísticas de Nielsen:
 *   · Visibilidad del estado: loading, éxito y error claros.
 *   · Coincidencia con el mundo real: formulario como en un restaurante.
 *   · Control y libertad: volver al carrito sin perder datos.
 *   · Prevención de errores: validar campos antes de enviar.
 *   · Reconocimiento: resumen del pedido visible antes de confirmar.
 */
function PedidoInvitado() {
  const navigate = useNavigate()
  const { items, subtotal, propina, cupon, vaciarCarrito } = useCarrito()

  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    tipoServicio: 'DOMICILIO',
    direccion: '',
    referencia: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null)

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (!formData.telefono.trim()) {
      setError('El teléfono es obligatorio')
      return
    }
    if (formData.tipoServicio === 'DOMICILIO' && !formData.direccion.trim()) {
      setError('La dirección es obligatoria para domicilio')
      return
    }

    setLoading(true)
    try {
      const pedido = await crearPedidoInvitado({
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        tipoServicio: formData.tipoServicio,
        direccion: formData.direccion.trim(),
        referencia: formData.referencia.trim()
      })

      // Agregar items al pedido
      for (const item of items) {
        await agregarItemPedido(pedido.id, item)
      }

      // Confirmar con propina y cupón
      const pedidoFinal = await confirmarPedido(pedido.id, {
        propina: propina.valor > 0 ? propina : null,
        cuponCodigo: cupon?.codigo
      })

      setPedidoConfirmado(pedidoFinal)
      vaciarCarrito()
    } catch (err) {
      setError(obtenerMensajeError(err, 'No fue posible crear el pedido. Intente nuevamente.'))
    } finally {
      setLoading(false)
    }
  }

  if (pedidoConfirmado) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card text-center" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
              <div className="card-body p-5">
                <i className="fa-solid fa-circle-check fa-3x text-success mb-3"></i>
                <h4>Pedido confirmado</h4>
                <p className="text-muted">Tu número de seguimiento es:</p>
                <div className="p-3 bg-light rounded mb-3">
                  <strong style={{ fontSize: '1.3rem', color: '#1a3c34' }}>
                    {pedidoConfirmado.numeroSeguimiento || pedidoConfirmado.id}
                  </strong>
                </div>
                <p className="text-muted small">
                  Guarda este número para hacer seguimiento a tu pedido.
                </p>
                <button
                  className="btn"
                  style={{ backgroundColor: '#1a3c34', color: 'white' }}
                  onClick={() => navigate('/menu')}
                >
                  Volver al menú
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container mt-5">
        <div className="text-center py-5">
          <h4>No tienes productos en el carrito</h4>
          <p className="text-muted">Agrega productos antes de continuar</p>
          <button
            className="btn"
            style={{ backgroundColor: '#1a3c34', color: 'white' }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft style={{ marginRight: '5px' }} /> Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <FiUser style={{ marginRight: '8px' }} />
          Datos para tu pedido
        </h2>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft style={{ marginRight: '5px' }} /> Volver
        </button>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger py-2 small" role="alert">
                  <i className="fa-solid fa-circle-exclamation me-1"></i>{error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Nombre completo *</label>
                  <div className="input-group">
                    <span className="input-group-text"><FiUser /></span>
                    <input
                      type="text"
                      name="nombre"
                      className="form-control"
                      placeholder="Tu nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Teléfono *</label>
                  <div className="input-group">
                    <span className="input-group-text"><FiPhone /></span>
                    <input
                      type="tel"
                      name="telefono"
                      className="form-control"
                      placeholder="3001234567"
                      value={formData.telefono}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Tipo de servicio *</label>
                  <div className="row g-2">
                    <div className="col-6">
                      <label
                        className="d-flex align-items-center gap-2 p-3 border rounded w-100"
                        style={{
                          cursor: 'pointer',
                          borderColor: formData.tipoServicio === 'DOMICILIO' ? '#1a3c34' : '#dee2e6',
                          backgroundColor: formData.tipoServicio === 'DOMICILIO' ? '#f2f7f5' : '#fff'
                        }}
                      >
                        <input
                          type="radio"
                          name="tipoServicio"
                          value="DOMICILIO"
                          checked={formData.tipoServicio === 'DOMICILIO'}
                          onChange={handleChange}
                          className="form-check-input mt-0"
                        />
                        <span><i className="fa-solid fa-motorcycle me-1"></i> Domicilio</span>
                      </label>
                    </div>
                    <div className="col-6">
                      <label
                        className="d-flex align-items-center gap-2 p-3 border rounded w-100"
                        style={{
                          cursor: 'pointer',
                          borderColor: formData.tipoServicio === 'PARA_LLEVAR' ? '#1a3c34' : '#dee2e6',
                          backgroundColor: formData.tipoServicio === 'PARA_LLEVAR' ? '#f2f7f5' : '#fff'
                        }}
                      >
                        <input
                          type="radio"
                          name="tipoServicio"
                          value="PARA_LLEVAR"
                          checked={formData.tipoServicio === 'PARA_LLEVAR'}
                          onChange={handleChange}
                          className="form-check-input mt-0"
                        />
                        <span><i className="fa-solid fa-bag-shopping me-1"></i> Para llevar</span>
                      </label>
                    </div>
                  </div>
                </div>

                {formData.tipoServicio === 'DOMICILIO' && (
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Dirección *</label>
                    <div className="input-group">
                      <span className="input-group-text"><FiMapPin /></span>
                      <input
                        type="text"
                        name="direccion"
                        className="form-control"
                        placeholder="Calle 123 #45-67"
                        value={formData.direccion}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Referencia (opcional)</label>
                  <input
                    type="text"
                    name="referencia"
                    className="form-control"
                    placeholder="Cerca de..."
                    value={formData.referencia}
                    onChange={handleChange}
                  />
                </div>

                <button
                  type="submit"
                  className="btn w-100"
                  style={{ backgroundColor: '#1a3c34', color: 'white' }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Creando pedido...
                    </>
                  ) : (
                    'Confirmar pedido'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card sticky-top" style={{ top: '20px', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
            <div className="card-body">
              <h6 className="mb-3">Resumen del pedido</h6>
              {items.map(item => (
                <div key={item.key} className="d-flex justify-content-between mb-2 small">
                  <span className="text-muted">
                    {item.cantidad}x {item.producto.nombre}
                  </span>
                  <span>
                    ${((item.precioUnitario + item.adicionalOpciones) * item.cantidad).toLocaleString('es-CO')}
                  </span>
                </div>
              ))}
              <hr />
              <div className="d-flex justify-content-between">
                <strong>Subtotal</strong>
                <strong>${subtotal.toLocaleString('es-CO')}</strong>
              </div>
              {propina.valor > 0 && (
                <div className="d-flex justify-content-between mt-1">
                  <span className="text-muted">Propina</span>
                  <span>${propina.valor.toLocaleString('es-CO')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PedidoInvitado
