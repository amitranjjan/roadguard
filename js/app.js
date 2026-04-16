// ===== app.js — Entry point, app init =====

document.addEventListener('DOMContentLoaded', () => {
  // Show splash, then auto-navigate if profile exists
  const hasProfile = localStorage.getItem('rg_user_name');

  if (hasProfile) {
    // If returning user, go straight to home after brief splash
    setTimeout(() => navigate('home'), 1800);
  }
  // If new user, they tap "Get Started" manually

  // Refresh GPS display on load
  const gpsVal = document.getElementById('gpsValue');
  const gpsSrc = document.getElementById('gpsSource');
  if (gpsVal && gpsSrc) {
    // Try phone GPS on load just to show something
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          // Only show phone GPS if no device GPS yet
          if (!crash.deviceGPS) {
            gpsVal.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            gpsSrc.textContent = 'From phone GPS (no device yet)';
            document.getElementById('gpsDot').className = 'gps-dot active';
          }
        },
        () => {
          gpsVal.textContent = 'Permission denied';
          gpsSrc.textContent = 'Enable location access';
        }
      );
    }
  }
});

// Request location permission early
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(() => {}, () => {});
}