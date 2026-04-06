#!/usr/bin/env python3
"""
Schema validator for the theology-graph project.
Validates:
- All schema files against JSON Schema meta-schema (draft-07).
- All data files in claims/, profiles/, etc. against their schemas.
Used by ralph.yml invariants check and manual runs.
"""
import json
import sys
from pathlib import Path
from jsonschema import validate, ValidationError, SchemaError

def load_json(path: Path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"✗ Failed to read {path}: {e}")
        return None

def main() -> int:
    base = Path(".")
    schema_dir = base / "schemas"
    data_dirs = {
        "claims": schema_dir / "claim.json",
        "profiles": schema_dir / "profile.json",
        "debates": schema_dir / "debate.json",
        "graph": schema_dir / "resolution_tree.json",
    }

    print("=== Schema Validation Run ===")

    # 1. Validate schema files themselves
    for schema_file in schema_dir.glob("*.json"):
        print(f"Checking schema {schema_file.name} ... ", end="")
        schema = load_json(schema_file)
        if not schema:
            return 1
        try:
            validate(instance=schema, schema={"$schema": "http://json-schema.org/draft-07/schema#"})
            print("✓ (valid schema)")
        except (ValidationError, SchemaError) as e:
            print(f"✗ INVALID SCHEMA: {e.message}")
            return 1

    # 2. Validate data files
    all_passed = True
    for data_dir_name, schema_path in data_dirs.items():
        schema = load_json(schema_path)
        if not schema:
            print(f"✗ Cannot load schema {schema_path}")
            return 1
        data_dir = base / data_dir_name
        if not data_dir.exists():
            print(f"INFO: {data_dir} directory not present yet")
            continue
        for json_file in sorted(data_dir.glob("*.json")):
            data = load_json(json_file)
            if not data:
                all_passed = False
                continue
            try:
                validate(instance=data, schema=schema)
                print(f"✓ {json_file}")
            except ValidationError as e:
                print(f"✗ {json_file}: {e.message} (at {list(e.path)})")
                all_passed = False
            except Exception as e:
                print(f"✗ {json_file}: unexpected error {e}")
                all_passed = False

    print("=== Validation complete ===")
    if all_passed:
        print("All artifacts conform to schemas.")
        return 0
    else:
        print("Validation failures detected.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
