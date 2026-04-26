import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { LayoutDashboard, FolderKanban, Users, Loader2, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchPalette } from "@/components/search-palette";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/team", label: "Team", icon: Users },
];

function Sidebar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const [location] = useLocation();
  const { data: me, isLoading } = useGetMe();

  const isMac =
    typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
  const shortcut = isMac ? "⌘K" : "Ctrl+K";

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col z-10">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Team Hub</span>
        </div>
      </div>

      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={onOpenSearch}
          data-testid="button-open-search"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 bg-sidebar-accent/40 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground transition-colors border border-sidebar-border/60"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[10px] font-mono bg-sidebar/70 border border-sidebar-border/60 px-1.5 py-0.5 rounded">
            {shortcut}
          </kbd>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-4 px-2">Menu</div>
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
              isActive 
                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        {isLoading ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : me ? (
          <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-sidebar-accent/50 transition-colors cursor-pointer">
            <Avatar className="w-9 h-9 border border-border">
              <AvatarFallback style={{ backgroundColor: me.avatarColor || '#ccc', color: '#fff' }}>
                {me.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">{me.name}</span>
              <span className="text-xs text-sidebar-foreground/50 mt-1">{me.role}</span>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-background w-full">
      <Sidebar onOpenSearch={() => setSearchOpen(true)} />
      <main className="pl-64 flex flex-col min-h-[100dvh]">
        {children}
      </main>
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
