/**
 * project.js
 * ─────────────────────────────────────────────────────────
 * Additional JS for the project detail page.
 * Runs after script.js (which handles nav, reveal, etc.)
 *
 * Modules:
 *  1. Reading progress bar
 *  2. TOC active link tracking
 *  3. Image lazy-load fade-in
 *  4. Before/After hover labels
 * ─────────────────────────────────────────────────────────
 */

'use strict';

/* ─────────────────────────────────────────────────────────
   UTILITIES (mirrors script.js, standalone here)
───────────────────────────────────────────────────────── */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function throttle(fn, limit) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= limit) { last = now; fn(...args); }
  };
}


/* ─────────────────────────────────────────────────────────
   1. READING PROGRESS BAR
   A thin line at the very top of the page that fills
   as the user reads, giving a sense of page position.
───────────────────────────────────────────────────────── */
function initReadingProgress() {
  // Create bar element
  const bar = document.createElement('div');
  bar.className = 'reading-progress';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', 'Reading progress');
  bar.setAttribute('aria-valuenow', '0');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  document.body.prepend(bar);

  const updateProgress = throttle(() => {
    const scrollTop    = window.scrollY;
    const docHeight    = document.documentElement.scrollHeight - window.innerHeight;
    const progress     = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    const clamped      = Math.min(100, Math.max(0, progress));

    bar.style.width = clamped + '%';
    bar.setAttribute('aria-valuenow', Math.round(clamped));
  }, 16);

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress(); // initial call
}


/* ─────────────────────────────────────────────────────────
   2. TOC ACTIVE LINK TRACKING
   Watches all .proj-section elements. Highlights the
   corresponding .proj-toc__link as each section scrolls
   into view. Uses IntersectionObserver for performance.
───────────────────────────────────────────────────────── */
function initTocActiveLinks() {
  const tocLinks = qsa('.proj-toc__link');
  const sections = qsa('.proj-section[id]');

  if (!tocLinks.length || !sections.length) return;

  // Map section id → toc link
  const linkMap = new Map();
  tocLinks.forEach(link => {
    const id = link.getAttribute('href')?.replace('#', '');
    if (id) linkMap.set(id, link);
  });

  let currentActive = null;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const link = linkMap.get(entry.target.id);
      if (!link || link === currentActive) return;

      // Deactivate previous
      if (currentActive) currentActive.classList.remove('is-active');

      // Activate new
      link.classList.add('is-active');
      currentActive = link;

      // Scroll TOC link into view (inside sidebar) if needed
      const toc = qs('.proj-toc nav');
      if (toc) {
        const linkTop    = link.offsetTop;
        const tocScrollTop = toc.scrollTop;
        const tocHeight  = toc.offsetHeight;
        if (linkTop < tocScrollTop || linkTop > tocScrollTop + tocHeight) {
          toc.scrollTo({ top: linkTop - tocHeight / 2, behavior: 'smooth' });
        }
      }
    });
  }, {
    rootMargin: '-15% 0px -70% 0px',
    threshold: 0,
  });

  sections.forEach(sec => observer.observe(sec));
}


/* ─────────────────────────────────────────────────────────
   3. IMAGE LAZY-LOAD FADE-IN
   Adds a gentle opacity transition when lazy images
   finish loading, preventing the harsh snap into view.
───────────────────────────────────────────────────────── */
function initImageFadeIn() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const lazyImages = qsa('img[loading="lazy"]');

  lazyImages.forEach(img => {
    // Start invisible
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)';

    function reveal() {
      img.style.opacity = '1';
    }

    if (img.complete && img.naturalWidth > 0) {
      // Already loaded (e.g. from cache)
      img.style.opacity = '1';
    } else {
      img.addEventListener('load',  reveal, { once: true });
      img.addEventListener('error', reveal, { once: true }); // show even if broken
    }
  });
}


/* ─────────────────────────────────────────────────────────
   4. BEFORE / AFTER INTERACTIVE LABELS
   On hover, the Before/After labels shift position
   slightly to reinforce the comparison feel.
   Pure CSS handles most of it; this just adds a subtle
   class toggle for the active pair.
───────────────────────────────────────────────────────── */
function initBeforeAfterInteraction() {
  const pairs = qsa('.before-after');

  pairs.forEach(pair => {
    const items = qsa('.before-after__item', pair);

    items.forEach(item => {
      item.addEventListener('mouseenter', () => {
        // Dim sibling slightly to focus on hovered item
        items.forEach(sibling => {
          if (sibling !== item) {
            sibling.style.opacity = '0.65';
          }
        });
      });

      item.addEventListener('mouseleave', () => {
        items.forEach(sibling => {
          sibling.style.opacity = '1';
        });
      });
    });
  });
}


/* ─────────────────────────────────────────────────────────
   5. SMOOTH TOC SCROLL
   When user clicks a TOC link, scroll to section with
   correct offset for the fixed nav.
───────────────────────────────────────────────────────── */
function initTocScroll() {
  qsa('.proj-toc__link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const id = link.getAttribute('href')?.replace('#', '');
      const target = id ? qs('#' + id) : null;
      if (!target) return;

      const nav = qs('#nav');
      const navHeight = nav ? nav.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 32;

      window.scrollTo({ top, behavior: 'smooth' });
      history.pushState(null, '', '#' + id);
    });
  });
}


/* ─────────────────────────────────────────────────────────
   6. SCREEN GROUP — STAGGERED REVEAL
   For the final screens section, stagger the reveal of
   each .screen-group so they don't all pop at once.
───────────────────────────────────────────────────────── */
function initScreenGroupStagger() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const groups = qsa('.screen-group');
  groups.forEach((group, i) => {
    // Already handled by .reveal system — just set stagger delay
    const delay = (i % 3) * 0.05; // max 0.1s stagger, reset per row
    group.style.setProperty('--delay', delay + 's');
  });
}


/* ─────────────────────────────────────────────────────────
   7. FIX INDEX.HTML LINKS
   Update "Read more" links in the main page to point
   to the correct project detail pages.
   (This runs on index.html if project.js is somehow
   included there — safe guard with page detection.)
───────────────────────────────────────────────────────── */
function patchIndexLinks() {
  // Only run on the main index page
  if (!document.querySelector('.projects')) return;

  const projectMap = [
    { title: 'soar',   href: 'project-soar.html'  },
    { title: 'trip',   href: 'project-trip.html'  },
    { title: 'frame',  href: 'project-frame.html' },
  ];

  qsa('.project-card__cta').forEach((cta, i) => {
    if (projectMap[i]) {
      cta.setAttribute('href', projectMap[i].href);
    }
  });
}


/* ─────────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initReadingProgress();
  initTocActiveLinks();
  initImageFadeIn();
  initBeforeAfterInteraction();
  initTocScroll();
  initScreenGroupStagger();
  patchIndexLinks();
});
