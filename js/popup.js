// Simple popup script
document.addEventListener('DOMContentLoaded', function() {
    init();
});

async function init() {
    setupEventListeners();
    await checkConnection();
}

function setupEventListeners() {
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('openSettingsBtn').addEventListener('click', openSettings);
    document.getElementById('openWebUIBtn').addEventListener('click', openWebUI);
}

async function checkConnection() {
    try {
        const result = await browser.storage.local.get(['qbittorrent_settings']);
        const settings = result.qbittorrent_settings || {};
        
        if (!settings.hostname || !settings.port) {
            showConfigPrompt();
            return;
        }
        
        showMainContent();
        updateStatus('Checking connection...', 'info');
        
        const response = await browser.runtime.sendMessage({
            action: 'testConnection',
            settings: settings
        });
        
        if (response && response.success) {
            updateStatus('Connected', 'success');
            showServerInfo(settings, response.data);
            showActions();
        } else {
            showError(response?.error || 'Connection failed');
        }
    } catch (error) {
        console.error('Connection check failed:', error);
        showError(error.message);
    }
}

function showConfigPrompt() {
    document.getElementById('configPrompt').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
}

function showMainContent() {
    document.getElementById('configPrompt').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

function updateStatus(text, type) {
    const statusText = document.getElementById('statusText');
    const statusIcon = document.querySelector('#connectionStatus i');
    
    statusText.textContent = text;
    
    statusIcon.className = `bi me-1 ${
        type === 'success' ? 'bi-check-circle-fill text-success' :
        type === 'error' ? 'bi-x-circle-fill text-danger' :
        'bi-circle-fill text-secondary'
    }`;
}

function showServerInfo(settings, data) {
    document.getElementById('serverUrl').textContent = `${settings.hostname}:${settings.port}`;
    document.getElementById('serverVersion').textContent = data.server_version || 'Unknown';
    document.getElementById('serverInfo').style.display = 'block';
}

function showActions() {
    document.getElementById('actions').style.display = 'block';
}

function showError(message) {
    updateStatus('Connection failed', 'error');
    document.getElementById('errorText').textContent = message;
    document.getElementById('errorMsg').style.display = 'block';
}

function openSettings() {
    browser.runtime.openOptionsPage();
}

async function openWebUI() {
    try {
        const result = await browser.storage.local.get(['qbittorrent_settings']);
        const settings = result.qbittorrent_settings || {};
        
        if (settings.hostname && settings.port) {
            const protocol = settings.useHttps ? 'https' : 'http';
            const url = `${protocol}://${settings.hostname}:${settings.port}`;
            browser.tabs.create({ url });
        }
    } catch (error) {
        console.error('Error opening Web UI:', error);
    }
}
