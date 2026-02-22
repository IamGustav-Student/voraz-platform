# Tutorial de Deploy — Voraz Platform
## Para principiantes | Railway + Vercel

> Tiempo estimado: 20-30 minutos  
> Dificultad: Principiante  
> Todo se hace desde el navegador, sin tocar código

---

## ANTES DE EMPEZAR — Chequeá que tenés esto

- [x] Cuenta de **GitHub** activa (ya tenés el repo `IamGustav-Student/voraz-platform`)
- [ ] Cuenta en **Railway** (gratis, la creamos en el Paso 1)
- [ ] Cuenta en **Vercel** (gratis, la creamos en el Paso 3)

---

# PARTE 1 — RAILWAY (El servidor + la base de datos)

Railway va a alojar:
- Tu **API (backend)** — el servidor Node.js
- Tu **base de datos PostgreSQL** — donde viven los productos, pedidos, usuarios

---

## PASO 1 — Crear cuenta en Railway

1. Abrí el navegador y andá a: **https://railway.app**

2. Vas a ver una pantalla con un botón grande que dice **"Start a New Project"** o **"Login"**

3. Hacé click en **"Login"**

4. Vas a ver opciones para registrarte. Elegí **"Login with GitHub"**
   - Va a abrirse una ventana de GitHub pidiendo permiso
   - Hacé click en **"Authorize Railway"**

5. Listo, ya estás adentro. Vas a ver el **Dashboard** de Railway (panel principal)

---

## PASO 2 — Crear el proyecto en Railway

1. En el Dashboard, buscá el botón **"New Project"** (arriba a la derecha o en el centro)
   - Es un botón con un ícono **"+"**

2. Hacé click. Va a aparecer un menú con opciones:
   ```
   ┌─────────────────────────────────┐
   │  Deploy from GitHub repo        │  ← Elegí ESTA
   │  Deploy a template              │
   │  Empty project                  │
   └─────────────────────────────────┘
   ```

3. Elegí **"Deploy from GitHub repo"**

4. Railway te va a pedir que conectes tu GitHub. Hacé click en **"Configure GitHub App"**
   - Se abre otra ventana de GitHub
   - En "Repository access" elegí **"Only select repositories"**
   - Buscá y seleccioná **"voraz-platform"**
   - Click en **"Save"**

5. Volvés a Railway. Ahora vas a ver el repo en la lista. Hacé click en **"voraz-platform"**

6. Railway va a preguntar de qué carpeta deployar. Por ahora clickeá **"Add service"** o simplemente **"Deploy Now"**
   - ⚠️ No importa si empieza a deployar y falla — lo vamos a configurar bien en el siguiente paso

---

## PASO 3 — Configurar el servicio del Backend

Después del paso anterior, vas a estar adentro de tu proyecto Railway.  
Vas a ver algo así:

```
┌─────────────────────────────────────────────┐
│  voraz-platform (proyecto)                   │
│                                             │
│  [Servicio: voraz-platform]                 │  ← Este es el backend
│                                             │
└─────────────────────────────────────────────┘
```

**Configurar el directorio raíz:**

1. Hacé click en el servicio **"voraz-platform"** (el cuadrado que aparece)

2. Se abre un panel. Buscá la pestaña **"Settings"** (Configuración)
   - Está en la parte superior del panel

3. Dentro de Settings, buscá la sección **"Build"** o **"Source"**

4. Buscá el campo que dice **"Root Directory"** o **"Watch Paths"**
   - Escribí exactamente: `backend`
   - Esto le dice a Railway "el código del servidor está dentro de la carpeta backend"

5. Un poco más abajo buscá **"Start Command"** o **"Custom Start Command"**
   - Si está vacío, escribí: `node src/index.js`
   - Si ya tiene algo, reemplazalo

6. Hacé click en **"Save"** o el botón para guardar (puede ser un check ✓)

7. Railway va a redeplegar automáticamente con la nueva config

---

## PASO 4 — Agregar la Base de Datos PostgreSQL

Este es el paso más importante. Sin la BD, el backend no funciona.

1. Mientras estás en el proyecto (donde ves el cuadrado del servicio), buscá el botón **"+ New"** o **"Add a service"**
   - Está generalmente arriba a la derecha del lienzo del proyecto

2. Hacé click. Aparece un menú:
   ```
   ┌─────────────────────────────────┐
   │  GitHub Repo                    │
   │  Database                       │  ← Elegí ESTA
   │  Template                       │
   └─────────────────────────────────┘
   ```

3. Elegí **"Database"**

4. Aparece la lista de bases de datos. Elegí **"PostgreSQL"** (tiene ícono de elefante azul 🐘)

5. Railway crea la base de datos automáticamente. Vas a ver un nuevo cuadrado en tu proyecto que dice **"Postgres"**

