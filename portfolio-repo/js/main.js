/* Portfolio — Ailen Ramirez · Interacciones y animaciones */

(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var small = matchMedia('(max-width: 760px)').matches || !fine;

  /* Tema claro / oscuro */
  try { var saved = localStorage.getItem('ar-theme'); if (saved) root.setAttribute('data-theme', saved); } catch (e) {}
  document.getElementById('theme-toggle').addEventListener('click', function () {
    var current = root.getAttribute('data-theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('ar-theme', next); } catch (e) {}
  });

  /* Header con fondo al scrollear */
  var header = document.querySelector('.site-header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 40); }
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  /* Copiar email */
  var copyBtn = document.getElementById('copy-email');
  copyBtn.addEventListener('click', function () {
    var text = 'ailuramirezok@gmail.com';
    function done() { copyBtn.textContent = 'Copiado'; setTimeout(function () { copyBtn.textContent = 'Copiar'; }, 1800); }
    function fallback() {
      var r = document.createRange(); r.selectNodeContents(document.getElementById('email'));
      var s = getSelection(); s.removeAllRanges(); s.addRange(r); copyBtn.textContent = 'Seleccionado';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else { fallback(); }
  });

  /* ================= CAPAS: canvas de fondo =================
     Capa código: grilla blueprint + signos que flotan.
     Capa diseño: círculo seleccionado tipo Figma + curva Bézier con puntos de control.
     Capa contenido: tarjetas de story y post.
     Cada capa tiene distinta profundidad (scroll y mouse). */
  var cv = document.getElementById('layers');
  var ctx = cv && cv.getContext && cv.getContext('2d');
  var W = 0, H = 0, col = {}, mouse = { x: 0, y: 0 }, sm = { x: 0, y: 0 }, glyphs = [];
  var CH = ['</>', '{ }', ';', '=>', '( )', '</>', '=>', '{ }', ';', '[ ]', '&&', '::'];
  var MONO = '"IBM Plex Mono", ui-monospace, monospace';

  function readColors() {
    var cs = getComputedStyle(root);
    ['--ink', '--blue', '--accent', '--surface', '--muted', '--band-fg'].forEach(function (k) {
      col[k] = cs.getPropertyValue(k).trim();
    });
  }
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function seed() {
    var n = small ? 8 : 18; glyphs = [];
    for (var i = 0; i < n; i++) {
      glyphs.push({
        x: (i + Math.random() * .8) / n, y: Math.random(),
        s: 12 + Math.random() * (small ? 6 : 12), sp: .004 + Math.random() * .01,
        par: .08 + Math.random() * .3, ch: CH[i % CH.length], blue: i % 4 === 0, a: .1 + Math.random() * .08
      });
    }
  }
  function mod(v, m) { return ((v % m) + m) % m; }
  function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }

  function drawGrid(sy) {
    var step = small ? 40 : 56, x, y;
    ctx.lineWidth = 1; ctx.strokeStyle = col['--ink'];
    [[step, .045], [step * 4, .07]].forEach(function (g) {
      var s = g[0], oy = -mod(sy * .25, s);
      ctx.globalAlpha = g[1]; ctx.beginPath();
      for (x = mod(W / 2, s); x < W; x += s) { ctx.moveTo(Math.round(x) + .5, 0); ctx.lineTo(Math.round(x) + .5, H); }
      for (y = oy; y < H; y += s) { ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(W, Math.round(y) + .5); }
      ctx.stroke();
    });
  }
  function drawGlyphs(t, sy) {
    glyphs.forEach(function (g) {
      var y = mod(g.y * (H + 80) - sy * g.par - t * g.sp, H + 80) - 40;
      ctx.globalAlpha = g.a; ctx.fillStyle = g.blue ? col['--blue'] : col['--ink'];
      ctx.font = '500 ' + g.s.toFixed(0) + 'px ' + MONO;
      ctx.fillText(g.ch, g.x * W, y);
    });
  }
  function card(x, y, w, h, rot, kind, label) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.globalAlpha = .8; ctx.fillStyle = col['--surface']; rr(-w / 2, -h / 2, w, h, 8); ctx.fill();
    ctx.globalAlpha = .18; ctx.strokeStyle = col['--ink']; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalAlpha = .85; ctx.fillStyle = kind === 'story' ? col['--blue'] : col['--ink'];
    rr(-w / 2 + 6, -h / 2 + 6, w - 12, h * .56, 5); ctx.fill();
    ctx.globalAlpha = .2; ctx.fillStyle = col['--ink'];
    rr(-w / 2 + 8, -h / 2 + h * .56 + 14, (w - 16) * .85, 5, 2.5); ctx.fill();
    rr(-w / 2 + 8, -h / 2 + h * .56 + 25, (w - 16) * .5, 5, 2.5); ctx.fill();
    ctx.globalAlpha = .75; ctx.fillStyle = col['--muted']; ctx.font = '10px ' + MONO;
    ctx.fillText(label, -w / 2, -h / 2 - 9);
    ctx.restore();
  }
  function drawHero(t, sy) {
    var hy = -sy * .55;
    if (hy < -H * 1.4) return;
    var mx = sm.x, my = sm.y;
    var R = Math.min(W, H) * (small ? .34 : .3) * (1 + .012 * Math.sin(t * .0007));
    var cx = W * (small ? .68 : .7) + mx * 28, cy = H * (small ? .36 : .46) + hy + my * 28;

    /* resplandor azul */
    var gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6);
    gr.addColorStop(0, col['--blue'] + '2E'); gr.addColorStop(1, col['--blue'] + '00');
    ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.fillRect(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2);

    /* guía vertical (rojo fino, como las guías de Figma) */
    ctx.strokeStyle = col['--accent']; ctx.lineWidth = 1; ctx.globalAlpha = .25;
    ctx.beginPath(); ctx.moveTo(Math.round(cx) + .5, 0); ctx.lineTo(Math.round(cx) + .5, H); ctx.stroke();

    /* círculo + caja de selección + medida */
    ctx.strokeStyle = col['--blue']; ctx.lineWidth = 1.25; ctx.globalAlpha = .75;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1; ctx.globalAlpha = .45; ctx.strokeRect(cx - R, cy - R, R * 2, R * 2);
    ctx.globalAlpha = .9;
    [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]].forEach(function (h) {
      var hx = cx + h[0] * R, hy2 = cy + h[1] * R;
      ctx.fillStyle = col['--surface']; ctx.fillRect(hx - 3.5, hy2 - 3.5, 7, 7); ctx.strokeRect(hx - 3.5, hy2 - 3.5, 7, 7);
    });
    var size = Math.round(R * 2), lbl = size + ' × ' + size;
    ctx.font = '500 11px ' + MONO; var tw = ctx.measureText(lbl).width;
    ctx.fillStyle = col['--blue']; rr(cx - tw / 2 - 8, cy + R + 10, tw + 16, 20, 4); ctx.fill();
    ctx.fillStyle = col['--band-fg']; ctx.fillText(lbl, cx - tw / 2, cy + R + 24);

    /* curva Bézier con sus manijas */
    var bx = mx * 14, by = my * 14;
    var p0 = [W * .03 + bx, H * (small ? .94 : .9) + hy + by];
    var p3 = [W * (small ? .92 : .52) + bx, H * (small ? .78 : .66) + hy + by];
    var c1 = [W * .18 + bx + Math.sin(t * .0005) * 40, H * (small ? .66 : .56) + hy + by];
    var c2 = [W * (small ? .62 : .36) + bx, H * 1.02 + hy + by + Math.cos(t * .0004) * 36];
    ctx.strokeStyle = col['--ink']; ctx.lineWidth = 1.25; ctx.globalAlpha = .38;
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p3[0], p3[1]); ctx.stroke();
    ctx.lineWidth = 1; ctx.globalAlpha = .24;
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(c1[0], c1[1]); ctx.moveTo(p3[0], p3[1]); ctx.lineTo(c2[0], c2[1]); ctx.stroke();
    ctx.globalAlpha = .7;
    [p0, p3].forEach(function (p) { ctx.fillStyle = col['--surface']; ctx.fillRect(p[0] - 4, p[1] - 4, 8, 8); ctx.strokeRect(p[0] - 4, p[1] - 4, 8, 8); });
    ctx.globalAlpha = .85; ctx.fillStyle = col['--accent'];
    [c1, c2].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 3.5, 0, Math.PI * 2); ctx.fill(); });

    /* capa contenido: tarjetas (la más cercana, se mueve más) */
    if (!small) {
      card(W * .9 + mx * 46, H * .34 + hy * 1.15 + Math.sin(t * .0005) * 10 + my * 46, 88, 156, -.06, 'story', 'Story · 1080×1920');
      card(W * .5 + mx * 40, H * .15 + hy * 1.25 + Math.cos(t * .00045) * 8 + my * 40, 92, 92, .05, 'post', 'Post · 1080×1080');
    }
  }
  function draw(t, sy) {
    sm.x += (mouse.x - sm.x) * .05; sm.y += (mouse.y - sm.y) * .05;
    ctx.clearRect(0, 0, W, H);
    drawGrid(sy); drawGlyphs(t, sy); drawHero(t, sy);
    ctx.globalAlpha = 1;
  }

  if (ctx) {
    readColors(); seed();
    if (reduce) cv.classList.add('is-static');
    resize();
    var redraw = function () { readColors(); if (reduce) draw(0, 0); };
    new MutationObserver(redraw).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    var mqDark = matchMedia('(prefers-color-scheme: dark)');
    if (mqDark.addEventListener) mqDark.addEventListener('change', redraw);
    window.addEventListener('resize', function () { resize(); if (reduce) draw(0, 0); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (reduce) draw(0, 0); });

    if (reduce) {
      draw(0, 0);
    } else {
      if (fine && !small) {
        window.addEventListener('pointermove', function (e) { mouse.x = e.clientX / W - .5; mouse.y = e.clientY / H - .5; }, { passive: true });
      }
      var t0 = performance.now(), last = 0;
      (function frame(now) {
        requestAnimationFrame(frame);
        if (document.hidden) return;
        if (small && now - last < 33) return; /* 30 fps en celular */
        last = now;
        draw(now - t0, window.scrollY);
      })(t0);
    }
  }

  if (reduce || !('IntersectionObserver' in window)) return;

  /* ================= Cursor ================= */
  var cur = document.getElementById('cursor');
  if (fine && cur) {
    var cx = -100, cy = -100, tx = -100, ty = -100;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY; cur.classList.add('is-on');
      var el = e.target, onMedia = !!(el.closest && el.closest('.media'));
      cur.classList.toggle('is-view', onMedia);
      cur.classList.toggle('is-link', !onMedia && !!(el.closest && el.closest('a, button')));
      cur.classList.toggle('on-band', !!(el.closest && el.closest('.band')));
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { cur.classList.remove('is-on'); });
    (function loop() {
      cx += (tx - cx) * .2; cy += (ty - cy) * .2;
      cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }

  /* ================= Marquee según scroll ================= */
  var mq = document.querySelector('.marquee-inner');
  if (mq) {
    mq.classList.add('is-js');
    var mx = 0, dir = 1, boost = 0, lastY = window.scrollY, tw = mq.firstElementChild.offsetWidth;
    window.addEventListener('resize', function () { tw = mq.firstElementChild.offsetWidth; });
    window.addEventListener('scroll', function () {
      var d = window.scrollY - lastY; lastY = window.scrollY;
      if (d) dir = d > 0 ? 1 : -1;
      boost = Math.min(boost + Math.abs(d) * .12, 14);
    }, { passive: true });
    (function loop() {
      mx -= dir * ((small ? .5 : .7) + boost); boost *= .93;
      if (mx <= -tw) mx += tw; if (mx > 0) mx -= tw;
      mq.style.transform = 'translate3d(' + mx.toFixed(1) + 'px,0,0)';
      requestAnimationFrame(loop);
    })();
  }

  /* ================= Parallax interno de los mockups ================= */
  var medias = Array.prototype.slice.call(document.querySelectorAll('.media'));
  var ticking = false;
  function para() {
    ticking = false; var vh = window.innerHeight;
    medias.forEach(function (m) {
      var r = m.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var p = ((r.top + r.height / 2) - vh / 2) / vh;
      m.style.setProperty('--p', Math.max(-1.2, Math.min(1.2, p)).toFixed(3));
    });
  }
  para();
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(para); } }, { passive: true });

  /* ================= Apariciones y contadores ================= */
  function count(el) {
    var to = +el.dataset.count, from = +el.dataset.from || 0, dur = 1600, t0 = null;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* Solo se ocultan (para animarse) los elementos que están fuera de pantalla al cargar */
  var vh = window.innerHeight;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      el.classList.remove('is-pending');
      el.querySelectorAll('[data-count]').forEach(count);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

  document.querySelectorAll('.reveal').forEach(function (el) {
    if (el.getBoundingClientRect().top > vh) {
      el.classList.add('is-pending');
      el.querySelectorAll('[data-count]').forEach(function (n) { n.textContent = n.dataset.from || 0; });
      if (el.closest('.p-info, .stats, .stack-rows')) {
        var i = Array.prototype.indexOf.call(el.parentNode.children, el);
        el.style.transitionDelay = (i * 0.08) + 's';
      }
      io.observe(el);
    }
  });
})();
