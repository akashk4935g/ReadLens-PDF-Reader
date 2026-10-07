import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight, FileText, Search as SearchIcon, X } from 'lucide-react';
import { getDocuments } from '../lib/library';
import type { ReadDocument } from '../lib/library';
export default function Search(){
  const [query,setQuery]=useState('');const [docs,setDocs]=useState<ReadDocument[]>([]);const [error,setError]=useState('');
  const load=()=>getDocuments().then(setDocs).catch(()=>setError('Could not search your local library. Retry to reconnect to browser storage.'));
  useEffect(()=>{load();const fn=()=>load();window.addEventListener('readlens-library-change',fn);return()=>window.removeEventListener('readlens-library-change',fn)},[]);
  const results=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase(); if(!needle)return [];
    return docs.flatMap(doc=>doc.pageTexts.flatMap((text,i)=>{
      const pos=text.toLocaleLowerCase().indexOf(needle);if(pos<0)return [];
      const start=Math.max(0,pos-90),end=Math.min(text.length,pos+needle.length+130);
      return [{doc,page:i+1,text:(start?'…':'')+text.slice(start,end)+(end<text.length?'…':'')}];
    })).slice(0,100);
  },[docs,query]);
  return <div className="mx-auto max-w-5xl animate-enter">
    <div className="mb-8"><div className="mb-3 text-xs font-semibold uppercase tracking-[.16em] text-primary">Find the thread</div><h1 className="font-display text-4xl md:text-5xl">Search your PDFs</h1><p className="mt-3 text-sm text-muted-foreground">Search the text indexed from every page. Your query stays on this device.</p></div>
    <div className="flex h-14 items-center gap-3 rounded-2xl border border-input bg-card px-4 shadow-sm focus-within:ring-2 focus-within:ring-ring"><SearchIcon className="shrink-0 text-primary" size={20}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="A phrase, name, or idea…" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" data-testid="input-search-pdfs"/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')} className="rounded-md p-2 text-muted-foreground hover:bg-muted" data-testid="button-clear-search"><X size={16}/></button>}</div>
    {error&&<div className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm" role="alert">{error}<button onClick={load} className="ml-2 underline" data-testid="button-retry-search">Retry</button></div>}
    {!query.trim()?<div className="mt-7 rounded-2xl border border-border bg-secondary/40 px-5 py-8"><div className="flex items-start gap-3"><SearchIcon size={18} className="mt-0.5 text-primary"/><div><p className="text-sm font-semibold">Search across {docs.length} {docs.length===1?'document':'documents'}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Try a specific term or phrase. Matches are found in page text extracted during import.</p></div></div></div>:results.length===0?<div className="mt-7 rounded-2xl border border-dashed border-border bg-card p-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-secondary text-primary"><SearchIcon size={20}/></div><h2 className="mt-4 font-display text-2xl">No matches just yet.</h2><p className="mt-2 text-sm text-muted-foreground">Try another phrase, or import a text-searchable PDF.</p></div>:<div className="mt-7"><div className="mb-3 text-xs text-muted-foreground" data-testid="text-search-count">{results.length} {results.length===100?'or more ':''}{results.length===1?'match':'matches'} for “{query}”</div><div className="space-y-3">{results.map((r,i)=><Link key={`${r.doc.id}-${r.page}-${i}`} href={`/reader/${r.doc.id}?page=${r.page}`} className="block rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-sm md:p-5" data-testid={`search-result-${r.doc.id}-${r.page}-${i}`}><div className="mb-2 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2 text-xs font-semibold"><FileText size={15} className="shrink-0 text-primary"/><span className="truncate">{r.doc.title}</span><span className="shrink-0 text-muted-foreground">· page {r.page}</span></div><ArrowUpRight size={15} className="shrink-0 text-muted-foreground"/></div><p className="text-sm leading-6 text-muted-foreground">{highlight(r.text,query)}</p></Link>)}</div></div>}
  </div>
}
function highlight(text:string,term:string){const i=text.toLowerCase().indexOf(term.toLowerCase());if(i<0)return text;return <>{text.slice(0,i)}<mark className="rounded bg-accent/70 px-0.5 text-foreground">{text.slice(i,i+term.length)}</mark>{text.slice(i+term.length)}</>}
