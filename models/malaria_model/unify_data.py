import cv2
import math
import os
from pathlib import Path
from tqdm import tqdm
import sys

DB1_ROOT = Path(r"C:\Ankit\Reposetories\honors-final-project\models\malaria_model\dataset\Infected_1\NIH-NLM-ThickBloodSmearsPV")
DB2_ROOT = Path(r"C:\Ankit\Reposetories\honors-final-project\models\malaria_model\dataset\Infected_2")
DB3_ROOT = Path(r"C:\Ankit\Reposetories\honors-final-project\models\malaria_model\dataset\Uninfected\NIH-NLM-ThickBloodSmearsU")
OUTPUT_ROOT = Path(r"C:\Ankit\Reposetories\honors-final-project\models\malaria_model\malaria_dataset_unified")

CLASS_MAP = {"parasite": 0, "white_blood_cell": 1}

# --- NEW DATA-DRIVEN BOX SIZES ---
# Use 57x57 for any "Point" parasite annotations (basedp on 56.67 avg diameter)
PARASITE_POINT_BOX_SIZE = 57
# Use 80x80 for all "Point" WBC annotations (educated guess)
WBC_POINT_BOX_SIZE = 80

# --- Helper Functions (Updated & Robust) ---

def clip_yolo_coords(x_center, y_center, w, h):
    """Clips YOLO coordinates to be safely within [0.0, 1.0]."""
    w = min(w, 1.0)
    h = min(h, 1.0)
    
    x_min = max(0.0, x_center - w / 2.0)
    y_min = max(0.0, y_center - h / 2.0)
    x_max = min(1.0, x_center + w / 2.0)
    y_max = min(1.0, y_center + h / 2.0)
    
    final_x_center = (x_min + x_max) / 2.0
    final_y_center = (y_min + y_max) / 2.0
    final_w = x_max - x_min
    final_h = y_max - y_min
    
    # Add a check for zero-area boxes, which can crash training
    if final_w <= 0.0 or final_h <= 0.0:
        return None
        
    return final_x_center, final_y_center, final_w, final_h

def convert_circle_to_yolo(cx, cy, px, py, img_w, img_h):
    """Calculates the YOLO bounding box for a 'Circle' annotation."""
    radius = math.sqrt((cx - px)**2 + (cy - py)**2)
    box_w = 2 * radius
    box_h = 2 * radius
    
    x_center_norm = cx / img_w
    y_center_norm = cy / img_h
    w_norm = box_w / img_w
    h_norm = box_h / img_w
    
    return clip_yolo_coords(x_center_norm, y_center_norm, w_norm, h_norm)

def convert_point_to_yolo(cx, cy, box_size, img_w, img_h):
    """Calculates the YOLO bounding box for a 'Point' annotation."""
    x_center_norm = cx / img_w
    y_center_norm = cy / img_h
    w_norm = box_size / img_w
    h_norm = box_size / img_h
    
    return clip_yolo_coords(x_center_norm, y_center_norm, w_norm, h_norm)

# --- Main Processing Functions (Corrected) ---

