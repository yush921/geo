# ちずネタ(都道府県)

地図で覚えて、雑談で使える一般教養アプリ。PC とスマホの両方で使える PWA です(自分用)。

## 機能

| 画面 | 内容 |
|---|---|
| 🗾 地図 | 都道府県をタップして、県庁所在地・観光地・遺産・名産品(写真付き)・話のネタを表示。県庁所在地・主要都市・観光地・遺産を地図にピン表示できる。「地方」と「習熟度」で色分けを切り替えられる |
| 💬 話すなら | 相手の出身地を選ぶと、褒めどころ・名物・使えるネタ3つ・気をつけたい話題を1画面にまとめて表示。場面(初対面/出張/旅行/手土産/飲み会)でネタを絞り込める |
| ☀️ 今日の1ネタ | 毎日1つネタを表示。「知ってた」を押したネタは次から出ない |
| ❓ クイズ | 位置当て・県庁所在地・ネタ当て・写真当ての4形式。答えた後に「人に話したくなる一言」を表示。間違えた問題は間隔反復で再出題 |
| 📒 ネタ帳 | お気に入り・使ったネタ・メモの一覧と検索。写真当てで正解した観光地などが埋まっていく図鑑。PC とスマホの間で学習記録を JSON ファイルで受け渡せる |

## 開発

```bash
npm install
npm run dev          # 開発サーバー
npm run check:data   # データの簡易チェック(座標が別の県に入っていないかも確認)
npm run data:update  # Wikipedia から座標・写真を取り直す(下記)
npm run build        # 本番ビルド(dist/)
```

## 公開(GitHub Pages)

`main` に push すると GitHub Actions でビルドして Pages に公開します。
初回のみ、リポジトリの **Settings → Pages → Source** で **GitHub Actions** を選んでください。
(無料プランで Pages を使うにはリポジトリを公開にする必要があります。非公開のままにしたい場合は Cloudflare Pages などを使います)

## データ

```
src/data/jp/
  define.ts            都道府県1件分の入力形式 → 内部の型に変換
  hokkaido-tohoku.ts   ほか地方ごとのファイル(都道府県 + 話すなら情報 + ネタ5件)
  japan.topo.json      都道府県の境界(地球地図日本を簡略化)
  spots.ts             観光地・遺産・名産品(名前・説明・Wikipedia の記事名)
  cities.ts            地図にピン表示する主要都市(県庁所在地は自動)
  wiki.generated.json  ↑の座標・写真・ライセンス(自動生成。手で編集しない)
public/photos/         写真の縮小版(自動生成)
src/types.ts           データモデル(世界版でも使う共通の型)
```

### 観光地・都市を追加・修正したとき

`spots.ts` / `cities.ts` を編集してから、次を実行します。

```bash
npm run data:update
```

1. `fetch:wiki` … Wikipedia から座標と代表写真、Wikimedia Commons から写真の作者・ライセンスを取得
2. `fetch:images` … 写真を縮小して `public/photos/` に保存(Wikimedia への直リンクはアクセス制限にかかるため同梱)
3. `check:data` … 座標が別の都道府県に入っていないかなどを確認

記事が見つからない・曖昧さ回避ページになる場合は、`spots.ts` の4番目の要素に正しい記事名を書きます。座標がずれる・取れない場合は `COORD_OVERRIDES` に手で書きます。

### 写真の出典

写真は Wikimedia Commons のもので、画面に作者とライセンスを表示しています(各写真のリンクから Commons のファイルページに移動できます)。

- **ネタは AI による下書きで、すべて「未確認」(`reviewed: false`)です。** 確認したら `reviewed: true` を付けると、画面の「未確認」表示が消えます。
- ネタの ID は並び順で決まるため(例: `jp-13-2`)、追加は各県の配列の**末尾**に行ってください(途中に入れると、お気に入りの紐付けがずれます)。
- 統計やランキングなど年で変わる情報には `year` を入れます。

### 地図の出典

地図データ: [地球地図日本](https://www.gsi.go.jp/kankyochiri/gm_jpn.html)(国土地理院)を [dataofjapan/land](https://github.com/dataofjapan/land) で TopoJSON に変換したものを、mapshaper で簡略化して使用。

## 世界版に向けて

場所は `Region`(`country` → `admin1` → `city`)の階層で表し、ネタは `Neta.targets` で場所に紐付けています。世界版では `src/data/world/` に国のデータと世界地図(Natural Earth)を追加し、地図コンポーネントを差し替える想定です。
