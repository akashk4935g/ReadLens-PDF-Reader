import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Document as PdfDocument, Page as PdfPage } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import '../lib/pdfjs';
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, Highlighter, MessageSquare, Minus, Plus, Sparkles, X } from 'lucide-react';
import { getAnnotations, getDocument, refreshLibrary, removeAnnotation, saveAnnotation, saveDocument } from '../lib/library';
import type { Annotation, AnnotationType, HighlightRect, ReadDocument } from '../lib/library';
const kinds: {key:AnnotationType;label:string;dot:string}[] = [
  {key:'normal',label:'Highlight',dot:'bg-amber-300'},{key:'important',label:'Important',dot:'bg-rose-400'},{key:'definition',label:'Definition',dot:'bg-sky-400'},{key:'question',label:'Question',dot:'bg-violet-400'},{key:'confusing',label:'Confusing',dot:'bg-orange-400'},{key:'idea',label:'Idea',dot:'bg-emerald-400'}
];
const highlightColors: Record<AnnotationType, string> = {
  normal: 'rgba(246, 199, 83, .42)',
  important: 'rgba(244, 114, 128, .36)',
  definition: 'rgba(90, 184, 221, .34)',
  question: 'rgba(168, 139, 236, .34)',
  confusing: 'rgba(251, 146, 60, .34)',
  idea: 'rgba(52, 190, 133, .34)',
};

