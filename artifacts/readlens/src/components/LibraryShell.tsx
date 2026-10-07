import { useLocation, Link } from 'wouter';
import type { ReactNode } from 'react';
import { BookOpen, FileText, Search, StickyNote, Settings, Plus, PanelLeftClose, X } from 'lucide-react';
import { useState } from 'react';

const nav = [
  { href: '/', label: 'Library', icon: BookOpen },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/settings', label: 'Settings', icon: Settings },
];
export function LibraryShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [menu, setMenu] = useState(false);
  return <div className="min-h-[100dvh] bg-background text-foreground">
    {menu && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-foreground/20 md:hidden" onClick={() => setMenu(false)} data-testid="button-close-overlay" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[254px] flex-col border-r border-border bg-card/95 px-5 py-6 transition-transform md:translate-x-0 ${menu ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between mb-12">
        <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground"><BookOpen size={21}/></span>
          <span><strong className="font-display text-[22px] leading-none">ReadLens</strong><small className="mt-1 block text-[10px] uppercase tracking-[.18em] text-muted-foreground">your reading room</small></span>
        </Link>
        <button className="md:hidden p-2" onClick={() => setMenu(false)} data-testid="button-close-menu"><X size={18}/></button>
      </div>
      <Link href="/upload" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5" data-testid="link-import"><Plus size={17}/> Import a PDF</Link>
      <div className="mt-9 mb-3 px-3 text-[10px] font-bold uppercase tracking-[.19em] text-muted-foreground">Your space</div>
      <nav className="space-y-1">
        {nav.map(({href,label,icon:Icon}) => {
          const active = href === '/' ? location === '/' || location.startsWith('/reader/') : location === href;
          return <Link key={href} href={href} onClick={() => setMenu(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${active ? 'bg-secondary font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`} data-testid={`nav-${label.toLowerCase()}`}><Icon size={18} strokeWidth={active ? 2.3 : 1.8}/>{label}{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"/>}</Link>;
        })}
      </nav>
      <div className="mt-auto rounded-2xl border border-border bg-background p-4">
        <div className="flex items-center gap-2 text-xs font-semibold"><span className="h-2 w-2 rounded-full bg-primary"/>Private by default</div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Your PDFs and notes stay on this device. Nothing is uploaded.</p>
        <Link href="/settings" className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline" data-testid="link-privacy-settings">Privacy details <span aria-hidden="true">→</span></Link>
      </div>
    </aside>
    <div className="md:pl-[254px]">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-md md:px-9">
        <button onClick={() => setMenu(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" aria-label="Open navigation" data-testid="button-open-menu"><PanelLeftClose size={20}/></button>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"><FileText size={14}/> A quiet place to read</div>
        <div className="ml-auto flex items-center gap-2"><span className="hidden rounded-full bg-secondary px-3 py-1.5 text-[11px] text-secondary-foreground sm:inline-flex">Saved on this device</span><Link href="/upload" className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground md:hidden" data-testid="button-mobile-import"><Plus size={15}/> Import</Link></div>
      </header>
      <main className="mx-auto w-full max-w-[1360px] px-5 py-8 md:px-10 md:py-11">{children}</main>
    </div>
  </div>;
}
