// Ground as a sorted list of straight segments (flat or sloped). Gaps are
// ranges with no segment. Built left to right with a cursor.
export class Terrain {
  constructor(startY) {
    this.segments = [];
    this.cursorX = 0;
    this.cursorY = startY;
  }

  get end() {
    return this.cursorX;
  }

  flat(len) {
    return this.ramp(len, 0);
  }

  ramp(len, dy) {
    this.segments.push({ x0: this.cursorX, y0: this.cursorY, x1: this.cursorX + len, y1: this.cursorY + dy });
    this.cursorX += len;
    this.cursorY += dy;
    return this;
  }

  gap(len, dy = 0) {
    this.cursorX += len;
    this.cursorY += dy;
    return this;
  }

  indexAt(x) {
    let lo = 0;
    let hi = this.segments.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const s = this.segments[mid];
      if (x < s.x0) hi = mid - 1;
      else if (x >= s.x1) lo = mid + 1;
      else return mid;
    }
    return -1;
  }

  // Ground surface y at x, or null over a gap / outside the level.
  groundAt(x) {
    const i = this.indexAt(x);
    if (i < 0) return null;
    const s = this.segments[i];
    return s.y0 + (s.y1 - s.y0) * (x - s.x0) / (s.x1 - s.x0);
  }

  // dy/dx of the ground at x (positive = descending to the right).
  slopeAt(x) {
    const i = this.indexAt(x);
    if (i < 0) return 0;
    const s = this.segments[i];
    return (s.y1 - s.y0) / (s.x1 - s.x0);
  }
}
