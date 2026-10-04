/* ============================================================
   Marisquería El Gallego — interacción y motion
   ============================================================ */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = () => matchMedia('(min-width: 861px)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ----------------------------------------------------------
     HORARIO (hora de Toledo). Minutos desde las 00:00.
     Índice = día de la semana JS: 0 domingo … 6 sábado.
     1440 = medianoche (cierre a las 24:00).
     ---------------------------------------------------------- */
  const H = (h, m = 0) => h * 60 + m;
  const SCHEDULE = {
    0: [[H(13), H(17)], [H(20), H(24)]],      // domingo
    1: [],                                    // lunes — cerrado
    2: [[H(13), H(17)], [H(20), H(23, 30)]],  // martes
    3: [[H(13), H(17)], [H(20), H(23, 30)]],  // miércoles
    4: [[H(13), H(17)], [H(20), H(24)]],      // jueves
    5: [[H(13), H(17)], [H(20), H(24)]],      // viernes
    6: [[H(13), H(17)], [H(20), H(24)]],      // sábado
  };
  const SOON = 30; // minutos antes del cierre para el aviso
  const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const fmt = (min) => {
    const m = min % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };
  const dur = (min) => {
    const h = Math.floor(min / 60), m = min % 60;
    if (!h) return `${m} min`;
    return m ? `${h} h ${m} min` : `${h} h`;
  };

  const tzParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid', weekday: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function madridNow() {
    const p = Object.fromEntries(tzParts.formatToParts(new Date()).map(x => [x.type, x.value]));
    const h = +p.hour % 24, m = +p.minute, s = +p.second;
    return { day: WD[p.weekday], min: h * 60 + m, h, m, s };
  }

  function getStatus(now) {
    const today = SCHEDULE[now.day];
    for (const [o, c] of today) {
      if (now.min >= o && now.min < c) {
        const left = c - now.min;
        return { state: left <= SOON ? 'soon' : 'open', closeAt: c, left };
      }
    }
    // próxima apertura
    for (let i = 0; i < 8; i++) {
      const d = (now.day + i) % 7;
      for (const [o] of SCHEDULE[d]) {
        if (i === 0 && o <= now.min) continue;
        return { state: 'closed', openDay: d, openAt: o, offset: i, wait: i * 1440 + o - now.min };
      }
    }
    return { state: 'closed' };
  }

  function statusMessage(st, now) {
    if (st.state === 'open' || st.state === 'soon') {
      return `Abierto hasta las ${fmt(st.closeAt)} — <strong>quedan ${dur(st.left)}</strong>`;
    }
    if (st.openAt == null) return 'Cerrado';
    const when = st.offset === 0 ? 'hoy'
      : st.offset === 1 ? 'mañana'
      : `el ${DAYS[st.openDay]}`;
    if (st.offset === 0) return `Abrimos ${when} a las ${fmt(st.openAt)} — <strong>en ${dur(st.wait)}</strong>`;
    if (!SCHEDULE[now.day].length) return `Hoy ${DAYS[now.day]} descansamos. <strong>Abrimos ${when} a las ${fmt(st.openAt)}</strong>`;
    return `Cerrado por hoy. <strong>Abrimos ${when} a las ${fmt(st.openAt)}</strong>`;
  }

  /* ---------- tablero split-flap ---------- */
  const flap = $('[data-flap]');
  const FLAP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const cells = [];
  if (flap) {
    for (let i = 0; i < 7; i++) {
      const c = document.createElement('span');
      c.className = 'flap__c';
      c.textContent = ' ';
      flap.appendChild(c);
      cells.push(c);
    }
  }
  let flapWord = '';
  function setFlap(word) {
    if (word === flapWord) return;
    flapWord = word;
    flap.setAttribute('aria-label', word === 'ABIERTO' ? 'Abierto' : 'Cerrado');
    cells.forEach((cell, i) => {
      const target = word[i] || ' ';
      if (reduced) { cell.textContent = target; return; }
      let n = 6 + i * 2 + Math.floor(Math.random() * 4);
      const tick = () => {
        cell.classList.remove('flip'); void cell.offsetWidth; cell.classList.add('flip');
        if (--n <= 0) { cell.textContent = target; return; }
        cell.textContent = FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
        setTimeout(tick, 70);
      };
      setTimeout(tick, i * 60);
    });
  }

  /* ---------- semana + línea de tiempo ---------- */
  const weekEl = $('[data-week]');
  const timeline = $('[data-timeline]');
  const nowEl = $('[data-now]');
  let renderedDay = -1;

  function renderDay(now) {
    renderedDay = now.day;
    weekEl.innerHTML = WEEK_ORDER.map(d => {
      const slots = SCHEDULE[d];
      const txt = slots.length ? slots.map(([o, c]) => `${fmt(o)}–${c === 1440 ? '24:00' : fmt(c)}`).join(' · ') : 'Cerrado';
      return `<li class="${d === now.day ? 'today' : ''}"><span>${DAYS[d][0].toUpperCase() + DAYS[d].slice(1)}</span><span>${txt}</span></li>`;
    }).join('');
    timeline.innerHTML = SCHEDULE[now.day].map(([o, c]) =>
      `<i data-end="${c}" style="left:${o / 14.4}%;width:${(c - o) / 14.4}%"></i>`).join('');
  }

  const monitor = $('.monitor');
  const pill = $('[data-status-pill]');
  const msgEl = $('[data-status-msg]');
  const clockEl = $('[data-clock]');
  const inline = $('[data-status-inline]');
  const PILL = { open: 'Abierto ahora', soon: 'Cierra pronto', closed: 'Cerrado' };
  const COLOR = { open: 'var(--open)', soon: 'var(--soon)', closed: 'var(--closed)' };

  function updateStatus() {
    const now = madridNow();
    if (now.day !== renderedDay) renderDay(now);
    const st = getStatus(now);

    clockEl.textContent = `${String(now.h).padStart(2, '0')}:${String(now.m).padStart(2, '0')}:${String(now.s).padStart(2, '0')}`;
    monitor.dataset.state = st.state;
    pill.dataset.state = st.state;
    $('.pill__text', pill).textContent = PILL[st.state];
    setFlap(st.state === 'closed' ? 'CERRADO' : 'ABIERTO');
    msgEl.innerHTML = statusMessage(st, now);
    if (inline) {
      inline.textContent = PILL[st.state];
      inline.style.setProperty('--c', COLOR[st.state]);
    }
    nowEl.style.left = `${(now.min + now.s / 60) / 14.4}%`;
    $$('i', timeline).forEach(i => i.classList.toggle('past', +i.dataset.end <= now.min));
  }

  $('[data-week-toggle]')?.addEventListener('click', (e) => {
    const b = e.currentTarget, open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', open);
    weekEl.hidden = !open;
  });

  updateStatus();
  setInterval(updateStatus, 1000);

  /* ----------------------------------------------------------
     Imágenes que no cargan → placeholder elegante
     ---------------------------------------------------------- */
  const markMissing = (img) => img.closest('.ph')?.classList.add('is-missing');
  document.addEventListener('error', (e) => { if (e.target.tagName === 'IMG') markMissing(e.target); }, true);
  $$('.ph img').forEach(img => { if (img.complete && img.naturalWidth === 0 && img.currentSrc) markMissing(img); });

  /* ----------------------------------------------------------
     Navegación
     ---------------------------------------------------------- */
  const nav = $('[data-nav]');
  const burger = $('[data-burger]');
  const drawer = $('[data-drawer]');
  let lastY = scrollY;

  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', open);
    drawer.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    nav.classList.toggle('is-solid', !open && scrollY > 40);
  });
  $$('a', drawer).forEach(a => a.addEventListener('click', () => burger.click()));

  /* ----------------------------------------------------------
     Texto partido por palabras + reveal
     ---------------------------------------------------------- */
  $$('[data-split]').forEach(el => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
            w.appendChild(s); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('.rv, [data-split]').forEach(el => io.observe(el));

  /* ----------------------------------------------------------
     Hero: pase de imágenes
     ---------------------------------------------------------- */
  const heroDots = $('[data-hero-dots]');
  const SLIDE_MS = 6500;
  let slideIdx = 0, slideTimer;
  const slides = () => $$('.hero__slide').filter(s => !s.classList.contains('is-missing'));

  function renderDots() {
    const list = slides();
    heroDots.innerHTML = list.map((_, i) => `<i class="${i === slideIdx ? 'is-on' : ''}"></i>`).join('');
    heroDots.style.setProperty('--dur', `${SLIDE_MS}ms`);
  }
  function goSlide(n) {
    const list = slides();
    if (!list.length) return;
    slideIdx = (n + list.length) % list.length;
    $$('.hero__slide').forEach(s => s.classList.remove('is-on'));
    list[slideIdx].classList.add('is-on');
    renderDots();
  }
  if (!reduced) {
    renderDots();
    slideTimer = setInterval(() => goSlide(slideIdx + 1), SLIDE_MS);
  }
  // si la diapositiva visible falla, saltar a la siguiente válida
  document.addEventListener('error', (e) => {
    if (e.target.closest?.('.hero__slide')) setTimeout(() => goSlide(0), 0);
  }, true);

  /* ----------------------------------------------------------
     Marquesina con inercia de scroll
     ---------------------------------------------------------- */
  const mq = $('[data-marquee]');
  mq.innerHTML += mq.innerHTML; // duplicar para bucle continuo
  let mqX = 0, velocity = 0;

  /* ----------------------------------------------------------
     Galería horizontal anclada
     ---------------------------------------------------------- */
  const gal = $('[data-gal]');
  const galTrack = $('[data-gal-track]');
  const galBar = $('[data-gal-bar]');
  let galDist = 0;

  function sizeGallery() {
    if (!desktop() || reduced) { gal.style.height = ''; galTrack.style.transform = ''; galDist = 0; return; }
    galDist = Math.max(0, galTrack.scrollWidth - innerWidth);
    gal.style.height = `${innerHeight + galDist}px`;
  }

  $$('.chips button').forEach(btn => btn.addEventListener('click', () => {
    $$('.chips button').forEach(b => b.classList.toggle('is-on', b === btn));
    const f = btn.dataset.filter;
    $$('.card', galTrack).forEach(c => c.classList.toggle('is-dim', f !== 'all' && c.dataset.cat !== f));
    // llevar al primer elemento visible
    const first = $$('.card', galTrack).find(c => !c.classList.contains('is-dim'));
    if (!first) return;
    if (desktop() && !reduced && galDist) {
      const target = clamp(first.offsetLeft - parseFloat(getComputedStyle(galTrack).paddingLeft), 0, galDist);
      const top = gal.offsetTop + target;
      if (scrollY < gal.offsetTop || scrollY > gal.offsetTop + galDist) scrollTo({ top: gal.offsetTop, behavior: 'smooth' });
      else scrollTo({ top, behavior: 'smooth' });
    } else {
      $('.gal__viewport').scrollTo({ left: first.offsetLeft - 16, behavior: 'smooth' });
    }
  }));

  /* ----------------------------------------------------------
     Bucle de scroll / animación
     ---------------------------------------------------------- */
  const heroMedia = $('[data-hero]');
  const parallax = $$('[data-speed]');

  function frame() {
    const y = scrollY;
    const dy = y - lastY;

    // nav
    if (!drawer.hidden) { /* menú abierto */ }
    else {
      nav.classList.toggle('is-solid', y > innerHeight * 0.75);
      nav.classList.toggle('is-hidden', dy > 4 && y > innerHeight);
      if (dy < -4) nav.classList.remove('is-hidden');
    }

    if (!reduced) {
      // hero
      if (y < innerHeight * 1.2) heroMedia.style.transform = `translate3d(0, ${y * 0.28}px, 0)`;

      // parallax
      const vc = innerHeight / 2;
      parallax.forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) return;
        const off = (r.top + r.height / 2 - vc) * parseFloat(el.dataset.speed);
        el.style.transform = `translate3d(0, ${off}px, 0)`;
      });

      // marquesina
      velocity += (Math.abs(dy) - velocity) * 0.1;
      mqX -= 0.6 + velocity * 0.35;
      const half = mq.scrollWidth / 2;
      if (-mqX >= half) mqX += half;
      mq.style.transform = `translate3d(${mqX}px, 0, 0) skewX(${clamp(-velocity * 0.25, -8, 0)}deg)`;

      // galería
      if (galDist) {
        const top = gal.getBoundingClientRect().top;
        const p = clamp(-top / galDist, 0, 1);
        galTrack.style.transform = `translate3d(${-p * galDist}px, 0, 0)`;
        galBar.style.transform = `scaleX(${p})`;
      }
    }

    lastY = y;
    requestAnimationFrame(frame);
  }

  sizeGallery();
  addEventListener('load', sizeGallery);
  addEventListener('resize', () => { sizeGallery(); });
  requestAnimationFrame(frame);

  // barra de progreso en móvil (scroll horizontal nativo)
  $('.gal__viewport').addEventListener('scroll', (e) => {
    const v = e.currentTarget, max = v.scrollWidth - v.clientWidth;
    if (!galDist) galBar.style.transform = `scaleX(${max ? v.scrollLeft / max : 0})`;
  }, { passive: true });

  /* ----------------------------------------------------------
     Carta: pestañas + imagen que sigue al cursor
     ---------------------------------------------------------- */
  const tabs = $$('[data-tab]');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.setAttribute('aria-selected', x === t));
    $$('[data-panel]').forEach(p => {
      const on = p.dataset.panel === t.dataset.tab;
      p.hidden = !on;
      p.classList.toggle('is-on', on);
    });
  }));
  $('.tabs').addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const i = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    n.focus(); n.click();
  });

  const cimg = $('[data-cursor-img]');
  const cimgImg = $('img', cimg);
  if (matchMedia('(hover: hover)').matches && !reduced) {
    let tx = 0, ty = 0, cx = 0, cy = 0, rot = 0, active = false, raf = 0;
    const loop = () => {
      const px = cx;
      cx += (tx - cx) * 0.16; cy += (ty - cy) * 0.16;
      rot += (clamp((cx - px) * 0.6, -12, 12) - rot) * 0.2;
      cimg.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%) rotate(${rot}deg) scale(${active ? 1 : .85})`;
      raf = requestAnimationFrame(loop);
    };
    $('.carta__body').addEventListener('mousemove', (e) => {
      tx = e.clientX + 150; ty = e.clientY;
      const li = e.target.closest('li[data-img]');
      if (li) {
        if (cimgImg.getAttribute('src') !== li.dataset.img) cimgImg.src = li.dataset.img;
        if (!active) { active = true; cx = tx; cy = ty; cimg.classList.add('is-on'); if (!raf) loop(); }
      } else if (active) { active = false; cimg.classList.remove('is-on'); }
    });
    $('.carta__body').addEventListener('mouseleave', () => { active = false; cimg.classList.remove('is-on'); });
    cimgImg.addEventListener('error', () => { cimg.style.visibility = 'hidden'; });
    cimgImg.addEventListener('load', () => { cimg.style.visibility = ''; });
  }

  /* ----------------------------------------------------------
     Botones magnéticos
     ---------------------------------------------------------- */
  if (matchMedia('(hover: hover)').matches && !reduced) {
    $$('[data-magnet]').forEach(b => {
      b.addEventListener('mousemove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', `${(e.clientX - r.left - r.width / 2) * 0.25}px`);
        b.style.setProperty('--my', `${(e.clientY - r.top - r.height / 2) * 0.35}px`);
      });
      b.addEventListener('mouseleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
    });
  }

  /* ----------------------------------------------------------
     Lightbox
     ---------------------------------------------------------- */
  const lb = $('[data-lb]');
  const lbImg = $('[data-lb-img]');
  const lbCap = $('[data-lb-cap]');
  let lbList = [], lbIdx = 0;

  const lbShow = (i) => {
    lbIdx = (i + lbList.length) % lbList.length;
    const card = lbList[lbIdx], img = $('img', card);
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = $('figcaption', card)?.lastChild.textContent.trim() || '';
    lbImg.style.animation = 'none'; void lbImg.offsetWidth; lbImg.style.animation = '';
  };
  const lbClose = () => { lb.hidden = true; document.body.style.overflow = ''; };

  $$('.card', galTrack).forEach(card => {
    card.tabIndex = 0;
    const open = () => {
      lbList = $$('.card', galTrack).filter(c => !c.classList.contains('is-dim') && !c.classList.contains('is-missing'));
      if (!lbList.includes(card)) return;
      lb.hidden = false; document.body.style.overflow = 'hidden';
      lbShow(lbList.indexOf(card));
      $('[data-lb-close]').focus();
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
  $('[data-lb-close]').addEventListener('click', lbClose);
  $('[data-lb-prev]').addEventListener('click', () => lbShow(lbIdx - 1));
  $('[data-lb-next]').addEventListener('click', () => lbShow(lbIdx + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) lbClose(); });
  addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
    if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
  });

  /* ---------- año ---------- */
  $('[data-year]').textContent = new Date().getFullYear();
})();
