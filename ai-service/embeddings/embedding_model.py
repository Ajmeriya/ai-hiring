"""Embedding generation using HuggingFace SBERT"""

import logging
from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class EmbeddingModel:
    """Wrapper for SBERT embeddings."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize embedding model
        
        Args:
            model_name: HuggingFace model name (default: all-MiniLM-L6-v2)
        """
        self.model_name = model_name
        try:
            self.model = SentenceTransformer(model_name, device="cpu")
            logger.info("Loaded embeddings model: %s", model_name)
        except Exception as e:
            logger.error("Failed to load embeddings model: %s", str(e))
            raise ValueError(f"Could not load embedding model: {str(e)}")
    
    def embed_text(self, text: str) -> np.ndarray:
        """
        Generate embedding for a single text
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector as numpy array
        """
        try:
            embedding = self.model.encode(text, normalize_embeddings=False)
            return np.array(embedding, dtype=np.float32)
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise ValueError(f"Failed to generate embedding: {str(e)}")
    
    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for multiple texts
        
        Args:
            texts: List of texts to embed
            
        Returns:
            2D numpy array of embeddings
        """
        try:
            embeddings = self.model.encode(texts, normalize_embeddings=False)
            return np.array(embeddings, dtype=np.float32)
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            raise ValueError(f"Failed to generate embeddings: {str(e)}")
    
    def get_embedding_dimension(self) -> int:
        """
        Get dimension of embeddings
        
        Returns:
            Embedding dimension
        """
        # all-MiniLM-L6-v2 produces 384-dimensional embeddings
        return 384
    
    @staticmethod
    def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two vectors
        
        Args:
            vec1: First vector
            vec2: Second vector
            
        Returns:
            Cosine similarity score (0-1)
        """
        try:
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            # Ensure value is in [0, 1]
            return max(0.0, min(1.0, (similarity + 1) / 2))
        except Exception as e:
            logger.error(f"Error calculating similarity: {str(e)}")
            return 0.0
    
    @staticmethod
    def batch_cosine_similarity(vec: np.ndarray, matrix: np.ndarray) -> np.ndarray:
        """
        Calculate cosine similarity between a vector and matrix of vectors
        
        Args:
            vec: Single vector
            matrix: 2D array of vectors
            
        Returns:
            Array of similarity scores
        """
        try:
            # Normalize vectors
            vec_norm = vec / np.linalg.norm(vec)
            matrix_norm = matrix / np.linalg.norm(matrix, axis=1, keepdims=True)
            
            # Calculate similarities
            similarities = np.dot(matrix_norm, vec_norm)
            
            # Scale to [0, 1]
            similarities = (similarities + 1) / 2
            return np.clip(similarities, 0, 1)
        except Exception as e:
            logger.error(f"Error calculating batch similarities: {str(e)}")
            return np.array([])
