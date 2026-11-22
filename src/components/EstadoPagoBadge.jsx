import { FiCheckCircle, FiClock, FiDollarSign, FiXCircle } from 'react-icons/fi'
import { estiloBadge } from '../styles/tokens.js'
import { infoEstadoPago, normalizarEstadoPago } from '../utils/pagos.js'

function IconoEstado({ estado }) {
  const clave = normalizarEstadoPago(estado)
  if (clave === 'APROBADO') return <FiCheckCircle size={12} />
  if (clave === 'RECHAZADO' || clave === 'CANCELADO') return <FiXCircle size={12} />
  if (clave === 'PENDIENTE') return <FiClock size={12} />
  return <FiDollarSign size={12} />
}

function EstadoPagoBadge({ estado, conIcono = true, titulo = '' }) {
  const info = infoEstadoPago(estado)
  return (
    <span style={estiloBadge(info.fondo, info.texto)} title={titulo || info.etiqueta} aria-live="polite">
      {conIcono && <IconoEstado estado={estado} />}
      {info.etiqueta}
    </span>
  )
}

export default EstadoPagoBadge
