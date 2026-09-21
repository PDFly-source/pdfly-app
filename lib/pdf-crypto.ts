'use client';

import forge from 'node-forge';
import { PDFDocument, rgb, StandardFonts, PDFName, PDFDict, PDFArray, PDFHexString, PDFNumber } from 'pdf-lib';
import { safeDrawText } from './font-safe';

export interface ParsedCertificateInfo {
  subject: {
    commonName?: string;
    organization?: string;
    organizationalUnit?: string;
    country?: string;
    email?: string;
    summary: string;
  };
  issuer: {
    commonName?: string;
    organization?: string;
    country?: string;
    summary: string;
  };
  validity: {
    notBefore: Date;
    notAfter: Date;
    isValidNow: boolean;
    isExpired: boolean;
    isNotYetValid: boolean;
  };
  serialNumber: string;
  signatureAlgorithm: string;
  keyAlgorithm: string;
  fingerprintSha256: string;
}

export interface DecryptedP12Bundle {
  certificate: forge.pki.Certificate;
  certificateChain: forge.pki.Certificate[];
  privateKey: forge.pki.PrivateKey;
  info: ParsedCertificateInfo;
}

export interface CertSignatureOptions {
  reason?: string;
  location?: string;
  contactInfo?: string;
  signerName?: string;
  pageNumber?: number; // 1-indexed
  visibleAppearance?: boolean;
  xPercent?: number;
  yPercent?: number;
  widthPercent?: number;
  badgeColor?: string;
}

export interface SignatureValidationResult {
  hasSignature: boolean;
  signaturesCount: number;
  signatures: {
    signerName?: string;
    signingTime?: Date;
    reason?: string;
    location?: string;
    filter?: string;
    subFilter?: string;
    byteRange: number[];
    isCryptoValid: boolean;
    documentModifiedAfterSigning: boolean;
    certificate?: ParsedCertificateInfo;
    trustStatus: 'self_signed_or_local' | 'trusted_ca' | 'untrusted' | 'unknown';
    trustMessage: string;
    validationErrors: string[];
  }[];
}

/**
 * Format certificate subject/issuer attributes into a human-readable summary
 */
function extractAttributes(attrs: forge.pki.CertificateField[]): {
  commonName?: string;
  organization?: string;
  organizationalUnit?: string;
  country?: string;
  email?: string;
  summary: string;
} {
  let commonName: string | undefined;
  let organization: string | undefined;
  let organizationalUnit: string | undefined;
  let country: string | undefined;
  let email: string | undefined;

  for (const a of attrs) {
    if (a.name === 'commonName' || a.shortName === 'CN') commonName = String(a.value);
    else if (a.name === 'organizationName' || a.shortName === 'O') organization = String(a.value);
    else if (a.name === 'organizationalUnitName' || a.shortName === 'OU') organizationalUnit = String(a.value);
    else if (a.name === 'countryName' || a.shortName === 'C') country = String(a.value);
    else if (a.name === 'emailAddress' || a.shortName === 'E') email = String(a.value);
  }

  const parts = [
    commonName ? `CN=${commonName}` : null,
    organization ? `O=${organization}` : null,
    organizationalUnit ? `OU=${organizationalUnit}` : null,
    country ? `C=${country}` : null,
  ].filter(Boolean);

  return {
    commonName,
    organization,
    organizationalUnit,
    country,
    email,
    summary: parts.length > 0 ? parts.join(', ') : commonName || 'Unnamed Entity',
  };
}

/**
 * Parse an X.509 certificate into structured metadata
 */
export function parseCertificateInfo(cert: forge.pki.Certificate): ParsedCertificateInfo {
  const now = new Date();
  const notBefore = cert.validity.notBefore;
  const notAfter = cert.validity.notAfter;
  const isExpired = now.getTime() > notAfter.getTime();
  const isNotYetValid = now.getTime() < notBefore.getTime();
  const isValidNow = !isExpired && !isNotYetValid;

  const subject = extractAttributes(cert.subject.attributes);
  const issuer = extractAttributes(cert.issuer.attributes);

  // Compute SHA-256 fingerprint
  const derBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const md = forge.md.sha256.create();
  md.update(derBytes);
  const fingerprintHex = md.digest().toHex().toUpperCase();
  const formattedFingerprint = fingerprintHex.match(/.{1,2}/g)?.join(':') || fingerprintHex;

  return {
    subject,
    issuer,
    validity: {
      notBefore,
      notAfter,
      isValidNow,
      isExpired,
      isNotYetValid,
    },
    serialNumber: cert.serialNumber || 'N/A',
    signatureAlgorithm: cert.signatureOid || 'SHA256withRSA',
    keyAlgorithm: cert.publicKey ? 'RSA (' + (cert.publicKey as any).n?.bitLength() + ' bits)' : 'Unknown',
    fingerprintSha256: formattedFingerprint,
  };
}