export default function Reader() {
  const [, params] = useRoute('/reader/:documentId');
  const [,setLocation] = useLocation();
  const id = params?.documentId || '';
  const [doc,setDoc] = useState<ReadDocument|null>(null);
  const [annotations,setAnnotations] = useState<Annotation[]>([]);
  const [page,setPage] = useState(1);
  const [width,setWidth] = useState(760);
  const [selected,setSelected] = useState('');
  const [comment,setComment] = useState('');
  const [kind,setKind] = useState<AnnotationType>('normal');
  const [showTools,setShowTools] = useState(false);
  const [composing,setComposing] = useState(false);
  const [error,setError] = useState('');
  const [zoom,setZoom] = useState(100);
  const [aiNotice,setAiNotice] = useState(false);
  const load = useCallback(async () => {
    try {
      const [found,all] = await Promise.all([getDocument(id),getAnnotations()]);
      if (!found) { setError('This document is no longer in your library.'); return; }
      setDoc(found); setPage(found.currentPage || 1); setAnnotations(all.filter(a=>a.documentId===id));
      const requestedPage = Number(new URLSearchParams(window.location.search).get('page'));
      if (requestedPage > 0) setPage(Math.min(found.pageCount, requestedPage));
      const now=Date.now(); await saveDocument({...found,lastOpenedAt:now,updatedAt:now});
    } catch { setError('Could not open this document from browser storage.'); }
  },[id]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{const update=()=>setWidth(Math.min(850,Math.max(300,window.innerWidth-420))); update(); window.addEventListener('resize',update); return()=>window.removeEventListener('resize',update);},[]);
  useEffect(()=>{if(!doc)return; const t=window.setTimeout(()=>{saveDocument({...doc,currentPage:page,lastOpenedAt:Date.now(),updatedAt:Date.now()}).then(refreshLibrary).catch(()=>setError('Reading position could not be saved. Check available storage.'));},250); return()=>clearTimeout(t);},[page,doc]);
  const pageNotes = useMemo(()=>annotations.filter(a=>a.pageNumber===page),[annotations,page]);
  const pdfFile = useMemo(()=>doc ? {data:new Uint8Array(doc.pdfBytes)} : null,[doc]);
  const onSelect = () => {
    const text = window.getSelection()?.toString().trim() || '';
    if (text) { setSelected(text); setShowTools(true); setComposing(false); }
  };
  function getSelectionRects(): HighlightRect[] {
    const selection = window.getSelection();
    const pageElement = document.querySelector('.pdf-page .react-pdf__Page');
    if (!selection?.rangeCount || !pageElement) return [];
    const bounds = pageElement.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return [];
    return Array.from(selection.getRangeAt(0).getClientRects())
      .filter(rect => rect.width > 0 && rect.height > 0)
      .map(rect => {
        const left = Math.max(0, Math.min(1, (rect.left - bounds.left) / bounds.width));
        const top = Math.max(0, Math.min(1, (rect.top - bounds.top) / bounds.height));
        const right = Math.max(left, Math.min(1, (rect.right - bounds.left) / bounds.width));
        const bottom = Math.max(top, Math.min(1, (rect.bottom - bounds.top) / bounds.height));
        return { x: left, y: top, width: right - left, height: bottom - top };
      });
  }
  async function copyText() {
    if (!selected) return;
    try { await navigator.clipboard.writeText(selected); setShowTools(false); } catch { setError('Clipboard access was unavailable. Select and copy the text with your keyboard.'); }
  }
  async function addNote() {
    if (!doc || !selected) return;
    const now=Date.now();
    const item:Annotation={id:crypto.randomUUID(),documentId:id,pageNumber:page,selectedText:selected,type:kind,comment,rects:getSelectionRects(),createdAt:now,updatedAt:now};
    try { await saveAnnotation(item); setAnnotations(prev=>[item,...prev]); setSelected('');setComment('');setShowTools(false);setComposing(false);window.getSelection()?.removeAllRanges(); }
    catch { setError('Your note could not be saved. Browser storage may be full.'); }
  }
  async function editNote(note:Annotation) {
    const next=window.prompt('Edit your comment',note.comment);
    if(next===null)return;
    const updated={...note,comment:next,updatedAt:Date.now()};
    try{await saveAnnotation(updated);setAnnotations(prev=>prev.map(a=>a.id===note.id?updated:a));}catch{setError('Could not save that comment.');}
  }
  async function deleteNote(note:Annotation) {
    if(!window.confirm('Delete this annotation and its comment?'))return;
    await removeAnnotation(note.id);setAnnotations(prev=>prev.filter(a=>a.id!==note.id));
  }
  if(error && !doc) return <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center"><h1 className="font-display text-3xl">Document unavailable</h1><p className="mt-3 text-sm text-muted-foreground">{error}</p><button onClick={()=>setLocation('/')} className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" data-testid="button-reader-library">Back to library</button></div>;
  if(!doc)return <div className="mx-auto max-w-3xl animate-pulse"><div className="mb-6 h-9 w-60 rounded-lg bg-muted"/><div className="h-[65vh] rounded-2xl bg-card"/></div>;
  const total=doc.pageCount;
  return <div className="animate-enter -mx-5 -mt-8 md:-mx-10 md:-mt-11">
    <div className="sticky top-[68px] z-10 flex min-h-[58px] flex-wrap items-center gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur md:px-6">
      <button onClick={()=>setLocation('/')} className="mr-1 rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Back to library" data-testid="button-reader-back"><ArrowLeft size={18}/></button>
      <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{doc.title}</div><div className="hidden text-[10px] text-muted-foreground sm:block">{doc.fileName}</div></div>
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1"><button onClick={()=>setZoom(Math.max(60,zoom-10))} className="rounded p-1.5 hover:bg-muted" aria-label="Zoom out" data-testid="button-zoom-out"><Minus size={15}/></button><span className="w-10 text-center font-mono text-[11px]">{zoom}%</span><button onClick={()=>setZoom(Math.min(160,zoom+10))} className="rounded p-1.5 hover:bg-muted" aria-label="Zoom in" data-testid="button-zoom-in"><Plus size={15}/></button></div>
      <div className="flex items-center rounded-lg border border-border bg-card p-1"><button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} aria-label="Previous page" className="rounded p-1.5 hover:bg-muted disabled:opacity-30" data-testid="button-page-previous"><ChevronLeft size={17}/></button><input aria-label="Page number" className="w-10 bg-transparent text-center font-mono text-xs outline-none" type="number" min={1} max={total} value={page} onChange={e=>setPage(Math.max(1,Math.min(total,Number(e.target.value)||1)))} data-testid="input-page-number"/><span className="pr-1 text-xs text-muted-foreground">/ {total}</span><button disabled={page>=total} onClick={()=>setPage(p=>Math.min(total,p+1))} aria-label="Next page" className="rounded p-1.5 hover:bg-muted disabled:opacity-30" data-testid="button-page-next"><ChevronRight size={17}/></button></div>
      <button onClick={()=>setAiNotice(v=>!v)} className="flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-muted" data-testid="button-ai-help"><Sparkles size={15}/> <span className="hidden sm:inline">Ask about this</span><span className="sm:hidden">AI</span></button>
    </div>
     {aiNotice && <div className="mx-4 mt-3 flex items-start justify-between gap-3 rounded-xl border border-accent/60 bg-accent/20 p-3 text-xs leading-5 md:mx-6" data-testid="status-ai-unavailable"><div><strong>AI help isn’t enabled in this release.</strong> This reader has no AI provider connected. Reading, search, and annotations work without it. If AI is added later, only selected text and relevant context should be sent.</div><button onClick={()=>setAiNotice(false)} aria-label="Close message" data-testid="button-close-ai-message"><X size={15}/></button></div>}
    {error && <div className="mx-4 mt-3 rounded-lg bg-destructive/10 p-3 text-xs" role="alert" data-testid="status-reader-error">{error}<button onClick={()=>setError('')} className="ml-2 underline" data-testid="button-dismiss-reader-error">Dismiss</button></div>}
    <div className="grid min-h-[calc(100dvh-126px)] xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 bg-[#e9e5d9] px-3 py-6 md:px-7 md:py-8 dark:bg-muted">
        <div className="mx-auto flex min-h-[70vh] max-w-[900px] justify-center">
          <PdfDocument file={pdfFile!} onLoadError={()=>setError('This PDF could not be rendered. The stored file may be damaged.')} loading={<div className="m-auto flex flex-col items-center gap-3 text-sm text-muted-foreground"><div className="h-[420px] w-[min(78vw,760px)] animate-pulse rounded-sm bg-card"/><span>Opening page…</span></div>} error={<div className="m-auto rounded-xl bg-card p-6 text-sm">Unable to render this PDF.</div>}>
            <div className="pdf-page relative max-w-full" onMouseUp={onSelect} onTouchEnd={onSelect}><PdfPage pageNumber={page} width={Math.round(width*zoom/100)} renderTextLayer renderAnnotationLayer={false} loading={<div className="h-[60vh] w-[min(75vw,760px)] animate-pulse bg-card"/>}/>{pageNotes.flatMap(note=>(note.rects||[]).map((rect,index)=><span key={`${note.id}-${index}`} className="pdf-saved-highlight" aria-hidden="true" style={{left:`${rect.x*100}%`,top:`${rect.y*100}%`,width:`${rect.width*100}%`,height:`${rect.height*100}%`,backgroundColor:highlightColors[note.type]}}/>))}</div>
          </PdfDocument>
        </div>
        <div className="mt-5 flex items-center justify-center gap-5 text-xs text-muted-foreground"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="flex items-center gap-1 p-2 disabled:opacity-30" data-testid="button-bottom-previous"><ChevronLeft size={14}/> Previous</button><span className="font-mono">PAGE {page} / {total}</span><button onClick={()=>setPage(p=>Math.min(total,p+1))} disabled={page===total} className="flex items-center gap-1 p-2 disabled:opacity-30" data-testid="button-bottom-next">Next <ChevronRight size={14}/></button></div>
      </section>
      <aside className="border-l border-border bg-background px-4 py-5 md:px-5">
        <div className="flex items-center justify-between"><div><h2 className="font-display text-xl">On this page</h2><p className="mt-1 text-xs text-muted-foreground">{pageNotes.length} {pageNotes.length===1?'annotation':'annotations'}</p></div><span className="rounded-lg bg-secondary px-2.5 py-1.5 font-mono text-[10px] text-secondary-foreground">P. {page}</span></div>
        {showTools && selected && <div className="mt-4 rounded-xl border border-primary/30 bg-card p-3 shadow-sm" data-testid="panel-selection-tools"><div className="mb-2 flex items-start justify-between gap-2"><p className="line-clamp-3 text-xs italic text-muted-foreground">“{selected}”</p><button onClick={()=>{setShowTools(false);setComposing(false);setSelected('')}} aria-label="Close selection tools" data-testid="button-close-selection"><X size={14}/></button></div><div className="flex gap-2"><button onClick={copyText} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-semibold" data-testid="button-copy-selection"><Copy size={13}/> Copy</button><button onClick={()=>setComposing(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground" data-testid="button-annotate-selection"><Highlighter size={13}/> Annotate</button></div></div>}
        {showTools && selected && composing && <div className="mt-3 space-y-3 rounded-xl border border-border bg-card p-3"><label className="block text-[11px] font-semibold">Category<select value={kind} onChange={e=>setKind(e.target.value as AnnotationType)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-2 text-xs" data-testid="select-annotation-type">{kinds.map(k=><option key={k.key} value={k.key}>{k.label}</option>)}</select></label><label className="block text-[11px] font-semibold">Comment <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={3} placeholder="Add a thought (optional)" className="mt-1.5 w-full resize-y rounded-lg border border-input bg-background p-2 text-xs outline-none focus:ring-2 focus:ring-ring" data-testid="input-annotation-comment"/></label><button onClick={addNote} className="h-10 w-full rounded-lg bg-primary text-xs font-semibold text-primary-foreground" data-testid="button-save-annotation">Save annotation</button></div>}
        <div className="mt-5 space-y-3">
          {pageNotes.length===0 && <div className="rounded-xl border border-dashed border-border px-4 py-7 text-center"><MessageSquare className="mx-auto text-muted-foreground" size={19}/><p className="mt-2 text-xs font-medium">Nothing marked yet</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">Select a passage in the PDF to copy it or make an annotation.</p></div>}
          {pageNotes.map(note=>{const cat=kinds.find(k=>k.key===note.type);return <article key={note.id} className="rounded-xl border border-border bg-card p-3" data-testid={`annotation-card-${note.id}`}><div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[10px] font-semibold"><i className={`h-2 w-2 rounded-full ${cat?.dot}`}/>{cat?.label}</span><span className="text-[10px] text-muted-foreground">Page {note.pageNumber}</span></div><p className="mt-2 line-clamp-4 text-xs leading-5">“{note.selectedText}”</p>{note.comment&&<p className="mt-2 border-t border-border pt-2 text-xs leading-5 text-muted-foreground">{note.comment}</p>}<div className="mt-2 flex justify-end gap-3 text-[10px]"><button onClick={()=>editNote(note)} className="font-semibold text-primary" data-testid={`button-edit-annotation-${note.id}`}>Edit comment</button><button onClick={()=>deleteNote(note)} className="text-destructive" data-testid={`button-delete-annotation-${note.id}`}>Delete</button></div></article>;})}
        </div>
        <div className="mt-6 rounded-xl bg-secondary/55 p-3"><div className="flex items-center gap-2 text-xs font-semibold"><Sparkles size={14}/> Want a little more help?</div><p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">AI actions are unavailable until a provider is configured.</p><button onClick={()=>setAiNotice(true)} className="mt-2 text-[11px] font-semibold text-primary underline" data-testid="button-ai-explanation">Why is this unavailable?</button></div>
      </aside>
    </div>
  </div>;
}
