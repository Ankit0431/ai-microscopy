from pathlib import Path
import sys

BASE_DIR = Path(r"C:\Ankit\Reposetories\honors-final-project\models\malaria_model\dataset\Infected_1\NIH-NLM-ThickBloodSmearsPV\All_annotations")

def main(base_dir: Path):
    if not base_dir.exists():
        print(f"Directory does not exist: {base_dir}", file=sys.stderr)
        return 1

    renamed = 0
    skipped = 0

    for txt_path in base_dir.rglob("*.txt"):
        stem = txt_path.stem
        # skip if shorter than 8 characters
        if len(stem) <= 8:
            skipped += 1
            continue
        # skip if underscore already at position 8 (i.e., immediately after first 8 chars)
        if stem[8] == "_":
            skipped += 1
            continue

        new_stem = stem[:8] + "_" + stem[8:]
        new_path = txt_path.with_name(new_stem + txt_path.suffix)
        if new_path.exists():
            print(f"Skip (target exists): {txt_path} -> {new_path}")
            skipped += 1
            continue

        txt_path.rename(new_path)
        print(f"Renamed: {txt_path} -> {new_path}")
        renamed += 1

    print(f"Done. Renamed: {renamed}. Skipped: {skipped}.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main(BASE_DIR))
