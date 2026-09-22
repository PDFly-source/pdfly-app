'use client';

import React, { useState, useEffect } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { FileNameInput } from '@/components/toolkit/FileNameInput';
import { extractTablesFromPdf, DetectedTable } from '@/lib/table-extraction';
import { buildXlsx, buildCsvBlob, XlsxCell } from '@/lib/xlsx-writer';
import { getPdfDocumentFromFile } from '@/lib/pdfjs-init';
import { triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import { parsePageRange } from '@/lib/pdf-engine';
import { Table2, FileSpreadsheet, AlertTriangle, CheckCircle2, RefreshCw, Download, Columns3, Trash2 } from 'lucide-react';

/**
 * Editable table editor — remounts (fresh state) whenever a different table
 * is selected, avoiding setState-in-effect cascades.
 */
const TableEditor: React.FC<{
  initialRows: string[][];
  onGridChange: (grid: string[][]) => void;
}> = ({ initialRows, onGridChange }) => {
  const [grid, setGrid] = useState<string[][]>(initialRows);
  const emit = (next: string[][]) => { setGrid(next); onGridChange(next); };
  const updateCell = (r: number, c: number, value: string) =>
    emit(grid.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row)));
  const removeColumn = (c: number) => emit(grid.map((row) => row.filter((_, ci) => ci !== c)));
  const moveColumn = (c: number, dir: -1 | 1) =>
    emit(
      grid.map((row) => {
        const target = c + dir;
        if (target < 0 || target >= row.length) return row;
        const copy = [...row];
        [copy[c], copy[target]] = [copy[target], copy[c]];
        return copy;
      })
    );
  const maxCols = grid[0]?.length ?? 0;
  return (
    <div className="overflow-x-auto rounded-lg border max-h-96 overflow-y-auto">
      <table className="w-full text-xs">
        <tbody>
          {grid.map((row, r) => (
            <tr key={r} className={r === 0 ? 'bg-muted/60 font-bold' : 'border-t'}>
              {row.map((cell, c) => (
                <td key={c} className="border-r px-1 py-0.5 min-w-[90px]">
                  <input
                    value={cell}
                    onChange={(e) => updateCell(r, c, e.target.value)}
                    aria-label={`Cell row ${r + 1} column ${c + 1}`}
                    className="w-full bg-transparent px-1.5 py-1 outline-none focus:bg-accent rounded"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-2 items-center p-2 border-t">
        <span className="text-xs font-semibold text-muted-foreground mr-1">Columns:</span>
        {Array.from({ length: maxCols }, (_, c) => (
          <span key={c} className="inline-flex items-center gap-1 rounded-lg border px-1 py-1 text-xs">
            {`Col ${c + 1}`}
            <button onClick={() => moveColumn(c, -1)} aria-label={`Move column ${c + 1} left`} className="px-1 hover:text-primary font-bold">←</button>
            <button onClick={() => moveColumn(c, 1)} aria-label={`Move column ${c + 1} right`} className="px-1 hover:text-primary font-bold">→</button>
            <button onClick={() => removeColumn(c)} aria-label={`Remove column ${c + 1}`} className="px-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * PDF → Excel / CSV — local table detection with editable preview.
 * PRIVATE. POWERFUL. LOCAL.
 */
export const PdfToExcelWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pageRange, setPageRange] = useState('');
  const [tables, setTables] = useState<DetectedTable[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState(0);

  const [hasHeader, setHasHeader] = useState(true);

  const [fileName, setFileName] = useState('extracted-table');
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [delimiter, setDelimiter] = useState<string>(',');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [processStep, setProcessStep] = useState('Detecting tables...');
  const [progressPct, setProgressPct] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ rows: number; cols: number; size: number } | null>(null);
  // live editable copy of the selected table (kept in sync by TableEditor)
  const [exportGrid, setExportGrid] = useState<string[][]>([]);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const reset = () => {
    setFile(null); setTables([]); setExportGrid([]); setNotes([]); setResult(null); setResultBlob(null);
    setErrorMessage(null); setSelectedTable(0); setPageRange('');
  };

  const handleFileSelected = async (files: File[]) => {
    if (!files?.length) return;
    reset();
    setFile(files[0]);
    setFileName(`${files[0].name.replace(/\.pdf$/i, '')}_table`);
  };

  // scan when file/pageRange set
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    (async () => {
      setIsScanning(true);
      setErrorMessage(null);
      try {
        const buf = await file.arrayBuffer();
        const doc = await getPdfDocumentFromFile(buf);
        if (cancelled) return;
        setTotalPages(doc.numPages);

        const range = pageRange.trim()
          ? [...parsePageRange(pageRange, doc.numPages)].sort((a, b) => a - b)
          : Array.from({ length: doc.numPages }, (_, i) => i + 1);

        const res = await extractTablesFromPdf(doc, range, (msg, pct) => {
          if (!cancelled) { setProcessStep(msg); setProgressPct(pct); }
        });
        if (cancelled) return;

        setTables(res.tables);
        setNotes(res.notes);
        if (res.tables.length === 0) {
          setErrorMessage(
            'No reliable table structure was detected on the selected pages. If this document is a scan or has a complex layout, run the OCR PDF tool first, then try again. Table detection is heuristic — accuracy is not guaranteed.'
          );
        } else {
          setSelectedTable(0);
        }
      } catch (err: any) {
        if (!cancelled) setErrorMessage(err?.message || 'Failed to read the PDF.');
      } finally {
        if (!cancelled) setIsScanning(false);
      }
    })();
    return () => { cancelled = true; };
  }, [file, pageRange]);

  const handleExport = async () => {
    const grid = exportGrid;
    if (!grid.length) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      let blob: Blob;
      if (format === 'xlsx') {
        const rowsTyped: XlsxCell[][] = grid.map((row) =>
          row.map((text) => ({
            value: text,
            type: /[-/.]/.test(text) && !isNaN(Date.parse(text)) && /\d{4}|\d{2}[-/.]\d{2}/.test(text)
              ? ('date' as const)
              : /^[-+(),.$₹€£¥%\s\d]+$/.test(text.trim()) && text.trim() && !isNaN(Number(text.replace(/[^-\d.]/g, '')))
                ? ('number' as const)
                : ('string' as const),
          }))
        );
        blob = await buildXlsx([
          {
            headerRow: hasHeader ? grid[0] : null,
            rows: rowsTyped,
            sheetName: fileName.slice(0, 28) || 'Table',
          },
        ]);
      } else {
        blob = buildCsvBlob(grid, delimiter);
      }
      setResultBlob(blob);
      setResult({ rows: grid.length, cols: grid[0]?.length ?? 0, size: blob.size });
      addRecentJob({
        toolId: 'pdf-to-excel',
        toolName: 'PDF to Excel / CSV',
        fileName: fileName + (format === 'xlsx' ? '.xlsx' : '.csv'),
        fileSize: blob.size,
        status: 'completed',
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Export failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (resultBlob) triggerDownload(resultBlob, `${fileName}.${format === 'xlsx' ? 'xlsx' : 'csv'}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!file && (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          label="Drop your PDF here"
          sublabel="Bank statements, invoices, marksheets, attendance sheets — tables are detected locally"
        />
      )}

      {file && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0">
              <p className="truncate font-bold text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}{totalPages ? ` • ${totalPages} pages` : ''}</p>
            </div>
            <button onClick={reset} className="shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px]">
              <RefreshCw className="h-4 w-4" /> New file
            </button>
          </div>

          {isScanning && <ProcessingModal isOpen stepName={processStep} percentage={progressPct} fileName={file.name} />}

          <div className="rounded-xl border bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground">Pages to scan (blank = all, e.g. 1-3, 5)</label>
            <input
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              placeholder={`e.g. 1-${Math.max(1, totalPages)}`}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {tables.length > 0 && (
            <>
              {tables.length > 1 && (
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Detected tables — select one</p>
                  <div className="flex flex-wrap gap-2">
                    {tables.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedTable(i)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold min-h-[44px] ${i === selectedTable ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                      >
                        Page {t.pageIndex + 1} • {t.rows.length}×{t.columnCount} {t.hasHeaderRow ? '(header)' : ''} • {Math.round(t.confidence * 100)}% structure
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold inline-flex items-center gap-2">
                    <Table2 className="h-4 w-4 text-primary" /> Preview — {exportGrid.length} rows, {exportGrid[0]?.length ?? 0} columns
                  </p>
                  <label className="inline-flex items-center gap-2 text-xs font-medium">
                    <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="h-4 w-4 accent-[#6D1F35]" />
                    First row is a header
                  </label>
                </div>

                <TableEditor
                  key={selectedTable}
                  initialRows={tables[selectedTable].rows.map((r) => r.map((c) => c.text))}
                  onGridChange={setExportGrid}
                />

              </div>

              <div className="rounded-xl border bg-card p-4 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FileNameInput
                    label="Output filename"
                    value={fileName}
                    onChange={setFileName}
                    extension={format === 'xlsx' ? '.xlsx' : '.csv'}
                    hint="Saved to your device only"
                  />
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Format</label>
                    <div className="flex gap-2">
                      {(['xlsx', 'csv'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFormat(f)}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold min-h-[44px] ${format === f ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                        >
                          {f === 'xlsx' ? 'Excel (.xlsx)' : 'CSV (.csv)'}
                        </button>
                      ))}
                    </div>
                    {format === 'csv' && (
                      <select
                        value={delimiter}
                        onChange={(e) => setDelimiter(e.target.value)}
                        aria-label="CSV delimiter"
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      >
                        <option value=",">Comma ( , )</option>
                        <option value=";">Semicolon ( ; )</option>
                        <option value="tab">Tab</option>
                      </select>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleExport}
                  disabled={isProcessing || !exportGrid.length}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[48px]"
                >
                  {isProcessing ? 'Building file…' : `Export as ${format === 'xlsx' ? 'Excel' : 'CSV'}`}
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {notes.length > 0 && (
            <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/20 p-4 text-xs space-y-1">
              <p className="font-bold inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Detection notes</p>
              {notes.map((n, i) => <p key={i}>{n}</p>)}
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {result && resultBlob && (
            <SuccessView
              fileName={`${fileName}.${format === 'xlsx' ? 'xlsx' : 'csv'}`}
              fileSize={result.size}
              title="Table exported"
              downloadLabel="Download"
              onDownload={handleDownload}
              onReset={reset}
              resetLabel="Convert another"
              additionalNote={`${result.rows} rows × ${result.cols} columns — processed 100% locally.`}
            />
          )}
        </>
      )}
    </div>
  );
};
