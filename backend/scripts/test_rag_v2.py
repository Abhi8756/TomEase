"""
Quick test script for RAG v2
Run various test queries to verify the system is working
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.rag_v2 import EnhancedRAGService
import json


def print_result(result: dict, index: int):
    """Pretty print a single result"""
    print(f"\n{'='*70}")
    print(f"Result {index}")
    print(f"{'='*70}")
    print(f"Score: {result['score']:.3f}")
    print(f"Citation: {result['citation']}")
    print(f"Diseases: {', '.join(result['diseases']) if result['diseases'] else 'None'}")
    if result.get('region'):
        print(f"Region: {result['region']}")
    if result.get('topic'):
        print(f"Topic: {result['topic']}")
    if result.get('page'):
        print(f"Page: {result['page']}")
    print(f"\nText preview:")
    print(f"{result['text'][:300]}...")
    
    if result.get('safety_flags'):
        flags = result['safety_flags']
        if flags.get('warnings'):
            print(f"\n⚠️  Safety warnings: {', '.join(flags['warnings'])}")


def test_basic_query(rag):
    """Test 1: Simple disease query"""
    print("\n" + "🧪 TEST 1: Basic Query")
    print("="*70)
    
    query = "What are the symptoms of Late Blight?"
    print(f"Query: {query}")
    
    results = rag.query(query, top_k=3)
    
    for i, result in enumerate(results, 1):
        print_result(result, i)
    
    return len(results) > 0


def test_context_aware_query(rag):
    """Test 2: Query with disease and region context"""
    print("\n" + "🧪 TEST 2: Context-Aware Query")
    print("="*70)
    
    query = "How can I prevent this disease?"
    context = {
        "disease": "Late_Blight",
        "region": "India",
        "topic": "prevention"
    }
    
    print(f"Query: {query}")
    print(f"Context: {json.dumps(context, indent=2)}")
    
    results = rag.query(query, top_k=3, context=context)
    
    for i, result in enumerate(results, 1):
        print_result(result, i)
    
    return len(results) > 0


def test_weather_aware_query(rag):
    """Test 3: Weather-aware retrieval"""
    print("\n" + "🧪 TEST 3: Weather-Aware Query")
    print("="*70)
    
    query = "Disease management during high humidity"
    context = {
        "weather": {
            "conditions": ["high humidity", "rainfall"]
        }
    }
    
    print(f"Query: {query}")
    print(f"Context: {json.dumps(context, indent=2)}")
    
    results = rag.query(query, top_k=3, context=context)
    
    for i, result in enumerate(results, 1):
        print_result(result, i)
    
    return len(results) > 0


def test_model_prediction_integration(rag):
    """Test 4: Integration with model prediction"""
    print("\n" + "🧪 TEST 4: Model Prediction Integration")
    print("="*70)
    
    query = "What should I do about this disease?"
    prediction = {
        "disease": "Early_Blight",
        "confidence": 0.89
    }
    weather = {
        "temperature": 28,
        "humidity": 75,
        "conditions": ["warm temperature", "high humidity"]
    }
    location = {
        "region": "India",
        "state": "Maharashtra"
    }
    
    print(f"Query: {query}")
    print(f"Prediction: {json.dumps(prediction, indent=2)}")
    print(f"Weather: {json.dumps(weather, indent=2)}")
    print(f"Location: {json.dumps(location, indent=2)}")
    
    results = rag.query_with_model_prediction(
        query=query,
        prediction=prediction,
        weather=weather,
        location=location,
        top_k=3
    )
    
    for i, result in enumerate(results, 1):
        print_result(result, i)
    
    return len(results) > 0


def test_low_confidence_differential(rag):
    """Test 5: Low confidence → differential diagnosis mode"""
    print("\n" + "🧪 TEST 5: Low Confidence (Differential Mode)")
    print("="*70)
    
    query = "How can I identify this disease?"
    prediction = {
        "disease": "Early_Blight",
        "confidence": 0.52  # Low confidence
    }
    
    print(f"Query: {query}")
    print(f"Prediction: {json.dumps(prediction, indent=2)}")
    print("⚠️  Low confidence detected - should trigger differential mode")
    
    results = rag.query_with_model_prediction(
        query=query,
        prediction=prediction,
        top_k=3
    )
    
    for i, result in enumerate(results, 1):
        print_result(result, i)
    
    return len(results) > 0


def test_differential_diagnosis(rag):
    """Test 6: Explicit differential diagnosis query"""
    print("\n" + "🧪 TEST 6: Differential Diagnosis")
    print("="*70)
    
    query = "What is the difference between Early Blight and Septoria?"
    context = {
        "topic": "differential_diagnosis"
    }
    
    print(f"Query: {query}")
    print(f"Context: {json.dumps(context, indent=2)}")
    
    results = rag.query(query, top_k=3, context=context)
    
    for i, result in enumerate(results, 1):
        print_result(result, i)
    
    return len(results) > 0


def main():
    print("="*70)
    print("RAG v2 Test Suite")
    print("="*70)
    
    # Initialize RAG
    print("\n📦 Initializing RAG service...")
    try:
        rag = EnhancedRAGService()
        rag.build_index()
        print("✅ RAG service initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize RAG: {e}")
        return
    
    # Run tests
    tests = [
        ("Basic Query", test_basic_query),
        ("Context-Aware Query", test_context_aware_query),
        ("Weather-Aware Query", test_weather_aware_query),
        ("Model Prediction Integration", test_model_prediction_integration),
        ("Low Confidence Differential", test_low_confidence_differential),
        ("Differential Diagnosis", test_differential_diagnosis)
    ]
    
    results = []
    for name, test_func in tests:
        try:
            success = test_func(rag)
            results.append((name, "✅ PASS" if success else "⚠️  NO RESULTS"))
        except Exception as e:
            results.append((name, f"❌ FAIL: {str(e)[:50]}"))
    
    # Summary
    print("\n" + "="*70)
    print("Test Summary")
    print("="*70)
    for name, status in results:
        print(f"{status} - {name}")
    
    passed = sum(1 for _, status in results if "PASS" in status)
    print(f"\nPassed: {passed}/{len(tests)}")


if __name__ == "__main__":
    main()
