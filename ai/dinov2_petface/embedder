"""Module suy luận cho backend: ảnh khuôn mặt thú cưng -> vector 512 chiều (đã L2-normalize).
 
File này TỰ ĐỦ: chỉ cần embedder.py + checkpoint dinov2_petface_ft.pt, không cần các file khác trong repo.
 
Cách dùng:
    from embedder import PetFaceEmbedder
    emb = PetFaceEmbedder('dinov2_petface_ft.pt')          # tự chọn GPU nếu có, không thì CPU
    v1 = emb.embed('tin_mat.jpg')                          # numpy float32, shape (512,)
    v2 = emb.embed(pil_image)                              # nhận cả đường dẫn lẫn PIL.Image
    score = emb.similarity(v1, v2)                         # cosine similarity, trong [-1, 1]
    same = emb.is_same(v1, v2)                             # score >= threshold
 
    # Tìm top-k trong kho vector (gallery: ma trận N x 512, mỗi hàng đã normalize)
    idx, scores = emb.top_k(v1, gallery, k=5)
 
Thử nhanh từ dòng lệnh:
    python embedder.py --ckpt dinov2_petface_ft.pt --a anh1.jpg --b anh2.jpg
 
LƯU Ý QUAN TRỌNG
- Mô hình được train trên ảnh MẶT thú cưng đã crop (dạng PetFace). Ảnh người dùng upload là ảnh cả con vật
  thì nên detect/crop mặt trước khi gọi embed(), nếu không độ chính xác sẽ thấp hơn số báo cáo.
- Ngưỡng mặc định 0.252 chọn trên 1.001 cặp verification của PetFace (chó + mèo). Với dữ liệu thật của hệ thống
  nên hiệu chỉnh lại; dùng score để XẾP HẠNG ứng viên thì đáng tin hơn là quyết định cứng "cùng/khác".
- Lần đầu chạy, torch.hub cần tải code DINOv2 từ GitHub (facebookresearch/dinov2) rồi cache lại; trọng số
  backbone nằm sẵn trong checkpoint nên không phải tải thêm.
"""
import argparse
 
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as T
from PIL import Image
 
DEFAULT_THRESHOLD = 0.252   # ngưỡng tối ưu epoch cuối trên 1.001 cặp verification
 
 
class _Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.bb = torch.hub.load('facebookresearch/dinov2', 'dinov2_vits14', pretrained=False)
        self.emb = nn.Sequential(nn.Linear(384, 512), nn.BatchNorm1d(512))
 
    def forward(self, x):
        return F.normalize(self.emb(self.bb(x)), dim=1)
 
 
class PetFaceEmbedder:
    def __init__(self, ckpt_path, device=None, threshold=None):
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        ck = torch.load(ckpt_path, map_location=self.device)
        self.model = _Net().to(self.device)
        self.model.load_state_dict(ck['model'] if 'model' in ck else ck)
        self.model.eval()
        self.threshold = threshold if threshold is not None else DEFAULT_THRESHOLD
        self.tf = T.Compose([T.Resize((224, 224)), T.ToTensor(),
                             T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])
 
    @torch.no_grad()
    def embed_batch(self, images, tta=True):
        """images: list đường dẫn hoặc PIL.Image. Trả về ndarray float32 (N, 512), mỗi hàng norm = 1."""
        imgs = [Image.open(i) if isinstance(i, str) else i for i in images]
        x = torch.stack([self.tf(im.convert('RGB')) for im in imgs]).to(self.device)
        with torch.autocast('cuda', dtype=torch.float16, enabled=self.device.startswith('cuda')):
            e = self.model(x)
            if tta:                                   # trung bình ảnh gốc + ảnh lật ngang (giống lúc đánh giá)
                e = e + self.model(torch.flip(x, dims=[3]))
        return F.normalize(e.float(), dim=1).cpu().numpy().astype(np.float32)
 
    def embed(self, image, tta=True):
        return self.embed_batch([image], tta)[0]
 
    @staticmethod
    def similarity(a, b):
        """Cosine similarity. Vector đã normalize nên chính là tích vô hướng."""
        return float(np.dot(a, b))
 
    def is_same(self, a, b, threshold=None):
        return self.similarity(a, b) >= (threshold if threshold is not None else self.threshold)
 
    @staticmethod
    def top_k(query, gallery, k=5):
        """gallery: (N, 512) đã normalize. Trả về (chỉ số, điểm) của k vector giống nhất, giảm dần."""
        scores = gallery @ query
        k = min(k, len(scores))
        idx = np.argpartition(-scores, k - 1)[:k]
        idx = idx[np.argsort(-scores[idx])]
        return idx, scores[idx]
 
 
if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--ckpt', required=True)
    p.add_argument('--a', required=True)
    p.add_argument('--b', required=True)
    args = p.parse_args()
    emb = PetFaceEmbedder(args.ckpt)
    va, vb = emb.embed(args.a), emb.embed(args.b)
    s = emb.similarity(va, vb)
    print(f'Cosine similarity = {s:.4f} | ngưỡng {emb.threshold} → '
          f"{'CÓ THỂ CÙNG cá thể' if s >= emb.threshold else 'KHÁC cá thể'}")
