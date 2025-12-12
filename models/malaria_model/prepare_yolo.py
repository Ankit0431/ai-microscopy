import argparse
import json
import math
import os
import random
import shutil
from pathlib import Path
from typing import Tuple, Optional, List
from PIL import Image
import re

CLS = {"parasite": 0, "wbc": 1}
IMG_EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp"}
RAND_SEED = 42
random.seed(RAND_SEED)

def parse_args():
    ap = argparse.ArgumentParser(description="Prepare NIH/LHNCBC thick-smear datasets for YOLOv8" )
    ap.add_argument("--infected1", type=str, default=None, help="Root of dataset variant 1 (All_PvTk, All_annotations)")
    ap.add_argument("--uninfected", type=str, default=None, help="Root of uninfected dataset (Uninfected patients, Annotations)")
    ap.add_argument("--infected2", type=str, default=None, help="Root of dataset variant 2 (Thick_Smears_150, GT_updated)")
    ap.add_argument("--out", type=str, required=True, help="Output YOLO dataset dir")
    ap.add_argument("--val_ratio", type=float, default=0.1)
    ap.add_argument("--test_ratio", type=float, default=0.2)
    ap.add_argument("--r_point_parasite", type=float, default=16.0, help="px radius for POINT parasite fallback")
    ap.add_argument("--r_point_wbc", type=float, default=24.0, help="px radius for POINT WBC fallback")
    ap.add_argument("--copy_mode", choices=["copy","link"], default="copy", help="Use hardlinks/symlinks where possible (link) or copy files")
    ap.add_argument("--max_per_patient", type=int, default=None, help="Optional cap per patient for quick experiments")
    ap.add_argument("--labels_only", action="store_true", help="Only write labels; skip copying/coverting images")

    return ap.parse_args()

def list_images(folder: Path):
    return [p for p in folder.rglob("*") if p.suffix.lower() in IMG_EXTS]

def yolo_line(cls_id: int, xc: float, yc: float, w: float, h: float, W: int, H: int) -> str:
    x = max(0.0, min(1.0, xc / W))
    y = max(0.0, min(1.0, yc / H))
    bw = max(1e-6, min(1.0, w / W))
    bh = max(1e-6, min(1.0, h / H))
    return f"{cls_id} {x:.6f} {y:.6f} {bw:.6f} {bh:.6f}"

def circle_to_bbox(xc: float, yc: float, xr: float, yr: float):
    r = math.hypot(xr - xc, yr - yc)
    return xc, yc, 2*r, 2*r

def point_to_bbox(x: float, y: float, r: float):
    return x, y, 2*r, 2*r

def read_first_line_dims(txt_path: Path):
    """
    Parse header like: 60,4032,3024  -> (count=60, H=4032, W=3024)
    Falls back to regex if commas missing.
    """
    try:
        with open(txt_path, "r", encoding="utf-8", errors="ignore") as f:
            first = f.readline().strip()
        if not first:
            return None
        # Prefer comma-separated
        if "," in first:
            parts = [p.strip() for p in first.split(",") if p.strip()]
            if len(parts) >= 3:
                count = int(float(parts[0]))
                H = int(float(parts[1]))
                W = int(float(parts[2]))
                return count, H, W
        # Fallback: extract numbers anywhere
        nums = re.findall(r"[-+]?\d*\.\d+|\d+", first)
        if len(nums) >= 3:
            count = int(float(nums[0]))
            H = int(float(nums[-2]))
            W = int(float(nums[-1]))
            return count, H, W
    except Exception:
        pass
    return None


