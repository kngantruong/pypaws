"""
ai/evaluate.py - Script đánh giá mô hình DINOv2 Fine-tuned trên tập verification.csv
"""
import os
import torch
import torch.nn.functional as F
import pandas as pd
from PIL import Image
from torchvision import transforms
from sklearn.metrics import roc_auc_score, accuracy_score, precision_score, recall_score, f1_score

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

def evaluate_model(model, csv_path, base_img_dir, threshold=0.60):
    """Tính toán các chỉ số chất lượng mô hình trên verification.csv"""
    if not os.path.exists(csv_path):
        print(f"⚠️ Không tìm thấy file CSV: {csv_path}")
        return

    df = pd.read_csv(csv_path)
    y_true = []
    y_scores = []

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    model.eval()
    for idx, row in df.iterrows():
        img1_path = os.path.join(base_img_dir, os.path.basename(str(row['filename1'])))
        img2_path = os.path.join(base_img_dir, os.path.basename(str(row['filename2'])))

        if os.path.exists(img1_path) and os.path.exists(img2_path):
            img1 = Image.open(img1_path).convert('RGB')
            img2 = Image.open(img2_path).convert('RGB')

            t1 = transform(img1).unsqueeze(0).to(DEVICE)
            t2 = transform(img2).unsqueeze(0).to(DEVICE)

            with torch.no_grad():
                f1 = F.normalize(model(t1), p=2, dim=1)
                f2 = F.normalize(model(t2), p=2, dim=1)
                sim = F.cosine_similarity(f1, f2).item()

            y_scores.append(sim)
            y_true.append(row['label'])

    if len(y_scores) == 0:
        print("❌ Không tìm thấy cặp ảnh nào khớp trong thư mục kiểm thử.")
        return

    y_pred = [1 if s >= threshold else 0 for s in y_scores]

    print("\n==========================================")
    print(f"📊 KẾT QUẢ ĐÁNH GIÁ TRÊN {os.path.basename(csv_path)}")
    print("==========================================")
    print(f" - ROC-AUC   : {roc_auc_score(y_true, y_scores):.4f}")
    print(f" - Accuracy  : {accuracy_score(y_true, y_pred):.4f}")
    print(f" - Precision : {precision_score(y_true, y_pred, zero_division=0):.4f}")
    print(f" - Recall    : {recall_score(y_true, y_pred, zero_division=0):.4f}")
    print(f" - F1-Score  : {f1_score(y_true, y_pred, zero_division=0):.4f}")
    print("==========================================")
