/* Shared: theme toggle + mobile nav + footer year. Runs on every page. */
(function () {
  var root = document.documentElement;
  var saved = localStorage.getItem('tmg-theme');
  if (saved) root.setAttribute('data-theme', saved);
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) root.setAttribute('data-theme', 'dark');

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-theme-toggle]');
    if (t) {
      var cur = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', cur);
      localStorage.setItem('tmg-theme', cur);
      var ic = t.querySelector('.ti');
      if (ic) ic.textContent = cur === 'dark' ? '☀️' : '🌙';
    }
    var nt = e.target.closest('[data-nav-toggle]');
    if (nt) {
      var links = document.getElementById('navLinks');
      if (links) links.classList.toggle('open');
    }
    // Donation: copy the USDT (TRC20) wallet address to the clipboard.
    var cw = e.target.closest('[data-copy-wallet]');
    if (cw) {
      var walletEl = document.getElementById('usdtWallet');
      var addr = walletEl ? walletEl.textContent.trim() : '';
      if (addr) {
        var I18N = window.__TMG_I18N || {};
        var msg = I18N.t_wallet || '✅ Wallet address copied';
        var done = function () { showToast(msg); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(addr).then(done).catch(function () { fallbackCopy(addr, done); });
        } else { fallbackCopy(addr, done); }
      }
    }
  });

  function fallbackCopy(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); if (cb) cb(); } catch (e) {}
    document.body.removeChild(ta);
  }

  function showToast(msg) {
    var el = document.getElementById('toast');
    if (!el) { return; }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  // reflect current theme on the toggle icon at load
  document.addEventListener('DOMContentLoaded', function () {
    var ic = document.querySelector('[data-theme-toggle] .ti');
    if (ic) ic.textContent = root.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
    // mark active nav link
    var here = location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      var href = a.getAttribute('href').replace(/\/$/, '') || '/';
      if (href === here) a.classList.add('active');
    });
  });
})();
