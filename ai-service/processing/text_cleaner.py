"""Text cleaning and preprocessing utilities"""

import re
import logging
from typing import List

logger = logging.getLogger(__name__)


class TextCleaner:
    """Clean and normalize resume and job description text"""
    
    @staticmethod
    def clean_text(text: str) -> str:
        """
        Clean text by removing noise and normalizing
        
        Args:
            text: Raw text to clean
            
        Returns:
            Cleaned text
        """
        # Remove URLs
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
        
        # Remove email addresses
        text = re.sub(r'\S+@\S+', '', text)
        
        # Remove special characters and normalize whitespace
        text = re.sub(r'[^\w\s\-\.]', ' ', text)
        
        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)
        
        # Convert to lowercase
        text = text.lower().strip()
        
        return text
    
    @staticmethod
    def normalize_text(text: str) -> str:
        """
        Normalize text for processing
        
        Args:
            text: Text to normalize
            
        Returns:
            Normalized text
        """
        # Remove leading/trailing whitespace
        text = text.strip()
        
        # Replace multiple spaces with single space
        text = re.sub(r'\s+', ' ', text)
        
        # Convert to lowercase
        text = text.lower()
        
        return text
    
    @staticmethod
    def extract_sections(text: str) -> dict:
        """
        Extract major sections from resume
        
        Args:
            text: Cleaned resume text
            
        Returns:
            Dictionary with extracted sections
        """
        sections = {
            'skills': '',
            'experience': '',
            'projects': '',
            'education': '',
            'certifications': '',
            'full_text': text
        }
        
        # Common section patterns
        section_patterns = {
            'skills': r'(skills?|technical skills?|core competencies?)\s*:?\s*(.*?)(?=\n\n|experience|projects|education|certification|$)',
            'experience': r'(experience|work experience|employment)\s*:?\s*(.*?)(?=\n\n|skills?|projects|education|certification|$)',
            'projects': r'(projects?|portfolio)\s*:?\s*(.*?)(?=\n\n|skills?|experience|education|certification|$)',
            'education': r'(education|academic|degree)\s*:?\s*(.*?)(?=\n\n|skills?|experience|projects|certification|$)',
            'certifications': r'(certifications?|licenses?|credentials?)\s*:?\s*(.*?)(?=\n\n|skills?|experience|projects|education|$)',
        }
        
        for section, pattern in section_patterns.items():
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                sections[section] = match.group(2).strip() if len(match.groups()) > 1 else match.group(1).strip()
        
        logger.info(f"Extracted sections: {[k for k, v in sections.items() if v and k != 'full_text']}")
        return sections
    
    @staticmethod
    def remove_stopwords(text: str, stopwords: List[str] = None) -> str:
        """
        Remove common stopwords
        
        Args:
            text: Text to clean
            stopwords: List of stopwords to remove
            
        Returns:
            Text with stopwords removed
        """
        if stopwords is None:
            stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'at', 'to', 'for', 'of', 'is'}
        
        words = text.split()
        filtered = [w for w in words if w.lower() not in stopwords]
        return ' '.join(filtered)
