"""So sánh DINOv2 pretrain và bản fine-tune trên các cặp verification.
 
Xuất: bảng chỉ số (in ra + CSV), AUC theo loài, hình histogram same/diff + đường ROC.
 
Ví dụ:
  python evaluate.py --root "/content/drive/MyDrive/PETFACE dataset" \
      --veri-dir /content/petface \
      --ckpt "/content/drive/MyDrive/PETFACE dataset/dinov2_petface_ft.pt" \
      --out-dir /content/results
"""
import argparse
import os
 
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
 
from ai.common import Net, load_finetuned, load_verification, pair_similarities, verification_metrics
 
 
def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--root', required=True)
    p.add_argument('--veri-dir', required=True)
    p.add_argument('--ckpt', required=True)
    p.add_argument('--out-dir', default='results')
    return p.parse_args()
 
 
def main():
    a = parse_args()
    os.makedirs(a.out_dir, exist_ok=True)
    dev = 'cuda'
 
    ve = load_verification(a.root, a.veri_dir)
    y = ve['label'].values.astype(int)
    print(f"Verification: {len(ve)} cặp | chó {(ve.animal == 'dog').sum()} | mèo {(ve.animal == 'cat').sum()}")
 
    s_pre = pair_similarities(Net().to(dev), ve, use_head=False, device=dev)
    s_ft = pair_similarities(load_finetuned(a.ckpt, dev), ve, use_head=True, device=dev)
    R = {'Pretrain': verification_metrics(s_pre, y), 'Fine-tune': verification_metrics(s_ft, y)}
 
    tab = pd.DataFrame([[n, r['AUC'], r['Acc'] * 100, r['EER'] * 100, r['TPR_at_FPR1'] * 100,
                         r['same'], r['diff'], r['T']] for n, r in R.items()],
                       columns=['Mô hình', 'AUC', 'Acc (%)', 'EER (%)', 'TPR@FPR=1% (%)',
                                'same TB', 'diff TB', 'Ngưỡng T']).round(4)
    print('\n', tab.to_string(index=False))
    tab.to_csv(f'{a.out_dir}/metrics.csv', index=False)
 
    print('\nAUC theo loài:')
    for sp in ['dog', 'cat']:
        m = (ve.animal == sp).values
        if len(set(y[m])) == 2:
            print(f'  {sp}: Pretrain {roc_auc_score(y[m], s_pre[m]):.4f} | '
                  f'Fine-tune {roc_auc_score(y[m], s_ft[m]):.4f}  ({m.sum()} cặp)')
 
    # ---- Hình ----
    c_same, c_diff = '#2a9d8f', '#e76f51'
    fig, ax = plt.subplots(1, 3, figsize=(18, 5))
    bins = np.linspace(-0.3, 1.0, 50)
    for axis, (name, s) in zip(ax[:2], [('Pretrain', s_pre), ('Fine-tune', s_ft)]):
        axis.hist(s[y == 1], bins=bins, alpha=.65, color=c_same, label=f'Cùng cá thể (TB {s[y == 1].mean():.3f})')
        axis.hist(s[y == 0], bins=bins, alpha=.65, color=c_diff, label=f'Khác cá thể (TB {s[y == 0].mean():.3f})')
        axis.axvline(R[name]['T'], color='k', ls='--', label=f"Ngưỡng T = {R[name]['T']:.3f}")
        axis.set_title(f"{name} | AUC {R[name]['AUC']:.4f} | Acc {R[name]['Acc'] * 100:.2f}%")
        axis.set_xlabel('Cosine similarity'); axis.set_ylabel('Số cặp'); axis.legend(fontsize=9)
    for name, color in [('Pretrain', '#6c757d'), ('Fine-tune', '#1d3557')]:
        ax[2].plot(R[name]['fpr'], R[name]['tpr'], color=color, lw=2, label=f"{name} (AUC {R[name]['AUC']:.4f})")
    ax[2].plot([0, 1], [0, 1], 'k:', lw=1, label='Ngẫu nhiên')
    ax[2].set_title(f'Đường ROC ({len(ve)} cặp verification)')
    ax[2].set_xlabel('False Positive Rate'); ax[2].set_ylabel('True Positive Rate')
    ax[2].legend(loc='lower right'); ax[2].grid(alpha=.3)
    plt.tight_layout()
    out = f'{a.out_dir}/ket_qua_pretrain_vs_finetune.png'
    plt.savefig(out, dpi=200, bbox_inches='tight')
    print('Đã lưu hình:', out)
 
 
if __name__ == '__main__':
    main()
