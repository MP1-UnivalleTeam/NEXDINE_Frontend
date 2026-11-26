import api from './api.js'

/** RF029: perfil del usuario que inició sesión. */
export async function obtenerPerfil() {
  const response = await api.get('/api/perfil')
  return response.data
}

export async function actualizarPerfil(datos) {
  const response = await api.put('/api/perfil', datos)
  return response.data
}

export async function subirFotoPerfil(archivo) {
  const datos = new FormData()
  datos.append('archivo', archivo)
  const response = await api.post('/api/perfil/foto', datos)
  return response.data
}

export async function quitarFotoPerfil() {
  const response = await api.delete('/api/perfil/foto')
  return response.data
}
