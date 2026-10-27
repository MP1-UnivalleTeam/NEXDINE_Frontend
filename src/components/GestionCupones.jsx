import { useEffect, useState } from 'react'
import { FiEdit2, FiPlus, FiPower, FiRefreshCw, FiTag, FiTrash2, FiX } from 'react-icons/fi'
import api from '../services/api.js'
import MoneyInput from './MoneyInput.jsx'
import { obtenerMensajeError } from '../services/mensajes.js'
import { colores, radios, sombras, tarjeta, btnPrimario, btnGhost } from '../styles/tokens.js'

const FORMULARIO_VACIO = {
  codigo: '',
  tipo: 'PORCENTAJE',
  valor: '',
  montoMinimo: '0',
  fechaInicio: '',
  fechaFin: '',
  usoMaximo: '',
  activo: true
}

function fechaLocal(valor) {
  return valor ? String(valor).slice(0, 16) : ''
}

function estadoCupon(cupon) {
  const ahora = new Date()
  if (cupon.fechaFin && new Date(cupon.fechaFin) < ahora) return 'Expirado'
  if (cupon.fechaInicio && new Date(cupon.fechaInicio) > ahora) return 'Pendiente'
  return cupon.activo ? 'Activo' : 'Inactivo'
}

function GestionCupones({ onClose }) {
  const [cupones, setCupones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [cambiandoId, setCambiandoId] = useState(null)
  const [formulario, setFormulario] = useState(null)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  useEffect(() => {
    const alPresionarEscape = (evento) => {
      if (evento.key === 'Escape' && !guardando) onClose()
    }
    window.addEventListener('keydown', alPresionarEscape)
    return () => window.removeEventListener('keydown', alPresionarEscape)
  }, [guardando, onClose])

  const cargarCupones = async () => {
    setCargando(true)
    setError('')
    try {
      const response = await api.get('/api/cupones/admin')
      if (!Array.isArray(response.data)) {
        setError('El servidor devolvió un listado de cupones no válido.')
        return
      }
      setCupones(response.data)
    } catch (err) {
      setError(obtenerMensajeError(err, 'No fue posible cargar los cupones.'))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarCupones()
  }, [])

  const iniciarCreacion = () => {
    setError('')
    setExito('')
    setFormulario({ ...FORMULARIO_VACIO })
  }

  const iniciarEdicion = (cupon) => {
    setError('')
    setExito('')
    setFormulario({
      id: cupon.id,
      codigo: cupon.codigo || '',
      tipo: cupon.tipo || 'PORCENTAJE',
      valor: String(cupon.valor ?? ''),
      montoMinimo: String(cupon.montoMinimo ?? '0'),
      fechaInicio: fechaLocal(cupon.fechaInicio),
      fechaFin: fechaLocal(cupon.fechaFin),
      usoMaximo: cupon.usoMaximo == null ? '' : String(cupon.usoMaximo),
      activo: Boolean(cupon.activo)
    })
  }

  const actualizarCampo = (evento) => {
    const { name, value } = evento.target
    setFormulario(prev => ({
      ...prev,
      [name]: name === 'codigo' ? value.toUpperCase() : value
    }))
    setError('')
  }

  const guardar = async (evento) => {
    evento.preventDefault()
    if (guardando || !formulario) return
    setGuardando(true)
    setError('')
    setExito('')
    const payload = {
      codigo: formulario.codigo.trim(),
      tipo: formulario.tipo,
      valor: Number(formulario.valor),
      montoMinimo: Number(formulario.montoMinimo || 0),
      fechaInicio: formulario.fechaInicio || null,
      fechaFin: formulario.fechaFin || null,
      usoMaximo: formulario.usoMaximo ? Number(formulario.usoMaximo) : null,
      activo: formulario.activo
    }

    try {
      if (formulario.id) {
        await api.put(`/api/cupones/admin/${encodeURIComponent(formulario.id)}`, payload)
        setExito('Cupón actualizado correctamente.')
      } else {
        await api.post('/api/cupones/admin', payload)
        setExito('Cupón creado correctamente.')
      }
      setFormulario(null)
      await cargarCupones()
    } catch (err) {
      setError(obtenerMensajeError(err, 'No fue posible guardar el cupón.'))
    } finally {
      setGuardando(false)
    }
  }

  const cambiarEstado = async (cupon) => {
    const nuevoEstado = !cupon.activo
    const accion = nuevoEstado ? 'activar' : 'desactivar'
    if (!window.confirm(`¿Desea ${accion} el cupón ${cupon.codigo}?`)) return

    setCambiandoId(cupon.id)
    setError('')
    setExito('')
    try {
      const params = new URLSearchParams({ activo: String(nuevoEstado) })
      await api.patch(`/api/cupones/admin/${encodeURIComponent(cupon.id)}/estado`, params)
      setExito(`Cupón ${nuevoEstado ? 'activado' : 'desactivado'} correctamente.`)
      await cargarCupones()
    } catch (err) {
      setError(obtenerMensajeError(err, `No fue posible ${accion} el cupón.`))
    } finally {
      setCambiandoId(null)
    }
  }

  const eliminar = async (cupon) => {
    if (!window.confirm(`¿Eliminar el cupón ${cupon.codigo}? Esta acción no se puede deshacer.`)) return

    setCambiandoId(cupon.id)
    setError('')
    setExito('')
    try {
      await api.delete(`/api/cupones/admin/${encodeURIComponent(cupon.id)}`)
      setExito('Cupón eliminado correctamente.')
      await cargarCupones()
    } catch (err) {
      setError(obtenerMensajeError(err, 'No fue posible eliminar el cupón. Si tiene historial, desactívalo.'))
    } finally {
      setCambiandoId(null)
    }
  }

  const contenidoFormulario = formulario && (
    <form onSubmit={guardar} style={{ ...tarjeta, padding: '18px', marginTop: '18px' }}>
      <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
        <h3 style={{ color: colores.texto, fontSize: '16px', fontWeight: 700, margin: 0 }}>
          {formulario.id ? 'Editar cupón' : 'Crear cupón'}
        </h3>
        <button type="button" className="btn btn-link btn-sm" onClick={() => setFormulario(null)}>
          Cancelar
        </button>
      </div>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label small fw-semibold" htmlFor="cupon-codigo">Código</label>
          <input id="cupon-codigo" className="form-control" name="codigo" required maxLength={50}
            autoComplete="off" value={formulario.codigo} onChange={actualizarCampo} />
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-semibold" htmlFor="cupon-tipo">Tipo de descuento</label>
          <select id="cupon-tipo" className="form-select" name="tipo" value={formulario.tipo} onChange={actualizarCampo}>
            <option value="PORCENTAJE">Porcentaje</option>
            <option value="MONTO_FIJO">Monto fijo</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-semibold" htmlFor="cupon-valor">
            {formulario.tipo === 'PORCENTAJE' ? 'Porcentaje (1–100)' : 'Valor del descuento'}
          </label>
          {formulario.tipo === 'PORCENTAJE' ? (
            <input id="cupon-valor" className="form-control" name="valor" type="number" required
              min="0.01" max="100" step="0.01" value={formulario.valor} onChange={actualizarCampo} />
          ) : (
            <MoneyInput
              id="cupon-valor"
              className="form-control"
              name="valor"
              value={formulario.valor}
              onChange={actualizarCampo}
            />
          )}
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-semibold" htmlFor="cupon-minimo">Compra mínima</label>
          <MoneyInput
            id="cupon-minimo"
            className="form-control"
            name="montoMinimo"
            value={formulario.montoMinimo}
            onChange={actualizarCampo}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-semibold" htmlFor="cupon-usos">Límite de usos (opcional)</label>
          <input id="cupon-usos" className="form-control" name="usoMaximo" type="number"
            min="1" step="1" value={formulario.usoMaximo} onChange={actualizarCampo} />
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-semibold" htmlFor="cupon-inicio">Vigente desde (opcional)</label>
          <input id="cupon-inicio" className="form-control" name="fechaInicio" type="datetime-local"
            value={formulario.fechaInicio} onChange={actualizarCampo} />
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-semibold" htmlFor="cupon-fin">Expira (opcional)</label>
          <input id="cupon-fin" className="form-control" name="fechaFin" type="datetime-local"
            min={formulario.fechaInicio || undefined} value={formulario.fechaFin} onChange={actualizarCampo} />
        </div>
        <div className="col-12">
          <label className="form-check">
            <input className="form-check-input" name="activo" type="checkbox"
              checked={formulario.activo}
              onChange={(evento) => setFormulario(prev => ({ ...prev, activo: evento.target.checked }))} />
            <span className="form-check-label">Cupón administrativamente activo</span>
          </label>
        </div>
      </div>
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button type="button" className="btn" style={btnGhost}
          disabled={guardando} onClick={() => setFormulario(null)}>Cancelar</button>
        <button type="submit" className="btn" style={btnPrimario} disabled={guardando}>
          {guardando ? 'Guardando...' : formulario.id ? 'Guardar cambios' : 'Crear cupón'}
        </button>
      </div>
    </form>
  )

  return (
    <div
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !guardando) onClose()
      }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1080, backgroundColor: sombras.backdrop,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="gestion-cupones-titulo"
        style={{
          width: 'min(100%, 1080px)', maxHeight: '92vh', overflow: 'hidden',
          backgroundColor: colores.tarjeta, borderRadius: radios.lg,
          boxShadow: '0 20px 60px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column'
        }}>
        <header className="d-flex align-items-center justify-content-between gap-3"
          style={{ padding: '18px 22px', borderBottom: `1px solid ${colores.borde}` }}>
          <div className="d-flex align-items-center gap-2">
            <FiTag color={colores.primario} size={20} />
            <div>
              <h2 id="gestion-cupones-titulo" style={{ margin: 0, fontSize: '19px', color: colores.primario }}>
                Gestión de cupones
              </h2>
              <small style={{ color: colores.textoSuave }}>Los cambios se guardan en la API de NEXDINE.</small>
            </div>
          </div>
          <button type="button" className="btn btn-link" aria-label="Cerrar gestión de cupones"
            onClick={onClose} disabled={guardando}>
            <FiX size={22} />
          </button>
        </header>

        <div style={{ padding: '18px 22px', overflowY: 'auto' }}>
          {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
          {exito && <div className="alert alert-success py-2" role="status">{exito}</div>}

          <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
            <h3 style={{ color: colores.texto, fontSize: '16px', fontWeight: 700, margin: 0 }}>Cupones registrados</h3>
            <div className="d-flex gap-2">
              <button type="button" className="btn" style={btnGhost} onClick={cargarCupones} disabled={cargando}>
                <FiRefreshCw className="me-1" /> Actualizar
              </button>
              <button type="button" className="btn" style={btnPrimario} onClick={iniciarCreacion}>
                <FiPlus className="me-1" /> Nuevo cupón
              </button>
            </div>
          </div>

          {cargando ? (
            <div className="text-center p-4" role="status">Cargando cupones...</div>
          ) : cupones.length === 0 ? (
            <div style={{ ...tarjeta, padding: '24px', textAlign: 'center', color: colores.textoSuave }}>
              No hay cupones registrados.
            </div>
          ) : (
            <div style={{ ...tarjeta, overflowX: 'auto' }}>
              <table className="table table-hover align-middle mb-0" style={{ minWidth: '850px' }}>
                <thead>
                  <tr>
                    <th>Código</th><th>Descuento</th><th>Compra mínima</th>
                    <th>Vigencia</th><th>Usos</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cupones.map(cupon => {
                    const estado = estadoCupon(cupon)
                    const badge = estado === 'Activo'
                      ? { background: colores.exitoFondo, color: colores.exitoTexto }
                      : estado === 'Pendiente'
                        ? { background: colores.advertenciaFondo, color: colores.advertenciaTexto }
                        : estado === 'Expirado'
                          ? { background: colores.errorFondo, color: colores.errorTexto }
                          : { background: colores.superficie, color: colores.textoSuave }
                    return (
                      <tr key={cupon.id}>
                        <td><strong>{cupon.codigo}</strong></td>
                        <td>{cupon.tipo === 'PORCENTAJE' ? `${cupon.valor}%` : `$${cupon.valor}`}</td>
                        <td>${cupon.montoMinimo ?? 0}</td>
                        <td>
                          <small>
                            {cupon.fechaInicio ? new Date(cupon.fechaInicio).toLocaleString('es-CO') : 'Sin inicio'}
                            <br />
                            {cupon.fechaFin ? new Date(cupon.fechaFin).toLocaleString('es-CO') : 'Sin expiración'}
                          </small>
                        </td>
                        <td>{cupon.usos ?? 0}{cupon.usoMaximo == null ? ' / ∞' : ` / ${cupon.usoMaximo}`}</td>
                        <td>
                          <span style={{
                            display: 'inline-flex', padding: '4px 9px', borderRadius: radios.full,
                            fontSize: '11px', fontWeight: 700, ...badge
                          }}>{estado}</span>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button type="button" className="btn btn-sm" title="Editar cupón"
                              style={btnGhost} onClick={() => iniciarEdicion(cupon)}>
                              <FiEdit2 />
                            </button>
                            <button type="button" className="btn btn-sm" title={cupon.activo ? 'Desactivar cupón' : 'Activar cupón'}
                              style={{ ...btnGhost, color: cupon.activo ? colores.error : colores.secundario }}
                              disabled={cambiandoId === cupon.id}
                              onClick={() => cambiarEstado(cupon)}>
                              <FiPower />
                            </button>
                            {Number(cupon.usos || 0) === 0 && (
                              <button type="button" className="btn btn-sm" title="Eliminar cupón sin historial"
                                style={{ ...btnGhost, color: colores.error }}
                                disabled={cambiandoId === cupon.id}
                                onClick={() => eliminar(cupon)}>
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {contenidoFormulario}
          <p className="small mt-3 mb-0" style={{ color: colores.textoSuave }}>
            Solo se pueden eliminar cupones sin historial asociado. Los cupones utilizados deben desactivarse
            para impedir nuevos usos sin alterar los pedidos anteriores.
          </p>
        </div>
      </section>
    </div>
  )
}

export default GestionCupones
