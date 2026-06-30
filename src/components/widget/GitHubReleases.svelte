<script lang="ts">
	import Icon from "@/components/common/Icon.svelte";

	interface Asset { name: string; size: number; browser_download_url: string; download_count: number; }
	interface Release { id: number; tag_name: string; name: string; published_at: string; html_url: string; body: string; assets: Asset[]; }
	interface Repo { owner: string; repo: string; label: string; desc?: string; cover?: string; }

	export let repos: Repo[] = [];
	const PER_PAGE = 10;

	let view: "grid" | "detail" = "grid";
	let activeRepo = 0;

	let dataMap: Record<string, { loading: boolean; error: string; releases: Release[]; currentPage: number }> = {};

	function k(o: string, r: string) { return o + "/" + r; }

	async function load(owner: string, repo: string) {
		const key = k(owner, repo);
		if (dataMap[key]?.releases?.length) return;
		dataMap[key] = { loading: true, error: "", releases: [], currentPage: 1 };
		dataMap = dataMap;
		try {
			const all: Release[] = []; let page = 1; const pp = 100; let more = true;
			while (more) {
				const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=${pp}&page=${page}`, { headers: { Accept: "application/vnd.github+json" } });
				if (!res.ok) throw new Error(`GitHub API ${res.status}`);
				const d: Release[] = await res.json();
				all.push(...d);
				if (d.length < pp) more = false; else page++;
			}
			dataMap[key] = { loading: false, error: "", releases: all.map(r => ({ id: r.id, tag_name: r.tag_name, name: r.name || r.tag_name, published_at: r.published_at, html_url: r.html_url, body: (r.body || "").slice(0, 500), assets: (r.assets || []).map(a => ({ name: a.name, size: a.size, browser_download_url: a.browser_download_url, download_count: a.download_count })) })), currentPage: 1 };
		} catch (e: any) {
			dataMap[key] = { loading: false, error: e?.message || "加载失败", releases: [], currentPage: 1 };
		}
		dataMap = dataMap;
	}

	function goDetail(i: number) {
		activeRepo = i; view = "detail"; expandedRelease = null;
		const r = repos[i];
		if (r) load(r.owner, r.repo);
	}
	function goGrid() { view = "grid"; }

	function getPage(state: typeof dataMap[string]) {
		if (!state?.releases) return [];
		return state.releases.slice((state.currentPage - 1) * PER_PAGE, state.currentPage * PER_PAGE);
	}
	function totalPages(state: typeof dataMap[string]) { return state?.releases ? Math.ceil(state.releases.length / PER_PAGE) : 0; }
	function goPage(owner: string, repo: string, page: number) {
		const key = k(owner, repo);
		if (dataMap[key]) { dataMap[key].currentPage = page; dataMap = dataMap; expandedRelease = null; }
	}

	const ADJ = 2, VIS = ADJ * 2 + 1;
	function getPages(t: number, c: number): number[] {
		const H = -1; let l = c, r = c, n = 1;
		while (0 < l - 1 && r + 1 <= t && n + 2 <= VIS) { n += 2; l--; r++; }
		while (0 < l - 1 && n < VIS) { n++; l--; }
		while (r + 1 <= t && n < VIS) { n++; r++; }
		const p: number[] = [];
		if (l > 1) p.push(1);
		if (l === 3) p.push(2);
		if (l > 3) p.push(H);
		for (let i = l; i <= r; i++) p.push(i);
		if (r < t - 2) p.push(H);
		if (r === t - 2) p.push(t - 1);
		if (r < t) p.push(t);
		return p;
	}
	function fmtSize(b: number): string {
		if (b < 1024) return b + " B";
		if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
		if (b < 1073741824) return (b / 1048576).toFixed(1) + " MB";
		return (b / 1073741824).toFixed(2) + " GB";
	}
	function fmtDate(d: string): string {
		return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
	}

	let expandedRelease: number | null = null;
	function toggleRelease(id: number) { expandedRelease = expandedRelease === id ? null : id; }

	// 测速
	const NODES = [
		{ name: "美国通用节点", prefix: "https://proxy.gitwarp.top/" },
		{ name: "韩国节点", prefix: "http://kr2-proxy.gitwarp.top:9980/" },
		{ name: "香港节点", prefix: "http://gh.halonice.com/" },
		{ name: "直连", prefix: "" },
	];
	let dm = false, dt = false, df = "";
	let nr: { name: string; speed: number; url: string; status: string }[] = [];

	function estSpeed(l: number): number {
		if (l < 300) return 2500; if (l < 500) return 1500; if (l < 1000) return 800;
		if (l < 2000) return 300; if (l < 5000) return 100; return 20;
	}
	async function ping(u: string, to = 3000): Promise<number> {
		const s = performance.now(), ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), to);
		try { await fetch(u + (u.includes("?") ? "&" : "?") + "_t=" + Date.now(), { method: "HEAD", mode: "no-cors", signal: ctrl.signal }); } catch {}
		clearTimeout(t); return Math.round(performance.now() - s);
	}
	async function testNode(prefix: string, url: string) {
		const l1 = await ping(prefix + url, 8000);
		if (l1 >= 8000) return { ok: false, speed: 0 };
		const pings = [l1];
		for (let i = 0; i < 2; i++) { await new Promise(r => setTimeout(r, 100)); pings.push(await ping(prefix + url, 3000)); }
		const v = pings.filter(p => p < 10000);
		if (!v.length) return { ok: false, speed: 0 };
		const med = v.slice().sort((a, b) => a - b)[Math.floor(v.length / 2)];
		let sp = estSpeed(med);
		if (Math.max(...v) > med * 3) sp = Math.round(sp * 0.6);
		return { ok: true, speed: sp };
	}
	async function hd(url: string, name: string) {
		df = name; dm = true; dt = true;
		nr = NODES.map(n => ({ name: n.name, speed: 0, url: n.prefix + url, status: "testing" }));
		await Promise.allSettled(NODES.map(async (n, i) => {
			try { const r = await testNode(n.prefix, url); nr[i] = { ...nr[i], speed: r.speed, status: r.ok ? "done" : "error" }; } catch { nr[i] = { ...nr[i], status: "error" }; }
			nr = [...nr];
		}));
		dt = false;
	}
	function cm() { dm = false; }
</script>

{#if view === "grid"}
	<div class="repo-grid">
		{#each repos as r, i}
			<button class="repo-card-item" on:click={() => goDetail(i)}>
				{#if r.cover}
					<div class="repo-card-cover"><img src={r.cover} alt={r.label} loading="lazy" /></div>
				{:else}
					<div class="repo-card-cover repo-card-cover-ph"><Icon icon="material-symbols:code" /></div>
				{/if}
				<div class="repo-card-body">
					<h3 class="repo-card-label">{r.label}</h3>
					{#if r.desc}<p class="repo-card-desc">{r.desc}</p>{/if}
					<span class="repo-card-meta">{r.owner}/{r.repo}</span>
				</div>
			</button>
		{/each}
	</div>
{:else}
	{@const r = repos[activeRepo]}
	{@const key = k(r.owner, r.repo)}
	{@const state = dataMap[key]}

	<button class="back-btn" on:click={goGrid}><Icon icon="material-symbols:chevron-left-rounded" /> 返回仓库列表</button>

	<div class="detail-header">
		{#if r.cover}<img src={r.cover} alt={r.label} class="detail-cover" />{/if}
		<div><h2 class="detail-title">{r.label}</h2>{#if r.desc}<p class="detail-desc">{r.desc}</p>{/if}<p class="detail-path">{r.owner}/{r.repo}</p></div>
	</div>

	{#if state?.loading}
		<div class="ls"><div class="sp" /><span>加载中...</span></div>
	{:else if state?.error}
		<div class="es"><Icon icon="material-symbols:error-outline-rounded" class="erricon" /><span>{state.error}</span></div>
	{:else if state?.releases.length === 0}
		<div class="es"><Icon icon="material-symbols:inbox-outline-rounded" class="erricon" /><span>暂无 release</span></div>
	{:else}
		{@const tp = totalPages(state)}
		{@const pr = getPage(state)}
		<div class="rl">
			{#each pr as rel}
				<div class="ri">
					<button class="rh" on:click={() => toggleRelease(rel.id)}>
						<div class="rinfo"><span class="rtag">{rel.tag_name}</span><span class="rdate"><Icon icon="material-symbols:calendar-month-outline-rounded" class="mi" />{fmtDate(rel.published_at)}</span></div>
						<Icon icon="material-symbols:chevron-right-rounded" class={`ra${expandedRelease === rel.id ? ' ex' : ''}`} />
					</button>
					{#if expandedRelease === rel.id}
						<div class="al">
							{#each rel.assets as asset}
								<a href="javascript:void(0)" on:click|preventDefault={() => hd(asset.browser_download_url, asset.name)} class="ai">
									<div class="ainfo"><span class="aname">{asset.name}</span><span class="ameta">{fmtSize(asset.size)} · {asset.download_count} 次下载</span></div>
									<span class="dl">下载</span>
								</a>
							{/each}
							<a href={rel.html_url} target="_blank" rel="noopener noreferrer" class="vgh"><Icon icon="material-symbols:open-in-new-rounded" class="mi" />在 GitHub 查看</a>
						</div>
					{/if}
				</div>
			{/each}
		</div>
		{#if tp > 1}
			<div class="pw"><div class="pb" role="navigation">
				<div class="mpg">
					<button class="bp" disabled={state.currentPage <= 1} on:click={() => goPage(r.owner, r.repo, state.currentPage - 1)}><Icon icon="material-symbols:chevron-left-rounded" /></button>
					<div class="bpi"><span class="bpc">{state.currentPage}</span><span class="bpd">/</span><span class="bpt">{tp}</span></div>
					<button class="bp" disabled={state.currentPage >= tp} on:click={() => goPage(r.owner, r.repo, state.currentPage + 1)}><Icon icon="material-symbols:chevron-right-rounded" /></button>
				</div>
				<div class="dpg">
					<button class="bp" disabled={state.currentPage <= 1} on:click={() => goPage(r.owner, r.repo, state.currentPage - 1)}><Icon icon="material-symbols:chevron-left-rounded" /></button>
					{#each getPages(tp, state.currentPage) as p}
						{#if p === -1}<span class="bpe"><Icon icon="material-symbols:more-horiz" /></span>
						{:else if p === state.currentPage}<span class="bpa">{p}</span>
						{:else}<button class="bp" on:click={() => goPage(r.owner, r.repo, p)}>{p}</button>{/if}
					{/each}
					<button class="bp" disabled={state.currentPage >= tp} on:click={() => goPage(r.owner, r.repo, state.currentPage + 1)}><Icon icon="material-symbols:chevron-right-rounded" /></button>
				</div>
			</div></div>
		{/if}
	{/if}
{/if}

{#if dm}
<div class="so" on:click={cm} role="dialog">
<div class="sm" on:click={(e) => e.stopPropagation()}>
<div class="sh"><h3 class="st">下载测速</h3><button class="sx" on:click={cm}><Icon icon="material-symbols:close-rounded" /></button></div>
<div class="sr">
{#each [...nr].sort((a, b) => b.speed - a.speed) as r}
{@const b = [...nr].filter(x => x.status === "done").sort((a, b) => b.speed - a.speed)[0]}
<div class="srr" class:best={r === b && r.speed > 0}>
<span class="sn">{r.name}</span>
<span class="si">
{#if r.status === "testing"}<span class="ss" />{:else if r.status === "error"}<span class="se">超时</span>{:else}<span class="sv">{r.speed} KB/s</span>{/if}
{#if r.status === "done"}<a href={r.url} target="_blank" class="sdl">下载</a>{/if}
</span>
</div>
{/each}
</div>
<p class="stip">测速数据仅供参考，实际下载请自行选择</p>
</div>
</div>
{/if}
