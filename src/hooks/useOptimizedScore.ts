// src/hooks/useOptimizedScore.ts (แก้ไข TypeScript Strict)
// ================================

import { useMemo } from 'react';
import type { CSMAssessmentAnswer, CSMFormField } from '../types/csm';

export interface ScoreCalculation {
  readonly totalScore: number;
  readonly avgScore: number;
  readonly maxScore: number;
  readonly completionRate: number;
  readonly scoreDistribution: Record<string, number>;
  readonly riskLevel: 'Low' | 'Moderate' | 'High' | '';
}

export const useOptimizedScoreCalculation = (
  answers: readonly CSMAssessmentAnswer[], 
  formFields: readonly CSMFormField[]
): ScoreCalculation => {
  return useMemo<ScoreCalculation>(() => {
    if (formFields.length === 0 || answers.length === 0) {
      return {
        totalScore: 0,
        avgScore: 0,
        maxScore: 0,
        completionRate: 0,
        scoreDistribution: {},
        riskLevel: ''
      };
    }

    let totalScore = 0;
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let maxPossibleScore = 0;
    let completedAnswers = 0;
    const scoreDistribution: Record<string, number> = { '0': 0, '1': 0, '2': 0, 'n/a': 0 };

    answers.forEach((answer: CSMAssessmentAnswer) => {
      const field = formFields.find((f: CSMFormField) => f.ckItem === answer.ckItem);
      if (!field) return;

      const weight = parseFloat(field.fScore || '1');
      const score = parseFloat(answer.score || '0');
      
      if (answer.score && answer.score !== '' && answer.comment.trim()) {
        completedAnswers++;
        
        if (answer.score !== 'n/a') {
          totalScore += score;
          totalWeightedScore += score * weight;
          totalWeight += weight;
          maxPossibleScore += 2 * weight;
        }
        
        const scoreKey = answer.score;
        scoreDistribution[scoreKey] = (scoreDistribution[scoreKey] || 0) + 1;
      }
    });

    const avgScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    const completionRate = formFields.length > 0 ? (completedAnswers / formFields.length) * 100 : 0;

    let riskLevel: 'Low' | 'Moderate' | 'High' | '' = '';
    if (avgScore >= 1.5) {
      riskLevel = 'Low';
    } else if (avgScore >= 1.0) {
      riskLevel = 'Moderate';
    } else if (avgScore > 0) {
      riskLevel = 'High';
    }

    return {
      totalScore,
      avgScore,
      maxScore: maxPossibleScore,
      completionRate,
      scoreDistribution,
      riskLevel
    };
  }, [answers, formFields]);
};