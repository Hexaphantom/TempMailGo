/* TempMailGo inbox application (vanilla JS, no build step) */
(function () {
  'use strict';

  var state = {
    address: null,
    token: null,
    expiresAt: 0,
    ttlMs: 3600000,
    domains: [],
    messages: [],
    poll: null,
    ticker: null,
  };

  var $ = function (s) { return document.querySelector(s); };
  var el = {
    address: $('#emailAddress'),
    copyBtn: $('#copyBtn'),
    newBtn: $('#newBtn'),
    domainSel: $('#domainSelect'),
    userInput: $('#userInput'),
    createBtn: $('#createBtn'),
    list: $('#mailList'),
    count: $('#inboxCount'),
    refresh: $('#refreshBtn'),
    timerFill: $('#timerFill'),
    timerVal: $('#timerVal'),
    extendBtn: $('#extendBtn'),
    qrBtn: $('#qrBtn'),
  };

  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  function api(path, opts) {
    return fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts))
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); });
  }

  function saveSession() {
    try { localStorage.setItem('tmg-session', JSON.stringify({ address: state.address, token: state.token, expiresAt: state.expiresAt })); } catch (e) {}
  }
  function loadSession() {
    try { return JSON.parse(localStorage.getItem('tmg-session') || 'null'); } catch (e) { return null; }
  }

  function loadDomains() {
    return api('/api/domains').then(function (r) {
      state.domains = r.body.domains || [];
      if (el.domainSel) {
        el.domainSel.innerHTML = state.domains.map(function (d) { return '<option value="' + d + '">@' + d + '</option>'; }).join('');
      }
    });
  }

  function generate(opts) {
    opts = opts || {};
    var payload = {};
    if (opts.domain) payload.domain = opts.domain;
    if (opts.username) payload.username = opts.username;
    return api('/api/generate', { method: 'POST', body: JSON.stringify(payload) }).then(function (r) {
      state.address = r.body.address;
      state.token = r.body.token;
      state.expiresAt = r.body.expiresAt;
      state.ttlMs = r.body.ttlMs || 3600000;
      state.messages = [];
      renderAddress();
      renderList();
      saveSession();
      poll();
    });
  }

  function renderAddress() {
    if (el.address) el.address.textContent = state.address || '—';
  }

  function timeLeft() {
    return Math.max(0, state.expiresAt - Date.now());
  }
  function fmt(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60); s = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function tick() {
    var left = timeLeft();
    if (el.timerVal) el.timerVal.textContent = fmt(left);
    if (el.timerFill) el.timerFill.style.width = Math.max(0, (left / state.ttlMs) * 100) + '%';
    if (left <= 0) {
      if (el.timerVal) el.timerVal.textContent = 'expired';
    }
  }

  function initials(from, name) {
    var base = (name || from || '?').replace(/[^a-zA-Z]/g, ' ').trim();
    if (!base) base = from || '?';
    var p = base.split(/\s+/);
    return ((p[0] ? p[0][0] : '') + (p[1] ? p[1][0] : '')).toUpperCase() || (from ? from[0].toUpperCase() : '?');
  }
  function ago(ts) {
    var d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60) return 'just now';
    if (d < 3600) return Math.floor(d / 60) + 'm ago';
    if (d < 86400) return Math.floor(d / 3600) + 'h ago';
    return Math.floor(d / 86400) + 'd ago';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  function renderList() {
    if (!el.list) return;
    if (el.count) el.count.textContent = state.messages.length + (state.messages.length === 1 ? ' message' : ' messages');
    if (!state.messages.length) {
      el.list.innerHTML =
        '<li class="inbox-empty"><div class="spinner" aria-hidden="true"></div>' +
        '<h3>Waiting for incoming emails…</h3>' +
        '<p>Your inbox is live. Send an email or OTP to your address above and it will appear here automatically.</p></li>';
      return;
    }
    el.list.innerHTML = state.messages.map(function (m) {
      return '<li class="mail-item" data-id="' + m.id + '" role="button" tabindex="0">' +
        '<div class="mail-avatar" aria-hidden="true">' + esc(initials(m.from, m.fromName)) + '</div>' +
        '<div class="mail-meta">' +
        '<div class="mail-from">' + esc(m.fromName || m.from) +
        '<span class="mail-time">' + ago(m.receivedAt) + '</span></div>' +
        '<div class="mail-subject">' + esc(m.subject) +
        (m.hasAttachments ? ' <span class="mail-badge">📎</span>' : '') +
        (m.otp ? ' <span class="otp-chip">' + esc(m.otp) + '</span>' : '') + '</div>' +
        '<div class="mail-snippet">' + esc(m.snippet) + '</div>' +
        '</div></li>';
    }).join('');
  }

  function poll() {
    if (!state.address) return;
    api('/api/inbox?address=' + encodeURIComponent(state.address)).then(function (r) {
      if (r.status === 404) {
        // mailbox expired -> auto-issue a fresh one
        toast('Inbox expired — generated a new address');
        generate();
        return;
      }
      var before = state.messages.length;
      state.messages = r.body.messages || [];
      state.expiresAt = r.body.expiresAt || state.expiresAt;
      renderList();
      if (state.messages.length > before) toast('📩 New email received');
    }).catch(function () {});
  }

  function openMessage(id) {
    api('/api/message?address=' + encodeURIComponent(state.address) + '&id=' + encodeURIComponent(id)).then(function (r) {
      if (!r.ok) return;
      showModal(r.body);
    });
  }

  function showModal(m) {
    var mb = $('#mailModal');
    if (!mb) return;
    $('#mSubject').textContent = m.subject || '(no subject)';
    $('#mSub').textContent = (m.fromName ? m.fromName + ' · ' : '') + m.from + ' → ' + m.to + ' · ' + new Date(m.receivedAt).toLocaleString();
    var htmlTab = $('#tabHtml'), textTab = $('#tabText');
    var htmlView = $('#viewHtml'), textView = $('#viewText'), attWrap = $('#viewAttach');

    // sandboxed iframe for HTML body
    if (m.html) {
      htmlTab.style.display = '';
      var frame = $('#htmlFrame');
      frame.setAttribute('sandbox', '');
      frame.srcdoc = m.html;
      switchTab('html');
    } else {
      htmlTab.style.display = 'none';
      switchTab('text');
    }
    $('#textBody').textContent = m.text || '(no plain-text version)';

    attWrap.innerHTML = '';
    if (m.attachments && m.attachments.length) {
      attWrap.innerHTML = '<h4 style="margin:14px 0 6px">Attachments</h4>' + m.attachments.map(function (a) {
        return '<div class="mail-attach">📎 <span>' + esc(a.filename) + '</span> <span style="color:var(--text-3);margin-left:auto">' + esc(a.contentType) + '</span></div>';
      }).join('');
    }
    mb.classList.add('open');
  }
  function switchTab(which) {
    $('#tabHtml').classList.toggle('active', which === 'html');
    $('#tabText').classList.toggle('active', which === 'text');
    $('#viewHtml').style.display = which === 'html' ? '' : 'none';
    $('#viewText').style.display = which === 'text' ? '' : 'none';
  }

  function copyAddress() {
    if (!state.address) return;
    (navigator.clipboard ? navigator.clipboard.writeText(state.address) : Promise.reject())
      .then(function () { toast('✅ Address copied to clipboard'); })
      .catch(function () {
        var ta = document.createElement('textarea'); ta.value = state.address; document.body.appendChild(ta);
        ta.select(); try { document.execCommand('copy'); toast('✅ Copied'); } catch (e) {} document.body.removeChild(ta);
      });
  }

  // Minimal dependency-free QR renderer via public chart endpoint fallback:
  // we draw a data string; if offline, we show the token so it can be saved.
  function showQr() {
    var data = location.origin + '/?restore=' + encodeURIComponent(state.address) + '&token=' + encodeURIComponent(state.token);
    var modal = $('#qrModal');
    $('#qrData').value = data;
    var box = $('#qrImg');
    box.innerHTML = '<img alt="QR code to restore your TempMailGo inbox" width="220" height="220" src="/api/qr?data=' + encodeURIComponent(data) + '">';
    modal.classList.add('open');
  }

  function bind() {
    if (el.copyBtn) el.copyBtn.addEventListener('click', copyAddress);
    if (el.newBtn) el.newBtn.addEventListener('click', function () { generate({ domain: el.domainSel ? el.domainSel.value : null }); toast('🔄 New address generated'); });
    if (el.createBtn) el.createBtn.addEventListener('click', function () {
      generate({ domain: el.domainSel ? el.domainSel.value : null, username: el.userInput ? el.userInput.value : null });
      toast('✨ Custom address created');
    });
    if (el.refresh) el.refresh.addEventListener('click', function () {
      el.refresh.classList.add('spin'); poll(); setTimeout(function () { el.refresh.classList.remove('spin'); }, 800);
    });
    if (el.extendBtn) el.extendBtn.addEventListener('click', function () {
      api('/api/extend', { method: 'POST', body: JSON.stringify({ address: state.address }) }).then(function (r) {
        if (r.ok) { state.expiresAt = r.body.expiresAt; toast('⏱️ Inbox extended'); }
      });
    });
    if (el.qrBtn) el.qrBtn.addEventListener('click', showQr);

    if (el.list) {
      el.list.addEventListener('click', function (e) { var it = e.target.closest('.mail-item'); if (it) openMessage(it.dataset.id); });
      el.list.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var it = e.target.closest('.mail-item'); if (it) openMessage(it.dataset.id); } });
    }

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-close-modal]')) { document.querySelectorAll('.modal-backdrop').forEach(function (m) { m.classList.remove('open'); }); }
      if (e.target.id === 'tabHtml') switchTab('html');
      if (e.target.id === 'tabText') switchTab('text');
      if (e.target.closest('#copyQr')) { $('#qrData').select(); try { document.execCommand('copy'); toast('🔗 Restore link copied'); } catch (e2) {} }
    });
  }

  function boot() {
    if (!el.address) return; // not on the app page
    bind();
    loadDomains().then(function () {
      var params = new URLSearchParams(location.search);
      if (params.get('restore') && params.get('token')) {
        return api('/api/restore', { method: 'POST', body: JSON.stringify({ address: params.get('restore'), token: params.get('token') }) })
          .then(function (r) {
            if (r.ok) { state.address = r.body.address; state.expiresAt = r.body.expiresAt; state.token = params.get('token'); renderAddress(); poll(); saveSession(); }
            else return generate();
          });
      }
      var sess = loadSession();
      if (sess && sess.address && sess.expiresAt > Date.now()) {
        state.address = sess.address; state.token = sess.token; state.expiresAt = sess.expiresAt;
        renderAddress(); poll();
        // sync select to the domain
        if (el.domainSel) { var d = sess.address.split('@')[1]; if (state.domains.indexOf(d) >= 0) el.domainSel.value = d; }
      } else {
        return generate();
      }
    });

    state.poll = setInterval(poll, 5000);      // live polling every 5s
    state.ticker = setInterval(tick, 1000);    // expiry countdown
    tick();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
