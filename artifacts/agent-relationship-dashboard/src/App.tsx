import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useGetRelationshipActivity, useGetRelationshipAgents, useGetRelationshipSummary } from "@workspace/api-client-react";
import type { RelationshipActivity, RelationshipAgent, RelationshipSummary } from "@workspace/api-client-react";
import {
  Activity, AlertCircle, ArrowRight, BarChart3, Bell, ChevronDown,
  ChevronRight, CircleDot, Clock3, Download, ExternalLink, Filter, LayoutDashboard,
  Menu, Moon, Network, Printer, RefreshCw, Search, ShieldCheck,
  Sparkles, Sun, Target, Users, X,
} from "lucide-react";
import { Link, Route, Switch, useLocation } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } },
});

const CHART_COLORS = ["#1f6f73", "#d99b42", "#5f9079", "#bb5b52", "#7b6b86"];
const INTERVAL_OPTIONS = [
  { label: "Every 5 min", ms: 5 * 60 * 1000 },
  { label: "Every 15 min", ms: 15 * 60 * 1000 },
  { label: "Every hour", ms: 60 * 60 * 1000 },
];

type Tone = "urgent" | "positive" | "neutral" | "negative";

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatLongDate(value: string) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function humanize(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [keys.join(","), ...rows.map((row) => keys.map((key) => escape(row[key])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toneClass(tone: string) {
  return `tone-${tone}`;
}

function Shell({ children, isDark, onToggleTheme }: { children: ReactNode; isDark: boolean; onToggleTheme: () => void }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [
    { href: "/", label: "Command center", icon: LayoutDashboard },
    { href: "/agents", label: "Agent portfolio", icon: Users },
    { href: "/insights", label: "Relationship insights", icon: Network },
  ];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark"><span>R</span></div>
          <div><p className="brand-name">Relayroom</p><p className="brand-caption">relationship intelligence</p></div>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-close-navigation"><X size={17} /></button>
        </div>
        <div className="workspace-chip"><span className="pulse-dot" /> International recruitment <ChevronDown size={13} /></div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link href={href} key={href} onClick={() => setMobileOpen(false)} className={`nav-item ${location === href ? "nav-item-active" : ""}`} data-testid={`link-${label.toLowerCase().replaceAll(" ", "-")}`}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{href === "/" && <span className="nav-live">Live</span>}
            </Link>
          ))}
          <p className="nav-label nav-label-spaced">Review</p>
          <Link href="/insights" onClick={() => setMobileOpen(false)} className={`nav-item ${location === "/insights" ? "nav-item-active" : ""}`} data-testid="link-review-patterns">
            <Sparkles size={17} strokeWidth={1.8} /><span>Review patterns</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="coverage-note"><ShieldCheck size={16} /><div><strong>Private workspace</strong><span>Built for thoughtful follow-through</span></div></div>
          <div className="profile-row"><div className="avatar avatar-gold">AK</div><div className="profile-meta"><strong>Akhi</strong><span>Relationship manager</span></div><button className="icon-button" aria-label="Open profile menu" data-testid="button-profile-menu"><ChevronDown size={15} /></button></div>
        </div>
      </aside>
      {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" data-testid="button-close-navigation-overlay" />}
      <main className="main-shell">
        <header className="mobile-header">
          <button className="icon-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu size={20} /></button>
          <div className="mobile-title"><div className="brand-mark small"><span>R</span></div><strong>Relayroom</strong></div>
          <button className="icon-button" onClick={onToggleTheme} aria-label="Toggle dark mode" data-testid="button-toggle-dark-mode-mobile">{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
        </header>
        <div className="page-wrap">{children}</div>
      </main>
    </div>
  );
}

function StatusPill({ value, type = "health" }: { value: string; type?: "health" | "priority" | "tone" }) {
  return <span className={`status-pill ${type}-${value}`} data-testid={`status-${type}-${value}`}><span className="status-dot" />{humanize(value)}</span>;
}

function PageHeader({ eyebrow, title, subtitle, meta, children }: { eyebrow: string; title: string; subtitle: string; meta?: string; children?: ReactNode }) {
  return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-subtitle">{subtitle}</p>{meta && <span className="page-source">{meta}</span>}</div>{children && <div className="page-header-actions">{children}</div>}</div>;
}

function QueryError({ onRetry, message = "The relationship picture could not load." }: { onRetry: () => void; message?: string }) {
  return <div className="state-panel error-state" data-testid="state-error"><div className="state-icon"><AlertCircle size={24} /></div><h3>Unable to load relationship data</h3><p>{message}</p><button className="button button-secondary" onClick={onRetry} data-testid="button-retry"><RefreshCw size={15} /> Try again</button></div>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="state-panel" data-testid="state-empty"><div className="state-icon state-icon-soft"><CircleDot size={24} /></div><h3>{title}</h3><p>{detail}</p></div>;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton-block ${className}`} aria-hidden="true" />;
}

function DataControls({ isDark, onToggleTheme, onRefresh, isFetching, lastUpdated, compact = false }: { isDark: boolean; onToggleTheme: () => void; onRefresh: () => void; isFetching: boolean; lastUpdated?: number; compact?: boolean }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [interval, setIntervalMs] = useState(INTERVAL_OPTIONS[0].ms);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setDropdownOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(onRefresh, interval);
    return () => window.clearInterval(timer);
  }, [autoRefresh, interval, onRefresh]);
  return <div className="control-stack">
    <div className="control-row">
      <div className="split-refresh" ref={dropdownRef}>
        <button onClick={onRefresh} disabled={isFetching} className="refresh-main" data-testid="button-refresh-data"><RefreshCw size={14} className={isFetching ? "spin" : ""} />{compact ? "Refresh" : "Refresh picture"}</button>
        <button onClick={() => setDropdownOpen((open) => !open)} className="refresh-menu" aria-label="Open refresh settings" data-testid="button-open-refresh-settings"><ChevronDown size={14} /></button>
        {dropdownOpen && <div className="refresh-popover" data-testid="menu-refresh-settings">
          <div className="refresh-popover-heading">Refresh settings</div>
          <label className="switch-row"><span>Auto-refresh</span><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} data-testid="switch-auto-refresh" /><span className="switch-visual" /></label>
          <div className="refresh-options">{INTERVAL_OPTIONS.map((option) => <button key={option.ms} className={`refresh-option ${interval === option.ms ? "selected" : ""}`} onClick={() => { setIntervalMs(option.ms); setAutoRefresh(true); }} data-testid={`button-refresh-${option.ms}`}>{option.label}{interval === option.ms && <span>Selected</span>}</button>)}</div>
          <p className="refresh-footnote">Manual refresh is always available. Auto-refresh starts at 5 minutes.</p>
        </div>}
      </div>
      <button className="icon-button header-icon" onClick={() => window.print()} aria-label="Export as PDF" data-testid="button-export-pdf"><Printer size={16} /></button>
      <button className="icon-button header-icon" onClick={onToggleTheme} aria-label="Toggle dark mode" data-testid="button-toggle-dark-mode">{isDark ? <Sun size={16} /> : <Moon size={16} />}</button>
    </div>
    {lastUpdated ? <p className="last-updated">Last synced {new Date(lastUpdated).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p> : null}
  </div>;
}

function MetricCard({ label, value, hint, icon: Icon, accent = "teal", loading }: { label: string; value: number | string; hint: string; icon: typeof Users; accent?: string; loading?: boolean }) {
  return <article className={`metric-card metric-${accent}`} data-testid={`metric-${label.toLowerCase().replaceAll(" ", "-")}`}><div className="metric-top"><span className="metric-label">{label}</span><span className="metric-icon"><Icon size={17} /></span></div>{loading ? <><SkeletonBlock className="metric-value-skeleton" /><SkeletonBlock className="metric-hint-skeleton" /></> : <><strong className="metric-value">{value}</strong><span className="metric-hint">{hint}</span></>}</article>;
}

function ChartCard({ title, kicker, children, rows, filename, testId }: { title: string; kicker?: string; children: ReactNode; rows: Record<string, unknown>[]; filename: string; testId: string }) {
  return <section className="surface chart-card" data-testid={testId}><div className="surface-heading"><div><p className="section-kicker">{kicker}</p><h2>{title}</h2></div><button className="icon-button export-button" onClick={() => exportCsv(filename, rows)} aria-label={`Export ${title} as CSV`} data-testid={`button-export-${testId}`}><Download size={15} /></button></div>{children}</section>;
}

function DistributionChart({ items, mode, isDark }: { items: { label: string; count: number; tone: string }[]; mode: "segment" | "stage"; isDark: boolean }) {
  const data = items.length ? items : [{ label: "No data", count: 0, tone: "neutral" }];
  if (mode === "segment") return <div className="distribution-wrap"><div className="donut-wrap"><ResponsiveContainer width="100%" height={188}><PieChart><Pie data={data} dataKey="count" nameKey="label" innerRadius={53} outerRadius={77} paddingAngle={3} cornerRadius={3} stroke="none" isAnimationActive={false}>{data.map((item, index) => <Cell key={item.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #ded7c9", background: isDark ? "#263238" : "#fffdf8" }} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{items.reduce((sum, item) => sum + item.count, 0)}</strong><span>tracked</span></div></div><div className="legend-list">{data.map((item, index) => <div className="legend-row" key={item.label} data-testid={`legend-segment-${item.label}`}><span className="legend-dot" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} /><span>{item.label}</span><strong>{item.count}</strong></div>)}</div></div>;
  return <div className="bar-chart-wrap"><ResponsiveContainer width="100%" height={218}><BarChart data={data} layout="vertical" margin={{ top: 3, right: 14, bottom: 0, left: 6 }}><CartesianGrid horizontal={false} stroke={isDark ? "rgba(255,255,255,.09)" : "#e9e2d6"} /><XAxis type="number" hide /><YAxis dataKey="label" type="category" axisLine={false} tickLine={false} width={112} tick={{ fontSize: 12, fill: isDark ? "#cfc8bb" : "#665f54" }} /><Tooltip cursor={false} contentStyle={{ borderRadius: 8, border: "1px solid #ded7c9", background: isDark ? "#263238" : "#fffdf8" }} /><Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} barSize={19} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>;
}

function ActivityFeed({ activities, loading, onSelectAgent }: { activities: RelationshipActivity[]; loading: boolean; onSelectAgent: (id: string) => void }) {
  if (loading) return <div className="activity-list">{[1, 2, 3, 4].map((item) => <div className="activity-row" key={item}><SkeletonBlock className="activity-skeleton-dot" /><div className="activity-copy"><SkeletonBlock className="line-skeleton medium" /><SkeletonBlock className="line-skeleton long" /></div></div>)}</div>;
  if (!activities.length) return <EmptyState title="No recent activity" detail="New relationship activity will appear here as conversations are reviewed." />;
  return <div className="activity-list">{activities.slice(0, 6).map((activity) => <button className="activity-row activity-button" key={activity.id} onClick={() => onSelectAgent(activity.agentId)} data-testid={`activity-${activity.id}`}><span className={`activity-dot ${toneClass(activity.tone)}`} /><div className="activity-copy"><div className="activity-line"><strong>{activity.event}</strong><time>{formatDate(activity.date)}</time></div><p>{activity.detail}</p><span className="activity-agent">{activity.agentName}</span></div><ArrowRight size={15} className="activity-arrow" /></button>)}</div>;
}

function RelationshipModal({ agent, onClose }: { agent: RelationshipAgent; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = ""; };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="relationship-modal" role="dialog" aria-modal="true" aria-label={`${agent.name} relationship detail`} data-testid="relationship-detail-modal"><div className="modal-header"><div><p className="eyebrow">Relationship detail</p><h2>{agent.name}</h2><p>{agent.groupName}</p></div><button className="icon-button" onClick={onClose} aria-label="Close relationship detail" data-testid="button-close-relationship-detail"><X size={18} /></button></div><div className="modal-profile"><div className="avatar avatar-large">{initials(agent.name)}</div><div><div className="modal-pills"><StatusPill value={agent.relationshipHealth} /><StatusPill value={agent.priority} type="priority" /></div><p className="modal-context">{agent.studentName !== "—" ? `Supporting ${agent.studentName}` : "No student attached"} · {humanize(agent.segment)}</p></div></div><div className="modal-section"><p className="section-kicker">Current read</p><p className="modal-summary">{agent.summary}</p></div><div className="modal-grid"><div><span className="detail-label">Stage</span><strong>{agent.stage}</strong></div><div><span className="detail-label">Activity window</span><strong>{agent.dateRange}</strong></div><div><span className="detail-label">Last activity</span><strong>{formatLongDate(agent.lastActivityDate)}</strong></div><div><span className="detail-label">Outcome</span><strong>{agent.outcome}</strong></div></div><div className="next-action-box"><div className="next-action-icon"><Target size={17} /></div><div><span className="detail-label">Next action</span><strong>{agent.nextAction}</strong></div></div><div className="modal-footer"><button className="button button-secondary" onClick={onClose} data-testid="button-close-detail-footer">Close detail</button><button className="button button-primary" onClick={onClose} data-testid="button-mark-reviewed">Mark reviewed <ArrowRight size={15} /></button></div></aside></div>;
}

function Dashboard() {
  const summaryQuery = useGetRelationshipSummary();
  const agentsQuery = useGetRelationshipAgents();
  const activityQuery = useGetRelationshipActivity();
  const queryClient = useQueryClient();
  const [isDark, setIsDark] = useState(() => localStorage.getItem("relayroom-theme") === "dark");
  const [selectedAgent, setSelectedAgent] = useState<RelationshipAgent | null>(null);
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState("all");
  const loading = summaryQuery.isLoading || agentsQuery.isLoading || activityQuery.isLoading || summaryQuery.isFetching || agentsQuery.isFetching || activityQuery.isFetching;
  const agents = agentsQuery.data ?? [];
  const summary = summaryQuery.data;
  const activities = activityQuery.data ?? [];
  useEffect(() => { document.documentElement.classList.toggle("dark", isDark); localStorage.setItem("relayroom-theme", isDark ? "dark" : "light"); }, [isDark]);
  const refresh = () => { queryClient.invalidateQueries({ queryKey: summaryQuery.queryKey }); queryClient.invalidateQueries({ queryKey: agentsQuery.queryKey }); queryClient.invalidateQueries({ queryKey: activityQuery.queryKey }); };
  const priorityAgents = useMemo(() => agents.filter((agent) => agent.priority === "high" || agent.relationshipHealth === "at-risk").slice(0, 4), [agents]);
  const filteredAgents = useMemo(() => agents.filter((agent) => `${agent.name} ${agent.groupName} ${agent.studentName} ${agent.nextAction}`.toLowerCase().includes(search.toLowerCase()) && (healthFilter === "all" || agent.relationshipHealth === healthFilter)).slice(0, 7), [agents, healthFilter, search]);
  const lastUpdated = Math.max(summaryQuery.dataUpdatedAt || 0, agentsQuery.dataUpdatedAt || 0, activityQuery.dataUpdatedAt || 0) || undefined;
  const setSelection = (id: string) => setSelectedAgent(agents.find((agent) => agent.id === id) ?? null);
  return <div className="dashboard-page">
     <PageHeader eyebrow="Tuesday · relationship command center" title="Good morning, Akhi." subtitle="The people and conversations most worth your attention today." meta="Review period: Aug 2025 – Aug 2026">
      <DataControls isDark={isDark} onToggleTheme={() => setIsDark((value) => !value)} onRefresh={refresh} isFetching={loading} lastUpdated={lastUpdated} />
    </PageHeader>
    {(summaryQuery.isError || agentsQuery.isError || activityQuery.isError) ? <QueryError onRetry={refresh} /> : <>
      <section className="metric-grid">
        <MetricCard label="Tracked relationships" value={summary?.totalTracked ?? 0} hint="Across active portfolio" icon={Users} loading={loading} />
        <MetricCard label="Active referrals" value={summary?.activeReferralCount ?? 0} hint="In motion right now" icon={ArrowRight} accent="gold" loading={loading} />
        <MetricCard label="Open follow-ups" value={summary?.openFollowUps ?? 0} hint="Need a clear next step" icon={Clock3} accent="coral" loading={loading} />
        <MetricCard label="Warm relationships" value={summary?.warmRelationships ?? 0} hint="Trust worth protecting" icon={ShieldCheck} accent="sage" loading={loading} />
      </section>
       <div className="dashboard-grid top-grid">
         <section className="surface next-actions" data-testid="section-next-actions"><div className="surface-heading"><div><p className="section-kicker">Attention ledger</p><h2>Next actions</h2></div><span className="count-badge">{priorityAgents.length} to review</span></div><p className="surface-intro">A short list of relationships where a specific next step can change the week.</p>{loading ? <div className="priority-list">{[1, 2, 3].map((item) => <div className="priority-row" key={item}><SkeletonBlock className="priority-avatar" /><div className="priority-copy"><SkeletonBlock className="line-skeleton medium" /><SkeletonBlock className="line-skeleton long" /></div></div>)}</div> : priorityAgents.length ? <div className="priority-list">{priorityAgents.map((agent) => <button className="priority-row" key={agent.id} onClick={() => setSelectedAgent(agent)} data-testid={`priority-${agent.id}`}><div className={`priority-avatar ${agent.priority === "high" ? "priority-high" : "priority-medium"}`}>{agent.priority === "high" ? "High" : "Review"}</div><div className="priority-copy"><div className="priority-heading"><strong>{agent.name}</strong><StatusPill value={agent.relationshipHealth} /></div><p>{agent.nextAction}</p><span>{agent.studentName !== "—" ? agent.studentName : agent.groupName} · {formatDate(agent.lastActivityDate)}</span></div><ChevronRight size={17} className="row-chevron" /></button>)}</div> : <EmptyState title="No immediate follow-ups" detail="Your attention ledger is clear for now." />}</section>
         <section className="surface pulse-card" data-testid="section-portfolio-pulse"><div className="surface-heading"><div><p className="section-kicker">Portfolio pulse</p><h2>Portfolio movement</h2></div><Activity size={19} className="surface-heading-icon" /></div><div className="pulse-stat"><div className="pulse-number">{summary?.recentReferralCount ?? 0}</div><div><strong>recent referrals</strong><p>Conversations with movement in the latest review.</p></div></div><div className="pulse-divider" /><div className="pulse-stat"><div className="pulse-number pulse-number-dark">{summary?.closedReferralCount ?? 0}</div><div><strong>closed with an outcome</strong><p>Useful signal for the next agent conversation.</p></div></div><div className="pulse-callout"><Bell size={15} /><span>Protect the warm handoffs before chasing new ones.</span></div></section>
      </div>
      <div className="dashboard-grid chart-grid">
        <ChartCard title="Agent portfolio mix" kicker="Segment distribution" rows={(summary?.segmentBreakdown ?? []).map((item) => ({ segment: item.label, relationships: item.count }))} filename="agent-portfolio-mix.csv" testId="chart-segment-breakdown"><DistributionChart items={summary?.segmentBreakdown ?? []} mode="segment" isDark={isDark} /></ChartCard>
        <ChartCard title="Referral stages" kicker="Where relationships sit today" rows={(summary?.stageBreakdown ?? []).map((item) => ({ stage: item.label, relationships: item.count }))} filename="referral-stages.csv" testId="chart-stage-breakdown"><DistributionChart items={summary?.stageBreakdown ?? []} mode="stage" isDark={isDark} /></ChartCard>
      </div>
      <div className="dashboard-grid lower-grid">
        <section className="surface activity-card" data-testid="section-recent-activity"><div className="surface-heading"><div><p className="section-kicker">Conversation trail</p><h2>Recent activity</h2></div><Link href="/insights" className="text-link" data-testid="link-view-all-activity">View patterns <ArrowRight size={14} /></Link></div><ActivityFeed activities={activities} loading={loading} onSelectAgent={setSelection} /></section>
        <section className="surface relationship-table-card" data-testid="section-relationship-table"><div className="surface-heading"><div><p className="section-kicker">Working set</p><h2>Relationship table</h2></div><Link href="/agents" className="text-link" data-testid="link-open-agent-portfolio">Open portfolio <ExternalLink size={13} /></Link></div><div className="table-tools"><label className="search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search agents, students, actions" aria-label="Search relationships" data-testid="input-search-relationships" /></label><select value={healthFilter} onChange={(event) => setHealthFilter(event.target.value)} aria-label="Filter relationship health" data-testid="select-filter-health"><option value="all">All health</option><option value="warm">Warm</option><option value="active">Active</option><option value="at-risk">At risk</option><option value="dormant">Dormant</option></select></div>{loading ? <TableSkeleton /> : filteredAgents.length ? <RelationshipTable agents={filteredAgents} onSelect={(agent) => setSelection(agent.id)} /> : <EmptyState title="No relationships match" detail="Try a different name or health filter." />}</section>
      </div>
    </>}
    {selectedAgent && <RelationshipModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />}
  </div>;
}

function TableSkeleton() {
  return <div className="table-skeleton">{[1, 2, 3, 4, 5].map((item) => <div className="table-skeleton-row" key={item}><SkeletonBlock className="line-skeleton medium" /><SkeletonBlock className="line-skeleton long" /><SkeletonBlock className="line-skeleton short" /></div>)}</div>;
}

function RelationshipTable({ agents, onSelect }: { agents: RelationshipAgent[]; onSelect: (agent: RelationshipAgent) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>Relationship</th><th>Stage</th><th>Health</th><th>Next action</th><th>Last touch</th></tr></thead><tbody>{agents.map((agent) => <tr key={agent.id} onClick={() => onSelect(agent)} data-testid={`row-relationship-${agent.id}`}><td><div className="table-person"><div className="avatar">{initials(agent.name)}</div><div><strong>{agent.name}</strong><span>{agent.groupName}</span></div></div></td><td><span className="stage-text">{agent.stage}</span><span className="student-text">{agent.studentName}</span></td><td><StatusPill value={agent.relationshipHealth} /></td><td><span className="next-action-text">{agent.nextAction}</span></td><td><span className="date-text">{formatDate(agent.lastActivityDate)}</span></td></tr>)}</tbody></table></div>;
}

function AgentsPage() {
  const query = useGetRelationshipAgents();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<RelationshipAgent | null>(null);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [health, setHealth] = useState("all");
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const agents = query.data ?? [];
  const filtered = useMemo(() => agents.filter((agent) => `${agent.name} ${agent.groupName} ${agent.studentName}`.toLowerCase().includes(search.toLowerCase()) && (segment === "all" || agent.segment === segment) && (health === "all" || agent.relationshipHealth === health)), [agents, search, segment, health]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: query.queryKey });
  return <div className="agents-page"><PageHeader eyebrow="Relationship portfolio" title="Your agent network." subtitle="A browsable view of every relationship being held, grown, or recovered."><DataControls isDark={isDark} onToggleTheme={() => { setIsDark((value) => !value); document.documentElement.classList.toggle("dark", !isDark); }} onRefresh={refresh} isFetching={query.isFetching} lastUpdated={query.dataUpdatedAt} compact /></PageHeader>{query.isError ? <QueryError onRetry={refresh} /> : <section className="surface directory-card" data-testid="section-agent-directory"><div className="directory-summary"><div><p className="section-kicker">Directory</p><h2>{query.isLoading ? "Loading portfolio" : `${filtered.length} relationships in view`}</h2></div><div className="directory-mini-stats"><span><strong>{agents.filter((a) => a.relationshipHealth === "warm").length}</strong> warm</span><span><strong>{agents.filter((a) => a.relationshipHealth === "at-risk").length}</strong> at risk</span></div></div><div className="directory-filters"><label className="search-field wide"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by agent, group, or student" aria-label="Search agent directory" data-testid="input-search-agents" /></label><label className="filter-select"><span>Segment</span><select value={segment} onChange={(event) => setSegment(event.target.value)} data-testid="select-filter-segment"><option value="all">All segments</option>{["active-referral", "existing-business", "inactive", "prospective", "internal", "long-tail"].map((value) => <option value={value} key={value}>{humanize(value)}</option>)}</select></label><label className="filter-select"><span>Relationship health</span><select value={health} onChange={(event) => setHealth(event.target.value)} data-testid="select-directory-health"><option value="all">All health</option>{["warm", "active", "at-risk", "dormant", "internal"].map((value) => <option value={value} key={value}>{humanize(value)}</option>)}</select></label><button className="button button-secondary filter-reset" onClick={() => { setSearch(""); setSegment("all"); setHealth("all"); }} data-testid="button-reset-filters"><Filter size={14} /> Reset</button></div>{query.isLoading ? <TableSkeleton /> : filtered.length ? <RelationshipTable agents={filtered} onSelect={setSelectedAgent} /> : <EmptyState title="No relationships in this view" detail="Clear a filter or try another search phrase." />}</section>}{selectedAgent && <RelationshipModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />}</div>;
}

function InsightsPage() {
  const summaryQuery = useGetRelationshipSummary();
  const activityQuery = useGetRelationshipActivity();
  const queryClient = useQueryClient();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const refresh = () => { queryClient.invalidateQueries({ queryKey: summaryQuery.queryKey }); queryClient.invalidateQueries({ queryKey: activityQuery.queryKey }); };
  const summary = summaryQuery.data;
  const activities = activityQuery.data ?? [];
  const patterns = [
    { title: "Warmth is a strategic asset", detail: `${summary?.warmRelationships ?? 0} warm relationships are already carrying trust. The next conversation should feel like continuity, not outreach.`, tone: "positive" },
    { title: "Follow-ups need a named owner", detail: `${summary?.openFollowUps ?? 0} open follow-ups are the clearest place to turn review notes into action. Write down the smallest next move.`, tone: "urgent" },
    { title: "Closed outcomes are useful evidence", detail: `${summary?.closedReferralCount ?? 0} referrals have a recorded outcome. Use the language that worked there when reopening similar conversations.`, tone: "neutral" },
  ];
  return <div className="insights-page"><PageHeader eyebrow="Review patterns" title="The signal behind the messages." subtitle="A concise read of what the WhatsApp review says about attention, trust, and timing."><DataControls isDark={isDark} onToggleTheme={() => { setIsDark((value) => !value); document.documentElement.classList.toggle("dark", !isDark); }} onRefresh={refresh} isFetching={summaryQuery.isFetching || activityQuery.isFetching} lastUpdated={Math.max(summaryQuery.dataUpdatedAt || 0, activityQuery.dataUpdatedAt || 0)} compact /></PageHeader>{summaryQuery.isError || activityQuery.isError ? <QueryError onRetry={refresh} /> : <><section className="insight-hero surface" data-testid="section-insight-summary"><div className="insight-hero-copy"><p className="section-kicker">Working thesis</p><h2>Relationships move when the next step feels personal.</h2><p>The review is less a list of messages than a map of trust. Keep the warm threads human, make every follow-up specific, and let outcomes improve the next opening.</p></div><div className="insight-hero-mark"><Network size={42} strokeWidth={1.2} /><span>private<br />operating picture</span></div></section><div className="insight-layout"><section className="surface patterns-card" data-testid="section-insight-patterns"><div className="surface-heading"><div><p className="section-kicker">Three things to carry forward</p><h2>Patterns worth acting on</h2></div><Sparkles size={19} className="surface-heading-icon" /></div><div className="pattern-list">{patterns.map((pattern, index) => <article className="pattern-row" key={pattern.title} data-testid={`pattern-${index}`}><span className={`pattern-number ${toneClass(pattern.tone)}`}>0{index + 1}</span><div><h3>{pattern.title}</h3><p>{pattern.detail}</p></div></article>)}</div></section><section className="surface signals-card" data-testid="section-insight-signals"><div className="surface-heading"><div><p className="section-kicker">Review snapshot</p><h2>Signal counts</h2></div><BarChart3 size={19} className="surface-heading-icon" /></div><div className="signal-grid"><div><strong>{summary?.recentReferralCount ?? 0}</strong><span>recent referrals</span></div><div><strong>{summary?.activeReferralCount ?? 0}</strong><span>active now</span></div><div><strong>{summary?.warmRelationships ?? 0}</strong><span>warm</span></div><div><strong>{summary?.closedReferralCount ?? 0}</strong><span>closed</span></div></div><div className="insight-bar"><div style={{ width: `${summary?.totalTracked ? Math.min(100, ((summary.closedReferralCount ?? 0) / summary.totalTracked) * 100) : 0}%` }} /></div><p className="bar-caption">Recorded outcomes across the tracked portfolio</p></section></div><section className="surface review-trail" data-testid="section-review-trail"><div className="surface-heading"><div><p className="section-kicker">Evidence trail</p><h2>Latest reviewed moments</h2></div><button className="icon-button export-button" onClick={() => exportCsv("relationship-review-trail.csv", activities.map((item) => ({ event: item.event, agent: item.agentName, detail: item.detail, date: item.date, tone: item.tone })))} aria-label="Export review trail as CSV" data-testid="button-export-review-trail"><Download size={15} /></button></div><ActivityFeed activities={activities} loading={summaryQuery.isLoading || activityQuery.isLoading} onSelectAgent={() => undefined} /></section></>}</div>;
}

function NotFound() {
  return <div className="not-found"><div className="state-icon"><AlertCircle size={24} /></div><p className="eyebrow">404</p><h1>This view is not in the room.</h1><p>Return to the command center to pick up the thread.</p><Link className="button button-primary" href="/" data-testid="link-return-command-center">Return to command center</Link></div>;
}

function Router({ isDark, onToggleTheme }: { isDark: boolean; onToggleTheme: () => void }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Shell isDark={isDark} onToggleTheme={onToggleTheme}><Switch><Route path="/" component={Dashboard} /><Route path="/agents" component={AgentsPage} /><Route path="/insights" component={InsightsPage} /><Route component={NotFound} /></Switch></Shell></ErrorBoundary>;
}

function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem("relayroom-theme") === "dark");
  useEffect(() => { document.documentElement.classList.toggle("dark", isDark); }, [isDark]);
  return <QueryClientProvider client={queryClient}><TooltipProvider><Router isDark={isDark} onToggleTheme={() => setIsDark((value) => !value)} /><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;