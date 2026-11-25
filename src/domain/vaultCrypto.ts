/**
 * Family Vault Cryptographic Engine (Node build-time + pure-standard primitives).
 * Uses PBKDF2-HMAC-SHA256 (120,000 iterations) + HMAC-SHA256 CTR stream +
 * Encrypt-then-MAC (256-bit HMAC-SHA256 authentication tag) per authorized family email.
 */
import crypto from 'node:crypto';
import type { PrivateRefs, TripData } from '../schema/trip.schema.js';

export interface VaultField {
  labelHe: string;
  value: string;
  copyable?: boolean;
}

export interface VaultCard {
  id: string;
  categoryHe: string;
  titleHe: string;
  subtitleHe: string;
  fields: VaultField[];
}

export interface EncryptedRecipientSlot {
  emailHashHex: string;
  maskedEmail: string;
  saltB64: string;
  ivB64: string;
  ciphertextB64: string;
  macB64: string;
}

export interface EncryptedVaultBundle {
  version: 1;
  mode: 'embedded-encrypted' | 'google-drive-only';
  kdf: 'PBKDF2-HMAC-SHA256';
  iterations: number;
  allowedEmailHashes: string[];
  maskedEmails: string[];
  googleClientId: string;
  driveVaultFileId: string;
  slots: EncryptedRecipientSlot[];
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

export function maskEmail(email: string): string {
  const norm = normalizeEmail(email);
  const [local, domain] = norm.split('@');
  if (!local || !domain) return '***';
  if (local.length <= 2) return `${local[0] ?? '*'}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function buildVaultCardsFromPrivateRefs(
  trip: TripData,
  privateRefs: PrivateRefs
): VaultCard[] {
  const memberName = new Map(trip.party.members.map((m) => [m.id, m.nameHe]));
  const cards: VaultCard[] = [];

  trip.flights.bookings.forEach((b, idx) => {
    const names = b.who.map((id) => memberName.get(id) ?? id).join(', ');
    const pnr = String(privateRefs[b.refKey] ?? '—');
    const fields: VaultField[] = [
      { labelHe: 'קוד הזמנה באל על (PNR)', value: pnr, copyable: true },
      { labelHe: 'נוסעים בהזמנה', value: names },
      { labelHe: 'סוג כרטיס ומושבים', value: `${b.classHe} · ${b.seatsHe}` },
    ];
    b.ticketRefKeys.forEach((tk, tIdx) => {
      const val = privateRefs[tk];
      if (Array.isArray(val)) {
        val.forEach((num, subIdx) => {
          fields.push({
            labelHe: `מס׳ כרטיס אלקטרוני #${subIdx + 1}`,
            value: String(num),
            copyable: true,
          });
        });
      } else if (val !== undefined) {
        fields.push({
          labelHe: `מס׳ כרטיס אלקטרוני${b.ticketRefKeys.length > 1 ? ` #${tIdx + 1}` : ''}`,
          value: String(val),
          copyable: true,
        });
      }
    });

    cards.push({
      id: `vault-flight-${b.id}`,
      categoryHe: 'טיסות אל על',
      titleHe: `הזמנת אל על #${idx + 1} — ${names}`,
      subtitleHe: `${trip.flights.legs[0]?.flight ?? 'LY381'} / ${trip.flights.legs[1]?.flight ?? 'LY388'}`,
      fields,
    });
  });

  // Calanda SOLE
  const calandaRef = String(privateRefs[trip.apartment.refKey] ?? '—');
  cards.push({
    id: 'vault-calanda',
    categoryHe: 'לינה בליביניו',
    titleHe: `${trip.apartment.name} (7 לילות)`,
    subtitleHe: `${trip.apartment.address} · מארח: ${trip.apartment.hostName}`,
    fields: [
      { labelHe: 'קוד אסמכתא / אישור הזמנה', value: calandaRef, copyable: true },
      { labelHe: 'טלפון / WhatsApp המארח', value: trip.apartment.phone, copyable: true },
      { labelHe: 'כתובת לניווט', value: trip.apartment.address, copyable: true },
    ],
  });

  // Casa Noemi
  if (trip.firstNightBooked) {
    const fn = trip.firstNightBooked;
    const fnRef = String(privateRefs[fn.refKey] ?? '—');
    const fnPin = String(privateRefs[fn.pinRefKey] ?? '—');
    const fnPhone = String(privateRefs[fn.phoneRefKey] ?? '—');
    cards.push({
      id: 'vault-first-night',
      categoryHe: 'לינה בליביניו',
      titleHe: `${fn.name} — לילה ראשון (Booking.com)`,
      subtitleHe: `${fn.address} · צ׳ק-אין מ-${fn.checkIn}`,
      fields: [
        { labelHe: 'מספר אישור Booking.com', value: fnRef, copyable: true },
        { labelHe: 'קוד PIN סודי ב-Booking', value: fnPin, copyable: true },
        { labelHe: 'טלפון המארח', value: fnPhone, copyable: true },
      ],
    });
  }

  // El Al Matmid club & point-redemption references (all remaining private.yaml keys)
  const loyaltyFields: VaultField[] = [];
  if (privateRefs['matmid'] !== undefined) {
    loyaltyFields.push({
      labelHe: 'מס׳ חבר מועדון הנוסע המתמיד',
      value: String(privateRefs['matmid']),
      copyable: true,
    });
  }
  if (privateRefs['ff_on_ticket_orit'] !== undefined) {
    loyaltyFields.push({
      labelHe: 'מס׳ נוסע מתמיד בכרטיס של אורית',
      value: String(privateRefs['ff_on_ticket_orit']),
      copyable: true,
    });
  }
  const redRefs = privateRefs['redemption_refs'];
  if (Array.isArray(redRefs)) {
    redRefs.forEach((refVal, rIdx) => {
      loyaltyFields.push({
        labelHe: `אסמכתת מימוש נקודות אל על #${rIdx + 1}`,
        value: String(refVal),
        copyable: true,
      });
    });
  } else if (redRefs !== undefined) {
    loyaltyFields.push({
      labelHe: 'אסמכתת מימוש נקודות אל על',
      value: String(redRefs),
      copyable: true,
    });
  }
  if (loyaltyFields.length > 0) {
    cards.push({
      id: 'vault-elal-loyalty',
      categoryHe: 'מועדון הנוסע המתמיד ומימוש נקודות',
      titleHe: 'מספרי נוסע מתמיד ואסמכתאות מימוש באל על',
      subtitleHe: 'לזיהוי מול מוקד הנוסע המתמיד ובירור כרטיסי הבונוס',
      fields: loyaltyFields,
    });
  }

  // Personal reservation contact details if present
  const contactFields: VaultField[] = [];
  if (privateRefs['reuven_phone']) {
    contactFields.push({
      labelHe: 'טלפון בהזמנות',
      value: String(privateRefs['reuven_phone']),
      copyable: true,
    });
  }
  if (privateRefs['reuven_email']) {
    contactFields.push({
      labelHe: 'אימייל ראשי בהזמנות',
      value: String(privateRefs['reuven_email']),
      copyable: true,
    });
  }
  if (privateRefs['booking_account_email']) {
    contactFields.push({
      labelHe: 'חשבון Booking.com',
      value: String(privateRefs['booking_account_email']),
      copyable: true,
    });
  }
  if (contactFields.length > 0) {
    cards.push({
      id: 'vault-contacts',
      categoryHe: 'פרטי קשר בהזמנות',
      titleHe: 'פרטי המזמין מול הספקים',
      subtitleHe: 'לזיהוי מהיר מול אל על, Booking והמארחים',
      fields: contactFields,
    });
  }

  return cards;
}

