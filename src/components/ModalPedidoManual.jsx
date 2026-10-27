import { useEffect, useMemo, useState } from 'react'
import {
  FiX, FiPlus, FiMinus, FiTrash2, FiAlertTriangle, FiCheckCircle, FiUser, FiPhone, FiClipboard
} from 'react-icons/fi'
import { obtenerMenuPorMesa, registrarPedidoManual } from '../services/pedidos.js'
import { formatearDinero } from '../utils/dinero.js'
import { colores, sombras, radios, tarjeta, btnPrimario, btnGhost, input, cifrasTabulares } from '../styles/tokens.js'

function ModalPedidoManual({ mesa, onCerrar, onCreado }) {
  const [categorias, setCategorias] = useState([])
  const [cargandoMenu, setCargandoMenu] = useState(true)
  const [errorMenu, setErrorMenu] = useState('')
  const [lineas, setLineas] = useState([])
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let cancelado = false

    const cargarMenu = async () => {
      try {
        const datos = await obtenerMenuPorMesa(mesa.codigo)
        if (cancelado) return
        setCategorias(Array.isArray(datos?.menu) ? datos.menu : [])
      } catch (err) {
        if (cancelado) return
        setErrorMenu(err.response?.data?.error || 'No fue posible cargar los productos de esta mesa.')
      } finally {
        if (!cancelado) setCargandoMenu(false)
      }
    }

    cargarMenu()
    return () => { cancelado = true }
  }, [mesa.codigo])

  useEffect(() => {
    const manejarEscape = (evento) => {
      if (evento.key !== 'Escape' || enviando) return
      evento.preventDefault()
      onCerrar()
    }
    window.addEventListener('keydown', manejarEscape)
    return () => window.removeEventListener('keydown', manejarEscape)
  }, [enviando, onCerrar])

  const totalEstimado = useMemo(
    () => lineas.reduce((total, linea) => total + Number(linea.precio || 0) * linea.cantidad, 0),
    [lineas]
  )

  const agregarProducto = (producto) => {
    if (!producto?.disponible) return
    setError('')
    setLineas(prev => {
      const existente = prev.find(linea => linea.productoId === producto.id)
      if (existente) {
        return prev.map(linea => linea.productoId === producto.id
          ? { ...linea, cantidad: linea.cantidad + 1 }
          : linea)
      }
      return [...prev, {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: Number(producto.precio) || 0,
        cantidad: 1,
        observaciones: ''
      }]
    })
  }

  const cambiarCantidad = (productoId, delta) => {
    setLineas(prev => prev.map(linea => {
      if (linea.productoId !== productoId) return linea
      return { ...linea, cantidad: Math.min(99, Math.max(1, linea.cantidad + delta)) }
    }))
  }

  const quitarLinea = (productoId) => {
    setLineas(prev => prev.filter(linea => linea.productoId !== productoId))
  }

  const cambiarObservacionLinea = (productoId, valor) => {
    setLineas(prev => prev.map(linea => linea.productoId === productoId
      ? { ...linea, observaciones: valor }
      : linea))
  }

  const enviar = async (evento) => {
    evento.preventDefault()
    if (enviando) return

    setError('')

    if (lineas.length === 0) {
      setError('Agrega al menos un producto al pedido.')
      return
    }
    if (nombre.trim().length > 100) {
      setError('El nombre admite hasta 100 caracteres.')
      return
    }
    if (telefono.trim().length > 20) {
      setError('El teléfono admite hasta 20 caracteres.')
      return
    }

    setEnviando(true)
    try {
      const pedido = await registrarPedidoManual({
        mesaId: mesa.id,
        nombre: nombre.trim() || null,
        telefono: telefono.trim() || null,
        observaciones: observaciones.trim() || null,
        items: lineas.map(linea => ({
          productoId: linea.productoId,
          cantidad: linea.cantidad,
          observaciones: linea.observaciones.trim() || null
        }))
      })
      onCreado(pedido)
    } catch (err) {
      setError(err.response?.data?.error || 'No fue posible registrar el pedido. Intenta nuevamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div onClick={enviando ? undefined : onCerrar} style={{
        position: 'fixed', inset: 0, backgroundColor: sombras.backdrop,
        backdropFilter: 'blur(4px)', zIndex: 1040
      }} />
      <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1" role="dialog" aria-modal="true" aria-label="Registrar pedido manual">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '720px' }}>
          <div style={{ ...tarjeta, boxShadow: sombras.nivel3, overflow: 'hidden' }}>
            <div style={{
              padding: '18px 22px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: `1px solid ${colores.borde}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: radios.md,
                  backgroundColor: colores.primario, color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <FiClipboard size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h5 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Pedido manual</h5>
                  <small style={{ color: colores.textoSuave }}>
                    {mesa.nombre} · {mesa.codigo}
                  </small>
                </div>
              </div>
              <button
                type="button"
                onClick={onCerrar}
                disabled={enviando}
                aria-label="Cerrar"
                style={{ border: 'none', background: 'transparent', color: colores.textoSuave, cursor: enviando ? 'not-allowed' : 'pointer', padding: '4px' }}
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={enviar}>
              <div style={{ padding: '18px 22px', maxHeight: '68vh', overflowY: 'auto' }}>
                {error && (
                  <div role="alert" style={{
                    backgroundColor: colores.errorFondo, color: colores.errorTexto,
                    borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px', marginBottom: '14px'
                  }}>
                    <FiAlertTriangle style={{ marginRight: '6px' }} />{error}
                  </div>
                )}

                <div className="row g-2 mb-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold">
                      <FiUser style={{ marginRight: '4px' }} /> Cliente (opcional)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Cliente de mesa"
                      maxLength={100}
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      style={{ ...input, width: '100%' }}
                    />
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold">
                      <FiPhone style={{ marginRight: '4px' }} /> Teléfono (opcional)
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="N/A"
                      maxLength={20}
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      style={{ ...input, width: '100%' }}
                    />
                  </div>
                </div>

                <label className="form-label small fw-semibold">Observaciones del pedido (opcional)</label>
                <textarea
                  className="form-control mb-3"
                  rows={2}
                  maxLength={300}
                  placeholder="Ej: llevar la cuenta al finalizar"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h6 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Productos</h6>
                  <small style={{ color: colores.textoSuave }}>
                    {lineas.reduce((total, linea) => total + linea.cantidad, 0)} seleccionados
                  </small>
                </div>

                {cargandoMenu ? (
                  <div role="status" style={{ textAlign: 'center', padding: '24px 0', color: colores.textoSuave }}>
                    <div className="spinner-border spinner-border-sm" style={{ color: colores.primario }}></div>
                    <div style={{ fontSize: '13px', marginTop: '8px' }}>Cargando productos de la mesa…</div>
                  </div>
                ) : errorMenu ? (
                  <div role="alert" style={{
                    backgroundColor: colores.errorFondo, color: colores.errorTexto,
                    borderRadius: radios.sm, padding: '12px', fontSize: '13px'
                  }}>
                    {errorMenu}
                  </div>
                ) : categorias.length === 0 ? (
                  <div style={{ color: colores.textoSuave, fontSize: '13px', padding: '16px 0' }}>
                    Esta mesa no tiene productos disponibles en su sucursal.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {categorias.map(categoria => (
                      <div key={categoria.nombre}>
                        <small style={{
                          display: 'block', fontWeight: 700, color: colores.textoSuave,
                          textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '10.5px',
                          marginBottom: '6px'
                        }}>
                          {categoria.nombre}
                        </small>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(categoria.productos || []).map(producto => (
                            <div key={producto.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              gap: '10px', border: `1px solid ${colores.borde}`,
                              borderRadius: radios.sm, padding: '8px 10px'
                            }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '13px', color: colores.texto }}>
                                  {producto.nombre}
                                </div>
                                <small className="tnum" style={{ color: colores.textoSuave, ...cifrasTabulares }}>
                                  {formatearDinero(producto.precio)}
                                </small>
                              </div>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => agregarProducto(producto)}
                                disabled={producto.disponible === false}
                                aria-label={`Agregar ${producto.nombre}`}
                                style={{
                                  ...btnPrimario, minHeight: '34px', padding: '0 12px',
                                  fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px'
                                }}
                              >
                                <FiPlus size={13} /> Agregar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {lineas.length > 0 && (
                  <div style={{ marginTop: '18px' }}>
                    <h6 style={{ margin: '0 0 8px', fontWeight: 700, color: colores.texto }}>Pedido</h6>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {lineas.map(linea => (
                        <div key={linea.productoId} style={{
                          border: `1px solid ${colores.borde}`, borderRadius: radios.md,
                          padding: '10px 12px', backgroundColor: colores.superficie
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: colores.texto }}>
                                {linea.nombre}
                              </div>
                              <small className="tnum" style={{ color: colores.textoSuave, ...cifrasTabulares }}>
                                {formatearDinero(linea.precio)} c/u · {formatearDinero(linea.precio * linea.cantidad)}
                              </small>
                            </div>
                            <div style={{
                              display: 'inline-flex', alignItems: 'center',
                              border: `1px solid ${colores.borde}`, borderRadius: radios.full,
                              backgroundColor: colores.tarjeta, overflow: 'hidden'
                            }}>
                              <button
                                type="button"
                                aria-label={`Disminuir cantidad de ${linea.nombre}`}
                                disabled={linea.cantidad <= 1}
                                onClick={() => cambiarCantidad(linea.productoId, -1)}
                                style={{
                                  width: '34px', height: '34px', border: 'none', backgroundColor: 'transparent',
                                  cursor: linea.cantidad <= 1 ? 'not-allowed' : 'pointer',
                                  color: linea.cantidad <= 1 ? colores.textoSuaveClaro : colores.texto
                                }}
                              >
                                <FiMinus size={13} />
                              </button>
                              <span className="tnum" style={{ minWidth: '26px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>
                                {linea.cantidad}
                              </span>
                              <button
                                type="button"
                                aria-label={`Aumentar cantidad de ${linea.nombre}`}
                                onClick={() => cambiarCantidad(linea.productoId, 1)}
                                style={{
                                  width: '34px', height: '34px', border: 'none',
                                  backgroundColor: colores.mint, color: colores.primario, cursor: 'pointer'
                                }}
                              >
                                <FiPlus size={13} />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => quitarLinea(linea.productoId)}
                              aria-label={`Quitar ${linea.nombre}`}
                              style={{ border: 'none', background: 'transparent', color: colores.error, cursor: 'pointer', padding: '6px' }}
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </div>
                          <input
                            type="text"
                            className="form-control form-control-sm mt-2"
                            placeholder="Nota para este producto (opcional)"
                            maxLength={200}
                            value={linea.observaciones}
                            onChange={(e) => cambiarObservacionLinea(linea.productoId, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{
                borderTop: `1px solid ${colores.borde}`,
                backgroundColor: colores.superficie,
                padding: '14px 22px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: '12px', flexWrap: 'wrap'
              }}>
                <div className="tnum" style={{ ...cifrasTabulares }}>
                  <small style={{ color: colores.textoSuave, display: 'block' }}>Subtotal estimado</small>
                  <strong style={{ color: colores.primario, fontSize: '16px' }}>{formatearDinero(totalEstimado)}</strong>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn" onClick={onCerrar} disabled={enviando} style={{ ...btnGhost, minHeight: '42px', padding: '0 16px' }}>
                    <FiX style={{ marginRight: '5px' }} /> Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    disabled={enviando || cargandoMenu || lineas.length === 0}
                    style={{ ...btnPrimario, minHeight: '42px', padding: '0 16px' }}
                  >
                    <FiCheckCircle style={{ marginRight: '5px' }} />
                    {enviando ? 'Registrando…' : 'Registrar pedido'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

export default ModalPedidoManual
