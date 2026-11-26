import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiUser, FiMapPin, FiPhone, FiCheckCircle, FiClipboard, FiCreditCard, FiDollarSign, FiRepeat, FiLock, FiTruck } from 'react-icons/fi'
import { crearPedidoInvitado, agregarItemPedido, confirmarPedido } from '../services/pedidos.js'
import { seleccionarMetodoPago } from '../services/pagos.js'
import { useCarrito } from '../context/CarritoContext.jsx'
import { obtenerMensajeError } from '../services/mensajes.js'
import { metodosPagoParaServicio, etiquetaMetodoPago, esPagoEnLinea } from '../utils/pagos.js'
import SelectorSucursal from '../components/SelectorSucursal.jsx'
import {
  obtenerSucursalesDisponibles,
  obtenerContextoMenu
} from '../utils/contextoMenu.js'
import { formatearDinero } from '../utils/dinero.js'
import { colores, sombras, radios, tarjeta, btnPrimario, btnGhost, estiloBadge, cifrasTabulares } from '../styles/tokens.js'

const formatoPrecio = formatearDinero

const ICONOS_METODO = {
  EFECTIVO: FiDollarSign,
  TARJETA: FiCreditCard,
  TRANSFERENCIA: FiRepeat,
  PAGO_EN_LINEA: FiLock,
  CONTRA_ENTREGA: FiTruck
}

/**
 * RF031 — Pedido como invitado.
 *
 * Heurísticas de Nielsen:
 *   · Visibilidad del estado: loading, éxito y error claros.
 *   · Coincidencia con el mundo real: formulario como en un restaurante.
 *   · Control y libertad: volver al carrito sin perder datos.
 *   · Prevención de errores: validar campos antes de enviar.
 *   · Reconocimiento: resumen del pedido visible antes de confirmar.
 *
 * Contrato con el backend: los precios y la disponibilidad los revalida
 * el servidor al crear el pedido y al agregar cada item (RF con inventario).
 * Si un producto dejó de estar disponible, se indica cuál y el carrito
 * se conserva para que el cliente pueda ajustarlo.
 */
