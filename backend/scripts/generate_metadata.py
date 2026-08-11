"""
Utility script to generate sidecar metadata files for documents
Helps bootstrap the RAG v2 system with proper metadata
"""

import json
from pathlib import Path
from typing import Dict, Any
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.rag_v2 import DISEASE_ONTOLOGY, DocumentProcessor


def generate_metadata_for_document(pdf_path: Path) -> Dict[str, Any]:
    """Generate metadata for a document"""
    
    # Start with automatic inference
    auto_meta = DocumentProcessor.infer_metadata_from_path(pdf_path)
    
    print(f"\n{'='*60}")
    print(f"Document: {pdf_path.name}")
    print(f"{'='*60}")
    print(f"Inferred metadata:")
    print(json.dumps(auto_meta, indent=2))
    
    # Interactive enhancement
    print("\nEnhance metadata? (press Enter to skip each field)")
    
    metadata = {}
    
    # Diseases
    if auto_meta.get("diseases"):
        print(f"\nDetected diseases: {', '.join(auto_meta['diseases'])}")
        diseases_input = input("Confirm or add diseases (comma-separated, or Enter to keep): ").strip()
        if diseases_input:
            metadata["diseases"] = [d.strip() for d in diseases_input.split(",")]
        else:
            metadata["diseases"] = auto_meta["diseases"]
    else:
        print("\nAvailable diseases:")
        for i, disease in enumerate(DISEASE_ONTOLOGY.keys(), 1):
            print(f"  {i}. {disease}")
        diseases_input = input("Select diseases (comma-separated names or numbers): ").strip()
        if diseases_input:
            diseases = []
            for item in diseases_input.split(","):
                item = item.strip()
                if item.isdigit():
                    idx = int(item) - 1
                    disease_list = list(DISEASE_ONTOLOGY.keys())
                    if 0 <= idx < len(disease_list):
                        diseases.append(disease_list[idx])
                else:
                    diseases.append(item)
            metadata["diseases"] = diseases
    
    # Topic
    topics = ["prevention", "treatment", "diagnosis", "symptoms", "management", 
              "differential_diagnosis", "epidemiology", "cultural_practices"]
    print(f"\nInferred topic: {auto_meta.get('topic', 'None')}")
    print(f"Available topics: {', '.join(topics)}")
    topic_input = input("Enter topic (or Enter to keep): ").strip()
    if topic_input:
        metadata["topic"] = topic_input
    elif auto_meta.get("topic"):
        metadata["topic"] = auto_meta["topic"]
    
    # Region
    print(f"\nInferred region: {auto_meta.get('region', 'None')}")
    region_input = input("Enter region (India, US, Global, etc., or Enter to keep): ").strip()
    if region_input:
        metadata["region"] = region_input
    elif auto_meta.get("region"):
        metadata["region"] = auto_meta["region"]
    
    # Authority
    print(f"\nInferred authority: {auto_meta.get('authority', 'None')}")
    authority_input = input("Enter authority (ICAR, TNAU, Cornell, etc., or Enter to keep): ").strip()
    if authority_input:
        metadata["authority"] = authority_input
    elif auto_meta.get("authority"):
        metadata["authority"] = auto_meta["authority"]
    
    # Source type
    print(f"\nInferred source type: {auto_meta.get('source_type', 'None')}")
    print("Options: government, university, research, extension, commercial")
    source_type_input = input("Enter source type (or Enter to keep): ").strip()
    if source_type_input:
        metadata["source_type"] = source_type_input
    elif auto_meta.get("source_type"):
        metadata["source_type"] = auto_meta["source_type"]
    
    # Year
    year_input = input("\nEnter publication year (or Enter to skip): ").strip()
    if year_input and year_input.isdigit():
        metadata["year"] = int(year_input)
    
    # Document title
    title_input = input("Enter document title (or Enter to skip): ").strip()
    if title_input:
        metadata["document_title"] = title_input
    
    # URL
    url_input = input("Enter document URL (or Enter to skip): ").strip()
    if url_input:
        metadata["url"] = url_input
    
    # Crop (default tomato)
    metadata["crop"] = "tomato"
    
    return metadata


def save_metadata(pdf_path: Path, metadata: Dict[str, Any]):
    """Save metadata as sidecar JSON file"""
    meta_path = pdf_path.with_name(pdf_path.stem + ".meta.json")
    
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Saved metadata to: {meta_path}")


def batch_generate_metadata(directory: Path, auto_only: bool = False):
    """Generate metadata for all PDFs in a directory"""
    pdf_files = list(directory.rglob("*.pdf"))
    
    if not pdf_files:
        print(f"No PDF files found in {directory}")
        return
    
    print(f"\nFound {len(pdf_files)} PDF files")
    
    for i, pdf_path in enumerate(pdf_files, 1):
        # Skip if metadata already exists
        meta_path = pdf_path.with_name(pdf_path.stem + ".meta.json")
        if meta_path.exists():
            print(f"\n[{i}/{len(pdf_files)}] Skipping {pdf_path.name} (metadata exists)")
            continue
        
        print(f"\n[{i}/{len(pdf_files)}]")
        
        if auto_only:
            # Auto-generate only
            metadata = DocumentProcessor.infer_metadata_from_path(pdf_path)
            metadata["crop"] = "tomato"
            save_metadata(pdf_path, metadata)
        else:
            # Interactive
            metadata = generate_metadata_for_document(pdf_path)
            save_metadata(pdf_path, metadata)
            
            # Ask to continue
            if i < len(pdf_files):
                cont = input("\nContinue to next document? (y/n): ").strip().lower()
                if cont != 'y':
                    print(f"\nStopped. Processed {i} of {len(pdf_files)} documents")
                    break


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate metadata for RAG documents")
    parser.add_argument("path", type=str, help="Path to PDF file or directory")
    parser.add_argument("--auto", action="store_true", 
                       help="Auto-generate only (no interactive prompts)")
    parser.add_argument("--batch", action="store_true",
                       help="Process all PDFs in directory")
    
    args = parser.parse_args()
    
    path = Path(args.path)
    
    if not path.exists():
        print(f"Error: Path {path} does not exist")
        return
    
    if path.is_file():
        # Single file
        metadata = generate_metadata_for_document(path)
        save_metadata(path, metadata)
    elif path.is_dir() and args.batch:
        # Batch process directory
        batch_generate_metadata(path, auto_only=args.auto)
    else:
        print("Error: Use --batch flag for directory processing")


if __name__ == "__main__":
    main()