def process_db1(src_root, dest_img_dir, dest_lab_dir):
    """Processes DB 1 (Corrected Dimension Handling + Sane Sizes)"""
    print("Processing DB 1...")
    img_root = src_root / "All_PvTk"
    ann_root = src_root / "All_annotations"
    
    ann_files = list(ann_root.glob("**/*.txt"))
    if not ann_files:
        print(f"  [Error] No annotation files found in {ann_root}", file=sys.stderr)
        return

    for ann_path in tqdm(ann_files, desc="DB 1"):
        patient_name = ann_path.parent.name
        file_stem = ann_path.stem
        
        src_img_path = img_root / patient_name / f"{file_stem}.jpg"
        new_name_base = f"db1_{patient_name}_{file_stem}"
        dest_img_path = dest_img_dir / f"{new_name_base}.jpg"
        dest_lab_path = dest_lab_dir / f"{new_name_base}.txt"
        
        if not src_img_path.exists():
            print(f"    [Warning] Missing image for annotation: {ann_path}", file=sys.stderr)
            continue
            
        try:
            image = cv2.imread(str(src_img_path))
            if image is None:
                print(f"    [Warning] Failed to read image: {src_img_path}", file=sys.stderr)
                continue
            
            actual_h, actual_w, _ = image.shape
            
            with open(ann_path, 'r') as f:
                lines = f.read().splitlines()
            
            if not lines:
                print(f"    [Warning] Annotation file is empty, skipping: {ann_path}", file=sys.stderr)
                continue
            
            yolo_lines = []
            for line in lines[1:]:
                parts = line.split(',')
                if not parts or len(parts) < 9: continue
                
                obj_type, ann_type = parts[1], parts[3]
                
                if obj_type == "Parasitized" and ann_type == "Circle":
                    class_id = CLASS_MAP["parasite"]
                    cx, cy = float(parts[5]), float(parts[6])
                    px, py = float(parts[7]), float(parts[8])
                    
                    yolo_data = convert_circle_to_yolo(cx, cy, px, py, actual_w, actual_h)
                    if yolo_data:
                        yolo_lines.append(f"{class_id} {yolo_data[0]:.6f} {yolo_data[1]:.6f} {yolo_data[2]:.6f} {yolo_data[3]:.6f}")
            
            cv2.imwrite(str(dest_img_path), image)
            with open(dest_lab_path, 'w') as f:
                f.write("\n".join(yolo_lines))
                
        except Exception as e:
            print(f"  [Error] Failed to process {ann_path}: {e}", file=sys.stderr)

def process_db2(src_root, dest_img_dir, dest_lab_dir):
    """Processes DB 2 (Corrected Dimension Handling + Sane Sizes)"""
    print("Processing DB 2...")
    img_root = src_root / "Thick_Smears_150"
    ann_root = src_root / "GT_updated"
    
    ann_files = list(ann_root.glob("**/*.txt"))
    if not ann_files:
        print(f"  [Error] No annotation files found in {ann_root}", file=sys.stderr)
        return

    for ann_path in tqdm(ann_files, desc="DB 2"):
        patient_name = ann_path.parent.name
        file_stem = ann_path.stem
        
        src_img_path = img_root / patient_name / f"{file_stem}.jpg"
        new_name_base = f"db2_{patient_name}_{file_stem}"
        dest_img_path = dest_img_dir / f"{new_name_base}.jpg"
        dest_lab_path = dest_lab_dir / f"{new_name_base}.txt"
        
        if not src_img_path.exists():
            print(f"    [Warning] Missing image for annotation: {ann_path}", file=sys.stderr)
            continue
            
        try:
            image = cv2.imread(str(src_img_path))
            if image is None:
                print(f"    [Warning] Failed to read image: {src_img_path}", file=sys.stderr)
                continue
            
            actual_h, actual_w, _ = image.shape
            
            with open(ann_path, 'r') as f:
                lines = f.read().splitlines()
            
            if not lines:
                print(f"    [Warning] Annotation file is empty, skipping: {ann_path}", file=sys.stderr)
                continue
                
            yolo_lines = []
            for line in lines[1:]:
                parts = line.split(',')
                if not parts or len(parts) < 4: continue
                
                obj_type, ann_type = parts[1], parts[3]
                
                class_id = -1
                if obj_type == "Parasite":
                    class_id = CLASS_MAP["parasite"]
                elif obj_type == "White_Blood_Cell":
                    class_id = CLASS_MAP["white_blood_cell"]
                else:
                    continue 
                
                yolo_data = None
                if ann_type == "Circle" and len(parts) >= 9:
                    cx, cy = float(parts[5]), float(parts[6])
                    px, py = float(parts[7]), float(parts[8])
                    yolo_data = convert_circle_to_yolo(cx, cy, px, py, actual_w, actual_h)
                
                elif ann_type == "Point" and len(parts) >= 7:
                    cx, cy = float(parts[5]), float(parts[6])
                    if class_id == CLASS_MAP["parasite"]:
                        yolo_data = convert_point_to_yolo(cx, cy, PARASITE_POINT_BOX_SIZE, actual_w, actual_h)
                    elif class_id == CLASS_MAP["white_blood_cell"]:
                        yolo_data = convert_point_to_yolo(cx, cy, WBC_POINT_BOX_SIZE, actual_w, actual_h)
                
                if yolo_data:
                    yolo_lines.append(f"{class_id} {yolo_data[0]:.6f} {yolo_data[1]:.6f} {yolo_data[2]:.6f} {yolo_data[3]:.6f}")

            cv2.imwrite(str(dest_img_path), image)
            with open(dest_lab_path, 'w') as f:
                f.write("\n".join(yolo_lines))
                
        except Exception as e:
            print(f"  [Error] Failed to process {ann_path}: {e}", file=sys.stderr)

