# 🍽️ GastroRed — Guía de Alta de Nuevo Tenant

> Esta guía es para el **superadmin de GastroRed**. Explica cómo agregar un nuevo restaurante como tenant en la plataforma.

---

## ¿Cómo funciona GastroRed?

GastroRed es una plataforma SaaS multi-tenant. Cada restaurante ("tenant") es un registro en `stores` con un `id` único. Todo el catálogo, pedidos y configuración están vinculados a ese `store_id`.

```
GastroRed (plataforma)
├── Voraz (store_id=1, subdomain=voraz)
├── BurgerCo (store_id=2, subdomain=burgerco)
└── PizzaPlace (store_id=3, subdomain=pizzaplace)
```

---

## 📋 Checklist para dar de alta un nuevo tenant

### Paso 1 — Crear el tenant en GastroRed

Hacé una request autenticada como superadmin:

```bash
# 1a. Login como superadmin
curl -X POST https://TU_RAILWAY_URL/api/superadmin/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "iamgustav.olivera@gmail.com", "password": "TU_PASSWORD" }'

# → Guarda el token que devuelve
```

```bash
# 1b. Crear el tenant
curl -X POST https://TU_RAILWAY_URL/api/superadmin/stores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_SUPERADMIN" \
  -d '{
    "name": "BurgerCo",
    "brand_name": "BurgerCo",
    "subdomain": "burgerco",
    "plan_type": "Full Digital",
    "subscription_period": "monthly",
    "admin_email": "admin@burgerco.com.ar",
    "brand_color_primary": "#FF5733",
    "brand_color_secondary": "#1A1A1A",
    "slogan": "Burgers con historia"
  }'

# → Guarda el id que devuelve (ej: store_id=2)
```

> **Campos mínimos requeridos:** `name` y `subdomain`  
> **Subdomain:** solo letras minúsculas y guiones. Ej: `burgerco`, `la-pizza`

---

### Paso 2 — Verificar que el tenant quedó creado

```bash
# Ver todos los tenants
curl https://TU_RAILWAY_URL/api/superadmin/stores \
  -H "Authorization: Bearer TU_TOKEN_SUPERADMIN"
```

```bash
# Ver el tenant específico por subdomain
curl https://TU_RAILWAY_URL/api/settings \
  -H "x-store-domain: burgerco"
```

---

### Paso 3 — Sembrar datos iniciales del tenant

El nuevo tenant empieza sin catálogo. Hay dos opciones:

#### Opción A — Seed desde el seeder (para arranque rápido)

Desde la carpeta `backend/`, especificando el `store_id` del nuevo tenant:

```bash
# En local con DATABASE_URL apuntando a Railway
cd backend
STORE_ID=2 DATABASE_URL="postgresql://..." node sembrar-real.js
```

> ⚠️ Esto inserta el menú de demostración de Voraz adaptado al nuevo tenant. El cliente después lo reemplaza desde el admin.

#### Opción B — El cliente carga su propio menú desde el backoffice

El cliente accede al admin panel de su tienda y carga categorías y productos manualmente.

---

### Paso 4 — Configurar MercadoPago del tenant

El cliente configura su propia cuenta de MercadoPago entrando al backoffice > Configuración:

```bash
# O vía API directamente:
curl -X POST https://TU_RAILWAY_URL/api/admin/settings/mercadopago \
  -H "Content-Type: application/json" \
  -H "x-store-domain: burgerco" \
  -H "Authorization: Bearer TOKEN_ADMIN_DEL_TENANT" \
  -d '{
    "mp_access_token": "APP_USR-...",
    "mp_public_key": "APP_USR-...",
    "mp_sandbox": false,
    "cash_on_delivery": true
  }'
```

---

### Paso 5 — Configurar el dominio del tenant

El tenant puede funcionar con:

1. **Subdomain de GastroRed:** `burgerco.gastrored.com.ar`  
   → Ya funciona si configurás el DNS de GastroRed con un wildcard `*.gastrored.com.ar → Railway`

2. **Dominio propio del cliente:** `pedir.burgerco.com`  
   → El cliente apunta su DNS: `CNAME pedir.burgerco.com → TU_RAILWAY_URL`  
   → Actualizás el campo `custom_domain` en el superadmin:

```bash
# Comandos SQL directos en Railway DB console:
UPDATE stores SET custom_domain='pedir.burgerco.com' WHERE id=2;
```

---

### Paso 6 — Crear el usuario admin del tenant

```bash
curl -X POST https://TU_RAILWAY_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -H "x-store-domain: burgerco" \
  -d '{
    "name": "Admin BurgerCo",
    "email": "admin@burgerco.com.ar",
    "password": "password_seguro_123"
  }'
```