function PedidoInvitado() {
  const navigate = useNavigate()
  const {
    items, subtotal, descuento, impuestos, propina, cupon, total,
    tipoServicio, sucursal, setSucursal, vaciarCarrito
  } = useCarrito()
  const [sucursalesDisponibles] = useState(() => obtenerSucursalesDisponibles())

  const [formData, setFormData] = useState(() => ({
    nombre: '',
    telefono: '',
    correo: '',
    tipoServicio: tipoServicio === 'PARA_LLEVAR' ? 'PARA_LLEVAR' : 'DOMICILIO',
    direccion: '',
    referencia: ''
  }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null)
  const [metodoPago, setMetodoPago] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'tipoServicio') {
      const permitidos = metodosPagoParaServicio(value).map(opcion => opcion.valor)
      if (!permitidos.includes(metodoPago)) setMetodoPago('')
    }
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const OPCIONES_SERVICIO = [
    { valor: 'DOMICILIO', etiqueta: 'Domicilio', icono: 'fa-solid fa-motorcycle' },
    { valor: 'PARA_LLEVAR', etiqueta: 'Para llevar', icono: 'fa-solid fa-bag-shopping' }
  ]

  const metodosDisponibles = metodosPagoParaServicio(formData.tipoServicio)
  const pagoEnLineaSeleccionado = esPagoEnLinea(metodoPago)

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
    if (formData.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.correo.trim())) {
      setError('El correo no es válido')
      return
    }
    if (formData.tipoServicio === 'DOMICILIO' && !formData.direccion.trim()) {
      setError('La dirección es obligatoria para domicilio')
      return
    }
    if (!sucursal?.id) {
      setError('Debe seleccionar una sucursal antes de confirmar el pedido.')
      return
    }
    if (!metodoPago) {
      setError('Selecciona un método de pago para continuar.')
      return
    }
    if (pagoEnLineaSeleccionado && formData.tipoServicio === 'DOMICILIO') {
      setError(
        'El pago a domicilio en línea requiere pago anticipado. Continúa con el pedido y registra el pago en el resumen.'
      )
      return
    }

    setLoading(true)
    try {
      const pedido = await crearPedidoInvitado({
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        tipoServicio: formData.tipoServicio,
        direccion: formData.direccion.trim(),
        referencia: formData.referencia.trim(),
        sucursalId: sucursal.id,
        correo: formData.correo.trim()
      })

      try {
        await seleccionarMetodoPago(pedido.id, metodoPago)
      } catch (err) {
        throw new Error(obtenerMensajeError(err, 'No fue posible registrar el método de pago.'))
      }

      // Agregar items al pedido. El backend revalida la disponibilidad
      // por sucursal en cada item; si uno falla, se aborta con un mensaje
      // que identifica el producto y el carrito NO se pierde.
      for (const item of items) {
        try {
          await agregarItemPedido(pedido.id, item)
        } catch (err) {
          throw new Error(
            `${item.producto?.nombre || 'Un producto'}: ${
              obtenerMensajeError(err, 'el producto ya no está disponible para este pedido.')
            }`
          )
        }
      }

      // Confirmar con propina y cupón
      const pedidoFinal = await confirmarPedido(pedido.id, {
        propina: propina.valor > 0 ? propina : null,
        cuponCodigo: cupon?.codigo
      })

      setPedidoConfirmado(pedidoFinal)
      vaciarCarrito()
    } catch (err) {
      const mensaje = err instanceof Error && err.message && !err.response
        ? err.message
        : obtenerMensajeError(err, 'No fue posible crear el pedido. Intente nuevamente.')
      setError(mensaje)
    } finally {
      setLoading(false)
    }
  }

  if (pedidoConfirmado) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: colores.fondo,
        display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px'
      }}>
        <div style={{ ...tarjeta, padding: '40px', textAlign: 'center', maxWidth: '460px', width: '100%' }}>
          <div style={{
            width: '64px', height: '64px', margin: '0 auto 16px auto',
            borderRadius: '50%', backgroundColor: colores.exitoFondo,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FiCheckCircle size={30} style={{ color: colores.exito }} />
          </div>
          <h4 style={{ fontWeight: 700, color: colores.texto }}>Pedido confirmado</h4>
          <p style={{ color: colores.textoSuave }}>Tu número de seguimiento es:</p>
          <div className="tnum" style={{
            backgroundColor: colores.superficie,
            borderRadius: radios.md,
            padding: '16px',
            marginBottom: '12px',
            ...cifrasTabulares
          }}>
            <strong style={{ fontSize: '1.3rem', color: colores.primario }}>
              {pedidoConfirmado.numeroSeguimiento || pedidoConfirmado.id}
            </strong>
          </div>
          <p style={{ color: colores.textoSuave, fontSize: '13px', marginBottom: '4px' }}>
            Método de pago: <strong style={{ color: colores.texto }}>{etiquetaMetodoPago(metodoPago)}</strong>
          </p>
          {metodoPago === 'EFECTIVO' && (
            <p style={{ color: colores.textoSuave, fontSize: '12.5px', marginBottom: '12px' }}>
              <FiDollarSign style={{ marginRight: '5px' }} /> Pagarás en efectivo al recibir o recoger tu pedido.
            </p>
          )}
          {metodoPago === 'TARJETA' && (
            <p style={{ color: colores.textoSuave, fontSize: '12.5px', marginBottom: '12px' }}>
              <FiCreditCard style={{ marginRight: '5px' }} /> El pago con tarjeta queda pendiente de confirmación.
            </p>
          )}
          {metodoPago === 'TRANSFERENCIA' && (
            <p style={{ color: colores.textoSuave, fontSize: '12.5px', marginBottom: '12px' }}>
              <FiRepeat style={{ marginRight: '5px' }} /> El restaurante confirmará tu pago al verificar la transferencia.
            </p>
          )}
          <p style={{ color: colores.textoSuave, fontSize: '13px' }}>
            Guarda este número para hacer seguimiento a tu pedido.
          </p>
          <div className="d-grid gap-2 mt-3">
            <button
              className="btn d-flex align-items-center justify-content-center"
              style={{ ...btnPrimario, minHeight: '48px' }}
              onClick={() => navigate(`/resumen/${pedidoConfirmado.id}`)}
            >
              Ver resumen del pedido
            </button>
            <button
              className="btn d-flex align-items-center justify-content-center"
              style={{ ...btnGhost, minHeight: '48px' }}
              onClick={() => navigate(obtenerContextoMenu() || '/menu')}
            >
              Volver al menú
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: colores.fondo,
        display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px'
      }}>
        <div style={{ ...tarjeta, padding: '40px', textAlign: 'center', maxWidth: '460px', width: '100%' }}>
          <h4 style={{ fontWeight: 700, color: colores.texto }}>No tienes productos en el carrito</h4>
          <p style={{ color: colores.textoSuave }}>Agrega productos antes de continuar</p>
          <button
            className="btn d-inline-flex align-items-center"
            style={{ ...btnPrimario, minHeight: '48px' }}
            onClick={() => navigate(obtenerContextoMenu() || '/carrito')}
          >
            <FiArrowLeft style={{ marginRight: '6px' }} /> Volver
          </button>
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
              <FiUser style={{ marginRight: '8px' }} />
              Datos para tu pedido
            </h2>
            <small style={{ color: colores.textoSuave }}>
              Último paso antes de enviar tu orden a cocina
            </small>
          </div>
          <button
            className="btn d-flex align-items-center"
            style={{ ...btnGhost, minHeight: '44px' }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft style={{ marginRight: '5px' }} /> Volver
          </button>
        </div>

        <div className="row g-3">
          {/* Formulario */}
          <div className="col-lg-7">
            <div style={{ ...tarjeta, padding: '24px' }}>
              {error && (
                <div style={{
                  backgroundColor: colores.errorFondo, color: colores.errorTexto,
                  borderRadius: radios.sm, padding: '10px 12px',
                  fontSize: '13.5px', marginBottom: '16px', fontWeight: 500
                }}>
                  <FiClipboard style={{ marginRight: '6px' }} />{error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Nombre completo *</label>
                  <input
                    type="text"
                    name="nombre"
                    placeholder="Tu nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    style={{ ...input2, width: '100%' }}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Teléfono *</label>
                  <input
                    type="tel"
                    name="telefono"
                    placeholder="3001234567"
                    value={formData.telefono}
                    onChange={handleChange}
                    required
                    style={{ ...input2, width: '100%' }}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold" htmlFor="correo-avisos">Correo (opcional)</label>
                  <input
                    id="correo-avisos"
                    type="email"
                    name="correo"
                    autoComplete="email"
                    placeholder="tucorreo@ejemplo.com"
                    value={formData.correo}
                    onChange={handleChange}
                    style={{ ...input2, width: '100%' }}
                  />
                  <small style={{ color: colores.textoSuave }}>Te avisaremos por correo cada vez que cambie el estado de tu pedido.</small>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Tipo de servicio *</label>
                  <div className="row g-2">
                    {OPCIONES_SERVICIO.map(opcion => {
                      const activo = formData.tipoServicio === opcion.valor
                      return (
                        <div className="col-6" key={opcion.valor}>
                          <label
                            style={{
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '14px',
                              borderRadius: radios.md,
                              backgroundColor: activo ? colores.mint : colores.tarjeta,
                              border: activo ? `2px solid ${colores.primario}` : `1px solid ${colores.borde}`,
                              fontWeight: 600,
                              color: colores.texto,
                              minHeight: '56px'
                            }}
                          >
                            <input
                              type="radio"
                              name="tipoServicio"
                              value={opcion.valor}
                              checked={activo}
                              onChange={handleChange}
                              style={{ accentColor: colores.primario }}
                            />
                            <span><i className={opcion.icono} style={{ marginRight: '6px' }}></i> {opcion.etiqueta}</span>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {formData.tipoServicio === 'DOMICILIO' && (
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Dirección *</label>
                    <input
                      type="text"
                      name="direccion"
                      placeholder="Calle 123 #45-67"
                      value={formData.direccion}
                      onChange={handleChange}
                      required
                      style={{ ...input2, width: '100%' }}
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Método de pago *</label>
                  <div className="row g-2">
                    {metodosDisponibles.map(metodo => {
                      const activo = metodoPago === metodo.valor
                      const Icono = ICONOS_METODO[metodo.valor] || FiDollarSign
                      return (
                        <div className="col-6" key={metodo.valor}>
                          <label
                            style={{
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '14px',
                              borderRadius: radios.md,
                              backgroundColor: activo ? colores.mint : colores.tarjeta,
                              border: activo ? `2px solid ${colores.primario}` : `1px solid ${colores.borde}`,
                              fontWeight: 600,
                              color: colores.texto,
                              minHeight: '56px'
                            }}
                          >
                            <input
                              type="radio"
                              name="metodoPago"
                              value={metodo.valor}
                              checked={activo}
                              onChange={() => { setMetodoPago(metodo.valor); setError('') }}
                              style={{ accentColor: colores.primario }}
                            />
                            <span><Icono style={{ marginRight: '6px' }} /> {metodo.etiqueta}</span>
                          </label>
                        </div>
                      )
                    })}
                  </div>

                  {metodoPago && (
                    <small style={{ display: 'block', color: colores.textoSuave, marginTop: '7px' }}>
                      {metodosDisponibles.find(opcion => opcion.valor === metodoPago)?.descripcion}
                    </small>
                  )}
                  {pagoEnLineaSeleccionado && (
                    <div style={{
                      marginTop: '8px', backgroundColor: colores.advertenciaFondo,
                      color: colores.advertenciaTexto, borderRadius: radios.sm,
                      padding: '10px 12px', fontSize: '12.5px', display: 'flex', gap: '8px'
                    }}>
                      <FiLock style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>
                        {formData.tipoServicio === 'DOMICILIO'
                          ? 'Pago a domicilio en línea: requiere pago anticipado. El saldo se registrará en el resumen del pedido.'
                          : 'Pago en línea para llevar: selecciona este método y registra el pago en el resumen del pedido.'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mb-1">
                  <label className="form-label small fw-semibold">Referencia (opcional)</label>
                  <input
                    type="text"
                    name="referencia"
                    placeholder="Cerca de..."
                    value={formData.referencia}
                    onChange={handleChange}
                    style={{ ...input2, width: '100%' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn w-100 mt-3"
                  style={{ ...btnPrimario, minHeight: '50px' }}
                  disabled={loading}
                  title={pagoEnLineaSeleccionado ? 'El pago se registrará en el resumen del pedido.' : 'Confirmar pedido'}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Creando pedido...
                    </>
                  ) : pagoEnLineaSeleccionado ? (
                    <><FiLock style={{ marginRight: '6px' }} /> Confirmar (pendiente de pago)</>
                  ) : (
                    `Confirmar pedido (${formatoPrecio(total)})`
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Resumen */}
          <div className="col-lg-5">
            <div className="sticky-top" style={{ top: '20px' }}>
              <div style={{ ...tarjeta, padding: '20px' }}>
                <h6 style={{ fontWeight: 700, color: colores.texto, marginBottom: '14px' }}>
                  Resumen del pedido
                </h6>
                {(!sucursal || !sucursal.id) && (
                  <>
                    {sucursalesDisponibles.length > 0 ? (
                      <SelectorSucursal
                        sucursales={sucursalesDisponibles}
                        seleccionada={sucursal}
                        onSeleccionar={setSucursal}
                      />
                    ) : (
                      <div style={{
                        backgroundColor: colores.advertenciaFondo, color: colores.advertenciaTexto,
                        borderRadius: radios.sm, padding: '10px 12px', fontSize: '12.5px', marginBottom: '12px'
                      }}>
                        <FiMapPin style={{ marginRight: '4px' }} />
                        Ingrese al menú por el código QR de su mesa o mediante el
                        enlace público del restaurante para asociar una sucursal
                        válida a su pedido.
                      </div>
                    )}
                  </>
                )}
                {sucursal?.nombre && (
                  <small style={{ color: colores.textoSuave, display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    <FiMapPin style={{ flexShrink: 0, marginTop: '2px' }} />
                    {sucursal.nombre}
                    {sucursal.direccion ? ` · ${sucursal.direccion}` : ''}
                  </small>
                )}
                <div className="tnum" style={{
                  display: 'flex', flexDirection: 'column', gap: '6px',
                  fontSize: '13.5px', maxHeight: '220px', overflowY: 'auto', ...cifrasTabulares
                }}>
                  {items.map(item => (
                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: colores.textoSuave, minWidth: 0 }}>
                        {item.cantidad}x {item.producto.nombre}
                        {item.observaciones && (
                          <small style={{ display: 'block', overflowWrap: 'anywhere' }}>
                            Observación: {item.observaciones}
                          </small>
                        )}
                      </span>
                      <span style={{ color: colores.texto, flexShrink: 0 }}>
                        {formatoPrecio((Number(item.precioUnitario) + Number(item.adicionalOpciones)) * Number(item.cantidad))}
                      </span>
                    </div>
                  ))}
                </div>
                <hr style={{ borderColor: colores.borde, opacity: 1 }} />
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const input2 = {
  height: '48px',
  border: `1px solid ${colores.borde}`,
  borderRadius: radios.sm,
  backgroundColor: colores.tarjeta,
  color: colores.texto,
  fontSize: '14px'
}

export default PedidoInvitado
