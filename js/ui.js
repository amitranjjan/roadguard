// ===== ui.js — UI helpers, navigation, toast =====

let currentScreen = 'splash';

function navigate(screenId) {
  const old = document.getElementById(currentScreen);
  const next = document.getElementById(screenId);
  if (!next) return;
  if (old) old.classList.remove('active');
  next.classList.add('active');
  currentScreen = screenId;

  // Run screen-specific init
  if (screenId === 'home') ui.refreshHome();
  if (screenId === 'profile') ui.loadProfile();
  if (screenId === 'contacts') ui.loadContacts();
  if (screenId === 'log') logManager.render();
}

const ui = {
  showToast(msg, type = '', duration = 2500) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast' + (type ? ' ' + type : '');
    t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, duration);
  },

  refreshHome() {
    // Restore saved profile name in status if available
    const name = localStorage.getItem('rg_user_name');
    if (name) {
      document.getElementById('statusSub').textContent = `Rider: ${name}`;
    }
  },

  loadProfile() {
    document.getElementById('profileName').value = localStorage.getItem('rg_user_name') || '';
    document.getElementById('profilePhone').value = localStorage.getItem('rg_user_phone') || '';
  },

  loadContacts() {
    document.getElementById('contactName').value = localStorage.getItem('rg_contact_name') || '';
    document.getElementById('contactPhone').value = localStorage.getItem('rg_contact_phone') || '';
  }
};

// ===== Log Manager =====
const logManager = {
  get() {
    try { return JSON.parse(localStorage.getItem('rg_log') || '[]'); } catch { return []; }
  },

  add(type, location) {
    const logs = this.get();
    logs.unshift({
      type,
      location,
      time: new Date().toLocaleString('en-IN', { hour12: true, hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
    });
    if (logs.length > 50) logs.pop();
    localStorage.setItem('rg_log', JSON.stringify(logs));
  },

  render() {
    const logs = this.get();
    const list = document.getElementById('logList');
    const empty = document.getElementById('logEmpty');
    list.innerHTML = '';

    if (logs.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    logs.forEach(log => {
      const el = document.createElement('div');
      el.className = `log-item ${log.type === 'SOS' ? 'sos' : ''}`;
      const typeClass = log.type === 'Accident' ? 'accident' : log.type === 'SOS' ? 'sos' : 'cancelled';
      el.innerHTML = `
        <div class="log-item-header">
          <span class="log-type ${typeClass}">${log.type}</span>
          <span class="log-time">${log.time}</span>
        </div>
        <div class="log-loc">${log.location || '—'}</div>
      `;
      list.appendChild(el);
    });
  },

  clear() {
    if (!confirm('Clear all alert logs?')) return;
    localStorage.removeItem('rg_log');
    this.render();
    ui.showToast('Log cleared');
  }
};