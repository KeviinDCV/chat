# K&G · Chat 🌶️💛

Chat privado entre dos personas (K y G), en rojo y amarillo. Listo para Vercel.

- Marco tipo iPhone en escritorio (centrado, no gigante).
- Animaciones tipo iMessage: burbujas con resorte, indicador de "escribiendo…", botón de envío con muelle.
- Indicador de **personas conectadas** en el header (pastilla verde con conteo `n/2`).
- **Presencia y "está escribiendo…" en tiempo casi-real** vía polling cada 2.5 s.
- Persistencia local: el caché sobrevive a apagado de pantalla, cambio de pestaña o cierre.
- Los mensajes viven 24 h en el servidor (plazo corto).
- 100 % gratis: usa Upstash Redis (plan free).

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS + Framer Motion
- Upstash Redis (capa de datos)
- API Routes en Edge Runtime

## Configurar Upstash en Vercel (2 minutos)

1. En Vercel, abre tu proyecto → pestaña **Storage** → **Create Database**.
2. Elige **Upstash → Redis**, plan **Free**.
3. Vercel inyectará automáticamente las variables de entorno (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) en tu proyecto.
4. **Redeploy** desde la pestaña Deployments para que las cojan las nuevas funciones.

> Si prefieres usar Upstash directo (sin marketplace), también puedes definir manualmente `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.

## Desarrollo local

```bash
npm install
# crea un .env.local con las credenciales de Upstash:
# KV_REST_API_URL=...
# KV_REST_API_TOKEN=...
npm run dev
```

Abre http://localhost:3000.

## Cómo funciona

- En el primer arranque, cada dispositivo elige **K** o **G** (se guarda en `localStorage`).
- Cada 2.5 s (visible) o 30 s (oculto) hace `POST /api/sync` con `{deviceId, name, lastTs, typing}`.
- El servidor guarda la presencia en un Hash (`kg:presence`) con ventana de 15 s y devuelve los mensajes nuevos del Sorted Set (`kg:messages`).
- `POST /api/send` añade el mensaje al Sorted Set, recorta los antiguos (>24 h) y limita a 300 mensajes.
- El cliente hace **optimistic update**: la burbuja aparece al instante (con `·`), y se confirma (`✓`) cuando el servidor responde.

## Estructura

- `app/` — layout, página, rutas API (`/api/sync`, `/api/send`).
- `components/` — `PhoneFrame`, `Header`, `Chat`, `Bubble`, `Composer`, `TypingIndicator`, `NamePrompt`.
- `lib/redis.ts` — cliente Upstash + claves + TTLs.
- `lib/identity.ts` — selección persistente de K o G.
- `lib/storage.ts` — caché local con TTL.
- `tailwind.config.ts` — paleta `flame` y animaciones.
