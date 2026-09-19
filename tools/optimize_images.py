"""public/assets 内の PNG / JPG を WebP に変換して、元画像を assets_src/ へ退避する。

使い方:  npm run optimize
- 新しく用意したPNG/JPGを public/assets/ に置いたあとに実行すると、WebPに変換される。
- ゲーム側(src/game/assets.js の p())は .png/.jpg のパスを自動で .webp に読み替えるので、
  コード上のファイル名は今まで通り .png のままでよい。
- 元画像は assets_src/ に同じフォルダ構成で保存される(消えない)。
"""
import os
import shutil
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public', 'assets')
BACKUP = os.path.join(ROOT, 'assets_src')

total_before = total_after = 0
converted = 0
for dirpath, _, files in os.walk(SRC):
    for name in files:
        base, ext = os.path.splitext(name)
        if ext.lower() not in ('.png', '.jpg', '.jpeg', '.jfif'):
            continue
        path = os.path.join(dirpath, name)
        rel = os.path.relpath(path, SRC)
        out = os.path.join(dirpath, base + '.webp')
        img = Image.open(path)
        has_alpha = img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info)
        img = img.convert('RGBA' if has_alpha else 'RGB')
        # 透過画像は縁のジャギーが出ないよう品質高め。背景/テクスチャ(不透明)は少し落として軽く。
        img.save(out, 'WEBP', quality=90 if has_alpha else 82, alpha_quality=100, method=6)
        before = os.path.getsize(path)
        after = os.path.getsize(out)
        total_before += before
        total_after += after
        converted += 1
        backup_path = os.path.join(BACKUP, rel)
        os.makedirs(os.path.dirname(backup_path), exist_ok=True)
        shutil.move(path, backup_path)
        print(f'{rel}: {before // 1024}KB -> {after // 1024}KB')

print(f'\n{converted}枚を変換: {total_before / 1048576:.1f}MB -> {total_after / 1048576:.1f}MB')
if converted == 0:
    print('変換する画像はありませんでした。')
    sys.exit(0)
