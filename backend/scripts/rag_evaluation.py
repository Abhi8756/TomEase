"""
RAG Evaluation Framework for TomEase
Implements Recall@k, Precision@k, MRR, nDCG for retrieval evaluation
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Tuple
import sys
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.rag_v2 import EnhancedRAGService


class RAGEvaluator:
    """Evaluate RAG retrieval performance"""
    
    def __init__(self, rag_service: EnhancedRAGService):
        self.rag = rag_service
    
    def evaluate_query(self, query: str, relevant_docs: List[str], 
                      context: Dict[str, Any] = None, k_values: List[int] = [3, 5, 10]) -> Dict[str, Any]:
        """
        Evaluate a single query
        
        Args:
            query: Query text
            relevant_docs: List of relevant document identifiers (source file names)
            context: Optional context for query
            k_values: k values for Recall@k and Precision@k
        
        Returns:
            Dictionary with evaluation metrics
        """
        # Retrieve results
        max_k = max(k_values)
        results = self.rag.query(query, top_k=max_k, context=context, retrieval_k=30)
        
        # Extract retrieved document identifiers
        retrieved_docs = [r["source"] for r in results]
        
        # Calculate metrics
        metrics = {}
        
        # Recall@k and Precision@k
        for k in k_values:
            retrieved_k = retrieved_docs[:k]
            relevant_retrieved = len(set(retrieved_k) & set(relevant_docs))
            
            recall = relevant_retrieved / len(relevant_docs) if relevant_docs else 0
            precision = relevant_retrieved / k if k > 0 else 0
            
            metrics[f"recall@{k}"] = recall
            metrics[f"precision@{k}"] = precision
        
        # Mean Reciprocal Rank (MRR)
        mrr = 0.0
        for i, doc in enumerate(retrieved_docs, 1):
            if doc in relevant_docs:
                mrr = 1.0 / i
                break
        metrics["mrr"] = mrr
        
        # nDCG@k
        for k in k_values:
            ndcg = self._calculate_ndcg(retrieved_docs[:k], relevant_docs)
            metrics[f"ndcg@{k}"] = ndcg
        
        return metrics
    
    def _calculate_ndcg(self, retrieved: List[str], relevant: List[str]) -> float:
        """Calculate Normalized Discounted Cumulative Gain"""
        if not relevant:
            return 0.0
        
        # DCG
        dcg = 0.0
        for i, doc in enumerate(retrieved, 1):
            if doc in relevant:
                dcg += 1.0 / (i.bit_length())  # log2(i+1)
        
        # IDCG (ideal DCG)
        idcg = 0.0
        for i in range(1, min(len(relevant), len(retrieved)) + 1):
            idcg += 1.0 / (i.bit_length())
        
        return dcg / idcg if idcg > 0 else 0.0
    
    def evaluate_dataset(self, test_queries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Evaluate full test dataset
        
        Args:
            test_queries: List of test queries with format:
                {
                    "query": "...",
                    "relevant_docs": [...],
                    "context": {...}  # optional
                }
        
        Returns:
            Aggregated metrics across all queries
        """
        all_metrics = defaultdict(list)
        
        print(f"Evaluating {len(test_queries)} queries...")
        
        for i, test_case in enumerate(test_queries, 1):
            query = test_case["query"]
            relevant_docs = test_case["relevant_docs"]
            context = test_case.get("context")
            
            print(f"\n[{i}/{len(test_queries)}] {query[:60]}...")
            
            metrics = self.evaluate_query(query, relevant_docs, context)
            
            for key, value in metrics.items():
                all_metrics[key].append(value)
            
            # Print query metrics
            print(f"  Recall@5: {metrics['recall@5']:.3f}, MRR: {metrics['mrr']:.3f}")
        
        # Calculate averages
        avg_metrics = {}
        for key, values in all_metrics.items():
            avg_metrics[key] = sum(values) / len(values)
        
        return avg_metrics
    
    def print_results(self, metrics: Dict[str, float]):
        """Pretty print evaluation results"""
        print("\n" + "="*60)
        print("RAG EVALUATION RESULTS")
        print("="*60)
        
        print("\nRecall:")
        for k in [3, 5, 10]:
            if f"recall@{k}" in metrics:
                print(f"  Recall@{k}: {metrics[f'recall@{k}']:.3f}")
        
        print("\nPrecision:")
        for k in [3, 5, 10]:
            if f"precision@{k}" in metrics:
                print(f"  Precision@{k}: {metrics[f'precision@{k}']:.3f}")
        
        print("\nRanking Metrics:")
        if "mrr" in metrics:
            print(f"  MRR: {metrics['mrr']:.3f}")
        
        for k in [3, 5, 10]:
            if f"ndcg@{k}" in metrics:
                print(f"  nDCG@{k}: {metrics[f'ndcg@{k}']:.3f}")
        
        print("="*60)


