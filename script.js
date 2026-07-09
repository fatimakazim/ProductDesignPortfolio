/**
 * portfolio — script.js
 * Glassmorphism + Spatial UI interactions
 * ─────────────────────────────────────────────────
 *  1. Utilities
 *  2. Floating nav (hide/reveal on scroll)
 *  3. Active nav links
 *  4. Mobile menu
 *  5. Scroll reveal (blur + fade)
 *  6. Smooth scroll
 *  7. Hero — mouse parallax on card stack
 *  8. Card 3D tilt on hover
 *  9. Horizontal carousel (drag + nav + dots)
 * 10. Section label animation
 * 11. Experience rows
 * 12. Card image click
 * ─────────────────────────────────────────────────
 */

'use strict';


/* ─────────────────────────────────────────────────
   1. UTILITIES
───────────────────────────────────────────────── */
function throttle(fn, limit) {
  let lastRun = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastRun >= limit) {
      lastRun = now;
      fn.apply(this, args);
    }
  };
}

const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function lerp(a, b, t) { return a + (b - a) * t; }


/* ─────────────────────────────────────────────────
   2. FLOATING NAV — HIDE/REVEAL ON SCROLL
   Hides nav when scrolling down, reveals on up.
───────────────────────────────────────────────── */
function initNavScroll() {
  const nav = qs('#nav');
  if (!nav) return;

  let lastY = window.scrollY;
  let ticking = false;

  function update() {
    const currentY = window.scrollY;
    const scrolled = currentY > 60;

    if (scrolled && currentY > lastY) {
      // Scrolling down — hide
      nav.classList.add('is-hidden');
    } else {
      // Scrolling up or at top — show
      nav.classList.remove('is-hidden');
    }

    lastY = currentY;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
}


/* ─────────────────────────────────────────────────
   3. ACTIVE NAV LINKS via IntersectionObserver
───────────────────────────────────────────────── */
function initActiveNavLinks() {
  const navLinks = qsa('.nav__link');
  if (!navLinks.length) return;

  const linkMap = new Map();
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) linkMap.set(href.slice(1), link);
  });

  const sections = qsa('section[id]').filter(sec => linkMap.has(sec.id));
  if (!sections.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const link = linkMap.get(entry.target.id);
      if (!link) return;
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('is-active'));
        link.classList.add('is-active');
      }
    });
  }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });

  sections.forEach(sec => observer.observe(sec));
}


/* ─────────────────────────────────────────────────
   4. MOBILE MENU TOGGLE
───────────────────────────────────────────────── */
function initMobileMenu() {
  const hamburger = qs('#hamburger');
  const menu      = qs('#mobile-menu');
  if (!hamburger || !menu) return;

  let isOpen = false;

  function openMenu() {
    isOpen = true;
    hamburger.classList.add('is-active');
    hamburger.setAttribute('aria-expanded', 'true');
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    isOpen = false;
    hamburger.classList.remove('is-active');
    hamburger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => isOpen ? closeMenu() : openMenu());

  qsa('[data-close-menu]', menu).forEach(link => link.addEventListener('click', closeMenu));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) closeMenu();
  });

  const resizeHandler = throttle(() => {
    if (window.innerWidth > 768 && isOpen) closeMenu();
  }, 200);
  window.addEventListener('resize', resizeHandler);
}


/* ─────────────────────────────────────────────────
   5. SCROLL REVEAL — blur + fade
───────────────────────────────────────────────── */
function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    qsa('.reveal').forEach(el => el.classList.add('is-visible'));
    return;
  }

  const revealEls = qsa('.reveal');
  if (!revealEls.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -50px 0px', threshold: 0.05 });

  revealEls.forEach(el => observer.observe(el));
}


/* ─────────────────────────────────────────────────
   6. SMOOTH SCROLL
───────────────────────────────────────────────── */
function initSmoothScroll() {
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const targetId = link.getAttribute('href');
    if (targetId === '#') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const target = qs(targetId);
    if (!target) return;

    e.preventDefault();

    const nav = qs('#nav');
    const navHeight = nav ? nav.offsetHeight + 16 : 0;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight;

    window.scrollTo({ top: targetTop, behavior: 'smooth' });
    history.pushState(null, '', targetId);
  });
}


