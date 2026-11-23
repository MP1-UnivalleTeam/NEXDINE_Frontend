import api from './api.js'

/**
 * Registro público de clientes.
 *
 * Usa el endpoint real de autorregistro del servicio de autenticación.
 * El servicio crea la cuenta y deja la sesión iniciada como cliente.
 */
export async function registrarCliente(datos) {
  const response = await api.post('/api/auth/register', {
    nombre: datos.nombre,
    contrasena: datos.contrasena,
    celular: datos.celular,
    direccion: datos.direccion,
    correo: datos.correo
  })
  return response.data
}
