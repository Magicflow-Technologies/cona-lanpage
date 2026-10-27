import { CarouselController } from './carousel.js';
import { FormController } from './form.js';

function initAmbientParticles(): void {
  const ambient = document.getElementById('ambient');
  if (!ambient) return;

  for (let i = 0; i < 34; i++) {
    const s = document.createElement('span');
    s.textContent = i % 6 === 0 ? '✦' : '•';
    s.style.left = `${Math.random() * 100}%`;
    s.style.fontSize = `${8 + Math.random() * 14}px`;
    s.style.animationDuration = `${9 + Math.random() * 12}s`;
    s.style.animationDelay = `${-Math.random() * 18}s`;
    ambient.appendChild(s);
  }
}

/**
 * Controlador accesible para el menú hamburguesa (`☰`) del encabezado.
 */
function initHamburgerMenu(): void {
  const btn = document.getElementById('hamburgerBtn') as HTMLButtonElement | null;
  const dropdown = document.getElementById('headerMenuDropdown');
  if (!btn || !dropdown) return;

  const setMenuState = (open: boolean): void => {
    dropdown.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };

  btn.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    setMenuState(!isExpanded);
  });

  document.addEventListener('click', (e: MouseEvent) => {
    if (!dropdown.hidden && !dropdown.contains(e.target as Node) && e.target !== btn) {
      setMenuState(false);
    }
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !dropdown.hidden) {
      setMenuState(false);
      btn.focus();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAmbientParticles();
  initHamburgerMenu();
  new CarouselController(5000);
  new FormController('/api/participantes');
});
