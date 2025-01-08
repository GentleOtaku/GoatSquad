import os

def download_dataset():
    if not os.path.exists("ml-100k"):
        print("Downloading the MovieLens 100K dataset...")
        os.system("wget http://files.grouplens.org/datasets/movielens/ml-100k.zip")
        os.system("unzip ml-100k.zip")
        print("Dataset downloaded and extracted.")
    else:
        print("Dataset already exists. Skipping download.")

if __name__ == "__main__":
    download_dataset()
