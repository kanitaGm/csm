// 📁 src/components/hooks/useOptimizedScore.ts (ไฟล์ใหม่)
import { useMemo } from 'react';
import type { AssessmentAnswer, FormField } from '../../types/types';
import csmService from '../../services/csmService';

export const useOptimizedScoreCalculation = (
  answers: AssessmentAnswer[], 
  formFields: FormField[]
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