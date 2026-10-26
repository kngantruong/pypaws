"""
Module định nghĩa kiến trúc mô hình DINOv2 và ArcFace Loss Head.
"""
import math
import torch
import torch.nn as nn
import torch.nn.functional as F

class ArcFaceHead(nn.Module):
    """
    ArcFace Head: Thêm Angular Margin (m) giúp gom nhóm vector đặc trưng 
    của CÙNG cá thể và đẩy xa các cá thể KHÁC NHAU.
    """
    def __init__(self, in_features, num_classes, s=30.0, m=0.50):
        super().__init__()
        self.in_features = in_features
        self.num_classes = num_classes
        self.s = s
        self.m = m
        self.weight = nn.Parameter(torch.FloatTensor(num_classes, in_features))
        nn.init.xavier_uniform_(self.weight)

        self.cos_m = math.cos(m)
        self.sin_m = math.sin(m)
        self.th = math.cos(math.pi - m)
        self.mm = math.sin(math.pi - m) * m

    def forward(self, input, label):
        cosine = F.linear(F.normalize(input), F.normalize(self.weight))
        sine = torch.sqrt(1.0 - torch.pow(cosine, 2)).clamp(0, 1)
        
        phi = cosine * self.cos_m - sine * self.sin_m
        phi = torch.where(cosine > self.th, phi, cosine - self.mm)

        one_hot = torch.zeros(cosine.size(), device=input.device)
        one_hot.scatter_(1, label.view(-1, 1).long(), 1)
        
        output = (one_hot * phi) + ((1.0 - one_hot) * cosine)
        output *= self.s
        return output


class DINOv2ArcFaceModel(nn.Module):
    """Mô hình DINOv2 backbone kết hợp ArcFace Head."""
    def __init__(self, num_classes):
        super().__init__()
        # Load DINOv2 Small Pretrained từ PyTorch Hub
        self.backbone = torch.hub.load('facebookresearch/dinov2', 'dinov2_vits14')
        
        # Đóng băng các lớp đầu, chỉ fine-tune 20 tham số/block cuối
        for param in list(self.backbone.parameters())[:-20]:
            param.requires_grad = False
            
        self.arcface = ArcFaceHead(in_features=384, num_classes=num_classes)

    def extract_features(self, x):
        """Trích xuất vector embedding 384 chiều đã chuẩn hóa L2 norm."""
        features = self.backbone(x)
        return F.normalize(features, p=2, dim=1)

    def forward(self, x, labels):
        features = self.extract_features(x)
        return self.arcface(features, labels)
