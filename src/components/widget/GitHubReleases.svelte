<script lang="ts">
	import Icon from "@/components/common/Icon.svelte";

	interface Asset {
		name: string;
		size: number;
		browser_download_url: string;
		download_count: number;
	}

	interface Release {
		id: number;
		tag_name: string;
		name: string;
		published_at: string;
		html_url: string;
		body: string;
		assets: Asset[];
	}

	interface RepoConfig {
		owner: string;
		repo: string;
		label: string;
	}

	export let repos: RepoConfig[] = [];

	const PER_PAGE = 10;

	let releasesMap: Record<string, {
		loading: boolean;
		error: string;
		data: Release[];
		total: number;
		currentPage: number;
	}> = {};

	function getKey(owner: string, repo: string) {
		return `${owner}/${repo}`;
	}

	async function fetchReleases(owner: string, repo: string) {
		const key = getKey(owner, repo);
		if (releasesMap[key]?.data.length) return;

		releasesMap[key] = { loading: true, error: "", data: [], total: 0, currentPage: 1 };
		releasesMap = releasesMap;

		try {
			// 直接请求 GitHub API，分页获取全部 releases
			const allReleases: Release[] = [];
			let page = 1;
			const perPage = 100;
			let hasMore = true;

			while (hasMore) {
				const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=${perPage}&page=${page}`;
				const res = await fetch(apiUrl, {
					headers: { Accept: "application/vnd.github+json" },
				});

				if (!res.ok) {
					throw new Error(`GitHub API 返回 ${res.status}`);
				}

				const data: Release[] = await res.json();
				allReleases.push(...data);

				if (data.length < perPage) {
					hasMore = false;
				} else {
					page++;
				}
			}

			// 精简数据
			const releases = allReleases.map((r) => ({
				id: r.id,
				tag_name: r.tag_name,
				name: r.name || r.tag_name,
				published_at: r.published_at,
				html_url: r.html_url,
				body: (r.body || "").slice(0, 500),
				assets: (r.assets || []).map((a) => ({
					name: a.name,
					size: a.size,
					browser_download_url: a.browser_download_url,
					download_count: a.download_count,
				})),
			}));

			releasesMap[key] = {
				loading: false,
				error: "",
				data: releases,
				total: releases.length,
				currentPage: 1,
			};
		} catch (e: any) {
			releasesMap[key] = {
				loading: false,
				error: e?.message || "网络请求失败",
				data: [],
				total: 0,
				currentPage: 1,
			};
		}
		releasesMap = releasesMap;
	}

	function getPageReleases(state: typeof releasesMap[string]): Release[] {
		if (!state?.data) return [];
		const start = (state.currentPage - 1) * PER_PAGE;
		return state.data.slice(start, start + PER_PAGE);
	}

	function getTotalPages(state: typeof releasesMap[string]): number {
		if (!state?.data) return 0;
		return Math.ceil(state.data.length / PER_PAGE);
	}

	function goToPage(owner: string, repo: string, page: number) {
		const key = getKey(owner, repo);
		if (!releasesMap[key]) return;
		releasesMap[key].currentPage = page;
		releasesMap = releasesMap;
		expandedRelease = null;
	}

	const ADJ_DIST = 2;
	const VISIBLE = ADJ_DIST * 2 + 1;

	function getPages(totalPages: number, currentPage: number): number[] {
		const HIDDEN = -1;
		let l = currentPage;
		let r = currentPage;
		let count = 1;
		while (0 < l - 1 && r + 1 <= totalPages && count + 2 <= VISIBLE) {
			count += 2; l--; r++;
		}
		while (0 < l - 1 && count < VISIBLE) { count++; l--; }
		while (r + 1 <= totalPages && count < VISIBLE) { count++; r++; }

		const pages: number[] = [];
		if (l > 1) pages.push(1);
		if (l === 3) pages.push(2);
		if (l > 3) pages.push(HIDDEN);
		for (let i = l; i <= r; i++) pages.push(i);
		if (r < totalPages - 2) pages.push(HIDDEN);
		if (r === totalPages - 2) pages.push(totalPages - 1);
		if (r < totalPages) pages.push(totalPages);
		return pages;
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString("zh-CN", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
	}

	let expandedRepo = "";
	let expandedRelease: number | null = null;

	function toggleRepo(owner: string, repo: string) {
		const key = getKey(owner, repo);
		if (expandedRepo === key) {
			expandedRepo = "";
		} else {
			expandedRepo = key;
			fetchReleases(owner, repo);
		}
	}

	function toggleRelease(id: number) {
		expandedRelease = expandedRelease === id ? null : id;
	}

	// 下载测速（参考：HEAD 延迟估算速度）
	const NODES = [
		{ name: "美国通用节点", prefix: "https://proxy.gitwarp.top/" },
		{ name: "韩国节点", prefix: "http://kr2-proxy.gitwarp.top:9980/" },
		{ name: "香港节点", prefix: "http://gh.halonice.com/" },
		{ name: "直连", prefix: "" },
	];
	let dm = false, dt = false, df = "";
	let nr = [];

	function estSpeed(latency) {
		if (latency < 300) return 2500;
		if (latency < 500) return 1500;
		if (latency < 1000) return 800;
		if (latency < 2000) return 300;
		if (latency < 5000) return 100;
		return 20;
	}

	async function ping(url, timeout = 3000) {
		const s = performance.now();
		const ctrl = new AbortController();
		const t = setTimeout(() => ctrl.abort(), timeout);
		try {
			await fetch(url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now(), {
				method: "HEAD", mode: "no-cors", signal: ctrl.signal
			});
		} catch {}
		clearTimeout(t);
		return Math.round(performance.now() - s);
	}

	async function testNode(prefix, releaseUrl) {
		const latency = await ping(prefix + releaseUrl, 8000);
		if (latency >= 8000) return { success: false, latency: 8000, speed: 0, anomaly: true };
		// 多次 ping 检测稳定性
		const pings = [latency];
		for (let i = 0; i < 2; i++) {
			await new Promise(r => setTimeout(r, 100));
			pings.push(await ping(prefix + releaseUrl, 3000));
		}
		const valid = pings.filter(p => p < 10000);
		if (!valid.length) return { success: false, latency: 8000, speed: 0, anomaly: true };
		const median = valid.slice().sort((a, b) => a - b)[Math.floor(valid.length / 2)];
		const maxPing = Math.max(...valid);
		const anomaly = maxPing > median * 3;
		let speed = estSpeed(median);
		if (anomaly) speed = Math.round(speed * 0.6);
		return { success: true, latency: median, speed, anomaly };
	}

	async function hd(url, name) {
		df = name; dm = true; dt = true;
		nr = NODES.map(n => ({ name: n.name, speed: 0, ms: 0, url: n.prefix + url, status: "testing", note: "" }));
		await Promise.allSettled(NODES.map(async (n, i) => {
			try {
				const r = await testNode(n.prefix, url);
				nr[i] = { ...nr[i], ms: r.latency, speed: r.speed, status: r.success ? "done" : "error", note: r.anomaly ? "延迟异常" : "稳定" };
			} catch { nr[i] = { ...nr[i], status: "error" }; }
			nr = [...nr];
		}));
		dt = false;
	}
	function cm() { dm = false; }
</script>

<div class="releases-container">
	{#each repos as { owner, repo, label }}
		{@const key = getKey(owner, repo)}
		{@const state = releasesMap[key]}
		<div class="repo-card">
			<button
				class="repo-header"
				on:click={() => toggleRepo(owner, repo)}
				aria-expanded={expandedRepo === key}
			>
				<div class="repo-title-row">
					<Icon icon="material-symbols:chevron-right-rounded" class={`repo-arrow${expandedRepo === key ? ' expanded' : ''}`} />
					<span class="repo-name">{label || repo}</span>
					<span class="repo-path">{owner}/{repo}</span>
				</div>
				{#if state && !state.loading}
					<span class="repo-count">{state.data.length} releases</span>
				{/if}
			</button>

			{#if expandedRepo === key}
				<div class="repo-content">
					{#if state?.loading}
						<div class="loading-state">
							<div class="spinner" />
							<span>加载中...</span>
						</div>
					{:else if state?.error}
						<div class="error-state">
							<Icon icon="material-symbols:error-outline-rounded" class="err-icon" />
							<span>{state.error}</span>
						</div>
					{:else if state?.data.length === 0}
						<div class="empty-state">
							<Icon icon="material-symbols:inbox-outline-rounded" class="empty-icon" />
							<span>暂无 release</span>
						</div>
					{:else}
						{@const totalPages = getTotalPages(state)}
						{@const pageReleases = getPageReleases(state)}
						<div class="releases-list">
							{#each pageReleases as release}
								<div class="release-item">
									<button
										class="release-header"
										on:click={() => toggleRelease(release.id)}
									>
										<div class="release-info">
											<span class="release-tag">{release.tag_name}</span>
											<span class="release-date">
												<Icon icon="material-symbols:calendar-month-outline-rounded" class="meta-icon" />
												{formatDate(release.published_at)}
											</span>
										</div>
										<Icon icon="material-symbols:chevron-right-rounded" class={`release-arrow${expandedRelease === release.id ? ' expanded' : ''}`} />
									</button>

									{#if expandedRelease === release.id}
										<div class="assets-list">
											{#each release.assets as asset}
												<a
													href="javascript:void(0)" on:click|preventDefault={() => hd(asset.browser_download_url, asset.name)}
																											class="asset-item"
												>
													<div class="asset-info">
														<span class="asset-name">{asset.name}</span>
														<span class="asset-meta">
															{formatSize(asset.size)}
															<span aria-hidden="true">·</span>
															{asset.download_count} 次下载
														</span>
													</div>
													<span class="download-link">
														下载
													</span>
												</a>
											{/each}
											<a
												href={release.html_url}
																								class="view-on-github"
											>
												<Icon icon="material-symbols:open-in-new-rounded" class="meta-icon" />
												在 GitHub 查看
											</a>
										</div>
									{/if}
								</div>
							{/each}
						</div>

						{#if totalPages > 1}
							<div class="pagination-wrapper">
								<div class="pagination-bar" role="navigation">
									<div class="mobile-pagination">
										<button
											class="btn-card rounded-lg btn-page"
											disabled={state.currentPage <= 1}
											on:click={() => goToPage(owner, repo, state.currentPage - 1)}
										>
											<Icon icon="material-symbols:chevron-left-rounded" />
										</button>
										<div class="btn-card rounded-lg btn-page-info">
											<span class="btn-page-current">{state.currentPage}</span>
											<span class="btn-page-divider">/</span>
											<span class="btn-page-total">{totalPages}</span>
										</div>
										<button
											class="btn-card rounded-lg btn-page"
											disabled={state.currentPage >= totalPages}
											on:click={() => goToPage(owner, repo, state.currentPage + 1)}
										>
											<Icon icon="material-symbols:chevron-right-rounded" />
										</button>
									</div>

									<div class="desktop-pagination">
										<button
											class="btn-card rounded-lg btn-page"
											disabled={state.currentPage <= 1}
											on:click={() => goToPage(owner, repo, state.currentPage - 1)}
										>
											<Icon icon="material-symbols:chevron-left-rounded" />
										</button>

										{#each getPages(totalPages, state.currentPage) as p}
											{#if p === -1}
												<span class="btn-page-ellipsis">
													<Icon icon="material-symbols:more-horiz" />
												</span>
											{:else if p === state.currentPage}
												<span class="btn-page-active rounded-lg">{p}</span>
											{:else}
												<button
													class="btn-card rounded-lg btn-page"
													on:click={() => goToPage(owner, repo, p)}
												>{p}</button>
											{/if}
										{/each}

										<button
											class="btn-card rounded-lg btn-page"
											disabled={state.currentPage >= totalPages}
											on:click={() => goToPage(owner, repo, state.currentPage + 1)}
										>
											<Icon icon="material-symbols:chevron-right-rounded" />
										</button>
									</div>
								</div>
							</div>
						{/if}
					{/if}
				</div>
			{/if}
		</div>
	{/each}

<!-- 测速 -->
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
{#if !dt && [...nr].every(r => r.status === "error")}
<p class="se" style="text-align:center;margin-top:.5rem">全部超时，请稍后重试</p>
{/if}
</div>
</div>
{/if}
</div>

<style>
	.releases-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.repo-card {
		border-radius: var(--radius-large);
		overflow: hidden;
		border: 1px solid var(--line-divider);
		background: var(--card-bg);
	}

	.repo-header {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border: none;
		background: transparent;
		cursor: pointer;
		font: inherit;
		color: inherit;
		gap: 1rem;
	}

	.repo-header:hover {
		background: var(--btn-plain-bg-hover);
	}

	.repo-title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		flex: 1;
		text-align: left;
	}

	:global(.repo-arrow) {
		flex-shrink: 0;
		font-size: 1.2rem;
		color: rgba(0,0,0,0.45);
		transition: transform 0.25s ease, color 0.25s ease;
	}
	:global(.repo-arrow.expanded) {
		color: var(--primary);
		transform: rotate(90deg);
	}
	.repo-header:hover :global(.repo-arrow) {
		color: var(--primary);
	}
	.dark :global(.repo-arrow) {
		color: rgba(255,255,255,0.4);
	}

	.repo-name {
		font-weight: 600;
		font-size: 1rem;
	}

	.repo-path {
		font-size: 0.8rem;
		opacity: 0.6;
	}

	.repo-count {
		flex-shrink: 0;
		font-size: 0.75rem;
		opacity: 0.55;
	}

	.repo-content {
		padding: 0 1.25rem 1rem;
		border-top: 1px dashed var(--line-divider);
	}

	.loading-state {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem 0;
		opacity: 0.75;
	}

	.spinner {
		width: 1.2rem;
		height: 1.2rem;
		border: 2px solid var(--line-divider);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.error-state,
	.empty-state {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem 0;
		opacity: 0.75;
	}

	.error-state {
		color: var(--admonitions-color-warning, #e74c3c);
	}

	:global(.err-icon),
	:global(.empty-icon) {
		font-size: 1.1rem;
	}

	.releases-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem 0;
	}

	.release-item {
		border: 1px solid var(--line-divider);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.release-header {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border: none;
		background: transparent;
		cursor: pointer;
		font: inherit;
		color: inherit;
		gap: 0.75rem;
	}

	.release-header:hover {
		background: var(--btn-plain-bg-hover);
	}

	.release-info {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		min-width: 0;
		font-size: 0.9rem;
	}

	.release-tag {
		display: inline-flex;
		align-items: center;
		font-weight: 600;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		background: var(--primary);
		color: #fff;
		font-size: 0.8rem;
	}

	.release-date {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		opacity: 0.7;
		font-size: 0.8rem;
	}

	.release-assets-count {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		opacity: 0.7;
		font-size: 0.8rem;
	}

	:global(.release-arrow) {
		flex-shrink: 0;
		font-size: 1rem;
		color: rgba(0,0,0,0.45);
		transition: transform 0.25s ease, color 0.25s ease;
	}
	:global(.release-arrow.expanded) {
		color: var(--primary);
		transform: rotate(90deg);
	}
	.release-header:hover :global(.release-arrow) {
		color: var(--primary);
	}
	.dark :global(.release-arrow) {
		color: rgba(255,255,255,0.4);
	}

	:global(.meta-icon) {
		font-size: 0.9em;
		flex-shrink: 0;
	}

	.assets-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0 0.75rem 0.75rem;
	}

	.asset-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.6rem 0.75rem;
		border-radius: 0.5rem;
		text-decoration: none;
		color: inherit;
		gap: 0.75rem;
		transition: background 0.15s ease;
	}

	.asset-item:hover {
		background: var(--btn-regular-bg-hover);
	}

	.asset-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.asset-name {
		font-weight: 500;
		font-size: 0.9rem;
	}

	.asset-meta {
		font-size: 0.75rem;
		opacity: 0.65;
		display: flex;
		gap: 0.35rem;
	}

	.download-link {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.9rem;
		font-size: 0.8rem;
		font-weight: 500;
		border-radius: 999px;
		background: var(--btn-regular-bg);
		color: var(--btn-content);
		transition: all 0.15s ease;
	}

	.asset-item:hover .download-link {
		background: var(--primary); color: #fff;
	}

	.view-on-github {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.5rem 0.75rem;
		margin-top: 0.25rem;
		font-size: 0.85rem;
		color: var(--primary);
		text-decoration: none;
		border-radius: 0.5rem;
		transition: background 0.15s ease;
		width: fit-content;
	}

	.view-on-github:hover {
		background: var(--btn-plain-bg-hover);
	}

	/* 翻页 */
	.pagination-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1rem 0 0.25rem;
	}

	.pagination-bar {
		display: flex;
		justify-content: center;
	}

	.btn-page {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border: none;
		background: transparent;
		cursor: pointer;
		font: inherit;
		font-size: 1.25rem;
		color: var(--primary);
		transition: all 0.15s ease;
	}

	.btn-page:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.btn-page:not(:disabled):hover {
		background: var(--btn-regular-bg-hover);
	}

	.btn-page:not(:disabled):active {
		transform: scale(0.95);
	}

	.btn-page-info {
		display: flex;
		align-items: center;
		padding: 0 1rem;
		height: 2.75rem;
		gap: 0.375rem;
	}

	.btn-page-current {
		font-weight: 700;
		font-size: 1rem;
		color: var(--primary);
	}

	.btn-page-divider {
		font-size: 0.875rem;
		opacity: 0.5;
	}

	.btn-page-total {
		font-weight: 700;
		font-size: 1rem;
	}

	.btn-page-active {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		font-weight: 700;
		background: var(--primary);
		color: #fff;
		border-radius: 0.5rem;
	}

	:global(.btn-page-ellipsis) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		font-size: 1.1rem;
		opacity: 0.5;
	}

	.mobile-pagination {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.desktop-pagination {
		display: none;
		align-items: center;
		gap: 0.75rem;
	}

	@media (min-width: 1024px) {
		.mobile-pagination {
			display: none;
		}
		.desktop-pagination {
			display: flex;
		}
	}

.so{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.sm{background:var(--card-bg);border-radius:var(--radius-large);padding:1.5rem;min-width:300px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.2);max-height:90vh;overflow-y:auto}
.sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:.25rem}
.st{font-size:1.1rem;font-weight:700;text-align:center;flex:1}
.sx{display:flex;align-items:center;justify-content:center;width:2rem;height:2rem;border:none;background:transparent;cursor:pointer;border-radius:.5rem;color:var(--text-meta,rgba(0,0,0,.35));font-size:1.2rem;transition:all .15s ease;flex-shrink:0}
.sx:hover{background:var(--btn-regular-bg-hover);color:var(--primary)}
.sf{font-size:.8rem;opacity:.5;text-align:center;margin-bottom:1rem;word-break:break-all}
.sr{display:flex;flex-direction:column;gap:.4rem}
.srr{display:flex;align-items:center;justify-content:space-between;padding:.5rem .75rem;border-radius:.5rem;border:1px solid var(--line-divider);gap:.5rem}
.srr.best{border-color:var(--primary);background:color-mix(in srgb, var(--primary) 8%, transparent)}
.sn{font-weight:600;font-size:.9rem;flex-shrink:0}
.si{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;justify-content:flex-end}
.sdl{display:inline-flex;align-items:center;padding:.25rem .75rem;border-radius:999px;font-size:.78rem;font-weight:600;text-decoration:none;background:var(--btn-regular-bg);color:var(--btn-content);transition:all .15s ease;flex-shrink:0}
.sdl:hover{background:var(--primary);color:#fff}
.sn2{font-size:.8rem;opacity:.6}
.sn3{font-size:.75rem;opacity:.5}
.sv{font-weight:700;color:var(--primary);font-size:.85rem}
.se{font-size:.8rem;color:var(--admonitions-color-warning, #e74c3c)}
.ss{width:1rem;height:1rem;border:2px solid var(--line-divider);border-top-color:var(--primary);border-radius:50%;animation:spin .8s linear infinite}</style>
