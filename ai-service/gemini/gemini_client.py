"""Google Gemini API integration for project and certification evaluation"""

import logging
from typing import Dict, Optional
import os

logger = logging.getLogger(__name__)


class GeminiClient:
    """Client for Google Gemini API integration"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Gemini client
        
        Args:
            api_key: Google Gemini API key (defaults to environment variable)
        """
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        
        if not self.api_key:
            logger.warning("Gemini API key not provided. Gemini features will be disabled.")
            self.client = None
            return
        
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            # gemini-pro is no longer available in the current API surface.
            # Use a supported model so evaluation requests do not fail with 404.
            self.client = genai.GenerativeModel('gemini-1.5-flash')
            logger.info("Gemini client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {str(e)}")
            self.client = None
    
    def evaluate_projects(self, projects: list, job_requirements: Dict) -> Dict:
        """
        Evaluate candidate projects against job requirements
        
        Args:
            projects: List of candidate projects
            job_requirements: Job requirements dictionary
            
        Returns:
            Evaluation result with score and insights
        """
        if not self.client or not projects:
            logger.warning("Gemini not available or no projects to evaluate")
            return {
                'evaluated': False,
                'score': 0,
                'strengths': [],
                'weaknesses': [],
                'insights': 'No projects provided or Gemini not available'
            }
        
        try:
            projects_text = '\n'.join([
                f"- {p.get('name', 'Unnamed')}: {p.get('description', '')}"
                for p in projects
            ])
            
            prompt = f"""
Evaluate the following candidate projects in the context of these job requirements:

Job Requirements:
- Role: {job_requirements.get('title', 'Unknown')}
- Key Skills: {', '.join(job_requirements.get('skills', []))}
- Description: {job_requirements.get('description', '')}

Candidate Projects:
{projects_text}

Please provide:
1. Overall relevance score (0-100)
2. Key strengths (bullet points)
3. Potential weaknesses or gaps (bullet points)
4. Brief insights

Format your response as:
SCORE: [number]
STRENGTHS:
- [strength 1]
- [strength 2]
WEAKNESSES:
- [weakness 1]
- [weakness 2]
INSIGHTS: [insights]
"""
            
            response = self.client.generate_content(prompt)
            result = self._parse_gemini_response(response.text)
            result['evaluated'] = True
            logger.info(f"Gemini project evaluation: {result.get('score', 0)}")
            return result
            
        except Exception as e:
            logger.error(f"Error evaluating projects: {str(e)}")
            return {
                'evaluated': False,
                'score': 0,
                'strengths': [],
                'weaknesses': [],
                'insights': f'Error: {str(e)}'
            }
    
    def evaluate_certifications(self, certifications: list, job_requirements: Dict) -> Dict:
        """
        Evaluate candidate certifications against job requirements
        
        Args:
            certifications: List of candidate certifications
            job_requirements: Job requirements dictionary
            
        Returns:
            Evaluation result with score and insights
        """
        if not self.client or not certifications:
            logger.warning("Gemini not available or no certifications to evaluate")
            return {
                'evaluated': False,
                'score': 0,
                'strengths': [],
                'weaknesses': [],
                'insights': 'No certifications provided or Gemini not available'
            }
        
        try:
            certs_text = '\n'.join([f"- {cert}" for cert in certifications])
            
            prompt = f"""
Evaluate the following candidate certifications for this job role:

Job Role: {job_requirements.get('title', 'Unknown')}
Required Skills: {', '.join(job_requirements.get('skills', []))}

Candidate Certifications:
{certs_text}

Please provide:
1. Relevance score (0-100)
2. Which certifications are most relevant
3. Any important certifications missing
4. Brief assessment

Format your response as:
SCORE: [number]
RELEVANT: [relevant certs]
MISSING: [missing certs]
ASSESSMENT: [assessment]
"""
            
            response = self.client.generate_content(prompt)
            result = self._parse_gemini_cert_response(response.text)
            result['evaluated'] = True
            logger.info(f"Gemini certification evaluation: {result.get('score', 0)}")
            return result
            
        except Exception as e:
            logger.error(f"Error evaluating certifications: {str(e)}")
            return {
                'evaluated': False,
                'score': 0,
                'relevant': [],
                'missing': [],
                'assessment': f'Error: {str(e)}'
            }
    
    @staticmethod
    def _parse_gemini_response(response_text: str) -> Dict:
        """Parse Gemini response for projects evaluation"""
        try:
            result = {
                'score': 0,
                'strengths': [],
                'weaknesses': [],
                'insights': ''
            }
            
            lines = response_text.strip().split('\n')
            current_section = None
            
            for line in lines:
                line = line.strip()
                
                if line.startswith('SCORE:'):
                    try:
                        result['score'] = int(''.join(filter(str.isdigit, line.split(':')[1])))
                    except:
                        pass
                
                elif line.startswith('STRENGTHS:'):
                    current_section = 'strengths'
                
                elif line.startswith('WEAKNESSES:'):
                    current_section = 'weaknesses'
                
                elif line.startswith('INSIGHTS:'):
                    current_section = 'insights'
                    result['insights'] = line.split(':', 1)[1].strip() if ':' in line else ''
                
                elif line.startswith('- ') and current_section in ['strengths', 'weaknesses']:
                    result[current_section].append(line[2:])
            
            return result
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {str(e)}")
            return {
                'score': 0,
                'strengths': [],
                'weaknesses': [],
                'insights': response_text
            }
    
    @staticmethod
    def _parse_gemini_cert_response(response_text: str) -> Dict:
        """Parse Gemini response for certifications evaluation"""
        try:
            result = {
                'score': 0,
                'relevant': [],
                'missing': [],
                'assessment': ''
            }
            
            lines = response_text.strip().split('\n')
            current_section = None
            
            for line in lines:
                line = line.strip()
                
                if line.startswith('SCORE:'):
                    try:
                        result['score'] = int(''.join(filter(str.isdigit, line.split(':')[1])))
                    except:
                        pass
                
                elif line.startswith('RELEVANT:'):
                    result['relevant'] = [c.strip() for c in line.split(':', 1)[1].split(',')]
                
                elif line.startswith('MISSING:'):
                    result['missing'] = [c.strip() for c in line.split(':', 1)[1].split(',')]
                
                elif line.startswith('ASSESSMENT:'):
                    result['assessment'] = line.split(':', 1)[1].strip()
            
            return result
        except Exception as e:
            logger.error(f"Error parsing Gemini cert response: {str(e)}")
            return {
                'score': 0,
                'relevant': [],
                'missing': [],
                'assessment': response_text
            }
    
    def is_available(self) -> bool:
        """Check if Gemini client is available"""
        return self.client is not None
