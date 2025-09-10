// Popup JavaScript - minimal, no CSP violations
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('openOptionsBtn').addEventListener('click', openOptions);
}

function openOptions() {
    browser.runtime.openOptionsPage();
}