def process_db3(src_root, dest_img_dir, dest_lab_dir):
    """Processes DB 3 (Corrected Dimension Handling + Sane Sizes)"""
    print("Processing DB 3...")
    img_root = src_root / "Uninfected patients"
    ann_root = src_root / "Annotations"
    
    ann_files = list(ann_root.glob("**/*.txt"))
    if not ann_files:
        print(f"  [Error] No annotation files found in {ann_root}", file=sys.stderr)
        return

    for ann_path in tqdm(ann_files, desc="DB 3"):
        patient_name = ann_path.parent.name
        file_stem = ann_path.stem
        
        src_img_path = img_root / patient_name / "tiled" / f"{file_stem}.tiff"
        new_name_base = f"db3_{patient_name}_{file_stem}"
        dest_img_path = dest_img_dir / f"{new_name_base}.jpg"
        dest_lab_path = dest_lab_dir / f"{new_name_base}.txt"
        
        if not src_img_path.exists():
            print(f"    [Warning] Missing image for annotation: {ann_path}", file=sys.stderr)
            continue
            
        try:
            image = cv2.imread(str(src_img_path))
            if image is None:
                print(f"    [Warning] Failed to read image: {src_img_path}", file=sys.stderr)
                continue
            
            actual_h, actual_w, _ = image.shape

            with open(ann_path, 'r') as f:
                lines = f.read().splitlines()
            
            if not lines:
                print(f"    [Warning] Annotation file is empty, skipping: {ann_path}", file=sys.stderr)
                continue
                
            yolo_lines = []
            for line in lines[1:]:
                parts = line.split(',')
                if not parts or len(parts) < 7: continue

                obj_type, ann_type = parts[1], parts[3]
                
                if obj_type == "White_Blood_Cell" and ann_type == "Point":
                    class_id = CLASS_MAP["white_blood_cell"]
                    cx, cy = float(parts[5]), float(parts[6])
                    
                    yolo_data = convert_point_to_yolo(cx, cy, WBC_POINT_BOX_SIZE, actual_w, actual_h)
                    if yolo_data:
                        yolo_lines.append(f"{class_id} {yolo_data[0]:.6f} {yolo_data[1]:.6f} {yolo_data[2]:.6f} {yolo_data[3]:.6f}")

            cv2.imwrite(str(dest_img_path), image)
            with open(dest_lab_path, 'w') as f:
                f.write("\n".join(yolo_lines))
                
        except Exception as e:
            print(f"  [Error] Failed to process {ann_path}: {e}", file=sys.stderr)

# --- Main Execution ---
def main():
    output_images_dir = OUTPUT_ROOT / "images"
    output_labels_dir = OUTPUT_ROOT / "labels"
    
    output_images_dir.mkdir(parents=True, exist_ok=True)
    output_labels_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Unified dataset will be created in: {OUTPUT_ROOT}\n")
    
    process_db1(DB1_ROOT, output_images_dir, output_labels_dir)
    process_db2(DB2_ROOT, output_images_dir, output_labels_dir)
    process_db3(DB3_ROOT, output_images_dir, output_labels_dir)
    
    print(f"\n✅ All datasets processed and unified in {OUTPUT_ROOT}")
    print("Your next step is to run a script for Step 2: Patient-Based Train/Validation Split.")

if __name__ == "__main__":
    main()