"""Tạo tập train lấy mẫu THEO CÁ THỂ từ PetFace đầy đủ (dog.tar.gz, cat.tar.gz).
 
Mặc định: 1.250 cá thể/loài x 4 ảnh/cá thể x 2 loài = 10.000 ảnh.
- Loại mọi cá thể có trong verification.csv (không rò rỉ dữ liệu).
- Ảnh lưu dạng phẳng: dog_000123_00.png trong --out.
- Ghi train_subset.csv (dùng cho train.py) và (tuỳ chọn) preview.jpg, file zip để nộp.
 
Ví dụ:
  python build_train_subset.py --root "/content/drive/MyDrive/PETFACE dataset" \
      --dog-tar /content/drive/MyDrive/PetFace/images/dog.tar.gz \
      --cat-tar /content/drive/MyDrive/PetFace/images/cat.tar.gz \
      --out /content/petface_train --zip
 
Lưu ý: .tar.gz chỉ đọc tuần tự được, nên quét mỗi loài mất vài phút đến vài chục phút (chạy CPU được).
Chạy lại an toàn: ảnh đã trích sẽ được bỏ qua; --seed giữ nguyên thì danh sách ID giữ nguyên.
"""
import argparse
import os
import random
import tarfile
import zipfile
 
import pandas as pd
from PIL import Image
 
from ai.common import flat, pid_of
 
 
def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--root', required=True, help='Thư mục chứa dog/, cat/ (train.csv, verification.csv)')
    p.add_argument('--dog-tar', required=True)
    p.add_argument('--cat-tar', required=True)
    p.add_argument('--out', default='/content/petface_train')
    p.add_argument('--ids-per-species', type=int, default=1250)
    p.add_argument('--img-per-id', type=int, default=4)
    p.add_argument('--buffer', type=int, default=150, help='ID dự phòng phòng khi thiếu ảnh trong tar')
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--zip', action='store_true', help='Đóng gói zip (giữ cấu trúc dog/000123/00.png) để nộp')
    return p.parse_args()
 
 
def extract(tar_path, keys, out):
    """Quét tar.gz một lượt, chỉ trích các ảnh trong `keys` (dạng 'dog/000123/00.png')."""
    keys = {k for k in keys if not os.path.exists(f'{out}/{flat(k)}')}
    total, found, n = len(keys), 0, 0
    if total == 0:
        return
    print(f'Quét {os.path.basename(tar_path)}: cần {total} ảnh')
    with tarfile.open(tar_path, 'r|gz') as tf:
        for m in tf:
            n += 1
            if n <= 3:
                print('  member mẫu:', m.name)
            if not m.isfile():
                continue
            key = '/'.join(m.name.replace('\\', '/').split('/')[-3:])
            if key in keys:
                with open(f'{out}/{flat(key)}', 'wb') as f:
                    f.write(tf.extractfile(m).read())
                found += 1
                if found == total:
                    break
            if n % 50000 == 0:
                print(f'  đã quét {n} mục (gồm cả thư mục), lấy được {found}/{total}')
    print(f'  xong: {found}/{total}')
 
 
def main():
    a = parse_args()
    os.makedirs(a.out, exist_ok=True)
    rng = random.Random(a.seed)
    tars = {'dog': a.dog_tar, 'cat': a.cat_tar}
 
    # 1. Chọn ID (loại ID thuộc verification), mỗi ID lấy đúng img_per_id ảnh
    cand = {}
    for sp in tars:
        v = pd.read_csv(f'{a.root}/{sp}/verification.csv')
        veri_ids = set(v['filename1'].map(pid_of)) | set(v['filename2'].map(pid_of))
        d = pd.read_csv(f'{a.root}/{sp}/train.csv')
        d['pid'] = d['filename'].map(pid_of)
        g = d.groupby('pid')['filename'].apply(list)
        g = g[(g.map(len) >= a.img_per_id) & (~g.index.isin(veri_ids))]
        pick = rng.sample(sorted(g.index), a.ids_per_species + a.buffer)
        cand[sp] = [(p, sorted(g[p])[:a.img_per_id]) for p in pick]
        print(f'{sp}: {len(g)} ID đủ điều kiện → lấy {len(pick)} ID ứng viên')
 
    # 2. Trích ảnh từ tar
    for sp, tar in tars.items():
        extract(tar, [fn for _, fns in cand[sp] for fn in fns], a.out)
 
    # 3. Giữ đúng ids_per_species ID đủ ảnh mỗi loài, xoá phần dư
    rows = []
    for sp in tars:
        ok = [(p, fns) for p, fns in cand[sp]
              if all(os.path.exists(f'{a.out}/{flat(f)}') for f in fns)]
        assert len(ok) >= a.ids_per_species, f'{sp}: chỉ có {len(ok)} ID đủ ảnh, tăng --buffer'
        for p, fns in ok[:a.ids_per_species]:
            rows += [(fn, p, sp) for fn in fns]
    tr = pd.DataFrame(rows, columns=['filename', 'pid', 'animal'])
    tr['fp'] = tr['filename'].map(lambda f: f'{a.out}/{flat(f)}')
    keep = set(tr['fp'])
    for f in os.listdir(a.out):
        if f.endswith('.png') and f'{a.out}/{f}' not in keep:
            os.remove(f'{a.out}/{f}')
    assert len(tr) == 2 * a.ids_per_species * a.img_per_id
    tr.to_csv(f'{a.out}/train_subset.csv', index=False)
 
    # 4. Ảnh preview: mỗi hàng = 1 cá thể (6 chó + 6 mèo)
    th = 140
    ids = list(tr[tr.animal == 'dog']['pid'].unique()[:6]) + list(tr[tr.animal == 'cat']['pid'].unique()[:6])
    sheet = Image.new('RGB', (th * a.img_per_id, th * len(ids)), 'white')
    for r, p in enumerate(ids):
        for c, fp in enumerate(tr[tr.pid == p]['fp']):
            sheet.paste(Image.open(fp).convert('RGB').resize((th, th)), (c * th, r * th))
    sheet.save(f'{a.out}/preview.jpg', quality=90)
 
    # 5. Đóng gói để nộp
    if a.zip:
        pkg = f'{a.root}/petface_train_10k_byID.zip'
        with zipfile.ZipFile(pkg, 'w', zipfile.ZIP_STORED) as z:
            for _, r in tr.iterrows():
                z.write(r['fp'], r['filename'].replace('\\', '/'))
            z.write(f'{a.out}/train_subset.csv', 'manifest.csv')
            z.write(f'{a.out}/preview.jpg', 'preview.jpg')
        print('Đã đóng gói:', pkg, f'({os.path.getsize(pkg) / 1e6:.0f} MB)')
 
    print('\nTập train:')
    print(tr.groupby('animal').agg(so_anh=('fp', 'count'), so_ca_the=('pid', 'nunique')).to_string())
    print(f'Tổng: {len(tr)} ảnh | {tr.pid.nunique()} cá thể')
 
 
if __name__ == '__main__':
    main()
 
Claude a terminé sa réponse.
