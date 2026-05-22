"""Vector store for semantic search."""

import logging
import os
import pickle
from typing import List, Tuple

import numpy as np

try:
    import faiss
except Exception:  # pragma: no cover - optional dependency fallback
    faiss = None

logger = logging.getLogger(__name__)


class FAISSVectorStore:
    """Vector store with FAISS when available and NumPy fallback otherwise."""
    
    def __init__(self, embedding_dim: int = 384):
        """
        Initialize FAISS index
        
        Args:
            embedding_dim: Dimension of embeddings (default: 384 for all-MiniLM-L6-v2)
        """
        self.embedding_dim = embedding_dim
        self.use_faiss = faiss is not None
        self.index = faiss.IndexFlatL2(embedding_dim) if self.use_faiss else None
        self.documents = []
        self.embeddings = np.array([]).reshape(0, embedding_dim)
        logger.info("Initialized vector store with dimension: %s (faiss=%s)", embedding_dim, self.use_faiss)
    
    def add_vectors(self, embeddings: np.ndarray, documents: List[str]):
        """
        Add vectors and associated documents to index
        
        Args:
            embeddings: 2D array of embeddings
            documents: List of document texts
        """
        try:
            if len(embeddings) != len(documents):
                raise ValueError("Embeddings and documents must have same length")
            
            # Normalize embeddings for L2 distance
            embeddings = embeddings.astype(np.float32)
            
            # Add to index
            if self.use_faiss:
                self.index.add(embeddings)
            self.embeddings = np.vstack([self.embeddings, embeddings]) if self.embeddings.size > 0 else embeddings
            self.documents.extend(documents)
            
            logger.info(f"Added {len(documents)} vectors to index. Total: {len(self.documents)}")
        except Exception as e:
            logger.error(f"Error adding vectors: {str(e)}")
            raise ValueError(f"Failed to add vectors: {str(e)}")
    
    def search(self, query_embedding: np.ndarray, k: int = 5) -> List[Tuple[str, float]]:
        """
        Search for similar documents
        
        Args:
            query_embedding: Query embedding vector
            k: Number of top results to return
            
        Returns:
            List of tuples (document, distance)
        """
        try:
            if len(self.documents) == 0:
                logger.warning("Vector store is empty")
                return []
            
            # Normalize query embedding
            query_embedding = query_embedding.astype(np.float32).reshape(1, -1)
            
            results = []
            top_k = min(k, len(self.documents))

            if self.use_faiss:
                distances, indices = self.index.search(query_embedding, top_k)
                for idx, distance in zip(indices[0], distances[0]):
                    if idx < len(self.documents):
                        similarity = 1 / (1 + distance)
                        results.append((self.documents[idx], similarity))
            else:
                distances = np.linalg.norm(self.embeddings - query_embedding, axis=1)
                ranked_indices = np.argsort(distances)[:top_k]
                for idx in ranked_indices:
                    distance = distances[idx]
                    similarity = 1 / (1 + distance)
                    results.append((self.documents[idx], similarity))
            
            logger.info(f"Search returned {len(results)} results")
            return results
        except Exception as e:
            logger.error(f"Error searching: {str(e)}")
            return []
    
    def reset(self):
        """Clear all vectors and documents"""
        self.index = faiss.IndexFlatL2(self.embedding_dim) if self.use_faiss else None
        self.documents = []
        self.embeddings = np.array([]).reshape(0, self.embedding_dim)
        logger.info("Vector store reset")
    
    def get_size(self) -> int:
        """Get number of vectors in store"""
        return len(self.documents)
    
    def save(self, index_path: str):
        """
        Save index to disk
        
        Args:
            index_path: Path to save index
        """
        try:
            os.makedirs(os.path.dirname(index_path) if os.path.dirname(index_path) else '.', exist_ok=True)
            if self.use_faiss and self.index is not None:
                faiss.write_index(self.index, index_path)
                logger.info("Saved FAISS index to %s", index_path)
            else:
                with open(index_path, "wb") as file:
                    pickle.dump({"embeddings": self.embeddings, "documents": self.documents}, file)
                logger.info("Saved NumPy vector store to %s", index_path)
        except Exception as e:
            logger.error(f"Error saving index: {str(e)}")
    
    def load(self, index_path: str):
        """
        Load index from disk
        
        Args:
            index_path: Path to saved index
        """
        try:
            if os.path.exists(index_path):
                if self.use_faiss:
                    self.index = faiss.read_index(index_path)
                    logger.info("Loaded FAISS index from %s", index_path)
                else:
                    with open(index_path, "rb") as file:
                        data = pickle.load(file)
                    self.embeddings = data.get("embeddings", self.embeddings)
                    self.documents = data.get("documents", self.documents)
                    logger.info("Loaded NumPy vector store from %s", index_path)
            else:
                logger.warning("Index file not found: %s", index_path)
        except Exception as e:
            logger.error(f"Error loading index: {str(e)}")
