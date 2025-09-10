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
    this.updateConnectionStatus();
  }

  setupEventListeners() {
    // Form elements
    const hostnameInput = document.getElementById('hostname');
    const portInput = document.getElementById('port');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const httpsCheckbox = document.getElementById('useHttps');
    const saveBtn = document.getElementById('saveBtn');
    const testBtn = document.getElementById('testBtn');
    const openWebUIBtn = document.getElementById('openWebUIBtn');

    // Event listeners
    hostnameInput?.addEventListener('input', () => this.handleInputChange('hostname', hostnameInput.value));
    portInput?.addEventListener('input', () => this.handleInputChange('port', portInput.value));
    usernameInput?.addEventListener('input', () => this.handleInputChange('username', usernameInput.value));
    passwordInput?.addEventListener('input', () => this.handleInputChange('password', passwordInput.value));
    httpsCheckbox?.addEventListener('change', () => this.handleInputChange('useHttps', httpsCheckbox.checked));
    
    saveBtn?.addEventListener('click', () => this.saveSettings());
    testBtn?.addEventListener('click', () => this.testConnection());
    openWebUIBtn?.addEventListener('click', () => this.openWebUI());

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
    const saveBtn = document.getElementById('saveBtn');
    const hasChanges = this.hasUnsavedChanges();
    
    if (saveBtn) {
      saveBtn.disabled = !hasChanges;
      saveBtn.innerHTML = hasChanges 
        ? '<i class="bi bi-floppy me-2"></i>Save Changes'
        : '<i class="bi bi-check-circle me-2"></i>Saved';
    }
  }

  hasUnsavedChanges() {
    // Check if current form values differ from stored settings
    const hostnameInput = document.getElementById('hostname');
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
    const hostnameInput = document.getElementById('hostname');
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
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn?.innerHTML;
    
    try {
      // Show saving state
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-arrow-repeat spin me-2"></i>Saving...';
      }

      await browser.storage.local.set({
        qbittorrent_settings: this.settings
      });

      // Show success state
      if (saveBtn) {
        saveBtn.innerHTML = '<i class="bi bi-check-circle-fill text-success me-2"></i>Saved Successfully!';
      }

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
        saveBtn.innerHTML = originalText;
      }
    }
  }

  async testConnection() {
    const testBtn = document.getElementById('testBtn');
    const originalText = testBtn?.innerHTML;
    
    try {
      if (testBtn) {
        testBtn.disabled = true;
        testBtn.innerHTML = '<i class="bi bi-arrow-repeat spin me-2"></i>Testing...';
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
        testBtn.innerHTML = originalText;
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
    const statusIcon = document.getElementById('connectionStatusIcon');
    const statusText = document.getElementById('connectionStatusText');
    const statusDetails = document.getElementById('connectionStatusDetails');
    const openWebUIBtn = document.getElementById('openWebUIBtn');

    if (!statusCard || !statusIcon || !statusText) return;

    // Reset classes
    statusCard.className = 'card mb-4';
    
    switch (status) {
      case 'connected':
        statusCard.classList.add('border-success');
        statusIcon.className = 'bi bi-check-circle-fill text-success';
        statusText.textContent = 'Connected Successfully';
        statusText.className = 'fw-bold text-success mb-2';
        
        if (data && statusDetails) {
          statusDetails.innerHTML = `
            <div class="row g-2">
              <div class="col-6">
                <small class="text-muted d-block">Server Version</small>
                <span class="badge bg-success">${data.server_version || 'Unknown'}</span>
              </div>
              <div class="col-6">
                <small class="text-muted d-block">API Version</small>
                <span class="badge bg-info">${data.api_version || 'Unknown'}</span>
              </div>
            </div>
          `;
          statusDetails.style.display = 'block';
        }
        
        if (openWebUIBtn) {
          openWebUIBtn.style.display = 'inline-block';
        }
        break;

      case 'error':
        statusCard.classList.add('border-danger');
        statusIcon.className = 'bi bi-x-circle-fill text-danger';
        statusText.textContent = 'Connection Failed';
        statusText.className = 'fw-bold text-danger mb-2';
        
        if (error && statusDetails) {
          statusDetails.innerHTML = `
            <div class="alert alert-danger py-2 mb-0">
              <small><i class="bi bi-exclamation-triangle me-1"></i>${error}</small>
            </div>
          `;
          statusDetails.style.display = 'block';
        }
        
        if (openWebUIBtn) {
          openWebUIBtn.style.display = 'none';
        }
        break;

      case 'disconnected':
      default:
        statusCard.classList.add('border-secondary');
        statusIcon.className = 'bi bi-circle text-secondary';
        statusText.textContent = 'Not Connected';
        statusText.className = 'fw-bold text-secondary mb-2';
        
        if (statusDetails) {
          statusDetails.innerHTML = '<small class="text-muted">Enter server details above to connect</small>';
          statusDetails.style.display = 'block';
        }
        
        if (openWebUIBtn) {
          openWebUIBtn.style.display = 'none';
        }
        break;
    }
  }

  openWebUI() {
    const protocol = this.settings.useHttps ? 'https' : 'http';
    const url = `${protocol}://${this.settings.hostname}:${this.settings.port}`;
    browser.tabs.create({ url });
  }

  showMessage(message, type = 'info') {
    // Create or update a toast message
    const toastContainer = document.getElementById('toastContainer') || this.createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast element after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });
  }

  createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '1050';
    document.body.appendChild(container);
    return container;
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
