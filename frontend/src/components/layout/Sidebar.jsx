import { NavLink, useLocation } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import {
  LayoutDashboard,
  Inbox,
  BarChart3,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  Building2,
  Settings,
  Beaker,
  UtensilsCrossed,
  BookOpen,
  GitBranch,
  Factory,
  ClipboardList,
  ShoppingCart,
  TrendingDown,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  LayoutDashboard,
  Inbox,
  BarChart3,
  ScrollText,
  Package,
  Building2,
  Settings,
  Beaker,
  UtensilsCrossed,
  BookOpen,
  GitBranch,
  Factory,
  ClipboardList,
  ShoppingCart,
  TrendingDown,
};

const STORAGE_KEY = "ci_sidebar_collapsed_sections";

function loadCollapsedSections() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

function saveCollapsedSections(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

export default function Sidebar() {
  const { visibleNavSections, isAuthenticated } = useLoginContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState(loadCollapsedSections);
  const location = useLocation();

  // Auto-expand the section containing the active route
  useEffect(() => {
    if (!visibleNavSections) return;
    for (const section of visibleNavSections) {
      const hasActive = section.items.some((item) =>
        item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path)
      );
      if (hasActive && collapsedSections[section.id]) {
        setCollapsedSections((prev) => {
          const next = { ...prev, [section.id]: false };
          saveCollapsedSections(next);
          return next;
        });
        break;
      }
    }
  }, [location.pathname, visibleNavSections]);

  const toggleSection = useCallback((sectionId) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      saveCollapsedSections(next);
      return next;
    });
  }, []);

  if (!isAuthenticated) return null;

  return (
    <aside
      data-testid="app-sidebar"
      className={cn(
        "h-full border-r border-border bg-card flex flex-col transition-all duration-200 shrink-0",
        sidebarCollapsed ? "w-14" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-3 border-b border-border gap-2">
        <Package className="h-6 w-6 text-foreground shrink-0" />
        {!sidebarCollapsed && (
          <span className="font-bold text-sm tracking-tight whitespace-nowrap">Central Inventory</span>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 py-1 overflow-y-auto">
        {(visibleNavSections || []).map((section, sIdx) => {
          const isCollapsed = !!collapsedSections[section.id];

          return (
            <div key={section.id}>
              {sIdx > 0 && <div className="h-px bg-border mx-3 my-1" />}

              {/* Section header */}
              {!sidebarCollapsed && (
                <button
                  data-testid={`nav-section-${section.id}`}
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 pt-2.5 pb-1 group"
                >
                  <span className="text-[10px] font-bold uppercase tracking-[1.2px] text-muted-foreground group-hover:text-foreground transition-colors">
                    {section.label}
                  </span>
                  <ChevronDown
                    data-testid={`nav-section-${section.id}-toggle`}
                    className={cn(
                      "h-3 w-3 text-muted-foreground transition-transform duration-200",
                      isCollapsed && "-rotate-90"
                    )}
                  />
                </button>
              )}

              {/* Section items */}
              {(!isCollapsed || sidebarCollapsed) && (
                <div className="px-2 space-y-0.5 pb-0.5">
                  {section.items.map((item) => {
                    const Icon = ICON_MAP[item.icon] || LayoutDashboard;
                    const isActive =
                      item.path === "/"
                        ? location.pathname === "/"
                        : location.pathname.startsWith(item.path);

                    return (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        data-testid={`nav-${item.id}`}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!sidebarCollapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}

              {/* Collapsed hint */}
              {isCollapsed && !sidebarCollapsed && (
                <div className="px-3 pb-1">
                  <span className="text-[10px] text-muted-foreground/60 italic">
                    {section.items.length} item{section.items.length > 1 ? "s" : ""} hidden
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        data-testid="sidebar-collapse-toggle"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="h-10 flex items-center justify-center border-t border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
