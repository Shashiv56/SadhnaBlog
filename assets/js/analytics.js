// 1. Configuration (Make sure this matches your Apps Script Web App URL)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwa9-u4XTc3PVN2i90GYMU9R2Jc3V301rE5G-1joO0HLfSWzBmqxkIGs1NmkcflSRI3/exec";

// 2. State tracking — only count time while the tab is actually visible,
// so a long idle/background stretch doesn't inflate "time spent" on refresh or close.
let userName = sessionStorage.getItem('blog_user_name');
let visibleSinceMs = document.visibilityState === 'visible' ? Date.now() : null;
let accumulatedActiveMs = 0;
let videoClicks = 0;

function captureVisibleSegment() {
  if (visibleSinceMs !== null) {
    accumulatedActiveMs += Date.now() - visibleSinceMs;
    visibleSinceMs = null;
  }
}

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

  // 4. Track video plays via the YouTube IFrame Player API.
  // A plain <iframe> never fires a 'play' event — that only exists on
  // native <video>/<audio> elements — so we have to talk to the embedded
  // YouTube player itself (enabled by ?enablejsapi=1 on its src).
  const video = document.getElementById('blogVideo');
  if (video) {
    const apiTag = document.createElement('script');
    apiTag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(apiTag);

    window.onYouTubeIframeAPIReady = () => {
      new YT.Player('blogVideo', {
        events: {
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              videoClicks++;
            }
          }
        }
      });
    };
  }
});

// 5. Send data to Google Sheets
let lastSentAtMs = null;

function sendAnalytics() {
  captureVisibleSegment();
  let activeTimeSeconds = Math.round(accumulatedActiveMs / 1000);

  // Skip sending data if the user didn't actually spend at least 1 second
  if (activeTimeSeconds < 1) return;

  // A refresh or tab close fires both 'visibilitychange' (hidden) and
  // 'beforeunload' back to back — without this guard that's two rows
  // in the sheet for one page-leave. A real, separate hide (minutes apart)
  // still gets its own row.
  const now = Date.now();
  if (lastSentAtMs !== null && now - lastSentAtMs < 1000) return;
  lastSentAtMs = now;

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

// Pause the clock when the tab is hidden, resume when it becomes visible again,
// and flush what's accumulated so far so a backgrounded tab reports accurately.
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    sendAnalytics();
  } else {
    visibleSinceMs = Date.now();
  }
});

// Send data when user leaves or closes the tab
window.addEventListener('beforeunload', sendAnalytics);
