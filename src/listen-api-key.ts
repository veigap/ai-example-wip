import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Listen for API key from parent window (when embedded in Mintlify)
 * This allows the API key to persist across page reloads using localStorage
 * 
 * In StackBlitz WebContainers, we can access window and use file system operations
 */
export function setupApiKeyListener() {
  console.log('[listen-api-key] ========================================');
  console.log('[listen-api-key] 🚀 SETTING UP API KEY LISTENER');
  console.log('[listen-api-key] ========================================');
  console.log('[listen-api-key] ⏰ Timestamp:', new Date().toISOString());
  console.log('[listen-api-key] 🔑 Setting up API key listener from parent window...');
  
  // Check if we're in a browser-like environment (StackBlitz WebContainer)
  console.log('[listen-api-key] 🔍 Checking environment...');
  console.log('[listen-api-key] 🔍 typeof globalThis:', typeof globalThis);
  console.log('[listen-api-key] 🔍 typeof window:', typeof window);
  
  // Try different ways to access window object in StackBlitz WebContainers
  let windowObj = null;
  console.log('[listen-api-key] 🔍 Attempting to access window object...');
  
  if (typeof window !== 'undefined') {
    windowObj = window;
    console.log('[listen-api-key] ✅ Found window via typeof window');
  } else {
    const global = globalThis as any;
    if (global.window) {
      windowObj = global.window;
      console.log('[listen-api-key] ✅ Found window via globalThis.window');
    } else if (global.self && global.self.window) {
      windowObj = global.self.window;
      console.log('[listen-api-key] ✅ Found window via globalThis.self.window');
    } else {
      console.log('[listen-api-key] ⚠️  Could not find window object');
    }
  }
  
  console.log('[listen-api-key] 🔍 windowObj:', windowObj ? 'Available' : 'Not available');
  
  if (windowObj && windowObj.addEventListener) {
    console.log('[listen-api-key] ✅ window.addEventListener is available');
    console.log('[listen-api-key] 🔍 windowObj.addEventListener type:', typeof windowObj.addEventListener);

      windowObj.addEventListener('message', async (event: MessageEvent) => {
        console.log('[listen-api-key] ========================================');
        console.log('[listen-api-key] 📨 MESSAGE RECEIVED IN STACKBLITZ');
        console.log('[listen-api-key] ========================================');
        console.log(`[listen-api-key] ⏰ Timestamp: ${new Date().toISOString()}`);
        console.log(`[listen-api-key] 📨 Origin: ${event.origin}`);
        console.log(`[listen-api-key] 📨 Source:`, event.source);
        console.log(`[listen-api-key] 📨 Message type: ${event.data?.type || 'unknown'}`);
        console.log(`[listen-api-key] 📨 Full message data:`, JSON.stringify(event.data, null, 2));
        console.log(`[listen-api-key] 📨 Event object keys:`, Object.keys(event));
        
        // Handle ping requests from parent (parent checking if we need the key)
        if (event.data?.type === 'PING' && event.data.requestKey) {
          console.log('[listen-api-key] 📥 Received PING from parent');
          console.log('[listen-api-key] 🔍 PING data:', event.data);
          
          // Check if we have a key in .env file that parent might not know about
          console.log('[listen-api-key] 🔍 Checking .env file for existing API key...');
          const envPath = join(process.cwd(), 'env', '.env');
          console.log('[listen-api-key] 🔍 Env path:', envPath);
          console.log('[listen-api-key] 🔍 File exists:', existsSync(envPath));
          
          if (existsSync(envPath)) {
            try {
              console.log('[listen-api-key] 📖 Reading .env file...');
              const envContent = readFileSync(envPath, 'utf-8');
              console.log('[listen-api-key] 📖 File content length:', envContent.length);
              console.log('[listen-api-key] 📖 File content preview:', envContent.substring(0, 50) + '...');
              
              const match = envContent.match(/OPENAI_API_KEY=(.+)/);
              console.log('[listen-api-key] 🔍 Regex match result:', match ? 'Found' : 'Not found');
              
              if (match && match[1]) {
                const apiKey = match[1].trim();
                console.log(`[listen-api-key] ✅ Found API key in .env (length: ${apiKey.length} chars)`);
                console.log(`[listen-api-key] ✅ Key preview: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`);
                console.log('[listen-api-key] 🔍 Checking for parent window...');
                console.log('[listen-api-key] 🔍 win.window.parent:', win.window.parent ? 'Available' : 'Not available');
                console.log('[listen-api-key] 🔍 win.window.parent !== win.window:', win.window.parent !== win.window);
                
                if (windowObj.parent && windowObj.parent !== windowObj) {
                  console.log('[listen-api-key] 📤 Sending API key from .env to parent...');
                  try {
                    const message = {
                      type: 'SAVE_API_KEY',
                      key: 'openai_api_key',
                      value: apiKey
                    };
                    console.log('[listen-api-key] 📨 Message payload:', {
                      type: message.type,
                      key: message.key,
                      valueLength: message.value.length
                    });
                    
                    windowObj.parent.postMessage(message, '*');
                    console.log('[listen-api-key] ✅ Sent API key to parent for localStorage storage');
                    console.log('[listen-api-key] ✅ postMessage sent to origin: * (any origin)');
                  } catch (postError: any) {
                    console.error('[listen-api-key] ❌ ERROR sending postMessage:', postError);
                    console.error('[listen-api-key] ❌ Error name:', postError?.name);
                    console.error('[listen-api-key] ❌ Error message:', postError?.message);
                  }
                } else {
                  console.log('[listen-api-key] ⚠️  No parent window available to send key to');
                }
                return; // Don't request, we're sending it
              } else {
                console.log('[listen-api-key] ℹ️  No API key found in .env file content');
              }
            } catch (error: any) {
              console.error('[listen-api-key] ❌ ERROR reading .env file:', error);
              console.error('[listen-api-key] ❌ Error name:', error?.name);
              console.error('[listen-api-key] ❌ Error message:', error?.message);
              // Continue to request
            }
          } else {
            console.log('[listen-api-key] ℹ️  .env file does not exist');
          }
          
          // Request the API key from parent if we don't have one
          console.log('[listen-api-key] 📤 Requesting API key from parent...');
          if (windowObj.parent && windowObj.parent !== windowObj) {
            try {
              windowObj.parent.postMessage({
                type: 'REQUEST_API_KEY'
              }, '*');
              console.log('[listen-api-key] 📤 Sent REQUEST_API_KEY to parent');
            } catch (error: any) {
              console.log(`[listen-api-key] ⚠️  Failed to request key: ${error.message}`);
            }
          }
          return;
        }
        
        // Accept messages from any origin when embedded (you can restrict this in production)
        console.log('[listen-api-key] 🔍 Checking if message is SET_ENV_VAR...');
        console.log('[listen-api-key] 🔍 event.data?.type:', event.data?.type);
        console.log('[listen-api-key] 🔍 event.data?.key:', event.data?.key);
        console.log('[listen-api-key] 🔍 Is SET_ENV_VAR:', event.data?.type === 'SET_ENV_VAR');
        console.log('[listen-api-key] 🔍 Is OPENAI_API_KEY:', event.data?.key === 'OPENAI_API_KEY');
        
        if (event.data?.type === 'SET_ENV_VAR' && event.data.key === 'OPENAI_API_KEY') {
          const apiKey = event.data.value;
          console.log('[listen-api-key] ✅ Message is SET_ENV_VAR for OPENAI_API_KEY');
          console.log(`[listen-api-key] 📥 Received API key from parent window`);
          console.log(`[listen-api-key] 📥 Key value: ${apiKey ? `Present (${apiKey.length} chars)` : 'Missing'}`);
          
          if (!apiKey || apiKey.trim().length === 0) {
            console.warn('[listen-api-key] ⚠️  Received empty API key');
            console.warn('[listen-api-key] ⚠️  apiKey value:', apiKey);
            return;
          }

          console.log(`[listen-api-key] 📥 Received API key from parent window (length: ${apiKey.length} chars)`);
          console.log(`[listen-api-key] 📥 Key preview: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`);
          console.log(`[listen-api-key] 📥 Key starts with: ${apiKey.substring(0, 3)}`);

          try {
            console.log('[listen-api-key] 💾 Attempting to save API key to file system...');
            // Write to env/.env file (same location as setup-env.ts)
            const envDir = join(process.cwd(), 'env');
            const envPath = join(envDir, '.env');
            console.log('[listen-api-key] 📁 Env directory:', envDir);
            console.log('[listen-api-key] 📁 Env file path:', envPath);
            console.log('[listen-api-key] 📁 Current working directory:', process.cwd());

            // Create env directory if it doesn't exist
            console.log('[listen-api-key] 🔍 Checking if env directory exists...');
            const envDirExists = existsSync(envDir);
            console.log('[listen-api-key] 🔍 Env directory exists:', envDirExists);
            
            if (!envDirExists) {
              console.log('[listen-api-key] 📁 Creating env directory...');
              mkdirSync(envDir, { recursive: true });
              console.log('[listen-api-key] ✅ Env directory created');
            }

            // Write the API key to .env file
            const envContent = `OPENAI_API_KEY=${apiKey.trim()}\n`;
            console.log('[listen-api-key] 📝 Writing to .env file...');
            console.log('[listen-api-key] 📝 Content length:', envContent.length);
            console.log('[listen-api-key] 📝 Content preview:', envContent.substring(0, 20) + '...');
            
            writeFileSync(envPath, envContent, { flag: 'w' });
            console.log('[listen-api-key] ✅ writeFileSync completed');

            // Verify the write
            console.log('[listen-api-key] 🔍 Verifying file write...');
            const verifyContent = readFileSync(envPath, 'utf-8');
            console.log('[listen-api-key] 🔍 Verification read length:', verifyContent.length);
            console.log('[listen-api-key] 🔍 Verification matches:', verifyContent === envContent);
            
            console.log('[listen-api-key] ✅ API key saved to env/.env file');
            console.log('[listen-api-key] 💡 Reload your code (Ctrl+C and run again) to use the new API key');
            
            // Also send confirmation back to parent so it knows we received it
            // This helps ensure parent has it in localStorage
            console.log('[listen-api-key] 📤 Sending confirmation back to parent...');
            console.log('[listen-api-key] 🔍 windowObj.parent:', windowObj.parent ? 'Available' : 'Not available');
            console.log('[listen-api-key] 🔍 windowObj.parent !== windowObj:', windowObj.parent !== windowObj);
            
            if (windowObj.parent && windowObj.parent !== windowObj) {
              try {
                console.log('[listen-api-key] 📤 Sending SAVE_API_KEY confirmation to parent...');
                const confirmMessage = {
                  type: 'SAVE_API_KEY',
                  key: 'openai_api_key',
                  value: apiKey
                };
                console.log('[listen-api-key] 📨 Confirmation message:', {
                  type: confirmMessage.type,
                  key: confirmMessage.key,
                  valueLength: confirmMessage.value.length
                });
                
                windowObj.parent.postMessage(confirmMessage, '*');
                console.log('[listen-api-key] ✅ Confirmed API key receipt to parent window');
                console.log('[listen-api-key] ✅ postMessage sent to origin: * (any origin)');
              } catch (error: any) {
                console.error('[listen-api-key] ❌ ERROR sending confirmation:', error);
                console.error('[listen-api-key] ❌ Error name:', error?.name);
                console.error('[listen-api-key] ❌ Error message:', error?.message);
              }
            } else {
              console.log('[listen-api-key] ⚠️  Cannot send confirmation - no parent window');
            }
          } catch (error: any) {
            console.error('[listen-api-key] ❌ ERROR: Failed to save API key');
            console.error('[listen-api-key] ❌ Error name:', error?.name);
            console.error('[listen-api-key] ❌ Error message:', error?.message);
            console.error('[listen-api-key] ❌ Error stack:', error?.stack);
            console.error('[listen-api-key] ❌ Full error object:', error);
          }
        }
      });

      // Also try to read from localStorage if available
      console.log('[listen-api-key] 🔍 Checking localStorage for existing API key...');
      try {
        if (windowObj.localStorage) {
          console.log('[listen-api-key] ✅ localStorage is accessible');
          const storedKey = windowObj.localStorage.getItem('openai_api_key');
          if (storedKey) {
            console.log(`[listen-api-key] 📥 Found API key in localStorage (length: ${storedKey.length} chars)`);
            console.log(`[listen-api-key] 📥 Key preview: ${storedKey.substring(0, 7)}...${storedKey.substring(storedKey.length - 4)}`);
            
            const envDir = join(process.cwd(), 'env');
            const envPath = join(envDir, '.env');

            if (!existsSync(envDir)) {
              mkdirSync(envDir, { recursive: true });
              console.log('[listen-api-key] ✅ Created env directory');
            }

            const envContent = `OPENAI_API_KEY=${storedKey.trim()}\n`;
            writeFileSync(envPath, envContent, { flag: 'w' });
            console.log('[listen-api-key] ✅ API key from localStorage saved to env/.env file');
          } else {
            console.log('[listen-api-key] ℹ️  No API key found in localStorage');
          }
        } else {
          console.log('[listen-api-key] ⚠️  localStorage is not accessible');
        }
      } catch (error: any) {
        // Cross-origin restrictions may prevent localStorage access
        console.log(`[listen-api-key] ❌ Cannot access localStorage: ${error.message}`);
        console.log('[listen-api-key] ℹ️  Will rely on postMessage from parent window');
      }
    } else {
      console.log('[listen-api-key] ⚠️  window.addEventListener is not available');
    }
  } else {
    console.log('[listen-api-key] ⚠️  Not in browser environment, API key listener not available');
  }
  console.log('[listen-api-key] ✅ Listener setup complete');
}

// Auto-run when imported
console.log('[listen-api-key] 🚀 Auto-running setupApiKeyListener()...');
setupApiKeyListener();

// Also sync API key from .env to parent when listener is set up
// This ensures the parent window has the key even if it wasn't sent via postMessage
// Delay sync to ensure window is ready and avoid circular imports
console.log('[listen-api-key] ⏰ Scheduling sync-api-key-to-parent (2 second delay)...');
setTimeout(async () => {
  console.log('[listen-api-key] ⏰ Timeout fired, attempting to sync API key to parent...');
  try {
    console.log('[listen-api-key] 📦 Importing sync-api-key-to-parent...');
    const { syncApiKeyToParent } = await import('./sync-api-key-to-parent');
    console.log('[listen-api-key] ✅ Import successful, calling syncApiKeyToParent()...');
    syncApiKeyToParent();
  } catch (error: any) {
    console.error('[listen-api-key] ❌ ERROR importing/calling sync-api-key-to-parent');
    console.error('[listen-api-key] ❌ Error name:', error?.name);
    console.error('[listen-api-key] ❌ Error message:', error?.message);
    console.error('[listen-api-key] ❌ Error stack:', error?.stack);
    // Silently fail - sync is optional
  }
}, 2000);

