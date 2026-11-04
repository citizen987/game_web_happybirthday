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

## Archivos que no se publican

Netlify publica la raíz del repo, así que `netlify.toml` oculta con **redirecciones forzadas a 404** todo lo que no es del juego: `docs/`, `tests/`, `odd/`, los scripts generadores (`assets/og/`, `assets/icons/generate_icons.py`), `README.md`, `CLAUDE.md`, `netlify.toml` y `.gitignore`. Si añades carpetas o archivos que no sean del juego en la raíz, añade su regla ahí.

## Notas

- Netlify inyecta en el HTML servido un comentario y un script propio (`/.netlify/scripts/hud`) que muestra una **píldora "Netlify" abajo a la derecha**. En el plan gratuito no se puede ocultar (el propio script ignora el "ocultar"), así que el juego **sube los botones táctiles** que quedarían tapados (`ui/overlay-guard.js`). Funciona con cualquier hosting: si no hay píldora, no mueve nada.
- Antes de hacer push, comprueba que la identidad de git sea la personal (`git config user.email`). El repo la tiene fijada en su configuración local.
- Volver a una versión anterior: en *Deploys*, elige un deploy previo y pulsa **Publish deploy**.
