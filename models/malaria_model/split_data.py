import os
import random
import shutil
from pathlib import Path
from collections import defaultdict
from tqdm import tqdm
import sys

# --- CONFIGURATION: YOU MUST EDIT THESE PATHS ---

# 1. Set the path to the dataset you created in Step 1
UNIFIED_DATA_ROOT = Path(r"C:\Ankit\Reposetories\honors-final-project\models\malaria_model\malaria_dataset_unified")

# 2. Set the path for your *final* dataset (where train/val folders will be)
#    (This can be the same as UNIFIED_DATA_ROOT, it will just add folders)
FINAL_DATA_ROOT = Path(r"C:\Ankit\Reposetories\honors-final-project\models\malaria_model\malaria_dataset_final")

# 3. Set your desired validation split ratio (e.g., 0.2 = 20% validation)
VAL_SPLIT_RATIO = 0.2

# 4. Set a random seed for reproducible splits
RANDOM_SEED = 42

# --- END OF CONFIGURATION ---

def move_files(patient_list, patients_to_files, src_img_dir, src_lab_dir, dest_img_dir, dest_lab_dir):
    """
    Moves all files for a given list of patients to the destination folders.
    """
    total_files_moved = 0
    for patient_id in tqdm(patient_list, desc=f"Moving files to {dest_img_dir.parent.name}"):
        file_stems = patients_to_files[patient_id]
        
        for stem in file_stems:
            src_img = src_img_dir / f"{stem}.jpg"
            src_lab = src_lab_dir / f"{stem}.txt"
            
            dest_img = dest_img_dir / f"{stem}.jpg"
            dest_lab = dest_lab_dir / f"{stem}.txt"
            
            if src_img.exists() and src_lab.exists():
                # Use shutil.copy2 to copy file and metadata
                shutil.copy2(src_img, dest_img)
                shutil.copy2(src_lab, dest_lab)
                total_files_moved += 1
            else:
                print(f"  [Warning] Missing file for stem {stem}, skipping.", file=sys.stderr)
                
    return total_files_moved

def main():
    print(f"Starting patient-based split...")
    random.seed(RANDOM_SEED)

    # Define source directories from Step 1
    src_img_dir = UNIFIED_DATA_ROOT / "images"
    src_lab_dir = UNIFIED_DATA_ROOT / "labels"

    if not src_img_dir.exists() or not src_lab_dir.exists():
        print(f"[Error] Source directories not found at: {UNIFIED_DATA_ROOT}", file=sys.stderr)
        print("Please make sure you have run Step 1 and the paths are correct.")
        return

    # Define final destination directories
    train_img_dir = FINAL_DATA_ROOT / "images" / "train"
    train_lab_dir = FINAL_DATA_ROOT / "labels" / "train"
    val_img_dir = FINAL_DATA_ROOT / "images" / "val"
    val_lab_dir = FINAL_DATA_ROOT / "labels" / "val"

    # Create directories
    train_img_dir.mkdir(parents=True, exist_ok=True)
    train_lab_dir.mkdir(parents=True, exist_ok=True)
    val_img_dir.mkdir(parents=True, exist_ok=True)
    val_lab_dir.mkdir(parents=True, exist_ok=True)

    # 1. Discover all files and map them to unique patients
    print("Scanning files and identifying patients...")
    patients_to_files = defaultdict(list)
    
    all_image_files = list(src_img_dir.glob("*.jpg"))
    if not all_image_files:
        print(f"[Error] No .jpg files found in {src_img_dir}", file=sys.stderr)
        return

    for img_file in tqdm(all_image_files, desc="Discovering patients"):
        stem = img_file.stem
        
        try:
            # Filename format is "dbX_PatientID_..."
            # We split on '_' a max of 2 times to get ['dbX', 'PatientID', 'rest_of_name']
            parts = stem.split('_', 2)
            if len(parts) < 3:
                print(f"  [Warning] Skipping malformed filename: {stem}", file=sys.stderr)
                continue
            
            # Create a unique ID like "db1_PvTk1" or "db2_1"
            unique_patient_id = f"{parts[0]}_{parts[1]}"
            patients_to_files[unique_patient_id].append(stem)
            
        except Exception as e:
            print(f"  [Error] Failed to parse filename {stem}: {e}", file=sys.stderr)

    if not patients_to_files:
        print("[Error] No patients were identified. Check filenames.", file=sys.stderr)
        return

    print(f"Found {len(patients_to_files)} unique patients.")

    # 2. Shuffle and split the list of patients
    patient_list = list(patients_to_files.keys())
    random.shuffle(patient_list)

    split_index = int(len(patient_list) * VAL_SPLIT_RATIO)
    
    # Ensure at least one patient in validation set (if possible)
    if split_index == 0 and len(patient_list) > 1:
        split_index = 1
        
    val_patients = patient_list[:split_index]
    train_patients = patient_list[split_index:]

    print(f"Total patients: {len(patient_list)}")
    print(f"Training patients: {len(train_patients)}")
    print(f"Validation patients: {len(val_patients)}")

    # 3. Move files for each set
    train_count = move_files(train_patients, patients_to_files, 
                             src_img_dir, src_lab_dir, 
                             train_img_dir, train_lab_dir)
                             
    val_count = move_files(val_patients, patients_to_files, 
                           src_img_dir, src_lab_dir, 
                           val_img_dir, val_lab_dir)

    # 4. Final Summary
    print("\n--- Split Summary ---")
    print(f"Total images in Training set:   {train_count}")
    print(f"Total images in Validation set: {val_count}")
    print(f"Total images processed:         {train_count + val_count}")
    print("\n✅ Patient-based split complete!")
    print(f"Your final dataset is ready in: {FINAL_DATA_ROOT}")
    print("Your next step is to create the 'malaria.yaml' file and start training.")

if __name__ == "__main__":
    main()