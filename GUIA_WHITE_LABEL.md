# Guía Completa: Desplegar una Nueva Marca (White Label)

## Visión general

Esta plataforma está diseñada para correr **múltiples marcas de forma independiente**,
cada una con su propio:

- Frontend en Vercel (URL/dominio propio)
- Backend en Railway (servicio nuevo)
- Base de datos PostgreSQL en Railway (instancia propia)
- Usuario admin independiente
- Colores, logo, nombre y estilo propios
- Configuración de MercadoPago propia

La clave es que **el código es el mismo repositorio** — solo cambian variables de entorno
y un archivo de configuración. Voraz sigue funcionando sin ningún cambio.

---

## PARTE 1 — Preparar el código de la nueva marca

### Paso 1.1 — Agregar la nueva marca en `tenant.js`

Abrí el archivo:
```
frontend/src/config/tenant.js
```

Agregá un nuevo bloque dentro del objeto `tenants`, después de `cafecito`:

```js
  mirestaurante: {
    id: 'mirestaurante',
    brandName: 'Mi Restaurante',           // Nombre que aparece en el navbar y título
    slogan: 'El sabor de siempre',
    tagline: 'La mejor pizza de la ciudad.',
    logo: null,                            // null = texto; o ruta '/images/logo.png'
    favicon: '/favicon.ico',
    social: {
      instagram: 'https://instagram.com/mirestaurante',
      whatsapp: '+5491100000000',
      tiktok: null,
    },
    theme: {
      primary: '#FF6B00',                  // Color principal (botones, highlights)
      primaryHover: '#e05a00',
      secondary: '#FFD166',                // Color secundario (badges, acentos)
      background: '#0f0f0f',              // Fondo general
      surface: '#1a1a1a',                 // Fondo de cards
      text: '#F5F5F5',                    // Color de texto
    },
    currency: 'ARS',
    currencySymbol: '$',
    pointsName: 'Pizza Points',
    pointsRatio: 100,    // $100 = 1 punto
    pointsValue: 5,      // 1 punto = $5 de descuento
    welcomeBonus: 40,
    meta: {
      title: 'Mi Restaurante — La mejor pizza',
      description: 'Pedí online y disfrutá la mejor pizza de la ciudad.',
    },
  },
```

> **Colores:** Podés usar cualquier color en formato hexadecimal.
> Los colores del tema se inyectan automáticamente como variables CSS al cargar la app.

### Paso 1.2 — Hacer commit del nuevo tenant

```powershell
cd "F:\Programador GS\voraz-project\voraz-platform"
git add frontend/src/config/tenant.js
git commit -m "feat: agregar tenant mirestaurante"
git push
```

---

## PARTE 2 — Crear la Base de Datos en Railway

### Paso 2.1 — Acceder a Railway