6. ¡Importante! Railway conecta la BD con tu backend **automáticamente** mediante la variable `DATABASE_URL`. No necesitás hacer nada más acá.

---

## PASO 5 — Agregar las Variables de Entorno del Backend

Las variables de entorno son como "configuraciones secretas" que el servidor necesita para funcionar.

1. Hacé click en el cuadrado de tu **servicio backend** (el que dice voraz-platform, no el de Postgres)

2. Andá a la pestaña **"Variables"**

3. Vas a ver un formulario para agregar variables. Tenés que agregar estas **una por una**:

   **Variable 1:**
   - Nombre: `JWT_SECRET`
   - Valor: `voraz_super_secret_2025_produccion_seguro`
   - Click en **"Add"**

   **Variable 2:**
   - Nombre: `NODE_ENV`
   - Valor: `production`
   - Click en **"Add"**

   **Variable 3 (la ponemos después, cuando tengamos la URL de Vercel):**
   - Nombre: `FRONTEND_URL`
   - Valor: por ahora ponemos `*` (un asterisco, para que deje pasar todo mientras configuramos)
   - Click en **"Add"**

4. Después de agregar las variables, Railway va a redeplegar automáticamente

---

## PASO 6 — Obtener la URL pública del Backend

Tu backend necesita una URL pública para que el frontend lo pueda llamar.

1. Hacé click en el servicio **backend**

2. Andá a la pestaña **"Settings"**

3. Bajá hasta encontrar la sección **"Networking"** o **"Domains"**

4. Hacé click en **"Generate Domain"** (o "Add Domain" → "Railway Domain")

5. Railway va a generar una URL como:
   ```
   https://voraz-platform-production-xxxx.up.railway.app
   ```

6. **COPIÁ ESA URL** — la vas a necesitar en el Paso 9 (Vercel)
   - Guardala en un bloc de notas o en algún lado

---

## PASO 7 — Verificar que el Backend funciona

Antes de seguir, comprobemos que el servidor está vivo.

1. Abrí una pestaña nueva en el navegador

2. Pegá la URL de Railway y agregale `/api/products` al final:
   ```
   https://TU-URL-RAILWAY.up.railway.app/api/products
   ```

3. Si ves algo como esto, **¡el backend está funcionando!** 🎉
   ```json
   {"status":"success","count":0,"data":[]}
   ```
   (Count 0 es normal, todavía no cargamos los datos)

4. Si ves un error o la página no carga, esperá 2 minutos y volvé a intentar
   - Railway tarda un poco en iniciar la primera vez

---

## PASO 8 — Cargar los datos reales en la Base de Datos

Ahora tenemos que "sembrar" los datos (productos, locales, etc.) en la BD de producción.

**Para hacer esto, necesitamos la URL de conexión de la BD:**

1. En tu proyecto Railway, hacé click en el cuadrado de **"Postgres"**

2. Andá a la pestaña **"Connect"**

3. Buscá la sección **"Public URL"** o **"Connection URL"**
   - Va a ser algo como:
   ```
   postgresql://postgres:AbCdEfGhIj@roundhouse.proxy.rlwy.net:12345/railway
   ```

4. Copiá esa URL completa

5. Ahora en tu computadora, abrí **PowerShell** como siempre y ejecutá:

```powershell
$env:DATABASE_URL="PEGÁ-ACÁ-LA-URL-DE-RAILWAY"
cd "F:\Programador GS\voraz-project\voraz-platform\backend"
node sembrar-real.js
```

**Ejemplo real:**
```powershell
$env:DATABASE_URL="postgresql://postgres:AbCdEfGhIj@roundhouse.proxy.rlwy.net:12345/railway"
cd "F:\Programador GS\voraz-project\voraz-platform\backend"
node sembrar-real.js
```

6. Vas a ver en la consola:
   ```
   🌱 Iniciando siembra con datos REALES de Voraz...
   ✅ 26 productos insertados
   ✅ 5 sucursales insertadas
   ✅ 4 influencers insertados
   ✅ 3 videos insertados
   ✅ 4 noticias insertadas
   ✅ ¡Siembra de datos REALES completada!
   ```

7. Ahora verificá de nuevo en el navegador:
   ```
   https://TU-URL-RAILWAY.up.railway.app/api/products
   ```
   Ahora deberías ver los 26 productos cargados ✅

---

# PARTE 2 — VERCEL (El sitio web / Frontend)

Vercel va a alojar la parte visual — lo que el usuario ve en el navegador.

---

## PASO 9 — Crear cuenta en Vercel

1. Abrí: **https://vercel.com**

2. Hacé click en **"Sign Up"**

3. Elegí **"Continue with GitHub"**
   - Autorizá a Vercel en la ventana de GitHub que aparece