/* ─────────────────────────────────────────────────
   7. HERO — MOUSE PARALLAX ON CARD STACK
   Cards shift subtly based on mouse position,
   giving a spatial depth / floating effect.
───────────────────────────────────────────────── */
function initHeroParallax() {
  if (window.matchMedia('(hover: none)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const heroCards = qs('#hero-cards');
  if (!heroCards) return;

  const cardFront  = qs('.hero__card--front',  heroCards);
  const cardBack1  = qs('.hero__card--back-1', heroCards);
  const cardBack2  = qs('.hero__card--back-2', heroCards);

  if (!cardFront || !cardBack1 || !cardBack2) return;

  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;
  let rafId = null;

  const MAX_OFFSET = 20;

  function onMouseMove(e) {
    const rect = document.documentElement.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    targetX = ((e.clientX - centerX) / centerX) * MAX_OFFSET;
    targetY = ((e.clientY - centerY) / centerY) * MAX_OFFSET;
  }

  function animate() {
    currentX = lerp(currentX, targetX, 0.08);
    currentY = lerp(currentY, targetY, 0.08);

    cardFront.style.transform = `
      translate(-50%, -50%)
      translateX(${currentX * 1}px)
      translateY(${currentY * 1}px)
      translateZ(0px)
    `;
    cardBack1.style.transform = `
      translate(-50%, -50%)
      translateX(${currentX * 0.5}px)
      translateY(${currentY * 0.5}px)
      translateZ(-40px)
      rotate(-3deg)
    `;
    cardBack2.style.transform = `
      translate(-50%, -50%)
      translateX(${currentX * 0.25}px)
      translateY(${currentY * 0.25}px)
      translateZ(-80px)
      rotate(-6deg)
    `;

    rafId = requestAnimationFrame(animate);
  }

  document.addEventListener('mousemove', throttle(onMouseMove, 16));

  animate();

  // Cleanup when scrolled past hero
  const hero = qs('#hero');
  if (hero) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        } else {
          if (!rafId) animate();
        }
      });
    }, { threshold: 0 });
    observer.observe(hero);
  }
}


