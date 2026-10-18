
import subprocess
import sys
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "pillow", "requests", "torch", "torchvision"])
import os
import requests
import torch
import torchvision.transforms as T
from PIL import Image
import torch.nn.functional as F

# 2. Tự động tải ảnh mẫu chó/mèo từ internet nếu chưa có
def download_sample_images():
    os.makedirs('assets', exist_ok=True)
    
    img1_url = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400" # Ảnh chó 1
    img2_url = "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400" # Ảnh chó 2
    
    img1_path = 'assets/dog1.jpg'
    img2_path = 'assets/dog2.jpg'
    
    if not os.path.exists(img1_path):
        print("[PyPaws AI] Đang tải ảnh mẫu dog1.jpg...")
        img_data = requests.get(img1_url).content
        with open(img1_path, 'wb') as f:
            f.write(img_data)
            
    if not os.path.exists(img2_path):
        print("[PyPaws AI] Đang tải ảnh mẫu dog2.jpg...")
        img_data = requests.get(img2_url).content
        with open(img2_path, 'wb') as f:
            f.write(img_data)

# 3. Hàm kiểm tra môi trường và chạy DINOv2
def test_dinov2_environment():
    download_sample_images()

    # Kiểm tra GPU
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"\n[PyPaws AI] Thiết bị đang sử dụng: {device}")

    # Tải mô hình DINOv2
    print("[PyPaws AI] Đang tải mô hình DINOv2 (dinov2_vits14)...")
    model = torch.hub.load('facebookresearch/dinov2', 'dinov2_vits14').to(device)
    model.eval()
    print("[PyPaws AI] Mô hình DINOv2 đã sẵn sàng!")

    # Tiền xử lý ảnh
    transform = T.Compose([
        T.Resize((224, 224), interpolation=T.InterpolationMode.BICUBIC),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    # Đọc ảnh
    img1 = Image.open('assets/dog1.jpg').convert('RGB')
    img2 = Image.open('assets/dog2.jpg').convert('RGB')

    batch_tensor = torch.stack([transform(img1), transform(img2)]).to(device)

    # Trích xuất Embedding & Tính độ tương đồng
    with torch.no_grad():
        embeddings = model(batch_tensor)

    norm_embeddings = F.normalize(embeddings, p=2, dim=1)
    similarity = torch.mm(norm_embeddings[0:1], norm_embeddings[1:2].T).item()

    print("\n=============================================")
    print("--- KẾT QUẢ KIỂM TRA MÔI TRƯỜNG DINOV2 ---")
    print(f"- Kích thước Vector Embedding: {embeddings.shape}")
    print(f"- Độ tương đồng Cosine giữa 2 ảnh: {similarity:.4f}")
    print("=============================================")

if __name__ == '__main__':
    test_dinov2_environment()
