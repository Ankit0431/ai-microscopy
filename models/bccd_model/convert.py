from ultralytics.data.converter import convert_coco

# Path to your main 'dataset' folder
dataset_path = r'C:\Ankit\Reposetories\honors-final-project\models\bccd_model\dataset\valid'
save_dir = r'C:\Ankit\Reposetories\honors-final-project\models\bccd_model\dataset\valid'

print(f"Starting conversion in: {dataset_path}")

# This will read your 'annotations.json' files
# and create the 'labels' folders with .txt files.
convert_coco(labels_dir=dataset_path, save_dir=save_dir)

print("Conversion complete. You should now have 'labels' folders.")