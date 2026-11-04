const ICON_ON = '<svg viewBox="0 0 24 24"><path d="M3 9h4l5-4v14l-5-4H3z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24"><path d="M3 9h4l5-4v14l-5-4H3z"/><path d="M16 9l6 6M22 9l-6 6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';

// Mute toggle bound to the AudioEngine; also reflects changes made via keyboard (M).
export class MuteButton {
  constructor(el, audio) {
    this.el = el;
    this.audio = audio;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.toggleMute();
    });
    for (const type of ['pointerup', 'touchend']) el.addEventListener(type, (e) => e.stopPropagation());
    audio.onChange(() => this.render());
    this.render();
  }

  contains(target) {
    return target instanceof Node && this.el.contains(target);
  }

  render() {
    const muted = this.audio.muted;
    this.el.innerHTML = muted ? ICON_OFF : ICON_ON;
    this.el.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar');
  }
}
