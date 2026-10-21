(function () {
  'use strict';

  // ==========================================================
  // 1. Battery
  // ==========================================================
  async function getBatteryInfo() {
    if (!('getBattery' in navigator)) {
      return { supported: false, level: null, charging: false };
    }
    try {
      const b = await navigator.getBattery();
      return {
        supported: true,
        level: Math.round(b.level * 100),
        charging: b.charging,
      };
    } catch {
      return { supported: false, level: null, charging: false };
    }
  }

  // ==========================================================
  // 2. Device info
  // ==========================================================
  function guessDeviceFromUA(ua) {
    if (/iPhone/i.test(ua)) return 'Apple iPhone';
    if (/iPad/i.test(ua))   return 'Apple iPad';
    if (/Android/i.test(ua)) {
      const m = ua.match(/Android[^;]*;\s*([^)]+?)(?:\s+Build|\))/i);
      if (m && m[1]) return 'Android (' + m[1].trim() + ')';
      return 'Android device';
    }
    if (/Windows/i.test(ua))   return 'Windows PC';
    if (/Macintosh/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua))     return 'Linux PC';
    return 'Unknown';
  }

  function getDeviceInfo() {
    let ua = null;
    if (typeof UAParser !== 'undefined') {
      try { ua = new UAParser().getResult(); } catch { /* ignore */ }
    }
    const rawUA   = navigator.userAgent;
    const browser = ua?.browser?.name
      ? `${ua.browser.name} ${ua.browser.version || ''}`.trim() : 'Unknown';
    const os      = ua?.os?.name
      ? `${ua.os.name} ${ua.os.version || ''}`.trim() : 'Unknown';
    const vendor  = ua?.device?.vendor || 'Unknown';
    const model   = ua?.device?.model  || 'Unknown';
    const type    = ua?.device?.type   || (/Mobile|Android|iPhone/i.test(rawUA) ? 'mobile' : 'desktop');
    const fallbackModel = (model === 'Unknown' && vendor === 'Unknown')
      ? guessDeviceFromUA(rawUA) : null;

    return {
      browser, os, vendor, model, type, fallbackModel, rawUA,
      screen: `${screen.width}×${screen.height} @ ${devicePixelRatio || 1}x`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
    };
  }

  // ==========================================================
  // 3. Send to backend
  // ==========================================================
  async function sendReport(info, battery) {
    const payload = {
      device_name: info.fallbackModel
        || `${info.vendor} ${info.model}`.trim() || 'Unknown',
      device_type: info.type,
      browser:     info.browser,
      os:          info.os,
      battery_level:    battery.supported ? battery.level : null,
      battery_charging: battery.supported ? battery.charging : false,
      screen:   info.screen,
      timezone: info.timezone,
      raw_user_agent: info.rawUA,
    };
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }

  // ==========================================================
  // 4. Consent
  // ==========================================================
  function askConsent() {
    return new Promise(resolve => {
      const stored = sessionStorage.getItem('recon-consent');
      if (stored === 'yes') return resolve(true);
      if (stored === 'no')  return resolve(false);

      const bar = document.getElementById('consent-bar');
      bar.classList.remove('hidden');

      document.getElementById('consent-accept').onclick = () => {
        sessionStorage.setItem('recon-consent', 'yes');
        bar.classList.add('hidden');
        resolve(true);
      };
      document.getElementById('consent-decline').onclick = () => {
        sessionStorage.setItem('recon-consent', 'no');
        bar.classList.add('hidden');
        resolve(false);
      };
    });
  }

  // ==========================================================
  // 5. Boot — silent collection (user only sees love animation)
  // ==========================================================
  window.addEventListener('load', async () => {
    const info = getDeviceInfo();
    const battery = await getBatteryInfo();

    const accepted = await askConsent();
    if (!accepted) return;

    // Send report in background — NO reveal overlay shown to user
    await sendReport(info, battery);
  });
})();