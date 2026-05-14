# Kenney Arcade 单机网页游戏合集

这是一个可以直接托管在 GitHub Pages 上的纯静态网页游戏合集。项目使用原生 HTML、CSS、JavaScript ES Modules 与 Canvas 2D 实现，无需后端服务或构建步骤。

在线地址（部署后）：<https://gordensun.github.io/Games/>

## 游戏列表

- **星际防线**：纵版太空射击，躲避陨石、击落敌机、拾取强化。
- **草地冒险**：横版平台跳跃，收集金币宝石并抵达旗帜。
- **坦克竞技场**：俯视角坦克战，击败 AI 坦克并挑战更高波次。
- **极速赛道**：俯视角赛车计时，通过检查点完成三圈。
- **宝石连线**：交换相邻宝石，三连消除并触发连锁。
- **纸牌记忆**：翻牌配对，挑战更少步数和更短时间。

每个游戏进入时都会按需预加载自己的素材，并显示加载进度条与错误重试按钮。

## 本地运行

```bash
python3 -m http.server 4173
```

然后访问：

```text
http://localhost:4173/
```

## 素材

美术、音效和字体素材来自 [Kenney.nl](https://kenney.nl/assets)，许可为 Creative Commons CC0 1.0 Universal。项目只抽取了实际使用的素材子集，来源详情见：

```text
assets/kenney/LICENSES.md
```

如需重新下载并抽取素材：

```bash
python3 scripts/fetch_kenney_assets.py --force
python3 scripts/fetch_kenney_assets.py --verify
```

## 校验

```bash
node scripts/validate_static_site.mjs
```

该脚本会检查关键静态文件、素材 manifest、素材文件存在性和 JS 模块基础语法。

## 部署

仓库包含 GitHub Pages Actions 工作流：`.github/workflows/deploy-pages.yml`。

推送到配置的分支后，工作流会上传整个静态站点并部署到 GitHub Pages。若仓库尚未启用 Pages，请在 GitHub 仓库的 **Settings → Pages** 中选择 **GitHub Actions** 作为发布来源，然后重新运行工作流。
