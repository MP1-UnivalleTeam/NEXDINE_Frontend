import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import {
  calcularTotales,
  redondearDinero,
  sumarDinero
} from '../utils/dinero.js'
import {
  guardarSucursal,
  obtenerSucursal,
  guardarTasaImpuesto,
  obtenerTasaImpuesto,
  guardarTipoServicio,
  obtenerTipoServicio
} from '../utils/contextoMenu.js'

const CarritoContext = createContext(null)

const STORAGE_KEY = 'nexdine_carrito'
const PROPINA_INICIAL = { tipo: 'ninguna', porcentaje: 0, valor: 0 }

function estadoInicial() {
  return {
    items: [],
    cupon: null,
    propina: PROPINA_INICIAL,
    tipoServicio: obtenerTipoServicio()
  }
}

function cargarDeStorage() {
  try {
    let raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        sessionStorage.setItem(STORAGE_KEY, raw)
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    if (!raw) return estadoInicial()
    const data = JSON.parse(raw)
    return {
      items: (Array.isArray(data.items) ? data.items : [])
        .filter(item => item?.key && item?.producto?.id)
        .map(item => ({
          ...item,
          opciones: Array.isArray(item.opciones) ? item.opciones : [],
          cantidad: Math.max(1, Math.trunc(Number(item.cantidad) || 1)),
          precioUnitario: redondearDinero(item.precioUnitario),
          adicionalOpciones: redondearDinero(item.adicionalOpciones)
        })),
      cupon: data.cupon || null,
      propina: data.propina || PROPINA_INICIAL,
      tipoServicio: obtenerTipoServicio()
    }
  } catch {
    return estadoInicial()
  }
}

export function CarritoProvider({ children }) {
  const [state, setState] = useState(cargarDeStorage)
  const [sucursal, setSucursalState] = useState(() => obtenerSucursal())
  const [tasaImpuesto, setTasaImpuestoState] = useState(() => obtenerTasaImpuesto())

  const guardarEnStorage = useCallback((nuevoState) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        items: nuevoState.items,
        cupon: nuevoState.cupon,
        propina: nuevoState.propina
      }))
    } catch {

    }
  }, [])

  const agregarItem = useCallback((producto, opciones = [], cantidad = 1) => {
    const cantidadEntera = Math.max(1, Math.trunc(Number(cantidad) || 1))
    if (!producto?.id) return

    const opcionesSeguras = Array.isArray(opciones) ? opciones : []
    const precioUnitario = redondearDinero(producto.precio || 0)
    const adicionalOpciones = sumarDinero(
      ...opcionesSeguras.map(opcion => opcion.precio ?? opcion.precioAdicional ?? 0)
    )
    const key = `${producto.id}-${JSON.stringify(opcionesSeguras.map(o => o.id).sort())}`

    setState(prev => {
      const existente = prev.items.find(i => i.key === key)
      let newItems
      if (existente) {
        newItems = prev.items.map(i => i.key === key
          ? { ...i, cantidad: i.cantidad + cantidadEntera }
          : i)
      } else {
        newItems = [...prev.items, {
          key,
          producto,
          opciones: opcionesSeguras,
          cantidad: cantidadEntera,
          precioUnitario,
          adicionalOpciones
        }]
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
    const cantidadEntera = Math.trunc(Number(cantidad) || 0)
    if (cantidadEntera < 1) return
    setState(prev => {
      const newState = {
        ...prev,
        items: prev.items.map(i => i.key === key ? { ...i, cantidad: cantidadEntera } : i)
      }
      guardarEnStorage(newState)
      return newState
    })
  }, [guardarEnStorage])

  const vaciarCarrito = useCallback(() => {
    setState(prev => {
      const newState = {
        ...prev,
        items: [],
        cupon: null,
        propina: PROPINA_INICIAL
      }
      guardarEnStorage(newState)
      return newState
    })
  }, [guardarEnStorage])

  const aplicarCupon = useCallback((datos, descuento = 0) => {
    const cupon = typeof datos === 'string'
      ? { codigo: datos, descuento }
      : { ...datos }
    if (!cupon?.codigo) return
    setState(prev => {
      const newState = { ...prev, cupon }
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
    const propina = nuevaPropina && typeof nuevaPropina === 'object'
      ? nuevaPropina
      : PROPINA_INICIAL
    setState(prev => {
      const newState = { ...prev, propina }
      guardarEnStorage(newState)
      return newState
    })
  }, [guardarEnStorage])

  const setTipoServicio = useCallback((tipo) => {
    guardarTipoServicio(tipo)
    setState(prev => ({ ...prev, tipoServicio: tipo || null }))
  }, [])

  const setSucursal = useCallback((nuevaSucursal) => {
    guardarSucursal(nuevaSucursal)
    setSucursalState(nuevaSucursal || null)
  }, [])

  const setTasaImpuesto = useCallback((tasa) => {
    const numero = Number(tasa)
    guardarTasaImpuesto(numero)
    setTasaImpuestoState(Number.isFinite(numero) ? numero : 0)
  }, [])

  const totales = useMemo(() => calcularTotales({
    items: state.items,
    cupon: state.cupon,
    propina: state.propina,
    tasaImpuesto
  }), [state.items, state.cupon, state.propina, tasaImpuesto])

  const cupon = useMemo(() => (
    state.cupon ? { ...state.cupon, descuento: totales.descuento } : null
  ), [state.cupon, totales.descuento])

  const propina = useMemo(() => ({
    ...PROPINA_INICIAL,
    ...state.propina,
    valor: totales.propina
  }), [state.propina, totales.propina])

  const value = {
    items: state.items,
    cupon,
    propina,
    tipoServicio: state.tipoServicio,
    sucursal,
    tasaImpuesto,
    totalItems: totales.totalItems,
    subtotal: totales.subtotal,
    descuento: totales.descuento,
    impuestos: totales.impuestos,
    total: totales.total,
    agregarItem,
    quitarItem,
    actualizarCantidad,
    vaciarCarrito,
    aplicarCupon,
    quitarCupon,
    setPropina,
    setTipoServicio,
    setSucursal,
    setTasaImpuesto
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
