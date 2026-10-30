"""Fine-tune DINOv2 ViT-S/14 bằng ArcFace trên tập train lấy mẫu theo cá thể.
 
Chiến lược: đóng băng backbone, chỉ mở N block cuối + LayerNorm cuối (LR nhỏ),
đầu embedding 512 chiều + ArcFace học với LR lớn hơn. Đánh giá trên các cặp verification sau mỗi epoch.
Báo cáo nên dùng EPOCH CUỐI (không chọn epoch tốt nhất trên verification).
 
Ví dụ (Colab, cần GPU):
  python train.py --root "/content/drive/MyDrive/PETFACE dataset" \
      --train-csv /content/petface_train/train_subset.csv \
      --veri-dir /content/petface \
      --out "/content/drive/MyDrive/PETFACE dataset/dinov2_petface_ft.pt"
"""
import argparse
import json
import random
 
import numpy as np
import pandas as pd
import torch
from PIL import Image
from torch.utils.data import DataLoader, Dataset
 
from ai.common import (ArcFace, EMB_DIM, Net, pair_similarities, train_transform,
                    verification_metrics, load_verification)
 
 
def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--root', required=True, help='Thư mục chứa dog/, cat/ (CSV verification)')
    p.add_argument('--train-csv', required=True, help='train_subset.csv do build_train_subset.py tạo ra')
    p.add_argument('--veri-dir', required=True, help='Thư mục chứa ảnh verification (đã giải nén, tên phẳng)')
    p.add_argument('--out', required=True, help='Đường dẫn lưu checkpoint .pt')
    p.add_argument('--epochs', type=int, default=8)
    p.add_argument('--batch-size', type=int, default=64)
    p.add_argument('--unfreeze-last', type=int, default=4, help='Số block cuối của ViT được mở khoá')
    p.add_argument('--lr-backbone', type=float, default=1e-5)
    p.add_argument('--lr-head', type=float, default=1e-3)
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--workers', type=int, default=2)
    return p.parse_args()
 
 
class ImageDS(Dataset):
    def __init__(self, paths, labels, tf):
        self.p, self.l, self.tf = list(paths), list(labels), tf
 
    def __len__(self):
        return len(self.p)
 
    def __getitem__(self, i):
        return self.tf(Image.open(self.p[i]).convert('RGB')), int(self.l[i])
 
 
def main():
    a = parse_args()
    random.seed(a.seed); np.random.seed(a.seed); torch.manual_seed(a.seed)
    dev = 'cuda'
 
    # ---- Dữ liệu ----
    tr = pd.read_csv(a.train_csv)
    tr['y'] = tr['pid'].astype('category').cat.codes
    n_cls = tr['y'].nunique()
    print(f'Train: {len(tr)} ảnh, {n_cls} cá thể, {len(tr) / n_cls:.2f} ảnh/ID')
 
    ve = load_verification(a.root, a.veri_dir)
    y_ve = ve['label'].values.astype(int)
    print(f'Verification: {len(ve)} cặp | cùng ID: {y_ve.sum()} | khác ID: {(1 - y_ve).sum()}')
 
    leak = set(tr['pid']) & (set(ve['pa']) | set(ve['pb']))
    print(f'ID trùng giữa train và verification: {len(leak)} (phải = 0)')
    assert not leak, 'Rò rỉ dữ liệu: tạo lại tập train bằng build_train_subset.py'
 
    dl = DataLoader(ImageDS(tr['fp'], tr['y'], train_transform()), batch_size=a.batch_size,
                    shuffle=True, num_workers=a.workers, drop_last=True, pin_memory=True)
 
    # ---- Mô hình ----
    model, arc = Net().to(dev), ArcFace(EMB_DIM, n_cls).to(dev)
    for p in model.bb.parameters():
        p.requires_grad = False
    for blk in model.bb.blocks[-a.unfreeze_last:]:
        for p in blk.parameters():
            p.requires_grad = True
    for p in model.bb.norm.parameters():
        p.requires_grad = True
 
    opt = torch.optim.AdamW([
        {'params': [p for p in model.bb.parameters() if p.requires_grad], 'lr': a.lr_backbone},
        {'params': list(model.emb.parameters()) + list(arc.parameters()), 'lr': a.lr_head}],
        weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.OneCycleLR(
        opt, max_lr=[a.lr_backbone, a.lr_head], total_steps=a.epochs * len(dl), pct_start=0.15)
    scaler = torch.cuda.amp.GradScaler()
 
    # ---- Baseline pretrain (cùng pipeline: resize 224 + flip TTA) ----
    r0 = verification_metrics(pair_similarities(model, ve, use_head=False, device=dev), y_ve)
    print(f"\n[BASELINE pretrain] AUC {r0['AUC']:.4f} | Acc {r0['Acc'] * 100:.2f}% | "
          f"T {r0['T']:.3f} | same {r0['same']:.3f} diff {r0['diff']:.3f}\n")
    history = [{'epoch': 0, **{k: v for k, v in r0.items() if k not in ('fpr', 'tpr')}}]
 
    # ---- Train ----
    for ep in range(1, a.epochs + 1):
        model.train()
        total = 0.0
        for x, y in dl:
            x, y = x.to(dev, non_blocking=True), y.to(dev)
            with torch.autocast('cuda', dtype=torch.float16):
                e = model(x)
            loss = arc(e.float(), y)          # ArcFace tính ngoài autocast để acos không chạy ở fp16
            opt.zero_grad()
            scaler.scale(loss).backward()
            scaler.step(opt); scaler.update(); sched.step()
            total += loss.item()
        r = verification_metrics(pair_similarities(model, ve, use_head=True, device=dev), y_ve)
        print(f"Epoch {ep}/{a.epochs} | loss {total / len(dl):.3f} | AUC {r['AUC']:.4f} | "
              f"Acc {r['Acc'] * 100:.2f}% | T {r['T']:.3f} | same {r['same']:.3f} diff {r['diff']:.3f}")
        history.append({'epoch': ep, 'loss': total / len(dl),
                        **{k: v for k, v in r.items() if k not in ('fpr', 'tpr')}})
 
    torch.save({'model': model.state_dict(),
                'threshold': r['T'],                     # ngưỡng tối ưu trên verification (epoch cuối)
                'config': vars(a), 'num_classes': n_cls}, a.out)
    with open(a.out.replace('.pt', '_log.json'), 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
    print('Đã lưu checkpoint:', a.out)
 
 
if __name__ == '__main__':
    main()
 
Claude a terminé sa réponse.
