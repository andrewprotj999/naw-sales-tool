# Northwest Artisan Windows Sales Tool Update

The download issue was fixed by replacing the browser print flow with a direct one-page PDF export that preserves the designed close-sheet layout.

| Item | Link |
| --- | --- |
| Live updated tool | https://3000-i5ysyurm4s6c6mutb5y35-a44bfb05.us2.manus.computer |
| Repository | https://github.com/andrewprotj999/naw-sales-tool |
| Latest pushed fix | https://github.com/andrewprotj999/naw-sales-tool/commit/aca3d35 |

The key change is in `client/src/pages/Home.tsx`, where the PDF download now renders the close sheet to a fixed letter-size PDF instead of relying on the browser print dialog.
