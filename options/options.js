class QBittorrentOptionsManager {
  constructor() {
    this.settings = {
      hostname: '',
      port: '',
      username: '',
      password: '',
      useHttps: false
    };
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    // Remove automatic connection status update - only do it when user tests
    // this.updateConnectionStatus();
  }

  setupEventListeners() {
    // Form elements (matching the HTML IDs)
    const hostnameInput = document.getElementById('serverUrl');
    const portInput = document.getElementById('port');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const httpsCheckbox = document.getElementById('useHttps');
    const saveBtn = document.getElementById('saveConfig');
    const testBtn = document.getElementById('testConnection');

    // Event listeners
    hostnameInput?.addEventListener('input', () => this.handleInputChange('hostname', hostnameInput.value));
    portInput?.addEventListener('input', () => this.handleInputChange('port', portInput.value));
    usernameInput?.addEventListener('input', () => this.handleInputChange('username', usernameInput.value));
    passwordInput?.addEventListener('input', () => this.handleInputChange('password', passwordInput.value));
    httpsCheckbox?.addEventListener('change', () => this.handleInputChange('useHttps', httpsCheckbox.checked));
    
    saveBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.saveSettings();
    });
    testBtn?.addEventListener('click', () => this.testConnection());

    // Auto-test connection when URL changes
    hostnameInput?.addEventListener('blur', () => this.updateConnectionStatus());
    portInput?.addEventListener('blur', () => this.updateConnectionStatus());
    httpsCheckbox?.addEventListener('change', () => this.updateConnectionStatus());
  }

  handleInputChange(key, value) {
    this.settings[key] = value;
    this.updateSaveButtonState();
  }

  updateSaveButtonState() {
    const saveBtn = document.getElementById('saveConfig');
    const hasChanges = this.hasUnsavedChanges();
    
    if (saveBtn) {
      saveBtn.disabled = !hasChanges;
      const btnText = saveBtn.querySelector('.btn-text');
      if (btnText) {
        btnText.innerHTML = hasChanges 
          ? '<i class="bi bi-floppy me-2"></i>Save Changes'
          : '<i class="bi bi-check-circle me-2"></i>Saved';
      }
    }
  }

  hasUnsavedChanges() {
    // Check if current form values differ from stored settings
    const hostnameInput = document.getElementById('serverUrl');
    const portInput = document.getElementById('port');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const httpsCheckbox = document.getElementById('useHttps');

    return (
      hostnameInput?.value !== this.settings.hostname ||
      portInput?.value !== this.settings.port ||
      usernameInput?.value !== this.settings.username ||
      passwordInput?.value !== this.settings.password ||
      httpsCheckbox?.checked !== this.settings.useHttps
    );
  }

  async loadSettings() {
    try {
      const result = await browser.storage.local.get(['qbittorrent_settings']);
      if (result.qbittorrent_settings) {
        this.settings = { ...this.settings, ...result.qbittorrent_settings };
      }
      this.populateForm();
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showMessage('Error loading settings', 'danger');
    }
  }

  populateForm() {
    const hostnameInput = document.getElementById('serverUrl');
    const portInput = document.getElementById('port');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const httpsCheckbox = document.getElementById('useHttps');

    if (hostnameInput) hostnameInput.value = this.settings.hostname || '';
    if (portInput) portInput.value = this.settings.port || '';
    if (usernameInput) usernameInput.value = this.settings.username || '';
    if (passwordInput) passwordInput.value = this.settings.password || '';
    if (httpsCheckbox) httpsCheckbox.checked = this.settings.useHttps || false;

    this.updateSaveButtonState();
  }

  async saveSettings() {
    const saveBtn = document.getElementById('saveConfig');
    const btnText = saveBtn?.querySelector('.btn-text');
    const spinner = saveBtn?.querySelector('.spinner-border');
    
    try {
      // Show saving state
      if (saveBtn) {
        saveBtn.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (spinner) spinner.style.display = 'inline-block';
      }

      await browser.storage.local.set({
        qbittorrent_settings: this.settings
      });

      // Show success state
      if (btnText) {
        btnText.innerHTML = '<i class="bi bi-check-circle-fill text-success me-2"></i>Saved Successfully!';
        btnText.style.display = 'inline';
      }
      if (spinner) spinner.style.display = 'none';

      this.showMessage('Settings saved successfully!', 'success');
      this.updateConnectionStatus();

      // Reset button after 2 seconds
      setTimeout(() => {
        this.updateSaveButtonState();
      }, 2000);

    } catch (error) {
      console.error('Error saving settings:', error);
      this.showMessage('Error saving settings', 'danger');
      
      // Reset button on error
      if (saveBtn) {
        saveBtn.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (spinner) spinner.style.display = 'none';
      }
    }
  }

  async testConnection() {
    const testBtn = document.getElementById('testConnection');
    const btnText = testBtn?.querySelector('.btn-text');
    const spinner = testBtn?.querySelector('.spinner-border');
    
    try {
      if (testBtn) {
        testBtn.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (spinner) spinner.style.display = 'inline-block';
      }

      const response = await browser.runtime.sendMessage({
        action: 'testConnection',
        settings: this.settings
      });

      if (response && response.success) {
        this.showMessage('Connection successful!', 'success');
        this.updateConnectionStatusCard('connected', response.data);
      } else {
        this.showMessage(`Connection failed: ${response?.error || 'Unknown error'}`, 'danger');
        this.updateConnectionStatusCard('error', null, response?.error);
      }

    } catch (error) {
      console.error('Error testing connection:', error);
      this.showMessage('Error testing connection', 'danger');
      this.updateConnectionStatusCard('error', null, error.message);
    } finally {
      if (testBtn) {
        testBtn.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (spinner) spinner.style.display = 'none';
      }
    }
  }

  async updateConnectionStatus() {
    if (!this.settings.hostname || !this.settings.port) {
      this.updateConnectionStatusCard('disconnected');
      return;
    }

    try {
      const response = await browser.runtime.sendMessage({
        action: 'testConnection',
        settings: this.settings
      });

      if (response && response.success) {
        this.updateConnectionStatusCard('connected', response.data);
      } else {
        this.updateConnectionStatusCard('error', null, response?.error);
      }
    } catch (error) {
      this.updateConnectionStatusCard('error', null, error.message);
    }
  }

  updateConnectionStatusCard(status, data = null, error = null) {
    const statusCard = document.getElementById('connectionStatusCard');
    
    if (!statusCard) {
      console.log('Connection status card not found');
      return;
    }

    const statusTitle = document.getElementById('connectionStatusTitle');
    const statusServerUrl = document.getElementById('statusServerUrl');
    const statusServerVersion = document.getElementById('statusServerVersion');
    const statusTorrentCount = document.getElementById('statusTorrentCount');
    const statusLastCheck = document.getElementById('statusLastCheck');
    const cardHeader = statusCard.querySelector('.card-header');

    // Reset classes
    statusCard.className = 'card bg-dark mb-4';
    
    switch (status) {
      case 'connected':
        statusCard.classList.add('border-success');
        if (cardHeader) cardHeader.className = 'card-header bg-success';
        if (statusTitle) statusTitle.innerHTML = '<i class="bi bi-check-circle me-2"></i>Connected to QBittorrent';
        
        if (data) {
          if (statusServerUrl) statusServerUrl.textContent = `${this.settings.hostname}:${this.settings.port}`;
          if (statusServerVersion) statusServerVersion.textContent = data.server_version || 'Unknown';
        }
        
        if (statusLastCheck) statusLastCheck.textContent = new Date().toLocaleTimeString();
        statusCard.style.display = 'block';
        break;

      case 'error':
        statusCard.classList.add('border-danger');
        if (cardHeader) cardHeader.className = 'card-header bg-danger';
        if (statusTitle) statusTitle.innerHTML = '<i class="bi bi-x-circle me-2"></i>Connection Failed';
        
        if (statusServerUrl) statusServerUrl.textContent = error || 'Check settings';
        if (statusServerVersion) statusServerVersion.textContent = '-';
        if (statusTorrentCount) statusTorrentCount.textContent = '-';
        if (statusLastCheck) statusLastCheck.textContent = new Date().toLocaleTimeString();
        statusCard.style.display = 'block';
        break;

      case 'disconnected':
      default:
        statusCard.style.display = 'none';
        break;
    }
  }

  showMessage(message, type = 'info') {
    const statusMessage = document.getElementById('statusMessage');
    const statusText = statusMessage?.querySelector('.status-text');
    
    if (statusMessage && statusText) {
      // Reset classes
      statusMessage.className = 'alert border-0';
      
      // Apply type-specific styling
      switch (type) {
        case 'success':
          statusMessage.classList.add('alert-success');
          break;
        case 'danger':
        case 'error':
          statusMessage.classList.add('alert-danger');
          break;
        case 'warning':
          statusMessage.classList.add('alert-warning');
          break;
        default:
          statusMessage.classList.add('alert-info');
      }
      
      statusText.textContent = message;
      statusMessage.style.display = 'block';
      
      // Hide after 5 seconds
      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, 5000);
    }
  }
}

// Add CSS for spinning animation
const style = document.createElement('style');
style.textContent = `
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new QBittorrentOptionsManager();
});