function hmacSha256(key: Buffer, data: Buffer): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function xorStreamCrypt(encKey: Buffer, iv: Buffer, input: Buffer): Buffer {
  const out = Buffer.alloc(input.length);
  const totalBlocks = Math.ceil(input.length / 32);
  for (let counter = 0; counter < totalBlocks; counter++) {
    const ctrBuf = Buffer.alloc(4);
    ctrBuf.writeUInt32BE(counter, 0);
    const keystream = hmacSha256(encKey, Buffer.concat([iv, ctrBuf]));
    const offset = counter * 32;
    const chunkLen = Math.min(32, input.length - offset);
    for (let i = 0; i < chunkLen; i++) {
      out[offset + i] = input[offset + i]! ^ keystream[i]!;
    }
  }
  return out;
}

export function encryptVaultBundle(options: {
  cards: VaultCard[];
  allowedEmails: string[];
  pin: string;
  googleClientId?: string;
  driveVaultFileId?: string;
  embedSlots: boolean;
  deterministicSeed?: string;
}): EncryptedVaultBundle {
  const iterations = 120_000;
  const normalized = [...new Set(options.allowedEmails.map(normalizeEmail))];
  const allowedEmailHashes = normalized.map(sha256Hex);
  const maskedEmails = normalized.map(maskEmail);

  if (!options.embedSlots) {
    return {
      version: 1,
      mode: 'google-drive-only',
      kdf: 'PBKDF2-HMAC-SHA256',
      iterations,
      allowedEmailHashes,
      maskedEmails,
      googleClientId: options.googleClientId ?? '',
      driveVaultFileId: options.driveVaultFileId ?? '',
      slots: [],
    };
  }

  const plaintext = Buffer.from(JSON.stringify({ cards: options.cards }), 'utf8');
  const slots: EncryptedRecipientSlot[] = normalized.map((email, idx) => {
    const salt = options.deterministicSeed
      ? crypto
          .createHash('sha256')
          .update(`salt:${options.deterministicSeed}:${email}:${idx}`)
          .digest()
          .subarray(0, 16)
      : crypto.randomBytes(16);
    const iv = options.deterministicSeed
      ? crypto
          .createHash('sha256')
          .update(`iv:${options.deterministicSeed}:${email}:${idx}`)
          .digest()
          .subarray(0, 16)
      : crypto.randomBytes(16);

    const secretMaterial = `${email}:${options.pin.trim()}`;
    const derived = crypto.pbkdf2Sync(secretMaterial, salt, iterations, 64, 'sha256');
    const encKey = derived.subarray(0, 32);
    const macKey = derived.subarray(32, 64);

    const ciphertext = xorStreamCrypt(encKey, iv, plaintext);
    const mac = hmacSha256(macKey, Buffer.concat([salt, iv, ciphertext]));

    return {
      emailHashHex: sha256Hex(email),
      maskedEmail: maskEmail(email),
      saltB64: salt.toString('base64'),
      ivB64: iv.toString('base64'),
      ciphertextB64: ciphertext.toString('base64'),
      macB64: mac.toString('base64'),
    };
  });

  return {
    version: 1,
    mode: 'embedded-encrypted',
    kdf: 'PBKDF2-HMAC-SHA256',
    iterations,
    allowedEmailHashes,
    maskedEmails,
    googleClientId: options.googleClientId ?? '',
    driveVaultFileId: options.driveVaultFileId ?? '',
    slots,
  };
}

