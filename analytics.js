// 1. Configuration (Make sure this matches your Apps Script Web App URL)
const SCRIPT_URL = "https://google.com";

// 2. State Tracking
let userName = sessionStorage.getItem('blog_user_name');
let startTime = Date.now();
let videoClicks = 0;

// 3. Strict Prompt Loop
while (!userName || userName.trim() === "" || userName === "null") {
    userName = prompt("Please enter your name to read the blog:");
    if (userName) {
        userName = userName.trim();
    }
}
sessionStorage.setItem('blog_user_name', userName);

// 4. Track Video Clicks (Runs automatically if a video exists on the page)
document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById('blogVideo');
    if (video) {
        video.addEventListener('play', () => {
            videoClicks++;
        });
    }
});

// 5. Send Data to Google Sheets
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
