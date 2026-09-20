/* =============================================================================
   LAY Congress — Interaktionen
   Vanilla JS, keine Abhängigkeiten. Alles respektiert prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------------------
     1. Headline wortweise einblenden
     ------------------------------------------------------------------------ */
  function splitHeadline() {
    $$('[data-split]').forEach(function (el) {
      var i = 0;
      function wrapText(text, parent) {
        text.split(/(\s+)/).forEach(function (part) {
          if (!part.trim()) { parent.appendChild(document.createTextNode(part)); return; }
          var w = document.createElement('span');
          w.className = 'reveal-word';
          w.style.setProperty('--wi', i++);
          var inner = document.createElement('span');
          inner.textContent = part;
          w.appendChild(inner);
          parent.appendChild(w);
        });
      }
      Array.prototype.slice.call(el.childNodes).forEach(function (node) {
        if (node.nodeType === 3) {
          var frag = document.createDocumentFragment();
          wrapText(node.textContent, frag);
          el.replaceChild(frag, node);
        } else if (node.nodeType === 1) {
          var t = node.textContent;
          node.textContent = '';
          wrapText(t, node);
        }
      });
    });
  }
  if (!reduced) splitHeadline();

  /* ---------------------------------------------------------------------------
     2. Header: Shrink, Auto-Hide, Scroll-Fortschritt
     ------------------------------------------------------------------------ */
  var revealRest = function () {};
  var fillTimeline = function () {};

  var header   = $('#header');
  var progress = $('#progress');
  var totop    = $('#totop');
  var callbar  = $('#callbar');
  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;

    header.classList.toggle('is-scrolled', y > 20);

    if (!document.body.classList.contains('nav-open')) {
      if (y > lastY && y > 340) header.classList.add('is-hidden');
      else header.classList.remove('is-hidden');
    }

    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    if (totop)   totop.classList.toggle('is-visible', y > 700);
    if (callbar) callbar.classList.toggle('is-visible', y > 520);

    fillTimeline();

    // am Seitenende nichts Unsichtbares zurücklassen
    if (y + window.innerHeight >= document.documentElement.scrollHeight - 4) revealRest();

    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();
  window.addEventListener('load', onScroll);
  window.addEventListener('resize', onScroll);

  /* ---------------------------------------------------------------------------
     3. Mobiles Menü
     ------------------------------------------------------------------------ */
  var burger    = $('#burger');
  var mobileNav = $('#mobileNav');

  function setNav(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    mobileNav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    if (open) header.classList.remove('is-hidden');
  }

  if (burger && mobileNav) {
    burger.addEventListener('click', function () {
      setNav(burger.getAttribute('aria-expanded') !== 'true');
    });
    $$('a', mobileNav).forEach(function (a) {
      a.addEventListener('click', function () { setNav(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) {
        setNav(false);
        burger.focus();
      }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (e) {
      if (e.matches) setNav(false);
    });
  }

  /* ---------------------------------------------------------------------------
     4. Reveal-on-Scroll
     ------------------------------------------------------------------------ */
  (function reveal() {
    var els = $$('.reveal, .reveal-left, .reveal-right');
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    els.forEach(function (el) { io.observe(el); });

    // Sicherheitsnetz für den untersten Viewport-Streifen
    revealRest = function () {
      els.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        el.classList.add('is-in');
        io.unobserve(el);
      });
    };
  })();

  /* ---------------------------------------------------------------------------
     5. Zeitstrahl füllt sich beim Scrollen
     ------------------------------------------------------------------------ */
  (function timeline() {
    var tl   = $('#timeline');
    var line = $('#timelineLine');
    if (!tl || !line) return;
    if (reduced) { line.style.setProperty('--fill', 1); return; }

    fillTimeline = function () {
      var r = tl.getBoundingClientRect();
      var mid = window.innerHeight * 0.62;
      var p = (mid - r.top) / r.height;
      line.style.setProperty('--fill', Math.max(0, Math.min(1, p)));
    };
    fillTimeline();
  })();

  /* ---------------------------------------------------------------------------
     6. Scroll-Spy für die Navigation
     ------------------------------------------------------------------------ */
  (function scrollSpy() {
    var links = $$('.nav a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    var sections = [];
    links.forEach(function (a) {
      var el = document.querySelector(a.getAttribute('href'));
      if (el) { map[el.id] = a; sections.push(el); }
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        if (map[e.target.id]) map[e.target.id].classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { io.observe(s); });
  })();

  /* ---------------------------------------------------------------------------
     7. Sanfter Parallax auf dem Hero-Hintergrund
     ------------------------------------------------------------------------ */
  (function parallax() {
    var bg = $('.hero__bg img');
    if (!bg || reduced || !window.matchMedia('(pointer: fine)').matches) return;

    var hero = $('#hero');
    var running = false;

    function step() {
      var r = hero.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        var shift = Math.min(window.scrollY * 0.16, 90);
        bg.style.transform = 'translate3d(0,' + shift + 'px,0) scale(1.12)';
      }
      running = false;
    }
    bg.style.willChange = 'transform';
    bg.style.transform = 'scale(1.12)';
    window.addEventListener('scroll', function () {
      if (!running) { requestAnimationFrame(step); running = true; }
    }, { passive: true });
  })();

  /* ---------------------------------------------------------------------------
     8. Sanftes Anchor-Scrolling mit Header-Versatz
     ------------------------------------------------------------------------ */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;

    e.preventDefault();
    var y = target.getBoundingClientRect().top + window.scrollY - (header.offsetHeight + 12);
    window.scrollTo({ top: Math.max(y, 0), behavior: reduced ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
  });

  /* ---------------------------------------------------------------------------
     9. Nach oben
     ------------------------------------------------------------------------ */
  if (totop) {
    totop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }
})();
