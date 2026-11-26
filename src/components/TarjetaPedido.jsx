import { useState } from 'react'
import { FiCheckCircle, FiClock, FiCreditCard, FiXCircle, FiUser, FiPhone, FiMapPin, FiHash, FiFileText } from 'react-icons/fi'
import ModalFactura from './ModalFactura.jsx'
import ModalCancelarPedido from './ModalCancelarPedido.jsx'
import { colores, tarjeta, radios, btnPrimario, btnGhost, estiloBadge, cifrasTabulares } from '../styles/tokens.js'
import { formatearDinero } from '../utils/dinero.js'
import EstadoPagoBadge from './EstadoPagoBadge.jsx'
import { estaPagado } from '../utils/pagos.js'
import {
  infoEstado,
  normalizarEstado,
  etiquetaTipoServicio,
  siguienteEstado,
  esEstadoFinal,
  contarProductos
} from '../utils/pedidos.js'

function TarjetaPedido({
  pedido,
  nombreMesa = '',
  onCambiarEstado,
  onGestionarPago,
  actualizando = false,
  permitirAcciones = false,
  permitirCancelar = true,
  siguientePersonalizado,
  compacto = false,
  permitirFactura
}) {
  const [modalFactura, setModalFactura] = useState(false)
  const [modalCancelar, setModalCancelar] = useState(false)
  if (!pedido) return null

  const estado = infoEstado(pedido.estado)
  const siguiente = siguientePersonalizado !== undefined
    ? siguientePersonalizado
    : siguienteEstado(pedido.estado)
  const items = Array.isArray(pedido.items) ? pedido.items : []
  const finalizado = esEstadoFinal(pedido.estado)
  const cancelado = normalizarEstado(pedido.estado) === 'CANCELADO'
  const pagado = estaPagado(pedido.pagoEstado)
  const totalProductos = contarProductos(pedido)
  const estadoClave = normalizarEstado(pedido.estado)
  // La factura se habilita cuando el pedido está listo (o ya entregado).
  const puedeFacturar = (permitirFactura ?? permitirAcciones)
    && (estadoClave === 'LISTO' || estadoClave === 'ENTREGADO')
  // RF009: solo se cancela antes de pasar a preparación.
  const cancelable = pedido.cancelable ?? (estadoClave === 'PENDIENTE' || estadoClave === 'CONFIRMADO')

  const cambiar = (nuevoEstado) => {
    if (actualizando || !onCambiarEstado) return
    if (nuevoEstado === 'CANCELADO') {
      setModalCancelar(true)
      return
    }
    onCambiarEstado(pedido, nuevoEstado)
  }

  return (
    <article style={{ ...tarjeta, padding: compacto ? '16px' : '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            color: colores.textoSuave, fontSize: '12px', fontWeight: 600
          }}>
            <FiHash size={13} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pedido.numeroSeguimiento || pedido.id}
            </span>
          </div>
          <div style={{ color: colores.texto, fontWeight: 700, fontSize: compacto ? '14px' : '16px', marginTop: '3px' }}>
            {etiquetaTipoServicio(pedido.tipoServicio)}
            {nombreMesa ? ` · ${nombreMesa}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
          <span style={estiloBadge(estado.fondo, estado.texto)} aria-live="polite">
            {estado.valor === 'EN_PREPARACION' || estado.valor === 'PENDIENTE'
              ? <FiClock size={12} />
              : estado.valor === 'CANCELADO'
                ? <FiXCircle size={12} />
                : <FiCheckCircle size={12} />}
            {estado.etiqueta}
          </span>
          <EstadoPagoBadge estado={pedido.pagoEstado} />
        </div>
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '6px 14px',
        color: colores.textoSuave, fontSize: '12.5px', marginBottom: '10px'
      }}>
        {pedido.nombre && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
            <FiUser size={13} /> {pedido.nombre}
          </span>
        )}
        {pedido.telefono && pedido.telefono !== 'N/A' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <FiPhone size={13} /> {pedido.telefono}
          </span>
        )}
        {pedido.tipoServicio === 'DOMICILIO' && pedido.direccion && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
            <FiMapPin size={13} /> {pedido.direccion}
          </span>
        )}
      </div>

      <div style={{
        backgroundColor: colores.superficie,
        borderRadius: radios.md,
        padding: '10px 12px',
        marginBottom: '12px',
        flex: 1
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: '11px', fontWeight: 700, color: colores.textoSuave,
          textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px'
        }}>
          <span>Productos</span>
          <span>{totalProductos}</span>
        </div>
        {items.length === 0 ? (
          <small style={{ color: colores.textoSuave }}>Sin productos registrados.</small>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {items.map(item => (
              <li key={item.id} style={{ fontSize: '12.5px', color: colores.texto }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ minWidth: 0 }}>
                    <strong>{Number(item.cantidad) || 0}x</strong> {item.nombre || 'Producto'}
                  </span>
                  <span className="tnum" style={{ whiteSpace: 'nowrap', ...cifrasTabulares }}>
                    {formatearDinero(item.importe)}
                  </span>
                </div>
                {Array.isArray(item.personalizaciones) && item.personalizaciones.length > 0 && (
                  <small style={{ color: colores.textoSuave }}>{item.personalizaciones.join(', ')}</small>
                )}
                {item.observaciones && (
                  <small style={{ color: colores.textoSuave, display: 'block' }}>{item.observaciones}</small>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="tnum" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px', ...cifrasTabulares }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: colores.textoSuave }}>Subtotal</span>
          <span style={{ color: colores.texto }}>{formatearDinero(pedido.subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: colores.textoSuave }}>
            Impuestos{Number(pedido.tasaImpuesto) > 0 ? ` (${pedido.tasaImpuesto}%)` : ''}
          </span>
          <span style={{ color: colores.texto }}>{formatearDinero(pedido.impuestos)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: colores.textoSuave }}>Propina</span>
          <span style={{ color: colores.texto }}>{formatearDinero(pedido.propina)}</span>
        </div>
        {Number(pedido.descuento) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: colores.exitoTexto }}>
            <span>Descuento</span>
            <span>-{formatearDinero(pedido.descuento)}</span>
          </div>
        )}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderTop: `1px solid ${colores.borde}`, paddingTop: '7px', marginTop: '3px'
        }}>
          <strong style={{ color: colores.texto }}>Total</strong>
          <strong style={{ color: colores.primario, fontSize: '17px' }}>{formatearDinero(pedido.total)}</strong>
        </div>
      </div>

      {onGestionarPago && !cancelado && (
        <button
          type="button"
          className="btn w-100"
          onClick={() => onGestionarPago(pedido)}
          style={{ ...btnGhost, minHeight: '40px', fontSize: '13px', marginTop: '12px' }}
        >
          <FiCreditCard style={{ marginRight: '6px' }} />
          {pagado ? 'Ver pago' : 'Gestionar pago'}
        </button>
      )}

      {puedeFacturar && (
        <button
          type="button"
          className="btn w-100"
          onClick={() => setModalFactura(true)}
          style={{
            ...btnGhost, minHeight: '40px', fontSize: '13px', marginTop: '12px',
            color: colores.primario, borderColor: colores.primario
          }}
        >
          <FiFileText style={{ marginRight: '6px' }} />
          Generar factura
        </button>
      )}

      {cancelado && pedido.motivoCancelacion && (
        <small style={{ color: colores.errorTexto, display: 'block', marginTop: '10px' }}>
          Motivo de anulación: {pedido.motivoCancelacion}
        </small>
      )}

      {permitirAcciones && !finalizado && (siguiente || (permitirCancelar && cancelable)) && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          {siguiente && (
            <button
              type="button"
              className="btn flex-grow-1"
              disabled={actualizando}
              onClick={() => cambiar(siguiente)}
              style={{ ...btnPrimario, minHeight: '40px', fontSize: '13px' }}
            >
              <FiCheckCircle style={{ marginRight: '5px' }} />
              {actualizando ? 'Actualizando…' : `Pasar a ${infoEstado(siguiente).etiqueta.toLowerCase()}`}
            </button>
          )}
          {permitirCancelar && cancelable && (
            <button
              type="button"
              className="btn"
              disabled={actualizando}
              onClick={() => cambiar('CANCELADO')}
              style={{ ...btnGhost, minHeight: '40px', fontSize: '13px', color: colores.errorTexto }}
            >
              <FiXCircle style={{ marginRight: '5px' }} /> Cancelar
            </button>
          )}
        </div>
      )}

      {actualizando && (
        <small role="status" style={{ color: colores.textoSuave, marginTop: '8px' }}>
          Guardando el nuevo estado…
        </small>
      )}
      {modalFactura && (
        <ModalFactura pedido={pedido} onCerrar={() => setModalFactura(false)} />
      )}
      {modalCancelar && (
        <ModalCancelarPedido
          pedido={pedido}
          pagado={pagado || String(pedido.pagoEstado).toUpperCase() === 'PARCIAL'}
          onCerrar={() => setModalCancelar(false)}
          onConfirmar={async (motivo) => {
            setModalCancelar(false)
            await onCambiarEstado(pedido, 'CANCELADO', motivo)
          }}
        />
      )}
    </article>
  )
}

export default TarjetaPedido
