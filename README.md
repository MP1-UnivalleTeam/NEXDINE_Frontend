# NexDine Frontend

Sistema de Gestión de Restaurantes - Frontend

## Tecnologías

- React 18
- Vite 5
- React Router 6
- Axios
- Bootstrap 5.3.0
- Font Awesome 6.4.0

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
cd frontend
npm install
```

## Ejecución

```bash
npm run dev
```

El frontend estará disponible en `http://localhost:5173`

## Build

```bash
npm run build
```

Los archivos de producción se generan en `dist/`

## Variables de Entorno

Crea un archivo `.env` en la carpeta `frontend/` basándote en `.env.example`:

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `VITE_API_URL` | URL del backend Spring Boot | http://localhost:8080 |

## Despliegue en Vercel

1. Conecta el repositorio a Vercel
2. Configura la variable de entorno `VITE_API_URL` con la URL del backend
3. Vercel detectará automáticamente Vite y ejecutará `npm run build`

## Estructura

```
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   │   ├── Login.jsx
│   │   └── Dashboard.jsx
│   ├── services/
│   │   └── api.js
│   ├── App.jsx
│   └── main.jsx
├── public/
├── package.json
├── vite.config.js
└── .env.example
```

## Backend

El backend Spring Boot se encuentra en la carpeta `../backend/`
