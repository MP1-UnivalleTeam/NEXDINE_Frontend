import { listarPedidosActivos, actualizarEstadoPedido } from './pedidos.js'

/**
 * Vistas por tipo de servicio.
 *
 * El backend no expone endpoints separados por servicio: todos los pedidos
 * activos se consultan con `/api/pedidos/activos` y se filtran aquí. Las
 * actualizaciones de estado usan el endpoint real de pedidos.
 */

const ESTADOS_COCINA = ['CONFIRMADO', 'EN_PREPARACION']

function normalizar(valor) {
  return String(valor || '').trim().toUpperCase()
}

function filtrar(pedidos, { estado, pagoEstado, cliente, sucursalId, tipoServicio, estados } = {}) {
  return (Array.isArray(pedidos) ? pedidos : []).filter(pedido => {
    if (estado && normalizar(pedido.estado) !== normalizar(estado)) return false
    if (estados && !estados.includes(normalizar(pedido.estado))) return false
    if (pagoEstado && normalizar(pedido.pagoEstado) !== normalizar(pagoEstado)) return false
    if (tipoServicio && normalizar(pedido.tipoServicio) !== tipoServicio) return false
    if (sucursalId && pedido.sucursalId !== sucursalId) return false
    if (cliente) {
      const texto = String(cliente).toLowerCase()
      const coincide = [pedido.nombre, pedido.telefono, pedido.numeroSeguimiento]
        .filter(Boolean)
        .some(valor => String(valor).toLowerCase().includes(texto))
      if (!coincide) return false
    }
    return true
  })
}

export async function listarPedidosCocina(filtros = {}) {
  const pedidos = await listarPedidosActivos()
  return filtrar(pedidos, { ...filtros, estados: ESTADOS_COCINA })
}

export async function actualizarEstadoCocina(pedidoId, estado) {
  return actualizarEstadoPedido(pedidoId, estado)
}

export async function listarPedidosParaLlevar(filtros = {}) {
  const pedidos = await listarPedidosActivos()
  return filtrar(pedidos, { ...filtros, tipoServicio: 'PARA_LLEVAR' })
}

export async function listarPedidosDomicilio(filtros = {}) {
  const pedidos = await listarPedidosActivos()
  return filtrar(pedidos, { ...filtros, tipoServicio: 'DOMICILIO' })
}

export async function obtenerPedidoParaLlevar(pedidoId) {
  const pedidos = await listarPedidosParaLlevar()
  return pedidos.find(pedido => pedido.id === pedidoId) || null
}

export async function obtenerPedidoDomicilio(pedidoId) {
  const pedidos = await listarPedidosDomicilio()
  return pedidos.find(pedido => pedido.id === pedidoId) || null
}
