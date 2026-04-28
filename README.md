# Llama · Chat 🌶️💛

Un chat hermoso en rojo y amarillo, listo para Vercel.

- Mobile-first, en escritorio simula un celular centrado y pequeño.
- Animaciones tipo iMessage: burbujas con resorte, indicador de "escribiendo…", botón de envío que aparece con muelle.
- El estado se persiste en `localStorage` y se guarda al apagarse la pantalla, cambiar de pestaña o cerrar el navegador.
- Los mensajes viven 24 h (plazo corto). Pasado ese tiempo se descartan automáticamente al cargar.
- 100 % gratis: no necesita base de datos ni servicios externos.

## Desarrollo

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Desplegar a Vercel

1. Sube este directorio a un repo (GitHub, GitLab, Bitbucket).
2. Entra a https://vercel.com/new e importa el repo.
3. Acepta los valores por defecto (framework: Next.js).
4. Click en **Deploy** y listo.

No requiere variables de entorno.

## Estructura

- `app/` — App Router (layout + página principal).
- `components/` — `PhoneFrame`, `Header`, `Chat`, `Bubble`, `Composer`, `TypingIndicator`.
- `lib/storage.ts` — persistencia local con TTL.
- `lib/bot.ts` — respuestas del compañero virtual.
- `tailwind.config.ts` — paleta `flame` (rojos y ámbares) + animaciones.
