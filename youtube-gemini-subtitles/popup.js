document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const targetLanguageSelect = document.getElementById('targetLanguage');
  const modelSelect = document.getElementById('modelSelect');
  const modelInfo = document.getElementById('modelInfo');
  const generateBtn = document.getElementById('generateBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const status = document.getElementById('status');

  // Load saved settings
  const settings = await chrome.storage.sync.get(['apiKey', 'targetLanguage', 'selectedModel']);
  if (settings.apiKey) {
    apiKeyInput.value = settings.apiKey;
  }
  if (settings.targetLanguage) {
    targetLanguageSelect.value = settings.targetLanguage;
  }

  // Load models when API key is available
  async function loadModels() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      modelSelect.innerHTML = '<option value="">Enter API key first</option>';
      return;
    }

    try {
      modelSelect.innerHTML = '<option value="">Loading models...</option>';
      modelInfo.textContent = '';
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      const models = data.models || [];
      
      // Filter for text generation models
      const textModels = models.filter(model => 
        model.supportedGenerationMethods && 
        model.supportedGenerationMethods.includes('generateContent')
      );
      
      modelSelect.innerHTML = '';
      
      if (textModels.length === 0) {
        modelSelect.innerHTML = '<option value="">No compatible models found</option>';
        return;
      }
      
      textModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        option.textContent = model.displayName || model.name.split('/').pop();
        modelSelect.appendChild(option);
      });
      
      // Restore selected model
      if (settings.selectedModel) {
        modelSelect.value = settings.selectedModel;
      } else {
        // Default to first available model
        modelSelect.selectedIndex = 0;
      }
      
      updateModelInfo();
      
    } catch (error) {
      console.error('Error loading models:', error);
      modelSelect.innerHTML = '<option value="">Error loading models</option>';
      showStatus('Error loading models: ' + error.message, 'error');
    }
  }

  function updateModelInfo() {
    const selectedModel = modelSelect.value;
    if (selectedModel) {
      const modelName = selectedModel.split('/').pop();
      modelInfo.textContent = `Selected: ${modelName}`;
    } else {
      modelInfo.textContent = '';
    }
  }

  // Event listeners
  apiKeyInput.addEventListener('blur', loadModels);
  modelSelect.addEventListener('change', updateModelInfo);

  saveSettingsBtn.addEventListener('click', async () => {
    const settings = {
      apiKey: apiKeyInput.value.trim(),
      targetLanguage: targetLanguageSelect.value,
      selectedModel: modelSelect.value
    };
    
    await chrome.storage.sync.set(settings);
    showStatus('Settings saved successfully!', 'success');
  });

  generateBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const targetLanguage = targetLanguageSelect.value;
    const selectedModel = modelSelect.value;
    
    if (!apiKey) {
      showStatus('Please enter your Gemini API key', 'error');
      return;
    }
    
    if (!selectedModel) {
      showStatus('Please select a Gemini model', 'error');
      return;
    }
    
    // Save settings before generating
    await chrome.storage.sync.set({
      apiKey,
      targetLanguage,
      selectedModel
    });
    
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('youtube.com/watch')) {
        showStatus('Please navigate to a YouTube video first', 'error');
        return;
      }
      
      generateBtn.disabled = true;
      showStatus('Generating subtitles...', 'info');
      
      // Send message to content script
      await chrome.tabs.sendMessage(tab.id, {
        action: 'generateSubtitles',
        apiKey,
        targetLanguage,
        selectedModel
      });
      
      showStatus('Subtitle generation started!', 'success');
      
    } catch (error) {
      console.error('Error:', error);
      showStatus('Error: ' + error.message, 'error');
    } finally {
      generateBtn.disabled = false;
    }
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    if (type === 'success') {
      setTimeout(() => {
        status.style.display = 'none';
      }, 3000);
    }
  }

  // Load models on startup if API key is available
  if (settings.apiKey) {
    loadModels();
  }
});