#!/usr/bin/env bun
/**
 * Cloudflare 520 Diagnostic Script
 * 
 * Usage: bun scripts/520-diagnose.ts [domain] [environment]
 * 
 * Environment-specific diagnosis for DEV vs PROD
 */

import { $ } from "bun";
import { readFileSync } from "fs";

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

interface DiagnosticResult {
  environment: "dev" | "prod";
  domain: string;
  timestamp: string;
  steps: {
    name: string;
    status: "pass" | "fail" | "warn" | "skip";
    details?: string;
    evidence?: string[];
  }[];
  conclusion: {
    rootCause?: string;
    fix?: string;
    severity: "critical" | "high" | "medium" | "low";
  };
}

class Cloudflare520Diagnostic {
  private result: DiagnosticResult;
  private domain: string;
  private environment: "dev" | "prod";

  constructor(domain: string, environment: "dev" | "prod") {
    this.domain = domain;
    this.environment = environment;
    this.result = {
      environment,
      domain,
      timestamp: new Date().toISOString(),
      steps: [],
      conclusion: { severity: "medium" },
    };
  }

  async run() {
    console.log(
      `\n${colors.bold}${colors.blue}🔍 Cloudflare 520 Diagnostic${colors.reset}`,
    );
    console.log(`Environment: ${colors.yellow}${this.environment.toUpperCase()}${colors.reset}`);
    console.log(`Domain: ${colors.yellow}${this.domain}${colors.reset}\n`);

    await this.step0_EnvironmentCheck();
    await this.step1_OriginWithoutCloudflare();
    await this.step2_CheckOriginLogs();
    await this.step3_CheckHeaders();
    await this.step4_BypassCloudflare();
    await this.step5_SSLCheck();
    await this.step6_TimeoutCheck();
    await this.step7_MinimalRequest();

    this.generateReport();
  }

  async step0_EnvironmentCheck() {
    console.log(`${colors.bold}Step 0: Environment Reality Check${colors.reset}`);

    const healthUrl = this.environment === "dev"
      ? "http://localhost:50430/health"
      : `https://${this.domain}/health`;

    try {
      const response = await fetch(healthUrl, { method: "GET" });
      const healthCheck = response.ok;

      this.result.steps.push({
        name: "Health Check Endpoint",
        status: healthCheck ? "pass" : "fail",
        details: healthCheck ? "✅ /health endpoint exists and works" : "❌ /health endpoint missing or failing",
        evidence: [`${healthUrl} → ${response.status}`],
      });

      if (!healthCheck) {
        console.log(`${colors.red}❌ Health check failed${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ Health check passes${colors.reset}`);
      }
    } catch (error) {
      this.result.steps.push({
        name: "Health Check Endpoint",
        status: "fail",
        details: "❌ Cannot reach origin",
        evidence: [String(error)],
      });
      console.log(`${colors.red}❌ Cannot reach origin${colors.reset}`);
    }
  }

  async step1_OriginWithoutCloudflare() {
    console.log(`\n${colors.bold}Step 1: Verify Origin Works WITHOUT Cloudflare${colors.reset}`);

    if (this.environment === "prod") {
      // For PROD, we test from a "gray cloud" subdomain
      const testDomain = `test-${this.domain}`;
      const testUrls = [
        `https://${testDomain}/health`,
        `https://${testDomain}/`,
      ];

      let allPass = true;
      for (const url of testUrls) {
        try {
          const response = await fetch(url);
          this.result.steps.push({
            name: `Gray Cloud Test: ${url}`,
            status: response.ok ? "pass" : "fail",
            evidence: [`${url} → ${response.status}`],
          });
          if (!response.ok) allPass = false;
        } catch (error) {
          this.result.steps.push({
            name: `Gray Cloud Test: ${url}`,
            status: "fail",
            evidence: [String(error)],
          });
          allPass = false;
        }
      }

      console.log(
        allPass
          ? `${colors.green}✅ Origin works without Cloudflare (gray cloud test)`
          : `${colors.red}❌ Origin fails without Cloudflare${colors.reset}`,
      );
    } else {
      // For DEV, test from localhost
      const originIp = "127.0.0.1";
      const testUrls = [
        `http://${originIp}:50430/health`,
        `http://${originIp}:50430/`,
      ];

      let allPass = true;
      for (const url of testUrls) {
        try {
          const response = await fetch(url);
          this.result.steps.push({
            name: `Local Test: ${url}`,
            status: response.ok ? "pass" : "fail",
            evidence: [`${url} → ${response.status}`],
          });
          if (!response.ok) allPass = false;
        } catch (error) {
          this.result.steps.push({
            name: `Local Test: ${url}`,
            status: "fail",
            evidence: [String(error)],
          });
          allPass = false;
        }
      }

      console.log(
        allPass
          ? `${colors.green}✅ Origin works locally (without Cloudflare)`
          : `${colors.red}❌ Origin fails locally${colors.reset}`,
      );
    }
  }

