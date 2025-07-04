// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
});

// Save settings when button is clicked
document.getElementById('saveSettings').addEventListener('click', function() {
    saveSettings();
});

// Load settings from storage
function loadSettings() {
    chrome.storage.sync.get(['stagingUrl', 'prodUrl'], function(result) {
        if (result.stagingUrl) {
            document.getElementById('stagingUrl').value = result.stagingUrl;
        }
        if (result.prodUrl) {
            document.getElementById('prodUrl').value = result.prodUrl;
        }
    });
}

// Save settings to storage
function saveSettings() {
    const stagingUrl = document.getElementById('stagingUrl').value.trim();
    const prodUrl = document.getElementById('prodUrl').value.trim();
    
    if (!stagingUrl || !prodUrl) {
        showStatus('Please fill in both URLs', 'error');
        return;
    }
    
    // Validate URLs
    if (!isValidUrl(stagingUrl) || !isValidUrl(prodUrl)) {
        showStatus('Please enter valid URLs', 'error');
        return;
    }
    
    // Save to storage
    chrome.storage.sync.set({
        stagingUrl: stagingUrl,
        prodUrl: prodUrl
    }, function() {
        showStatus('Settings saved successfully!', 'success');
        
        // Notify content script about updated settings
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'settingsUpdated',
                stagingUrl: stagingUrl,
                prodUrl: prodUrl
            });
        });
    });
}

// Validate URL format
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Show status message
function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(function() {
        statusDiv.style.display = 'none';
    }, 3000);
}
