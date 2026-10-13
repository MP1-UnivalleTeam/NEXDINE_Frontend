import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const CarritoContext = createContext(null)

const STORAGE_KEY = 'nexdine_carrito'

function cargarDeStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { items: [], cupon: null, propina: { tipo: 'ninguna', valor: 0 } }
    const data = JSON.parse(raw)
    return {
      items: Array.isArray(data.items) ? data.items : [],
      cupon: data.cupon || null,
      propina: data.propina || { tipo: 'ninguna', valor: 0 }
    }
  } catch {
    return { items: [], cupon: null, propina: { tipo: 'ninguna', valor: 0 } }
  }
}

export function CarritoProvider({ children }) {
  const [state, setState] = useState(cargarDeStorage)

  const guardarEnStorage = useCallback((nuevoState) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nuevoState))
    } catch { /* storage lleno o no disponible */ }
  }, [])

  const agregarItem = useCallback((producto, opciones = [], cantidad = 1) => {
    if (!producto || cantidad < 1) return

    const precioUnitario = producto.precio || 0
    const adicionalOpciones = opciones.reduce((sum, o) => sum + (o.precio || 0), 0)

    setState(prev => {
      const key = `${producto.id}-${JSON.stringify(opciones.map(o => o.id).sort())}`
      const existente = prev.items.find(i => i.key === key)
      let newItems
      if (existente) {
        newItems = prev.items.map(i => i.key === key ? { ...i, cantidad: i.cantidad + cantidad } : i)
      } else {
        newItems = [...prev.items, { key, producto, opciones, cantidad, precioUnitario, adicionalOpciones }]
      }
      const newState = { ...prev, items: newItems }
      guardarEnStorage(newState)
      return newState
    })
  }, [guardarEnStorage])

  const quitarItem = useCallback((key) => {
    setState(prev => {
      const newState = { ...prev, items: prev.items.filter(i => i.key !== key) }
      guardarEnStorage(newState)
      return newState
    })
  }, [guardarEnStorage])

  const actualizarCantidad = useCallback((key, cantidad) => {
    if (cantidad < 1) return
    setState(prev => {
      const newState = {
        ...prev,
        items: prev.items.map(i => i.key === key ? { ...i, cantidad } : i)
      }
      guardarEnStorage(newState)
      return newState
    })
  }, [guardarEnStorage])

  const vaciarCarrito = useCallback(() => {
    setState({ items: [], cupon: null, propina: { tipo: 'ninguna', valor: 0 } })
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const aplicarCupon = useCallback((codigo, descuento = 0) => {
    setState(prev => {
      const newState = { ...prev, cupon: { codigo, descuento } }
      guardarEnStorage(newState)
      return newState
    })
  }, [guardarEnStorage])

  const quitarCupon = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, cupon: null }
      guardarEnStorage(newState)
      return newState
    })
  }, [guardarEnStorage])

  const setPropina = useCallback((nuevaPropina) => {
    setState(prev => {
      const newState = { ...prev, propina: nuevaPropina }
      guardarEnStorage(newState)
      return newState
    })
  }, [guardarEnStorage])

  const totalItems = useMemo(
    () => state.items.reduce((sum, i) => sum + i.cantidad, 0),
    [state.items]
  )

  const subtotal = useMemo(
    () => state.items.reduce((sum, i) => sum + (i.precioUnitario + i.adicionalOpciones) * i.cantidad, 0),
    [state.items]
  )

  const value = {
    items: state.items,
    cupon: state.cupon,
    propina: state.propina,
    tipoServicio: state.tipoServicio,
    totalItems,
    subtotal,
    agregarItem,
    quitarItem,
    actualizarCantidad,
    vaciarCarrito,
    aplicarCupon,
    quitarCupon,
    setPropina
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
