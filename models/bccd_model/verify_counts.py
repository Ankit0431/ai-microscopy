import os
import json
import numpy as np  # New import
from ultralytics import YOLO
from collections import Counter

# --- Configuration -----------------------------------------------------------

# 1. Path to your best model weights
MODEL_PATH = r'runs/detect/train4/weights/best.pt'

# 2. Path to your TEST dataset's IMAGES folder
IMAGE_DIR = r'C:\Ankit\Reposetories\honors-final-project\models\bccd_model\dataset\test\images'

# 3. Path to your TEST dataset's LABELS folder
LABEL_DIR = r'C:\Ankit\Reposetories\honors-final-project\models\bccd_model\dataset\test\labels'

# 4. Class names (must match your YAML)
CLASS_NAMES = {
    0: 'Platelets',
    1: 'RBC',
    2: 'WBC'
}

# --- Functions -------------------------------------------------------------

def get_prediction_counts(model, image_path):
    """
    Runs the YOLO model on a single image and returns a Counter object.
    'model' is the already-loaded YOLO model.
    """
    # verbose=False suppresses the per-image print-out
    results = model(image_path, verbose=False)
    
    pred_counts = Counter()
    if results:
        class_ids = results[0].boxes.cls.cpu().numpy().astype(int)
        for cls_id in class_ids:
            pred_counts[cls_id] += 1
    return pred_counts

def get_ground_truth_counts(image_path, label_dir):
    """
    Reads the corresponding YOLO .txt file and returns a Counter of the actual classes.
    """
    img_filename = os.path.basename(image_path)
    label_basename, _ = os.path.splitext(img_filename)
    label_path = os.path.join(label_dir, label_basename + '.txt')

    if not os.path.exists(label_path):
        # This is expected if an image has no labels
        return Counter() 

    truth_counts = Counter()
    try:
        with open(label_path, 'r') as f:
            for line in f:
                parts = line.split()
                if parts:
                    class_id = int(parts[0])
                    truth_counts[class_id] += 1
    except Exception as e:
        print(f"Error reading label file {label_path}: {e}")
        return None
            
    return truth_counts

def print_final_metrics(stats, class_names):
    """
    Calculates and prints the final aggregate metrics for all classes.
    """
    print("\n" + "="*40)
    print("--- FINAL TEST SET COUNTING METRICS ---")
    print("="*40)

    # We only care about the classes we are counting (not 'cells')
    # Based on your metrics, these are the correct IDs
    class_ids_to_report = [0, 1, 2] # Platelets, RBC, WBC

    for cls_id in class_ids_to_report:
        class_name = class_names.get(cls_id, f"ID {cls_id}")
        
        # Convert lists to numpy arrays for easier math
        pred_counts = np.array(stats[cls_id]['pred'])
        truth_counts = np.array(stats[cls_id]['truth'])
        
        # Calculate errors for each image
        errors = pred_counts - truth_counts
        abs_errors = np.abs(errors)

        # Calculate metrics
        total_predicted = np.sum(pred_counts)
        total_actual = np.sum(truth_counts)
        
        avg_predicted = np.mean(pred_counts)
        avg_actual = np.mean(truth_counts)
        
        mae = np.mean(abs_errors) # Mean Absolute Error
        
        # Print results for the class
        print(f"\n📊 Metrics for: {class_name}")
        print(f"  Total Predicted: {total_predicted}")
        print(f"  Total Actual:    {total_actual}")
        print(f"  Avg. Predicted (per image): {avg_predicted:.2f}")
        print(f"  Avg. Actual (per image):    {avg_actual:.2f}")
        print(f"  Mean Absolute Error (MAE):  {mae:.2f}")
        print(f"  (This means on average, the count was off by {mae:.2f} cells)")

# --- Run the script ---
if __name__ == "__main__":
    
    # 1. Check if paths exist
    if not all(os.path.exists(p) for p in [MODEL_PATH, IMAGE_DIR, LABEL_DIR]):
        print("Error: One or more files/directories specified in the config were not found.")
    else:
        # 2. Load the model ONCE
        print("Loading model...")
        model = YOLO(MODEL_PATH)
        print("Model loaded.")

        # 3. Get list of all images in the test directory
        image_files = [f for f in os.listdir(IMAGE_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        if not image_files:
            print(f"Error: No images found in {IMAGE_DIR}")
            exit()
            
        print(f"Found {len(image_files)} images to process...")

        # 4. Initialize storage for our counts
        # We will store a list of counts, one for each image
        stats = {
            0: {'pred': [], 'truth': []}, # Platelets
            1: {'pred': [], 'truth': []}, # RBC
            2: {'pred': [], 'truth': []}  # WBC
        }
        
        # 5. Loop through all images and get counts
        for i, img_file in enumerate(image_files):
            print(f"  Processing image {i+1}/{len(image_files)}: {img_file}", end='\r')
            image_path = os.path.join(IMAGE_DIR, img_file)
            
            pred_counts = get_prediction_counts(model, image_path)
            truth_counts = get_ground_truth_counts(image_path, LABEL_DIR)

            if truth_counts is None:
                continue # Skip if label file was corrupt

            # Store the results for each class
            for cls_id in stats.keys():
                stats[cls_id]['pred'].append(pred_counts.get(cls_id, 0))
                stats[cls_id]['truth'].append(truth_counts.get(cls_id, 0))

        # 6. Print the final report
        print("\nProcessing complete.")
        print_final_metrics(stats, CLASS_NAMES)