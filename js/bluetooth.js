// ===== bluetooth.js — Web Bluetooth API for ESP32 =====
// ESP32 sends JSON strings over BLE UART (Nordic UART Service)

const BLE_SERVICE_UUID      = '6e400001-b5b3-f393-e0a9-e50e24dcca9e'; // Nordic UART Service
const BLE_CHAR_RX_UUID      = '6e400002-b5b3-f393-e0a9-e50e24dcca9e'; // Write (phone → device)
const BLE_CHAR_TX_UUID      = '6e400003-b5b3-f393-e0a9-e50e24dcca9e'; // Notify (device → phone)

const bluetooth = {
  device: null,
  server: null,
  txChar: null,
  rxChar: null,
  connected: false,

  async connect() {
    if (!navigator.bluetooth) {
      ui.showToast('Web Bluetooth not supported. Use Chrome on Android.', 'error');
      return;
    }

    try {
      ui.showToast('Scanning for RoadGuard device…');
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'RoadGuard' }],
        optionalServices: [BLE_SERVICE_UUID]
      });

      this.device.addEventListener('gattserverdisconnected', () => this._onDisconnect());

      this.server = await this.device.gatt.connect();
      const service = await this.server.getPrimaryService(BLE_SERVICE_UUID);
      this.txChar = await service.getCharacteristic(BLE_CHAR_TX_UUID);
      this.rxChar = await service.getCharacteristic(BLE_CHAR_RX_UUID);

      await this.txChar.startNotifications();
      this.txChar.addEventListener('characteristicvaluechanged', (e) => this._onData(e));

      this.connected = true;
      this._updateUI(true);
      ui.showToast('Connected to RoadGuard!', 'success');
    } catch (err) {
      console.error('BT connect error:', err);
      if (err.name !== 'NotFoundError') {
        ui.showToast('Connection failed. Try again.', 'error');
      }
    }
  },

  disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
  },

  _onDisconnect() {
    this.connected = false;
    this.device = null;
    this.server = null;
    this.txChar = null;
    this.rxChar = null;
    this._updateUI(false);
    ui.showToast('Device disconnected', 'error');
  },

  // Parse incoming JSON from ESP32
  // Expected format: {"type":"tilt","angle":72,"gps":{"lat":9.123,"lng":77.456},"tilted":true,"seconds":5}
  // Or: {"type":"gps","lat":9.123,"lng":77.456}
  // Or: {"type":"alert"}
  _onData(event) {
    const decoder = new TextDecoder('utf-8');
    const raw = decoder.decode(event.target.value);
    try {
      const data = JSON.parse(raw);
      this._handleMessage(data);
    } catch {
      console.warn('BT: non-JSON data:', raw);
    }
  },

  _handleMessage(data) {
    if (data.type === 'gps' || (data.gps && data.gps.lat)) {
      const gps = data.gps || { lat: data.lat, lng: data.lng };
      crash.setDeviceGPS(gps);
    }
    if (data.type === 'tilt') {
      crash.onTiltData(data);
    }
    if (data.type === 'alert') {
      crash.triggerAlert('device');
    }
  },

  _updateUI(isConnected) {
    const card = document.getElementById('statusCard');
    const indicator = document.getElementById('statusIndicator');
    const label = document.getElementById('statusLabel');
    const sub = document.getElementById('statusSub');
    const btn = document.getElementById('connectBtn');

    if (isConnected) {
      card.className = 'status-card connected';
      indicator.className = 'status-indicator connected';
      label.textContent = 'Connected';
      sub.textContent = this.device?.name || 'RoadGuard Device';
      btn.textContent = 'Disconnect';
      btn.onclick = () => bluetooth.disconnect();
    } else {
      card.className = 'status-card';
      indicator.className = 'status-indicator';
      label.textContent = 'Disconnected';
      const name = localStorage.getItem('rg_user_name');
      sub.textContent = name ? `Rider: ${name}` : 'Tap to connect device';
      btn.textContent = 'Connect';
      btn.onclick = () => bluetooth.connect();
    }
  }
};