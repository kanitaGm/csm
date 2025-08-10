// 📁 src/components/hooks/useOptimizedScore.ts (ไฟล์ใหม่)
import { useMemo } from 'react';
import type { CSMAssessmentAnswer, CSMFormField } from '../types';
import csmService from '../services/csmService';

export const useOptimizedScoreCalculation = (
  answers: CSMAssessmentAnswer[], 
  formFields: CSMFormField[]
) => {
  return useMemo(() => {
    if (!formFields.length || !answers.length) {
      return { totalScore: 0, avgScore: 0, maxScore: 0 };
    }
    
    const totalScore = csmService.assessments.calculateTotalScore(answers, formFields);
    const maxScore = csmService.assessments.calculateMaxScore(answers, formFields);
    const avgScore = csmService.assessments.calculateAverageScore(answers, formFields);
    
    return { totalScore, avgScore, maxScore };
  }, [answers, formFields]);
};