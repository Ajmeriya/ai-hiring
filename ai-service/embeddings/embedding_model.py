"""Embedding generation using LangChain HuggingFaceEmbeddings (SBERT backend)."""

import logging
from typing import List

import numpy as np
from langchain_huggingface import HuggingFaceEmbeddings

logger = logging.getLogger(__name__)


class EmbeddingModel:
    """Wrapper for SBERT embeddings via LangChain's HuggingFaceEmbeddings.

    Using LangChain's HuggingFaceEmbeddings instead of calling SentenceTransformer
    directly gives us a standardized embeddings interface that is swappable —
    e.g. you can later switch to OpenAI or Gemini embeddings by changing one line.

    The public interface (embed_text, embed_texts, cosine_similarity,
    batch_cosine_similarity, get_embedding_dimension) is identical to the
    previous implementation so no other file needs to change.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize LangChain HuggingFaceEmbeddings model.

        Args:
            model_name: HuggingFace model name (default: all-MiniLM-L6-v2).
                        This model produces 384-dimensional embeddings.
        """
        self.model_name = model_name
        try:
            self._lc_embeddings = HuggingFaceEmbeddings(
                model_name=model_name,
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": False},
            )
            logger.info("Loaded LangChain HuggingFaceEmbeddings model: %s", model_name)
        except Exception as e:
            logger.error("Failed to load embeddings model: %s", str(e))
            raise ValueError(f"Could not load embedding model: {str(e)}")

    def embed_text(self, text: str) -> np.ndarray:
        """
        Generate embedding for a single text using LangChain.

        Args:
            text: Text to embed.

        Returns:
            Embedding vector as numpy array (float32).
        """
        try:
            # LangChain returns a plain Python list of floats
            embedding = self._lc_embeddings.embed_query(text)
            return np.array(embedding, dtype=np.float32)
        except Exception as e:
            logger.error("Error generating embedding: %s", str(e))
            raise ValueError(f"Failed to generate embedding: {str(e)}")

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for multiple texts using LangChain.

        Args:
            texts: List of texts to embed.

        Returns:
            2D numpy array of embeddings (shape: [len(texts), embedding_dim]).
        """
        try:
            # LangChain returns a list of lists
            embeddings = self._lc_embeddings.embed_documents(texts)
            return np.array(embeddings, dtype=np.float32)
        except Exception as e:
            logger.error("Error generating embeddings: %s", str(e))
            raise ValueError(f"Failed to generate embeddings: {str(e)}")

    def get_embedding_dimension(self) -> int:
        """
        Get dimension of embeddings.

        Returns:
            Embedding dimension (384 for all-MiniLM-L6-v2).
        """
        return 384

    # ------------------------------------------------------------------ #
    #  Similarity helpers — unchanged from original implementation         #
    # ------------------------------------------------------------------ #

    @staticmethod
    def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two vectors.

        Args:
            vec1: First vector.
            vec2: Second vector.

        Returns:
            Cosine similarity score scaled to [0, 1].
        """
        try:
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)

            if norm1 == 0 or norm2 == 0:
                return 0.0

            similarity = dot_product / (norm1 * norm2)
            # Scale raw cosine [-1, 1] → [0, 1]
            return max(0.0, min(1.0, (similarity + 1) / 2))
        except Exception as e:
            logger.error("Error calculating similarity: %s", str(e))
            return 0.0

    @staticmethod
    def batch_cosine_similarity(vec: np.ndarray, matrix: np.ndarray) -> np.ndarray:
        """
        Calculate cosine similarity between a vector and matrix of vectors.

        Args:
            vec: Single vector.
            matrix: 2D array of vectors.

        Returns:
            Array of similarity scores in [0, 1].
        """
        try:
            vec_norm = vec / np.linalg.norm(vec)
            matrix_norm = matrix / np.linalg.norm(matrix, axis=1, keepdims=True)
            similarities = np.dot(matrix_norm, vec_norm)
            # Scale to [0, 1]
            similarities = (similarities + 1) / 2
            return np.clip(similarities, 0, 1)
        except Exception as e:
            logger.error("Error calculating batch similarities: %s", str(e))
            return np.array([])
