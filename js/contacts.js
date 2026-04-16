// ===== contacts.js — Emergency contact save/load =====

const ADMIN_NUMBER = '+919835009229'; 

const contacts = {
  save() {
    const name = document.getElementById('contactName').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();

    if (!name) { ui.showToast('Enter contact name', 'error'); return; }
    if (!phone || !phone.startsWith('+')) {
      ui.showToast('Enter phone with country code e.g. +91...', 'error');
      return;
    }

    localStorage.setItem('rg_contact_name', name);
    localStorage.setItem('rg_contact_phone', phone);
    ui.showToast(`${name} saved!`, 'success');
    setTimeout(() => navigate('home'), 1000);
  },

  get() {
    return {
      name: localStorage.getItem('rg_contact_name') || null,
      phone: localStorage.getItem('rg_contact_phone') || null
    };
  }
};

const profile = {
  save() {
    const name = document.getElementById('profileName').value.trim();
    const phone = document.getElementById('profilePhone').value.trim();

    if (!name) { ui.showToast('Enter your name', 'error'); return; }

    localStorage.setItem('rg_user_name', name);
    localStorage.setItem('rg_user_phone', phone);
    ui.showToast('Profile saved!', 'success');
    setTimeout(() => navigate('home'), 1000);
  }
};