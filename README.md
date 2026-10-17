# Tosh — E-commerce

Tienda online para Argentina: **Next.js 16 + Payload CMS 3 (panel admin) + Postgres**, con cobro por **Mercado Pago**, transferencia bancaria, precios en **ARS o USD** (convertidos al dólar oficial BNA) y envíos por módulos (retiro, tarifas propias, Zipnova; Correo Argentino y Andreani preparados).

## Puesta en marcha (desarrollo)

Requisitos: Node 20+, pnpm 10, Docker.

```bash
docker compose up -d          # Postgres local en el puerto 5433
cp .env.example .env          # completar PAYLOAD_SECRET y CRON_SECRET
pnpm install
pnpm seed                     # datos de demo + usuario admin (la contraseña se imprime en consola)
pnpm dev                      # http://localhost:3100  ·  panel: http://localhost:3100/admin
```

`pnpm seed:reset` vacía el catálogo y lo vuelve a generar. Sin `RESEND_API_KEY` los emails se imprimen en la consola; sin credenciales de R2 las imágenes se guardan en disco.

## Qué carga el admin

| Sección | Para qué |
|---|---|
| **Catálogo → Productos** | Nombre, fotos, descripción, categoría, **moneda (ARS/USD)**, precio, precio tachado, IVA, peso y medidas. En "Variantes y stock" se definen opciones (Talle, Color) y cada variante con su SKU, **stock** y precio propio opcional. |
| **Ventas → Pedidos** | Estado (con historial y transiciones validadas), datos de MP, envío, tracking, notas. Acciones: reembolsar en MP y generar envío. |
| **Ventas → Cupones** | % o monto fijo, mínimo de compra, vigencia, límite total y por email. |
| **Envíos → Zonas de envío** | Tarifas propias por provincia o rango de CP, con tramos de peso. |
| **Configuración → Cotización del dólar** | Automática (BNA venta, cada hora) o manual, con controles anti-errores. |
| **Configuración → Tienda** | Datos legales, cuotas a publicitar, descuento y datos para transferencia, envío gratis, WhatsApp, analytics, portada. |

## Cómo funciona (decisiones clave)

- **Precios: una sola fuente de verdad.** `src/lib/pricing/computeCart.ts` es una función pura que calcula todo (conversión USD→ARS con redondeo, cupón, envío gratis, descuento por transferencia, IVA contenido). El navegador nunca calcula importes: el carrito y el checkout piden la cotización al servidor, y `placeOrder` vuelve a calcular todo antes de crear el pedido. Si el total cambió (cotización/stock), se le pide al comprador que confirme.
- **Cotización congelada.** Cada pedido guarda la cotización usada. Si DolarAPI falla o devuelve un salto anómalo, se conserva el último valor bueno y se avisa en el admin; si la cotización está vencida no se venden productos en USD.
- **Stock sin sobreventa.** Al crear el pedido se descuenta stock con un `UPDATE … WHERE stock >= qty` atómico dentro de la transacción (reserva). Vence a los 30 min (MP) o 48 h (transferencia); el cron libera las reservas vencidas, consultando antes a MP si hubo un pago. Probado con 20 checkouts concurrentes sobre stock 5.
- **Mercado Pago Checkout Pro.** El comprador paga en MP (cuotas, promos bancarias, dinero en cuenta, Mercado Crédito). El webhook valida la firma `x-signature` (HMAC-SHA256), consulta el pago a la API (nunca confía en el body ni en el query string), y procesa de forma idempotente. Contempla pagos rechazados (reintento), montos que no coinciden, pagos duplicados y pagos aprobados después de vencida la reserva (re-reserva o marca "sobreventa" para reembolsar).
- **Envíos por adaptadores.** `src/lib/shipping/types.ts` define `ShippingProvider { quote, createShipment, track }`. Hoy: retiro en local, tabla de tarifas propia (peso facturable = max(real, volumétrico L×A×H/5000)) y el adaptador de Zipnova (pendiente de credenciales).

## Integraciones: qué falta configurar

