// Pure predicates over the player state object. This module has no dependencies,
// so both the game layer (rules) and the render layer (drawing) can share it
// without render depending on game.

// Curled into a ball: rolling on the ground, charging in place, or any jump.
export const isBall = (p) => p.rolling || p.charging || p.airBall;
