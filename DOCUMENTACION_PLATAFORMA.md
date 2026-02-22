# VORAZ Platform — Documentación Técnica Completa

> **Versión:** 2.0 — Niveles 1 y 2 implementados  
> **Stack:** React 19 + Node.js + PostgreSQL  
> **Estado:** Producción-ready con modo demo activo

---

## Índice

1. [¿Qué es VORAZ Platform?](#1-qué-es-voraz-platform)
2. [Tecnologías utilizadas](#2-tecnologías-utilizadas)
3. [Contexto del negocio](#3-contexto-del-negocio)
4. [Módulos del Frontend](#4-módulos-del-frontend)
5. [API REST — Endpoints completos](#5-api-rest--endpoints-completos)
6. [Sistema de Base de Datos](#6-sistema-de-base-de-datos)
7. [Funcionalidades implementadas](#7-funcionalidades-implementadas)
8. [Funcionalidades planificadas](#8-funcionalidades-planificadas)
9. [Flujos de usuario completos](#9-flujos-de-usuario-completos)
10. [Decisiones de diseño](#10-decisiones-de-diseño)

---

## 1. ¿Qué es VORAZ Platform?

VORAZ Platform es una **aplicación web full-stack** diseñada exclusivamente para la cadena de hamburgueserías **Voraz** (Argentina). Es una plataforma propia, independiente de apps de delivery de terceros (PedidosYa, Rappi), que permite:

- **Mostrar el menú** completo con fotos, precios y categorías
- **Recibir pedidos online** (delivery o retiro en local)
- **Procesar pagos** con MercadoPago
- **Fidelizar clientes** con un sistema de puntos (Voraz Club)
- **Gestionar cupones** de descuento
- **Autenticar usuarios** con email/contraseña o Google
- **Hacer seguimiento** del estado del pedido en tiempo real
- **Mostrar contenido de marca**: Squad, videos, locales, noticias

La plataforma está construida con filosofía **Mobile First**, priorizando la experiencia en celular sin sacrificar el diseño en desktop.

---

## 2. Tecnologías utilizadas

### Frontend
| Tecnología | Versión | Rol |
|---|---|---|
| **React** | 19.x | Framework de UI |
| **Vite** | 7.x | Bundler + servidor de desarrollo |
| **Tailwind CSS** | 3.4 | Estilos utilitarios |
| **Framer Motion** | 12.x | Animaciones fluidas |
| **React Helmet Async** | 2.x | SEO dinámico (título por vista) |

### Backend
| Tecnología | Versión | Rol |
|---|---|---|
| **Node.js** | 18+ | Runtime de JavaScript |
| **Express** | 4.x | Framework HTTP/REST |
| **pg** | 8.x | Cliente PostgreSQL |
| **bcrypt** | 6.x | Hash de contraseñas |
| **jsonwebtoken** | 9.x | Autenticación JWT |
| **passport** | 0.7 | Middleware de autenticación |
| **passport-google-oauth20** | 2.x | OAuth con Google |
| **mercadopago** | 2.x | SDK oficial de MercadoPago |
| **morgan** | 1.x | Logger HTTP |

### Infraestructura
| Servicio | Rol |
|---|---|
| **Docker** | Base de datos local (PostgreSQL) |
| **Railway** | Hosting del Backend + PostgreSQL en producción |
| **Vercel** | Hosting del Frontend (CDN global) |

---

## 3. Contexto del negocio

### Quién es Voraz
Voraz es una cadena de hamburgueserías artesanales con varias sucursales en Buenos Aires. Tiene una identidad de marca fuerte: oscura, bold, con toques de rojo y amarillo, apuntada a un público joven y fanático de las burgers de calidad.

### Por qué una plataforma propia
Actualmente Voraz depende 100% de terceros (PedidosYa, Rappi) para recibir pedidos, lo que implica:
- Comisiones del 20-30% por cada pedido
- Sin acceso a los datos de sus propios clientes
- Sin capacidad de fidelización directa
- Sin identidad propia en el canal digital

VORAZ Platform resuelve todos estos problemas con una plataforma 100% propia.

---

## 4. Módulos del Frontend

### 4.1 Navegación

**Desktop (PC):** Header fijo con íconos circulares de navegación + botón de carrito + botón de usuario.

**Mobile:** Header superior con logo + botones de carrito y usuario. Bottom navigation con 5 ítems y botón central flotante (V de Voraz).

Los botones de navegación usan fotos reales de cada sección para una experiencia visual premium.

---

### 4.2 Módulo: Menú

**Vista:** Grid de tarjetas de productos, filtrable por categoría.

**Características:**
- **Carrusel de destacados** (mobile): Scroll horizontal con los productos con badge
- **Filtros sticky**: Las categorías se fijan al top al hacer scroll
- **Tarjetas de producto**: Imagen + nombre + descripción + precio + badge (NUEVO, PICANTE, BEST SELLER)
- **Skeleton loader**: Animación de carga mientras se obtienen los datos

**Al tocar una tarjeta** se abre el Modal de Producto.

---

### 4.3 Modal de Producto

Pantalla completa (mobile) o modal centrado (desktop) que muestra:
- Imagen grande del producto
- Categoría, nombre y descripción completa
- Tags informativos
- Precio
- Botón **"Agregar al pedido"** → agrega al carrito y abre el CartDrawer

---

### 4.4 Módulo: Carrito (CartDrawer)

Panel lateral/bottom sheet que maneja el flujo de compra completo en 2 pasos:

**Paso 1 — Mi Pedido:**
- Lista de items con foto, nombre, precio y controles de cantidad (+/-)
- Campo de **cupón de descuento** con validación en tiempo real
- Sección de **canje de puntos** (si el usuario tiene ≥100 pts)
- Resumen de precios (subtotal, descuentos, total final)
- Puntos estimados a ganar con el pedido
- Botón "Iniciá sesión para ganar X puntos" (si no está logueado)

**Paso 2 — Confirmar Pedido:**
- Selector Delivery / Retiro en local
- Campos de nombre y teléfono (pre-llenados si el usuario está logueado)
- Campo de dirección (si delivery) o selector de sucursal (si retiro)
- Campo de notas opcionales
- Resumen final con total con descuentos aplicados

---

### 4.5 Módulo: Tracking de Pedido (OrderTracking)

Vista dedicada que se muestra después de confirmar un pedido. Hace **polling automático cada 5 segundos** al backend para actualizar el estado.

**Estados del pedido:**
```
pending → confirmed → preparing → ready → delivering → delivered
                                        ↘ (pickup) ready → delivered
```

Muestra:
- Emoji e ícono grande del estado actual
- Barra de progreso visual
- Detalle de items y precios
- Info de contacto/dirección/sucursal
- Tiempo de actualización

---

### 4.6 Módulo: Autenticación (AuthModal)

Modal de login/registro con dos modos intercambiables:

**Registro:**
- Nombre, teléfono (opcional), email, contraseña
- Bonus de bienvenida: 50 puntos automáticos al registrarse
- Botón de Google OAuth (si está configurado)

**Login:**
- Email + contraseña
- Botón de Google OAuth
- Mensaje de error descriptivo

El token JWT se guarda en `localStorage` bajo la clave `voraz_token`.

---

### 4.7 Módulo: Voraz Club

Dashboard de fidelización para usuarios logueados. Muestra:

**Tarjeta de puntos:**
- Saldo actual en puntos grande y visible
- Barra de progreso hacia el próximo canje
- Equivalencia en pesos ($500 cada 100 puntos)

**Cómo funciona (infográfico):**
- 🛒 Comprá → 1 pt c/ $100
- ⭐ Acumulá → 100 pts = $500
- 🎁 Canjea en tu próximo pedido

**Tabs:**
- **Mis Puntos:** Historial de movimientos (earned/redeemed/bonus) con fecha y monto
- **Mis Pedidos:** Historial de pedidos con estado, tipo, total y puntos ganados

**Para usuarios no logueados:** Pantalla de invitación con beneficios del club.

---

### 4.8 Módulo: Squad (Community)

Grid de influencers/embajadores de la marca con foto y handle de redes sociales.

---

### 4.9 Módulo: Live (Videos)

Grid de videos con thumbnail, botón de play superpuesto y título.

---

### 4.10 Módulo: Spots (Locales)

Tarjetas de cada sucursal con:
- Foto del local
- Nombre y dirección
- Botón "Cómo llegar" (Waze)
- Botón "Delivery" (link a PedidosYa/Rappi)

---

### 4.11 Módulo: Delivery Express

Lista de locales con link directo a la plataforma de delivery de cada uno.

---

### 4.12 Módulo: Mundo Voraz

Sección editorial/blog con noticias, lanzamientos y novedades de la marca.

---

## 5. API REST — Endpoints completos

### Base URL
- Local: `http://localhost:3000/api`
- Producción: `https://[backend].up.railway.app/api`

---

### Productos
| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| GET | `/products` | Lista todos los productos del menú | No |
| GET | `/products/:id` | Obtiene un producto por ID | No |

---

### Locales
| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| GET | `/stores` | Lista todas las sucursales | No |

---

### Pedidos
| Método | Endpoint | Body | Auth |
|---|---|---|---|
| POST | `/orders` | `{ customer_name, customer_phone, order_type, delivery_address?, store_id?, items[], total, user_id?, coupon_id?, discount?, points_redeemed? }` | Opcional |
| GET | `/orders/:id` | — | No |
| PATCH | `/orders/:id/status` | `{ status }` | No (proteger en producción) |

**Estados válidos:** `pending` → `confirmed` → `preparing` → `ready` → `delivering` → `delivered` / `cancelled`

---

### Pagos
| Método | Endpoint | Body | Descripción |
|---|---|---|---|
| POST | `/payments/preference` | `{ order_id, items[], customer_email }` | Crea preferencia MP o confirma en modo demo |
| POST | `/payments/webhook` | MP payload | Webhook de notificaciones MercadoPago |

---

### Autenticación
| Método | Endpoint | Body | Descripción |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password, name, phone? }` | Registro + bonus 50pts |
| POST | `/auth/login` | `{ email, password }` | Login → devuelve JWT |
| GET | `/auth/me` | — | Datos del usuario logueado |
| GET | `/auth/google` | — | Inicia flujo OAuth Google |
| GET | `/auth/google/callback` | — | Callback de Google → redirect con token |

---

### Usuarios
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/users/:id/points` | JWT | Puntos y historial del usuario |
| GET | `/users/:id/orders` | JWT | Historial de pedidos del usuario |
| PATCH | `/users/me` | JWT | Actualizar nombre/teléfono |

---

### Cupones
| Método | Endpoint | Body | Auth |
|---|---|---|---|
| POST | `/coupons/validate` | `{ code, order_total }` | Valida y calcula descuento | No |
| GET | `/coupons` | — | Lista todos los cupones | No |
| POST | `/coupons` | `{ code, description, discount_type, discount_value, min_order, max_uses?, expires_at? }` | Crear cupón | JWT |

---

### Contenido
| Endpoint | Descripción |
|---|---|
| GET `/community` | Influencers del Squad |
| GET `/videos` | Videos/Lives |
| GET `/news` | Noticias del Mundo Voraz |

---

## 6. Sistema de Base de Datos

### Diagrama de tablas

```
products          stores           users
─────────         ──────           ─────
id                id               id
name              name             email (unique)
description       address          password_hash
price             image_url        name
category          waze_link        phone
image_url         delivery_link    google_id (unique)
badge             created_at       avatar_url
created_at                         points
                                   created_at

orders                        order_items
──────                        ───────────
id                            id
customer_name                 order_id → orders
customer_phone                product_id → products
order_type (delivery/pickup)  product_name
delivery_address              product_price
store_id → stores             quantity
status                        notes
total                         subtotal
payment_status
payment_id
discount
user_id → users
coupon_id → coupons
points_earned
points_redeemed
created_at / updated_at

coupons                       coupon_uses
───────                       ───────────
id                            id
code (unique)                 coupon_id → coupons
description                   user_id → users
discount_type (%)             order_id → orders
discount_value                used_at
min_order
max_uses
used_count
expires_at
active

points_history
──────────────
id
user_id → users
order_id → orders
points
type (earned/redeemed/bonus)
description
created_at
```

### Reglas de negocio
- **1 punto** por cada **$100 ARS** gastados (calculado sobre el total final)
- **100 puntos = $500 ARS** de descuento (ratio: 5 pesos por punto)
- Los puntos se acreditan cuando el pedido pasa a estado `delivered`
- **Bonus de bienvenida: 50 puntos** al registrarse
- Los puntos canjeados se descuentan de inmediato al crear el pedido
- Los cupones solo se validan server-side (no se puede hackear client-side)

---

## 7. Funcionalidades implementadas

### Nivel 1 — Transaccionalidad ✅

| Funcionalidad | Estado | Descripción |
|---|---|---|
| Carrito nativo | ✅ | Context + Reducer, persistente en sesión |
| Checkout delivery | ✅ | Nombre, teléfono, dirección |
| Checkout pickup | ✅ | Nombre, teléfono, selección de sucursal |
| Crear pedido API | ✅ | POST /api/orders con validaciones |
| MercadoPago | ✅ | SDK v2, modo demo sin credenciales |
| Tracking en vivo | ✅ | Polling 5s, barra de progreso, estados |
| Cupones en checkout | ✅ | Validación en tiempo real, descuento aplicado |

### Nivel 2 — Fidelización ✅

| Funcionalidad | Estado | Descripción |
|---|---|---|
| Registro email/pass | ✅ | bcrypt hash, JWT 30 días |
| Login email/pass | ✅ | Validación segura |
| Google OAuth | ✅ | Condicional según env vars |
| JWT middleware | ✅ | authMiddleware + optionalAuth |
| Voraz Club (puntos) | ✅ | Acumulación + canje + historial |
| Canje de puntos | ✅ | En el carrito, 100 pts = $500 |
| Sistema de cupones | ✅ | Porcentaje/fijo, min_order, max_uses, expiry |
| Historial de pedidos | ✅ | Por usuario autenticado |
| Perfil de usuario | ✅ | Con avatar, nombre y teléfono |
| Bonus bienvenida | ✅ | 50 puntos al registrarse |

---

## 8. Funcionalidades planificadas

### Nivel 3 — Engagement (próximamente)

| Funcionalidad | Prioridad | Descripción |
|---|---|---|
| Constructor de burger 2D | Alta | Interfaz drag-and-drop para armar burger custom |
| PWA (App instalable) | Alta | Instalar en celular como app nativa |
| Push Notifications | Media | Notificar cuando el pedido avanza de estado |
| Dark / Light Mode | Baja | Toggle de tema en la app |
| Apple Sign-In | Media | OAuth con Apple ID |

### Nivel 4 — Backoffice (futuro)

| Funcionalidad | Descripción |
|---|---|
| Panel /admin | Dashboard para el dueño del restaurante |
| Gestión de menú | Agregar/editar/ocultar productos, cambiar precios |
| Gestión de stock | Marcar productos como agotados |
| Gestión de pedidos | Ver y actualizar estados en tiempo real |
| Estadísticas | Ventas por día/semana/mes, productos más pedidos |
| Gestión de cupones | Crear, activar/desactivar, ver uso |

---

## 9. Flujos de usuario completos

### Flujo A — Compra sin login (guest)

```
1. Entra a la app → Ve el menú
2. Toca una burger → Abre el modal
3. "Agregar al pedido" → Carrito se abre
4. Agrega cupón (opcional) → Precio actualiza
5. "Continuar" → Formulario de checkout
6. Completa datos + delivery/pickup
7. "Confirmar y Pagar" → Crea el pedido
8. Sin MP_ACCESS_TOKEN → modo demo → pedido CONFIRMED
9. Redirige a tracking → Ve estado en vivo
10. Ve banner "Iniciá sesión para ganar X puntos"
```

### Flujo B — Compra con usuario registrado

```
1. Abre la app → Toca el ícono de usuario
2. Se registra (50 pts bonus) o hace login
3. Agrega productos al carrito
4. Aplica cupón: "VORAZ10" → -10%
5. Canjea 100 puntos → -$500 adicional
6. "Continuar" → Datos pre-llenados con su perfil
7. Confirma el pedido
8. MercadoPago paga → pedido CONFIRMED
9. Tracking en vivo → Ve su pedido avanzar
10. Cuando llega: +N puntos acreditados en su cuenta
```

### Flujo C — Revisión en Voraz Club

```
1. Toca el ícono de usuario (con indicador verde si logueado)
2. Ve su tarjeta de puntos con el saldo actual
3. Ve la barra de progreso hacia el próximo canje
4. Tab "Mis Puntos" → ve todos los movimientos
5. Tab "Mis Pedidos" → ve su historial completo
```

---

## 10. Decisiones de diseño

### Mobile First
La app fue diseñada primero para celular:
- Bottom navigation en mobile (como app nativa)
- Header simplificado en mobile
- Bottom sheets en lugar de modals para CarritoDrawer, AuthModal
- Fuentes y botones grandes para touch
- No hay hover states en mobile (usa active states)

### Sin Router
La app usa **estado local** (`currentView`) en lugar de React Router para navegar entre vistas. Esto fue una decisión deliberada para:
- Simplificar el código
- Evitar problemas de routing en Vercel
- Comportamiento más parecido a una app nativa

### Animaciones
Framer Motion en puntos clave:
- `AnimatePresence` + `mode='wait'` para transiciones entre vistas
- Spring animations en modales y drawers (sensación nativa)
- `layoutId` en las tarjetas de producto para transición suave al modal
- `whileTap` en botones para feedback táctil

### Modo Demo
El sistema detecta automáticamente si las credenciales de MercadoPago están configuradas:
- **Con MP_ACCESS_TOKEN:** Redirige a MercadoPago real
- **Sin MP_ACCESS_TOKEN:** Confirma el pedido automáticamente (útil para desarrollo y demos al cliente)
