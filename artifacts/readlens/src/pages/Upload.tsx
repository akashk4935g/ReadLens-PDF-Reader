import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Check, FileUp, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { pdfjs } from 'react-pdf';
import { getDocuments, refreshLibrary, saveDocument } from '../lib/library';
import type { ReadDocument } from '../lib/library';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export default function Upload() {
  const [,setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy,setBusy] = useState(false);
  const [drag,setDrag] = useState(false);
  const [error,setError] = useState('');
  const [success,setSuccess] = useState('');
  const [progress,setProgress] = useState('');
  async function importFile(file?: File) {
    if (!file) return;
    setError(''); setSuccess('');
    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) { setError('That file is not a PDF. Choose a .pdf document to continue.'); return; }
    if (!file.size) { setError('This PDF is empty. Choose a different file.'); return; }
    setBusy(true);
    try {
      const existing = await getDocuments();
      if (existing.some(d => d.fileName === file.name && d.size === file.size) && !window.confirm(`“${file.name}” is already in your library. Import another copy?`)) { setBusy(false); return; }
      setProgress('Reading your PDF…');
      const bytes = await file.arrayBuffer();
      if (new TextDecoder().decode(bytes.slice(0,5)) !== '%PDF-') throw new Error('This file does not have a valid PDF header. It may be damaged or renamed.');
      const task = pdfjs.getDocument({ data: new Uint8Array(bytes) });
      const pdf = await task.promise;
      if (!pdf.numPages) throw new Error('This PDF has no readable pages.');
      const pageTexts: string[] = [];
      for (let n=1;n<=pdf.numPages;n++) {
        setProgress(`Indexing page ${n} of ${pdf.numPages}…`);
        const page = await pdf.getPage(n);
        const text = await page.getTextContent();
        pageTexts.push(text.items.map(item => 'str' in item ? item.str : '').join(' ').replace(/\s+/g,' ').trim());
      }
      const now = Date.now();
      const doc: ReadDocument = { id: crypto.randomUUID(), title: file.name.replace(/\.pdf$/i,''), fileName:file.name, mimeType:'application/pdf', size:file.size, pageCount:pdf.numPages, pdfBytes:bytes, pageTexts, currentPage:1, createdAt:now, updatedAt:now, lastOpenedAt:now };
      await saveDocument(doc);
      refreshLibrary(); setSuccess(`${doc.title} is ready to read.`); setLocation(`/reader/${doc.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(msg.includes('storage') || msg.includes('Quota') ? 'There is not enough browser storage for this PDF. Remove a document in Settings or try a smaller file.' : msg || 'We could not read that PDF. It may be damaged or protected.');
    } finally { setBusy(false); setProgress(''); if (inputRef.current) inputRef.current.value=''; }
  }
  const onChange = (event:ChangeEvent<HTMLInputElement>) => importFile(event.target.files?.[0]);
  const onDrop = (event:DragEvent<HTMLDivElement>) => { event.preventDefault(); setDrag(false); importFile(event.dataTransfer.files[0]); };
  return <div className="mx-auto max-w-3xl animate-enter">
    <button onClick={() => setLocation('/')} className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="button-back-library"><ArrowLeft size={16}/> Back to library</button>
    <div className="mb-8"><div className="mb-3 text-xs font-semibold uppercase tracking-[.17em] text-primary">Bring your reading in</div><h1 className="font-display text-4xl md:text-5xl">A new page begins.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Import a PDF to read, search, and annotate. Your file never leaves this device.</p></div>
    <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={onDrop} className={`rounded-[26px] border-2 border-dashed p-8 text-center transition md:p-14 ${drag?'border-primary bg-secondary/55':'border-border bg-card'}`}>
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-primary"><FileUp size={29}/></div>
      <h2 className="mt-5 font-display text-2xl">Drop your PDF here</h2><p className="mt-2 text-sm text-muted-foreground">or choose a file from your device</p>
      <button onClick={()=>inputRef.current?.click()} disabled={busy} className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60" data-testid="button-choose-pdf">{busy?<LoaderCircle className="animate-spin" size={17}/>:<FileUp size={17}/>} Choose PDF</button>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={onChange} data-testid="input-pdf-file"/>
      <div className="mt-5 text-xs text-muted-foreground">PDF format · Text indexing happens on this device</div>
    </div>
    {busy && <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm" role="status" data-testid="status-import-progress"><LoaderCircle size={17} className="animate-spin text-primary"/>{progress}</div>}
    {error && <div role="alert" className="mt-4 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground" data-testid="status-import-error"><X size={18} className="shrink-0 text-destructive"/>{error}</div>}
    {success && <div className="mt-4 flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm" data-testid="status-import-success"><Check size={18} className="text-primary"/>{success}</div>}
    <div className="mt-7 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={17} className="text-primary"/>Private from the start</div><p className="mt-2 text-xs leading-5 text-muted-foreground">PDF bytes and extracted text are stored in browser IndexedDB. There is no cloud upload or account.</p></div><div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Check size={17} className="text-primary"/>Original stays untouched</div><p className="mt-2 text-xs leading-5 text-muted-foreground">Highlights, comments, and reading progress are kept separately from your PDF.</p></div></div>
  </div>;
}
