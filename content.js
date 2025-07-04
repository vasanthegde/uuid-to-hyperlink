// Configuration
let stagingUrl = '';
let prodUrl = '';

// UUID regex pattern (standard UUID format)
const uuidRegex = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

// Set to keep track of processed UUIDs to avoid duplicates
const processedUUIDs = new Set();

// Load settings from storage
function loadSettings() {
    console.log('Loading settings...'); // Debug log
    chrome.storage.sync.get(['stagingUrl', 'prodUrl'], function(result) {
        stagingUrl = result.stagingUrl || '';
        prodUrl = result.prodUrl || '';
        
        console.log('Settings loaded:', { stagingUrl, prodUrl }); // Debug log
        
        // Initialize UUID processing if settings are available
        if (stagingUrl && prodUrl) {
            console.log('Initializing UUID processing...'); // Debug log
            initializeUUIDProcessing();
        } else {
            console.log('Settings not configured yet'); // Debug log
        }
    });
}

// Initialize UUID processing
function initializeUUIDProcessing() {
    // Process existing UUIDs
    processUUIDs();
    
    // Set up observers for dynamic content
    setupObservers();
}

// Main function to process UUIDs
function processUUIDs() {
    console.log('Processing UUIDs...'); // Debug log
    
    // Find all text nodes containing UUIDs
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                // Skip if parent is already a link or script/style
                if (node.parentNode.tagName === 'A' || 
                    node.parentNode.tagName === 'SCRIPT' || 
                    node.parentNode.tagName === 'STYLE' ||
                    node.parentNode.tagName === 'NOSCRIPT') {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // Skip if node is empty or just whitespace
                if (!node.textContent || !node.textContent.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // Check if text contains UUID
                const hasUUID = uuidRegex.test(node.textContent);
                uuidRegex.lastIndex = 0; // Reset regex
                
                if (hasUUID) {
                    console.log('Found UUID in text:', node.textContent); // Debug log
                    return NodeFilter.FILTER_ACCEPT;
                }
                
                return NodeFilter.FILTER_REJECT;
            }
        }
    );
    
    const textNodes = [];
    let node;
    
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    
    console.log('Found text nodes with UUIDs:', textNodes.length); // Debug log
    
    // Process each text node
    textNodes.forEach(processTextNode);
}

// Process individual text node
function processTextNode(textNode) {
    const text = textNode.textContent;
    
    // Check if text contains UUIDs
    if (!uuidRegex.test(text)) {
        return;
    }
    
    // Reset regex
    uuidRegex.lastIndex = 0;
    
    // Split text and rebuild with links
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = uuidRegex.exec(text)) !== null) {
        const uuid = match[0];
        const matchIndex = match.index;
        
        // Add text before UUID
        if (matchIndex > lastIndex) {
            parts.push({
                type: 'text',
                content: text.substring(lastIndex, matchIndex)
            });
        }
        
        // Add UUID as link
        parts.push({
            type: 'uuid',
            content: uuid
        });
        
        lastIndex = matchIndex + uuid.length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
        parts.push({
            type: 'text',
            content: text.substring(lastIndex)
        });
    }
    
    // Only proceed if we have multiple parts (meaning UUIDs were found)
    if (parts.length > 1) {
        // Create container span
        const container = document.createElement('span');
        
        parts.forEach(part => {
            if (part.type === 'text') {
                container.appendChild(document.createTextNode(part.content));
            } else if (part.type === 'uuid') {
                const link = createUUIDLink(part.content);
                container.appendChild(link);
                processedUUIDs.add(part.content);
            }
        });
        
        // Replace the text node
        textNode.parentNode.replaceChild(container, textNode);
    }
}

// Create clickable link for UUID
function createUUIDLink(uuid) {
    const link = document.createElement('a');
    link.textContent = uuid;
    link.href = '#';
    link.style.cssText = `
        color: #007bff;
        text-decoration: underline;
        cursor: pointer;
        background-color: #f8f9fa;
        padding: 2px 4px;
        border-radius: 3px;
        border: 1px solid #dee2e6;
    `;
    
    // Add click event listener
    link.addEventListener('click', function(e) {
        e.preventDefault();
        handleUUIDClick(uuid);
    });
    
    // Add hover effects
    link.addEventListener('mouseenter', function() {
        this.style.backgroundColor = '#e9ecef';
        this.style.borderColor = '#adb5bd';
    });
    
    link.addEventListener('mouseleave', function() {
        this.style.backgroundColor = '#f8f9fa';
        this.style.borderColor = '#dee2e6';
    });
    
    return link;
}

