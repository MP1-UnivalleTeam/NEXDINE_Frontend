import api from './api.js'

/**
 * Registro público de clientes.
 *
 * Contrato preparado para el endpoint de autorregistro. Mientras el backend
 * no lo exponga, la respuesta será 404 y la pantalla mostrará que el registro
 * en línea no está habilitado. Nunca se guardan credenciales en el navegador.
 */
export async function registrarCliente(datos) {
  const params = new URLSearchParams()
  params.append('nombre', datos.nombre)
  params.append('correo', datos.correo)
  params.append('celular', datos.celular)
  params.append('direccion', datos.direccion)
  params.append('contraseña', datos.contrasena)

  const response = await api.post('/api/clientes/registro', params)
  return response.data
}
