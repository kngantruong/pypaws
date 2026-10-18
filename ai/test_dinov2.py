import torch
import torchvision.transforms as T
from PIL import Image
import torch.nn.functional as F

def test_dinov2_environment():
    # 1. Kiểm tra CUDA / GPU
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"[PyPaws AI] Thiết bị đang sử dụng: {device}")

    # 2. Tải mô hình DINOv2
    print("[PyPaws AI] Đang tải mô hình DINOv2 (dinov2_vits14)...")
    model = torch.hub.load('facebookresearch/dinov2', 'dinov2_vits14').to(device)
    model.eval()
    print("[PyPaws AI] DINOv2 đã sẵn sàng!")

    # 3. Tiền xử lý ảnh
    transform = T.Compose([
        T.Resize((224, 224), interpolation=T.InterpolationMode.BICUBIC),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    # 4. Đọc ảnh chạy thử (Thay đường dẫn ảnh của bạn vào đây)
    img1_path = 'assets/dog1.jpg'
    img2_path = 'assets/dog2.jpg'

    img1 = Image.open(img1_path).convert('RGB')
    img2 = Image.open(img2_path).convert('RGB')

    batch_tensor = torch.stack([transform(img1), transform(img2)]).to(device)

    # 5. Trích xuất Embedding & Tính Cosine Similarity
    with torch.no_grad():
        embeddings = model(batch_tensor)

    norm_embeddings = F.normalize(embeddings, p=2, dim=1)
    similarity = torch.mm(norm_embeddings[0:1], norm_embeddings[1:2].T).item()

    print("\n--- KẾT QUẢ KIỂM TRA MÔI TRƯỜNG DINOV2 ---")
    print(f"- Kích thước Embedding Shape: {embeddings.shape}")
    print(f"- Độ tương đồng Cosine giữa 2 ảnh: {similarity:.4f}")

if __name__ == '__main__':
    test_dinov2_environment()
