import { tarjeta } from '../styles/tokens.js'

function SelectorSucursal({ sucursales = [], seleccionada = null, onSeleccionar }) {
  if (!sucursales.length) return null

  const handleChange = (evento) => {
    const sucursal = sucursales.find(item => String(item.id) === evento.target.value)
    if (onSeleccionar) onSeleccionar(sucursal || null)
  }

  return (
    <div className="card mb-3" style={tarjeta}>
      <div className="card-body">
        <label className="form-label small fw-semibold mb-2">Sucursal</label>
        <select
          className="form-select form-select-sm"
          value={seleccionada?.id || ''}
          onChange={handleChange}
        >
          <option value="">Seleccione una sucursal</option>
          {sucursales.map(sucursal => (
            <option key={sucursal.id} value={sucursal.id}>
              {sucursal.nombre}{sucursal.direccion ? ` — ${sucursal.direccion}` : ''}
            </option>
          ))}
        </select>
        {seleccionada && (
          <small className="text-muted d-block mt-2">
            <i className="fa-solid fa-location-dot me-1"></i>
            {seleccionada.nombre}
            {seleccionada.direccion ? ` · ${seleccionada.direccion}` : ''}
          </small>
        )}
      </div>
    </div>
  )
}

export default SelectorSucursal
