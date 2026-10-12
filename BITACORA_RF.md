# Bitácora de Cambios — Frontend NexDine

**Fecha:** 2026-10-12
**RFs implementados:** RF031, RF020, RF034, RF036, RF039, RF052

---

## Archivos creados

| Archivo | RF | Descripción |
|---------|----|----|
| `src/context/CarritoContext.jsx` | Global | Estado global del carrito |
| `src/services/pedidos.js` | Global | APIs de pedidos, cupones, sugerencias |
| `src/components/ModalPersonalizacion.jsx` | RF020 | Modal para personalizar productos |
| `src/components/Sugerencias.jsx` | RF034 | Productos sugeridos |
| `src/components/CuponDescuento.jsx` | RF036 | Aplicar cupón de descuento |
| `src/components/SelectorPropina.jsx` | RF039 | Selector de propina |
| `src/pages/Carrito.jsx` | RF034, RF036, RF039 | Carrito con resumen |
| `src/pages/PedidoInvitado.jsx` | RF031 | Formulario de pedido sin login |
| `src/pages/ResumenPedido.jsx` | RF052 | Resumen detallado del pedido |

## Archivos modificados

| Archivo | RF | Cambio |
|---------|----|----|
| `src/pages/Menu.jsx` | RF020, RF034 | Modal de personalización + sugerencias + botón carrito |
| `src/App.jsx` | Global | CarritoProvider + rutas /carrito, /pedido, /resumen/:pedidoId |

---

## Detalle por RF

### RF031 — Pedido como invitado
- Formulario con nombre, teléfono, tipo de servicio, dirección
- Validaciones obligatorias antes de enviar
- Confirmación con número de seguimiento
- No requiere login ni accede a datos privados

### RF020 — Personalizar producto
- Modal con opciones agrupadas (ingredientes, extras, tamaño)
- Precio dinámico en tiempo real
- Se muestra en el carrito con las opciones seleccionadas

### RF034 — Sugerir productos
- Sección "También te puede gustar" en menú y carrito
- Botón agregar sin perder estado del carrito
- Estado vacío cuando no hay sugerencias

### RF036 — Aplicar cupón
- Campo de código + botón Aplicar/Retirar
- Mensajes de error claros
- Desglose actualizado con descuento

### RF039 — Añadir propina
- Opciones: 5%, 10%, 15%, valor personalizado, sin propina
- Actualización inmediata del total
- Se muestra en el resumen

### RF052 — Resumen detallado
- Vista completa con productos, cantidades, personalizaciones
- Desglose: subtotal, descuento, cargos, propina, impuestos, total
- Botón volver a editar sin perder datos

---

## Heurísticas de Nielsen aplicadas

| Heurística | Aplicación |
|------------|------------|
| Visibilidad del estado | Loading, errores, totales siempre visibles |
| Coincidencia con el mundo real | Lenguaje de restaurante, opciones claras |
| Control y libertad | Volver, cancelar, quitar items, vaciar carrito |
| Consistencia | Mismos colores (#1a3c34), cards, modales |
| Prevención de errores | Validaciones antes de enviar, confirmaciones |
| Reconocimiento sobre recuerdo | Opciones visibles, resumen siempre presente |
| Eficiencia de uso | Flujos cortos, botones claros |
| Diseño minimalista | Sin elementos innecesarios |
| Ayuda al usuario | Mensajes de error comprensibles |
| Documentación | Tooltips y textos de ayuda inline |

---

## Endpoints del backend requeridos

| Método | Ruta | Uso |
|--------|------|-----|
| POST | `/api/pedidos/invitado` | Crear pedido sin cuenta |
| GET | `/api/productos/:id/opciones` | Opciones de personalización |
| GET | `/api/sugerencias?productoId={id}` | Productos sugeridos |
| POST | `/api/cupones/validar` | Validar cupón |
| GET | `/api/pedidos/:id/resumen` | Resumen del pedido |

---

## Pruebas

| Prueba | Resultado |
|--------|-----------|
| `npm run build` | PASS |
| Diseño consistente | PASS |
| Heurísticas de Nielsen | PASS |