| Integración | Qué necesitás | Dónde |
|---|---|---|
| **Mercado Pago** | Access token y clave secreta de webhooks (Tus integraciones → tu app). Configurá la URL de notificación `https://TU-DOMINIO/api/webhooks/mercadopago` con el evento *Pagos*. | `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` |
| **Cuotas sin interés** | Activarlas en tu cuenta de MP (las absorbe el comercio) y reflejarlo en Configuración → Tienda. | Admin |
| **Resend** | API key y dominio verificado para enviar emails. | `RESEND_API_KEY`, `EMAIL_FROM` |
| **Cloudflare R2** | Bucket, access keys y dominio público. | `S3_*`, `NEXT_PUBLIC_MEDIA_URL` |
| **Zipnova** | Cuenta y credenciales de API. **El adaptador está vacío**: su API no es pública y hay que completarlo con su documentación (`src/lib/shipping/providers/zipnova.ts`). | `ZIPNOVA_*` |
| **Correo Argentino / Andreani** | Contrato propio (MiCorreo; Andreani exige volumen). Agregar el adaptador siguiendo la interfaz `ShippingProvider`. | Próxima fase |

### Probar Mercado Pago en sandbox

1. Usá el Access Token de **Credenciales de prueba** de tu app y creá una **cuenta de prueba Comprador** (Cuentas de prueba).
2. Pagá en una ventana de incógnito **sin tu sesión real de MP abierta**, iniciando sesión con la cuenta Comprador (si se mezclan cuentas reales y de prueba, MP muestra "una de las partes es de prueba"). Con credenciales de prueba la tienda no envía el email del pagador por ese motivo.
3. Medios: dinero disponible de la cuenta Comprador o [tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards) con titular `APRO` (aprobado), `OTHE` (rechazado) o `CONT` (pendiente).
4. En local MP no puede volver solo al sitio: tocá "Volver al sitio" y el pedido se confirma consultando la API.

**Webhooks y credenciales de prueba:** MP asigna a las credenciales de prueba una app interna distinta de la tuya, así que los pagos de prueba **no envían avisos firmados con tu clave** (la tienda los rechaza con 401, como corresponde). En sandbox los pedidos se confirman por el retorno al sitio o, si el comprador no vuelve, por la reconciliación del cron al vencer la reserva. Los webhooks se verifican en producción: configurá en el panel (Webhooks → Modo productivo) `https://TU-DOMINIO/api/webhooks/mercadopago` con el evento **Pagos**, y hacé una compra real chica antes de lanzar.

## Deploy en Vercel

1. Base de datos: Neon (usar la connection string **pooled**) → `DATABASE_URL`.
2. Variables de entorno: todas las de `.env.example`, con `NEXT_PUBLIC_SERVER_URL=https://tu-dominio`.
3. **Build Command:** `pnpm ci` (aplica las migraciones y compila).
4. Plan **Pro**: el plan Hobby no permite uso comercial y solo admite crons diarios. Los crons están en `vercel.json` (cotización cada hora, liberación de reservas cada 10 min).
5. Crear el primer usuario admin entrando a `/admin`.

Al cambiar colecciones: `pnpm migrate:create nombre` y commitear la migración (en desarrollo el esquema se sincroniza solo).

## Tests

```bash
pnpm test:unit   # 45 tests: precios, cupones, tarifas, firma MP, estados
pnpm test:int    # 15 tests contra Postgres (base tosh_test): concurrencia, reservas, pagos, cupones
pnpm test:e2e    # Playwright mobile + desktop: compra completa, admin, arrepentimiento (requiere pnpm seed)
pnpm typecheck && pnpm lint
```

Antes de correr `test:int` por primera vez: `docker compose exec postgres psql -U postgres -c "CREATE DATABASE tosh_test;"`.

## Cumplimiento (Argentina) — revisar con un profesional antes de lanzar

- [x] **Botón de arrepentimiento** visible en el pie y en emails, sin login, con código inmediato (Res. 424/2020).
- [x] **Botón de baja** de la cuenta (`/cuenta/baja`) y opt-out de novedades.
- [x] **Precio sin impuestos nacionales** en la ficha y el carrito (Ley 27.743).
- [x] Precios exhibidos en pesos con IVA incluido; cuotas publicitadas solo si son sin interés (con interés hay que informar CFT/TEA).
- [ ] Cargar el **QR de Data Fiscal** de ARCA en Configuración → Tienda.
- [ ] Reemplazar los **textos legales de ejemplo** (términos, privacidad, cambios) que crea el seed.
- [ ] **Facturación electrónica ARCA**: en v1 se carga a mano en el pedido (próxima fase: integración WSFE o un proveedor).

## Próximas fases

Carrito abandonado, facturación ARCA, Correo Argentino MiCorreo y Andreani directos, Payment Brick (pago embebido), reseñas, Meta CAPI.

**Limitación conocida:** ordenar por precio usa el precio cargado en su moneda, así que en un listado con productos en ARS y en USD el orden no es exacto. Se resolvería con un campo de precio en ARS precalculado.
