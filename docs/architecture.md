# Arquitectura

## Principios

1. **Sin dependencias ni build.** El navegador carga los módulos ES directamente; lo que hay en el repo es exactamente lo que se publica.
2. **Capas con dependencias en un solo sentido.** La lógica no conoce el DOM, el audio ni el canvas.
3. **Estado separado de su representación.** `game/` muta el estado; `render/` solo lo lee.
4. **Datos estáticos frente a estado de partida.** `world/level.js` describe el nivel; `game/world.js` crea a partir de él un estado nuevo en cada partida.

## Capas

```
                 main.js  (composition root + bucle)
                    │
   ┌────────┬───────┼─────────┬──────────┐
   ▼        ▼       ▼         ▼          ▼
  ui/     core/   audio/    render/     game/ ──▶ world/
 (DOM)  (platform) (sonido) (canvas)   (lógica)   (datos)
                                          │
                     config.js · utils/  ◀┘ (los usan todas)
```

| Capa | Responsabilidad | Puede depender de |
|---|---|---|
| `config.js` | Constantes de ajuste | — |
| `utils/` | Funciones puras genéricas (`clamp`, PRNG, storage seguro) | — |
| `world/` | Terreno y definición del nivel | `config`, `utils` |
| `game/` | Estado y reglas: física, enemigos, recogidas, cámara, máquina de estados | `config`, `utils`, `world` (vía datos) |
| `render/` | Dibujar un frame a partir del estado | `config`, `utils` |
| `audio/` | Efectos y música sobre `AudioEngine` | `core/audio` |
| `core/` | Canvas y escalado, WebAudio, teclado y táctil | `config`, `utils` |
| `ui/` | Overlays del DOM, botón de silencio, fullscreen y gestos del móvil | — |
| `main.js` | Crea y conecta todo y ejecuta el bucle | todas |

**Regla clave:** `game/` nunca importa de `core/`, `render/`, `audio/` ni `ui/`. Se comunica hacia fuera mediante:

- **Eventos** (`world.events`): nombres como `'jump'`, `'coin'`, `'hit'`… `Game.flushEvents()` los traduce en llamadas a `sfx[nombre]()`. Para añadir un sonido nuevo basta con emitir un evento y añadir la función con el mismo nombre en `audio/sfx.js`.
- **Callbacks** del constructor de `Game`: `onStateChange(state)` y `onShowWin()`.
- **Input por interfaz:** `Game.update(input, viewW)` solo usa `input.left/right/down/jump` y `input.consumeJump()`.

## Máquina de estados

```
title ──start()──▶ play ──bandera──▶ win ──restart()──▶ play
```

- `title`: escena estática detrás del overlay de inicio. La simulación no avanza.
- `play`: input activo y controles táctiles visibles (`body[data-state="play"]`).
- `win`: control bloqueado, saltos de alegría, fuegos artificiales y confeti. En `WIN.SHOW_OVERLAY_AT` aparece el overlay.

## Bucle principal

`main.js` usa un **paso fijo de 60 Hz** con acumulador, de modo que la física es idéntica en pantallas de 60, 90 o 120 Hz. Se renderiza una vez por `requestAnimationFrame`. Mientras el móvil está en vertical (`portraitQuery`), la simulación se pausa.

Orden dentro de `Game.update`:

1. Plataformas móviles.
2. Jugador (input, física y aterrizajes) y comprobación de caída al vacío.
3. Enemigos (patrulla y colisión: pisotón o golpe).
4. Recogidas: monedas, monedas perdidas, checkpoints y meta.
5. Partículas y confeti.
6. Secuencia de victoria (si toca).
7. Cámara, temporizadores de `fade` y `shake`.
8. Vaciado de eventos de sonido.

## Módulos principales

| Archivo | Qué contiene |
|---|---|
| `world/terrain.js` | `Terrain`: segmentos rectos ordenados, constructor encadenable (`flat`, `ramp`, `gap`) y consultas `groundAt(x)` y `slopeAt(x)` con búsqueda binaria |
| `world/level.js` | `buildLevel()`: terreno, monedas, plataformas, enemigos, checkpoints y decoración determinista |
| `game/player.js` | Física del jugador dividida en fuerzas, movimiento horizontal con muros, seguimiento del suelo y gravedad con aterrizaje |
| `game/enemies.js` | Patrulla de cangrejos y abejas, pisotón y golpe lateral |
| `game/pickups.js` | Monedas, monedas derramadas y checkpoints; devuelve si se ha tocado la meta |
| `game/effects.js` | Partículas, fuegos artificiales y confeti |
| `game/camera.js` | Seguimiento suave con anticipación en la dirección de carrera |
| `game/game.js` | Máquina de estados y orquestación |
| `render/renderer.js` | Orden de capas de un frame y temblor de cámara |
| `render/head-sprite.js` | Reduce la foto, endurece el alfa y añade el contorno de 1 px |
| `core/input.js` | Teclado y botones táctiles con *hit-test* por puntero (permite deslizar el dedo entre botones) |
| `core/audio.js` | `AudioEngine`: contexto, buses, silencio persistente y primitivas `tone`/`noise` |
| `audio/music.js` | Planificador con *lookahead* y el tema principal como datos |

## Coordenadas

- Resolución interna: 180 px de alto. El ancho se adapta entre 240 y 400 px según el aspecto de la pantalla.
- Mundo: `x` crece hacia la derecha e `y` hacia abajo. El suelo base está en `y = 150` y el agua en `y = 182`. Por debajo de `DEATH_Y = 250` se reaparece en el último checkpoint.
- Las capas de fondo se dibujan en coordenadas de pantalla con parallax. El resto, dentro de `ctx.translate(-camX, -camY)`.
