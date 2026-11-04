# PWA (instalable y sin conexión)

David Dash se puede instalar como aplicación ("Añadir a pantalla de inicio") y jugar sin conexión una vez visitado.

## Piezas

| Archivo | Función |
| --- | --- |
| `manifest.webmanifest` | Nombre, iconos, colores, pantalla completa y orientación horizontal. |
| `sw.js` | Service worker: precarga el juego y lo sirve sin conexión. |
| `src/ui/pwa.js` | `registerServiceWorker()`: registra `sw.js` solo en HTTPS (en `localhost` y `file://` no hace nada). |
| `assets/icons/` | Iconos 192, 512, 512 *maskable* y `apple-touch-icon.png` (180). |

## Cómo llegan las actualizaciones

- Estrategia **network-first** para peticiones GET del mismo origen: con conexión siempre se descarga la versión recién desplegada en Netlify y se guarda en caché; sin conexión se usa la copia en caché.
- `netlify.toml` sirve `sw.js` y `manifest.webmanifest` con `Cache-Control: no-cache`, así el navegador detecta un service worker nuevo tras cada deploy.
- La caché se llama `david-dash-<CACHE_VERSION>`. Al subir `CACHE_VERSION` en `sw.js`, el nuevo service worker se activa al momento (`skipWaiting` + `clients.claim`) y borra las cachés antiguas.

## Mantenimiento de `PRECACHE`

`PRECACHE` (en `sw.js`) lista a mano todo lo necesario para jugar sin conexión. **Al añadir, renombrar o borrar un módulo de `src/` (o cualquier recurso), actualiza la lista y sube `CACHE_VERSION`.** Si falta un archivo, la instalación no falla (se registra un aviso en consola), pero ese archivo no estará disponible sin conexión.

Comprobación rápida de que todas las rutas existen:

```bash
node -e "const s=require('fs').readFileSync('sw.js','utf8');const l=eval(s.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1]);const m=l.filter(p=>p!=='./'&&!require('fs').existsSync(p));console.log(m.length?'Faltan: '+m.join(', '):'OK: '+l.length+' rutas')"
```

## Regenerar los iconos

Requiere Python 3 con Pillow:

```bash
python3 -I assets/icons/generate_icons.py
```

Parte de `assets/head.png` sobre un fondo de cielo (`#2a4fc4`) con franja dorada. El icono *maskable* mantiene la cara dentro de la zona segura central (80 %).
