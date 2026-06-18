import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Flame, LayoutDashboard, FolderKanban, Sparkles, LogOut, Languages, User, ShieldCheck, Zap } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { usePermissions } from "@/hooks/useRbac";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalAssistant } from "@/components/GlobalAssistant";

/** Sidebar nav identifiers (one per item). */
type NavId = "dashboard" | "projects" | "evaluator" | "electrical" | "roles";

/**
 * NAV_PERMISSION (FCR-061) — maps each sidebar item to the [module, submodule]
 * pair that gates its visibility. MIRRORS the seeded RBAC catalog 1:1 (the
 * rbac-org-modules §2 sidebar↔catalog rule): drift here silently hides items.
 *   dashboard  → panel/overview
 *   projects   → projects/projects
 *   evaluator  → projects/evaluator
 *   roles      → admin/roles   (the new RBAC management item)
 */
const NAV_PERMISSION: Record<NavId, [string, string]> = {
  dashboard: ["panel", "overview"],
  projects: ["projects", "projects"],
  evaluator: ["projects", "evaluator"],
  electrical: ["projects", "projects"],
  roles: ["admin", "roles"],
};

interface NavItem {
  id: NavId;
  titleKey: keyof ReturnType<typeof useLang>["tr"] & string;
  url: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

function AppSidebar() {
  const { tr } = useLang();
  const { can, isReady } = usePermissions();

  /**
   * itemVisible(id) — show when there's no permission mapping, OR permissions
   * haven't resolved yet (fail-open during the RBAC log rollout), OR the role
   * can READ the mapped module/submodule. Mirrors the POS gating rule.
   */
  const itemVisible = (id: NavId): boolean => {
    const perm = NAV_PERMISSION[id];
    if (!perm || !isReady) return true;
    return can(perm[0], "read", perm[1]);
  };

  const workspace: NavItem[] = [
    { id: "dashboard", titleKey: "nav_dashboard", url: "/dashboard", icon: LayoutDashboard, end: true },
    { id: "projects", titleKey: "nav_projects", url: "/projects", icon: FolderKanban },
  ];
  const tools: NavItem[] = [
    { id: "evaluator", titleKey: "nav_evaluator", url: "/dashboard/evaluator", icon: Sparkles },
    { id: "electrical", titleKey: "nav_electrical", url: "/projects/electrical", icon: Zap },
  ];
  const admin: NavItem[] = [
    { id: "roles", titleKey: "nav_roles", url: "/dashboard/roles", icon: ShieldCheck },
  ];

  const visibleWorkspace = workspace.filter((i) => itemVisible(i.id));
  const visibleTools = tools.filter((i) => itemVisible(i.id));
  const visibleAdmin = admin.filter((i) => itemVisible(i.id));

  const renderItem = (item: NavItem) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild tooltip={tr[item.titleKey]}>
        <NavLink
          to={item.url}
          end={item.end}
          className="hover:bg-muted/50"
          activeClassName="bg-muted text-primary font-medium"
        >
          <item.icon className="h-4 w-4" />
          <span>{tr[item.titleKey]}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 border border-primary/30">
            <Flame className="h-4 w-4 text-primary" />
          </div>
          <div className="text-sm font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            FireCode <span className="text-primary">CR</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {/* Hide a whole group when none of its items are visible. */}
        {visibleWorkspace.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{tr.nav_workspace}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{visibleWorkspace.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleTools.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{tr.nav_tools}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{visibleTools.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleAdmin.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{tr.nav_admin}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{visibleAdmin.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <UserBlock />
      </SidebarFooter>
    </Sidebar>
  );
}

function UserBlock() {
  const { user, signOut } = useAuth();
  const { tr } = useLang();
  const navigate = useNavigate();
  const email = (user?.signInDetails?.loginId as string | undefined) ?? user?.username ?? "";

  return (
    <div className="px-2 py-2 space-y-2">
      <div className="text-xs text-muted-foreground truncate group-data-[collapsible=icon]:hidden" title={email}>
        {email}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() => navigate("/dashboard/profile")}
      >
        <User className="h-4 w-4" />
        <span className="group-data-[collapsible=icon]:hidden">{tr.nav_profile}</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={async () => {
          await signOut();
          navigate("/login", { replace: true });
        }}
      >
        <LogOut className="h-4 w-4" />
        <span className="group-data-[collapsible=icon]:hidden">{tr.sign_out}</span>
      </Button>
    </div>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { lang, setLang, tr } = useLang();
  const location = useLocation();

  const titleMap: Record<string, string> = {
    "/dashboard": tr.nav_dashboard,
    "/dashboard/evaluator": tr.nav_evaluator,
    "/dashboard/roles": tr.nav_roles,
    "/dashboard/profile": tr.nav_profile,
    "/projects": tr.nav_projects,
    "/projects/new": tr.new_project,
  };
  const title =
    titleMap[location.pathname] ??
    (location.pathname.startsWith("/projects/") ? tr.nav_projects : tr.nav_dashboard);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur px-3">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger />
              <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLang(lang === "es" ? "en" : "es")}
                className="gap-2"
              >
                <Languages className="h-4 w-4" />
                {lang === "es" ? "EN" : "ES"}
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="container max-w-6xl py-6 px-4 sm:px-6">{children}</div>
          </main>
        </div>
        <GlobalAssistant />
      </div>
    </SidebarProvider>
  );
}