1. Ingresá a [railway.app](https://railway.app) con tu cuenta
2. Hacé click en tu proyecto existente (el de Voraz)

### Paso 2.2 — Agregar una nueva instancia de PostgreSQL

1. En el dashboard del proyecto, hacé click en **"+ New"** (arriba a la derecha)
2. Seleccioná **"Database"**
3. Seleccioná **"Add PostgreSQL"**
4. Railway crea una nueva base de datos en segundos
5. **Importante:** Hacé click en esa nueva base de datos y luego en la pestaña **"Connect"**
6. Copiá el campo **"DATABASE_URL"** — la vas a necesitar en el Paso 3.4

> Ejemplo de cómo se ve:
> `postgresql://postgres:AbCdEfG@roundhouse.proxy.rlwy.net:12345/railway`

---

## PARTE 3 — Crear el Backend en Railway

### Paso 3.1 — Crear un nuevo servicio de backend

1. En el mismo proyecto de Railway, hacé click en **"+ New"**
2. Seleccioná **"GitHub Repo"**
3. Seleccioná el repositorio `voraz-platform`
4. Cuando te pregunte qué carpeta deployar, configurá:
   - **Root Directory:** `backend`
   - (Railway lo detecta automáticamente por el Dockerfile o package.json)
5. El servicio se llama algo como `backend-1` — renombralo haciendo click en el nombre:
   **Ejemplo:** `mirestaurante-backend`

### Paso 3.2 — Configurar las variables de entorno del backend

Con el nuevo servicio seleccionado, andá a la pestaña **"Variables"** y agregá cada variable:

| Variable | Valor | Notas |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:xxx@xxx.rlwy.net:xxx/railway` | La del Paso 2.2 (la NUEVA BD) |
| `JWT_SECRET` | `una-clave-secreta-larga-aleatoria` | Inventá una frase larga |
| `PORT` | `3000` | Siempre 3000 |
| `NODE_ENV` | `production` | |
| `TENANT_ID` | `mirestaurante` | **Exactamente igual** al `id` del Paso 1.1 |
| `FRONTEND_URL` | `https://mirestaurante.vercel.app` | URL de Vercel (la creás en Parte 4) |
| `BACKEND_URL` | `https://mirestaurante-production.up.railway.app` | URL de este servicio (ver abajo) |
| `CLOUDINARY_CLOUD_NAME` | (opcional) | Solo si querés subir imágenes |
| `CLOUDINARY_API_KEY` | (opcional) | |
| `CLOUDINARY_API_SECRET` | (opcional) | |

> **¿Cómo sé la URL del backend?**
> Después de hacer el deploy, Railway te asigna una URL automáticamente.
> La encontrás en: servicio → pestaña **"Settings"** → sección **"Networking"** → **"Public URL"**
> Copiá esa URL y volvé a ponerla en `BACKEND_URL`.

### Paso 3.3 — Forzar el deploy

1. Andá a la pestaña **"Deployments"**
2. Hacé click en **"Deploy Now"** o esperá el deploy automático
3. En los logs tenés que ver:
   ```
   🚀 Servidor corriendo en http://localhost:3000
   ✅ Migración phase7_orders.sql ejecutada
   ✅ Migración phase8_auth.sql ejecutada
   ...
   ```
4. Si no aparecen errores, el backend está funcionando

### Paso 3.4 — Verificar que el backend responde

Abrí en el navegador:
```
https://mirestaurante-production.up.railway.app/api/products
```

Tiene que devolver:
```json
{"status":"success","data":[]}
```

(Array vacío porque la BD está nueva y sin datos — eso es correcto)

---

## PARTE 4 — Crear el Frontend en Vercel

### Paso 4.1 — Importar el proyecto en Vercel

1. Ingresá a [vercel.com](https://vercel.com) con tu cuenta
2. Hacé click en **"Add New..."** → **"Project"**
3. Seleccioná el repositorio `voraz-platform` de GitHub
4. **IMPORTANTE:** Vercel va a detectar la carpeta `frontend` automáticamente.
   Si no lo hace, configurá manualmente:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Paso 4.2 — Configurar las variables de entorno en Vercel

Antes de hacer click en "Deploy", buscá la sección **"Environment Variables"** y agregá:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://mirestaurante-production.up.railway.app/api` |
| `VITE_TENANT_ID` | `mirestaurante` |

> **¿Qué hacen estas variables?**
> - `VITE_API_URL`: Le dice al frontend dónde está su backend propio
> - `VITE_TENANT_ID`: Le dice qué configuración de marca cargar (colores, nombre, etc.)

### Paso 4.3 — Hacer el primer deploy

1. Hacé click en **"Deploy"**
2. Vercel compila el proyecto con los colores y nombre de tu marca
3. Al terminar, te da una URL como: `mirestaurante-abc123.vercel.app`

### Paso 4.4 — Configurar el dominio propio (opcional pero recomendado)

1. En Vercel → tu proyecto → pestaña **"Settings"** → **"Domains"**
2. Hacé click en **"Add Domain"**
3. Escribí tu dominio, ejemplo: `mirestaurante.com.ar`
4. Vercel te da instrucciones DNS:
   - Si el dominio está en Namecheap/GoDaddy/NIC.ar: agregás un registro CNAME apuntando a `cname.vercel-dns.com`
   - Si movés los nameservers a Vercel: ellos manejan todo
5. La propagación DNS tarda entre 5 minutos y 24 horas

---

## PARTE 5 — Cargar los datos iniciales (Sembrar la BD)

### Paso 5.1 — Crear el script de siembra para la nueva marca

Duplicá el archivo `backend/sembrar-real.js` y renombralo:
`backend/sembrar-mirestaurante.js`

Editá el archivo para cambiar:
- Los productos (nombre, descripción, precios)
- Las categorías (Pizza, Pasta, Bebidas, etc.)
- Las sucursales
- El `tenant_id` de todos los registros a `'mirestaurante'`

### Paso 5.2 — Ejecutar la siembra

Abrí PowerShell y ejecutá:

```powershell
$env:DATABASE_URL="postgresql://postgres:xxx@xxx.rlwy.net:xxx/railway"
cd "F:\Programador GS\voraz-project\voraz-platform\backend"
node sembrar-mirestaurante.js
```

> Usá la DATABASE_URL de la base de datos **nueva** (la del Paso 2.2), no la de Voraz.

---

## PARTE 6 — Crear el usuario administrador

### Paso 6.1 — Registrar el usuario desde la web

1. Abrí la URL del nuevo frontend en Vercel
2. Hacé click en el ícono de usuario (login)
3. Registrate con el email del dueño del local

### Paso 6.2 — Asignar rol admin desde Railway

1. En Railway, andá al servicio de la **nueva base de datos**
2. Hacé click en la pestaña **"Data"** o usá el botón **"Query"**
3. Ejecutá este SQL (reemplazá el email):

```sql
UPDATE users SET role = 'admin' WHERE email = 'dueno@mirestaurante.com';
```

4. Verificá que devuelve `1 row affected`

### Paso 6.3 — Volver a iniciar sesión

El usuario debe cerrar sesión y volver a entrar para que el nuevo token JWT incluya el rol `admin`.
Una vez que inicia sesión, en el header aparece el botón **Admin** (engranaje amarillo).

---

## PARTE 7 — Configurar MercadoPago desde el panel admin

### Paso 7.1 — Obtener las credenciales

1. Ingresá a [mercadopago.com.ar/developers/panel/app](https://www.mercadopago.com.ar/developers/panel/app)
2. Creá una nueva aplicación para esta marca
3. En **"Credenciales de producción"** copiá:
   - **Access Token:** `APP_USR-xxxx...`
   - **Public Key:** `APP_USR-xxxx...`

### Paso 7.2 — Guardar en el panel admin

1. Ingresá al panel admin del nuevo sitio (botón engranaje amarillo)
2. Andá a la sección **"MercadoPago"**
3. Completá el formulario:
   - Access Token
   - Public Key
   - Toggle: **Modo Producción**
   - Nombre del local, email, teléfono
4. Hacé click en **"Guardar configuración"**
5. El indicador pasa a verde: "MercadoPago configurado y activo"

### Paso 7.3 — Configurar el Webhook

1. En la app de MercadoPago Developers → **"Notificaciones IPN"**
2. URL del servidor:
   ```
   https://mirestaurante-production.up.railway.app/api/payments/webhook
   ```
3. Activar evento: `payment`
4. Guardar

---

## PARTE 8 — Personalizar el logo (opcional)

Si la marca tiene un logo propio:

1. Guardá el archivo de logo como:
   ```
   frontend/public/images/logo-mirestaurante.png
   ```
   (recomendado: PNG transparente, 200x200px mínimo)

2. En `frontend/src/config/tenant.js`, actualizá:
   ```js
   logo: '/images/logo-mirestaurante.png',
   ```

3. Hacé commit y push:
   ```powershell
   git add .
   git commit -m "feat: logo mirestaurante"
   git push
   ```
   Vercel redeploya automáticamente.

---

## PARTE 9 — Verificación final

Chequeá cada punto antes de entregarle el acceso al cliente:

- [ ] `https://mirestaurante.vercel.app` abre con los colores correctos
- [ ] El nombre de la marca aparece en el navbar
- [ ] `/api/products` devuelve los productos cargados
- [ ] El login funciona
- [ ] El botón Admin aparece al iniciar sesión con el usuario admin
- [ ] El panel admin muestra estadísticas
- [ ] Se puede agregar/editar/eliminar productos
- [ ] MercadoPago aparece como "configurado" en el panel
- [ ] Un pedido de prueba llega correctamente
- [ ] (Si tiene dominio propio) El dominio responde en HTTPS

---

## Resumen de recursos por marca

| Recurso | Voraz (existente) | Nueva marca |
|---|---|---|
| **Frontend Vercel** | `voraz-platform.vercel.app` | `mirestaurante.vercel.app` |
| **Backend Railway** | `voraz-platform-production.up.railway.app` | `mirestaurante-production.up.railway.app` |
| **Base de datos** | Railway PostgreSQL #1 | Railway PostgreSQL #2 (nueva) |
| **VITE_TENANT_ID** | `voraz` | `mirestaurante` |
| **MercadoPago** | Cuenta de Voraz | Cuenta del nuevo cliente |

---

## Costos estimados en Railway (por nueva marca)

| Servicio | Plan | Costo aprox. |
|---|---|---|
| PostgreSQL | Hobby | **Gratis** (hasta 500MB) |
| Backend (Node.js) | Hobby | **~$5 USD/mes** |

Vercel es **gratuito** para proyectos con tráfico moderado.

---

## Preguntas frecuentes

**¿Puedo tener 5 marcas distintas?**
Sí. Repetís el proceso completo (Railway + Vercel) para cada marca. El código es el mismo repositorio.

**¿Los clientes de Voraz ven los datos de la otra marca?**
No. Cada backend tiene su propia base de datos. Los datos están 100% separados.

**¿Qué pasa si actualizo el código?**
Al hacer `git push`, **todos los deploys de Vercel** se actualizan automáticamente porque comparten el mismo repositorio. En Railway, cada servicio redeploya de forma independiente.

**¿Puedo cambiar los colores después del deploy?**
Sí. Editás `tenant.js`, hacés commit y push. Vercel redeploya en ~1 minuto.
