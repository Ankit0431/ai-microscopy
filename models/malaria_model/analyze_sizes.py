import math
from pathlib import Path
from tqdm import tqdm
import sys
import statistics

# --- CONFIGURATION: YOU MUST EDIT THESE PATHS ---
DB1_ROOT = Path(r"C:\Ankit\Reposetories\honors-final-project\models\malaria_model\dataset\Infected_1\NIH-NLM-ThickBloodSmearsPV")
DB2_ROOT = Path(r"C:\Ankit\Reposetories\honors-final-project\models\malaria_model\dataset\Infected_2")
# --- END OF CONFIGURATION ---

def calculate_radius(cx, cy, px, py):
    """Calculates radius from center and circumference point."""
    return math.sqrt((cx - px)**2 + (cy - py)**2)

def analyze_db1(src_root):
    """Finds all 'Parasitized' circle radii in DB1."""
    print("Analyzing DB 1...")
    ann_root = src_root / "All_annotations"
    ann_files = list(ann_root.glob("**/*.txt"))
    
    radii = []
    
    for ann_path in tqdm(ann_files, desc="DB 1"):
        try:
            with open(ann_path, 'r') as f:
                lines = f.read().splitlines()
            
            if not lines: continue
            
            for line in lines[1:]:
                parts = line.split(',')
                
                if not parts or len(parts) < 9: continue
                
                obj_type = parts[1]
                ann_type = parts[3]
                
                if obj_type == "Parasitized" and ann_type == "Circle":
                    cx, cy = float(parts[5]), float(parts[6])
                    px, py = float(parts[7]), float(parts[8])
                    radii.append(calculate_radius(cx, cy, px, py))
                    
        except Exception as e:
            print(f"  [Warning] Failed to parse {ann_path.name}: {e}", file=sys.stderr)
            
    return radii

def analyze_db2(src_root):
    """Finds all 'Parasite' and 'White_Blood_Cell' circle radii in DB2."""
    print("Analyzing DB 2...")
    ann_root = src_root / "GT_updated"
    ann_files = list(ann_root.glob("**/*.txt"))
    
    parasite_radii = []
    wbc_radii = []
    
    for ann_path in tqdm(ann_files, desc="DB 2"):
        try:
            with open(ann_path, 'r') as f:
                lines = f.read().splitlines()
                
            if not lines: continue
            
            for line in lines[1:]:
                parts = line.split(',')
                
                if not parts or len(parts) < 9: continue
                
                obj_type = parts[1]
                ann_type = parts[3]
                
                if ann_type != "Circle": continue
                
                cx, cy = float(parts[5]), float(parts[6])
                px, py = float(parts[7]), float(parts[8])
                radius = calculate_radius(cx, cy, px, py)
                
                if obj_type == "Parasite":
                    parasite_radii.append(radius)
                elif obj_type == "White_Blood_Cell":
                    wbc_radii.append(radius)
                    
        except Exception as e:
            print(f"  [Warning] Failed to parse {ann_path.name}: {e}", file=sys.stderr)
            
    return parasite_radii, wbc_radii

def main():
    db1_parasite_radii = analyze_db1(DB1_ROOT)
    db2_parasite_radii, db2_wbc_radii = analyze_db2(DB2_ROOT)
    
    all_parasite_radii = db1_parasite_radii + db2_parasite_radii
    all_wbc_radii = db2_wbc_radii
    
    if not all_parasite_radii:
        print("\n[Error] No parasite 'Circle' annotations found!", file=sys.stderr)
    else:
        avg_parasite_radius = statistics.mean(all_parasite_radii)
        avg_parasite_diameter = avg_parasite_radius * 2
        print(f"\n--- Parasite Analysis ---")
        print(f"  Found {len(all_parasite_radii)} parasite 'Circle' annotations.")
        print(f"  Average Parasite Radius: {avg_parasite_radius:.2f} pixels")
        print(f"  Average Parasite Diameter: {avg_parasite_diameter:.2f} pixels")
        
    if not all_wbc_radii:
        print("\n[Error] No White_Blood_Cell 'Circle' annotations found!", file=sys.stderr)
        print("This is a problem, as we can't estimate their size.")
    else:
        avg_wbc_radius = statistics.mean(all_wbc_radii)
        avg_wbc_diameter = avg_wbc_radius * 2
        print(f"\n--- White Blood Cell Analysis ---")
        print(f"  Found {len(all_wbc_radii)} WBC 'Circle' annotations.")
        print(f"  Average WBC Radius: {avg_wbc_radius:.2f} pixels")
        print(f"  Average WBC Diameter: {avg_wbc_diameter:.2f} pixels")

if __name__ == "__main__":
    main()