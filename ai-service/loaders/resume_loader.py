"""Resume loading and text extraction from PDF files"""

import io
from typing import Optional
import pdfplumber
import logging

logger = logging.getLogger(__name__)


class ResumeLoader:
    """Load and extract text from resume PDFs"""
    
    @staticmethod
    def load_pdf(file_content: bytes) -> str:
        """
        Extract text from PDF resume
        
        Args:
            file_content: PDF file bytes
            
        Returns:
            Extracted text from resume
        """
        try:
            text = ""
            pdf_file = io.BytesIO(file_content)
            
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            
            logger.info(f"Successfully extracted {len(text)} characters from resume")
            return text.strip()
            
        except Exception as e:
            logger.error(f"Error loading PDF: {str(e)}")
            raise ValueError(f"Failed to load resume PDF: {str(e)}")
    
    @staticmethod
    def load_text(file_content: bytes) -> str:
        """
        Load text from plain text resume
        
        Args:
            file_content: Text file bytes
            
        Returns:
            Resume text
        """
        try:
            text = file_content.decode('utf-8')
            logger.info(f"Successfully loaded text resume: {len(text)} characters")
            return text.strip()
        except Exception as e:
            logger.error(f"Error loading text file: {str(e)}")
            raise ValueError(f"Failed to load text resume: {str(e)}")
    
    @staticmethod
    def validate_resume(text: str, min_length: int = 100) -> bool:
        """
        Validate that resume has sufficient content
        
        Args:
            text: Resume text
            min_length: Minimum acceptable length
            
        Returns:
            True if valid, False otherwise
        """
        if not text or len(text) < min_length:
            logger.warning(f"Resume text too short: {len(text)} characters")
            return False
        return True
