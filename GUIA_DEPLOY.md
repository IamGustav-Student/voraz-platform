# VORAZ Platform — Guía de Despliegue Completa

> **Documento técnico** para el desarrollador responsable del proyecto.
> Incluye configuración local, staging y producción en Railway + Vercel.

---

## Índice

1. [Arquitectura del sistema](#1-arquitectura-del-sistema)
2. [Requisitos previos](#2-requisitos-previos)
3. [Ejecución local (desarrollo)](#3-ejecución-local-desarrollo)
4. [Configurar variables de entorno](#4-configurar-variables-de-entorno)
5. [Sembrar la base de datos](#5-sembrar-la-base-de-datos)
6. [Despliegue del Backend en Railway](#6-despliegue-del-backend-en-railway)
7. [Despliegue del Frontend en Vercel](#7-despliegue-del-frontend-en-vercel)
8. [Configurar MercadoPago](#8-configurar-mercadopago)
9. [Configurar Google OAuth](#9-configurar-google-oauth)
10. [Verificación post-despliegue](#10-verificación-post-despliegue)
11. [Comandos útiles de mantenimiento](#11-comandos-útiles-de-mantenimiento)

---

## 1. Arquitectura del sistema

```
┌─────────────────────────────────────────────────────┐
│                   VORAZ PLATFORM                    │
├──────────────────┬──────────────────────────────────┤
│   FRONTEND       │   BACKEND (API REST)              │
│   React + Vite   │   Node.js + Express               │
│   Tailwind CSS   │   JWT Auth + Passport              │
│   Framer Motion  │   MercadoPago SDK                 │
│                  │                                   │
│   Vercel         │   Railway                         │
│   (CDN global)   │   (contenedor Node.js)            │
└──────────────────┴───────────────┬─────────────────┘
                                   │
                         ┌─────────▼──────────┐
                         │   PostgreSQL        │
                         │   Railway / Docker  │
                         └────────────────────┘
```

**Puertos locales:**
| Servicio | Puerto | URL |
|---|---|---|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| Backend (Express) | 3000 | http://localhost:3000 |
| PostgreSQL (Docker) | 5433 | localhost:5433 |
| Adminer (DB GUI) | 8080 | http://localhost:8080 |

---

## 2. Requisitos previos

Antes de empezar, asegurate de tener instalado:

| Herramienta | Versión mínima | Descarga |
|---|---|---|
| **Node.js** | 18.x o superior | https://nodejs.org |
| **npm** | 9.x o superior | (incluido con Node.js) |
| **Docker Desktop** | Última versión | https://docker.com/products/docker-desktop |
| **Git** | Cualquier versión | https://git-scm.com |

**Verificar instalaciones:**
```powershell
node --version     # debe mostrar v18.x o mayor
npm --version      # debe mostrar 9.x o mayor
docker --version   # debe mostrar Docker version x.x.x
```

---

## 3. Ejecución local (desarrollo)

### Opción A — Script automático (recomendado)

Desde la carpeta `voraz-platform/`:
```powershell
.\start-local.ps1
```

El script hace todo automáticamente:
1. Verifica Docker
2. Levanta PostgreSQL en Docker
3. Instala dependencias si es necesario
4. Abre el backend en una ventana nueva (puerto 3000)
5. Abre el frontend en una ventana nueva (puerto 5173)
6. Abre el navegador en http://localhost:5173

---

### Opción B — Manual paso a paso

#### Paso 1: Levantar la base de datos con Docker

Desde la carpeta raíz del proyecto (`voraz-project/`):
```powershell
$env:DB_USER="voraz_admin"; $env:DB_PASSWORD="voraz_password_secure"; $env:DB_NAME="voraz_db"; $env:DB_PORT="5433"
docker compose up -d db
```

Verificar que la DB está lista:
```powershell
docker exec voraz_db pg_isready -U voraz_admin -d voraz_db
# Debe mostrar: /var/run/postgresql:5432 - accepting connections
```

#### Paso 2: Arrancar el Backend

```powershell
cd "F:\Programador GS\voraz-project\voraz-platform\backend"
npm install          # solo la primera vez
npm run dev
```

Deberías ver:
```
🚀 Servidor corriendo en http://localhost:3000
✅ Migración ejecutada: phase7_orders.sql
✅ Migración ejecutada: phase8_auth.sql
ℹ️  Google OAuth no configurado (GOOGLE_CLIENT_ID faltante)
```

#### Paso 3: Arrancar el Frontend

En **otra terminal**:
```powershell
cd "F:\Programador GS\voraz-project\voraz-platform\frontend"
npm install          # solo la primera vez
npm run dev
```

Deberías ver:
```
VITE v7.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

#### Paso 4: (Opcional) Abrir el Adminer para ver la DB visualmente

```powershell
$env:DB_USER="voraz_admin"; $env:DB_PASSWORD="voraz_password_secure"; $env:DB_NAME="voraz_db"; $env:DB_PORT="5433"
docker compose -f "F:\Programador GS\voraz-project\docker-compose.yml" up -d adminer
```
Luego entrar a http://localhost:8080
- **Server:** `db`
- **Username:** `voraz_admin`
- **Password:** `voraz_password_secure`
- **Database:** `voraz_db`

---

## 4. Configurar variables de entorno

### Backend — `.env`

El archivo `backend/.env` ya existe con la configuración local. Para producción, agregá estas variables adicionales en Railway:

```env
# Obligatorias en producción
NODE_ENV=production
DATABASE_URL=postgresql://...  # Railway lo provee automáticamente
JWT_SECRET=una-clave-larga-y-segura-de-al-menos-32-caracteres

# MercadoPago (para pagos reales)
MP_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxx

# Google OAuth (para login con Google)
GOOGLE_CLIENT_ID=xxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxx

# URLs de la app
FRONTEND_URL=https://voraz.vercel.app
BACKEND_URL=https://voraz-api.up.railway.app
```

### Frontend — `.env`

Crear el archivo `frontend/.env` con el contenido del archivo `frontend/env.example`:

**Local:**
```env
VITE_API_URL=http://localhost:3000/api
```

**Producción (configurar en Vercel como Environment Variable):**
```env
VITE_API_URL=https://voraz-api.up.railway.app/api
```

> **Importante:** El prefijo `VITE_` es obligatorio para que Vite exponga la variable al navegador.

---

## 5. Sembrar la base de datos

La base de datos se crea automáticamente cuando el backend inicia (ejecuta las migraciones SQL). Para cargar datos de ejemplo (menú, locales, noticias, etc.):

```powershell
cd "F:\Programador GS\voraz-project\voraz-platform\backend"
node sembrar.js
```

Esto carga:
- Productos del menú (burgers, combos, extras)
- Locales/sucursales
- Influencers del Squad
- Videos
- Noticias del Mundo Voraz
- Cupones de descuento demo

---

## 6. Despliegue del Backend en Railway

### Paso 1: Crear cuenta y proyecto

1. Ir a https://railway.app
2. Crear cuenta (podés usar GitHub)
3. Hacer clic en **"New Project"**
4. Elegir **"Deploy from GitHub repo"**
5. Conectar tu repositorio de GitHub

### Paso 2: Configurar el servicio de Backend

1. Railway detectará el proyecto Node.js automáticamente
2. En **Settings > General**, configurar:
   - **Root Directory:** `voraz-platform/backend`
   - **Start Command:** `node src/index.js`

### Paso 3: Agregar PostgreSQL

1. En el proyecto, hacer clic en **"+ New"**
2. Elegir **"Database" → "PostgreSQL"**
3. Railway crea la DB automáticamente
4. En el servicio de Backend, ir a **Variables**
5. Hacer clic en **"Add Reference Variable"**
6. Agregar: `DATABASE_URL` → referenciar la variable de PostgreSQL

### Paso 4: Configurar variables de entorno en Railway

En el servicio de Backend → **Variables**, agregar:

```
NODE_ENV = production
JWT_SECRET = [generar una clave segura, mínimo 32 caracteres]
FRONTEND_URL = https://[tu-dominio].vercel.app
BACKEND_URL = https://[tu-servicio].up.railway.app
```

Y opcionalmente:
```
MP_ACCESS_TOKEN = [tu token de MercadoPago]
GOOGLE_CLIENT_ID = [tu client ID de Google]
GOOGLE_CLIENT_SECRET = [tu client secret de Google]
```

### Paso 5: Deploy

1. Hacer push al repositorio de GitHub
2. Railway hace el deploy automáticamente
3. Obtener la URL del backend (ej: `https://voraz-api-production.up.railway.app`)

### Paso 6: Sembrar datos en producción

Conectarse a la DB de Railway con la DATABASE_URL y ejecutar el sembrar.js apuntando a Railway:

```powershell
$env:DATABASE_URL="postgresql://[usuario]:[password]@[host]:[puerto]/[db]"
cd "F:\Programador GS\voraz-project\voraz-platform\backend"
node sembrar.js
```

---

## 7. Despliegue del Frontend en Vercel

### Paso 1: Crear cuenta

1. Ir a https://vercel.com
2. Crear cuenta con GitHub

### Paso 2: Importar proyecto

1. Hacer clic en **"New Project"**
2. Importar el repositorio de GitHub
3. En **Configure Project**, configurar:
   - **Framework Preset:** Vite
   - **Root Directory:** `voraz-platform/frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Paso 3: Configurar variables de entorno en Vercel

En **Environment Variables**, agregar:

```
VITE_API_URL = https://[tu-backend].up.railway.app/api
```

### Paso 4: Deploy

1. Hacer clic en **"Deploy"**
2. Vercel construye y despliega automáticamente
3. Obtener la URL (ej: `https://voraz-platform.vercel.app`)

### Paso 5: Actualizar CORS en Backend

Volver a Railway y actualizar la variable:
```
FRONTEND_URL = https://voraz-platform.vercel.app
```

> **Nota:** Vercel conecta con el backend vía HTTPS. Asegurate de que el backend en Railway también usa HTTPS (lo hace automáticamente).

---

## 8. Configurar MercadoPago

### Paso 1: Crear cuenta de desarrollador

1. Ir a https://mercadopago.com.ar/developers
2. Crear/ingresar con tu cuenta de MercadoPago
3. En el panel, ir a **"Tus integraciones"**

### Paso 2: Obtener credenciales

1. Crear una nueva aplicación (ej: "Voraz Platform")
2. En las credenciales de la app, copiar:
   - **Access Token de producción:** `APP_USR-xxxx...`
   - **Access Token de prueba:** `TEST-xxxx...` (para testear sin cobrar)

### Paso 3: Configurar en Railway

```
MP_ACCESS_TOKEN = APP_USR-[tu-token-de-produccion]
```

Para probar sin cobrar realmente, usar el token de prueba:
```
MP_ACCESS_TOKEN = TEST-[tu-token-de-prueba]
```

> **Sin MP_ACCESS_TOKEN:** El sistema funciona en **modo demo** — los pedidos se confirman automáticamente sin pasar por MercadoPago.

---

## 9. Configurar Google OAuth

### Paso 1: Crear proyecto en Google Cloud

1. Ir a https://console.cloud.google.com
2. Crear un nuevo proyecto (ej: "Voraz Platform")
3. Ir a **APIs & Services → Credentials**
4. Hacer clic en **"+ Create Credentials" → "OAuth client ID"**
5. Elegir **"Web application"**

### Paso 2: Configurar URIs

En **Authorized redirect URIs**, agregar:
- Local: `http://localhost:3000/api/auth/google/callback`
- Producción: `https://[tu-backend].up.railway.app/api/auth/google/callback`

### Paso 3: Obtener credenciales

Copiar el **Client ID** y **Client Secret** generados.

### Paso 4: Configurar en Railway

```
GOOGLE_CLIENT_ID = [tu-client-id].apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = GOCSPX-[tu-client-secret]
```

> **Sin credenciales Google:** El login con Google no aparece. El sistema usa solo email/contraseña.

---

## 10. Verificación post-despliegue

### Checklist de endpoints del Backend

Testear cada endpoint después del deploy:

```powershell
# Health check
curl https://[tu-backend].up.railway.app/

# Conexión DB
curl https://[tu-backend].up.railway.app/api/test-db

# Productos
curl https://[tu-backend].up.railway.app/api/products

# Locales
curl https://[tu-backend].up.railway.app/api/stores
```

### Checklist del Frontend

- [ ] La app carga en la URL de Vercel
- [ ] El menú muestra productos (conecta con Railway)
- [ ] El modal de producto abre correctamente
- [ ] "Agregar al pedido" agrega al carrito
- [ ] El carrito abre y muestra los items
- [ ] El campo de cupón funciona (probar con `VORAZ10`)
- [ ] El registro de usuario funciona
- [ ] El login funciona
- [ ] Voraz Club muestra los puntos
- [ ] El checkout con delivery/pickup funciona
- [ ] El pedido se crea y redirige al tracking

---

## 11. Comandos útiles de mantenimiento

### Docker (DB local)

```powershell
# Ver estado de contenedores
docker ps

# Detener todo
docker compose -f "F:\Programador GS\voraz-project\docker-compose.yml" down

# Ver logs de la DB
docker logs voraz_db

# Conectarse a la DB desde la terminal
docker exec -it voraz_db psql -U voraz_admin -d voraz_db

# Backup de la DB
docker exec voraz_db pg_dump -U voraz_admin voraz_db > backup.sql

# Restaurar backup
docker exec -i voraz_db psql -U voraz_admin voraz_db < backup.sql
```

### Backend

```powershell
# Modo desarrollo (auto-recarga con nodemon)
cd backend; npm run dev

# Modo producción
cd backend; npm start

# Ver logs en Railway
railway logs
```

### Frontend

```powershell
# Desarrollo
cd frontend; npm run dev

# Build de producción (verificar antes de deployar)
cd frontend; npm run build

# Preview del build
cd frontend; npm run preview
```

### Base de datos — Consultas útiles

```sql
-- Ver todos los pedidos
SELECT id, customer_name, order_type, status, total, created_at FROM orders ORDER BY created_at DESC;

-- Ver usuarios registrados
SELECT id, email, name, points, created_at FROM users;

-- Ver puntos por usuario
SELECT u.name, u.points, ph.type, ph.points, ph.description
FROM points_history ph JOIN users u ON ph.user_id = u.id
ORDER BY ph.created_at DESC;

-- Ver cupones y uso
SELECT code, description, discount_type, discount_value, used_count, active FROM coupons;
```

---

## Estructura de carpetas del proyecto

```
voraz-project/
├── docker-compose.yml          # Config de Docker (DB + Adminer)
└── voraz-platform/
    ├── start-local.ps1         # Script de arranque automático
    ├── backend/
    │   ├── src/
    │   │   ├── index.js        # Entrada del servidor
    │   │   ├── config/
    │   │   │   └── db.js       # Conexión PostgreSQL
    │   │   ├── db/
    │   │   │   ├── phase7_orders.sql   # Tabla pedidos
    │   │   │   └── phase8_auth.sql     # Auth + puntos + cupones
    │   │   ├── middleware/
    │   │   │   └── auth.middleware.js  # JWT verification
    │   │   ├── controllers/
    │   │   │   ├── products.controller.js
    │   │   │   ├── orders.controller.js
    │   │   │   ├── payments.controller.js
    │   │   │   ├── auth.controller.js
    │   │   │   ├── users.controller.js
    │   │   │   └── coupons.controller.js
    │   │   └── routes/
    │   │       ├── products.routes.js
    │   │       ├── orders.routes.js
    │   │       ├── payments.routes.js
    │   │       ├── auth.routes.js
    │   │       ├── users.routes.js
    │   │       └── coupons.routes.js
    │   ├── sembrar.js          # Script de carga de datos
    │   ├── package.json
    │   └── .env                # Variables de entorno locales
    └── frontend/
        ├── src/
        │   ├── App.jsx         # Componente raíz
        │   ├── main.jsx        # Entry point + providers
        │   ├── context/
        │   │   ├── CartContext.jsx    # Estado global del carrito
        │   │   └── AuthContext.jsx    # Sesión de usuario
        │   ├── components/
        │   │   ├── CartDrawer.jsx     # Carrito + checkout
        │   │   ├── OrderTracking.jsx  # Seguimiento de pedido
        │   │   ├── AuthModal.jsx      # Login/Register
        │   │   └── VorazClub.jsx      # Dashboard de puntos
        │   └── services/
        │       └── api.js      # Todas las llamadas a la API
        ├── package.json
        └── env.example         # Template de .env
```
