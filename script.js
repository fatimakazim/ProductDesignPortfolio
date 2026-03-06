/**
 * portfolio — script.js
 * ─────────────────────────────────────────────────────────
 * Modules:
 *  1. Scroll-based nav state (scrolled class + active links)
 *  2. Mobile menu toggle
 *  3. Scroll reveal via IntersectionObserver
 *  4. Smooth scroll for anchor links
 *  5. Project card cursor follow effect
 * ─────────────────────────────────────────────────────────
 */

'use strict';


/* ─────────────────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────────────────── */

/**
 * Throttle a function call to at most once per `limit` ms.
 * @param {Function} fn
 * @param {number} limit - ms
 * @returns {Function}
 */
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

/**
 * Query single element, returns null gracefully.
 * @param {string} selector
 * @param {Element} [ctx=document]
 */
const qs = (selector, ctx = document) => ctx.querySelector(selector);

/**
 * Query all elements as an array.
 * @param {string} selector
 * @param {Element} [ctx=document]
 */
const qsa = (selector, ctx = document) => Array.from(ctx.querySelectorAll(selector));


/* ─────────────────────────────────────────────────────────
   1. NAV — SCROLLED STATE
   Adds `.is-scrolled` to <nav> once the user scrolls
   past a threshold. This triggers a subtle shadow.
───────────────────────────────────────────────────────── */
function initNavScroll() {
  const nav = qs('#nav');
  if (!nav) return;

  const THRESHOLD = 40; // px from top

  const handleScroll = throttle(() => {
    const scrolled = window.scrollY > THRESHOLD;
    nav.classList.toggle('is-scrolled', scrolled);
  }, 100);

  window.addEventListener('scroll', handleScroll, { passive: true });

  // Run once on load in case page is already scrolled (e.g. back-button navigation)
  handleScroll();
}


/* ─────────────────────────────────────────────────────────
   2. NAV — ACTIVE LINK HIGHLIGHTING
   Uses IntersectionObserver to watch each section.
   When a section is ~20% visible, its corresponding
   nav link gets the `.is-active` class.
───────────────────────────────────────────────────────── */
function initActiveNavLinks() {
  const navLinks = qsa('.nav__link');
  if (!navLinks.length) return;

  // Build a map of section id → nav link
  const linkMap = new Map();
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      linkMap.set(href.slice(1), link);
    }
  });

  const sections = qsa('section[id]').filter(sec => linkMap.has(sec.id));
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const link = linkMap.get(entry.target.id);
        if (!link) return;

        if (entry.isIntersecting) {
          // Deactivate all, then activate the visible one
          navLinks.forEach(l => l.classList.remove('is-active'));
          link.classList.add('is-active');
        }
      });
    },
    {
      rootMargin: '-20% 0px -60% 0px', // trigger when section enters upper 20% zone
      threshold: 0,
    }
  );

  sections.forEach(sec => observer.observe(sec));
}


/* ─────────────────────────────────────────────────────────
   3. MOBILE MENU TOGGLE
   Toggles the `.is-open` class on the menu overlay
   and the `.is-active` class on the hamburger button.
   Also manages aria attributes and body scroll lock.
───────────────────────────────────────────────────────── */
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
    document.body.style.overflow = 'hidden'; // prevent background scroll
  }

  function closeMenu() {
    isOpen = false;
    hamburger.classList.remove('is-active');
    hamburger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function toggleMenu() {
    isOpen ? closeMenu() : openMenu();
  }

  // Main toggle
  hamburger.addEventListener('click', toggleMenu);

  // Close when a menu link is clicked
  qsa('[data-close-menu]', menu).forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) closeMenu();
  });

  // Close if user resizes to desktop width
  const resizeHandler = throttle(() => {
    if (window.innerWidth > 768 && isOpen) closeMenu();
  }, 200);
  window.addEventListener('resize', resizeHandler);
}