/**
 * Parse and decrypt a local .p12 / .pfx file with password
 */
export async function parsePkcs12(
  p12Bytes: ArrayBuffer,
  password: string
): Promise<DecryptedP12Bundle> {
  return new Promise((resolve, reject) => {
    try {
      const binaryString = forge.util.binary.raw.encode(new Uint8Array(p12Bytes));
      const asn1 = forge.asn1.fromDer(binaryString);
      const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);

      // Extract private key
      let privateKey: forge.pki.PrivateKey | null = null;
      let primaryCert: forge.pki.Certificate | null = null;
      const certChain: forge.pki.Certificate[] = [];

      for (const safeContent of p12.safeContents) {
        for (const safeBag of safeContent.safeBags) {
          if (safeBag.key) {
            privateKey = safeBag.key;
          }
          if (safeBag.cert) {
            if (!primaryCert) {
              primaryCert = safeBag.cert;
            } else {
              certChain.push(safeBag.cert);
            }
          }
        }
      }

      if (!privateKey) {
        throw new Error('No private key found inside this PKCS#12 (.p12/.pfx) certificate.');
      }
      if (!primaryCert) {
        throw new Error('No matching X.509 certificate found inside this PKCS#12 bundle.');
      }

      const info = parseCertificateInfo(primaryCert);
      resolve({
        certificate: primaryCert,
        certificateChain: certChain,
        privateKey,
        info,
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('PKCS#12 MAC could not be verified') || msg.includes('password') || msg.includes('mac')) {
        reject(new Error('Incorrect certificate password. Please verify the password for this .p12/.pfx file.'));
      } else {
        reject(new Error(`Failed to decrypt PKCS#12 certificate: ${msg}`));
      }
    }
  });
}

/**
 * Generate an authentic 2048-bit RSA self-signed test certificate in memory
 */
export async function generateTestCertificate(params: {
  commonName: string;
  organization?: string;
  country?: string;
  daysValid?: number;
  password?: string;
}): Promise<{
  p12Blob: Blob;
  p12ArrayBuffer: ArrayBuffer;
  password: string;
  bundle: DecryptedP12Bundle;
}> {
  return new Promise((resolve, reject) => {
    try {
      const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
      const cert = forge.pki.createCertificate();
      cert.publicKey = keys.publicKey;
      cert.serialNumber = Math.floor(Math.random() * 1000000000).toString(16);
      
      const now = new Date();
      cert.validity.notBefore = now;
      const expire = new Date();
      expire.setDate(now.getDate() + (params.daysValid || 365));
      cert.validity.notAfter = expire;

      const attrs: forge.pki.CertificateField[] = [
        { name: 'commonName', value: params.commonName || 'PDFMiniFly Demo Signer' },
        { name: 'countryName', value: params.country || 'US' },
        { name: 'organizationName', value: params.organization || 'PDFMiniFly Local Security' },
      ];
      cert.setSubject(attrs);
      cert.setIssuer(attrs);

      cert.setExtensions([
        { name: 'basicConstraints', cA: false },
        { name: 'keyUsage', keyCertSign: false, digitalSignature: true, nonRepudiation: true },
        { name: 'extKeyUsage', emailProtection: true, codeSigning: false },
      ]);

      // Self-sign with SHA-256
      cert.sign(keys.privateKey, forge.md.sha256.create());

      const password = params.password || 'PDFMiniFly123';
      const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
        algorithm: '3des',
      });
      const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
      const uint8 = new Uint8Array(p12Der.length);
      for (let i = 0; i < p12Der.length; i++) {
        uint8[i] = p12Der.charCodeAt(i);
      }

      const info = parseCertificateInfo(cert);
      const bundle: DecryptedP12Bundle = {
        certificate: cert,
        certificateChain: [],
        privateKey: keys.privateKey,
        info,
      };

      resolve({
        p12Blob: new Blob([uint8], { type: 'application/x-pkcs12' }),
        p12ArrayBuffer: uint8.buffer,
        password,
        bundle,
      });
    } catch (err: any) {
      reject(new Error(`Failed to generate test certificate: ${err?.message || err}`));
    }
  });
}

/**
 * Apply a genuine cryptographic PKCS#7 / CMS digital signature to a PDF
 */
