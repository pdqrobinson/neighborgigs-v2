#!/usr/bin/env bun
/**
 * Cloudflare API Integration Script
 * 
 * For checking Cloudflare settings and SSL mode programmatically
 * 
 * Usage: bun scripts/cloudflare-api.ts [command]
 * 
 * Commands:
 *   check-ssl     - Check SSL/TLS mode
 *   check-dns     - Check DNS records
 *   check-errors  - Check 520 error rates
 */

import { $ } from "bun";

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

// Read Cloudflare API key from environment
const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DOMAIN = "neighborgigs.dev";

class CloudflareAPI {
  private apiBase = "https://api.cloudflare.com/client/v4";

  async checkSSLMode() {
    console.log(`${colors.bold}Checking SSL/TLS Mode${colors.reset}`);

    if (!CLOUDFLARE_API_KEY) {
      console.log(`${colors.yellow}⚠️  CLOUDFLARE_API_KEY not set${colors.reset}`);
      console.log(`${colors.blue}Set in: /?t=settings&s=developers${colors.reset}`);
      return;
    }

    try {
      const response = await fetch(
        `${this.apiBase}/zones?name=${DOMAIN}`,
        {
          headers: {
            "Authorization": `Bearer ${CLOUDFLARE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      
      if (!data.success) {
        console.log(`${colors.red}❌ API error: ${data.errors?.[0]?.message}${colors.reset}`);
        return;
      }

      if (data.result.length === 0) {
        console.log(`${colors.red}❌ Zone not found${colors.reset}`);
        return;
      }

      const zoneId = data.result[0].id;
      
      // Get SSL settings
      const sslResponse = await fetch(
        `${this.apiBase}/zones/${zoneId}/settings/ssl`,
        {
          headers: {
            "Authorization": `Bearer ${CLOUDFLARE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const sslData = await sslResponse.json();
      
      if (sslData.success) {
        const sslMode = sslData.result.value;
        console.log(`\n${colors.bold}SSL/TLS Mode:${colors.reset} ${sslMode}`);
        
        if (sslMode === "off") {
          console.log(`${colors.red}❌ OFF - Traffic not encrypted${colors.reset}`);
        } else if (sslMode === "flexible") {
          console.log(`${colors.red}❌ FLEXIBLE - Causes 520 errors!${colors.reset}`);
        } else if (sslMode === "full") {
          console.log(`${colors.yellow}⚠️  FULL - OK, but Full (Strict) is better${colors.reset}`);
        } else if (sslMode === "strict") {
          console.log(`${colors.green}✅ FULL (STRICT) - Best option${colors.reset}`);
        }
      }

      // Check Always Use HTTPS
      const httpsResponse = await fetch(
        `${this.apiBase}/zones/${zoneId}/settings/always_use_https`,
        {
          headers: {
            "Authorization": `Bearer ${CLOUDFLARE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const httpsData = await httpsResponse.json();
      
      if (httpsData.success) {
        const httpsEnabled = httpsData.result.value;
        console.log(`${colors.bold}Always Use HTTPS:${colors.reset} ${httpsEnabled ? "✅ ON" : "❌ OFF"}`);
      }

    } catch (error) {
      console.log(`${colors.red}❌ API call failed: ${error}${colors.reset}`);
    }
  }

  async checkDNS() {
    console.log(`${colors.bold}Checking DNS Records${colors.reset}`);

    if (!CLOUDFLARE_API_KEY) {
      console.log(`${colors.yellow}⚠️  CLOUDFLARE_API_KEY not set${colors.reset}`);
      return;
    }

    try {
      const response = await fetch(
        `${this.apiBase}/zones?name=${DOMAIN}`,
        {
          headers: {
            "Authorization": `Bearer ${CLOUDFLARE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      
      if (!data.success || data.result.length === 0) {
        console.log(`${colors.red}❌ Zone not found${colors.reset}`);
        return;
      }

      const zoneId = data.result[0].id;
      
      const dnsResponse = await fetch(
        `${this.apiBase}/zones/${zoneId}/dns_records`,
        {
          headers: {
            "Authorization": `Bearer ${CLOUDFLARE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const dnsData = await dnsResponse.json();
      
      if (dnsData.success) {
        console.log(`\n${colors.bold}DNS Records:${colors.reset}`);
        dnsData.result.forEach((record: any) => {
          const icon = record.proxied ? "🟠" : "⚪";
          console.log(`  ${icon} ${record.type} ${record.name} → ${record.content} (${record.ttl}s)`);
        });
      }

    } catch (error) {
      console.log(`${colors.red}❌ API call failed: ${error}${colors.reset}`);
    }
  }

  async checkErrors() {
    console.log(`${colors.bold}Checking 520 Error Rates${colors.reset}`);

    if (!CLOUDFLARE_API_KEY) {
      console.log(`${colors.yellow}⚠️  CLOUDFLARE_API_KEY not set${colors.reset}`);
      return;
    }

    try {
      // Get analytics for 520 errors (simplified - would need proper API)
      const response = await fetch(
        `${this.apiBase}/zones?name=${DOMAIN}`,
        {
          headers: {
            "Authorization": `Bearer ${CLOUDFLARE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      
      if (!data.success || data.result.length === 0) {
        console.log(`${colors.red}❌ Zone not found${colors.reset}`);
        return;
      }

      const zoneId = data.result[0].id;
      
      // Note: This requires Cloudflare Analytics API access
      // For now, we'll show a message
      console.log(`\n${colors.blue}Analytics requires Cloudflare Enterprise or proper API access${colors.reset}`);
      console.log(`${colors.blue}Check manually: https://dash.cloudflare.com/${zoneId}/analytics${colors.reset}`);
      
      console.log(`\n${colors.bold}What to look for:${colors.reset}`);
      console.log(`  - 520 errors > 10/min`);
      console.log(`  - Origin response time > 5s`);
      console.log(`  - SSL handshake failures`);
      console.log(`  - Connection resets`);

    } catch (error) {
      console.log(`${colors.red}❌ API call failed: ${error}${colors.reset}`);
    }
  }

  async setSSLMode(mode: "off" | "flexible" | "full" | "strict") {
    console.log(`${colors.bold}Setting SSL/TLS Mode to ${mode.toUpperCase()}${colors.reset}`);

    if (!CLOUDFLARE_API_KEY) {
      console.log(`${colors.yellow}⚠️  CLOUDFLARE_API_KEY not set${colors.reset}`);
      return;
    }

    if (mode === "flexible") {
      console.log(`${colors.red}⚠️  WARNING: Flexible mode causes 520 errors!${colors.reset}`);
      console.log(`${colors.red}This is NOT recommended for production${colors.reset}`);
    }

    try {
      const response = await fetch(
        `${this.apiBase}/zones?name=${DOMAIN}`,
        {
          headers: {
            "Authorization": `Bearer ${CLOUDFLARE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      
      if (!data.success || data.result.length === 0) {
        console.log(`${colors.red}❌ Zone not found${colors.reset}`);
        return;
      }

      const zoneId = data.result[0].id;
      
      const updateResponse = await fetch(
        `${this.apiBase}/zones/${zoneId}/settings/ssl`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${CLOUDFLARE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ value: mode }),
        }
      );

      const updateData = await updateResponse.json();
      
      if (updateData.success) {
        console.log(`${colors.green}✅ SSL mode set to ${mode}${colors.reset}`);
      } else {
        console.log(`${colors.red}❌ Failed to set SSL mode: ${updateData.errors?.[0]?.message}${colors.reset}`);
      }

    } catch (error) {
      console.log(`${colors.red}❌ API call failed: ${error}${colors.reset}`);
    }
  }
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  const cf = new CloudflareAPI();

  switch (command) {
    case "check-ssl":
      await cf.checkSSLMode();
      break;
    case "check-dns":
      await cf.checkDNS();
      break;
    case "check-errors":
      await cf.checkErrors();
      break;
    case "set-ssl":
      const mode = args[1];
      if (mode && ["off", "flexible", "full", "strict"].includes(mode)) {
        await cf.setSSLMode(mode as any);
      } else {
        console.log(`${colors.red}Usage: bun scripts/cloudflare-api.ts set-ssl [off|flexible|full|strict]${colors.reset}`);
      }
      break;
    default:
      console.log(`${colors.bold}Cloudflare API Commands:${colors.reset}`);
      console.log(`  ${colors.blue}check-ssl${colors.reset}     - Check SSL/TLS mode`);
      console.log(`  ${colors.blue}check-dns${colors.reset}     - Check DNS records`);
      console.log(`  ${colors.blue}check-errors${colors.reset}  - Check 520 error rates`);
      console.log(`  ${colors.blue}set-ssl${colors.reset} [mode] - Set SSL mode`);
      console.log(`\n${colors.bold}Set API Key:${colors.reset}`);
      console.log(`  In /?t=settings&s=developers`);
      console.log(`  Set: CLOUDFLARE_API_KEY`);
  }
}
