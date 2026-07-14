"""Vector store for semantic search powered by LangChain FAISS."""

import logging
import os
import pickle
from typing import List, Tuple

import numpy as np

from langchain_community.vectorstores import FAISS
from langchain_community.docstore.in_memory import InMemoryDocstore

try:
    # LangChain >= 0.2 / 1.x
    from langchain_core.documents import Document
    from langchain_core.embeddings import Embeddings as _BaseEmbeddings
except ImportError:
    from langchain.schema import Document  # type: ignore
    from langchain.schema.embeddings import Embeddings as _BaseEmbeddings  # type: ignore

try:
    import faiss as _faiss_lib
    _FAISS_AVAILABLE = True
except Exception:
    _faiss_lib = None
    _FAISS_AVAILABLE = False

logger = logging.getLogger(__name__)


class _StubEmbeddings(_BaseEmbeddings):
    """Minimal Embeddings stub required by LangChain FAISS constructor.

    We manage all embedding generation externally (via EmbeddingModel) so
    this stub is never actually called for embed operations — it only satisfies
    LangChain's type requirement and silences the deprecation warning.
    """

    def embed_documents(self, texts: list) -> list:
        return []

    def embed_query(self, text: str) -> list:
        return []


class FAISSVectorStore:
    """Vector store backed by LangChain's FAISS integration.

    LangChain's FAISS wrapper manages the index, docstore, and
    index-to-docstore mapping internally.  We keep the same public interface
    as the original hand-rolled implementation so that `scorer.py` and any
    other callers require zero changes.

    Public API (unchanged):
        add_vectors(embeddings, documents)
        search(query_embedding, k) -> List[Tuple[str, float]]
        reset()
        get_size() -> int
        save(index_path)
        load(index_path)
    """

    def __init__(self, embedding_dim: int = 384):
        """
        Initialize LangChain FAISS vector store.

        Args:
            embedding_dim: Dimension of embedding vectors
                           (384 for all-MiniLM-L6-v2).
        """
        self.embedding_dim = embedding_dim
        self._store: FAISS | None = None   # lazily created on first add_vectors()
        # NumPy fallback storage used when FAISS is unavailable
        self._np_embeddings = np.array([]).reshape(0, embedding_dim)
        self._np_documents: List[str] = []
        logger.info(
            "Initialized LangChain FAISSVectorStore (dim=%d, faiss_available=%s)",
            embedding_dim,
            _FAISS_AVAILABLE,
        )

    # ------------------------------------------------------------------ #
    #  Internal helpers                                                    #
    # ------------------------------------------------------------------ #

    def _build_lc_store(
        self, embeddings: np.ndarray, documents: List[str]
    ) -> FAISS:
        """Build a fresh LangChain FAISS store from numpy arrays."""
        import faiss as faiss_lib  # already confirmed available

        index = faiss_lib.IndexFlatL2(self.embedding_dim)
        index.add(embeddings.astype(np.float32))

        # Build docstore and id map
        docstore_dict = {str(i): Document(page_content=doc) for i, doc in enumerate(documents)}
        index_to_docstore_id = {i: str(i) for i in range(len(documents))}

        store = FAISS(
            embedding_function=_StubEmbeddings(),
            index=index,
            docstore=InMemoryDocstore(docstore_dict),
            index_to_docstore_id=index_to_docstore_id,
        )
        return store

    # ------------------------------------------------------------------ #
    #  Public interface                                                    #
    # ------------------------------------------------------------------ #

    def add_vectors(self, embeddings: np.ndarray, documents: List[str]) -> None:
        """
        Add vectors and associated documents to the store.

        Args:
            embeddings: 2D float32 array of shape (n, embedding_dim).
            documents:  List of document strings (same length as embeddings).
        """
        if len(embeddings) != len(documents):
            raise ValueError("embeddings and documents must have the same length")

        embeddings = embeddings.astype(np.float32)

        if _FAISS_AVAILABLE:
            if self._store is None:
                self._store = self._build_lc_store(embeddings, documents)
            else:
                # LangChain FAISS exposes add_embeddings for incremental updates
                texts_and_embeddings = list(zip(documents, embeddings.tolist()))
                self._store.add_embeddings(texts_and_embeddings)
        else:
            # NumPy fallback
            self._np_embeddings = (
                np.vstack([self._np_embeddings, embeddings])
                if self._np_embeddings.size > 0
                else embeddings
            )
            self._np_documents.extend(documents)

        logger.info(
            "Added %d vector(s) to store. Total: %d",
            len(documents),
            self.get_size(),
        )

    def search(
        self, query_embedding: np.ndarray, k: int = 5
    ) -> List[Tuple[str, float]]:
        """
        Search for the top-k most similar documents.

        Args:
            query_embedding: 1-D float32 embedding vector.
            k:               Number of results to return.

        Returns:
            List of (document_text, similarity_score) tuples.
            similarity_score is in [0, 1] (higher = more similar).
        """
        if self.get_size() == 0:
            logger.warning("Vector store is empty — returning no results")
            return []

        query_embedding = query_embedding.astype(np.float32).reshape(1, -1)
        top_k = min(k, self.get_size())

        if _FAISS_AVAILABLE and self._store is not None:
            # Use LangChain's similarity_search_with_score (returns L2 distances)
            results_with_scores = self._store.similarity_search_with_score_by_vector(
                query_embedding[0], k=top_k
            )
            results = []
            for doc, distance in results_with_scores:
                # Convert L2 distance → similarity in (0, 1]
                similarity = float(1 / (1 + distance))
                results.append((doc.page_content, similarity))
            logger.info("LangChain FAISS search returned %d result(s)", len(results))
            return results

        # NumPy fallback
        distances = np.linalg.norm(
            self._np_embeddings - query_embedding, axis=1
        )
        ranked_indices = np.argsort(distances)[:top_k]
        results = [
            (self._np_documents[idx], float(1 / (1 + distances[idx])))
            for idx in ranked_indices
        ]
        logger.info("NumPy fallback search returned %d result(s)", len(results))
        return results

    def reset(self) -> None:
        """Clear all vectors and documents."""
        self._store = None
        self._np_embeddings = np.array([]).reshape(0, self.embedding_dim)
        self._np_documents = []
        logger.info("Vector store reset")

    def get_size(self) -> int:
        """Return the number of vectors currently stored."""
        if _FAISS_AVAILABLE and self._store is not None:
            return self._store.index.ntotal
        return len(self._np_documents)

    def save(self, index_path: str) -> None:
        """
        Persist the index to disk.

        For LangChain FAISS, saves to a folder (index_path is treated as
        directory prefix); for NumPy fallback, saves a pickle file.

        Args:
            index_path: Destination path/prefix.
        """
        try:
            os.makedirs(
                os.path.dirname(index_path) if os.path.dirname(index_path) else ".",
                exist_ok=True,
            )
            if _FAISS_AVAILABLE and self._store is not None:
                save_dir = os.path.dirname(index_path) or "."
                index_name = os.path.basename(index_path)
                self._store.save_local(save_dir, index_name)
                logger.info("Saved LangChain FAISS index to %s/%s", save_dir, index_name)
            else:
                with open(index_path, "wb") as f:
                    pickle.dump(
                        {"embeddings": self._np_embeddings, "documents": self._np_documents},
                        f,
                    )
                logger.info("Saved NumPy fallback store to %s", index_path)
        except Exception as e:
            logger.error("Error saving vector store: %s", str(e))

    def load(self, index_path: str) -> None:
        """
        Load a previously saved index from disk.

        Args:
            index_path: Path used when save() was called.
        """
        try:
            if _FAISS_AVAILABLE:
                save_dir = os.path.dirname(index_path) or "."
                index_name = os.path.basename(index_path)
                full_path = os.path.join(save_dir, f"{index_name}.faiss")
                if os.path.exists(full_path):
                    self._store = FAISS.load_local(
                        save_dir,
                        embeddings=None,   # we supply embeddings manually
                        index_name=index_name,
                        allow_dangerous_deserialization=True,
                    )
                    logger.info(
                        "Loaded LangChain FAISS index from %s/%s", save_dir, index_name
                    )
                else:
                    logger.warning("FAISS index file not found: %s", full_path)
            else:
                if os.path.exists(index_path):
                    with open(index_path, "rb") as f:
                        data = pickle.load(f)
                    self._np_embeddings = data.get("embeddings", self._np_embeddings)
                    self._np_documents = data.get("documents", self._np_documents)
                    logger.info("Loaded NumPy fallback store from %s", index_path)
                else:
                    logger.warning("Index file not found: %s", index_path)
        except Exception as e:
            logger.error("Error loading vector store: %s", str(e))
