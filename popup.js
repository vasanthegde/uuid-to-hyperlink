document.addEventListener('DOMContentLoaded', function() {
  const prodUrlInput = document.getElementById('prodUrl');
  const stagingUrlInput = document.getElementById('stagingUrl');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const status = document.getElementById('status');
  const currentEnvElement = document.getElementById('currentEnv');

  // Function to detect current environment
  function detectCurrentEnvironment() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentUrl = tabs[0].url.toLowerCase();
      const isStaging = currentUrl.includes('stg') || currentUrl.includes('staging');
      
      if (isStaging) {
        currentEnvElement.textContent = '🟠 Current page: STAGING';
        currentEnvElement.className = 'environment-info staging';
      } else {
        currentEnvElement.textContent = '🔵 Current page: PRODUCTION';
        currentEnvElement.className = 'environment-info prod';
      }
    });
  }

  // Load saved settings
  chrome.storage.sync.get(['prodUrl', 'stagingUrl'], function(result) {
    if (result.prodUrl) {
      prodUrlInput.value = result.prodUrl;
    } else {
      prodUrlInput.value = 'https://prod.example.com/item/';
    }
    
    if (result.stagingUrl) {
      stagingUrlInput.value = result.stagingUrl;
    } else {
      stagingUrlInput.value = 'https://staging.example.com/item/';
    }
  });

  // Detect environment on popup open
  detectCurrentEnvironment();

  // Save settings
  saveBtn.addEventListener('click', function() {
    const prodUrl = prodUrlInput.value.trim();
    const stagingUrl = stagingUrlInput.value.trim();
    
    if (!prodUrl || !stagingUrl) {
      showStatus('Please enter both production and staging URLs', 'error');
      return;
    }

    // Ensure URLs end with / or appropriate separator
    const finalProdUrl = prodUrl.endsWith('/') ? prodUrl : prodUrl + '/';
    const finalStagingUrl = stagingUrl.endsWith('/') ? stagingUrl : stagingUrl + '/';

    chrome.storage.sync.set({
      prodUrl: finalProdUrl,
      stagingUrl: finalStagingUrl
    }, function() {
      showStatus('Settings saved successfully!', 'success');
      
      // Update content script
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateUrls',
          prodUrl: finalProdUrl,
          stagingUrl: finalStagingUrl
        });
      });
    });
  });

  // Test on current page
  testBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.reload(tabs[0].id);
      showStatus('Page reloaded. UUIDs should now be clickable with environment detection!', 'success');
      setTimeout(() => {
        window.close();
      }, 2000);
    });
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    setTimeout(() => {
      status.textContent = '';
      status.className = 'status';
    }, 4000);
  }
});
