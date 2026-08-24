// 1. Configuration (Make sure this matches your Apps Script Web App URL)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwa9-u4XTc3PVN2i90GYMU9R2Jc3V301rE5G-1joO0HLfSWzBmqxkIGs1NmkcflSRI3/exec";

// 2. State tracking
let userName = sessionStorage.getItem('blog_user_name');
let startTime = Date.now();
let videoClicks = 0;

// 3. Ask for a name via a styled modal instead of a blocking native prompt
function showNameGate() {
  const overlay = document.createElement('div');
  overlay.className = 'name-gate';
  overlay.innerHTML = `
    <div class="name-gate__card">
      <div class="name-gate__icon">🙏</div>
      <h2>Hare Krishna</h2>
      <p>Please share your name to enter the blog.</p>
      <form class="name-gate__form">
        <input type="text" name="visitorName" placeholder="Your name" autocomplete="name" required />
        <button type="submit">Enter</button>
      </form>
    </div>`;
  document.body.appendChild(overlay);

  const form = overlay.querySelector('form');
  const input = overlay.querySelector('input');
  requestAnimationFrame(() => input.focus());

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) {
      input.focus();
      return;
    }
    userName = value;
    sessionStorage.setItem('blog_user_name', userName);
    document.documentElement.classList.remove('gate-pending');
    overlay.classList.add('name-gate--closing');
    setTimeout(() => overlay.remove(), 250);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!userName || userName.trim() === '' || userName === 'null') {
    showNameGate();
  }

  // 4. Track video clicks (runs automatically if a video exists on the page)
  const video = document.getElementById('blogVideo');
  if (video) {
    video.addEventListener('play', () => {
      videoClicks++;
    });
  }
});

// 5. Send data to Google Sheets
function sendAnalytics() {
  let activeTimeSeconds = Math.round((Date.now() - startTime) / 1000);

  // Skip sending data if the user didn't actually spend at least 1 second
  if (activeTimeSeconds < 1) return;

  let payload = {
    name: userName,
    activeTime: activeTimeSeconds,
    videoClicks: videoClicks
  };

  if (navigator.sendBeacon) {
    navigator.sendBeacon(SCRIPT_URL, JSON.stringify(payload));
  } else {
    fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });
  }
}

// Send data when user leaves or closes the tab
window.addEventListener('beforeunload', sendAnalytics);
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') sendAnalytics();
});
