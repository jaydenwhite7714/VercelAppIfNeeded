import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// The app does not use ISR or an external cache binding, so keep the adapter
// on its default cache behavior and avoid provisioning production resources.
export default defineCloudflareConfig();
