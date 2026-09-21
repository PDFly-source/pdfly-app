'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import {
  parsePkcs12,
  generateTestCertificate,
  signPdfWithCertificate,
  validatePdfSignatures,
  DecryptedP12Bundle,
  CertSignatureOptions,
  SignatureValidationResult,
} from '@/lib/pdf-crypto';
import { triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  ShieldCheck,
  Key,
  Lock,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Sparkles,
  Calendar,
  Layers,
  FileText,
  Clock,
  Award,
} from 'lucide-react';

export const DigitalCertificateSignatureWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sign' | 'validate'>('sign');

  // ==========================================
  // SIGNING STATE
  // ==========================================
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [isDecryptingCert, setIsDecryptingCert] = useState(false);
  const [p12Bundle, setP12Bundle] = useState<DecryptedP12Bundle | null>(null);
  const [certError, setCertError] = useState<string | null>(null);

  // Signing Options
  const [signerName, setSignerName] = useState('');
  const [signingReason, setSigningReason] = useState('I approve and authenticate this document');
  const [signingLocation, setSigningLocation] = useState('Local Secure Client');
  const [visibleAppearance, setVisibleAppearance] = useState(true);
  const [signPageNumber, setSignPageNumber] = useState(1);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Generating cryptographic signature...');
  const [progressPct, setProgressPct] = useState(0);

  const [signedBlob, setSignedBlob] = useState<Blob | null>(null);
  const [signedFileName, setSignedFileName] = useState('');
  const [signError, setSignError] = useState<string | null>(null);

  // ==========================================
  // VALIDATION STATE
  // ==========================================
  const [inspectFile, setInspectFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<SignatureValidationResult | null>(null);
  const [validateError, setValidateError] = useState<string | null>(null);

  // Handler: PDF file selected for signing
  const handlePdfSelected = (files: File[]) => {
    if (!files || files.length === 0) return;
    setPdfFile(files[0]);
    setSignError(null);
  };

  // Handler: Certificate file selected
  const handleCertSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setCertFile(file);
    setP12Bundle(null);
    setCertError(null);
  };

  // Handler: Decrypt Certificate
  const handleDecryptCert = async () => {
    if (!certFile) return;
    setCertError(null);
    setIsDecryptingCert(true);

    try {
      const buffer = await certFile.arrayBuffer();
      const bundle = await parsePkcs12(buffer, certPassword);
      setP12Bundle(bundle);
      if (!signerName && bundle.info.subject.commonName) {
        setSignerName(bundle.info.subject.commonName);
      }
    } catch (err: any) {
      setCertError(err?.message || 'Failed to decrypt certificate.');
    } finally {
      setIsDecryptingCert(false);
    }
  };

  // Handler: Generate Built-in In-Memory Test Certificate
  const handleGenerateTestCert = async () => {
    setCertError(null);
    setIsDecryptingCert(true);

    try {
      const testName = 'PDFMiniFly Local Signer';
      const testPass = 'PDFMiniFlyDemo123';
      const generated = await generateTestCertificate({
        commonName: testName,
        organization: 'PDFMiniFly Local Security',
        country: 'US',
        daysValid: 365,
        password: testPass,
      });

      const syntheticFile = new File([generated.p12Blob], 'test-certificate.p12', {
        type: 'application/x-pkcs12',
      });

      setCertFile(syntheticFile);
      setCertPassword(testPass);
      setP12Bundle(generated.bundle);
      setSignerName(testName);
    } catch (err: any) {
      setCertError(err?.message || 'Failed to generate test certificate.');
    } finally {
      setIsDecryptingCert(false);
    }
  };

  // Handler: Sign PDF
  const handleSignPdf = async () => {
    if (!pdfFile || !p12Bundle) return;
    setSignError(null);
    setIsProcessing(true);
    setProgressPct(10);

    try {
      const outBlob = await signPdfWithCertificate(
        pdfFile,
        p12Bundle,
        {
          signerName: signerName || p12Bundle.info.subject.commonName,
          reason: signingReason,
          location: signingLocation,
          visibleAppearance,
          pageNumber: signPageNumber,
        },
        (step, pct) => {
          setProcessStep(step);
          setProgressPct(pct);
        }
      );

      const baseName = pdfFile.name.replace(/\.pdf$/i, '');
      const outName = `${baseName}_signed.pdf`;
      setSignedBlob(outBlob);
      setSignedFileName(outName);

      addRecentJob({
        toolId: 'sign-pdf-cert',
        toolName: 'Digital Certificate Signature',
        fileName: outName,
        fileSize: outBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setSignError(err?.message || 'Failed to generate cryptographic digital signature.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler: Validate Signatures in an uploaded PDF
  const handleValidatePdf = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setInspectFile(file);
    setValidateError(null);
    setIsValidating(true);

    try {
      const res = await validatePdfSignatures(file);
      setValidationResult(res);
    } catch (err: any) {
      setValidateError(err?.message || 'Failed to inspect signatures in this document.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDownload = () => {
    if (signedBlob && signedFileName) {
      triggerDownload(signedBlob, signedFileName);
    }
  };

  const handleResetSign = () => {
    setPdfFile(null);
    setCertFile(null);
    setCertPassword('');
    setP12Bundle(null);
    setSignedBlob(null);
    setSignedFileName('');
    setSignError(null);
  };

  if (signedBlob && pdfFile) {
    return (
      <SuccessView
        fileName={signedFileName}
        fileSize={signedBlob.size}
        downloadLabel="Download Cryptographically Signed PDF"
        onDownload={handleDownload}
        onReset={handleResetSign}
        additionalNote="Authentic PKCS#7 / CMS digital signature embedded into PDF ByteRange. Document tampering will invalidate this cryptographic seal."
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Mode Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1.5 rounded-2xl bg-secondary/60 border border-border/50">
          <button
            type="button"
            onClick={() => setActiveTab('sign')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'sign'
                ? 'bg-card text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Key className="w-4 h-4 text-burgundy" />
            Sign Document (.p12 / .pfx)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('validate')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'validate'
                ? 'bg-card text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Search className="w-4 h-4 text-burgundy" />
            Validate & Inspect Signatures
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* TAB 1: SIGN DOCUMENT                       */}
      {/* ========================================== */}
      {activeTab === 'sign' && (
        <div className="space-y-6">
          {/* STEP 1: Select PDF */}
          {!pdfFile ? (
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Step 1: Select Document to Sign
              </span>
              <FileDropzone
                onFilesSelected={handlePdfSelected}
                multiple={false}
                accept=".pdf,application/pdf"
                title="Drop PDF document here"
                subtitle="Document bytes are hashed and signed 100% locally in your browser"
              />
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-border/40 bg-card/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-burgundy/10 text-burgundy">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{pdfFile.name}</h4>
                  <span className="text-xs text-muted-foreground">{formatBytes(pdfFile.size)}</span>
                </div>
              </div>
              <button
                onClick={() => setPdfFile(null)}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Change document
              </button>
            </div>
          )}

          {/* STEP 2: Certificate Selection & Decryption */}
          {pdfFile && !p12Bundle && (
            <div className="p-6 rounded-2xl border border-border/50 bg-card/60 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Key className="w-4 h-4 text-burgundy" />
                    Step 2: Provide PKCS#12 (.p12 / .pfx) Digital Certificate
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your certificate and private key are decrypted in memory and never uploaded.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateTestCert}
                  disabled={isDecryptingCert}
                  className="px-3 py-1.5 rounded-lg bg-burgundy/10 hover:bg-burgundy/20 text-burgundy text-xs font-semibold border border-burgundy/20 flex items-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Local Test Certificate
                </button>
              </div>

              {!certFile ? (
                <FileDropzone
                  onFilesSelected={handleCertSelected}
                  multiple={false}
                  accept=".p12,.pfx,application/x-pkcs12"
                  title="Drop your .p12 or .pfx certificate file here"
                  subtitle="Standard PKCS#12 bundle containing your X.509 certificate and RSA private key"
                />
              ) : (
                <div className="space-y-4 p-4 rounded-xl border border-border/40 bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      {certFile.name} ({formatBytes(certFile.size)})
                    </span>
                    <button
                      onClick={() => setCertFile(null)}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Choose different file
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Certificate Password:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={certPassword}
                        onChange={(e) => setCertPassword(e.target.value)}
                        placeholder="Enter password to unlock private key"
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-burgundy"
                      />
                      <button
                        type="button"
                        onClick={handleDecryptCert}
                        disabled={isDecryptingCert}
                        className="px-5 py-2 rounded-lg bg-burgundy hover:bg-burgundy-light text-white text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        {isDecryptingCert ? 'Decrypting...' : 'Unlock Certificate'}
                      </button>
                    </div>
                  </div>

                  {certError && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{certError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Certificate Details Card & Signing Options */}
          {pdfFile && p12Bundle && (
            <div className="space-y-6">
              {/* Parsed Certificate Card */}
              <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Certificate Unlocked & Verified
                    </span>
                  </div>
                  <button
                    onClick={() => setP12Bundle(null)}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Change Certificate
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1 border-t border-emerald-500/20">
                  <div>
                    <span className="text-muted-foreground block">Subject (Signer):</span>
                    <span className="font-semibold text-foreground block mt-0.5">
                      {p12Bundle.info.subject.summary}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Issuer Authority:</span>
                    <span className="font-semibold text-foreground block mt-0.5">
                      {p12Bundle.info.issuer.summary}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Validity Window:</span>
                    <span className="text-foreground block mt-0.5">
                      {p12Bundle.info.validity.notBefore.toLocaleDateString()} —{' '}
                      {p12Bundle.info.validity.notAfter.toLocaleDateString()}{' '}
                      <span className="inline-block ml-1 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium">
                        {p12Bundle.info.validity.isValidNow ? 'Active' : 'Expired'}
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Key Specification:</span>
                    <span className="font-mono text-foreground block mt-0.5">
                      {p12Bundle.info.keyAlgorithm} • SHA-256
                    </span>
                  </div>
                </div>
              </div>

              {/* Signing Parameters */}
              <div className="p-5 rounded-2xl border border-border/50 bg-card/60 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Signing Metadata & Appearance
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Signer Display Name</label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-burgundy"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Signing Location</label>
                    <input
                      type="text"
                      value={signingLocation}
                      onChange={(e) => setSigningLocation(e.target.value)}
                      placeholder="e.g. New York, USA"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-burgundy"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Signing Reason</label>
                  <input
                    type="text"
                    value={signingReason}
                    onChange={(e) => setSigningReason(e.target.value)}
                    placeholder="e.g. Document approval and authenticity verification"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-burgundy"
                  />
                </div>

                {/* Visible appearance checkbox */}
                <div className="pt-2 border-t border-border/40">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={visibleAppearance}
                      onChange={(e) => setVisibleAppearance(e.target.checked)}
                      className="w-4 h-4 rounded text-burgundy accent-burgundy"
                    />
                    <span className="text-xs font-medium text-foreground">
                      Embed visible signature stamp on page (displays signer name, date, and security seal)
                    </span>
                  </label>
                </div>
              </div>

              {signError && (
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{signError}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleSignPdf}
                className="w-full py-4 px-6 rounded-xl bg-burgundy hover:bg-burgundy-light text-white font-semibold shadow-lg shadow-burgundy/20 hover:shadow-burgundy/30 transition-all flex items-center justify-center gap-2 text-base"
              >
                <ShieldCheck className="w-5 h-5" />
                Apply Cryptographic Digital Signature
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: VALIDATE & INSPECT SIGNATURES       */}
      {/* ========================================== */}
      {activeTab === 'validate' && (
        <div className="space-y-6">
          <FileDropzone
            onFilesSelected={handleValidatePdf}
            multiple={false}
            accept=".pdf,application/pdf"
            title="Drop signed PDF to verify digital signatures"
            subtitle="Analyzes embedded PKCS#7 / CMS ByteRange signatures, certificate validity, and document tampering"
          />

          {isValidating && (
            <div className="p-8 rounded-2xl border border-border/50 bg-card/60 text-center space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-burgundy border-t-transparent animate-spin mx-auto" />
              <p className="text-sm font-medium text-foreground">Verifying document cryptographic integrity...</p>
              <p className="text-xs text-muted-foreground">Calculating SHA-256 ByteRange hash and checking certificate attributes</p>
            </div>
          )}

          {validationResult && inspectFile && !isValidating && (
            <div className="p-6 rounded-2xl border border-border/50 bg-card/60 space-y-6">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div>
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    {inspectFile.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{formatBytes(inspectFile.size)}</p>
                </div>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-mono font-bold ${
                    validationResult.hasSignature
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {validationResult.signaturesCount} Signature(s) Found
                </span>
              </div>

              {!validationResult.hasSignature ? (
                <div className="p-6 rounded-xl border border-border/50 bg-secondary/30 text-center space-y-2">
                  <HelpCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm font-medium text-foreground">No Digital Signatures Found</p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    This document contains no embedded ISO 32000 cryptographic signature fields (/Type /Sig). Visual ink drawings or standard text stamps without PKCS#7 ByteRanges are not cryptographic digital signatures.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {validationResult.signatures.map((sig, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl border border-border/60 bg-secondary/20 space-y-4"
                    >
                      {/* Integrity Status Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {sig.isCryptoValid ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive shrink-0" />
                          )}
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">
                              Signature #{idx + 1}: {sig.signerName || 'Authorized Signer'}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {sig.isCryptoValid
                                ? 'Cryptographic integrity verified: Document has not been modified since signed.'
                                : 'Document modified or tampered with after signing. Cryptographic hash mismatch.'}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium self-start sm:self-auto ${
                            sig.isCryptoValid
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-destructive/10 text-destructive border border-destructive/20'
                          }`}
                        >
                          {sig.isCryptoValid ? 'Valid Signature' : 'Modified / Invalid'}
                        </span>
                      </div>

                      {/* Certificate & Verification Details */}
                      {sig.certificate && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg bg-card/60 border border-border/40 text-xs">
                          <div>
                            <span className="text-muted-foreground block">Signer Certificate:</span>
                            <span className="font-semibold text-foreground block mt-0.5">
                              {sig.certificate.subject.summary}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Issuer Authority:</span>
                            <span className="font-semibold text-foreground block mt-0.5">
                              {sig.certificate.issuer.summary}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Validity Range:</span>
                            <span className="text-foreground block mt-0.5">
                              {sig.certificate.validity.notBefore.toLocaleDateString()} —{' '}
                              {sig.certificate.validity.notAfter.toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Algorithm:</span>
                            <span className="font-mono text-foreground block mt-0.5">
                              {sig.certificate.keyAlgorithm}
                            </span>
                          </div>
                          {sig.reason && (
                            <div className="sm:col-span-2">
                              <span className="text-muted-foreground block">Signing Reason:</span>
                              <span className="text-foreground block mt-0.5 italic">{sig.reason}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Trust Explanation Note */}
                      <div className="p-3 rounded-lg bg-secondary/40 border border-border/30 text-[11px] text-muted-foreground space-y-1">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-burgundy" />
                          Trust Environment Assessment
                        </div>
                        <p>{sig.trustMessage}</p>
                        <p className="text-muted-foreground/80">
                          Notice: Browsers operate in a sandboxed execution context without direct access to your local operating system or Adobe Acrobat Root CA trust stores. Cryptographic integrity guarantees byte-level document non-repudiation.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Processing Modal */}
      <ProcessingModal
        isOpen={isProcessing}
        stepText={processStep}
        progressPercentage={progressPct}
      />
    </div>
  );
};
