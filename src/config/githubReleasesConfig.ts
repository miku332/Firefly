/**
 * GitHub Releases 配置
 * 用于 /releases/ 页面展示指定仓库的 releases
 */
export interface GitHubRepo {
	/** 仓库所有者 */
	owner: string;
	/** 仓库名称 */
	repo: string;
	/** 显示名称（可选，默认使用 repo） */
	label?: string;
}

export const githubReleasesConfig = {
	/** 要追踪的 GitHub 仓库列表 */
	repos: [
		{ owner: "Alchyr", repo: "BaseLib-StS2" },
			{ owner: "BAKAOLC", repo: "STS2-RitsuLib" },
	] as GitHubRepo[],

	/** API 缓存时间（秒），建议 300-600 */
	cacheMaxAge: 600,
};
