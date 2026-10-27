import { useState, useEffect } from 'react'
import { FiX, FiCheck } from 'react-icons/fi'
import { obtenerOpcionesProducto } from '../services/pedidos.js'
import { formatearDinero, multiplicarDinero, sumarDinero } from '../utils/dinero.js'

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
    setSeleccionadas([])
    setCantidad(1)
    setError('')
    setLoading(true)
    cargarOpciones()
  }, [producto?.id])

  const cargarOpciones = async () => {
    setError('')
    try {
      const data = await obtenerOpcionesProducto(producto.id)
      setOpciones(Array.isArray(data) ? data : [])
    } catch (err) {
      // Si no hay endpoint, simplemente sin opciones
      setOpciones([])
      setError('')
    } finally {
      setLoading(false)
    }
  }

  const toggleOpcion = (grupo, opcion) => {
    if (opcion.disponible === false) return
    setSeleccionadas(prev => {
      const existe = prev.find(o => o.id === opcion.id)
      if (existe) return prev.filter(o => o.id !== opcion.id)

      const seleccion = {
        ...opcion,
        precio: Number(opcion.precio ?? opcion.precioAdicional ?? 0),
        grupoId: grupo.id,
        grupoNombre: grupo.nombre
      }
      if (grupo.permiteMultiple) return [...prev, seleccion]
      return [...prev.filter(o => o.grupoId !== grupo.id), seleccion]
    })
    setError('')
  }

  const precioAdicional = sumarDinero(
    ...seleccionadas.map(opcion => opcion.precio ?? 0)
  )
  const precioTotal = multiplicarDinero(
    sumarDinero(producto.precio || 0, precioAdicional),
    cantidad
  )

  const handleConfirmar = () => {
    const grupoFaltante = opciones.find(grupo => (
      grupo.obligatorio
      && !seleccionadas.some(opcion => opcion.grupoId === grupo.id)
    ))
    if (grupoFaltante) {
      setError(`Debe seleccionar una opción en el grupo ${grupoFaltante.nombre}.`)
      return
    }
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
              ) : error ? (
                <div className="text-center py-3">
                  <p className="text-muted mb-2">No se pudieron cargar las opciones.</p>
                  <small className="text-muted">Puedes agregar el producto sin personalización.</small>
                </div>
              ) : opciones.length === 0 ? (
                <p className="text-muted text-center py-3">Este producto no tiene opciones de personalización.</p>
              ) : (
                opciones.map(grupo => (
                  <div key={grupo.id} className="mb-3">
                    <label className="form-label fw-semibold">
                      {grupo.nombre}
                      {grupo.obligatorio && <span className="text-danger ms-1">*</span>}
                    </label>
                    <small className="text-muted d-block mb-2">
                      {grupo.permiteMultiple ? 'Puede seleccionar varias' : 'Seleccione una'}
                      {grupo.obligatorio ? ' · Obligatorio' : ''}
                    </small>
                    <div className="row g-2">
                      {(grupo.opciones || []).map(opcion => {
                        const seleccionada = seleccionadas.find(o => o.id === opcion.id)
                        const noDisponible = opcion.disponible === false
                        return (
                          <div key={opcion.id} className="col-6">
                            <label
                              className="d-flex align-items-center gap-2 p-2 border rounded"
                              style={{
                                cursor: noDisponible ? 'not-allowed' : 'pointer',
                                opacity: noDisponible ? 0.55 : 1,
                                borderColor: seleccionada ? '#1a3c34' : '#dee2e6',
                                backgroundColor: seleccionada ? '#f2f7f5' : '#fff'
                              }}
                            >
                              <input
                                type={grupo.permiteMultiple ? 'checkbox' : 'radio'}
                                name={`opcion-${grupo.id}`}
                                checked={!!seleccionada}
                                onChange={() => toggleOpcion(grupo, opcion)}
                                disabled={noDisponible}
                                className="form-check-input mt-0"
                              />
                              <span className="small">
                                {opcion.nombre}
                                {Number(opcion.precio) > 0 && (
                                  <span className="text-muted"> (+{formatearDinero(opcion.precio)})</span>
                                )}
                                {noDisponible && <span className="text-danger"> · No disponible</span>}
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
                    {formatearDinero(precioTotal)}
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
