---
title: 故障机器人皮肤
published: 2026-06-28
image: ./cover.png
tags: [故障机器人, 角色皮肤]
category: 故障机器人皮肤
draft: false
---

## 下载资源

<div class="section-divider"></div>

<div class="download-fold">
  <button class="download-fold-btn" onclick="this.closest('.download-fold').classList.toggle('open')">
    <span>📦 本体文件</span>
    <span class="download-fold-arrow">›</span>
  </button>
  <div class="download-fold-body">
    <a class="df-item" href="https://files.zohopublic.com.cn/public/workdrive-public/download/27xz849c3e2b28ecd4c7581b1d2d803cc9cf8?x-cli-msg=%7B%22linkId%22%3A%221MkHDAcgClM-3aagF%22%2C%22isFileOwner%22%3Afalse%2C%22version%22%3A%221.0%22%2C%22isWDSupport%22%3Afalse%7D" target="_blank">
      <div class="df-info"><span class="df-name">📥 在线下载</span></div>
      <span class="df-dl">下载</span>
    </a>
  </div>
</div>

<style>
.section-divider {
  border: none;
  border-top: 1px dashed var(--line-divider);
  margin: .5rem 0 1rem;
}
.path-notice {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .6rem .85rem;
  border-radius: .5rem;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  font-size: .85rem;
  margin-bottom: 1rem;
  width: fit-content;
}
.path-notice strong {
  font-weight: 700;
  color: inherit;
}
.download-methods-label {
  font-size: .85rem;
  font-weight: 600;
  color: var(--primary);
  margin: 1rem 0 .5rem;
}
.download-fold {
  border: 1px solid var(--line-divider);
  border-radius: .75rem;
  overflow: hidden;
}
.dark .download-fold {
  border-color: rgba(255,255,255,.1);
}
.download-fold-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .75rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
  color: inherit;
  gap: .75rem;
  font-size: .9rem;
  font-weight: 500;
}
.download-fold-btn:hover {
  background: var(--btn-plain-bg-hover);
}
.dark .download-fold-btn:hover {
  background: rgba(255,255,255,.05);
}
.download-fold-arrow {
  flex-shrink: 0;
  font-size: 1.2rem;
  color: rgba(0,0,0,.45);
  transition: transform .25s ease, color .25s ease;
  line-height: 1;
}
.dark .download-fold-arrow {
  color: rgba(255,255,255,.4);
}
.download-fold.open .download-fold-arrow {
  color: var(--primary);
  transform: rotate(90deg);
}
.download-fold-body {
  display: none;
  flex-direction: column;
  gap: .25rem;
  padding: 0 .75rem .75rem;
}
.download-fold.open .download-fold-body {
  display: flex;
}
.df-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .6rem .75rem;
  border-radius: .5rem;
  text-decoration: none !important;
  color: rgba(0,0,0,.85) !important;
  gap: .75rem;
  transition: background .15s ease;
}
.df-item:hover {
  text-decoration: none !important;
  background: var(--btn-regular-bg-hover);
}
.dark .df-item {
  color: rgba(255,255,255,.85) !important;
}
.dark .df-item:hover {
  background: rgba(255,255,255,.06);
}
.df-info {
  display: flex;
  flex-direction: column;
  gap: .15rem;
  min-width: 0;
}
.df-name {
  font-weight: 500;
  font-size: .9rem;
  color: inherit;
}
.df-dl {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: .3rem .9rem;
  font-size: .8rem;
  font-weight: 500;
  border-radius: 999px;
  background: var(--btn-regular-bg);
  color: var(--btn-content);
  transition: all .15s ease;
}
.df-item:hover .df-dl {
  background: var(--primary);
  color: #fff;
}
.prereq-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}
</style>