def parse_ann_lines(txt_path: Path):
    """
    CSV annotations like:
      19-1,Parasitized,No_Comment,Circle,2,1948,1493,2030,1493
      4-36,White_Blood_Cell,No_Comment,Point,1,1838.25,522.4
    Returns: (label_lower, shape_lower, x1, y1, x2, y2 or None)
             label_lower in {'parasite','white_blood_cell'}
    """
    anns = []
    try:
        with open(txt_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = [ln.strip() for ln in f.readlines() if ln.strip()]
        if not lines:
            return anns

        body = lines[1:]  # skip header "count,H,W"
        for row in body:
            cols = [c.strip() for c in row.split(",")]
            if len(cols) >= 6:
                label_raw = cols[1].lower()
                shape_raw = cols[3].lower()

                # ---- FIX: accept 'Parasitized' (and any variant containing 'paras') ----
                if "paras" in label_raw:                         # matches parasite, parasitized, etc.
                    label = "parasite"
                elif ("white_blood_cell" in label_raw) or ("wbc" in label_raw) or ("leukocyte" in label_raw):
                    label = "white_blood_cell"
                else:
                    continue

                if "circle" in shape_raw:
                    if len(cols) >= 9:
                        xc = float(cols[5]); yc = float(cols[6])
                        xr = float(cols[7]); yr = float(cols[8])
                        anns.append((label, "circle", xc, yc, xr, yr))
                    else:
                        nums = [float(n) for n in re.findall(r"[-+]?\d*\.\d+|\d+", row)]
                        if len(nums) >= 4:
                            xc, yc, xr, yr = nums[-4], nums[-3], nums[-2], nums[-1]
                            anns.append((label, "circle", xc, yc, xr, yr))
                elif "point" in shape_raw:
                    if len(cols) >= 7:
                        x = float(cols[5]); y = float(cols[6])
                        anns.append((label, "point", x, y, None, None))
                    else:
                        nums = [float(n) for n in re.findall(r"[-+]?\d*\.\d+|\d+", row)]
                        if len(nums) >= 2:
                            x, y = nums[-2], nums[-1]
                            anns.append((label, "point", x, y, None, None))
                else:
                    # shape missing → infer from numbers
                    nums = [float(n) for n in re.findall(r"[-+]?\d*\.\d+|\d+", row)]
                    if len(nums) >= 4:
                        xc, yc, xr, yr = nums[-4], nums[-3], nums[-2], nums[-1]
                        anns.append((label, "circle", xc, yc, xr, yr))
                    elif len(nums) >= 2:
                        x, y = nums[-2], nums[-1]
                        anns.append((label, "point", x, y, None, None))
            else:
                # fallback path
                row_low = row.lower()
                if "paras" in row_low:                             # <- same fix here
                    label = "parasite"
                elif ("white_blood_cell" in row_low) or ("wbc" in row_low) or ("leukocyte" in row_low):
                    label = "white_blood_cell"
                else:
                    continue
                nums = [float(n) for n in re.findall(r"[-+]?\d*\.\d+|\d+", row)]
                if "circle" in row_low and len(nums) >= 4:
                    xc, yc, xr, yr = nums[-4], nums[-3], nums[-2], nums[-1]
                    anns.append((label, "circle", xc, yc, xr, yr))
                elif "point" in row_low and len(nums) >= 2:
                    x, y = nums[-2], nums[-1]
                    anns.append((label, "point", x, y, None, None))
    except Exception:
        pass
    return anns


def patient_id_from_path(p: Path) -> str:
    for parent in p.parents:
        name = parent.name
        if name.lower() in {"tiled","all_pvtk","thick_smears_150","uninfected patients","gt_updated","all_annotations","annotations"}:
            continue
        if parent.parent and parent.parent.name.lower() in {"all_pvtk","thick_smears_150","uninfected patients"}:
            return name
    return p.parent.name

def place_file(src: Path, dst: Path, copy_mode: str):
    dst.parent.mkdir(parents=True, exist_ok=True)
    if copy_mode == "link":
        try:
            os.link(src, dst)
            return
        except Exception:
            try:
                os.symlink(src, dst)
                return
            except Exception:
                pass
    shutil.copy2(src, dst)

def save_as_png(src: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        try:
            im.seek(0)
        except Exception:
            pass
        im.convert("RGB").save(dst, format="PNG", optimize=True)
        
def save_as_jpg(src: Path, dst: Path, quality: int = 90):
    """Fast: take ONLY the first page from (multi-page) TIFF and save as RGB JPEG."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        try:
            im.seek(0)   # first frame/page
        except Exception:
            pass
        im.convert("RGB").save(dst, format="JPEG", quality=quality, optimize=False, progressive=False)

def convert_dataset(args):
    out = Path(args.out)
    (out / "images").mkdir(parents=True, exist_ok=True)
    (out / "labels").mkdir(parents=True, exist_ok=True)

    records: List[dict] = []

    def process_infected1(root: Path):
        img_root = root / "All_PvTk"
        ann_root = root / "All_annotations"
        for img in list_images(img_root):
            rel = img.relative_to(img_root)
            ann = (ann_root / rel).with_suffix(".txt")
            if not ann.exists():
                continue
            dims = read_first_line_dims(ann)
            if not dims:
                continue
            count, H, W = dims
            anns = parse_ann_lines(ann)
            yolo_items = []
            for (label, shape, x1, y1, x2, y2) in anns:
                if label.startswith("parasit"):
                    if shape == "circle" and x2 is not None and y2 is not None:
                        xc, yc, bw, bh = circle_to_bbox(x1, y1, x2, y2)
                    else:
                        xc, yc, bw, bh = point_to_bbox(x1, y1, args.r_point_parasite)
                    yolo_items.append(yolo_line(CLS["parasite"], xc, yc, bw, bh, W, H))
            patient = patient_id_from_path(img)
            records.append({"img": str(img), "lbl": str(ann), "W": W, "H": H, "patient": patient, "yolo_items": yolo_items})

    def process_uninfected(root: Path):
        img_root = root / "Uninfected patients"
        ann_root = root / "Annotations"
        for img in list_images(img_root):
            if "tiled" not in str(img.parent).lower():
                continue
            rel = img.relative_to(img_root)
            parts = list(rel.parts)
            if "tiled" in parts:
                parts.remove("tiled")
            ann = ann_root.joinpath(*parts).with_suffix(".txt")
            if ann.exists():
                dims = read_first_line_dims(ann)
                if not dims:
                    with Image.open(img) as im:
                        W, H = im.size
                else:
                    _, H, W = dims
                anns = parse_ann_lines(ann)
                yolo_items = []
                for (label, shape, x1, y1, x2, y2) in anns:
                    if "white_blood_cell" in label:
                        if shape == "circle" and x2 is not None and y2 is not None:
                            xc, yc, bw, bh = circle_to_bbox(x1, y1, x2, y2)
                        else:
                            xc, yc, bw, bh = point_to_bbox(x1, y1, args.r_point_wbc)
                        yolo_items.append(yolo_line(CLS["wbc"], xc, yc, bw, bh, W, H))
            else:
                with Image.open(img) as im:
                    W, H = im.size
                yolo_items = []
            patient = patient_id_from_path(img)
            records.append({"img": str(img), "lbl": str(ann) if ann.exists() else None, "W": W, "H": H, "patient": patient, "yolo_items": yolo_items})

    def process_infected2(root: Path):
        img_root = root / "Thick_Smears_150"
        ann_root = root / "GT_updated"
        for img in list_images(img_root):
            rel = img.relative_to(img_root)
            ann = (ann_root / rel).with_suffix(".txt")
            if not ann.exists():
                continue
            dims = read_first_line_dims(ann)
            if not dims:
                continue
            _, H, W = dims
            anns = parse_ann_lines(ann)
            yolo_items = []
            for (label, shape, x1, y1, x2, y2) in anns:
                if label.startswith("parasite"):
                    cls = CLS["parasite"]
                elif "white_blood_cell" in label:
                    cls = CLS["wbc"]
                else:
                    continue
                if shape == "circle" and x2 is not None and y2 is not None:
                    xc, yc, bw, bh = circle_to_bbox(x1, y1, x2, y2)
                else:
                    r = args.r_point_parasite if cls == CLS["parasite"] else args.r_point_wbc
                    xc, yc, bw, bh = point_to_bbox(x1, y1, r)
                yolo_items.append(yolo_line(cls, xc, yc, bw, bh, W, H))
            patient = patient_id_from_path(img)
            records.append({"img": str(img), "lbl": str(ann), "W": W, "H": H, "patient": patient, "yolo_items": yolo_items})

    if args.infected1:
        process_infected1(Path(args.infected1))
    if args.uninfected:
        process_uninfected(Path(args.uninfected))
    if args.infected2:
        process_infected2(Path(args.infected2))

    if args.max_per_patient:
        byp = {}
        for r in records:
            byp.setdefault(r["patient"], []).append(r)
        records = [rec for pid, recs in byp.items() for rec in recs[:args.max_per_patient]]

    patient_has_box = {}
    for r in records:
        pid = r["patient"]
        has_box = bool(r["yolo_items"])
        patient_has_box[pid] = patient_has_box.get(pid, False) or has_box

    pos_patients = [p for p, hb in patient_has_box.items() if hb]
    neg_patients = [p for p, hb in patient_has_box.items() if not hb]
    random.shuffle(pos_patients); random.shuffle(neg_patients)

    def stratified_split(pats, val_ratio, test_ratio):
        n = len(pats)
        n_test = max(1, int(round(n * test_ratio))) if n > 0 else 0
        n_val  = max(1, int(round(n * val_ratio)))  if n > 2 else 0
        test = set(pats[:n_test]); val = set(pats[n_test:n_test+n_val]); train = set(pats[n_test+n_val:])
        return train, val, test

    pos_train, pos_val, pos_test = stratified_split(pos_patients, args.val_ratio, args.test_ratio)
    neg_train, neg_val, neg_test = stratified_split(neg_patients, args.val_ratio, args.test_ratio)

    train_p = pos_train | neg_train
    val_p   = pos_val   | neg_val
    test_p  = pos_test  | neg_test

    def ensure_positive(target_set, source_set):
        if not any(patient_has_box[p] for p in target_set) and any(patient_has_box[p] for p in source_set):
            mover = next((p for p in list(source_set) if patient_has_box[p]), None)
            if mover:
                source_set.remove(mover); target_set.add(mover)

    ensure_positive(val_p, train_p); ensure_positive(test_p, train_p)

    for split in ["train","val","test"]:
        (out / "images" / split).mkdir(parents=True, exist_ok=True)
        (out / "labels" / split).mkdir(parents=True, exist_ok=True)

    split_map = {"train": [], "val": [], "test": []}
    for r in records:
        pid = r["patient"]
        sp = "train" if pid in train_p else ("val" if pid in val_p else "test")
        split_map[sp].append(r)

    index = {"splits": {"train": [], "val": [], "test": []}}

    for split, items in split_map.items():
        for r in items:
            src = Path(r["img"])
            stem = src.stem
            if not args.labels_only:
                if src.suffix.lower() in {".tif", ".tiff"}:
                    out_img = out / "images" / split / f"{stem}.png"
                    save_as_jpg(src, out_img, quality=90)
                else:
                    out_img = out / "images" / split / f"{stem}{src.suffix}"
                    place_file(src, out_img, args.copy_mode)
            else:
                # Still define an out_img path for bookkeeping, but don't write it
                out_img = out / "images" / split / f"{stem}{src.suffix}"
            out_lbl = out / "labels" / split / f"{stem}.txt"
            with open(out_lbl, "w", encoding="utf-8") as f:
                for line in r["yolo_items"]:
                    f.write(line + "\n")
            index["splits"][split].append({"img": str(out_img), "lbl": str(out_lbl), "patient": r["patient"]})

    root_path = str(out.resolve()).replace("\\", "/")
    yaml_text = f"""# auto-generated by prepare_yolo.py
path: {root_path}
train: images/train
val: images/val
test: images/test
nc: 2
names: [parasite, wbc]
"""
    with open(out / "malaria.yaml", "w", encoding="utf-8") as f:
        f.write(yaml_text)

    with open(out / "split_index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)

    def split_counts(sp):
        imgs = len(index["splits"][sp]); nonempty = 0
        for it in index["splits"][sp]:
            try:
                if Path(it["lbl"]).read_text(encoding="utf-8").strip():
                    nonempty += 1
            except Exception:
                pass
        return imgs, nonempty

    tr_c, tr_pos = split_counts("train")
    va_c, va_pos = split_counts("val")
    te_c, te_pos = split_counts("test")
    print(f"[OK] YOLO dataset created at: {out}")
    print(f"  train: {tr_c} images  (non-empty labels: {tr_pos})")
    print(f"  val  : {va_c} images  (non-empty labels: {va_pos})")
    print(f"  test : {te_c} images  (non-empty labels: {te_pos})")
    print(f"YAML: {out/'malaria.yaml'}")
    


if __name__ == "__main__":
    args = parse_args()
    convert_dataset(args)
