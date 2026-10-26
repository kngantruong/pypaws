"""
Module xử lý dữ liệu PetFace và định nghĩa PyTorch Dataset.
"""
import os
import tarfile
import pandas as pd
from PIL import Image
from torch.utils.data import Dataset

def prepare_petface_dataset(base_dir, sample_size=2000, extract_dir='/content/petface_subsample'):
    """Đọc file train.csv và giải nén có lọc (Selective Extraction) để tránh tràn đĩa."""
    dog_tar = os.path.join(base_dir, 'images/dog.tar.gz')
    cat_tar = os.path.join(base_dir, 'images/cat.tar.gz')
    dog_csv = os.path.join(base_dir, 'split/dog/train.csv')
    cat_csv = os.path.join(base_dir, 'split/cat/train.csv')

    dfs = []
    if os.path.exists(dog_csv):
        df_d = pd.read_csv(dog_csv)
        df_d['species'] = 'dog'
        dfs.append(df_d)

    if os.path.exists(cat_csv):
        df_c = pd.read_csv(cat_csv)
        df_c['species'] = 'cat'
        dfs.append(df_c)

    df_train = pd.concat(dfs, ignore_index=True)
    df_sample = df_train.sample(n=min(sample_size, len(df_train)), random_state=42).copy()

    id_col = [c for c in df_sample.columns if 'id' in c.lower() or 'label' in c.lower()][0]
    img_col = [c for c in df_sample.columns if 'file' in c.lower() or 'image' in c.lower() or 'path' in c.lower()][0]

    df_sample['unique_id'] = df_sample['species'] + "_" + df_sample[id_col].astype(str)
    df_sample['label_id'] = df_sample['unique_id'].astype('category').cat.codes

    target_files = set(df_sample[img_col].apply(lambda x: os.path.basename(str(x))))
    os.makedirs(extract_dir, exist_ok=True)

    for tar_path, species in [(dog_tar, 'dog'), (cat_tar, 'cat')]:
        if os.path.exists(tar_path):
            with tarfile.open(tar_path, 'r:gz') as tar:
                for member in tar:
                    if member.isfile() and os.path.basename(member.name) in target_files:
                        member.name = os.path.basename(member.name)
                        tar.extract(member, os.path.join(extract_dir, species))

    def map_path(row):
        fname = os.path.basename(str(row[img_col]))
        p = os.path.join(extract_dir, row['species'], fname)
        return p if os.path.exists(p) else None

    df_sample['full_path'] = df_sample.apply(map_path, axis=1)
    df_final = df_sample.dropna(subset=['full_path']).reset_index(drop=True)
    
    return df_final, df_final['label_id'].nunique()


class PetFaceDataset(Dataset):
    """Dataset load ảnh và label cho PyTorch DataLoader."""
    def __init__(self, df, transform=None):
        self.df = df
        self.transform = transform

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        image = Image.open(row['full_path']).convert('RGB')
        if self.transform:
            image = self.transform(image)
        return image, row['label_id']
