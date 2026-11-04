# Despliegue

## Situación actual

- **Repositorio:** `git@github.com:citizen987/game_web_happybirthday.git` (rama `main`).
- **Sitio:** https://gamehappybirthday.netlify.app/
- **Modo:** despliegue continuo. Cada push a `main` dispara un nuevo deploy en Netlify en segundos.

## Configuración (`netlify.toml`)

```toml
[build]
  publish = "."   # se publica la raíz del repo
  command = ""    # sin build
```

También fija `Cache-Control: max-age=0, must-revalidate` para `/src/*` y `/css/*`. Así, tras un deploy, los navegadores no mezclan módulos viejos y nuevos.

> `netlify.toml` tiene prioridad sobre lo configurado en la interfaz web de Netlify.

## Publicar un cambio

1. Verifica en local (checklist en [development.md](development.md#verificación-antes-de-hacer-push)).
2. Haz commit y push:

   ```bash
   git add -A
   git commit -m "feat: ..."
   git push
   ```

3. Comprueba el deploy en el panel de Netlify (*Deploys*) o directamente en la URL.

## Montarlo desde cero (otra cuenta o sitio nuevo)

1. En Netlify: **Add new site → Import an existing project → GitHub** y elige el repositorio.
2. Deja vacío el *Build command* y pon `.` en el *Publish directory*. `netlify.toml` ya lo fija igualmente.
3. **Deploy.** Para cambiar el subdominio: *Site configuration → Change site name*.

Alternativa sin git: arrastra la carpeta del proyecto a https://app.netlify.com/drop.

## Vista previa del enlace (Open Graph)

`index.html` lleva etiquetas `og:*` y `twitter:card`, así que al pegar la URL en WhatsApp o Telegram aparece una tarjeta con la cara de David y "¡Felicidades, David!".

- Imagen: `assets/og-image.png` (1200×630). Lo esencial (título y cara) va dentro del **cuadrado central de 630 px**, porque WhatsApp suele recortar la miniatura así.
- Se regenera con `python3 -I assets/og/generate_og.py` (Pillow y una fuente Noto Sans o DejaVu Sans en negrita).
- `og:image` y `og:url` usan la **URL absoluta** de producción; si cambia el dominio, actualízalas.
- WhatsApp y Facebook cachean la vista previa. Tras cambiar la imagen, puede tardar en verse; el [Sharing Debugger de Facebook](https://developers.facebook.com/tools/debug/) fuerza a releerla.

## GitHub Pages (segundo destino)

El workflow `.github/workflows/pages.yml` publica el juego en GitHub Pages en cada push a `main`. Netlify sigue funcionando igual: si los dos están activos, ambos se actualizan con cada push.

**Activación (una sola vez):**

1. El repo debe ser **público** para usar GitHub Pages gratis: *Settings → General → Danger Zone → Change visibility*.
2. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
3. Haz push a `main`, o lánzalo a mano en *Actions → Deploy to GitHub Pages → Run workflow*.
4. La URL será `https://citizen987.github.io/game_web_happybirthday/` (también aparece en *Settings → Pages* y en el job).

**Qué hace el workflow:**

- `node .github/scripts/check-precache.mjs`: falla si algún módulo de `src/` no está en el `PRECACHE` de `sw.js`.
- `bash .github/scripts/build-pages.sh` monta `_site/` **solo con los archivos del juego** (`index.html`, `sw.js`, `manifest.webmanifest`, `robots.txt`, `css/`, `src/` y los PNG de `assets/`) y reescribe las URL absolutas de Open Graph con la de GitHub Pages, para que la vista previa del enlace apunte a ese sitio. **Si añades archivos o carpetas nuevos del juego en la raíz o en `assets/`, añádelos también a este script.**
- Se publica con `actions/upload-pages-artifact` y `actions/deploy-pages`.

Para probarlo en local: `SITE_URL=https://citizen987.github.io/game_web_happybirthday bash .github/scripts/build-pages.sh` y servir `_site/` dentro de una carpeta `game_web_happybirthday/`.

**Diferencias con Netlify:**

- GitHub Pages no permite cabeceras propias: no hay `X-Robots-Tag` ni `no-cache` para `sw.js` (sirve todo con ~10 min de caché, así que una actualización puede tardar ese tiempo en verse).
- Sin píldora del hosting (`OverlayGuard` no mueve nada).
- El texto y la tarjeta para compartir usan automáticamente la URL desde la que se juega (`src/core/site.js`).

## Buscadores (noindex)

El juego es un regalo privado y no debe aparecer en buscadores:

- `index.html` lleva `<meta name="robots" content="noindex, nofollow">`. **Es lo que lo garantiza**, en cualquier hosting.
- Netlify añade además la cabecera `X-Robots-Tag: noindex, nofollow` a todo el sitio.
- `robots.txt` bloquea a los buscadores pero **permite a los lectores de vista previa** (WhatsApp, Telegram, Facebook, X, Discord, Slack), para que los enlaces compartidos sigan mostrando la tarjeta. En GitHub Pages solo tiene efecto con dominio propio, porque `robots.txt` solo cuenta en la raíz del dominio; allí basta con el `noindex`.

## Archivos que no se publican

Netlify publica la raíz del repo, así que `netlify.toml` oculta con **redirecciones forzadas a 404** todo lo que no es del juego: `docs/`, `tests/`, `odd/`, los scripts generadores (`assets/og/`, `assets/icons/generate_icons.py`), `README.md`, `CLAUDE.md`, `netlify.toml`, `.gitignore` y `.github/`. En GitHub Pages no hace falta: el workflow solo publica los archivos del juego. Si añades carpetas o archivos que no sean del juego en la raíz, añade su regla ahí.

## Notas

- Netlify inyecta en el HTML servido un comentario y un script propio (`/.netlify/scripts/hud`) que muestra una **píldora "Netlify" abajo a la derecha**. En el plan gratuito no se puede ocultar (el propio script ignora el "ocultar"), así que el juego **sube los botones táctiles** que quedarían tapados (`ui/overlay-guard.js`). Funciona con cualquier hosting: si no hay píldora, no mueve nada.
- Antes de hacer push, comprueba que la identidad de git sea la personal (`git config user.email`). El repo la tiene fijada en su configuración local.
- Volver a una versión anterior: en *Deploys*, elige un deploy previo y pulsa **Publish deploy**.