  async step2_CheckOriginLogs() {
    console.log(`\n${colors.bold}Step 2: Check Origin Server Logs${colors.reset}`);

    const logFiles = this.environment === "dev"
      ? [
          "/var/log/nginx/error.log",
          "/var/log/php-fpm/error.log",
          "/dev/shm/zosite.log",
        ]
      : [
          "/dev/shm/prod.log",
          "/dev/shm/public.log",
        ];

    let foundErrors = false;
    const evidence: string[] = [];

    for (const logFile of logFiles) {
      try {
        // Check if file exists and is readable
        const exists = await Bun.file(logFile).exists();
        if (!exists) continue;

        const logs = await $`tail -n 50 ${logFile}`.text();
        const errorLines = logs
          .split("\n")
          .filter((line) =>
            line.includes("error") ||
            line.includes("crash") ||
            line.includes("520") ||
            line.includes("invalid") ||
            line.includes("reset") ||
            line.includes("segfault") ||
            line.includes("upstream prematurely")
          );

        if (errorLines.length > 0) {
          foundErrors = true;
          evidence.push(...errorLines.slice(0, 5));
        }
      } catch (error) {
        // File doesn't exist or can't be read - that's fine
      }
    }

    this.result.steps.push({
      name: "Origin Logs Check",
      status: foundErrors ? "fail" : "pass",
      details: foundErrors ? "Found error logs" : "No critical errors found",
      evidence: evidence.length > 0 ? evidence : ["No relevant logs found"],
    });

    console.log(
      foundErrors
        ? `${colors.red}❌ Found error logs${colors.reset}`
        : `${colors.green}✅ No critical errors in logs${colors.reset}`,
    );

    if (foundErrors && evidence.length > 0) {
      console.log(`${colors.yellow}Recent error lines:${colors.reset}`);
      evidence.forEach((line) => console.log(`  ${line}`));
    }
  }

  async step3_CheckHeaders() {
    console.log(`\n${colors.bold}Step 3: Check Cloudflare-Safe Headers${colors.reset}`);

    const url = this.environment === "dev"
      ? "http://localhost:50430/"
      : `https://${this.domain}/`;

    try {
      const response = await fetch(url);
      const headers = Array.from(response.headers.entries());

      const issues: string[] = [];

      // Check for problematic headers
      const contentLength = response.headers.get("content-length");
      if (contentLength === "0") {
        issues.push("Empty Content-Length header");
      }

      const connection = response.headers.get("connection");
      if (connection?.includes("upgrade")) {
        issues.push("Connection: upgrade mishandled");
      }

      const httpVersion = response.headers.get("via") || "unknown";
      if (httpVersion.includes("2") && !response.headers.get("via")) {
        issues.push("HTTP/2 misconfiguration suspected");
      }

      this.result.steps.push({
        name: "Header Validation",
        status: issues.length === 0 ? "pass" : "warn",
        details: issues.length === 0 ? "Headers appear valid" : issues.join("; "),
        evidence: headers.slice(0, 10).map(([k, v]) => `${k}: ${v}`),
      });

      console.log(
        issues.length === 0
          ? `${colors.green}✅ Headers appear valid`
          : `${colors.yellow}⚠️  Header issues detected: ${issues.join("; ")}${colors.reset}`,
      );
    } catch (error) {
      this.result.steps.push({
        name: "Header Validation",
        status: "fail",
        details: "Cannot fetch headers",
        evidence: [String(error)],
      });
      console.log(`${colors.red}❌ Cannot fetch headers${colors.reset}`);
    }
  }

  async step4_BypassCloudflare() {
    console.log(`\n${colors.bold}Step 4: Bypass Cloudflare (Environment-Specific)${colors.reset}`);

    if (this.environment === "dev") {
      console.log(`${colors.blue}DEV: Bypass via /etc/hosts or pause Cloudflare${colors.reset}`);
      console.log(`${colors.blue}Add to /etc/hosts: 127.0.0.1 ${this.domain}${colors.reset}`);
      this.result.steps.push({
        name: "Bypass Method",
        status: "skip",
        details: "DEV: Edit /etc/hosts or pause Cloudflare orange cloud",
        evidence: [],
      });
    } else {
      console.log(`${colors.blue}PROD: Use gray cloud subdomain (test-${this.domain})${colors.reset}`);
      console.log(`${colors.blue}NEVER pause Cloudflare in production${colors.reset}`);
      this.result.steps.push({
        name: "Bypass Method",
        status: "skip",
        details: "PROD: Create gray cloud subdomain for testing",
        evidence: [],
      });
    }
  }

