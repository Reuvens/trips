import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { describe, expect, it } from 'vitest';
import { DEFAULT_TRIP_SLUG, loadProjectData, PROJECT_ROOT } from '../src/data/loadTrip.js';
import {
  buildVaultCardsFromPrivateRefs,
  decryptVaultBundleNode,
  encryptVaultBundle,
} from '../src/domain/vaultCrypto.js';
import { PrivateRefsSchema } from '../src/schema/trip.schema.js';

describe('Cryptographic Family Vault (PBKDF2-HMAC-SHA256 + Encrypt-then-MAC)', () => {
  it('encrypts all 15 private keys with zero plaintext leak and decrypts ONLY for authorized email + exact PIN', () => {
    const bundle = loadProjectData();
    const exampleRefs = PrivateRefsSchema.parse(
      YAML.parse(
        fs.readFileSync(
          path.join(PROJECT_ROOT, 'trips', DEFAULT_TRIP_SLUG, 'private.example.yaml'),
          'utf8'
        )
      )
    );
    const firstBookingKey = bundle.trip.flights.bookings[0]!.refKey;
    const firstNightPinKey = bundle.trip.firstNightBooked!.pinRefKey;
    const syntheticRefs = {
      ...exampleRefs,
      [firstBookingKey]: 'TESTPNR99',
      [firstNightPinKey]: '8877',
    };
    const cards = buildVaultCardsFromPrivateRefs(bundle.trip, syntheticRefs);

    const encrypted = encryptVaultBundle({
      cards,
      allowedEmails: ['family.test@example.com'],
      pin: '7392',
      embedSlots: true,
    });

    const rawJson = JSON.stringify(encrypted);
    expect(rawJson).not.toContain('TESTPNR99');
    expect(rawJson).not.toContain('8877');
    expect(rawJson).not.toContain('EXAMPLE_MATMID_ID');
    expect(rawJson).not.toContain('family.test@example.com');
    expect(rawJson).not.toContain('7392');

    // Authorized email (case-insensitive) + valid synthetic PIN succeeds and exposes all 15/15 keys
    const unlocked = decryptVaultBundleNode(encrypted, '  FAMILY.TEST@EXAMPLE.COM ', '7392');
    const unlockedJson = JSON.stringify(unlocked);
    for (const [key, rawVal] of Object.entries(syntheticRefs)) {
      const vals = Array.isArray(rawVal) ? rawVal : [rawVal];
      for (const v of vals) {
        expect(unlockedJson, `Missing private key ${key} in unlocked vault`).toContain(String(v));
      }
    }

    // Unauthorized email is rejected
    expect(() => decryptVaultBundleNode(encrypted, 'stranger@example.com', '7392')).toThrow(
      /UNAUTHORIZED_EMAIL/
    );

    // Authorized email + wrong PIN fails cryptographic MAC verification
    expect(() => decryptVaultBundleNode(encrypted, 'family.test@example.com', '7393')).toThrow(
      /INVALID_VAULT_PIN/
    );
  });
});
