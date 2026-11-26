/**
 * Mapa de navegación por rol: una sola fuente para el menú lateral, la
 * pantalla de inicio de cada rol y los permisos de las rutas.
 *
 * Cada rol ve solo los módulos de su trabajo, agrupados por tarea
 * (Operación, Ventas, Catálogo, Administración), como en los POS comerciales.
 */

export const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  ADMINISTRADOR: 'ADMINISTRADOR',
  MESERO: 'MESERO',
  COCINERO: 'COCINERO',
  CLIENTE: 'CLIENTE'
}

const ADMINS = [ROLES.SUPERADMIN, ROLES.ADMINISTRADOR]
const SALA = [...ADMINS, ROLES.MESERO]
const COCINA = [...ADMINS, ROLES.COCINERO]
export const TODOS_LOS_ROLES = Object.values(ROLES)

/** Módulos del sistema. `roles` decide quién lo ve y quién puede entrar. */
export const MODULOS = {
  inicio: { ruta: '/inicio', etiqueta: 'Panel del día', icono: 'fa-gauge-high', roles: ADMINS, descripcion: 'Resumen de ventas y pedidos de hoy' },
  pedidos: { ruta: '/pedidos', etiqueta: 'Pedidos activos', icono: 'fa-receipt', roles: SALA, descripcion: 'Todos los pedidos en curso' },
  mesas: { ruta: '/mesas', etiqueta: 'Mesas', icono: 'fa-chair', roles: SALA, descripcion: 'Estado de las mesas y pedidos en sala' },
  paraLlevar: { ruta: '/para-llevar', etiqueta: 'Para llevar', icono: 'fa-bag-shopping', roles: SALA, descripcion: 'Pedidos para recoger' },
  domicilios: { ruta: '/domicilios', etiqueta: 'Domicilios', icono: 'fa-motorcycle', roles: SALA, descripcion: 'Pedidos a domicilio' },
  cocina: { ruta: '/cocina', etiqueta: 'Cocina', icono: 'fa-fire-burner', roles: COCINA, descripcion: 'Comandas por preparar' },
  reportes: { ruta: '/reportes', etiqueta: 'Reportes', icono: 'fa-chart-line', roles: ADMINS, descripcion: 'Ventas por periodo y exportación' },
  reembolsos: { ruta: '/reembolsos', etiqueta: 'Reembolsos', icono: 'fa-rotate-left', roles: ADMINS, descripcion: 'Devoluciones de pedidos cancelados' },
  productos: { ruta: '/productos', etiqueta: 'Productos', icono: 'fa-utensils', roles: ADMINS, descripcion: 'Carta, precios y disponibilidad' },
  usuarios: { ruta: '/dashboard', etiqueta: 'Usuarios', icono: 'fa-users', roles: ADMINS, descripcion: 'Personal y cuentas' },
  sucursales: { ruta: '/sucursales', etiqueta: 'Sucursales', icono: 'fa-store', roles: [ROLES.SUPERADMIN], descripcion: 'Sedes del restaurante' },
  horarios: { ruta: '/horarios', etiqueta: 'Horarios', icono: 'fa-clock', roles: ADMINS, descripcion: 'Horario de atención' },
  impuestos: { ruta: '/impuestos', etiqueta: 'Impuestos', icono: 'fa-percent', roles: [ROLES.SUPERADMIN], descripcion: 'Tasa de impuesto' },
  recordatorios: { ruta: '/recordatorios', etiqueta: 'Recordatorios', icono: 'fa-bell', roles: ADMINS, descripcion: 'Avisos automáticos' },
  menu: { ruta: '/menu', etiqueta: 'Ver menú', icono: 'fa-book-open', roles: [ROLES.CLIENTE], descripcion: 'Carta del restaurante' },
  misPedidos: { ruta: '/mis-pedidos', etiqueta: 'Mis pedidos', icono: 'fa-clock-rotate-left', roles: [ROLES.CLIENTE], descripcion: 'Historial de tus pedidos' },
  favoritos: { ruta: '/favoritos', etiqueta: 'Favoritos', icono: 'fa-heart', roles: [ROLES.CLIENTE], descripcion: 'Productos guardados' },
  perfil: { ruta: '/perfil', etiqueta: 'Mi perfil', icono: 'fa-user-gear', roles: TODOS_LOS_ROLES, descripcion: 'Foto, tema y datos de contacto' }
}

/** Secciones del menú lateral, en orden. Solo se muestran las que tienen módulos para el rol. */
const SECCIONES = [
  { titulo: null, modulos: ['inicio'] },
  { titulo: 'Operación', modulos: ['mesas', 'pedidos', 'paraLlevar', 'domicilios', 'cocina'] },
  { titulo: 'Pedir', modulos: ['menu', 'misPedidos', 'favoritos'] },
  { titulo: 'Ventas', modulos: ['reportes', 'reembolsos'] },
  { titulo: 'Catálogo', modulos: ['productos'] },
  { titulo: 'Administración', modulos: ['usuarios', 'sucursales', 'horarios', 'impuestos', 'recordatorios'] }
]

/** Orden especial para roles operativos: su módulo principal va primero. */
const ORDEN_OPERACION = {
  MESERO: ['mesas', 'pedidos', 'paraLlevar', 'domicilios'],
  COCINERO: ['cocina']
}

export function menuParaRol(rol) {
  return SECCIONES
    .map(seccion => {
      const claves = seccion.titulo === 'Operación' && ORDEN_OPERACION[rol]
        ? ORDEN_OPERACION[rol]
        : seccion.modulos
      return {
        titulo: seccion.titulo,
        items: claves.map(clave => ({ clave, ...MODULOS[clave] })).filter(m => m.roles.includes(rol))
      }
    })
    .filter(seccion => seccion.items.length > 0)
}

/** Pantalla con la que empieza cada rol: lo que más usa en su turno. */
export function rutaInicio(rol) {
  if (rol === ROLES.CLIENTE) return '/menu'
  if (rol === ROLES.MESERO) return '/mesas'
  if (rol === ROLES.COCINERO) return '/cocina'
  if (ADMINS.includes(rol)) return '/inicio'
  return '/login'
}

/** Busca el módulo y la sección de una ruta (para el título y la miga de pan). */
export function ubicarRuta(ruta) {
  for (const seccion of SECCIONES) {
    for (const clave of seccion.modulos) {
      if (MODULOS[clave].ruta === ruta) return { seccion: seccion.titulo, modulo: MODULOS[clave] }
    }
  }
  if (ruta === MODULOS.perfil.ruta) return { seccion: 'Cuenta', modulo: MODULOS.perfil }
  return null
}

export const ETIQUETAS_ROL = {
  SUPERADMIN: 'Administrador general',
  ADMINISTRADOR: 'Administrador de sede',
  MESERO: 'Mesero',
  COCINERO: 'Cocina',
  CLIENTE: 'Cliente'
}
