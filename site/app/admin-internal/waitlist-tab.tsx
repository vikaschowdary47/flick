"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type SiteRow = { id: string; email: string; use_type: string | null; source: string | null; created_at: string };
type ProRow = { id: string; email: string; limit_hit: string; created_at: string };

// Spreadsheet programs run cells that start with = + - @ as formulas; prefix them so an email
// someone typed into the public form can't turn into one.
function csvCell(value: string | null | undefined): string {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

function download(name: string, header: string[], lines: Array<Array<string | null | undefined>>) {
  const csv = [header.map(csvCell).join(","), ...lines.map((l) => l.map(csvCell).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function WaitlistTab() {
  const [site, setSite] = useState<SiteRow[]>([]);
  const [pro, setPro] = useState<ProRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    void Promise.all([
      supabase.from("marketing_waitlist").select("id,email,use_type,source,created_at").order("created_at", { ascending: false }).limit(5000),
      supabase.from("waitlist").select("id,email,limit_hit,created_at").order("created_at", { ascending: false }).limit(5000),
    ]).then(([s, p]) => {
      if (s.error || p.error) setError((s.error ?? p.error)?.message ?? "Could not load.");
      setSite((s.data ?? []) as SiteRow[]);
      setPro((p.data ?? []) as ProRow[]);
      setLoading(false);
    });
  }, []);

  const bySource = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of site) counts.set(r.source || "direct", (counts.get(r.source || "direct") ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [site]);

  return (
    <>
      {error && <p className="adm-msg err">{error}. Has the second migration been run?</p>}
      {loading && <p className="adm-lead">Loading…</p>}
      <section className="adm-card">
        <header><h2>Website signups ({site.length})</h2>
          <button type="button" disabled={!site.length} onClick={() => download("eqlshare-site-waitlist.csv", ["email", "use", "source", "joined"], site.map((r) => [r.email, r.use_type, r.source, r.created_at]))}>Export CSV</button>
        </header>
        {bySource.length > 0 && <p className="adm-meta">Where they came from: {bySource.map(([s, n]) => `${s} ${n}`).join(" · ")}</p>}
        <div className="adm-table"><table><thead><tr><th>Email</th><th>Use</th><th>Source</th><th>Joined</th></tr></thead>
          <tbody>{site.slice(0, 200).map((r) => <tr key={r.id}><td>{r.email}</td><td>{r.use_type ?? ""}</td><td>{r.source ?? ""}</td><td>{new Date(r.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>
        {site.length > 200 && <p className="adm-meta">Showing the newest 200. Export for the full list.</p>}
      </section>
      <section className="adm-card">
        <header><h2>Pro requests from the apps ({pro.length})</h2>
          <button type="button" disabled={!pro.length} onClick={() => download("eqlshare-pro-waitlist.csv", ["email", "limit_hit", "requested"], pro.map((r) => [r.email, r.limit_hit, r.created_at]))}>Export CSV</button>
        </header>
        <div className="adm-table"><table><thead><tr><th>Email</th><th>Limit hit</th><th>Requested</th></tr></thead>
          <tbody>{pro.slice(0, 200).map((r) => <tr key={r.id}><td>{r.email}</td><td>{r.limit_hit}</td><td>{new Date(r.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>
      </section>
    </>
  );
}
