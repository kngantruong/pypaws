"""
Fine-tune DINOv2 trên Google Colab.
"""
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import transforms
from tqdm import tqdm

from dataset import prepare_petface_dataset, PetFaceDataset
from model import DINOv2ArcFaceModel

if __name__ == '__main__':
    DRIVE_PETFACE_BASE = '/content/drive/MyDrive/PetFace'
    SAVE_CHECKPOINT_PATH = '/content/drive/MyDrive/dinov2_petface_best.pth'

    # 1. Chuẩn bị dữ liệu
    df_final, num_classes = prepare_petface_dataset(DRIVE_PETFACE_BASE)

    # 2. Transform chuẩn DINOv2
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # 3. Khởi tạo DataLoader & Model
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    train_dataset = PetFaceDataset(df_final, transform=transform)
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=2)

    model = DINOv2ArcFaceModel(num_classes=num_classes).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-4)

    # 4. Huấn luyện (5 Epochs)
    print(f"Fine-tune DINOv2 + ArcFace trên {device}...")
    EPOCHS = 5
    model.train()
    
    for epoch in range(EPOCHS):
        running_loss = 0.0
        pbar = tqdm(train_loader, desc=f"Epoch {epoch+1}/{EPOCHS}")
        for images, labels in pbar:
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images, labels)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            pbar.set_postfix({'loss': f"{loss.item():.4f}"})

    # 5. Lưu trọng số Backbone sau khi train
    torch.save(model.backbone.state_dict(), SAVE_CHECKPOINT_PATH)
    print(f"\n🎉 Hoàn thành Fine-tune! Weight đã lưu tại: {SAVE_CHECKPOINT_PATH}")
