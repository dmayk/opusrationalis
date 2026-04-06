#!/usr/bin/env python3
import json
import jsonschema
from pathlib import Path
from jsonschema import validate

def main():
    # Validation configuration
    SCHEMA_MAPPINGS = {
        'claims': 'schemas/claim.json',
        'profiles': 'schemas/profile.json',
        'debates': 'schemas/debate.json',
        'graph': 'schemas/resolution_tree.json'
    }
    
    # 1. Verify schema files themselves are valid JSON Schemas
    for data_dir, schema_path in SCHEMA_MAPPINGS.items():
        schema_path = Path(schema_path)
        try:
            with open(schema_path) as f:
                schema = json.load(f)
            # Validate schema against JSON Schema draft 7 standard
            validate(instance=schema, schema=schema)
        except Exception as e:
            print(f"ERROR: Schema file {schema_path} is invalid: {str(e)}")
            return 1

    # 2. Validate data files against their schemas
    for data_dir, schema_path in SCHEMA_MAPPINGS.items():
        schema_path = Path(schema_path)
        try:
            with open(schema_path) as f:
                schema = json.load(f)
        except Exception as e:
            print(f"ERROR: Failed to load schema {schema_path}: {str(e)}")
            return 1

        data_dir_path = Path(data_dir)
        if not data_dir_path.exists():
            print(f"INFO: Data directory {data_dir_path} does not exist")
            continue
            
        for json_file in data_dir_path.glob('*.json'):
            try:
                with open(json_file) as f:
                    data = json.load(f)
                validate(instance=data, schema=schema)
                print(f"✓ Validated: {json_file}")
            except jsonschema.ValidationError as e:
                print(f"✗ Validation failed for {json_file}:")
                print(f"   {e.message}")
                print(f"   Problem location: {e.path}")
            except Exception as e:
                print(f"✗ Error processing {json_file}: {str(e)}")
                return 1

    return 0

if __name__ == "__main__":
    exit(main())
