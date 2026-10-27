/**
 * Controlador interactivo en TypeScript para el Carrusel Institucional de CONA.
 * Incluye:
 * - Auto-play cada 5s con respeto a `prefers-reduced-motion`
 * - Pausa automática en hover y focus
 * - Navegación accesible mediante botones Prev/Next y puntos (dots) con `aria-label` y `aria-current`
 * - Soporte táctil (touchstart/touchend swipe)
 * - Fallback elegante con Canvas/SVG institucional manteniendo visibles los textos instructivos
 *   ("Agrega la primera imagen en assets/actualizacion-01.png", etc.)
 */
export class CarouselController {
    constructor(intervalMs = 5000) {
        this.dotButtons = [];
        this.currentIndex = 0;
        this.timer = null;
        this.touchStartX = 0;
        const carousel = document.getElementById('photoCarousel');
        const track = document.getElementById('carouselTrack');
        const prev = document.getElementById('carouselPrev');
        const next = document.getElementById('carouselNext');
        const dots = document.getElementById('carouselDots');
        if (!carousel || !track) {
            throw new Error('Elementos del carrusel institucional no encontrados en el DOM.');
        }
        this.carouselEl = carousel;
        this.trackEl = track;
        this.prevBtn = prev;
        this.nextBtn = next;
        this.dotsContainer = dots;
        this.slides = Array.from(this.trackEl.querySelectorAll('.carousel-slide'));
        this.intervalMs = intervalMs;
        this.mediaQuery = window.matchMedia('(max-width: 768px)');
        if (this.slides.length <= 1) {
            if (this.prevBtn)
                this.prevBtn.style.display = 'none';
            if (this.nextBtn)
                this.nextBtn.style.display = 'none';
            if (this.dotsContainer)
                this.dotsContainer.style.display = 'none';
            return;
        }
        this.initSlidesAndDots();
        this.bindEvents();
        this.handleViewportChange();
        if (typeof this.mediaQuery.addEventListener === 'function') {
            this.mediaQuery.addEventListener('change', () => this.handleViewportChange());
        }
        else {
            window.addEventListener('resize', () => this.handleViewportChange());
        }
    }
    handleViewportChange() {
        if (this.mediaQuery.matches) {
            if (this.dotsContainer)
                this.dotsContainer.style.display = 'flex';
            this.showSlide(this.currentIndex);
            this.startAutoPlay();
        }
        else {
            this.stopAutoPlay();
            this.showSlide(0);
            if (this.prevBtn)
                this.prevBtn.style.display = 'none';
            if (this.nextBtn)
                this.nextBtn.style.display = 'none';
            if (this.dotsContainer)
                this.dotsContainer.style.display = 'none';
        }
    }
    initSlidesAndDots() {
        if (!this.dotsContainer)
            return;
        this.dotsContainer.innerHTML = '';
        this.dotButtons = [];
        this.slides.forEach((slide, index) => {
            const img = slide.querySelector('img');
            if (img) {
                img.addEventListener('error', () => {
                    slide.classList.add('is-missing');
                    this.renderCanvasPlaceholder(slide, index);
                });
                if (img.complete && img.naturalWidth === 0) {
                    slide.classList.add('is-missing');
                    this.renderCanvasPlaceholder(slide, index);
                }
            }
            else {
                slide.classList.add('is-missing');
                this.renderCanvasPlaceholder(slide, index);
            }
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'carousel-dot';
            dot.setAttribute('aria-label', `Mostrar fotografía ${index + 1}`);
            dot.addEventListener('click', () => this.showSlide(index, true));
            this.dotsContainer?.appendChild(dot);
            this.dotButtons.push(dot);
        });
    }
    /**
     * Dibuja un Canvas institucional decorativo de alta resolución como fondo del placeholder
     * manteniendo intacto y visible el texto instructivo original de la plantilla.
     */
    renderCanvasPlaceholder(slide, index) {
        const placeholder = slide.querySelector('.carousel-placeholder');
        if (!placeholder || placeholder.querySelector('canvas.placeholder-canvas')) {
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.className = 'placeholder-canvas';
        canvas.width = 1280;
        canvas.height = 720;
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.position = 'absolute';
        canvas.style.inset = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.objectFit = 'cover';
        canvas.style.zIndex = '0';
        canvas.style.pointerEvents = 'none';
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const palettes = [
                ['#001b3d', '#073b77', '#fc4c02'],
                ['#002554', '#0b4f9c', '#bfdfec'],
                ['#031d44', '#00356b', '#fc4c02']
            ];
            const [c1, c2, accent] = palettes[index % palettes.length];
            const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            grad.addColorStop(0, c1);
            grad.addColorStop(1, c2);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Círculos arquitectónicos sutiles alusivos a CONA / bienestar y construcción
            ctx.save();
            ctx.globalAlpha = 0.16;
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(canvas.width * 0.82, canvas.height * 0.25, 210, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#bfdfec';
            ctx.lineWidth = 2;
            for (let r = 90; r <= 330; r += 60) {
                ctx.beginPath();
                ctx.arc(canvas.width * 0.82, canvas.height * 0.25, r, 0, Math.PI * 2);
                ctx.stroke();
            }
            // Retícula técnica sutil
            ctx.globalAlpha = 0.06;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            for (let x = 0; x < canvas.width; x += 64) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += 64) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
            ctx.restore();
        }
        placeholder.style.position = 'relative';
        placeholder.style.overflow = 'hidden';
        const textWrapper = document.createElement('div');
        textWrapper.style.position = 'relative';
        textWrapper.style.zIndex = '1';
        while (placeholder.firstChild) {
            textWrapper.appendChild(placeholder.firstChild);
        }
        placeholder.appendChild(canvas);
        placeholder.appendChild(textWrapper);
    }
    showSlide(index, restartTimer = false) {
        const count = this.slides.length;
        if (count === 0)
            return;
        this.currentIndex = (index + count) % count;
        this.trackEl.style.transform = `translateX(-${(this.currentIndex * 100) / count}%)`;
        this.dotButtons.forEach((dot, i) => {
            const isActive = i === this.currentIndex;
            dot.classList.toggle('is-active', isActive);
            if (isActive) {
                dot.setAttribute('aria-current', 'true');
            }
            else {
                dot.removeAttribute('aria-current');
            }
        });
        this.slides.forEach((slide, i) => {
            slide.setAttribute('aria-hidden', i === this.currentIndex ? 'false' : 'true');
        });
        if (restartTimer) {
            this.startAutoPlay();
        }
    }
    stopAutoPlay() {
        if (this.timer !== null) {
            window.clearInterval(this.timer);
            this.timer = null;
        }
    }
    startAutoPlay() {
        this.stopAutoPlay();
        if (!this.mediaQuery.matches) {
            return;
        }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }
        this.timer = window.setInterval(() => {
            this.showSlide(this.currentIndex + 1);
        }, this.intervalMs);
    }
    bindEvents() {
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.showSlide(this.currentIndex - 1, true));
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.showSlide(this.currentIndex + 1, true));
        }
        // Pausa en hover y focus para accesibilidad
        this.carouselEl.addEventListener('mouseenter', () => this.stopAutoPlay());
        this.carouselEl.addEventListener('mouseleave', () => this.startAutoPlay());
        this.carouselEl.addEventListener('focusin', () => this.stopAutoPlay());
        this.carouselEl.addEventListener('focusout', () => this.startAutoPlay());
        // Navegación por teclado cuando el foco está dentro del carrusel
        this.carouselEl.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.showSlide(this.currentIndex - 1, true);
            }
            else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.showSlide(this.currentIndex + 1, true);
            }
        });
        // Soporte táctil / Swipe en dispositivos móviles
        this.carouselEl.addEventListener('touchstart', (e) => {
            if (e.changedTouches.length > 0) {
                this.touchStartX = e.changedTouches[0].clientX;
                this.stopAutoPlay();
            }
        }, { passive: true });
        this.carouselEl.addEventListener('touchend', (e) => {
            if (e.changedTouches.length > 0) {
                const deltaX = e.changedTouches[0].clientX - this.touchStartX;
                if (Math.abs(deltaX) > 45) {
                    this.showSlide(this.currentIndex + (deltaX < 0 ? 1 : -1));
                }
                this.startAutoPlay();
            }
        }, { passive: true });
    }
}
