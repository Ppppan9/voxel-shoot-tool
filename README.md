# 体素射击核玩工具 · voxel-shoot-tool

垂直休闲「库存方块 → 槽位炮台 → 白球打体素」核玩工具。独立新仓库（非 block-shooter-tool 更新）。

**GitHub Pages:** https://ppppan9.github.io/voxel-shoot-tool/

## 玩法
- 顶部旋转 3D 体素目标（笼球 / 笼方 / 猫 / 房子 / 冰淇淋 / 西瓜）
- 中部 5 个槽位：有弹药的彩色玩具炮台自动向上射击，优先同色外露体素
- 底部库存网格：点彩色数字方块 → 飞入空槽变成同色炮台
- 可选通关（目标清空）/ 失败（无空槽且无法继续）

## 开发
```bash
npm i
npm run build   # → index.html
npm test
```

设置带 `SETTINGS_VERSION` + `migrate()`。导出：录屏、AE ZIP、3D(glTF)、H5 八渠道试玩。
