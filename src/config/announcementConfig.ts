import type { AnnouncementConfig } from "../types/announcementConfig";

export const announcementConfig: AnnouncementConfig = {
	// 公告标题
	title: "公告",

	// 公告内容
	content: "点击下方按钮跳转到塔二手机版/前置模组下载页面",

	// 是否允许用户关闭公告
	closable: true,

	link: {
		// 启用链接
		enable: true,
		// 链接文本
		text: "立即下载",
		// 链接 URL
		url: "/releases/",
		// 内部链接
		external: false,
	},

	extraLink: {
		enable: true,
		text: "下载电脑版",
		url: "https://files.zohopublic.com.cn/public/workdrive-public/download/27xz80cb01ac1e0c745bcbee28049c331c465?x-cli-msg=%7B%22linkId%22%3A%221MkHDAcgIAH-3aagF%22%2C%22isFileOwner%22%3Afalse%2C%22version%22%3A%221.0%22%2C%22isWDSupport%22%3Afalse%7D",
		external: true,
	},
};
