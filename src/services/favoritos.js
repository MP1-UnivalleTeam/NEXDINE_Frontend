import api from './api.js'

export async function listarFavoritos() {
  const response = await api.get('/api/clientes/favoritos')
  return response.data
}

export async function agregarFavorito(productoId) {
  const response = await api.post(`/api/clientes/favoritos/${productoId}`)
  return response.data
}

export async function eliminarFavorito(productoId) {
  await api.delete(`/api/clientes/favoritos/${productoId}`)
}