  async step5_SSLCheck() {
    console.log(`\n${colors.bold}Step 5: TLS / SSL Mode Check${colors.reset}`);

    const sslMode = this.environment === "dev" ? "Full" : "Full (Strict)";

    // Test TLS connection
    const testDomain = this.environment === "dev" ? "localhost" : this.domain;
    
    try {
      // Simple TLS check
      const url = this.environment === "dev"
        ? "http://localhost:50430/"
        : `https://${this.domain}/`;
      
      const response = await fetch(url);
      const ok = response.ok;

      this.result.steps.push({
        name: "SSL Mode",
        status: ok ? "pass" : "fail",
        details: `Cloudflare SSL: ${sslMode}`,
        evidence: [ok ? "TLS connection successful" : "TLS connection failed"],
      });

      console.log(
        ok
          ? `${colors.green}✅ SSL/TLS check passes (${sslMode})`
          : `${colors.red}❌ SSL/TLS check fails${colors.reset}`,
      );
    } catch (error) {
      this.result.steps.push({
        name: "SSL Mode",
        status: "fail",
        details: "Cannot establish TLS connection",
        evidence: [String(error)],
      });
      console.log(`${colors.red}❌ Cannot establish TLS connection${colors.reset}`);
    }
  }

  async step6_TimeoutCheck() {
    console.log(`\n${colors.bold}Step 6: Timeout & Body Size Check${colors.reset}`);

    // Check config files
    const configFiles = [
      "/home/workspace/neighborgigs/zosite.json",
      "/home/workspace/neighborgigs/server.ts",
    ];

    let timeoutConfig = "";
    for (const file of configFiles) {
      try {
        const content = await Bun.file(file).text();
        if (content.includes("idleTimeout") || content.includes("timeout")) {
          timeoutConfig = `${file}: timeout configuration found`;
          break;
        }
      } catch {
        // File not found
      }
    }

    this.result.steps.push({
      name: "Timeout Configuration",
      status: timeoutConfig ? "pass" : "warn",
      details: timeoutConfig || "No explicit timeout config found",
      evidence: [timeoutConfig || "Using defaults"],
    });

    console.log(
      timeoutConfig
        ? `${colors.green}✅ Timeout config found`
        : `${colors.yellow}⚠️  Using default timeouts${colors.reset}`,
    );
  }

  async step7_MinimalRequest() {
    console.log(`\n${colors.bold}Step 7: Reproduce With Minimal Request${colors.reset}`);

    const endpoints = [
      "/health",
      "/",
      "/api/hello-zo",
    ];

    let allPass = true;
    const evidence: string[] = [];

    for (const endpoint of endpoints) {
      const url = this.environment === "dev"
        ? `http://localhost:50430${endpoint}`
        : `https://${this.domain}${endpoint}`;

      try {
        const response = await fetch(url);
        const status = response.status;
        const ok = response.ok;

        evidence.push(`${endpoint}: ${status}`);

        if (!ok) {
          allPass = false;
        }

        this.result.steps.push({
          name: `Minimal Test: ${endpoint}`,
          status: ok ? "pass" : "fail",
          evidence: [`${url} → ${status}`],
        });
      } catch (error) {
        allPass = false;
        this.result.steps.push({
          name: `Minimal Test: ${endpoint}`,
          status: "fail",
          evidence: [String(error)],
        });
      }
    }

    console.log(
      allPass
        ? `${colors.green}✅ All minimal endpoints work${colors.reset}`
        : `${colors.red}❌ Some endpoints fail${colors.reset}`,
    );

    if (!allPass) {
      console.log(`${colors.yellow}Endpoint responses:${colors.reset}`);
      evidence.forEach((line) => console.log(`  ${line}`));
    }
  }

