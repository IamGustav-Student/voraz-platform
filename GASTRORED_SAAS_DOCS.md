# GastroRed — Documentación Técnica SaaS Multi-tenant

> Versión: rama `GastroRed` | Última actualización: 2026-03-08

---

## Índice

1. [Qué es GastroRed](#1-qué-es-gastrored)
2. [Arquitectura general](#2-arquitectura-general)
3. [Flujo de un request](#3-flujo-de-un-request)
4. [Base de datos — Cambios phase13](#4-base-de-datos--cambios-phase13)
5. [Archivos nuevos y modificados](#5-archivos-nuevos-y-modificados)
6. [Sistema de pagos — Dos circuitos independientes](#6-sistema-de-pagos--dos-circuitos-independientes)
7. [Panel Superadmin](#7-panel-superadmin)
8. [Variables de entorno requeridas](#8-variables-de-entorno-requeridas)
9. [PASOS MANUALES para producción](#9-pasos-manuales-para-producción)
10. [Agregar un nuevo comercio — paso a paso](#10-agregar-un-nuevo-comercio--paso-a-paso)
11. [Checklist de verificación post-deploy](#11-checklist-de-verificación-post-deploy)

---

## 1. Qué es GastroRed

GastroRed es la capa SaaS que transforma la plataforma white-label en un sistema **multi-tenant real**. En lugar de una sola marca (Voraz), la plataforma ahora puede alojar **N comercios gastronómicos** simultáneamente, cada uno con:

- Su propio dominio (`voraz.com.ar`, `elnacional.com.ar`)
- Su propia PWA (nombre, colores, logo)
- Sus propios datos aislados (productos, pedidos, usuarios)
- Su propia cuenta de MercadoPago para cobrar pedidos
- Su propio plan de suscripción a GastroRed

**Voraz** sigue siendo el comercio `store_id = 1`, sin ningún cambio visible para sus usuarios.

---

## 2. Arquitectura general

```
Internet
   │
   ├── voraz.com.ar ──────────────────────────────────────┐
   ├── elnacional.com.ar ────────────────────────────────► Backend Railway
   └── miburguer.gastrored.com.ar ───────────────────────┘
                                                           │
                                                   tenant.middleware.js
                                                   Lee Host header
                                                   Busca en tabla `stores`
                                                           │
                                                   req.store = { id, plan_type, status }
                                                           │
                                              ┌────────────┴────────────┐
                                              │                         │
                                       Controllers                 /api/manifest
                                       (filtra por                 /api/settings
                                        store_id)                  (dinámicos por tenant)
                                              │
                                        PostgreSQL
                                        (datos aislados
                                         por store_id)
```

---

## 3. Flujo de un request

1. El usuario abre `voraz.com.ar` en su celular
2. El frontend (Vercel) envía el header `x-store-domain: voraz.com.ar` en cada request
3. `tenant.middleware.js` hace `SELECT * FROM stores WHERE custom_domain = 'voraz.com.ar'`
4. Encuentra el store, inyecta `req.store = { id: 1, plan_type: 'Expert', status: 'active' }`
5. El controller usa `req.store.id` para filtrar: `SELECT * FROM products WHERE store_id = 1`
6. El cliente recibe solo los productos de Voraz

Si el dominio no existe en BD → `404 Comercio no encontrado`
Si el comercio está suspendido → `402 Suscripción vencida`
Si es `localhost` o `*.railway.app` o `*.vercel.app` → fallback a `store_id = 1` (Voraz)

---

## 4. Base de datos — Cambios phase13

La migración `phase13_gastrored_saas.sql` se ejecuta **automáticamente** cuando el backend arranca. Es no-destructiva: solo agrega columnas con `DEFAULT` y crea tablas nuevas.

### Columnas nuevas en `stores`

| Columna | Tipo | Descripción |
|---|---|---|
| `custom_domain` | VARCHAR(255) | Dominio propio del comercio (`voraz.com.ar`) |
| `subdomain` | VARCHAR(100) | Subdominio de GastroRed (`voraz`) |
| `plan_type` | VARCHAR(50) | `'Full Digital'` o `'Expert'` |
| `subscription_period` | VARCHAR(20) | `'monthly'` o `'annual'` |
| `subscription_expires_at` | TIMESTAMP | Fecha de vencimiento de la suscripción |
| `status` | VARCHAR(20) | `'active'`, `'suspended'`, `'trial'` |
| `brand_color_primary` | VARCHAR(10) | Color primario de la marca |
| `brand_color_secondary` | VARCHAR(10) | Color secundario de la marca |
| `brand_logo_url` | TEXT | URL del logo |
| `admin_email` | VARCHAR(150) | Email del dueño del comercio |
| `mp_subscription_id` | VARCHAR(200) | ID de suscripción en MercadoPago |

### Columna `store_id` agregada a

`products`, `categories`, `orders`, `coupons`, `users`, `news`, `community_videos`, `influencers` — todas con `DEFAULT 1` (Voraz).

### Tablas nuevas

**`superadmins`** — Usuarios de GastroRed con acceso total:
```sql
id, email, password_hash, name, created_at
```

**`subscription_payments`** — Historial de cobros de suscripciones:
```sql
id, store_id, mp_payment_id, amount, plan_type, period, status, created_at
```

---

## 5. Archivos nuevos y modificados

### Archivos NUEVOS

| Archivo | Descripción |
|---|---|
| `backend/src/db/phase13_gastrored_saas.sql` | Migración de BD multi-tenant |
| `backend/src/middleware/tenant.middleware.js` | Resuelve tenant desde Host header |
| `backend/src/controllers/superadmin.controller.js` | CRUD comercios + stats + login SA |
| `backend/src/controllers/subscriptions.controller.js` | Checkout y webhook de suscripciones |
| `backend/src/routes/superadmin.routes.js` | Rutas `/api/superadmin/*` |
| `backend/src/routes/subscriptions.routes.js` | Rutas `/api/subscriptions/*` |
| `frontend/src/components/SuperAdminPanel.jsx` | Panel de gestión multi-comercio |
| `frontend/src/hooks/useTenant.js` | Hook React para config del tenant actual |

### Archivos MODIFICADOS

| Archivo | Cambio principal |
|---|---|
| `backend/src/index.js` | Wiring de tenantMiddleware + endpoints `/api/manifest` y `/api/settings` |
| `backend/src/middleware/auth.middleware.js` | Agrega `superadminMiddleware`, warnings si faltan secrets |
| `backend/src/controllers/payments.controller.js` | Usa `req.store.id` en lugar de `x-tenant-id` |
| `backend/src/controllers/admin.controller.js` | MP config por `store_id` numérico |
| `backend/src/controllers/products.controller.js` | Filtra por `store_id`, límite plan Full Digital |
| `backend/src/controllers/orders.controller.js` | Inserta y filtra `store_id` |
| `backend/src/controllers/auth.controller.js` | Login/registro con `store_id` del tenant |
| `frontend/src/services/api.js` | Header `x-store-domain` en lugar de `x-tenant-id` |
| `frontend/index.html` | Manifest apunta a `/api/manifest` (dinámico) |
| `frontend/src/App.jsx` | Importa `SuperAdminPanel`, botón 🍽️ en navbar |

---

## 6. Sistema de pagos — Dos circuitos independientes

### Circuito A — Comercio cobra sus pedidos

```
Cliente ──paga pedido──► /api/payments/create-preference
                              │
                         Busca mp_access_token en tenant_settings
                         WHERE store_id = req.store.id
                              │
                         Crea preferencia con TOKEN DEL COMERCIO
                              │
                         Plata va a cuenta MP del dueño del local
```

**El dueño configura su token en:** Dashboard Admin → sección MercadoPago

### Circuito B — GastroRed cobra suscripciones a los comercios

```
Comercio nuevo ──paga plan──► /api/subscriptions/checkout
                                   │
                              Usa GASTRORED_MP_ACCESS_TOKEN (env var Railway)
                                   │
                              Webhook /api/subscriptions/webhook
                                   │
                              UPDATE stores SET status='active', subscription_expires_at=...
                                   │
                              Plata va a cuenta MP de GastroRed (tuya)
```

**Los dos circuitos son completamente independientes.** Un comercio nunca puede ver ni acceder a las credenciales de otro.

---

## 7. Panel Superadmin

Acceso: botón **🍽️** en la navbar del frontend (visible para todos, login con credenciales de superadmin).

### Endpoints disponibles

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/superadmin/login` | POST | Login con email/password → JWT con 7 días |
| `/api/superadmin/stores` | GET | Lista todos los comercios |
| `/api/superadmin/stores` | POST | Crea un nuevo comercio |
| `/api/superadmin/stores/:id/status` | PATCH | Activar/suspender comercio |
| `/api/superadmin/stores/:id/plan` | PATCH | Cambiar plan (Full Digital ↔ Expert) |
| `/api/superadmin/stats` | GET | Métricas globales |

### Crear nuevo comercio (desde el panel)

El formulario requiere:
- **Nombre del negocio** (ej: "El Nacional Burger")
- **Subdomain** (ej: `elnacional` → URL: `elnacional.gastrored.com.ar`)
- **Email del dueño**
- **Plan** y **período de suscripción**
- **Colores de marca** (picker)

Al crear, el sistema genera automáticamente:
- Registro en `stores`
- Registro en `tenant_settings` con `cash_on_delivery = true` por defecto

---

## 8. Variables de entorno requeridas

### Railway (Backend)

| Variable | Descripción | Estado |
|---|---|---|
| `DATABASE_URL` | URL de PostgreSQL Railway | ✅ Ya configurada |
| `JWT_SECRET` | Clave para tokens de usuarios | ✅ Ya configurada |
| `GASTRORED_SUPERADMIN_SECRET` | Clave para tokens de superadmin | ⚠️ **FALTA CONFIGURAR** |
| `GASTRORED_MP_ACCESS_TOKEN` | Token MP de GastroRed para cobrar suscripciones | ⚠️ Opcional (sin él, checkout de suscripciones no funciona) |
| `GASTRORED_FRONTEND_URL` | URL del frontend para back_urls de MP | Opcional (default: voraz-platform.vercel.app) |
| `MP_ACCESS_TOKEN` | Token MP de fallback (Voraz) | ✅ Ya configurada |
| `BACKEND_URL` | URL pública del backend | Opcional |

### Vercel (Frontend)

| Variable | Descripción | Estado |
|---|---|---|
| `VITE_API_URL` | URL del backend Railway | ✅ Ya configurada |

---

## 9. PASOS MANUALES para producción

> Lee cada paso completo antes de ejecutarlo.

---

### PASO 1 — Cambiar la rama de deploy en Vercel

1. Ir a [vercel.com](https://vercel.com) → tu proyecto `voraz-platform`
2. Click en **Settings** (pestaña de arriba)
3. En el menú izquierdo: **Git**
4. Buscar la sección **"Production Branch"**
5. Cambiar de `main` a `GastroRed`
6. Click **Save**
7. Ir a la pestaña **Deployments** y clickear **Redeploy** en el último deployment

---

### PASO 2 — Agregar variable de entorno en Railway

1. Ir a [railway.app](https://railway.app) → tu proyecto
2. Click en el servicio del **backend** (no el de PostgreSQL)
3. Pestaña **Variables**
4. Click **+ New Variable**
5. Agregar:
   - **Name:** `GASTRORED_SUPERADMIN_SECRET`
   - **Value:** una clave larga y segura, ej: `GastroRed2026!SaaS#Secret`
6. Click **Add** → Railway reinicia el backend automáticamente

---

### PASO 3 — Ejecutar la migración de BD

La migración corre sola cuando el backend reinicia (después del Paso 2). Para verificar que corrió:

1. En Railway → PostgreSQL → pestaña **Data**
2. Buscar la tabla `stores`
3. Verificar que tiene la columna `subdomain` (si la ves, la migración funcionó)

Si querés verificarlo manualmente, vas a **Query** y ejecutás:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'stores' AND column_name = 'subdomain';
```
Debería devolver una fila.

---

### PASO 4 — Crear tu usuario superadmin

En Railway → PostgreSQL → **Query**, ejecutá esto (reemplazá los valores):

```sql
-- Primero habilitamos la extensión de encriptación (solo la primera vez)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Creá tu usuario superadmin
INSERT INTO superadmins (email, password_hash, name)
VALUES (
  'tu@email.com',
  crypt('TuPasswordSegura123!', gen_salt('bf')),
  'GastroRed Admin'
);
```

Para verificar que se creó:
```sql
SELECT id, email, name, created_at FROM superadmins;
```

---

### PASO 5 — Verificar que todo funciona

Abrí estas URLs en tu navegador:

**1. Backend corriendo:**
```
https://voraz-platform-production.up.railway.app/api/health
```
Debería devolver `{"status":"ok"}`

**2. Settings de Voraz:**
```
https://voraz-platform-production.up.railway.app/api/settings
```
Debería devolver JSON con `brand_name`, `brand_color_primary`, etc.

**3. Manifest PWA:**
```
https://voraz-platform-production.up.railway.app/api/manifest
```
Debería devolver JSON con `name: "Voraz"`, `theme_color: "#E30613"`

**4. Frontend funcionando:**
```
https://voraz-platform.vercel.app
```
El menú, los productos y la app deben verse igual que antes.

**5. Panel Superadmin:**
- En la navbar del frontend, buscar el botón 🍽️ (rojo, esquina derecha)
- Ingresar con el email y password del Paso 4
- Deberías ver la lista de comercios con Voraz

---

## 10. Agregar un nuevo comercio — paso a paso

> Esto lo hacés desde el Panel Superadmin, sin tocar código.

1. Abrir el frontend → botón 🍽️ → login
2. Click en **"➕ Nuevo Comercio"**
3. Completar el formulario:
   - **Nombre:** `El Nacional Burger`
   - **Subdomain:** `elnacional` (sin espacios, solo letras y guiones)
   - **Email del dueño:** `admin@elnacional.com.ar`
   - **Plan:** Full Digital o Expert
4. Click **Crear Comercio**

Después de crear, el comercio queda con `status = 'active'` y puede accederse en:
```
https://voraz-platform.vercel.app (con x-store-domain: elnacional.gastrored.com.ar)
```

Para el **dominio propio** del cliente (`elnacional.com.ar`):
1. El cliente agrega en su panel DNS:
   - Tipo: `CNAME`
   - Nombre: `@`
   - Valor: `cname.vercel-dns.com`
2. En Vercel → Settings → Domains → agregar `elnacional.com.ar`
3. En la BD: `UPDATE stores SET custom_domain='elnacional.com.ar' WHERE subdomain='elnacional';`

---

## 11. Checklist de verificación post-deploy

Después de hacer los 5 pasos manuales, verificá esto:

- [ ] `GET /api/settings` devuelve datos de Voraz
- [ ] `GET /api/manifest` devuelve JSON PWA válido
- [ ] El frontend en Vercel muestra el menú de Voraz
- [ ] El botón 🍽️ aparece en la navbar
- [ ] Login de superadmin funciona con las credenciales del Paso 4
- [ ] Panel Superadmin muestra Voraz en la lista de comercios
- [ ] Los pedidos y pagos de Voraz siguen funcionando igual
- [ ] Login de usuarios de Voraz funciona

---

## Limitaciones actuales (próximas iteraciones)

| Feature | Estado |
|---|---|
| Panel superadmin en mobile | Funcional pero no optimizado |
| Webhook de suscripción MP | Requiere `GASTRORED_MP_ACCESS_TOKEN` configurado |
| Wildcard DNS `*.gastrored.com.ar` | Requiere configuración DNS + Vercel manual |
| Editar datos de un comercio existente desde Superadmin | No implementado aún |
| Métricas de ingresos reales (conectado a MP) | No implementado aún |
