import json
import os

# --- CONFIGURATION ---
json_path = r'C:\Ankit\Reposetories\honors-final-project\models\bccd_model\dataset\train\annotations.json'
images_dir = r'C:\Ankit\Reposetories\honors-final-project\models\bccd_model\dataset\train\images'
# ---------------------

print(f"--- Starting Sanity Check ---")

# 1. Check if JSON file exists
if not os.path.exists(json_path):
    print(f"❌ ERROR: JSON file not found at:\n{json_path}")
    exit()
print(f"✅ Found JSON file: {json_path}")

# 2. Check if images directory exists
if not os.path.exists(images_dir):
    print(f"❌ ERROR: Images directory not found at:\n{images_dir}")
    exit()
print(f"✅ Found images directory: {images_dir}")

# 3. Check if JSON file is valid
try:
    with open(json_path, 'r') as f:
        data = json.load(f)
    print("✅ JSON file is valid and readable.")
except Exception as e:
    print(f"❌ ERROR: Failed to read or parse JSON file. It might be corrupt.")
    print(f"   Error details: {e}")
    exit()

# 4. Check if the 'images' key exists and is not empty
if 'images' not in data or not data['images']:
    print(f"❌ ERROR: JSON file has no 'images' key or the image list is empty.")
    exit()

# 5. Check the first image
first_image_from_json = data['images'][0]['file_name']
path_to_first_image = os.path.join(images_dir, first_image_from_json)

print(f"Checking for first image from JSON: '{first_image_from_json}'")

if os.path.exists(path_to_first_image):
    print(f"✅ SUCCESS! Found matching image file at:\n{path_to_first_image}")
    print("\n--- Diagnosis ---")
    print("Your data *seems* correct. The problem is likely still a cache or pathing issue in the YOLO script.")
else:
    print(f"❌ CRITICAL ERROR: File mismatch.")
    print(f"   The JSON file lists this image: '{first_image_from_json}'")
    print(f"   But it was NOT found at this path:\n   {path_to_first_image}")
    print("\n--- Diagnosis ---")
    print("The 'file_name' in your JSON does not match the actual files in your 'images' folder.")