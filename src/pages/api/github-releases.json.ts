/**
 * GitHub Releases API 代理
 * GET /api/github-releases.json?owner=xxx&repo=yyy
 * 服务端请求 GitHub API，自动翻页获取全部 releases，避免 token 暴露在前端
 */
import { githubReleasesConfig } from "@/config/githubReleasesConfig";

interface GitHubRelease {
	id: number;
	tag_name: string;
	name: string;
	published_at: string;
	html_url: string;
	body: string;
	assets: {
		name: string;
		size: number;
		browser_download_url: string;
		download_count: number;
	}[];
}

export const prerender = false;

export async function GET({ url }: { url: URL }) {
	const owner = url.searchParams.get("owner");
	const repo = url.searchParams.get("repo");
	// 是否强制刷新（跳过缓存逻辑，始终拉取全量）
	const refresh = url.searchParams.get("refresh") === "1";

	if (!owner || !repo) {
		return new Response(
			JSON.stringify({ error: "缺少 owner 或 repo 参数" }),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	}

	const token = import.meta.env.GITHUB_TOKEN;
	const headers: Record<string, string> = {
		"User-Agent": "Firefly-Blog",
		Accept: "application/vnd.github+json",
	};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	try {
		// 分页获取全部 releases（每页最多 100 条）
		const allReleases: GitHubRelease[] = [];
		let page = 1;
		const perPage = 100;
		let hasMore = true;

		while (hasMore) {
			const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`;
			const response = await fetch(apiUrl, { headers });

			if (!response.ok) {
				return new Response(
					JSON.stringify({
						error: `GitHub API 返回 ${response.status}: ${response.statusText}`,
					}),
					{
						status: response.status,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			const data: GitHubRelease[] = await response.json();
			allReleases.push(...data);

			// 如果返回数量少于 perPage，说明已是最后一页
			if (data.length < perPage) {
				hasMore = false;
			} else {
				page++;
			}
		}

		// 精简返回数据，只保留前端需要的字段
		const releases = allReleases.map((release) => ({
			id: release.id,
			tag_name: release.tag_name,
			name: release.name || release.tag_name,
			published_at: release.published_at,
			html_url: release.html_url,
			body: release.body?.slice(0, 500) ?? "",
			assets: release.assets.map((asset) => ({
				name: asset.name,
				size: asset.size,
				browser_download_url: asset.browser_download_url,
				download_count: asset.download_count,
			})),
		}));

		const headersOut: Record<string, string> = {
			"Content-Type": "application/json",
		};

		// 如果是全量刷新，使用短缓存；否则使用配置的缓存时间
		if (refresh) {
			headersOut["Cache-Control"] = "public, max-age=60";
		} else {
			headersOut["Cache-Control"] = `public, max-age=${githubReleasesConfig.cacheMaxAge}`;
		}

		return new Response(
			JSON.stringify({ releases, total: releases.length }),
			{ headers: headersOut },
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ error: "请求 GitHub API 失败，请稍后重试" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}
