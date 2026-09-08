# Chat — simulador de celular

Chat en tiempo real, estilo WhatsApp, dentro de un simulador de celular.
Blanco y negro, centrado en pantalla y adaptable a cualquier tamaño de navegador.

**Incluye:** ingreso con nombre · mensajes en tiempo real · imágenes · emojis ·
historial guardado · lista de quién está conectado.

El encabezado no muestra ningún nombre de sala: solo las personas conectadas
en ese momento.

Todo funciona con el plan **gratuito** de Firebase y el plan **gratuito** de Vercel.

---

## Paso 1 — Crear la base de datos (Firebase, gratis)

1. Entra a <https://console.firebase.google.com> y pulsa **Agregar proyecto**.
   (Puedes desactivar Google Analytics, no hace falta.)
2. En el menú lateral: **Compilación → Realtime Database → Crear base de datos**.
   - Ubicación: la que quieras.
   - Elige **Comenzar en modo de prueba**.
3. Ve a la pestaña **Reglas** de esa base de datos, borra lo que haya y pega el
   contenido del archivo [`database.rules.json`](database.rules.json). Pulsa **Publicar**.
4. Arriba a la izquierda, **⚙️ Configuración del proyecto → Tus apps → icono Web `</>`**.
   Registra la app (cualquier nombre) y copia el bloque `firebaseConfig`.

## Paso 2 — Pegar la configuración

Abre `js/firebase-config.js` y reemplaza los valores por los tuyos:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "mi-chat.firebaseapp.com",
  databaseURL: "https://mi-chat-default-rtdb.firebaseio.com",
  projectId: "mi-chat",
  storageBucket: "mi-chat.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123"
};

const ROOM_ID = "general";
```

> **`databaseURL` es obligatorio.** Si no aparece en el bloque que copiaste,
> tómalo de la pantalla de Realtime Database (arriba, empieza con `https://`).

Estas claves son públicas por diseño en Firebase Web; quien protege los datos
son las **reglas** del Paso 1.3.

## Paso 3 — Probar en tu computador

Abre `index.html` directamente en el navegador. Ya debería funcionar.

Si prefieres un servidor local:

```bash
npx serve .
```

## Paso 4 — Subir a GitHub

Desde esta carpeta:

```bash
git init
git add .
git commit -m "Chat"
git branch -M main
git remote add origin https://github.com/USUARIO/REPO.git
git push -u origin main
```

> **Sí debes subir `js/firebase-config.js`.** Sin ese archivo el chat no
> funciona en Vercel. Las claves web de Firebase son públicas por diseño
> (viajan al navegador de todos modos); lo que protege los datos son las
> **reglas** que publicaste en el Paso 1.3.
>
> Si prefieres que nadie vea tu configuración, crea el repositorio como
> **privado**: Vercel igual puede importarlo.

## Paso 5 — Importar el proyecto en Vercel

1. Entra a <https://vercel.com> y crea una cuenta gratis (entra con GitHub).
2. **Add New → Project → Import** y elige tu repositorio.
3. **Framework Preset: Other.** Deja Build Command y Output Directory vacíos.
4. **Deploy.** En unos segundos tienes la URL.

Cada `git push` a `main` vuelve a desplegar solo.

---

## Cómo usarlo

- Al entrar se pide un **nombre**; queda guardado para la próxima visita.
- El **historial** se carga solo (últimos 200 mensajes).
- El encabezado muestra **los nombres de quienes están conectados** ahora mismo
  (tú apareces como «Tú»). Si son muchos, el botón 👥 abre la lista completa.
- 📷 envía imágenes (se comprimen automáticamente antes de subir).
  También puedes **pegar** una imagen con `Ctrl+V`.
- 😀 abre el selector de emojis (también sirve el teclado de tu sistema).
- El icono de salida borra tu nombre y vuelve a la pantalla de ingreso.

## Personalizar

| Qué | Dónde |
|---|---|
| Conversación privada (rama en la base de datos) | `ROOM_ID` en `js/firebase-config.js` |
| Título de la pestaña | `index.html`, etiqueta `<title>` |
| Colores | variables `:root` en `css/style.css` |
| Cuántos mensajes se cargan | `MAX_MESSAGES` en `js/app.js` |
| Calidad/tamaño de imágenes | `IMAGE_MAX_SIDE`, `IMAGE_QUALITY` en `js/app.js` |

`ROOM_ID` no se ve en pantalla: solo decide en qué rama de la base de datos se
guardan los mensajes. Cámbialo por algo impredecible (`"7f3a91c4"`) si quieres
separar la conversación; todos deben tener el mismo valor.

## Límites del plan gratuito de Firebase

- 1 GB de almacenamiento · 10 GB de descarga al mes
- 100 conexiones simultáneas

Más que suficiente para un chat pequeño. Las imágenes se guardan comprimidas
dentro de la base de datos, así que evita mandar cientos de fotos grandes.

## Nota

El chat es abierto: cualquiera con el enlace y el `ROOM_ID` puede leer y escribir.
No lo uses para información sensible.
