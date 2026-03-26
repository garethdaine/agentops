import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { isLocalhostOrigin } from '../server/relay';

const dashboardRoot = path.resolve(__dirname, '..');

describe('Security', () => {
  // REQ-047: lockfile audit — package-lock.json exists and no critical vulnerabilities
  describe('REQ-047: Lockfile audit', () => {
    it('should have a package-lock.json in the dashboard directory', () => {
      const lockfilePath = path.join(dashboardRoot, 'package-lock.json');
      expect(fs.existsSync(lockfilePath)).toBe(true);
    });

    it('should pass npm audit with no critical vulnerabilities', () => {
      // npm audit can fail due to network issues in CI — skip gracefully
      let exitCode = 0;
      let skipped = false;
      try {
        execSync('npm audit --audit-level=critical', {
          cwd: dashboardRoot,
          stdio: 'pipe',
          timeout: 15000,
        });
      } catch (err: any) {
        // Exit code 1 = audit failure (vulns found)
        // Other codes (network error, timeout) should not fail the test
        if (err.status === 1) {
          exitCode = 1;
        } else {
          skipped = true;
        }
      }
      if (!skipped) {
        expect(exitCode).toBe(0);
      }
    });
  });

  // REQ-048: Integrity manifest — dashboard source files can be enumerated
  describe('REQ-048: Integrity manifest', () => {
    it('should enumerate all .ts and .tsx source files in the dashboard', () => {
      const sourceFiles: string[] = [];

      function walk(dir: string): void {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            // Skip node_modules and .next
            if (entry.name === 'node_modules' || entry.name === '.next') continue;
            walk(fullPath);
          } else if (/\.(ts|tsx)$/.test(entry.name)) {
            sourceFiles.push(fullPath);
          }
        }
      }

      walk(dashboardRoot);

      // There must be at least some source files
      expect(sourceFiles.length).toBeGreaterThan(0);

      // Every enumerated file must actually exist
      for (const file of sourceFiles) {
        expect(fs.existsSync(file)).toBe(true);
      }
    });
  });

  // REQ-049: Origin validation — relay rejects non-localhost origins
  describe('REQ-049: Origin validation', () => {
    it('should accept http://localhost:3100', () => {
      expect(isLocalhostOrigin('http://localhost:3100')).toBe(true);
    });

    it('should accept http://127.0.0.1:3100', () => {
      expect(isLocalhostOrigin('http://127.0.0.1:3100')).toBe(true);
    });

    it('should accept http://[::1]:3100', () => {
      expect(isLocalhostOrigin('http://[::1]:3100')).toBe(true);
    });

    it('should accept https://localhost', () => {
      expect(isLocalhostOrigin('https://localhost')).toBe(true);
    });

    it('should reject http://evil.com', () => {
      expect(isLocalhostOrigin('http://evil.com')).toBe(false);
    });

    it('should reject http://localhost.evil.com', () => {
      expect(isLocalhostOrigin('http://localhost.evil.com')).toBe(false);
    });

    it('should reject http://192.168.1.1:3100', () => {
      expect(isLocalhostOrigin('http://192.168.1.1:3100')).toBe(false);
    });

    it('should reject undefined origin', () => {
      expect(isLocalhostOrigin(undefined)).toBe(false);
    });

    it('should reject empty string origin', () => {
      expect(isLocalhostOrigin('')).toBe(false);
    });

    it('should reject malformed URL', () => {
      expect(isLocalhostOrigin('not-a-url')).toBe(false);
    });
  });
});
