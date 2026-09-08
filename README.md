# Chat — simulador de celular

Chat estilo WhatsApp dentro de un simulador de celular. Blanco y negro,
centrado en pantalla y adaptable a cualquier tamaño de navegador.

**Incluye:** ingreso con nombre · mensajes · imágenes · emojis · historial
guardado · quién está conectado · aviso de «está escribiendo…».

El encabezado no muestra ningún nombre de sala: solo las personas conectadas.

Todo funciona con el plan **gratuito** de Vercel y el de **Upstash Redis**.

---

## Cómo está hecho

| Parte | Qué es |
|---|---|
| `index.html`, `css/`, `js/` | La interfaz. Sin dependencias ni build. |
| `api/sync.js` | Latido de presencia + mensajes nuevos + quién escribe. |
| `api/send.js` | Guarda un mensaje y recorta el historial. |
| `lib/redis.js` | Acceso a Upstash por su API REST (solo `fetch`). |

Las funciones de Vercel no mantienen conexiones abiertas, así que el navegador
**pregunta cada pocos segundos** si hay algo nuevo. Para no gastar la cuota, el
sondeo se frena solo:

| Situación | Cada |
|---|---|
| Hay conversación | 2,5 s |
| Más de 1 min tranquilo | 6 s |
| Más de 5 min tranquilo | 15 s |
| La pestaña no se ve | *se detiene* |

El aviso de «escribiendo…» viaja dentro de esa misma consulta, así que **no
genera ni una petición extra**.

---

## Paso 1 — Conectar Redis (gratis)

1. Entra a <https://vercel.com>, abre tu proyecto y ve a la pestaña **Storage**.
2. **Create Database → Redis (Upstash) → Continue.**
3. Elige el plan **Free**, ponle un nombre y créala.
4. Conéctala al proyecto (**Connect Project**) y marca los tres entornos:
   *Production*, *Preview* y *Development*.

Vercel añade solo las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
No hay que escribir ninguna clave a mano ni guardar nada en el repositorio.

> Si vas a desplegar antes de tener la base de datos, la app no falla en
> silencio: muestra el aviso «Falta conectar la base de datos».

## Paso 2 — Desplegar

Si el proyecto ya está importado desde GitHub, basta con subir los cambios:

```bash
git add -A && git commit -m "Chat con Redis" && git push
```

Si aún no lo has importado: en Vercel, **Add New → Project → Import**, elige el
repositorio, **Framework Preset: Other**, deja *Build Command* y *Output
Directory* vacíos y pulsa **Deploy**.

> Después de conectar la base de datos, vuelve a desplegar (**Deployments → ⋯ →
> Redeploy**) para que las funciones reciban las variables nuevas.

## Paso 3 — Probar en tu computador (opcional)

Ya **no** sirve abrir `index.html` directamente: hacen falta las funciones de
`/api`. Usa la CLI de Vercel:

```bash
npx vercel dev
```

La primera vez te pedirá vincular el proyecto; luego baja las variables de
entorno solo y todo funciona igual que en producción.

---

## Cómo usarlo

- Al entrar se pide un **nombre**; queda guardado para la próxima visita.
- El **historial** se carga solo (últimos 200 mensajes).
- El encabezado muestra **quién está conectado** (tú apareces como «Tú»).
  Si son muchos, el botón 👥 abre la lista completa.
- Cuando alguien escribe aparece **«… está escribiendo»** y unos puntitos.
- 📷 envía imágenes; se comprimen antes de subir. También puedes **pegar** una
  con `Ctrl+V`.
- 😀 abre el selector de emojis.
- El icono de salida borra tu nombre y vuelve a la pantalla de ingreso.

Aparecer «en línea» significa **tener la pestaña a la vista**. Si la dejas en
segundo plano, el chat deja de consultar (para ahorrar cuota) y a los 30 s
desapareces de la lista. Al volver, reapareces al instante.

## Personalizar

| Qué | Dónde |
|---|---|
| Conversación aparte | variable de entorno `ROOM_ID` en Vercel |
| Título de la pestaña | `index.html`, etiqueta `<title>` |
| Colores | variables `:root` en `css/style.css` |
| Ritmo del sondeo | constantes `POLL_*` en `js/app.js` |
| Cuántos mensajes se guardan | `MAX_MESSAGES` en `lib/redis.js` |
| Calidad de las imágenes | `IMAGE_*` en `js/app.js` |

`ROOM_ID` no se ve en pantalla: solo decide en qué rama de Redis se guardan los
mensajes. Si no la defines, vale `general`.

## Sobre el plan gratuito

Upstash Free da **500.000 comandos al mes**. Cada consulta gasta 3, así que
alcanza para unas **140 horas** de una persona con el chat abierto y a la vista.
Para un grupo pequeño sobra; si se queda corto, sube los valores de `POLL_*`.

Las imágenes se guardan comprimidas dentro de Redis (máx. ~700 KB cada una) y
desaparecen al salir de los últimos 200 mensajes. Si quieres imágenes grandes o
permanentes, lo suyo sería añadir **Vercel Blob**.

## Nota

El chat es abierto: cualquiera con el enlace puede leer y escribir.
No lo uses para información sensible.
