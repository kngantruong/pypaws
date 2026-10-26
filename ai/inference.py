"""
Module dự đoán và trích xuất đặc trưng cho Backend FastAPI
"""
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

# 1. Định nghĩa Augmentation/Normalization chuẩn cho DINOv2
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def load_dinov2_model(checkpoint_path, device='cpu'):
    """Nạp trọng số DINOv2 Fine-tuned từ checkpoint .pth"""
    model = torch.hub.load('facebookresearch/dinov2', 'dinov2_vits14')
    state_dict = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    return model

def extract_embedding(model, image_path, device='cpu'):
    """
    Trích xuất Vector Embedding 384 chiều từ 1 file ảnh.
    Trả về mảng Python list chuẩn cho FAISS/RAM Backend lưu trữ.
    """
    try:
        image = Image.open(image_path).convert('RGB')
        tensor = transform(image).unsqueeze(0).to(device)
        with torch.no_grad():
            features = model(tensor)
            normalized_features = F.normalize(features, p=2, dim=1)
        return normalized_features.squeeze().tolist()
    except Exception as e:
        print(f"Lỗi đọc ảnh {image_path}: {e}")
        return None

def calculate_cosine_similarity(vec1, vec2):
    """Tính độ tương đồng Cosine Similarity giữa 2 vector embedding"""
    t1 = torch.tensor(vec1)
    t2 = torch.tensor(vec2)
    return F.cosine_similarity(t1.unsqueeze(0), t2.unsqueeze(0)).item()
