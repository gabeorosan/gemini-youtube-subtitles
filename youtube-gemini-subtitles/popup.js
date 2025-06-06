document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const translationLanguageInput = document.getElementById('translationLanguage');
  const modelSelect = document.getElementById('modelSelect');
  const modelInfo = document.getElementById('modelInfo');
  const generateBtn = document.getElementById('generateBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const status = document.getElementById('status');

  // Load saved settings
  const settings = await chrome.storage.sync.get(['apiKey', 'translationLanguage', 'selectedModel']);
  if (settings.apiKey) {
    apiKeyInput.value = settings.apiKey;
  }
  if (settings.translationLanguage) {
    translationLanguageInput.value = settings.translationLanguage;
  }

  // Load models when API key is available
  async function loadModels() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      // Set default model when no API key
      modelSelect.innerHTML = '<option value="gemini-2.0-flash">gemini-2.0-flash (default)</option>';
      modelSelect.value = 'gemini-2.0-flash';
      updateModelInfo();
      return;
    }

    try {
      modelSelect.innerHTML = '<option value="">Loading models...</option>';
      modelInfo.textContent = '';
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      
      if (!response.ok) {
        // If API call fails, fall back to default model
        const errorText = await response.text();
        console.warn(`API Error: ${response.status} - ${errorText}, using default model`);
        setDefaultModel();
        showStatus('API key invalid or quota exceeded, using default model', 'info');
        return;
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
        setDefaultModel();
        return;
      }
      
      // Add default model first
      const defaultOption = document.createElement('option');
      defaultOption.value = 'gemini-2.0-flash';
      defaultOption.textContent = 'gemini-2.0-flash (recommended)';
      modelSelect.appendChild(defaultOption);
      
      // Add other available models
      textModels.forEach(model => {
        // Skip if it's already the default model
        if (model.name.includes('gemini-2.0-flash')) return;
        
        const option = document.createElement('option');
        // Extract just the model name without the 'models/' prefix
        const modelName = model.name.replace('models/', '');
        option.value = modelName;
        option.textContent = model.displayName || modelName;
        modelSelect.appendChild(option);
      });
      
      // Restore selected model or use default
      if (settings.selectedModel && settings.selectedModel !== '') {
        modelSelect.value = settings.selectedModel;
      } else {
        modelSelect.value = 'gemini-2.0-flash';
      }
      
      updateModelInfo();
      
    } catch (error) {
      console.error('Error loading models:', error);
      setDefaultModel();
      showStatus('Using default model (API unavailable)', 'info');
    }
  }

  function setDefaultModel() {
    modelSelect.innerHTML = '<option value="gemini-2.0-flash">gemini-2.0-flash (default)</option>';
    modelSelect.value = 'gemini-2.0-flash';
    updateModelInfo();
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
      translationLanguage: translationLanguageInput.value.trim(),
      selectedModel: modelSelect.value
    };
    
    await chrome.storage.sync.set(settings);
    showStatus('Settings saved successfully!', 'success');
  });

  generateBtn.addEventListener('click', async () => {
    await generateSubtitles();
  });

  async function generateSubtitles() {
    const apiKey = apiKeyInput.value.trim();
    const translationLanguage = translationLanguageInput.value.trim();
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
      translationLanguage,
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
        translationLanguage,
        selectedModel
      });
      
      showStatus('Subtitle generation started!', 'success');
      
    } catch (error) {
      console.error('Error:', error);
      showStatus('Error: ' + error.message, 'error');
    } finally {
      generateBtn.disabled = false;
    }
  }

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

  // Load models on startup (will use default if no API key)
  loadModels();
});