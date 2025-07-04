// Diagnostic script - Add this to content.js temporarily to debug issues

// Run comprehensive diagnostics
function runDiagnostics() {
    console.log('=== UUID Extension Diagnostics ===');
    
    // Basic environment check
    console.log('1. Basic Environment:');
    console.log('   URL:', window.location.href);
    console.log('   Protocol:', window.location.protocol);
    console.log('   Domain:', window.location.hostname);
    console.log('   Is HTTPS:', window.location.protocol === 'https:');
    console.log('   Is iframe:', window !== window.top);
    console.log('   Document ready state:', document.readyState);
    
    // Check for CSP
    console.log('2. Security Policies:');
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const cspHeader = document.querySelector('meta[http-equiv="content-security-policy"]');
    console.log('   CSP Meta tag:', cspMeta?.content || 'None');
    console.log('   CSP Header:', cspHeader?.content || 'None');
    
    // Check for X-Frame-Options
    const xFrame = document.querySelector('meta[http-equiv="X-Frame-Options"]');
    console.log('   X-Frame-Options:', xFrame?.content || 'None');
    
    // Check document structure
    console.log('3. Document Structure:');
    console.log('   Document title:', document.title);
    console.log('   Body exists:', !!document.body);
    console.log('   Body children count:', document.body?.children.length || 0);
    console.log('   Document type:', document.doctype?.name || 'Unknown');
    
    // Check for common SPA frameworks
    console.log('4. Framework Detection:');
    console.log('   React:', !!(window.React || document.querySelector('[data-reactroot]')));
    console.log('   Angular:', !!(window.angular || window.ng || document.querySelector('[ng-app]')));
    console.log('   Vue:', !!(window.Vue || document.querySelector('[data-v-]')));
    console.log('   jQuery:', !!window.jQuery);
    
    // Check for shadow DOM
    console.log('5. Shadow DOM:');
    const shadowHosts = document.querySelectorAll('*');
    let shadowCount = 0;
    shadowHosts.forEach(el => {
        if (el.shadowRoot) shadowCount++;
    });
    console.log('   Shadow DOM elements:', shadowCount);
    
    // Check for extension APIs
    console.log('6. Extension APIs:');
    console.log('   Chrome runtime:', !!chrome.runtime);
    console.log('   Chrome storage:', !!chrome.storage);
    console.log('   Extension ID:', chrome.runtime?.id || 'Not available');
    
    // Check for content blocking
    console.log('7. Content Blocking:');
    console.log('   Ad blockers might block:', checkForAdBlockers());
    console.log('   Script blocking:', checkForScriptBlocking());
    
    // Test UUID detection
    console.log('8. UUID Detection Test:');
    const testUUID = '123e4567-e89b-12d3-a456-426614174000';
    const uuidRegex = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
    console.log('   Test UUID:', testUUID);
    console.log('   Regex matches:', uuidRegex.test(testUUID));
    
    // Check for existing UUIDs on page
    const pageText = document.body?.innerText || '';
    uuidRegex.lastIndex = 0;
    const foundUUIDs = pageText.match(uuidRegex);
    console.log('   UUIDs found on page:', foundUUIDs?.length || 0);
    if (foundUUIDs) {
        console.log('   Sample UUIDs:', foundUUIDs.slice(0, 3));
    }
    
    console.log('=== End Diagnostics ===');
}

function checkForAdBlockers() {
    // Simple ad blocker detection
    const testDiv = document.createElement('div');
    testDiv.innerHTML = '&nbsp;';
    testDiv.className = 'adsbox';
    document.body.appendChild(testDiv);
    const isBlocked = testDiv.offsetHeight === 0;
    document.body.removeChild(testDiv);
    return isBlocked;
}

function checkForScriptBlocking() {
    try {
        // Test if we can create and execute scripts
        const script = document.createElement('script');
        script.textContent = 'window.extensionScriptTest = true;';
        document.head.appendChild(script);
        document.head.removeChild(script);
        return !window.extensionScriptTest;
    } catch (e) {
        return true;
    }
}

// Run diagnostics immediately
runDiagnostics();

// Also run after page loads
window.addEventListener('load', () => {
    console.log('=== Post-load Diagnostics ===');
    runDiagnostics();
});

// Monitor for dynamic changes
let diagnosticsRun = false;
const diagnosticsObserver = new MutationObserver(() => {
    if (!diagnosticsRun && document.body && document.body.children.length > 0) {
        diagnosticsRun = true;
        console.log('=== Dynamic Content Diagnostics ===');
        runDiagnostics();
    }
});

if (document.body) {
    diagnosticsObserver.observe(document.body, { childList: true, subtree: true });
}
