"""Text splitter using LangChain's RecursiveCharacterTextSplitter."""

import logging
from typing import List

try:
    # LangChain >= 0.2 / 1.x — standalone package
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    # LangChain < 0.2 fallback
    from langchain.text_splitter import RecursiveCharacterTextSplitter  # type: ignore

logger = logging.getLogger(__name__)


class ResumeSplitter:
    """Splits long resume text into overlapping chunks for better semantic embedding.

    Using RecursiveCharacterTextSplitter because it tries to split on natural
    paragraph/sentence boundaries first before falling back to characters, which
    preserves context better for resume-style documents.
    """

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Initialize the splitter.

        Args:
            chunk_size: Maximum number of characters per chunk (default: 500).
            chunk_overlap: Number of characters to overlap between chunks (default: 50).
                           Overlap ensures context is not lost at chunk boundaries.
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        logger.info(
            "ResumeSplitter initialized (chunk_size=%d, chunk_overlap=%d)",
            chunk_size,
            chunk_overlap,
        )

    def split(self, text: str) -> List[str]:
        """
        Split text into overlapping chunks.

        Args:
            text: Full resume or job description text.

        Returns:
            List of text chunks. If the text is short enough to fit in one chunk,
            a single-element list is returned (no unnecessary splitting).
        """
        if not text or not text.strip():
            logger.warning("ResumeSplitter.split() received empty text")
            return []

        chunks = self._splitter.split_text(text)
        logger.info("Split text into %d chunk(s)", len(chunks))
        return chunks

    def split_and_join_best(self, text: str, max_chars: int = 2000) -> str:
        """
        Split text and return the first N characters worth of chunks joined together.

        This is a convenience helper used when a single string is needed for embedding
        but the original text may be very long.

        Args:
            text: Full text to process.
            max_chars: Approximate character limit for the returned string.

        Returns:
            Joined chunk text, truncated to max_chars.
        """
        chunks = self.split(text)
        joined = " ".join(chunks)
        if len(joined) > max_chars:
            joined = joined[:max_chars]
        return joined
