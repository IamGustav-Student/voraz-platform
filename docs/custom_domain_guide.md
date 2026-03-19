# Guía: Configuración de Dominios Personalizados 🌐

GastroRed ya está preparado para manejar dominios propios (ej: `voraz.com.ar`) de forma automática. Aquí te explico los 3 pasos para activarlo:

## 1. Configuración de DNS (Infraestructura)
El dueño del dominio (`voraz.com.ar`) debe apuntar su dominio a tu servidor. Esto se hace en su panel de control de dominios (donde lo compró):

*   **Opción A (Recomendada - CNAME):** Crear un registro CNAME que apunte a tu dominio raíz:
    *   `voraz.com.ar` -> `gastrored.com.ar`
*   **Opción B (IP - Registro A):** Apuntar el dominio a la IP de tu servidor en Railway.

> [!IMPORTANT]
> Una vez que el dominio apunta a Railway, Railway detectará la petición y le asignará un **certificado SSL (HTTPS)** automáticamente.

---

## 2. Configuración en la Base de Datos
Para que el sistema sepa a qué comercio mostrar cuando alguien entra a `voraz.com.ar`, debes registrar el dominio en la tabla de ese comercio.

**Comando SQL:**
```sql
UPDATE tenants 
SET custom_domain = 'voraz.com.ar' 
WHERE subdomain = 'voraz'; -- o el ID del comercio
```

---

## 3. ¿Cómo lo resuelve el sistema? (Lógica Interna)
El `tenantMiddleware` ya tiene esta lógica implementada:

1.  **Detecta el Host:** Cuando alguien entra a `voraz.com.ar`, el navegador envía el encabezado `Host: voraz.com.ar`.
2.  **Búsqueda por Subdominio:** El sistema primero mira si termina en `.gastrored.com.ar`. Como no, pasa al siguiente paso.
3.  **Búsqueda por Dominio Propio:** El sistema busca en la base de datos:
    `SELECT ... FROM tenants WHERE custom_domain = 'voraz.com.ar'`
4.  **Activación:** Si lo encuentra, carga toda la marca, productos y configuración de ese comercio como si estuviera en su subdominio original.

---

## Ejemplo Completo:
*   **Subdominio original:** `voraz.gastrored.com.ar`
*   **Dominio deseado:** `voraz.com.ar`
*   **Resultado:** Ambas URLs funcionarán, pero la marca del cliente se verá profesional y propia en `voraz.com.ar`.

> [!TIP]
> Si implementamos un botón en el Panel Superadmin, podrías cobrar un extra por "Activar Dominio Propio" y simplemente llenar ese campo en la base de datos.
