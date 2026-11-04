# Desarrollo

## Requisitos

- Un navegador moderno.
- Cualquier servidor estático: Python 3, `npx serve`, la extensión Live Server de VS Code…

No hay `npm install` ni build.

## Arrancar en local

```bash
python3 -m http.server 8000
```

Abre http://localhost:8000.

> ⚠️ Abrir `index.html` con doble clic (`file://`) **no funciona**: los navegadores bloquean los módulos ES fuera de HTTP.

### Probar en el móvil

1. Arranca el servidor en el PC.
2. Desde el móvil, en la misma wifi, abre `http://<ip-del-pc>:8000`.
3. El audio solo arranca tras tocar la pantalla de inicio (lo exigen los navegadores).
4. En iPhone, el interruptor de silencio físico también silencia WebAudio.

## Modo depuración

Añade `?debug` a la URL (`http://localhost:8000/?debug`) para exponer `window.__dd` en la consola:

| Propiedad | Uso |
|---|---|
| `__dd.state` | Estado actual: `title`, `play`, `win` o `gameover` |
| `__dd.player` | Objeto del jugador (posición, velocidad, flags) |
| `__dd.coins` | Monedas recogidas |
| `__dd.lives` | Vidas restantes |
| `__dd.world` | Estado completo de la partida (para pruebas: `world.coinCount = 0`, `world.enemies`…) |
| `__dd.result` | Resultado final (`null` hasta llegar a la meta) |
| `__dd.shareFile` | `File` PNG de la tarjeta, cuando ya está generado |
| `__dd.flagX` | Posición x de la meta |
| `__dd.groundAt(x)` | Altura del suelo en x (`null` sobre un hueco) |
| `__dd.teleport(x)` | Coloca al jugador en el suelo en x |

Ejemplo: `__dd.teleport(__dd.flagX - 100)` para probar la celebración final.

Sin `?debug` no se expone nada.

## Dónde tocar según lo que quieras cambiar

| Quiero… | Archivo |
|---|---|
| Ajustar velocidad, salto o gravedad | `src/config.js` → `PHYSICS` |
| Cambiar el encuadre de la cámara | `src/config.js` → `CAMERA` |
| Editar el nivel | `src/world/level.js` (ver [level-design.md](level-design.md)) |
| Añadir un tipo de enemigo | `game/enemies.js` (movimiento y hitbox) + `render/entities-view.js` (dibujo) + `world/level.js` (colocación) |
| Añadir un sonido | Emitir `world.events.push('nombre')` en `game/` + función `nombre` en `audio/sfx.js` |
| Cambiar la música | `audio/music.js` → `MAIN_THEME` (notas MIDI, 0 = silencio) |
| Cambiar el texto final | `src/config.js` → `WIN.MESSAGE` (y `LIVES.GAMEOVER_SUBTITLE` para el fin de partida) |
| Cambiar las vidas iniciales o la animación de muerte | `src/config.js` → `LIVES` |
| Cambiar la fórmula de puntuación | `src/config.js` → `SCORE` (y `game/score.js` si cambia la forma) |
| Cambiar el texto que se comparte | `ui/share.js` → `buildShareText` |
| Cambiar la URL, el título o el nombre del archivo compartido | `src/config.js` → `SHARE` |
| Cambiar el diseño de la tarjeta-imagen | `render/share-card.js` (maquetada a 1080 px) |
| Cambiar el aspecto del personaje | `render/player-view.js` |
| Cambiar la foto | Sustituye `assets/head.png` y ajusta `HEAD_SPRITE` en `config.js` (caja opaca y posición de la cara y la barbilla) |

## Convenciones

- Código, identificadores y comentarios en **inglés**. Textos visibles para el jugador en **español**.
- Sin dependencias externas en tiempo de ejecución.
- Pixel art solo con `rect()` en coordenadas enteras (`render/draw.js`).
- Errores explícitos: los fallos de carga o de APIs no soportadas se registran con `console.error` o `console.warn`; no se silencian.
- Commits con [Conventional Commits](https://www.conventionalcommits.org/).

## Verificación antes de hacer push

No hay CI. Cada push a `main` se publica directamente, así que verifica en local:

1. Consola del navegador sin errores al cargar, jugar y terminar.
2. Una partida completa hasta la bandera: celebración y "Volver a jugar".
3. Caer a un hueco devuelve al último checkpoint.
4. Pisar un enemigo lo elimina; tocarlo de lado con monedas las hace perder y parpadear; sin monedas, quita una vida. Perder las 3 vidas muestra la felicitación sin puntuación y "Intentar de nuevo" vuelve a dar 3 vidas.
5. Sonido y botón de silencio (también con la tecla M).
6. Emulación móvil en DevTools (en horizontal): los botones táctiles funcionan. En vertical aparece el aviso de girar.
7. Al terminar: aparece el panel con las monedas, el tiempo y los puntos, y "Compartir felicitación" abre el menú nativo en el móvil. En escritorio sin Web Share, copia el texto y aparece "Descargar tarjeta". Para borrar el récord: `localStorage.removeItem('dd-best')`.
8. Si cambiaste el nivel: comprueba con `?debug` y `teleport` que cada hueco nuevo se puede saltar.
