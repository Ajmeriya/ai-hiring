"""Resume loading and text extraction using LangChain document loaders."""

import logging
import os
import tempfile
from typing import Optional

from langchain_community.document_loaders import PyPDFLoader, TextLoader

logger = logging.getLogger(__name__)


class ResumeLoader:
    """Load and extract text from resume files using LangChain document loaders.

    LangChain's PyPDFLoader handles edge-cases (multi-column, scanned pages,
    metadata-heavy PDFs) more robustly than a bare pdfplumber integration.
    TextLoader is used for plain-text resumes.

    The public interface (load_pdf, load_text, validate_resume) is identical to
    the previous implementation so no other file needs to change its call sites.
    """

    @staticmethod
    def load_pdf(file_content: bytes) -> str:
        """
        Extract text from a PDF resume using LangChain's PyPDFLoader.

        LangChain loaders work with file paths, so the bytes are written to a
        temporary file, loaded, then the temp file is cleaned up automatically.

        Args:
            file_content: Raw bytes of the PDF file.

        Returns:
            Extracted plain text from all pages joined by newlines.
        """
        tmp_path: Optional[str] = None
        try:
            # Write bytes to a named temp file so PyPDFLoader can open it
            with tempfile.NamedTemporaryFile(
                suffix=".pdf", delete=False
            ) as tmp_file:
                tmp_file.write(file_content)
                tmp_path = tmp_file.name

            loader = PyPDFLoader(tmp_path)
            pages = loader.load()  # Returns list[Document]

            # Concatenate all page content
            text = "\n".join(
                page.page_content for page in pages if page.page_content
            ).strip()

            logger.info(
                "PyPDFLoader extracted %d characters from %d page(s)",
                len(text),
                len(pages),
            )
            return text

        except Exception as e:
            logger.error("Error loading PDF with LangChain PyPDFLoader: %s", str(e))
            raise ValueError(f"Failed to load resume PDF: {str(e)}")

        finally:
            # Always clean up the temp file
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass

    @staticmethod
    def load_text(file_content: bytes) -> str:
        """
        Load text from a plain-text resume using LangChain's TextLoader.

        Args:
            file_content: Raw bytes of the text file.

        Returns:
            Resume text string.
        """
        tmp_path: Optional[str] = None
        try:
            with tempfile.NamedTemporaryFile(
                suffix=".txt", delete=False, mode="wb"
            ) as tmp_file:
                tmp_file.write(file_content)
                tmp_path = tmp_file.name

            loader = TextLoader(tmp_path, encoding="utf-8")
            docs = loader.load()

            text = "\n".join(doc.page_content for doc in docs if doc.page_content).strip()

            logger.info(
                "TextLoader extracted %d characters from resume", len(text)
            )
            return text

        except Exception as e:
            logger.error("Error loading text file with LangChain TextLoader: %s", str(e))
            raise ValueError(f"Failed to load text resume: {str(e)}")

        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass

    @staticmethod
    def validate_resume(text: str, min_length: int = 20) -> bool:
        """
        Validate that resume has sufficient content.

        Args:
            text: Resume text
            min_length: Minimum acceptable length

        Returns:
            True if valid, False otherwise
        """
        if not text or len(text) < min_length:
            logger.warning("Resume text too short: %d characters", len(text))
            return False
        return True
