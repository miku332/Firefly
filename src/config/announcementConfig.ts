import type { AnnouncementConfig } from "../types/announcementConfig";

export const announcementConfig: AnnouncementConfig = {
	// 公告标题
	title: "公告",

	// 公告内容
	content: "点击下方按钮跳转到下载前置模组页面",

	// 是否允许用户关闭公告
	closable: true,

	link: {
		// 启用链接
		enable: true,
		// 链接文本
		text: "下载前置模组",
		// 链接 URL
		url: "/releases/",
		// 内部链接
		external: false,
	},
};