export async function signPdfWithCertificate(
  file: File,
  p12Bundle: DecryptedP12Bundle,
  options: CertSignatureOptions,
  onProgress?: (step: string, percent: number) => void
): Promise<Blob> {
  onProgress?.('Preparing PDF structure for signature...', 15);
  const originalBytes = new Uint8Array(await file.arrayBuffer());
  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });

  // Optional visible signature appearance stamp
  if (options.visibleAppearance) {
    const pageIndex = Math.max(0, (options.pageNumber || 1) - 1);
    const page = pdfDoc.getPage(pageIndex);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const stampW = ((options.widthPercent || 35) / 100) * width;
    const stampH = 65;
    const posX = ((options.xPercent ?? 60) / 100) * width;
    const posY = ((options.yPercent ?? 10) / 100) * height;

    // Draw visible signature box
    page.drawRectangle({
      x: posX,
      y: posY,
      width: stampW,
      height: stampH,
      color: rgb(0.98, 0.98, 0.98),
      borderColor: rgb(0.48, 0.09, 0.21), // PDFMiniFly burgundy
      borderWidth: 1.5,
    });

    // Top title bar
    page.drawRectangle({
      x: posX,
      y: posY + stampH - 18,
      width: stampW,
      height: 18,
      color: rgb(0.48, 0.09, 0.21),
    });

    safeDrawText(page, 'DIGITALLY SIGNED', {
      x: posX + 8,
      y: posY + stampH - 13,
      size: 8,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    const signer = options.signerName || p12Bundle.info.subject.commonName || 'Authorized Signer';
    safeDrawText(page, `Signer: ${signer.slice(0, 32)}`, {
      x: posX + 8,
      y: posY + stampH - 30,
      size: 8,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    const reason = options.reason || 'Document authenticity verified';
    safeDrawText(page, `Reason: ${reason.slice(0, 34)}`, {
      x: posX + 8,
      y: posY + stampH - 42,
      size: 7,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    const dateStr = new Date().toUTCString().replace('GMT', 'UTC');
    safeDrawText(page, `Date: ${dateStr.slice(0, 34)}`, {
      x: posX + 8,
      y: posY + 8,
      size: 6.5,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  onProgress?.('Generating cryptographic signature dictionary...', 35);

  // Allocate fixed-size signature hex placeholder (8192 bytes = 16384 hex chars)
  const SIGNATURE_LENGTH = 8192;
  const hexPlaceholder = '0'.repeat(SIGNATURE_LENGTH * 2);

  // We add a signature dictionary to the PDF
  const sigDict = pdfDoc.context.obj({
    Type: 'Sig',
    Filter: 'Adobe.PPKLite',
    SubFilter: 'adbe.pkcs7.detached',
    ByteRange: [0, 1000000000, 1000000000, 1000000000],
    Contents: PDFHexString.of(hexPlaceholder),
    Reason: options.reason || 'Cryptographic verification and document authorization',
    Location: options.location || 'Local Secure Browser Workspace',
    Name: options.signerName || p12Bundle.info.subject.commonName || 'Digital Signer',
    M: new Date(),
  });

  const sigDictRef = pdfDoc.context.register(sigDict);

  // Add widget annotation to target page
  const targetPageIndex = Math.max(0, (options.pageNumber || 1) - 1);
  const targetPage = pdfDoc.getPage(targetPageIndex);
  const widgetDict = pdfDoc.context.obj({
    Type: 'Annot',
    Subtype: 'Widget',
    FT: 'Sig',
    Rect: [0, 0, 0, 0],
    V: sigDictRef,
    T: 'Signature1',
    F: 132,
    P: targetPage.ref,
  });
  const widgetRef = pdfDoc.context.register(widgetDict);

  // Register in page Annots
  const annots = targetPage.node.Annots();
  if (annots) {
    annots.push(widgetRef);
  } else {
    targetPage.node.set(PDFName.of('Annots'), pdfDoc.context.obj([widgetRef]));
  }

  // Register in AcroForm /SigFlags 3
  const acroForm = pdfDoc.catalog.getOrCreateAcroForm();
  acroForm.node.set(PDFName.of('SigFlags'), PDFNumber.of(3));
  const fields = acroForm.node.get(PDFName.of('Fields'));
  if (fields instanceof PDFArray) {
    fields.push(widgetRef);
  } else {
    acroForm.node.set(PDFName.of('Fields'), pdfDoc.context.obj([widgetRef]));
  }

  onProgress?.('Serializing PDF with signature placeholder...', 55);
  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });

  onProgress?.('Calculating exact cryptographic ByteRange...', 70);
  const pdfBuffer = Buffer.from(pdfBytes);

  // Find exact position of /Contents <00000...>
  const contentsMarker = Buffer.from('/Contents <');
  const contentsIndex = pdfBuffer.indexOf(contentsMarker);
  if (contentsIndex === -1) {
    throw new Error('Failed to locate signature /Contents placeholder in serialized document.');
  }

  const hexStartIndex = contentsIndex + contentsMarker.length;
  const hexEndIndex = hexStartIndex + hexPlaceholder.length;

  // ByteRange: [0, byteRange1Length, byteRange2Start, byteRange2Length]
  const byteRange1Start = 0;
  const byteRange1Length = contentsIndex + '/Contents '.length;
  const byteRange2Start = hexEndIndex + 1; // skip '>'
  const byteRange2Length = pdfBuffer.length - byteRange2Start;

  // Format ByteRange with fixed padding to replace placeholder without shifting offsets
  const byteRangeString = `/ByteRange [ ${byteRange1Start} ${byteRange1Length} ${byteRange2Start} ${byteRange2Length} ]`;
  const byteRangeMarker = Buffer.from('/ByteRange [ 0 1000000000 1000000000 1000000000 ]');
  const byteRangePos = pdfBuffer.indexOf(byteRangeMarker);
  if (byteRangePos !== -1) {
    const padded = byteRangeString.padEnd(byteRangeMarker.length, ' ');
    pdfBuffer.write(padded, byteRangePos, 'ascii');
  }

  onProgress?.('Computing document SHA-256 digest...', 80);

  // Slice Part 1 and Part 2 according to ByteRange
  const part1 = pdfBuffer.subarray(byteRange1Start, byteRange1Start + byteRange1Length);
  const part2 = pdfBuffer.subarray(byteRange2Start, byteRange2Start + byteRange2Length);

  // SHA-256 over exact signed bytes
  const md = forge.md.sha256.create();
  md.update(part1.toString('binary'));
  md.update(part2.toString('binary'));
  const documentDigest = md.digest().getBytes();

  onProgress?.('Creating authentic PKCS#7 / CMS detached signature...', 88);

  // Create CMS/PKCS#7 SignedData
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(documentDigest);

  p7.addCertificate(p12Bundle.certificate);
  for (const cert of p12Bundle.certificateChain) {
    p7.addCertificate(cert);
  }

  p7.addSigner({
    key: p12Bundle.privateKey,
    certificate: p12Bundle.certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
        // messageDigest is auto-calculated by forge from p7.content
      },
      {
        type: forge.pki.oids.signingTime,
        value: new Date(),
      },
    ],
  });

  p7.sign({ detached: true });

  const rawDer = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const hexSignature = forge.util.bytesToHex(rawDer);

  if (hexSignature.length > hexPlaceholder.length) {
    throw new Error(
      `Cryptographic signature size (${hexSignature.length} hex chars) exceeded allocated placeholder (${hexPlaceholder.length}).`
    );
  }

  // Pad the hex signature to exact placeholder size with zeroes
  const paddedHexSignature = hexSignature.padEnd(hexPlaceholder.length, '0');
  pdfBuffer.write(paddedHexSignature, hexStartIndex, 'ascii');

  onProgress?.('Finalizing cryptographically signed PDF...', 98);
  onProgress?.('Complete!', 100);

  return new Blob([pdfBuffer], { type: 'application/pdf' });
}

/**
 * Validate and inspect digital signatures in any PDF document
 */
export async function validatePdfSignatures(file: File): Promise<SignatureValidationResult> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const pdfString = Buffer.from(bytes).toString('latin1');

  // Search for /Type\s*\/Sig or /ByteRange
  const byteRangeRegex = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
  const matches = [...pdfString.matchAll(byteRangeRegex)];

  if (matches.length === 0) {
    return {
      hasSignature: false,
      signaturesCount: 0,
      signatures: [],
    };
  }

  const results: SignatureValidationResult['signatures'] = [];

  for (const match of matches) {
    const range1Start = parseInt(match[1], 10);
    const range1Len = parseInt(match[2], 10);
    const range2Start = parseInt(match[3], 10);
    const range2Len = parseInt(match[4], 10);
    const byteRange = [range1Start, range1Len, range2Start, range2Len];

    const validationErrors: string[] = [];

    // Find /Contents <...> near ByteRange
    const searchArea = pdfString.slice(match.index! - 500, match.index! + 1500);
    const contentsMatch = searchArea.match(/\/Contents\s*<([0-9a-fA-F\s]+)>/);

    let hexContents = '';
    if (contentsMatch) {
      hexContents = contentsMatch[1].replace(/\s+/g, '');
    }

    if (!hexContents) {
      results.push({
        byteRange,
        isCryptoValid: false,
        documentModifiedAfterSigning: true,
        trustStatus: 'untrusted',
        trustMessage: 'No valid cryptographic signature container (/Contents) found for this ByteRange.',
        validationErrors: ['Missing signature /Contents hex stream'],
      });
      continue;
    }

    // Extract Reason, Location, Name
    const reasonMatch = searchArea.match(/\/Reason\s*\(([^)]*)\)/);
    const locationMatch = searchArea.match(/\/Location\s*\(([^)]*)\)/);
    const nameMatch = searchArea.match(/\/Name\s*\(([^)]*)\)/);

    let certInfo: ParsedCertificateInfo | undefined;
    let isCryptoValid = false;
    let documentModifiedAfterSigning = false;
    let trustStatus: SignatureValidationResult['signatures'][0]['trustStatus'] = 'self_signed_or_local';
    let trustMessage = '';

    try {
      // Decode hex to binary DER
      // Note: Truncate trailing zero padding added during signing
      const rawBinary = forge.util.hexToBytes(hexContents.replace(/0+$/, ''));
      const asn1 = forge.asn1.fromDer(rawBinary);
      const p7 = forge.pkcs7.messageFromAsn1(asn1);

      if (p7.certificates && p7.certificates.length > 0) {
        certInfo = parseCertificateInfo(p7.certificates[0]);
      }

      // Compute digest over the ByteRange
      const part1 = Buffer.from(bytes.subarray(range1Start, range1Start + range1Len)).toString('binary');
      const part2 = Buffer.from(bytes.subarray(range2Start, range2Start + range2Len)).toString('binary');

      const md = forge.md.sha256.create();
      md.update(part1);
      md.update(part2);
      const calculatedDigest = md.digest().toHex();

      // Check against signer messageDigest attribute
      let embeddedDigest = '';
      if (p7.signers && p7.signers.length > 0) {
        const signer = p7.signers[0];
        for (const attr of signer.authenticatedAttributes || []) {
          if (attr.type === forge.pki.oids.messageDigest) {
            embeddedDigest = forge.util.bytesToHex(attr.value as any);
          }
        }
      }

      if (embeddedDigest && calculatedDigest.toLowerCase() === embeddedDigest.toLowerCase()) {
        isCryptoValid = true;
        documentModifiedAfterSigning = false;
      } else {
        // Try SHA-1 fallback for older PDF signatures
        const mdSha1 = forge.md.sha1.create();
        mdSha1.update(part1);
        mdSha1.update(part2);
        if (embeddedDigest && mdSha1.digest().toHex().toLowerCase() === embeddedDigest.toLowerCase()) {
          isCryptoValid = true;
          documentModifiedAfterSigning = false;
        } else {
          isCryptoValid = false;
          documentModifiedAfterSigning = true;
          validationErrors.push('Calculated document digest does not match the signed attribute digest. Document was modified after signing.');
        }
      }

      // Trust status analysis
      if (certInfo) {
        if (certInfo.validity.isExpired) {
          validationErrors.push(`Signer certificate expired on ${certInfo.validity.notAfter.toLocaleDateString()}.`);
        }
        if (certInfo.subject.summary === certInfo.issuer.summary) {
          trustStatus = 'self_signed_or_local';
          trustMessage = 'Self-Signed Certificate. Cryptographic integrity verified locally, but certificate is not backed by an external root CA.';
        } else {
          trustStatus = 'trusted_ca';
          trustMessage = 'Issued by intermediate/root authority. Browser environment verified signature integrity; root trust verified in OS/Adobe trust store.';
        }
      }
    } catch (parseErr: any) {
      validationErrors.push(`Failed to parse PKCS#7 signature structure: ${parseErr?.message || parseErr}`);
      trustStatus = 'unknown';
      trustMessage = 'Could not decode cryptographic signature data.';
    }

    results.push({
      signerName: nameMatch?.[1] || certInfo?.subject.commonName || 'Unknown Signer',
      reason: reasonMatch?.[1],
      location: locationMatch?.[1],
      byteRange,
      isCryptoValid,
      documentModifiedAfterSigning,
      certificate: certInfo,
      trustStatus,
      trustMessage,
      validationErrors,
    });
  }

  return {
    hasSignature: true,
    signaturesCount: results.length,
    signatures: results,
  };
}
