"""Scoring engine for resume matching"""

import logging
from typing import Dict, List, Tuple
import numpy as np
from embeddings.embedding_model import EmbeddingModel
from vectorstore.faiss_store import FAISSVectorStore

logger = logging.getLogger(__name__)


class ResumeScorer:
    """Resume scoring engine using hybrid approach"""
    
    def __init__(self, embedding_model: EmbeddingModel):
        """
        Initialize scorer with embedding model
        
        Args:
            embedding_model: EmbeddingModel instance
        """
        self.embedding_model = embedding_model
        self.vectorstore = FAISSVectorStore(embedding_dim=384)
    
    def calculate_semantic_score(self, resume_text: str, job_description: str) -> float:
        """
        Calculate semantic similarity between resume and job description
        
        Args:
            resume_text: Resume text
            job_description: Job description text
            
        Returns:
            Semantic similarity score (0-1)
        """
        try:
            resume_emb = self.embedding_model.embed_text(resume_text)
            job_emb = self.embedding_model.embed_text(job_description)
            
            similarity = EmbeddingModel.cosine_similarity(resume_emb, job_emb)
            logger.info(f"Semantic score: {similarity:.3f}")
            return float(similarity)
        except Exception as e:
            logger.error(f"Error calculating semantic score: {str(e)}")
            return 0.0
    
    def calculate_skill_score(self, resume_skills: List[str], job_skills: List[str]) -> float:
        """
        Calculate skill match using semantic similarity
        
        Args:
            resume_skills: List of candidate skills
            job_skills: List of required skills
            
        Returns:
            Skill match score (0-1)
        """
        try:
            if not resume_skills or not job_skills:
                logger.warning("Missing skills for comparison")
                return 0.0
            
            # Join skills into single text
            resume_skills_text = ' '.join(resume_skills)
            job_skills_text = ' '.join(job_skills)
            
            # Calculate similarity
            resume_skills_emb = self.embedding_model.embed_text(resume_skills_text)
            job_skills_emb = self.embedding_model.embed_text(job_skills_text)
            
            skill_similarity = EmbeddingModel.cosine_similarity(resume_skills_emb, job_skills_emb)
            
            # Exact match bonus
            exact_matches = set(resume_skills) & set(job_skills)
            if exact_matches:
                match_bonus = len(exact_matches) / len(job_skills)
                skill_score = 0.5 * skill_similarity + 0.5 * match_bonus
            else:
                skill_score = skill_similarity
            
            logger.info(f"Skill score: {skill_score:.3f} (Exact matches: {len(exact_matches)}/{len(job_skills)})")
            return float(min(1.0, skill_score))
        except Exception as e:
            logger.error(f"Error calculating skill score: {str(e)}")
            return 0.0
    
    def calculate_experience_score(self, candidate_years: int, required_years: int) -> float:
        """
        Calculate experience match using rule-based comparison
        
        Args:
            candidate_years: Years of experience from candidate
            required_years: Required years from job description
            
        Returns:
            Experience score (0-1)
        """
        try:
            if required_years == 0:
                return 1.0 if candidate_years > 0 else 0.5
            
            # Calculate ratio
            ratio = candidate_years / required_years
            
            # Scoring logic:
            # - Exactly matches: 1.0
            # - More than required: 1.0
            # - 80-100% of required: 0.9
            # - 60-80% of required: 0.7
            # - 40-60% of required: 0.5
            # - Less than 40%: 0.3
            
            if ratio >= 1.0:
                score = 1.0
            elif ratio >= 0.8:
                score = 0.9
            elif ratio >= 0.6:
                score = 0.7
            elif ratio >= 0.4:
                score = 0.5
            else:
                score = 0.3
            
            logger.info(f"Experience score: {score:.3f} ({candidate_years} vs {required_years} years)")
            return float(score)
        except Exception as e:
            logger.error(f"Error calculating experience score: {str(e)}")
            return 0.0
    
    def calculate_base_score(
        self,
        resume_text: str,
        job_description: str,
        resume_skills: List[str],
        job_skills: List[str],
        candidate_years: int,
        required_years: int
    ) -> float:
        """
        Calculate base score using weighted combination
        
        Formula:
        base_score = 0.4 * semantic_score + 0.4 * skill_score + 0.2 * experience_score
        
        Args:
            resume_text: Resume text
            job_description: Job description text
            resume_skills: Candidate skills
            job_skills: Required skills
            candidate_years: Candidate experience
            required_years: Required experience
            
        Returns:
            Base score (0-1)
        """
        semantic_score = self.calculate_semantic_score(resume_text, job_description)
        skill_score = self.calculate_skill_score(resume_skills, job_skills)
        experience_score = self.calculate_experience_score(candidate_years, required_years)
        
        base_score = (
            0.4 * semantic_score +
            0.4 * skill_score +
            0.2 * experience_score
        )
        
        logger.info(
            f"Base score: {base_score:.3f} "
            f"(Semantic: {semantic_score:.3f}, Skill: {skill_score:.3f}, Experience: {experience_score:.3f})"
        )
        return float(min(1.0, base_score))
    
    def calculate_final_score(
        self,
        base_score: float,
        gemini_score: float = None,
        use_gemini: bool = False
    ) -> float:
        """
        Calculate final score
        
        Formula:
        If Gemini used:
            final_score = 0.7 * base_score + 0.3 * gemini_score
        If Gemini not used:
            final_score = base_score
        
        Args:
            base_score: Base score from scoring engine
            gemini_score: Optional Gemini evaluation score
            use_gemini: Whether Gemini was used
            
        Returns:
            Final score (0-100)
        """
        if use_gemini and gemini_score is not None:
            # Convert scores to 0-100 scale for Gemini
            final_score = 0.7 * (base_score * 100) + 0.3 * gemini_score
        else:
            final_score = base_score * 100
        
        logger.info(f"Final score: {final_score:.1f}/100 (Gemini: {use_gemini})")
        return float(min(100.0, max(0.0, final_score)))
    
    def get_score_breakdown(
        self,
        base_score: float,
        semantic_score: float,
        skill_score: float,
        experience_score: float,
        gemini_score: float = None,
        final_score: float = None
    ) -> Dict:
        """
        Get detailed breakdown of scoring
        
        Args:
            base_score: Base score
            semantic_score: Semantic similarity score
            skill_score: Skill match score
            experience_score: Experience match score
            gemini_score: Optional Gemini score
            final_score: Final score
            
        Returns:
            Dictionary with score breakdown
        """
        return {
            'base_score': float(round(base_score, 3)),
            'semantic_score': float(round(semantic_score, 3)),
            'skill_score': float(round(skill_score, 3)),
            'experience_score': float(round(experience_score, 3)),
            'gemini_score': float(round(gemini_score, 3)) if gemini_score else None,
            'final_score': float(round(final_score, 1)) if final_score else None,
        }