/* ─────────────────────────────────────────────────────────
   4. SCROLL REVEAL
   Observes every `.reveal` element. When it enters the
   viewport (based on rootMargin), `.is-visible` is added
   which triggers the CSS transition defined in style.css.
───────────────────────────────────────────────────────── */
function initScrollReveal() {
  // Honour user's reduced-motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const revealEls = qsa('.reveal');
  if (!revealEls.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // Once revealed, stop observing to save resources
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: '0px 0px -60px 0px', // trigger slightly before element fully enters viewport
      threshold: 0.05,
    }
  );

  revealEls.forEach(el => observer.observe(el));
}


/* ─────────────────────────────────────────────────────────
   5. SMOOTH SCROLL FOR ANCHOR LINKS
   Intercepts click on any <a href="#..."> and scrolls
   smoothly to the target, accounting for fixed nav height.
───────────────────────────────────────────────────────── */
function initSmoothScroll() {
  document.addEventListener('click', e => {
    // Find closest anchor tag that was clicked
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const targetId = link.getAttribute('href');
    if (targetId === '#') {
      // Scroll to top
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const target = qs(targetId);
    if (!target) return;

    e.preventDefault();

    // Account for fixed nav height
    const nav = qs('#nav');
    const navHeight = nav ? nav.offsetHeight : 0;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight;

    window.scrollTo({ top: targetTop, behavior: 'smooth' });

    // Update URL hash without jumping
    history.pushState(null, '', targetId);
  });
}


/* ─────────────────────────────────────────────────────────
   6. PROJECT CARD — SUBTLE TILT ON HOVER
   Gives each project card's image a gentle 3D tilt that
   follows the mouse, adding tactile depth to the design.
───────────────────────────────────────────────────────── */
function initCardTilt() {
  // Skip on touch devices
  if (window.matchMedia('(hover: none)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = qsa('.project-card__media');

  cards.forEach(card => {
    const MAX_TILT = 4; // degrees

    function handleMouseMove(e) {
      const rect   = card.getBoundingClientRect();
      const centerX = rect.left + rect.width  / 2;
      const centerY = rect.top  + rect.height / 2;

      // Normalise cursor position to [-1, 1]
      const normX = (e.clientX - centerX) / (rect.width  / 2);
      const normY = (e.clientY - centerY) / (rect.height / 2);

      const rotateY =  normX * MAX_TILT;
      const rotateX = -normY * MAX_TILT;

      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
    }

    function handleMouseLeave() {
      card.style.transform = '';
    }

    card.addEventListener('mousemove', throttle(handleMouseMove, 16));
    card.addEventListener('mouseleave', handleMouseLeave);
    card.style.transition = 'transform 0.15s ease-out, border-radius 0.3s ease';
    card.style.willChange = 'transform';
  });
}


/* ─────────────────────────────────────────────────────────
   7. HERO HEADLINE — WORD-BY-WORD ENTRANCE
   Wraps each word of the hero headline in a span and
   staggers their appearance on page load.
───────────────────────────────────────────────────────── */
function initHeroEntrance() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const headline = qs('.hero__headline');
  if (!headline) return;

  // We'll let CSS handle this via the .reveal system,
  // but we also trigger a loaded class on body for
  // any additional page-load transitions.
  document.body.classList.add('is-loaded');
}


/* ─────────────────────────────────────────────────────────
   8. EXPERIENCE ROW — HOVER NUMBER COUNTER
   Shows a subtle index number on hover for each row.
   This is purely additive and doesn't break anything
   if the DOM mutations fail.
───────────────────────────────────────────────────────── */
function initExperienceRows() {
  const rows = qsa('.experience-row');
  rows.forEach((row, i) => {
    // Set a CSS custom property for potential use in CSS counters
    row.style.setProperty('--index', i + 1);
  });
}


/* ─────────────────────────────────────────────────────────
   9. CUSTOM CURSOR (desktop only)
   A minimal dot cursor that follows the mouse with
   a slight lag for a refined feel.
───────────────────────────────────────────────────────── */
function initCustomCursor() {
  // Only on non-touch, non-reduced-motion, and if pointer is fine (mouse)
  if (window.matchMedia('(hover: none)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Create cursor dot
  const cursor = document.createElement('div');
  cursor.className = 'cursor-dot';
  cursor.setAttribute('aria-hidden', 'true');
  Object.assign(cursor.style, {
    position: 'fixed',
    width:  '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-text)',
    pointerEvents: 'none',
    zIndex: '9999',
    transform: 'translate(-50%, -50%)',
    transition: 'transform 0.1s ease, width 0.2s ease, height 0.2s ease, opacity 0.3s ease',
    opacity: '0',
    mixBlendMode: 'multiply',
    willChange: 'left, top',
  });
  document.body.appendChild(cursor);

  // Create cursor ring
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.setAttribute('aria-hidden', 'true');
  Object.assign(ring.style, {
    position: 'fixed',
    width:  '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1px solid rgba(17,17,17,0.3)',
    pointerEvents: 'none',
    zIndex: '9998',
    transform: 'translate(-50%, -50%)',
    transition: 'left 0.12s ease, top 0.12s ease, transform 0.2s ease, opacity 0.3s ease',
    opacity: '0',
    willChange: 'left, top',
  });
  document.body.appendChild(ring);

  let mouseX = 0;
  let mouseY = 0;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    cursor.style.left    = mouseX + 'px';
    cursor.style.top     = mouseY + 'px';
    cursor.style.opacity = '1';

    ring.style.left    = mouseX + 'px';
    ring.style.top     = mouseY + 'px';
    ring.style.opacity = '1';
  });

  // Enlarge ring on interactive elements
  const interactives = 'a, button, .project-card__media, .contact-link, .experience-row';

  document.addEventListener('mouseover', e => {
    if (e.target.closest(interactives)) {
      ring.style.transform  = 'translate(-50%, -50%) scale(1.8)';
      ring.style.borderColor = 'rgba(17,17,17,0.15)';
    }
  });

  document.addEventListener('mouseout', e => {
    if (e.target.closest(interactives)) {
      ring.style.transform  = 'translate(-50%, -50%) scale(1)';
      ring.style.borderColor = 'rgba(17,17,17,0.3)';
    }
  });

  // Hide when leaving window
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
    ring.style.opacity   = '0';
  });
  document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
    ring.style.opacity   = '1';
  });

  // Hide default cursor
  document.documentElement.style.cursor = 'none';
}


