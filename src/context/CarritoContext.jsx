import { createContext, useContext, useState, useCallback } from 'react'

/**
 * Contexto global del carrito.
 *
 * Mantiene el estado del carrito entre páginas (Menú → Carrito → Resumen)
 * y aplica las heurísticas de Nielsen:
 *   · Visibilidad del estado: se puede ver siempre cuántos productos hay.
 *   · Control y libertad: se puede quitar productos o vaciar el carrito.
 *   · Consistencia: mismos precios y datos que muestra el Menú.
 *   · Prevención de errores: no se permiten cantidades inválidas.
 */
const CarritoContext = createContext(null)

export function CarritoProvider({ children }) {
  const [items, setItems] = useState([])
  const [cupon, setCupon] = useState(null)
  const [propina, setPropina] = useState({ tipo: 'ninguna', valor: 0 })
  const [tipoServicio, setTipoServicio] = useState(null)

  const agregarItem = useCallback((producto, opciones = [], cantidad = 1) => {
    if (!producto || cantidad < 1) return

    const precioUnitario = producto.precio
    const adicionalOpciones = opciones.reduce((sum, o) => sum + (o.precio || 0), 0)

    setItems(prev => {
      const key = `${producto.id}-${JSON.stringify(opciones.map(o => o.id).sort())}`
      const existente = prev.find(i => i.key === key)
      if (existente) {
        return prev.map(i => i.key === key ? { ...i, cantidad: i.cantidad + cantidad } : i)
      }
      return [...prev, {
        key,
        producto,
        opciones,
        cantidad,
        precioUnitario,
        adicionalOpciones
      }]
    })
  }, [])

  const quitarItem = useCallback((key) => {
    setItems(prev => prev.filter(i => i.key !== key))
  }, [])

  const actualizarCantidad = useCallback((key, cantidad) => {
    if (cantidad < 1) return
    setItems(prev => prev.map(i => i.key === key ? { ...i, cantidad } : i))
  }, [])

  const vaciarCarrito = useCallback(() => {
    setItems([])
    setCupon(null)
    setPropina({ tipo: 'ninguna', valor: 0 })
  }, [])

  const aplicarCupon = useCallback((codigo) => {
    setCupon({ codigo, descuento: 0 })
  }, [])

  const quitarCupon = useCallback(() => {
    setCupon(null)
  }, [])

  const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0)
  const subtotal = items.reduce((sum, i) => sum + (i.precioUnitario + i.adicionalOpciones) * i.cantidad, 0)

  const value = {
    items,
    cupon,
    propina,
    tipoServicio,
    totalItems,
    subtotal,
    agregarItem,
    quitarItem,
    actualizarCantidad,
    vaciarCarrito,
    aplicarCupon,
    quitarCupon,
    setPropina,
    setTipoServicio
  }

  return (
    <CarritoContext.Provider value={value}>
      {children}
    </CarritoContext.Provider>
  )
}

export function useCarrito() {
  const context = useContext(CarritoContext)
  if (!context) {
    throw new Error('useCarrito debe usarse dentro de CarritoProvider')
  }
  return context
}
