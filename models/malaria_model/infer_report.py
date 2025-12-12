import argparse
import csv
from pathlib import Path
from collections import defaultdict
from ultralytics import YOLO

def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", type=str, required=True)
    ap.add_argument("--images", type=str, required=True, help="Folder of images to scan (recursively)")
    ap.add_argument("--out", type=str, default="./report.csv")
    ap.add_argument("--conf", type=float, default=0.25)
    ap.add_argument("--iou", type=float, default=0.5)
    return ap.parse_args()

def patient_id_from_path(p: Path) -> str:
    for parent in p.parents:
        if parent.parent and parent.parent.name.lower() in {"all_pvtk","thick_smears_150","uninfected patients"}:
            return parent.name
    return p.parent.name

def main():
    args = parse_args()
    model = YOLO(args.weights)

    imgs = [p for p in Path(args.images).rglob("*") if p.suffix.lower() in {".jpg",".jpeg",".png",".tif",".tiff",".bmp"}]
    patient_counts = defaultdict(lambda: {"parasite": 0, "wbc": 0, "images": 0})
    per_image = []

    for img in imgs:
        res = model.predict(source=str(img), conf=args.conf, iou=args.iou, verbose=False)[0]
        n_par = 0
        n_wbc = 0
        for b in res.boxes:
            cls = int(b.cls.item())
            if cls == 0:
                n_par += 1
            elif cls == 1:
                n_wbc += 1
        patient = patient_id_from_path(img)
        patient_counts[patient]["parasite"] += n_par
        patient_counts[patient]["wbc"] += n_wbc
        patient_counts[patient]["images"] += 1
        per_image.append([str(img), n_par, n_wbc, patient])

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["patient_id","images","parasite_count","wbc_count","estimated_parasitemia_per_uL","infected_flag"])
        for pid, d in sorted(patient_counts.items()):
            est_para = d["parasite"] * 40  # rule from dataset readme for thick smears
            infected = 1 if d["parasite"] > 0 else 0
            w.writerow([pid, d["images"], d["parasite"], d["wbc"], est_para, infected])

    with open(out_path.with_suffix(".images.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["image","parasite_count","wbc_count","patient_id"])
        w.writerows(per_image)

    print(f"[OK] Wrote summary: {out_path}")
    print(f"[OK] Wrote per-image details: {out_path.with_suffix('.images.csv')}")

if __name__ == "__main__":
    main()
