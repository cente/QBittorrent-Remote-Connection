// Options page JavaScript - no CSP violations, external event listeners only
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupEventListeners();
    startConnectionMonitoring();
});

function setupEventListeners() {
    document.getElementById('settingsForm').addEventListener('submit', handleFormSubmit);
}

function handleFormSubmit(event) {
    event.preventDefault();
    saveSettings();
}

async function loadSettings() {
    try {
        const result = await browser.storage.local.get(['qbittorrent_settings']);
        const settings = result.qbittorrent_settings || {};
        
        document.getElementById('hostname').value = settings.hostname || '';
        document.getElementById('port').value = settings.port || '';
        document.getElementById('username').value = settings.username || '';
        document.getElementById('password').value = settings.password || '';
        document.getElementById('useHttps').checked = settings.useHttps || false;
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings() {
    try {
        const settings = {
            hostname: document.getElementById('hostname').value.trim(),
            port: document.getElementById('port').value.trim(),
            username: document.getElementById('username').value.trim(),
            password: document.getElementById('password').value,
            useHttps: document.getElementById('useHttps').checked
        };

        // Validate required fields
        if (!settings.hostname || !settings.port) {
            showError('Hostname and port are required');
            return;
        }

        // Save to storage
        await browser.storage.local.set({ qbittorrent_settings: settings });
        
        // Test connection immediately
        await testConnection(settings);
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showError('Failed to save settings');
    }
}

async function testConnection(settings) {
    try {
        updateConnectionStatus('testing', 'Testing connection...');
        
        const response = await browser.runtime.sendMessage({
            action: 'testConnection',
            settings: settings
        });

        if (response && response.success) {
            updateConnectionStatus('success', `Connected to QBittorrent ${response.data.server_version || ''}`);
            showSuccess('Settings saved and connection verified!');
        } else {
            const error = response?.error || 'Connection failed';
            updateConnectionStatus('error', `Connection failed: ${error}`);
            showError(`Connection failed: ${error}`);
        }
    } catch (error) {
        console.error('Error testing connection:', error);
        updateConnectionStatus('error', `Connection error: ${error.message}`);
        showError(`Connection error: ${error.message}`);
    }
}

function updateConnectionStatus(type, message) {
    const statusElement = document.getElementById('connectionStatus');
    const statusClasses = {
        'testing': 'alert-warning',
        'success': 'alert-success', 
        'error': 'alert-danger',
        'checking': 'alert-secondary'
    };

    // Reset classes
    statusElement.className = 'alert mb-4';
    statusElement.classList.add(statusClasses[type] || 'alert-secondary');

    // Update content based on type
    if (type === 'testing' || type === 'checking') {
        statusElement.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span>${message}</span>
            </div>
        `;
    } else if (type === 'success') {
        statusElement.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-check-circle me-2"></i>
                <span>${message}</span>
            </div>
        `;
    } else if (type === 'error') {
        statusElement.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-x-circle me-2"></i>
                <span>${message}</span>
            </div>
        `;
    }
}

async function checkCurrentConnection() {
    try {
        const result = await browser.storage.local.get(['qbittorrent_settings']);
        const settings = result.qbittorrent_settings || {};
        
        if (!settings.hostname || !settings.port) {
            updateConnectionStatus('error', 'No connection configured');
            return;
        }

        updateConnectionStatus('checking', 'Checking connection...');
        
        const response = await browser.runtime.sendMessage({
            action: 'testConnection',
            settings: settings
        });

        if (response && response.success) {
            updateConnectionStatus('success', `Connected to QBittorrent ${response.data.server_version || ''}`);
        } else {
            updateConnectionStatus('error', `Connection failed: ${response?.error || 'Unknown error'}`);
        }
    } catch (error) {
        updateConnectionStatus('error', `Connection error: ${error.message}`);
    }
}

function startConnectionMonitoring() {
    // Check connection every 30 seconds
    setInterval(checkCurrentConnection, 30000);
    
    // Initial check
    checkCurrentConnection();
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const successElement = document.getElementById('successMessage');
    
    successElement.style.display = 'none';
    errorText.textContent = message;
    errorElement.style.display = 'block';
    
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    const successText = document.getElementById('successText');
    const errorElement = document.getElementById('errorMessage');
    
    errorElement.style.display = 'none';
    successText.textContent = message;
    successElement.style.display = 'block';
    
    setTimeout(() => {
        successElement.style.display = 'none';
    }, 3000);
}
