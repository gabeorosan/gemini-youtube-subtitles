// Options page functionality
class OptionsManager {
  constructor() {
    this.initializeOptions();
    this.bindEvents();
  }

  async initializeOptions() {
    try {
      // Load current settings
      const settings = await chrome.storage.sync.get([
        'defaultModel',
        'defaultLanguage', 
        'subtitleLength',
        'autoShow',
        'subtitlePosition'
      ]);

      // Set form values
      document.getElementById('default-model').value = settings.defaultModel || 'gemini-1.5-pro';
      document.getElementById('default-language').value = settings.defaultLanguage || '';
      document.getElementById('subtitle-length').value = settings.subtitleLength || 'medium';
      document.getElementById('auto-show').value = settings.autoShow !== false ? 'true' : 'false';
      document.getElementById('subtitle-position').value = settings.subtitlePosition || 'top-right';

      // Update hotkey display
      this.updateHotkeyDisplay();
      
    } catch (error) {
      console.error('Error loading options:', error);
      this.showStatus('Error loading settings', 'error');
    }
  }

  async updateHotkeyDisplay() {
    try {
      const commands = await chrome.commands.getAll();
      const generateCommand = commands.find(cmd => cmd.name === 'generate-subtitles');
      
      if (generateCommand && generateCommand.shortcut) {
        document.getElementById('hotkey-display').textContent = generateCommand.shortcut;
      } else {
        document.getElementById('hotkey-display').textContent = 'Not set - click button below to configure';
      }
    } catch (error) {
      console.error('Error getting commands:', error);
      document.getElementById('hotkey-display').textContent = 'Cmd+Shift+P (Mac) / Ctrl+Shift+P (Windows/Linux)';
    }
  }

  bindEvents() {
    // Save options
    document.getElementById('save-options').addEventListener('click', () => {
      this.saveOptions();
    });

    // Reset options
    document.getElementById('reset-options').addEventListener('click', () => {
      this.resetOptions();
    });

    // Open shortcuts settings
    document.getElementById('open-shortcuts').addEventListener('click', () => {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });

    // Auto-save on change
    const formElements = document.querySelectorAll('select');
    formElements.forEach(element => {
      element.addEventListener('change', () => {
        this.saveOptions(true); // Silent save
      });
    });
  }

  async saveOptions(silent = false) {
    try {
      const settings = {
        defaultModel: document.getElementById('default-model').value,
        defaultLanguage: document.getElementById('default-language').value,
        subtitleLength: document.getElementById('subtitle-length').value,
        autoShow: document.getElementById('auto-show').value === 'true',
        subtitlePosition: document.getElementById('subtitle-position').value
      };

      await chrome.storage.sync.set(settings);
      
      if (!silent) {
        this.showStatus('Settings saved successfully!', 'success');
      }
      
      console.log('Options saved:', settings);
      
    } catch (error) {
      console.error('Error saving options:', error);
      this.showStatus('Error saving settings', 'error');
    }
  }

  async resetOptions() {
    try {
      // Clear all settings
      await chrome.storage.sync.clear();
      
      // Reset form to defaults
      document.getElementById('default-model').value = 'gemini-1.5-pro';
      document.getElementById('default-language').value = '';
      document.getElementById('subtitle-length').value = 'medium';
      document.getElementById('auto-show').value = 'true';
      document.getElementById('subtitle-position').value = 'top-right';
      
      this.showStatus('Settings reset to defaults', 'success');
      
    } catch (error) {
      console.error('Error resetting options:', error);
      this.showStatus('Error resetting settings', 'error');
    }
  }

  showStatus(message, type) {
    const statusElement = document.getElementById('status-message');
    statusElement.textContent = message;
    statusElement.className = `status-message status-${type}`;
    statusElement.style.display = 'block';
    
    // Hide after 3 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 3000);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});

// Handle extension updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'optionsUpdated') {
    // Reload options if updated from popup
    window.location.reload();
  }
});