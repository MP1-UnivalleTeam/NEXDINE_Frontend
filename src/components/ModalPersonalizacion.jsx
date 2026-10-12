import { useState, useEffect } from 'react'
import { FiX, FiCheck } from 'react-icons/fi'
import { obtenerOpcionesProducto } from '../services/pedidos.js'

/**
 * RF020 — Modal de personalización de producto.
 *
 * Heurísticas de Nielsen:
 *   · Visibilidad del estado: precio actualizado en tiempo real.
 *   · Coincidencia con el mundo real: opciones agrupadas como en un restaurante.
 *   · Control y libertad: se puede cancelar sin perder el carrito.
 *   · Prevención de errores: no se puede confirmar sin cargar opciones.
 *   · Reconocimiento sobre recuerdo: opciones visibles, no ocultas.
 */
function ModalPersonalizacion({ producto, onAgregar, onCerrar }) {
  const [opciones, setOpciones] = useState([])
  const [seleccionadas, setSeleccionadas] = useState([])
  const [cantidad, setCantidad] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!producto) return
    cargarOpciones()
  }, [producto])

  const cargarOpciones = async () => {
    try {
      const data = await obtenerOpcionesProducto(producto.id)
      setOpciones(data)
    } catch (err) {
      setError('No se pudieron cargar las opciones. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const toggleOpcion = (opcion) => {
    setSeleccionadas(prev => {
      const existe = prev.find(o => o.id === opcion.id)
      if (existe) return prev.filter(o => o.id !== opcion.id)
      return [...prev, opcion]
    })
  }

  const precioAdicional = seleccionadas.reduce((sum, o) => sum + (o.precio || 0), 0)
  const precioTotal = (producto.precio + precioAdicional) * cantidad

  const handleConfirmar = () => {
    onAgregar(producto, seleccionadas, cantidad)
    onCerrar()
  }

  if (!producto) return null

  return (
    <>
      <div onClick={onCerrar} style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1040
      }} />
      <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
        <div className="modal-dialog modal-md">
          <div className="modal-content">
            <div className="modal-header" style={{ backgroundColor: '#1a3c34', color: 'white' }}>
              <h5 className="modal-title">{producto.nombre}</h5>
              <button type="button" className="btn-close btn-close-white" onClick={onCerrar}></button>
            </div>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger py-2 small" role="alert">
                  <i className="fa-solid fa-circle-exclamation me-1"></i>{error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm" style={{ color: '#1a3c34' }}></div>
                  <p className="text-muted small mt-2">Cargando opciones...</p>
                </div>
              ) : opciones.length === 0 ? (
                <p className="text-muted text-center py-3">Este producto no tiene opciones de personalización.</p>
              ) : (
                opciones.map(grupo => (
                  <div key={grupo.id} className="mb-3">
                    <label className="form-label fw-semibold">{grupo.nombre}</label>
                    <small className="text-muted d-block mb-2">
                      {grupo.permiteMultiple ? 'Puede seleccionar varias' : 'Seleccione una'}
                    </small>
                    <div className="row g-2">
                      {grupo.opciones.map(opcion => {
                        const seleccionada = seleccionadas.find(o => o.id === opcion.id)
                        return (
                          <div key={opcion.id} className="col-6">
                            <label
                              className="d-flex align-items-center gap-2 p-2 border rounded"
                              style={{
                                cursor: 'pointer',
                                borderColor: seleccionada ? '#1a3c34' : '#dee2e6',
                                backgroundColor: seleccionada ? '#f2f7f5' : '#fff'
                              }}
                            >
                              <input
                                type={grupo.permiteMultiple ? 'checkbox' : 'radio'}
                                name={`opcion-${grupo.id}`}
                                checked={!!seleccionada}
                                onChange={() => toggleOpcion(opcion)}
                                className="form-check-input mt-0"
                              />
                              <span className="small">
                                {opcion.nombre}
                                {opcion.precio > 0 && (
                                  <span className="text-muted"> (+${opcion.precio.toLocaleString('es-CO')})</span>
                                )}
                              </span>
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}

              <div className="d-flex align-items-center justify-content-between mt-3 p-3 bg-light rounded">
                <div>
                  <label className="form-label small fw-semibold mb-1">Cantidad</label>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                    >−</button>
                    <span className="fw-semibold" style={{ minWidth: '30px', textAlign: 'center' }}>{cantidad}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setCantidad(cantidad + 1)}
                    >+</button>
                  </div>
                </div>
                <div className="text-end">
                  <small className="text-muted d-block">Total</small>
                  <strong style={{ color: '#1a3c34', fontSize: '1.1rem' }}>
                    ${precioTotal.toLocaleString('es-CO')}
                  </strong>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onCerrar}>
                <FiX style={{ marginRight: '5px' }} /> Cancelar
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ backgroundColor: '#1a3c34', color: 'white' }}
                onClick={handleConfirmar}
                disabled={loading}
              >
                <FiCheck style={{ marginRight: '5px' }} /> Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ModalPersonalizacion
