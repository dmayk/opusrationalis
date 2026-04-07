#!/usr/bin/env python3
"""
Verse Retrieval Module

Implements automated verse retrieval using the canonical ID scheme defined in corpora/MANIFEST.md.
Provides a python API for fetching original and translated texts from local corpora.
"""

import json
import sys
import re
from pathlib import Path

# Resolve corpora directory relative to this script
CORPORA_DIR = Path(__file__).resolve().parent.parent / "corpora"

def parse_address(address: str):
    """
    Parses an address like 'KJV-1769:Rom.3.21-26' or 'KJV-1769:Rom 3:21-26' into:
    (corpus_id: 'KJV-1769', book: 'Rom', chapter: '3', verse: '21-26')
    """
    if ":" not in address:
        raise ValueError(f"Invalid format '{address}'. Expected '<corpus_id>:<reference>'")
    
    parts = address.split(":", 1)
    corpus_id = parts[0].strip()
    reference = parts[1].strip()
    
    # Handle "Rom 3:24" -> "Rom.3.24"
    reference = reference.replace(" ", ".").replace(":", ".")
    
    ref_parts = reference.split(".")
    if len(ref_parts) < 3:
        raise ValueError(f"Invalid reference '{reference}'. Expected '<book>.<chapter>.<verse>'")
    
    book = ref_parts[0]
    chapter = ref_parts[1]
    
    verse = ".".join(ref_parts[2:]) 
    
    return corpus_id, book, chapter, verse

def find_corpus_dir(corpus_id: str) -> Path:
    """Finds the directory containing the given corpus_id."""
    if not CORPORA_DIR.exists():
        raise FileNotFoundError(f"Corpora directory not found at {CORPORA_DIR}")
        
    for sub_dir in filter(lambda p: p.is_dir(), CORPORA_DIR.iterdir()):
        target = sub_dir / corpus_id
        if target.is_dir():
            return target
            
    raise FileNotFoundError(f"Corpus '{corpus_id}' not found in {CORPORA_DIR} tree")

def retrieve_verse(address: str, separator=" ") -> str:
    """
    Retrieves the text for a given canonical mapping address.
    Supports single verses (Rom.3.24) and inclusive ranges (Rom.3.21-26).
    Ranges are joined by `separator` (default single space).
    """
    corpus_id, book, chapter, verse_ref = parse_address(address)
    
    corpus_dir = find_corpus_dir(corpus_id)
    book_file = corpus_dir / f"{book}.json"
    
    if not book_file.exists():
        raise FileNotFoundError(f"Book file not found: {book_file}")
        
    with open(book_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    chapter_data = data.get("chapters", {}).get(chapter)
    if not chapter_data:
        raise KeyError(f"Chapter '{chapter}' not found in {book_file}")
        
    if "-" in verse_ref:
        try:
            start_v, end_v = map(int, verse_ref.split("-"))
        except ValueError:
            raise ValueError(f"Invalid verse range format: '{verse_ref}'")
            
        verses = []
        for v in range(start_v, end_v + 1):
            v_str = str(v)
            if v_str in chapter_data:
                verses.append(chapter_data[v_str])
            else:
                pass
                
        if not verses:
            raise KeyError(f"Verses '{verse_ref}' not found in chapter {chapter}")
            
        return separator.join(verses)
    else:
        if verse_ref not in chapter_data:
            raise KeyError(f"Verse '{verse_ref}' not found in chapter {chapter} of {book_file}")
        return chapter_data[verse_ref]

if __name__ == "__main__":
    if len(sys.argv) > 1:
        addresses = sys.argv[1:]
        for addr in addresses:
            try:
                print(f"[{addr}]")
                print(retrieve_verse(addr))
            except Exception as e:
                print(f"Error retrieving {addr}: {e}", file=sys.stderr)
        if len(addresses) > 0:
            sys.exit(0)

    # Test cases when run directly
    print("Running basic retrieval tests...")
    
    try:
        t1 = retrieve_verse("TR-Scrivener-1894:Rom 3:24")
        assert "dikaioumenoi" in t1
        print("✓ Greek single verse retrieval OK")
    except Exception as e:
        print(f"✗ Greek test failed: {e}")
        
    try:
        t2 = retrieve_verse("KJV-1769:Rom 3:21-26")
        assert "justified" in t2
        print("✓ English verse range retrieval OK")
    except Exception as e:
        print(f"✗ English test failed: {e}")
