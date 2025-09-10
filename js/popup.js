class QBittorrentPopup {
  constructor() {
    this.settings = null;
    this.isConnected = false;
    this.refreshInterval = null;
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    
    if (this.hasValidSettings()) {
      this.showMainContent();
      await this.testConnection();
      this.startPeriodicRefresh();
    } else {
      this.showConfigPrompt();
    }
  }

  setupEventListeners() {
    // Navigation buttons
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings());
    document.getElementById('openSettingsBtn')?.addEventListener('click', () => this.openSettings());
    
    // Action buttons
    document.getElementById('openWebUIBtn')?.addEventListener('click', () => this.openWebUI());
    document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshData());
    document.getElementById('pauseAllBtn')?.addEventListener('click', () => this.pauseAllTorrents());
    document.getElementById('retryBtn')?.addEventListener('click', () => this.testConnection());
    
    // Footer links
    document.getElementById('aboutLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showAbout();
    });
    
    document.getElementById('helpLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showHelp();
    });
  }

  async loadSettings() {
    try {
      const result = await browser.storage.local.get(['qbittorrent_settings']);
      this.settings = result.qbittorrent_settings || {};
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showError('Failed to load settings');
    }
  }

  hasValidSettings() {
    return this.settings && 
           this.settings.hostname && 
           this.settings.port &&
           this.settings.username && 
           this.settings.password;
  }

  showConfigPrompt() {
    document.getElementById('configPrompt').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
  }

  showMainContent() {
    document.getElementById('configPrompt').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
  }

  async testConnection() {
    this.updateConnectionStatus('checking', 'Checking connection...');
    
    try {
      const response = await browser.runtime.sendMessage({
        action: 'testConnection',
        settings: this.settings
      });

      if (response && response.success) {
        this.isConnected = true;
        this.updateConnectionStatus('connected', 'Connected');
        this.updateServerInfo(response.data);
        this.showConnectedElements();
        await this.loadTorrentData();
      } else {
        this.isConnected = false;
        this.updateConnectionStatus('error', `Connection failed: ${response?.error || 'Unknown error'}`);
        this.hideConnectedElements();
      }
    } catch (error) {
      console.error('Connection test error:', error);
      this.isConnected = false;
      this.updateConnectionStatus('error', `Connection error: ${error.message}`);
      this.hideConnectedElements();
    }
  }

  updateConnectionStatus(status, message) {
    const statusElement = document.getElementById('connectionStatus');
    const indicator = statusElement?.querySelector('.status-indicator i');
    const text = statusElement?.querySelector('.status-text');
    
    if (!statusElement || !indicator || !text) return;

    // Reset classes
    statusElement.className = 'alert d-flex align-items-center mb-3 py-2 border-0';
    indicator.className = 'bi bi-circle-fill';
    
    switch (status) {
      case 'connected':
        statusElement.classList.add('alert-success');
        indicator.classList.add('text-success');
        text.textContent = message;
        break;
        
      case 'checking':
        statusElement.classList.add('alert-info');
        indicator.classList.add('text-info');
        text.textContent = message;
        break;
        
      case 'error':
        statusElement.classList.add('alert-danger');
        indicator.classList.add('text-danger');
        text.textContent = message;
        this.showError(message);
        break;
        
      default:
        statusElement.classList.add('alert-secondary');
        indicator.classList.add('text-secondary');
        text.textContent = message;
    }
  }

  updateServerInfo(data) {
    const serverInfo = document.getElementById('serverInfo');
    const serverUrl = document.getElementById('serverUrl');
    const serverVersion = document.getElementById('serverVersion');
    
    if (serverInfo && data) {
      const protocol = this.settings.useHttps ? 'https' : 'http';
      const url = `${protocol}://${this.settings.hostname}:${this.settings.port}`;
      
      if (serverUrl) serverUrl.textContent = `${this.settings.hostname}:${this.settings.port}`;
      if (serverVersion) serverVersion.textContent = data.server_version || 'Unknown';
      
      serverInfo.style.display = 'block';
    }
  }

  showConnectedElements() {
    document.getElementById('serverInfo').style.display = 'block';
    document.getElementById('quickActions').style.display = 'block';
    document.getElementById('torrentStats').style.display = 'block';
    document.getElementById('transferStats').style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
  }

  hideConnectedElements() {
    document.getElementById('serverInfo').style.display = 'none';
    document.getElementById('quickActions').style.display = 'none';
    document.getElementById('torrentStats').style.display = 'none';
    document.getElementById('transferStats').style.display = 'none';
  }

  async loadTorrentData() {
    if (!this.isConnected) return;

    try {
      // Get torrent list
      const torrentsResponse = await browser.runtime.sendMessage({
        action: 'makeRequest',
        settings: this.settings,
        endpoint: '/api/v2/torrents/info'
      });

      // Get transfer info
      const transferResponse = await browser.runtime.sendMessage({
        action: 'makeRequest',
        settings: this.settings,
        endpoint: '/api/v2/transfer/info'
      });

      if (torrentsResponse?.success && transferResponse?.success) {
        this.updateTorrentStats(torrentsResponse.data);
        this.updateTransferStats(transferResponse.data);
      }
    } catch (error) {
      console.error('Error loading torrent data:', error);
    }
  }

  updateTorrentStats(torrents) {
    if (!Array.isArray(torrents)) return;

    const stats = {
      downloading: torrents.filter(t => t.state === 'downloading').length,
      seeding: torrents.filter(t => t.state === 'uploading' || t.state === 'stalledUP').length,
      paused: torrents.filter(t => t.state.includes('paused')).length,
      total: torrents.length
    };

    document.getElementById('downloadingCount').textContent = stats.downloading;
    document.getElementById('seedingCount').textContent = stats.seeding;
    document.getElementById('pausedCount').textContent = stats.paused;
    document.getElementById('totalCount').textContent = stats.total;
  }

  updateTransferStats(transferInfo) {
    if (!transferInfo) return;

    const formatSpeed = (bytes) => {
      if (bytes === 0) return '0 B/s';
      const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
    };

    document.getElementById('downloadSpeed').textContent = formatSpeed(transferInfo.dl_info_speed || 0);
    document.getElementById('uploadSpeed').textContent = formatSpeed(transferInfo.up_info_speed || 0);
  }

  async refreshData() {
    const refreshBtn = document.getElementById('refreshBtn');
    const originalContent = refreshBtn?.innerHTML;
    
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i>';
    }

    await this.loadTorrentData();

    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = originalContent;
    }
  }

  async pauseAllTorrents() {
    if (!this.isConnected) return;

    const pauseBtn = document.getElementById('pauseAllBtn');
    const originalContent = pauseBtn?.innerHTML;
    
    try {
      if (pauseBtn) {
        pauseBtn.disabled = true;
        pauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i> Pausing...';
      }

      const response = await browser.runtime.sendMessage({
        action: 'makeRequest',
        settings: this.settings,
        endpoint: '/api/v2/torrents/pause',
        method: 'POST',
        data: { hashes: 'all' }
      });

      if (response?.success) {
        // Refresh data to show updated states
        setTimeout(() => this.loadTorrentData(), 1000);
      }
    } catch (error) {
      console.error('Error pausing torrents:', error);
    } finally {
      if (pauseBtn) {
        pauseBtn.disabled = false;
        pauseBtn.innerHTML = originalContent;
      }
    }
  }

  openSettings() {
    browser.runtime.openOptionsPage();
  }

  openWebUI() {
    if (!this.settings.hostname || !this.settings.port) return;
    
    const protocol = this.settings.useHttps ? 'https' : 'http';
    const url = `${protocol}://${this.settings.hostname}:${this.settings.port}`;
    browser.tabs.create({ url });
  }

  showError(message) {
    const errorElement = document.getElementById('errorMessage');
    const errorText = errorElement?.querySelector('.error-text');
    
    if (errorElement && errorText) {
      errorText.textContent = message;
      errorElement.style.display = 'block';
    }
  }

  showAbout() {
    const manifest = browser.runtime.getManifest();
    const message = `QBittorrent Remote Connection v${manifest.version}\n\nA Firefox extension for managing QBittorrent remotely.\n\nDeveloped for easy torrent management from your browser.`;
    alert(message);
  }

  showHelp() {
    const helpText = `QBittorrent Remote Connection Help:

1. Configure your QBittorrent server details in Settings
2. Ensure QBittorrent Web UI is enabled
3. Make sure the server is accessible from your network
4. For HTTPS-Only Mode issues, see the setup guide in Settings

Quick Actions:
• Open Web UI: Opens QBittorrent web interface
• Refresh: Updates torrent statistics
• Pause All: Pauses all active torrents

For more help, check the extension options page.`;
    alert(helpText);
  }

  startPeriodicRefresh() {
    // Refresh data every 30 seconds if connected
    this.refreshInterval = setInterval(() => {
      if (this.isConnected) {
        this.loadTorrentData();
      }
    }, 30000);
  }

  stopPeriodicRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}
// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new QBittorrentPopup();
});

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .alert {
    transition: all 0.3s ease;
  }
`;
document.head.appendChild(style);