4. Listo, estás en el Dashboard de Vercel

---

## PASO 10 — Importar el proyecto

1. En el Dashboard de Vercel, hacé click en **"Add New..."** → **"Project"**
   - O buscá el botón **"New Project"**

2. Vas a ver una lista de tus repos de GitHub

3. Buscá **"voraz-platform"** y hacé click en **"Import"**

---

## PASO 11 — Configurar el proyecto en Vercel

Esta es la pantalla más importante. Vercel te va a mostrar una pantalla de configuración antes de deployar.

**Configuración del Framework:**
- Vercel debería detectar automáticamente **"Vite"**
- Si no lo detecta, en "Framework Preset" elegí **"Vite"**

**Configuración del Root Directory:**
- Buscá el campo **"Root Directory"**
- Hacé click en el botón **"Edit"** que está al lado
- Escribí: `frontend`
- Confirmá

**Después de poner `frontend` como root, Vercel actualiza automáticamente:**
- Build Command: `npm run build` ✓
- Output Directory: `dist` ✓
- Install Command: `npm install` ✓

**⚠️ IMPORTANTE — Variables de entorno:**
- Buscá la sección **"Environment Variables"** (está al final de la página de configuración)
- Agregá esta variable:

  | Name | Value |
  |------|-------|
  | `VITE_API_URL` | `https://TU-URL-RAILWAY.up.railway.app/api` |

  > Reemplazá con la URL real que copiaste en el Paso 6
  > Acordate de agregar `/api` al final

- Hacé click en **"Add"**

**Finalmente:**
- Hacé click en el botón grande **"Deploy"**

---

## PASO 12 — Esperar el deploy de Vercel

1. Vercel va a mostrar una pantalla con logs en tiempo real
   - Vas a ver líneas como `Installing dependencies...`, `Building...`, etc.

2. El proceso tarda entre 1 y 3 minutos

3. Cuando termine, vas a ver:
   ```
   🎉 Congratulations! Your project has been deployed.
   ```
   Con una URL como: `https://voraz-platform.vercel.app`

4. **Copiá esa URL**

---

## PASO 13 — Conectar Vercel con Railway (CORS)

Ahora que tenés la URL de Vercel, tenés que decirle al backend que esa URL está autorizada.

1. Volvé a **Railway**

2. Entrá al servicio del backend → pestaña **"Variables"**

3. Buscá la variable `FRONTEND_URL` que pusiste en el Paso 5

4. Hacé click en el lápiz (editar) y cambiá el valor `*` por tu URL de Vercel:
   ```
   https://voraz-platform.vercel.app
   ```
   (sin barra al final)

5. Guardá. Railway redespliega automáticamente (tarda ~1 minuto)

---

## PASO 14 — Verificación final

Abrí tu URL de Vercel en el navegador. Deberías ver:

- ✅ La web de Voraz cargando con el menú real
- ✅ Los 26 productos con fotos
- ✅ Las 5 sucursales
- ✅ El squad (Coscu, Lula FYE, Rama FYE, etc.)
- ✅ Las noticias

---

## SOLUCIÓN DE PROBLEMAS COMUNES

### "La web carga pero no aparecen productos"
- **Causa:** La variable `VITE_API_URL` en Vercel está mal escrita o le falta `/api`
- **Fix:** En Vercel → tu proyecto → Settings → Environment Variables → editar `VITE_API_URL`
- Después ir a **Deployments** → hacer click en los tres puntos del último deploy → **"Redeploy"**

### "Error 502 o 503 en el backend"
- **Causa:** Railway todavía está iniciando el servidor
- **Fix:** Esperá 2-3 minutos y recargá

### "El seed falla con error de conexión"
- **Causa:** La URL de la BD está mal copiada
- **Fix:** Volvé a Railway → Postgres → Connect → copiá la URL de nuevo (cuidado con espacios)

### "Railway dice que el build falló"
- **Causa:** Posiblemente el Root Directory no está bien configurado
- **Fix:** Settings → Root Directory = `backend` (exactamente así, en minúscula)

---

## RESUMEN DE URLS — Guardá esto

Una vez terminado, completá esta tabla:

| Servicio | URL |
|----------|-----|
| Backend (Railway) | `https://_____________.up.railway.app` |
| Frontend (Vercel) | `https://_____________.vercel.app` |
| DB Public URL | `postgresql://postgres:_____@_____.rlwy.net:_____/railway` |

---

## PRÓXIMOS PASOS OPCIONALES

Una vez que todo esté online, si querés:

- **Dominio propio** (ej: `voraz.com.ar`): En Vercel → Settings → Domains → Add
- **MercadoPago real**: Agregar variable `MP_ACCESS_TOKEN` en Railway con tu token de producción
- **Google Login real**: Crear app en Google Cloud Console y agregar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en Railway
