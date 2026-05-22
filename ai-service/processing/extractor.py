"""Extract structured information from resume"""

import re
import logging
from typing import List, Dict, Tuple

logger = logging.getLogger(__name__)

# Common technical skills database
SKILLS_DATABASE = {
    'programming_languages': {
        'python', 'java', 'javascript', 'typescript', 'csharp', 'cpp', 'c', 'ruby', 'go', 'rust', 
        'scala', 'kotlin', 'php', 'swift', 'objective-c', 'r', 'matlab', 'perl'
    },
    'web_frameworks': {
        'django', 'flask', 'fastapi', 'spring', 'spring boot', 'react', 'angular', 'vue', 'next.js',
        'express', 'node.js', 'asp.net', 'laravel', 'rails', 'ember'
    },
    'databases': {
        'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'dynamodb',
        'firebase', 'sqlite', 'oracle', 'sqlserver'
    },
    'cloud_tools': {
        'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'jenkins', 'github actions',
        'gitlab ci', 'terraform', 'ansible'
    },
    'data_tools': {
        'spark', 'hadoop', 'kafka', 'airflow', 'dbt', 'pandas', 'numpy', 'scikit-learn', 'tensorflow',
        'pytorch', 'keras', 'sql', 'tableau', 'power bi'
    },
    'tools': {
        'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'slack', 'docker', 'linux',
        'unix', 'windows', 'macos'
    }
}


class InformationExtractor:
    """Extract skills, experience, projects, and certifications from resume"""
    
    @staticmethod
    def extract_skills(text: str) -> List[str]:
        """
        Extract technical skills from resume text
        
        Args:
            text: Resume text
            
        Returns:
            List of identified skills
        """
        found_skills = []
        text_lower = text.lower()
        
        # Flatten all skills database
        all_skills = set()
        for skill_set in SKILLS_DATABASE.values():
            all_skills.update(skill_set)
        
        # Find skills in text
        for skill in all_skills:
            if skill in text_lower:
                found_skills.append(skill)
        
        logger.info(f"Found {len(found_skills)} skills")
        return list(set(found_skills))  # Remove duplicates
    
    @staticmethod
    def extract_years_of_experience(text: str) -> Tuple[int, str]:
        """
        Extract years of experience from resume
        
        Args:
            text: Resume text
            
        Returns:
            Tuple of (years as int, description)
        """
        # Patterns for experience mentions
        patterns = [
            r'(\d+)\+?\s*years?.*experience',
            r'(\d+)\+?\s*years?.*background',
            r'professional experience.*?(\d+)\+?\s*years?',
            r'(?:career|work)\s*(?:spanning|over)\s*(\d+)\+?\s*years?',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                years = int(match.group(1))
                logger.info(f"Extracted {years} years of experience")
                return years, match.group(0)
        
        logger.warning("Could not extract years of experience")
        return 0, ""
    
    @staticmethod
    def extract_projects(text: str) -> List[Dict]:
        """
        Extract project information from resume
        
        Args:
            text: Resume text
            
        Returns:
            List of projects with descriptions
        """
        projects = []
        
        # Look for project section
        project_section_pattern = r'projects?\s*:?\s*(.*?)(?=\n\n|\n(?:skills|experience|education|certification)|\Z)'
        project_match = re.search(project_section_pattern, text, re.IGNORECASE | re.DOTALL)
        
        if project_match:
            project_text = project_match.group(1)
            
            # Extract individual projects (typically bullet points or numbered items)
            project_items = re.split(r'\n\s*(?:[•\-\*]|\d+\.)\s*', project_text)
            
            for item in project_items:
                if item.strip() and len(item.strip()) > 20:  # Filter out short entries
                    # Try to extract project name and description
                    parts = item.split(':', 1)
                    if len(parts) == 2:
                        projects.append({
                            'name': parts[0].strip(),
                            'description': parts[1].strip()
                        })
                    else:
                        projects.append({
                            'name': '',
                            'description': item.strip()
                        })
        
        logger.info(f"Found {len(projects)} projects")
        return projects
    
    @staticmethod
    def extract_certifications(text: str) -> List[str]:
        """
        Extract certifications and credentials
        
        Args:
            text: Resume text
            
        Returns:
            List of certifications
        """
        certifications = []
        
        # Common certification patterns
        cert_patterns = [
            r'(aws\s+(?:certified|solutions?|architect|developer|sysops|data|devops).*?)(?:\n|,)',
            r'(google\s+cloud\s+certified.*?)(?:\n|,)',
            r'(azure\s+certified.*?)(?:\n|,)',
            r'(pmp|cismp|scrum\s+master|product\s+owner|certified.*?manager)(?:\n|,|\s)',
            r'(certified\s+(?:[a-z\s]+))(?:\n|,)',
            r'(bachelor|master|phd).*?(?:in|of)\s+([a-z\s]+)(?:\n|,)',
        ]
        
        for pattern in cert_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    cert = ' '.join(filter(None, match)).strip()
                else:
                    cert = match.strip()
                if cert and len(cert) > 3:
                    certifications.append(cert)
        
        logger.info(f"Found {len(certifications)} certifications")
        return list(set(certifications))  # Remove duplicates
    
    @staticmethod
    def extract_education(text: str) -> List[Dict]:
        """
        Extract education details
        
        Args:
            text: Resume text
            
        Returns:
            List of education entries
        """
        education = []
        
        # Pattern for education entries
        edu_patterns = [
            r'(bachelor|master|phd|b\.s\.|m\.s\.|b\.a\.|m\.a\.)\s+(?:in|of)\s+([a-z\s&]+)',
            r'([a-z\s&]+)\s+(?:degree|diploma)(?:\s+in\s+([a-z\s&]+))?',
        ]
        
        for pattern in edu_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    degree = match[0].strip()
                    field = match[1].strip() if len(match) > 1 else ''
                else:
                    degree = match.strip()
                    field = ''
                
                if degree and len(degree) > 2:
                    education.append({
                        'degree': degree,
                        'field': field
                    })
        
        logger.info(f"Found {len(education)} education entries")
        return education


def extract_all_information(text: str) -> Dict:
    """
    Extract all structured information from resume
    
    Args:
        text: Resume text
        
    Returns:
        Dictionary with all extracted information
    """
    extractor = InformationExtractor()
    
    return {
        'skills': extractor.extract_skills(text),
        'years_of_experience': extractor.extract_years_of_experience(text)[0],
        'projects': extractor.extract_projects(text),
        'certifications': extractor.extract_certifications(text),
        'education': extractor.extract_education(text)
    }
