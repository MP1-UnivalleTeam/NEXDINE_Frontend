import { FiCheckCircle } from 'react-icons/fi'
import { colores, tarjeta } from '../styles/tokens.js'

/**
 * RF003 — Seleccionar tipo de servicio.
 *
 * Componente reutilizable y sin efectos secundarios:
 * solo presenta las opciones y notifica la confirmación.
 * La validación real de valores vive en el backend.
 */

export const TIPOS_SERVICIO = {
  DOMICILIO: 'DOMICILIO',
  PARA_LLEVAR: 'PARA_LLEVAR'
}

const OPCIONES = [
  { valor: TIPOS_SERVICIO.DOMICILIO, etiqueta: 'Domicilio', icono: 'fa-house' },
  { valor: TIPOS_SERVICIO.PARA_LLEVAR, etiqueta: 'Para llevar', icono: 'fa-bag-shopping' }
]

function SelectorTipoServicio({ seleccionado, onConfirmar, error }) {
  return (
    <div
      className="card mb-4"
      style={tarjeta}
    >
      <div className="card-body">
        <h5 className="mb-3">
          <i className="fa-solid fa-concierge-bell me-2" style={{ color: colores.primario }}></i>
          Tipo de servicio
        </h5>

        <div className="row g-2">
          {OPCIONES.map((opcion) => (
            <div className="col-md-6" key={opcion.valor}>
              <label
                className="d-flex align-items-center gap-2 p-3 border rounded"
                style={{
                  cursor: 'pointer',
                  borderColor: seleccionado === opcion.valor ? colores.primario : colores.borde,
                  backgroundColor: seleccionado === opcion.valor ? colores.mint : colores.tarjeta
                }}
              >
                <input
                  type="radio"
                  name="tipoServicio"
                  className="form-check-input mt-0"
                  value={opcion.valor}
                  checked={seleccionado === opcion.valor}
                  onChange={() => onConfirmar(opcion.valor)}
                  disabled={!!error}
                />
                <span>
                  <i className={`fa-solid ${opcion.icono} me-2 text-muted`}></i>
                  {opcion.etiqueta}
                </span>
              </label>
            </div>
          ))}
        </div>

        {seleccionado && !error && (
          <div className="alert alert-success d-flex align-items-center py-2 small mt-3 mb-0" role="alert">
            <FiCheckCircle style={{ marginRight: '6px' }} />
            <div>
              Servicio seleccionado:{' '}
              <strong>
                {OPCIONES.find((o) => o.valor === seleccionado)?.etiqueta}
              </strong>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger py-2 small mt-3 mb-0" role="alert">
            {error}
          </div>
        )}

        <small className="text-muted d-block mt-2">
          Esta selección se usará al realizar su pedido.
        </small>
      </div>
    </div>
  )
}

export default SelectorTipoServicio