Luego en la BD, promovés al usuario a admin:

```sql
UPDATE users SET role='admin' 
WHERE email='admin@burgerco.com.ar' AND store_id=2;
```

---

### Paso 7 — Verificaciones finales

```bash
# ✅ API responde
curl https://TU_RAILWAY_URL/api/test-db

# ✅ Menú del nuevo tenant tiene productos
curl https://TU_RAILWAY_URL/api/products \
  -H "x-store-domain: burgerco"

# ✅ Settings del tenant correctos
curl https://TU_RAILWAY_URL/api/settings \
  -H "x-store-domain: burgerco"
```

---

## 🔧 Variables de entorno en Railway

### Backend (todas las instancias comparten el mismo backend)

| Variable | Descripción | Requerida |
|---|---|---|
| `DATABASE_URL` | URL de la BD PostgreSQL de Railway | ✅ Sí |
| `JWT_SECRET` | Clave secreta para tokens de usuarios | ✅ Sí |
| `GASTRORED_SUPERADMIN_SECRET` | Clave para crear el primer superadmin | ✅ Sí |
| `GASTRORED_MP_ACCESS_TOKEN` | Access Token de MP **de GastroRed** (para cobrar suscripciones) | ✅ Sí |
| `GASTRORED_FRONTEND_URL` | URL del frontend (Vercel, etc.) | ✅ Sí |
| `BACKEND_URL` | URL del propio backend en Railway | ✅ Sí |
| `CLOUDINARY_CLOUD_NAME` | Para uploads de imágenes | Opcional |
| `CLOUDINARY_API_KEY` | Para uploads de imágenes | Opcional |
| `CLOUDINARY_API_SECRET` | Para uploads de imágenes | Opcional |

> Los Access Tokens de MP de **cada tenant** se guardan en la tabla `tenant_settings` (no en env vars).

---

## 💰 Gestión de suscripciones

### Ver estado de suscripción de un tenant

```bash
curl https://TU_RAILWAY_URL/api/subscriptions/status/2 \
  -H "Authorization: Bearer TU_TOKEN_SUPERADMIN"
```

### Generar link de pago para un tenant

```bash
curl -X POST https://TU_RAILWAY_URL/api/subscriptions/checkout \
  -H "Authorization: Bearer TU_TOKEN_SUPERADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": 2,
    "plan_type": "Full Digital",
    "period": "monthly",
    "payer_email": "admin@burgerco.com.ar"
  }'
```

### Planes disponibles

| Plan | Mensual | Anual | Límite productos |
|---|---|---|---|
| Full Digital | $60.000 ARS | $600.000 ARS | 50 productos |
| Expert | $100.000 ARS | $1.000.000 ARS | Ilimitados |

### Suspender / reactivar un tenant

```bash
# Suspender (el tenant recibe 402 en todas sus rutas)
curl -X PATCH https://TU_RAILWAY_URL/api/superadmin/stores/2/status \
  -H "Authorization: Bearer TU_TOKEN_SUPERADMIN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "suspended" }'

# Reactivar
curl -X PATCH https://TU_RAILWAY_URL/api/superadmin/stores/2/status \
  -H "Authorization: Bearer TU_TOKEN_SUPERADMIN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "active" }'
```

---

## 🗺️ Arquitectura de identificación de tenants

Cada request del frontend incluye el header `x-store-domain` con el dominio o subdomain:

```
Frontend → x-store-domain: burgerco
                    ↓
         tenantMiddleware: busca en stores WHERE subdomain='burgerco'
                    ↓
         req.store = { id: 2, plan_type: 'Full Digital', ... }
                    ↓
         Todos los controllers filtran por req.store.id (store_id)
```

---

## 🚨 Troubleshooting frecuente

| Síntoma | Causa | Solución |
|---|---|---|
| `GET /api/products` devuelve `[]` | Los productos tienen `store_id=NULL` | Ejecutar `phase14` o `UPDATE products SET store_id=1 WHERE store_id IS NULL` |
| `404 Comercio no encontrado` | El subdomain no está registrado en `stores` | Crear el tenant con `POST /api/superadmin/stores` |
| `402 Suscripción vencida` | El tenant está en status=suspended | `PATCH /api/superadmin/stores/:id/status` con `{ status: 'active' }` |
| Admin panel muestra 0 productos | `tenant_id` no coincide con `store_id` | La `phase14` migration reconcilia esto automáticamente al deployar |
| El seeder borra datos de otros tenants | Seeder viejo usaba TRUNCATE global | El seeder nuevo hace `DELETE WHERE store_id=$1` |
