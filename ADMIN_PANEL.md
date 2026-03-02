# Panel de Administración (Backoffice) - Documentación Técnica

## Resumen

Se implementó un panel de administración completo accesible desde el frontend para gestionar todos los contenidos de la plataforma Voraz sin necesidad de acceder a la base de datos directamente.

---

## Arquitectura

### Backend

#### Migración `phase10_admin.sql`
- Agrega columna `role VARCHAR(20) DEFAULT 'user'` a la tabla `users` con restricción `CHECK (role IN ('user', 'admin', 'manager'))`
- Crea tabla `media_uploads` para registro de imágenes subidas via Cloudinary

#### Middleware `adminMiddleware` (`auth.middleware.js`)
- Verifica JWT válido
- Verifica que `decoded.role === 'admin'` o `'manager'`
- Retorna 403 si el rol no es suficiente

#### Controller `admin.controller.js` (18 endpoints)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/admin/stats` | GET | Dashboard con métricas generales |
| `/api/admin/products` | GET | Lista todos los productos del tenant |
| `/api/admin/products` | POST | Crea nuevo producto |
| `/api/admin/products/:id` | PUT | Actualiza producto |
| `/api/admin/products/:id` | DELETE | Desactiva producto (soft delete) |
| `/api/admin/categories` | GET | Lista categorías del tenant |
| `/api/admin/coupons` | GET | Lista cupones del tenant |
| `/api/admin/coupons` | POST | Crea nuevo cupón |
| `/api/admin/coupons/:id` | PATCH | Activa/desactiva cupón |
| `/api/admin/coupons/:id` | DELETE | Elimina cupón |
| `/api/admin/videos` | POST | Agrega video (extrae ID de YouTube automáticamente) |
| `/api/admin/videos/:id` | DELETE | Elimina video |
| `/api/admin/news` | POST | Publica noticia |
| `/api/admin/news/:id` | PUT | Actualiza noticia |
| `/api/admin/news/:id` | DELETE | Elimina noticia |
| `/api/admin/upload` | POST | Sube imagen a Cloudinary |
| `/api/admin/orders` | GET | Lista últimos 100 pedidos |

#### Rutas `admin.routes.js`
- Todas las rutas usan `adminMiddleware` como guard
- Registradas en `index.js` bajo `/api/admin`

#### JWT con Role
- El token JWT ahora incluye el campo `role` para que el frontend pueda verificar permisos
- El endpoint `/api/auth/me` retorna `role` en el perfil del usuario

---

### Frontend

#### Componente `AdminPanel.jsx`
Panel completo con sidebar de navegación. Secciones:

1. **Dashboard**: Métricas en tarjetas (productos activos, pedidos, ingresos, usuarios, cupones activos)
2. **Productos**: Formulario de alta + tabla con toggle activo/inactivo
3. **Cupones**: Formulario de alta + tabla con toggle activo/inactivo + eliminación
4. **Videos**: Formulario para agregar videos de YouTube (el sistema extrae el ID automáticamente)
5. **Noticias**: Formulario de publicación con título, contenido, imagen y fecha
6. **Pedidos**: Listado de últimos 100 pedidos con estado y total

#### Acceso al Panel
- Botón "Admin" (ícono engranaje, color amarillo) aparece en el navbar **solo si** `user.role === 'admin'` o `'manager'`
- Invisible para usuarios regulares

#### `api.js` - función `adminFetch`
Helper que centraliza todas las llamadas a la API de admin, agregando automáticamente el header `Authorization: Bearer <token>` y el `x-tenant-id`.

---

## Cómo asignar rol admin a un usuario

Conectarse a la base de datos de Railway y ejecutar:

```sql
UPDATE users SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';
```

Desde Railway CLI:
```bash
railway run psql $DATABASE_URL -c "UPDATE users SET role = 'admin' WHERE email = 'admin@voraz.com';"
```

O desde cualquier cliente PostgreSQL (TablePlus, DBeaver, pgAdmin) con la URL de conexión de Railway.

**Nota**: Después de ejecutar este UPDATE, el usuario debe cerrar sesión y volver a iniciar sesión para que el nuevo token JWT incluya el rol actualizado.

---

## Cloudinary (Upload de imágenes)

Para activar la subida de imágenes, agregar estas variables en Railway:

```
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

Sin estas variables, el endpoint `/api/admin/upload` retorna un mensaje explicativo en lugar de fallar silenciosamente.

Las imágenes se organizan en carpetas: `tenants/{tenant_id}/products`

---

## Archivos modificados/creados

- `backend/src/db/phase10_admin.sql` - Migración SQL
- `backend/src/middleware/auth.middleware.js` - Agregado `adminMiddleware`
- `backend/src/controllers/admin.controller.js` - Controller completo (nuevo)
- `backend/src/routes/admin.routes.js` - Rutas admin protegidas (nuevo)
- `backend/src/controllers/auth.controller.js` - JWT incluye `role`, `me` retorna `role`
- `backend/src/index.js` - Registradas rutas admin + migración phase10
- `frontend/src/components/AdminPanel.jsx` - Panel completo (nuevo)
- `frontend/src/services/api.js` - Agregado `adminFetch`
- `frontend/src/App.jsx` - Botón admin en navbar + renderizado del panel
