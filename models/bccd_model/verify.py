import os
from ultralytics import YOLO
from collections import Counter

# --- Configuration -----------------------------------------------------------

# 1. Path to your best model weights
# Look in your 'runs/detect/' folder and find the 'best.pt' file.
# It's probably in 'runs/detect/train/weights/best.pt'
MODEL_PATH = r'C:\Ankit\Reposetories\honors-final-project\models\bccd_model\runs\detect\train\weights\best.pt'

# 2. Path to an image you want to test
# Let's grab one from your test set.
IMAGE_PATH = r'C:\Ankit\Reposetories\honors-final-project\models\bccd_model\dataset\test\images\BloodImage_00038_jpg.rf.63d04b5c9db95f32fa7669f72e4903ca.jpg'

# 3. Class names
# This MUST match the 'names' list in your bccd_absolute.yaml file
CLASS_NAMES = {
    0: 'cells',
    1: 'Platelets',
    2: 'RBC',
    3: 'WBC'
}


def count_cells(model_path, image_path, class_names):
    """
    Loads a YOLOv8 model, runs inference on an image,
    and prints the counts of each detected cell type.
    """
    # 1. Load your custom-trained model
    try:
        model = YOLO(model_path)
    except Exception as e:
        print(f"Error loading model from {model_path}")
        print(f"Details: {e}")
        return

    # 2. Run inference on the image
    print(f"Running inference on: {os.path.basename(image_path)}")
    try:
        results = model(image_path)
    except FileNotFoundError:
        print(f"Error: Image file not found at {image_path}")
        return
    except Exception as e:
        print(f"Error during inference: {e}")
        return

    # 3. Process results and count
    cell_counts = Counter()
    
    if not results:
        print("No results returned from model.")
        return

    # Iterate over each detected object in the first result
    for r in results:
        # Get the class IDs of all detected boxes
        # .cls gives the class ID for each box
        # .cpu() moves data to the CPU (if on GPU)
        # .numpy() converts to a numpy array
        class_ids = r.boxes.cls.cpu().numpy().astype(int)
        
        # Count the occurrences of each class ID
        for cls_id in class_ids:
            cell_counts[cls_id] += 1

    # 4. Print the final counts
    print("\n--- Detection Counts ---")
    total_cells = 0
    for cls_id, count in sorted(cell_counts.items()):
        class_name = class_names.get(cls_id, f'Unknown ID {cls_id}')
        
        # Don't include the 'cells' supercategory in the count
        if class_name != 'cells':
            print(f"  {class_name}: {count}")
            total_cells += count
    
    print(f"  ----------------------")
    print(f"  Total Cells Detected: {total_cells}")

    # 5. Save the annotated image (optional, but very useful)
    save_dir = "inference_results"
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, "result.jpg")
    
    # results[0].save() saves the image with boxes drawn on it
    results[0].save(filename=save_path)
    print(f"\n✅ Annotated image saved to: {os.path.abspath(save_path)}")


# --- Run the script ---
if __name__ == "__main__":
    # Check if the model file exists
    if not os.path.exists(MODEL_PATH):
        print(f"Error: Model file not found at '{MODEL_PATH}'")
        print("Please check your 'runs/detect/' folder for the correct path to 'best.pt'")
    
    # Check if the image file exists
    elif not os.path.exists(IMAGE_PATH):
        print(f"Error: Test image not found at '{IMAGE_PATH}'")
        print("Please update the 'IMAGE_PATH' variable in the script.")
        
    else:
        count_cells(MODEL_PATH, IMAGE_PATH, CLASS_NAMES)