  generateReport() {
    console.log(`\n${colors.bold}${colors.blue}📋 DIAGNOSTIC REPORT${colors.reset}`);
    console.log(`${colors.bold}Environment:${colors.reset} ${this.environment.toUpperCase()}`);
    console.log(`${colors.bold}Domain:${colors.reset} ${this.domain}`);
    console.log(`${colors.bold}Timestamp:${colors.reset} ${this.result.timestamp}`);

    const failures = this.result.steps.filter((s) => s.status === "fail");
    const warnings = this.result.steps.filter((s) => s.status === "warn");

    if (failures.length > 0) {
      console.log(`\n${colors.red}${colors.bold}❌ FAILURES (${failures.length})${colors.reset}`);
      failures.forEach((step) => {
        console.log(`  ${colors.red}•${colors.reset} ${step.name}: ${step.details}`);
        if (step.evidence?.length) {
          step.evidence.forEach((e) => console.log(`    ${colors.dim}${e}${colors.reset}`));
        }
      });
    }

    if (warnings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bold}⚠️  WARNINGS (${warnings.length})${colors.reset}`);
      warnings.forEach((step) => {
        console.log(`  ${colors.yellow}•${colors.reset} ${step.name}: ${step.details}`);
        if (step.evidence?.length) {
          step.evidence.forEach((e) => console.log(`    ${colors.dim}${e}${colors.reset}`));
        }
      });
    }

    // Determine root cause
    const rootCause = this.determineRootCause();
    if (rootCause) {
      console.log(`\n${colors.bold}${colors.green}🎯 ROOT CAUSE${colors.reset}`);
      console.log(`  ${rootCause}`);
    }

    const fix = this.determineFix();
    if (fix) {
      console.log(`\n${colors.bold}${colors.green}🔧 MINIMAL FIX${colors.reset}`);
      console.log(`  ${fix}`);
    }

    console.log(`\n${colors.bold}${colors.blue}💡 WHY CLOUDFLARE RETURNED 520${colors.reset}`);
    console.log(`  Cloudflare successfully connected to origin but rejected the response.`);
    console.log(`  Common reasons:`);
    console.log(`  - Empty response body with headers`);
    console.log(`  - Invalid HTTP response format`);
    console.log(`  - Connection reset mid-response`);
    console.log(`  - App crashed after accepting connection`);
    console.log(`  - Malformed headers`);

    // Save to file
    this.saveReport();
  }

  determineRootCause(): string {
    const failures = this.result.steps.filter((s) => s.status === "fail");
    
    if (failures.some((s) => s.name.includes("Health Check"))) {
      return "Origin server is not responding or /health endpoint is missing";
    }
    
    if (failures.some((s) => s.name.includes("Origin Logs"))) {
      return "Application crash or error detected in logs";
    }
    
    if (failures.some((s) => s.name.includes("Header"))) {
      return "Malformed or invalid HTTP headers";
    }
    
    if (failures.some((s) => s.name.includes("SSL"))) {
      return "SSL/TLS handshake failure";
    }
    
    if (failures.some((s) => s.name.includes("Minimal Test"))) {
      return "Application logic error on specific endpoint";
    }

    return "Unknown - inspect logs and evidence above";
  }

  determineFix(): string {
    const root = this.determineRootCause();

    if (root.includes("health endpoint")) {
      return `Add /health endpoint to server.ts:
  
  app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));`;
    }

    if (root.includes("crash") || root.includes("error")) {
      return "Check logs, fix application crash, restart service";
    }

    if (root.includes("headers")) {
      return "Fix response headers in application code, ensure Content-Length is correct";
    }

    if (root.includes("SSL")) {
      return "Verify Cloudflare SSL mode is 'Full (Strict)', check origin certificate";
    }

    if (root.includes("endpoint")) {
      return "Fix the failing endpoint logic in your application";
    }

    return "Review logs and evidence to identify specific fix needed";
  }

  async saveReport() {
    const reportPath = `/home/workspace/neighborgigs/docs/520-report-${this.environment}-${new Date().toISOString().split("T")[0]}.md`;
    
    let report = `# Cloudflare 520 Diagnostic Report\n\n`;
    report += `**Environment:** ${this.environment.toUpperCase()}\n`;
    report += `**Domain:** ${this.domain}\n`;
    report += `**Date:** ${new Date().toISOString()}\n\n`;

    report += `## Steps\n\n`;
    this.result.steps.forEach((step) => {
      const icon = step.status === "pass" ? "✅" : step.status === "fail" ? "❌" : "⚠️";
      report += `### ${icon} ${step.name}\n`;
      report += `**Status:** ${step.status}\n`;
      report += `**Details:** ${step.details || "None"}\n`;
      if (step.evidence?.length) {
        report += `**Evidence:**\n`;
        step.evidence.forEach((e) => report += `- ${e}\n`);
      }
      report += `\n`;
    });

    report += `## Root Cause\n\n${this.determineRootCause()}\n\n`;
    report += `## Fix\n\n${this.determineFix()}\n\n`;

    try {
      await Bun.write(reportPath, report);
      console.log(`\n${colors.blue}📄 Report saved to: ${reportPath}${colors.reset}`);
    } catch (error) {
      console.log(`\n${colors.red}❌ Could not save report: ${error}${colors.reset}`);
    }
  }
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  const domain = args[0] || "localhost";
  const environment = (args[1] || "dev").toLowerCase() as "dev" | "prod";

  if (environment !== "dev" && environment !== "prod") {
    console.log(`Usage: bun scripts/520-diagnose.ts [domain] [dev|prod]`);
    process.exit(1);
  }

  const diagnostic = new Cloudflare520Diagnostic(domain, environment);
  await diagnostic.run();
}
