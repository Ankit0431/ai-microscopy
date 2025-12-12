import cv2
from pathlib import Path
from ultralytics import YOLO
import sys

MODEL_PATH = Path(r"C:\Ankit\Reposetories\honors-final-project\models\malaria_model\runs\detect\train3\weights\best.pt")

# 2. Path to your *validation* images
VALIDATION_IMAGE_DIR = Path(r"C:\Ankit\Reposetories\honors-final-project\models\malaria_model\malaria_dataset_final\images\val")

# 3. Path to a *new* folder to save the results
OUTPUT_DIR = Path(r"C:\Ankit\Reposetories\honors-final-project\models\malaria_model\inference_results")

# 4. How many images to test
NUM_IMAGES_TO_TEST = 10

# --- END OF CONFIGURATION ---

def run_inference():
    print(f"Loading model from {MODEL_PATH}...")
    if not MODEL_PATH.exists():
        print(f"[Error] Model file not found at {MODEL_PATH}", file=sys.stderr)
        return
        
    try:
        # Load the trained model
        model = YOLO(MODEL_PATH)
    except Exception as e:
        print(f"[Error] Failed to load model: {e}", file=sys.stderr)
        return

    print("Model loaded successfully.")
    
    # Create the output directory
    OUTPUT_DIR.mkdir(exist_ok=True)
    print(f"Results will be saved in: {OUTPUT_DIR}")

    # Get a list of validation images
    image_files = list(VALIDATION_IMAGE_DIR.glob("*.jpg"))
    if not image_files:
        print(f"[Error] No images found in {VALIDATION_IMAGE_DIR}", file=sys.stderr)
        return

    # Select a few images to test
    images_to_test = image_files[:NUM_IMAGES_TO_TEST]

    for img_path in images_to_test:
        print(f"\n--- Processing: {img_path.name} ---")
        
        # Run inference
        # We set a low confidence (conf=0.1) to see *everything* the
        # model is *thinking* about, not just high-confidence results.
        try:
            results = model(img_path, conf=0.1)
        except Exception as e:
            print(f"  [Error] Failed to run inference on {img_path.name}: {e}", file=sys.stderr)
            continue

        # Get the first result object
        result = results[0]
        
        # Print what it found
        parasite_count = 0
        wbc_count = 0
        
        for box in result.boxes:
            class_id = int(box.cls)
            class_name = model.names[class_id]
            if class_name == 'parasite':
                parasite_count += 1
            elif class_name == 'white_blood_cell':
                wbc_count += 1
        
        print(f"  Found: {parasite_count} parasites")
        print(f"  Found: {wbc_count} white_blood_cells")

        # Save the image with boxes drawn on it
        output_filename = OUTPUT_DIR / f"result_{img_path.name}"
        
        # This saves the original image with predictions overlaid
        result.save(filename=str(output_filename))
        print(f"  Saved detection image to: {output_filename}")

    print("\n✅ Inference complete.")
    print("Please open the 'inference_results' folder to see the detections.")

if __name__ == "__main__":
    run_inference()