/* ─────────────────────────────────────────────────────────
   10. SECTION LABEL — ANIMATED UNDERLINE FILL
   The section labels have a bottom border. On reveal,
   we animate it growing from left to right.
───────────────────────────────────────────────────────── */
function initSectionLabelAnimation() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const labels = qsa('.section__label');

  labels.forEach(label => {
    // Start with no visible border — replace with pseudo via wrapper
    label.style.borderBottom = 'none';
    label.style.position     = 'relative';
    label.style.paddingBottom = 'var(--space-3)';

    // Create animated line element
    const line = document.createElement('span');
    Object.assign(line.style, {
      position: 'absolute',
      bottom:    '0',
      left:      '0',
      width:     '0%',
      height:    '1px',
      backgroundColor: 'var(--color-border)',
      transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
      display:   'block',
    });
    label.appendChild(line);

    // Observe — when visible, expand the line
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          line.style.width = '100%';
          observer.unobserve(label);
        }
      });
    }, { threshold: 0.5 });

    observer.observe(label);
  });
}


/* ─────────────────────────────────────────────────────────
   INIT — Run all modules on DOMContentLoaded
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNavScroll();
  initActiveNavLinks();
  initMobileMenu();
  initScrollReveal();
  initSmoothScroll();
  initCardTilt();
  initHeroEntrance();
  initExperienceRows();
  initCustomCursor();
  initSectionLabelAnimation();
});
