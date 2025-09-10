// Options page functionality
class OptionsManager {
  constructor() {
    this.form = document.getElementById('configForm');
    this.testButton = document.getElementById('testConnection');
    this.saveButton = document.getElementById('saveConfig');
    this.statusMessage = document.getElementById('statusMessage');
    
    this.init();
  }

  async init() {
    await this.loadConfig();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.form.addEventListener('submit', (e) => this.handleSave(e));
    this.testButton.addEventListener('click', () => this.handleTestConnection());
    
    // Auto-save on input change
    this.form.addEventListener('input', () => {
      this.clearStatus();
    });
  }

  async loadConfig() {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'getConfig'
      });

      if (response.success && response.data) {
        this.populateForm(response.data);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      this.showStatus('Failed to load configuration', 'error');
    }
  }

  populateForm(config) {
    document.getElementById('serverUrl').value = config.serverUrl || '';
    document.getElementById('port').value = config.port || '8080';
    document.getElementById('username').value = config.username || '';
    document.getElementById('password').value = config.password || '';
    document.getElementById('useHttps').checked = config.useHttps || false;
    document.getElementById('autoLogin').checked = config.autoLogin || false;
  }

  getFormData() {
    return {
      serverUrl: document.getElementById('serverUrl').value.trim(),
      port: document.getElementById('port').value.trim(),
      username: document.getElementById('username').value.trim(),
      password: document.getElementById('password').value,
      useHttps: document.getElementById('useHttps').checked,
      autoLogin: document.getElementById('autoLogin').checked
    };
  }

  async handleSave(e) {
    e.preventDefault();
    
    const config = this.getFormData();
    
    // Validate required fields
    if (!config.serverUrl || !config.port) {
      this.showStatus('Please fill in server URL and port', 'error');
      return;
    }

    try {
      this.setButtonLoading(this.saveButton, true);
      
      const response = await browser.runtime.sendMessage({
        action: 'saveConfig',
        data: config
      });

      if (response.success) {
        this.showStatus('Configuration saved successfully!', 'success');
      } else {
        this.showStatus('Failed to save configuration', 'error');
      }
    } catch (error) {
      console.error('Save error:', error);
      this.showStatus('Failed to save configuration', 'error');
    } finally {
      this.setButtonLoading(this.saveButton, false);
    }
  }

  async handleTestConnection() {
    const config = this.getFormData();
    
    // Validate required fields for testing
    if (!config.serverUrl || !config.port) {
      this.showStatus('Please fill in server URL and port before testing', 'error');
      return;
    }

    try {
      this.setButtonLoading(this.testButton, true);
      this.showStatus('Testing connection...', 'info');
      
      const response = await browser.runtime.sendMessage({
        action: 'testConnection',
        data: config
      });

      if (response.success && response.data.connected) {
        this.showStatus(
          `Connection successful! QBittorrent version: ${response.data.version}`,
          'success'
        );
      } else {
        this.showStatus(
          `Connection failed: ${response.data.error}`,
          'error'
        );
      }
    } catch (error) {
      console.error('Test connection error:', error);
      this.showStatus('Connection test failed', 'error');
    } finally {
      this.setButtonLoading(this.testButton, false);
    }
  }

  setButtonLoading(button, loading) {
    const text = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner-border');
    
    if (loading) {
      button.disabled = true;
      if (text) text.style.display = 'none';
      if (spinner) spinner.style.display = 'inline-block';
    } else {
      button.disabled = false;
      if (text) text.style.display = 'inline';
      if (spinner) spinner.style.display = 'none';
    }
  }

  showStatus(message, type) {
    const statusText = this.statusMessage.querySelector('.status-text');
    statusText.textContent = message;
    
    // Remove existing Bootstrap alert classes
    this.statusMessage.classList.remove('alert-success', 'alert-danger', 'alert-info');
    
    // Add appropriate Bootstrap alert class
    if (type === 'success') {
      this.statusMessage.classList.add('alert-success');
    } else if (type === 'error') {
      this.statusMessage.classList.add('alert-danger');
    } else if (type === 'info') {
      this.statusMessage.classList.add('alert-info');
    }
    
    this.statusMessage.style.display = 'block';
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        this.clearStatus();
      }, 3000);
    }
  }

  clearStatus() {
    this.statusMessage.style.display = 'none';
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});