def create_sample_test_set() -> List[Dict[str, Any]]:
    """Create a sample test set for evaluation"""
    
    return [
        {
            "query": "What are the symptoms of Early Blight?",
            "relevant_docs": [
                "backend/storage/docs/tomato_rag/diseases/early_blight/early blight ncstate.pdf",
                "backend/storage/docs/tomato_rag/diseases/early_blight/tnau eb.pdf"
            ],
            "context": {
                "disease": "Early_Blight",
                "topic": "symptoms"
            }
        },
        {
            "query": "How can I prevent Late Blight in rainy weather?",
            "relevant_docs": [
                "backend/storage/docs/tomato_rag/diseases/late_blight/late blight ncstate.pdf",
                "backend/storage/docs/tomato_rag/diseases/late_blight/tnau lb.pdf"
            ],
            "context": {
                "disease": "Late_Blight",
                "topic": "prevention",
                "weather": {"conditions": ["rainfall", "high humidity"]}
            }
        },
        {
            "query": "What is the difference between Early Blight and Septoria?",
            "relevant_docs": [
                "backend/storage/docs/tomato_rag/differential_diagnosis/early_blight_vs_septoria/early-blight-and-septoria-cornell.pdf"
            ],
            "context": {
                "topic": "differential_diagnosis"
            }
        },
        {
            "query": "Management practices for TYLCV",
            "relevant_docs": [
                "backend/storage/docs/tomato_rag/diseases/tylcv/ifas tylcv.pdf",
                "backend/storage/docs/tomato_rag/diseases/tylcv/tnau tylcv.pdf"
            ],
            "context": {
                "disease": "TYLCV",
                "topic": "management"
            }
        },
        {
            "query": "How does humidity affect tomato diseases?",
            "relevant_docs": [
                "backend/storage/docs/tomato_rag/diseases/leaf_mold/umn mold.pdf",
                "backend/storage/docs/tomato_rag/diseases/late_blight/late blight ncstate.pdf"
            ],
            "context": {
                "topic": "epidemiology",
                "weather": {"conditions": ["high humidity"]}
            }
        },
        {
            "query": "Tomato disease prevention in India",
            "relevant_docs": [
                "backend/storage/docs/tomato_rag/diseases/early_blight/tnau eb.pdf",
                "backend/storage/docs/tomato_rag/diseases/late_blight/tnau lb.pdf"
            ],
            "context": {
                "region": "India",
                "topic": "prevention"
            }
        },
        {
            "query": "Septoria leaf spot symptoms",
            "relevant_docs": [
                "backend/storage/docs/tomato_rag/diseases/septoria/septoria cornell.pdf",
                "backend/storage/docs/tomato_rag/diseases/septoria/septoria ncstate.pdf"
            ],
            "context": {
                "disease": "Septoria",
                "topic": "symptoms"
            }
        },
        {
            "query": "Leaf Mold management in greenhouse",
            "relevant_docs": [
                "backend/storage/docs/tomato_rag/diseases/leaf_mold/umass mold.pdf",
                "backend/storage/docs/tomato_rag/diseases/leaf_mold/umn mold.pdf"
            ],
            "context": {
                "disease": "Leaf_Mold",
                "topic": "management",
                "environment": ["greenhouse"]
            }
        }
    ]


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Evaluate RAG system")
    parser.add_argument("--test-file", type=str, help="Path to test queries JSON file")
    parser.add_argument("--output", type=str, help="Path to save results JSON")
    
    args = parser.parse_args()
    
    # Initialize RAG
    print("Initializing RAG service...")
    rag = EnhancedRAGService()
    rag.build_index()
    
    evaluator = RAGEvaluator(rag)
    
    # Load test queries
    if args.test_file:
        with open(args.test_file, 'r', encoding='utf-8') as f:
            test_queries = json.load(f)
    else:
        print("Using sample test set...")
        test_queries = create_sample_test_set()
    
    # Run evaluation
    results = evaluator.evaluate_dataset(test_queries)
    
    # Print results
    evaluator.print_results(results)
    
    # Save results
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to {args.output}")


if __name__ == "__main__":
    main()
