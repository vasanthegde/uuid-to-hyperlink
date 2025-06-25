// UUID regex pattern (matches standard UUID format)
const UUID_REGEX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

// URLs - will be loaded from storage
let prodUrl = '';
let stagingUrl = '';
let urlsLoaded = false;

// Function to determine if current page is staging
function isCurrentPageStaging() {
  const currentUrl = window.location.href.toLowerCase();
  return currentUrl.includes('stg') || currentUrl.includes('staging');
}

// Function to get appropriate base URL
function getBaseUrl() {
  return isCurrentPageStaging() ? stagingUrl : prodUrl;
}

// Function to load URLs from storage
function loadUrlsFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['prodUrl', 'stagingUrl'], function(result) {
      prodUrl = result.prodUrl || 'https://example.com/item/';
      stagingUrl = result.stagingUrl || 'https://staging.example.com/item/';
      urlsLoaded = true;
      console.log('URLs loaded - Prod:', prodUrl, 'Staging:', stagingUrl);
      resolve();
    });
  });
}

// Function to convert UUIDs to hyperlinks
async function convertUuidsToLinks() {
  // Ensure URLs are loaded before processing
  if (!urlsLoaded) {
    await loadUrlsFromStorage();
  }

  // Get all text nodes in the document
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip if parent is already a link or script/style tag
        if (node.parentElement.tagName === 'A' || 
            node.parentElement.tagName === 'SCRIPT' || 
            node.parentElement.tagName === 'STYLE') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  let node;
  
  // Collect all text nodes
  while (node = walker.nextNode()) {
    if (UUID_REGEX.test(node.textContent)) {
      textNodes.push(node);
    }
  }

  // Process each text node
  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    const matches = text.match(UUID_REGEX);
    
    if (matches) {
      // Create a document fragment to hold the new content
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      
      matches.forEach(uuid => {
        const index = text.indexOf(uuid, lastIndex);
        
        // Add text before the UUID
        if (index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, index)));
        }
        
        // Create hyperlink for UUID
        const currentBaseUrl = getBaseUrl();
        const link = document.createElement('a');
        link.href = currentBaseUrl + uuid;
        link.textContent = uuid;
        link.target = '_blank';
        link.style.color = isCurrentPageStaging() ? '#ff6600' : '#0066cc';
        link.style.textDecoration = 'underline';
        link.title = `Click to open: ${currentBaseUrl}${uuid} (${isCurrentPageStaging() ? 'STAGING' : 'PROD'})`;
        
        // Add click event listener
        link.addEventListener('click', function(e) {
          e.preventDefault();
          window.open(currentBaseUrl + uuid, '_blank');
        });
        
        fragment.appendChild(link);
        lastIndex = index + uuid.length;
      });
      
      // Add remaining text after last UUID
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }
      
      // Replace the original text node with the fragment
      textNode.parentNode.replaceChild(fragment, textNode);
    }
  });
}

// Function to handle text selection and conversion
async function handleTextSelection() {
  // Ensure URLs are loaded
  if (!urlsLoaded) {
    await loadUrlsFromStorage();
  }

  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText && UUID_REGEX.test(selectedText)) {
    const matches = selectedText.match(UUID_REGEX);
    if (matches && matches.length === 1) {
      const uuid = matches[0];
      const currentBaseUrl = getBaseUrl();
      const url = currentBaseUrl + uuid;
      const environment = isCurrentPageStaging() ? 'STAGING' : 'PROD';
      
      // Show confirmation dialog
      if (confirm(`Open UUID in new tab (${environment})?\n${url}`)) {
        window.open(url, '_blank');
      }
    }
  }
}

// Initialize the extension
async function initialize() {
  // Load URLs first
  await loadUrlsFromStorage();
  
  // Convert existing UUIDs on page load
  await convertUuidsToLinks();
  
  // Add selection handler
  document.addEventListener('mouseup', handleTextSelection);
  
  // Watch for dynamically added content
  const observer = new MutationObserver(async function(mutations) {
    mutations.forEach(async function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added element contains UUIDs
            const walker = document.createTreeWalker(
              node,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );
            
            let textNode;
            while (textNode = walker.nextNode()) {
              if (UUID_REGEX.test(textNode.textContent)) {
                convertUuidsToLinks();
                break;
              }
            }
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Listen for URL updates from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'updateUrls') {
    prodUrl = request.prodUrl;
    stagingUrl = request.stagingUrl;
    urlsLoaded = true;
    console.log('URLs updated from popup - Prod:', prodUrl, 'Staging:', stagingUrl);
    sendResponse({success: true});
  }
});

// Start the extension when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
