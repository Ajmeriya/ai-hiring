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
            # Prefer the newer `google.genai` package if available.
            try:
                import google.genai as genai  # type: ignore
                genai.configure(api_key=self.api_key)
                src = "google.genai"
            except Exception:
                import google.generativeai as genai  # type: ignore
                genai.configure(api_key=self.api_key)
                src = "google.generativeai"

            # Attempt to create a model handle; fall back to module if API differs.
            try:
                self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
                self.client = genai.GenerativeModel(self.model_name)
            except Exception:
                # Some client variants expose different APIs; keep the module
                # reference so callers can still attempt to use it.
                self.client = genai

            logger.info(f"Gemini client initialized using {src}")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {str(e)}")
            self.client = None

        # Import permission-related exception class if available for clearer logs
        try:
            import google.api_core.exceptions as api_exceptions  # type: ignore
            self._api_exceptions = api_exceptions
        except Exception:
            self._api_exceptions = None
    
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
            
            # Try several common method names across client versions.
            if hasattr(self.client, "generate_content"):
                response = self.client.generate_content(prompt)
                text = getattr(response, "text", str(response))
            elif hasattr(self.client, "generate"):
                response = self.client.generate(prompt)
                text = getattr(response, "text", str(response))
            else:
                # Last resort: call module-level convenience if present
                if hasattr(self.client, "generate_text"):
                    text = self.client.generate_text(prompt)
                else:
                    raise RuntimeError("Gemini client does not expose a known generate method")

            result = self._parse_gemini_response(text)
            result['evaluated'] = True
            logger.info(f"Gemini project evaluation: {result.get('score', 0)}")
            return result
        except Exception as e:
            # Detect permission/invalid-key errors and log actionable message
            if self._api_exceptions and isinstance(e, getattr(self._api_exceptions, 'PermissionDenied', Exception)):
                logger.error("PermissionDenied from Gemini API: API key may be revoked or blocked. Rotate the API key.")
            elif "PermissionDenied" in str(e) or "leaked" in str(e).lower():
                logger.error("Gemini API rejected the request: API key may be revoked or reported leaked. Rotate the API key.")
            else:
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
            try:
                if hasattr(self.client, "generate_content"):
                    response = self.client.generate_content(prompt)
                    text = getattr(response, "text", str(response))
                elif hasattr(self.client, "generate"):
                    response = self.client.generate(prompt)
                    text = getattr(response, "text", str(response))
                else:
                    if hasattr(self.client, "generate_text"):
                        text = self.client.generate_text(prompt)
                    else:
                        raise RuntimeError("Gemini client does not expose a known generate method")

                result = self._parse_gemini_cert_response(text)
            except Exception as e:
                if self._api_exceptions and isinstance(e, getattr(self._api_exceptions, 'PermissionDenied', Exception)):
                    logger.error("PermissionDenied from Gemini API: API key may be revoked or blocked. Rotate the API key.")
                elif "PermissionDenied" in str(e) or "leaked" in str(e).lower():
                    logger.error("Gemini API rejected the request: API key may be revoked or reported leaked. Rotate the API key.")
                else:
                    logger.error(f"Error evaluating certifications: {str(e)}")
                return {
                    'evaluated': False,
                    'score': 0,
                    'relevant': [],
                    'missing': [],
                    'assessment': f'Error: {str(e)}'
                }
            result['evaluated'] = True
            logger.info(f"Gemini certification evaluation: {result.get('score', 0)}")
            return result
        except Exception as e:
            if self._api_exceptions and isinstance(e, getattr(self._api_exceptions, 'PermissionDenied', Exception)):
                logger.error("PermissionDenied from Gemini API: API key may be revoked or blocked. Rotate the API key.")
            elif "PermissionDenied" in str(e) or "leaked" in str(e).lower():
                logger.error("Gemini API rejected the request: API key may be revoked or reported leaked. Rotate the API key.")
            else:
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
