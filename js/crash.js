// ===== crash.js — Crash detection, countdown, WhatsApp alert =====

const COUNTDOWN_SECONDS = 10;
const TILT_ALERT_SECONDS = 10; // How long device must be tilted before alert fires

const crash = {
  deviceGPS: null,        // { lat, lng } from device
  alertActive: false,
  countdown: COUNTDOWN_SECONDS,
  countdownTimer: null,
  currentTiltSeconds: 0,

  setDeviceGPS(gps) {
    this.deviceGPS = gps;
    const dot = document.getElementById('gpsDot');
    const val = document.getElementById('gpsValue');
    const src = document.getElementById('gpsSource');
    dot.className = 'gps-dot active';
    val.textContent = `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`;
    src.textContent = 'From device GPS';
  },

  // Called whenever tilt data arrives from device
  onTiltData(data) {
    const angle = data.angle || 0;
    const tilted = data.tilted || false;
    const seconds = data.seconds || 0;

    this.currentTiltSeconds = seconds;

    // Update tilt UI
    const val = document.getElementById('tiltValue');
    const status = document.getElementById('tiltStatus');
    const bar = document.getElementById('tiltBar');

    val.textContent = `${angle.toFixed(1)}°`;
    status.textContent = tilted
      ? `Tilted ${seconds}s / ${TILT_ALERT_SECONDS}s`
      : 'Normal';

    const pct = Math.min((angle / 90) * 100, 100);
    bar.style.height = pct + '%';
    bar.style.background = angle > 45 ? 'var(--accent2)' : angle > 25 ? 'var(--accent)' : 'var(--green)';

    // If tilted long enough, trigger alert (device should send type:alert, but handle here too)
    if (tilted && seconds >= TILT_ALERT_SECONDS && !this.alertActive) {
      this.triggerAlert('device');
    }
  },

  triggerAlert(source) {
    if (this.alertActive) return;
    this.alertActive = true;
    this.countdown = COUNTDOWN_SECONDS;

    // Show status indicator
    const card = document.getElementById('statusCard');
    const indicator = document.getElementById('statusIndicator');
    card.className = 'status-card alert';
    indicator.className = 'status-indicator alert';
    document.getElementById('statusLabel').textContent = 'ALERT! Tilt Detected';
    document.getElementById('statusSub').textContent = `Sending in ${COUNTDOWN_SECONDS}s — tap Cancel to stop`;

    // Show countdown UI
    const countdownEl = document.getElementById('alertCountdown');
    countdownEl.classList.remove('hidden');
    this._updateCountdownUI(COUNTDOWN_SECONDS);

    // Start timer
    this.countdownTimer = setInterval(() => {
      this.countdown--;
      this._updateCountdownUI(this.countdown);
      document.getElementById('countdownSec').textContent = this.countdown;

      if (this.countdown <= 0) {
        clearInterval(this.countdownTimer);
        this._sendWhatsApp(source);
      }
    }, 1000);
  },

  _updateCountdownUI(secs) {
    const num = document.getElementById('countdownNum');
    const circle = document.getElementById('countdownCircle');
    if (!num || !circle) return;
    num.textContent = secs;
    const circumference = 213.6;
    const offset = circumference - (secs / COUNTDOWN_SECONDS) * circumference;
    circle.style.strokeDashoffset = offset;
    document.getElementById('countdownSec').textContent = secs;
  },

  cancelAlert() {
    if (!this.alertActive) return;
    clearInterval(this.countdownTimer);
    this.alertActive = false;
    this._hideCountdown();
    this._resetStatusCard();
    ui.showToast('Alert cancelled');
    logManager.add('Cancelled', this._getLocationString());
  },

  manualSOS() {
    if (this.alertActive) return;
    const loc = this._getLocationString();
    this._openWhatsApp(loc, true);
    logManager.add('SOS', loc);
    ui.showToast('SOS sent!', 'success');
  },

  async _sendWhatsApp(source) {
    this.alertActive = false;
    this._hideCountdown();
    this._resetStatusCard();

    const loc = await this._getBestLocation();
    this._openWhatsApp(loc, false);
    logManager.add('Accident', loc);
    ui.showToast('Alert sent via WhatsApp!', 'success');
  },

  // Get best location: device GPS first, then phone GPS
  async _getBestLocation() {
    // Try device GPS
    if (this.deviceGPS && this.deviceGPS.lat) {
      return this._mapsLink(this.deviceGPS.lat, this.deviceGPS.lng, 'Device GPS');
    }

    // Fallback: phone GPS
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve('Location unavailable');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(this._mapsLink(pos.coords.latitude, pos.coords.longitude, 'Phone GPS')),
        () => resolve('Location unavailable'),
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
  },

  _mapsLink(lat, lng, source) {
    return `https://maps.google.com/?q=${lat},${lng}`;
  },

  _getLocationString() {
    if (this.deviceGPS && this.deviceGPS.lat) {
      return `${this.deviceGPS.lat.toFixed(5)}, ${this.deviceGPS.lng.toFixed(5)}`;
    }
    return 'Location not available';
  },

  _openWhatsApp(locationUrl, isSOS) {
    const userName = localStorage.getItem('rg_user_name') || 'A RoadGuard user';
    const msgType = isSOS ? '🆘 MANUAL SOS' : '🚨 ACCIDENT DETECTED';
    const message = `${msgType}\n\n${userName} may need help!\n📍 Location: ${locationUrl}\n\n— RoadGuard Alert`;
    const encoded = encodeURIComponent(message);

    const contactPhone = localStorage.getItem('rg_contact_phone');
    const adminPhone = ADMIN_NUMBER;

    // Open WhatsApp for emergency contact
    if (contactPhone) {
      const num = contactPhone.replace(/\D/g, '');
      window.open(`https://wa.me/${num}?text=${encoded}`, '_blank');
    }

    // Small delay then open for admin
    setTimeout(() => {
      const adminNum = adminPhone.replace(/\D/g, '');
      window.open(`https://wa.me/${adminNum}?text=${encoded}`, '_blank');
    }, 1500);
  },

  _hideCountdown() {
    document.getElementById('alertCountdown').classList.add('hidden');
  },

  _resetStatusCard() {
    const isConnected = bluetooth.connected;
    const card = document.getElementById('statusCard');
    const indicator = document.getElementById('statusIndicator');
    card.className = 'status-card' + (isConnected ? ' connected' : '');
    indicator.className = 'status-indicator' + (isConnected ? ' connected' : '');
    document.getElementById('statusLabel').textContent = isConnected ? 'Connected' : 'Disconnected';
    document.getElementById('statusSub').textContent = isConnected
      ? (bluetooth.device?.name || 'RoadGuard Device')
      : (localStorage.getItem('rg_user_name') ? `Rider: ${localStorage.getItem('rg_user_name')}` : 'Tap to connect device');
  }
};