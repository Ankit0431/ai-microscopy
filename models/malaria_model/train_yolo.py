import argparse
from ultralytics import YOLO
import torch

def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=str, required=True, help="Path to malaria.yaml produced by prepare_yolo.py")
    ap.add_argument("--model", type=str, default="yolov8n.pt", help="Pretrained checkpoint (e.g., yolov8n.pt, yolov8s.pt)")
    ap.add_argument("--epochs", type=int, default=80)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--name", type=str, default="malaria_yolov8")
    return ap.parse_args()

def main():
    args = parse_args()
    model = YOLO(args.model)
    device = 0 if torch.cuda.is_available() else "cpu"
    results = model.train(
        data=args.data,
        imgsz=args.imgsz,
        epochs=args.epochs,
        batch=args.batch,
        name=args.name,
        lr0=0.01,
        cos_lr=True,
        patience=20,
        device=device,
        pretrained=True,
        plots=True,
        optimizer="SGD"
    )
    print(results)

if __name__ == "__main__":
    main()
