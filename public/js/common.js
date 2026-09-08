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
  });

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