// Handle UUID click
function handleUUIDClick(uuid) {
    if (!stagingUrl || !prodUrl) {
        alert('Please configure the base URLs in the extension settings first.');
        return;
    }
    
    // Determine which URL to use based on current page
    const currentUrl = window.location.href;
    const baseUrl = isStaging(currentUrl) ? stagingUrl : prodUrl;
    
    // Ensure base URL ends with /
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    
    // Create full URL
    const fullUrl = normalizedBaseUrl + uuid;
    
    // Open in new tab
    window.open(fullUrl, '_blank');
}

// Check if current URL is staging
function isStaging(url) {
    const stagingKeywords = ['staging', 'stage', 'dev', 'development', 'test', 'qa'];
    const urlLower = url.toLowerCase();
    
    return stagingKeywords.some(keyword => urlLower.includes(keyword));
}

// Set up observers for dynamic content
function setupObservers() {
    // MutationObserver for DOM changes
    const observer = new MutationObserver(function(mutations) {
        let shouldProcess = false;
        
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the added node or its descendants contain UUIDs
                        const text = node.textContent || '';
                        if (uuidRegex.test(text)) {
                            shouldProcess = true;
                        }
                    }
                });
            }
        });
        
        if (shouldProcess) {
            // Delay processing to allow DOM to settle
            setTimeout(processUUIDs, 100);
        }
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Also observe for side panel scenarios
    observeSidePanels();
}

// Special handling for side panels
function observeSidePanels() {
    // Look for common side panel selectors
    const sidePanel = document.querySelector('[class*="side"], [class*="panel"], [class*="drawer"], [id*="side"], [id*="panel"]');
    
    if (sidePanel) {
        const sidePanelObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    // Check if side panel became visible
                    const isVisible = sidePanel.offsetParent !== null;
                    if (isVisible) {
                        setTimeout(processUUIDs, 200);
                    }
                }
            });
        });
        
        sidePanelObserver.observe(sidePanel, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }
    
    // Also listen for button clicks that might trigger side panels
    document.addEventListener('click', function(e) {
        // Check if clicked element might trigger a side panel
        const button = e.target.closest('button');
        if (button) {
            const buttonText = button.textContent.toLowerCase();
            const buttonClass = button.className.toLowerCase();
            
            if (buttonText.includes('detail') || buttonText.includes('info') || 
                buttonClass.includes('detail') || buttonClass.includes('info') ||
                buttonClass.includes('side') || buttonClass.includes('panel')) {
                
                // Wait for potential side panel to load
                setTimeout(processUUIDs, 500);
            }
        }
    });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'settingsUpdated') {
        stagingUrl = request.stagingUrl;
        prodUrl = request.prodUrl;
        
        // Clear processed UUIDs to reprocess with new settings
        processedUUIDs.clear();
        
        // Reprocess UUIDs with new settings
        processUUIDs();
        
        sendResponse({success: true});
    }
});

// Initialize when the script loads
console.log('UUID Link Converter extension loaded'); // Debug log
loadSettings();

// Also reprocess UUIDs when page fully loads
window.addEventListener('load', function() {
    console.log('Page loaded, checking settings...'); // Debug log
    if (stagingUrl && prodUrl) {
        console.log('Settings available, processing UUIDs...'); // Debug log
        setTimeout(processUUIDs, 1000);
    } else {
        console.log('Settings not available yet'); // Debug log
    }
});

// Process immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, processing UUIDs...'); // Debug log
        if (stagingUrl && prodUrl) {
            setTimeout(processUUIDs, 500);
        }
    });
} else {
    // DOM is already loaded
    console.log('DOM already loaded, processing UUIDs...'); // Debug log
    if (stagingUrl && prodUrl) {
        setTimeout(processUUIDs, 100);
    }
}