export function decryptVaultBundleNode(
  bundle: EncryptedVaultBundle,
  emailInput: string,
  pinInput: string
): VaultCard[] {
  const email = normalizeEmail(emailInput);
  const emailHash = sha256Hex(email);
  if (!bundle.allowedEmailHashes.includes(emailHash)) {
    throw new Error('UNAUTHORIZED_EMAIL');
  }
  const slot = bundle.slots.find((s) => s.emailHashHex === emailHash);
  if (!slot) {
    throw new Error('VAULT_REQUIRES_GOOGLE_DRIVE');
  }
  const salt = Buffer.from(slot.saltB64, 'base64');
  const iv = Buffer.from(slot.ivB64, 'base64');
  const ciphertext = Buffer.from(slot.ciphertextB64, 'base64');
  const expectedMac = Buffer.from(slot.macB64, 'base64');

  const derived = crypto.pbkdf2Sync(
    `${email}:${pinInput.trim()}`,
    salt,
    bundle.iterations,
    64,
    'sha256'
  );
  const encKey = derived.subarray(0, 32);
  const macKey = derived.subarray(32, 64);
  const actualMac = hmacSha256(macKey, Buffer.concat([salt, iv, ciphertext]));

  if (
    actualMac.length !== expectedMac.length ||
    !crypto.timingSafeEqual(actualMac, expectedMac)
  ) {
    throw new Error('INVALID_VAULT_PIN');
  }

  const plainBuf = xorStreamCrypt(encKey, iv, ciphertext);
  const parsed = JSON.parse(plainBuf.toString('utf8')) as { cards: VaultCard[] };
  return parsed.cards;
}
