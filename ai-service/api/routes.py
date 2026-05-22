"""FastAPI routes for resume evaluation"""

import logging
import io
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional

from loaders.resume_loader import ResumeLoader
from processing.text_cleaner import TextCleaner
from processing.extractor import extract_all_information
from embeddings.embedding_model import EmbeddingModel
from scoring.scorer import ResumeScorer
from gemini.gemini_client import GeminiClient

logger = logging.getLogger("uvicorn.error")
router = APIRouter()

# Initialize models
embedding_model = EmbeddingModel("all-MiniLM-L6-v2")
scorer = ResumeScorer(embedding_model)
gemini_client = GeminiClient()


class EvaluationRequest(BaseModel):
    """Request model for resume evaluation"""
    job_description: str
    required_skills: List[str] = []
    required_years: int = 0


class EvaluationResponse(BaseModel):
    """Response model for resume evaluation"""
    final_score: float
    matched_skills: List[str]
    missing_skills: List[str]
    experience_match: str
    project_insight: str
    decision: str
    score_breakdown: Dict
    gemini_used: bool


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    embedding_model: str
    gemini_available: bool


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "embedding_model": "all-MiniLM-L6-v2",
        "gemini_available": gemini_client.is_available()
    }


@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_resume(
    resume_file: UploadFile = File(...),
    job_description: str = Form(...),
    required_skills: str = Form(default=""),
    required_years: int = Form(default=0)
):
    """
    Evaluate resume against job description
    
    Args:
        resume_file: Resume PDF or text file
        job_description: Job description text
        required_skills: Comma-separated list of required skills
        required_years: Required years of experience
        
    Returns:
        Evaluation result with scores and insights
    """
    try:
        logger.info("[AI] /evaluate invoked")
        logger.info(
            "Resume evaluation request received: file=%s, job_description_chars=%s, required_skills=%s, required_years=%s",
            resume_file.filename,
            len(job_description.strip()) if job_description else 0,
            required_skills,
            required_years,
        )

        # Validate inputs - be lenient with job description, just need some content
        if not job_description or len(job_description.strip()) < 20:
            raise HTTPException(status_code=400, detail="Job description is required (at least 20 characters)")
        
        # Load resume
        logger.info(f"Loading resume: {resume_file.filename}")
        file_content = await resume_file.read()
        
        if resume_file.filename.endswith('.pdf'):
            resume_text = ResumeLoader.load_pdf(file_content)
        else:
            resume_text = ResumeLoader.load_text(file_content)
        
        # Validate resume
        if not ResumeLoader.validate_resume(resume_text):
            raise HTTPException(status_code=400, detail="Resume is too short or empty")
        
        # Clean texts
        resume_cleaned = TextCleaner.clean_text(resume_text)
        job_cleaned = TextCleaner.clean_text(job_description)
        
        # Extract information
        logger.info("Extracting information from resume")
        resume_info = extract_all_information(resume_text)
        resume_skills = resume_info['skills']
        candidate_years = resume_info['years_of_experience']
        projects = resume_info['projects']
        certifications = resume_info['certifications']
        
        # Parse required skills
        job_skills = [s.strip() for s in required_skills.split(',') if s.strip()]
        if not job_skills:
            # Try to extract from job description
            job_sections = TextCleaner.extract_sections(job_cleaned)
            job_skills_text = job_sections.get('skills', '')
            job_skills = job_skills_text.split() if job_skills_text else []
        
        # Calculate base score
        logger.info("Calculating base score")
        base_score = scorer.calculate_base_score(
            resume_cleaned,
            job_cleaned,
            resume_skills,
            job_skills,
            candidate_years,
            required_years
        )
        
        # Decide on Gemini evaluation
        gemini_score = None
        use_gemini = False
        gemini_threshold = 0.6  # Use Gemini if base_score > 60%
        
        if base_score > gemini_threshold and gemini_client.is_available():
            logger.info(f"Base score {base_score:.1%} > threshold. Calling Gemini...")
            
            # Evaluate projects and certifications
            job_requirements = {
                'title': 'Unknown',
                'skills': job_skills,
                'description': job_description
            }
            
            gemini_scores = []

            if projects:
                project_eval = gemini_client.evaluate_projects(projects, job_requirements)
                if project_eval.get('evaluated'):
                    gemini_scores.append(project_eval.get('score', 0))

            if certifications:
                cert_eval = gemini_client.evaluate_certifications(certifications, job_requirements)
                if cert_eval.get('evaluated'):
                    gemini_scores.append(cert_eval.get('score', 0))

            if gemini_scores:
                use_gemini = True
                gemini_score = sum(gemini_scores) / len(gemini_scores)
            else:
                logger.warning("Gemini was attempted but produced no valid scores; using base score only")
        
        # Calculate final score
        final_score = scorer.calculate_final_score(base_score, gemini_score, use_gemini)
        
        # Get score breakdown
        semantic_score = scorer.calculate_semantic_score(resume_cleaned, job_cleaned)
        skill_score = scorer.calculate_skill_score(resume_skills, job_skills)
        experience_score = scorer.calculate_experience_score(candidate_years, required_years)
        
        score_breakdown = scorer.get_score_breakdown(
            base_score, semantic_score, skill_score, experience_score, gemini_score, final_score
        )
        
        # Determine matched and missing skills
        matched_skills = list(set(resume_skills) & set(job_skills))
        missing_skills = list(set(job_skills) - set(resume_skills))
        
        # Generate insights
        experience_match = f"{candidate_years} years (required: {required_years} years)"
        if candidate_years >= required_years:
            experience_match += " ✓ Meets requirement"
        else:
            experience_match += " ✗ Below requirement"
        
        project_insight = f"Found {len(projects)} projects" if projects else "No projects found"
        
        # Make decision
        if final_score >= 75:
            decision = "Shortlisted"
        elif final_score >= 60:
            decision = "Under Review"
        else:
            decision = "Rejected"
        
        logger.info(f"Evaluation complete: {final_score:.1f}/100 - {decision}")
        
        response = {
            "final_score": final_score,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "experience_match": experience_match,
            "project_insight": project_insight,
            "decision": decision,
            "score_breakdown": score_breakdown,
            "gemini_used": use_gemini
        }

        logger.info(
            "Resume evaluation response: final_score=%.1f, decision=%s, gemini_used=%s, matched_skills=%s, missing_skills=%s",
            final_score,
            decision,
            use_gemini,
            matched_skills,
            missing_skills,
        )

        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error evaluating resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@router.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "AI Resume Matching Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "evaluate": "/evaluate"
    }
