# Repository conventions

Repository はデータアクセスだけを担当し、業務ルールや通知処理は service 層に置く。

## File structure

1. import
2. 型定義
3. 読み取り (`get`, `find`)
4. 作成・Upsert (`create`, `insert`, `upsert`)
5. 更新 (`update`)
6. 削除 (`delete`, `archive`)
7. 同期・移行などの補助処理

## Comments

- 公開関数の説明には、簡潔な日本語の JSDoc を付ける。
- 実装から明らかな処理にはコメントを付けない。
- コメントは「何をするか」より、命名だけでは伝わらない「なぜそうするか」を優先する。
- 各ファイルの先頭には、ファイル階層を示すパンくずコメントを置く。
- 番号付きの飾り見出しや絵文字付きの作業メモは追加しない。
- ドメインが切り替わる大きなまとまりには、必要に応じて英語の短いセクションコメントを付ける。

## Logging and errors

- Repository では `console.log`、`console.warn`、`console.error` を使わない。
- DB/API のエラーは握りつぶさず、そのまま service 層へ伝播させる。
- エラーの文脈を追加する必要がある場合は service/controller 層でログを記録する。

## Query style

- Kysely の query builder を使い、SQL 文字列を直接組み立てない。
- 更新・削除後に呼び出し側が結果を必要とする場合は、`returningAll()` などで結果を返す。
- 空配列など明確に処理不要な入力は、DB クエリの前に早期 return する。
