/**
 * RF019 — Utilidades de búsqueda de productos sobre el menú.
 *
 * Funciones puras y sin estado para poder reutilizarlas tanto en el menú
 * como en el futuro módulo de pedidos, sin duplicar lógica de catálogo.
 *
 * La fuente de datos siempre son las categorías ya cargadas por el menú
 * (respeta disponibilidad, producto_sucursal y filtros vigentes).
 */

/**
 * Normaliza texto para comparar de forma tolerante:
 * minúsculas, sin acentos y con espacios colapsados.
 */
export function normalizar(texto) {
  if (texto === null || texto === undefined) return ''
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Indica si un producto coincide con el texto buscado.
 * Busca en nombre y descripción.
 */
export function coincideTexto(producto, textoBusqueda) {
  const criterio = normalizar(textoBusqueda)
  if (!criterio) return true

  return (
    normalizar(producto?.nombre).includes(criterio) ||
    normalizar(producto?.descripcion).includes(criterio)
  )
}

/**
 * Aplica los filtros de RF019 sobre las categorías del menú.
 *
 * @param {Array} categorias Categorías del menú (respeta disponibilidad)
 * @param {string} texto Texto de búsqueda
 * @param {string|null} categoriaId Categoría seleccionada; null = todas
 * @returns {Array} Categorías con solo los productos que coinciden
 */
export function filtrarMenu(categorias, texto, categoriaId) {
  if (!Array.isArray(categorias)) return []

  return categorias
    .map((categoria) => {
      const productos = (categoria.productos || []).filter((producto) => {
        //RF019: "tipo de comida" se resuelve con la categoría del modelo
        // actual. No se inventó un campo nuevo en Producto.
        if (categoriaId && String(categoria.nombre) !== String(categoriaId)) {
          return false
        }
        return coincideTexto(producto, texto)
      })

      return { ...categoria, productos }
    })
    .filter((categoria) => categoria.productos.length > 0)
}

/**
 * Cuenta los productos tras aplicar el filtro.
 */
export function contarProductos(categorias) {
  if (!Array.isArray(categorias)) return 0
  return categorias.reduce((total, c) => total + (c.productos?.length || 0), 0)
}

/**
 * Extrae la lista de categorías disponibles, para el selector.
 */
export function listarCategorias(categorias) {
  if (!Array.isArray(categorias)) return []
  return categorias.map((c) => c.nombre)
}