/* ─────────────────────────────────────────────────
   8. CARD 3D TILT ON HOVER
   Applies a subtle perspective tilt to project
   cards as the mouse moves over them.
───────────────────────────────────────────────── */
function initCardTilt() {
  if (window.matchMedia('(hover: none)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = qsa('.project-card');

  cards.forEach(card => {
    const MAX_TILT = 5;

    function handleMove(e) {
      const rect    = card.getBoundingClientRect();
      const centerX = rect.left + rect.width  / 2;
      const centerY = rect.top  + rect.height / 2;
      const normX   = (e.clientX - centerX) / (rect.width  / 2);
      const normY   = (e.clientY - centerY) / (rect.height / 2);

      const rotY = normX * MAX_TILT;
      const rotX = -normY * MAX_TILT;

      card.style.transform = `
        perspective(1000px)
        rotateX(${rotX}deg)
        rotateY(${rotY}deg)
        translateY(-6px)
        scale(1.01)
      `;
    }

    function handleLeave() {
      card.style.transform = '';
      card.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    }

    function handleEnter() {
      card.style.transition = 'transform 0.15s ease-out';
    }

    card.addEventListener('mouseenter', handleEnter);
    card.addEventListener('mousemove', throttle(handleMove, 16));
    card.addEventListener('mouseleave', handleLeave);
    card.style.willChange = 'transform';
  });
}


/* ─────────────────────────────────────────────────
   9. HORIZONTAL CAROUSEL
   Supports: drag to scroll, prev/next buttons,
   dot navigation, swipe on touch, scroll snapping.
───────────────────────────────────────────────── */
function initCarousel() {
  const carousel    = qs('#carousel');
  const prevBtn     = qs('#carousel-prev');
  const nextBtn     = qs('#carousel-next');
  const dotsWrapper = qs('#carousel-dots');

  if (!carousel) return;

  const cards   = qsa('.project-card', carousel);
  const count   = cards.length;
  let activeIdx = 0;

  // ── Build dots ──────────────────────────────
  if (dotsWrapper) {
    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to project ${i + 1}`);
      dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      dot.addEventListener('click', () => scrollToCard(i));
      dotsWrapper.appendChild(dot);
    });
  }

  function getDots() {
    return qsa('.carousel-dot', dotsWrapper);
  }

  function setActive(idx) {
    activeIdx = Math.max(0, Math.min(idx, count - 1));
    const dots = getDots();
    dots.forEach((dot, i) => {
      const active = i === activeIdx;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-selected', String(active));
    });
  }

  function scrollToCard(idx) {
    const card = cards[idx];
    if (!card) return;
    const carouselRect = carousel.getBoundingClientRect();
    const cardRect     = card.getBoundingClientRect();
    const offset       = cardRect.left - carouselRect.left + carousel.scrollLeft;
    carousel.scrollTo({ left: offset, behavior: 'smooth' });
    setActive(idx);
  }

  // ── Prev / Next buttons ──────────────────────
  if (prevBtn) prevBtn.addEventListener('click', () => scrollToCard(activeIdx - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => scrollToCard(activeIdx + 1));

  // ── Update active dot on scroll ─────────────
  const handleScroll = throttle(() => {
    const carouselLeft = carousel.getBoundingClientRect().left;
    let closestIdx  = 0;
    let closestDist = Infinity;

    cards.forEach((card, i) => {
      const dist = Math.abs(card.getBoundingClientRect().left - carouselLeft);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx  = i;
      }
    });

    setActive(closestIdx);
  }, 100);

  carousel.addEventListener('scroll', handleScroll, { passive: true });

  // ── Drag to scroll ───────────────────────────
  let isDragging  = false;
  let startX      = 0;
  let startScroll = 0;

  carousel.addEventListener('mousedown', e => {
    isDragging  = true;
    startX      = e.clientX;
    startScroll = carousel.scrollLeft;
    carousel.classList.add('is-dragging');
    carousel.style.scrollBehavior = 'auto';
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    carousel.scrollLeft = startScroll - dx;
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    carousel.classList.remove('is-dragging');
    carousel.style.scrollBehavior = '';
  });

  // Prevent click after drag
  carousel.addEventListener('click', e => {
    if (Math.abs(carousel.scrollLeft - startScroll) > 10) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // ── Touch swipe ──────────────────────────────
  let touchStartX = 0;
  let touchScrollStart = 0;

  carousel.addEventListener('touchstart', e => {
    touchStartX      = e.touches[0].clientX;
    touchScrollStart = carousel.scrollLeft;
  }, { passive: true });

  carousel.addEventListener('touchmove', e => {
    const dx = touchStartX - e.touches[0].clientX;
    carousel.scrollLeft = touchScrollStart + dx;
  }, { passive: true });
}


/* ─────────────────────────────────────────────────
   10. SECTION LABEL ANIMATED UNDERLINE
───────────────────────────────────────────────── */
function initSectionLabels() {
  const labels = qsa('.section__label');
  if (!labels.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('label-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  labels.forEach(label => observer.observe(label));
}


/* ─────────────────────────────────────────────────
   11. EXPERIENCE ROWS — index var
───────────────────────────────────────────────── */
function initExperienceRows() {
  qsa('.experience-row').forEach((row, i) => {
    row.style.setProperty('--index', i + 1);
  });
}


/* ─────────────────────────────────────────────────
   12. PROJECT CARD — CLICKABLE MEDIA
───────────────────────────────────────────────── */
function initCardImageClick() {
  qsa('.project-card').forEach(card => {
    const media = qs('.project-card__media', card);
    const cta   = qs('.project-card__cta', card);
    if (!media || !cta) return;
    media.style.cursor = 'pointer';
    media.addEventListener('click', () => cta.click());
  });
}


/* ─────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNavScroll();
  initActiveNavLinks();
  initMobileMenu();
  initScrollReveal();
  initSmoothScroll();
  initHeroParallax();
  initCardTilt();
  initCarousel();
  initSectionLabels();
  initExperienceRows();
  initCardImageClick();

  document.body.classList.add('is-loaded');
});
const slides = document.querySelectorAll(".hero-slide");

let currentSlide = 0;

function changeHeroSlide(){

    slides[currentSlide].classList.remove("active");

    currentSlide++;

    if(currentSlide >= slides.length){
        currentSlide = 0;
    }

    slides[currentSlide].classList.add("active");

}

setInterval(changeHeroSlide, 4500);