# Diseño de niveles

Todo el nivel se define en `src/world/level.js`, dentro de `buildLevel()`.

## 1. Terreno

El terreno es una sucesión de tramos que se construye de izquierda a derecha con un cursor:

```js
t.flat(200);        // tramo plano de 200 px
t.ramp(140, -36);   // rampa de 140 px que SUBE 36 px (y negativa = arriba)
t.gap(72);          // hueco de 72 px
t.gap(124, -10);    // hueco cuyo lado derecho está 10 px más alto
```

`mark('clave')` guarda la x actual del cursor en `M.clave` para colocar después las entidades de forma relativa (`M.c + 40`). Así, si insertas un tramo, todo lo que viene después se desplaza solo.

El suelo empieza en `y = 150`. Mantén las alturas entre ~100 y 165: más abajo, el agua (y = 182) queda demasiado cerca; más arriba, la cámara se acerca a su límite.

## 2. Entidades

| Helper | Qué crea |
|---|---|
| `row(x, n, dx = 20, h = 16)` | `n` monedas a `h` px sobre el suelo, siguiendo rampas |
| `arc(x0, x1, n, baseY, peak)` | Arco parabólico de monedas (ideal sobre huecos) |
| `coin(x, y)` | Una moneda en una posición absoluta |
| `plat(x, y, w, range = 0, speed = 0)` | Plataforma de una sola dirección (se atraviesa desde abajo). Con `range > 0` oscila en horizontal |
| `crab(min, max)` | Cangrejo que patrulla el suelo entre `min` y `max` |
| `bee(min, max, y0)` | Abeja que patrulla a la altura `y0` con un leve vaivén |
| `level.checkpoints.push(x, …)` | Postes de checkpoint |

## 3. Límites jugables

Valores derivados de `PHYSICS` en `config.js`:

| Medida | Valor aproximado |
|---|---|
| Altura máxima de salto | ~60 px (manteniendo pulsado) |
| Salto mínimo (toque corto) | ~15 px |
| Distancia máxima a velocidad punta (3,6 px/frame) | ~170 px a la misma altura |
| Distancia saltando tras una carga (hasta 7,2 px/frame) | ~340 px; diseña los huecos para la velocidad normal, no para la carga |
| Escalón que se sube andando | 10 px (`STEP_UP`); más alto actúa como muro |
| Pendiente cómoda | hasta ~0,4 (40 px de subida por cada 100 px) |

### Reglas para que siga siendo fácil

- **Huecos ≤ 110 px** sin ayuda. Más anchos solo con plataformas intermedias. Un hueco de 130 px resultó demasiado exigente en las pruebas.
- **Plataformas separadas ≤ 30 px en vertical** cuando forman una escalera.
- **Un checkpoint antes de cada zona difícil.** Caer cuesta una vida y devuelve al último checkpoint activado. Con solo 3 vidas, los checkpoints frecuentes son lo que mantiene el juego asequible.
- **Los cangrejos patrullan en suelo continuo:** su rango `min..max` no debe cruzar un hueco.
- **Las abejas a `y0` ≈ suelo − 38** se pueden pasar por debajo. Más bajas obligan a saltar o agacharse.
- **No pongas un borde de suelo más alto que STEP_UP justo tras un hueco,** a menos que quieras un muro.

## 4. Letras D-A-V-I-D

Cinco letras doradas, ligeramente fuera del camino principal pero alcanzables con un salto normal:

| Letra | Posición |
|---|---|
| D | Sobre el arco de aros del primer hueco (`M.g1 + 36`, y 86) |
| A | Encima de la plataforma más alta de la escalera (`M.i + 242`, y 36) |
| V | Sobre la plataforma alta (`M.p + 140`, y 28) |
| I | Sobre el hueco de la plataforma móvil (`M.g3 + 50`, y 80) |
| D | Entre las plataformas del último gran hueco (`M.g6 + 60`, y 92) |

Regla: la parte baja de la letra debe estar a **≤ 82 px** por encima del suelo o de la plataforma desde la que se salta (pico del salto ~60 px + cuerpo). Las letras sobre huecos se cogen en pleno salto. Al moverlas, mantén el orden D-A-V-I-D a lo largo del nivel para que la transformación llegue en el último tramo.

## 5. Meta y duración

- La bandera se coloca en `t.end - 70`.
- Un jugador que no se detiene termina el nivel en ~45 s. Uno normal, que recoge monedas y esquiva, tarda entre 60 y 90 s. Para alargarlo, añade tramos antes de `mark('u')`.

## 6. Decoración

Se genera de forma determinista (`mulberry32(7)`) sobre el suelo continuo: flores, matas, arbustos, rocas y palmeras. Para variarla, cambia la semilla o las probabilidades en el bloque `Decoration`. Para un tipo nuevo, añade su función a `DECO_DRAWERS` en `render/terrain-view.js`.

## 7. Comprobar un cambio

```js
// http://localhost:8000/?debug  →  consola
__dd.teleport(3000);   // ir a la zona modificada
__dd.groundAt(3120);   // null = hueco
```

Juega la zona varias veces: saltando desde el borde y saltando antes de tiempo. El nivel debe poder completarse sin precisión al píxel.
