// ========================================
// 📁 src/hooks/useOptimizedScore.ts
// ========================================
import { useMemo, useCallback } from 'react';
import type { Score, CalculatedScore } from '../types';

export interface ScoreCalculationOptions {
  readonly weights?: Record<string, number>;
  readonly scalingFactor?: number;
  readonly enableCaching?: boolean; // future use
}

export interface UseOptimizedScoreResult {
  readonly calculateScore: (answers: Record<string, Score>) => CalculatedScore;
  readonly calculateTotalScore: (scores: CalculatedScore[]) => number;
  readonly getScoreBreakdown: (answers: Record<string, Score>) => Record<string, number>;
  readonly isScoreValid: (score: CalculatedScore) => boolean;
}

// แปลง Score string → number
const parseScoreValue = (score: Score): number => {
  if (score === 'n/a' || score === '' || score == null) return 0;
  const numeric = parseFloat(score);
  return isNaN(numeric) ? 0 : numeric;
};

export const useOptimizedScore = (options: ScoreCalculationOptions = {}): UseOptimizedScoreResult => {
  const { weights = {}, scalingFactor = 1 } = options;

  // คำนวณน้ำหนักรวม
  const normalizedWeights = useMemo(() => {
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (totalWeight === 0) return weights;
    return Object.fromEntries(
      Object.entries(weights).map(([key, weight]) => [key, weight / totalWeight])
    );
  }, [weights]);

  const calculateScore = useCallback((answers: Record<string, Score>): CalculatedScore => {
    let totalScore = 0;
    let maxPossibleScore = 0;
    const breakdown: Record<string, number> = {};

    Object.entries(answers).forEach(([questionId, answer]) => {
      const weight = normalizedWeights[questionId] || 1;
      const questionScore = parseScoreValue(answer); // แปลงจาก string → number

      const weightedScore = questionScore * weight * scalingFactor;
      totalScore += weightedScore;
      maxPossibleScore += 5 * weight * scalingFactor; // สมมติคะแนนเต็มต่อข้อ = 5
      breakdown[questionId] = weightedScore;
    });

    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    return {
      value: Math.round(totalScore * 100) / 100,
      maxValue: Math.round(maxPossibleScore * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      breakdown
    };
  }, [normalizedWeights, scalingFactor]);

  const calculateTotalScore = useCallback((scores: CalculatedScore[]): number => {
    if (scores.length === 0) return 0;
    const totalValue = scores.reduce((sum, score) => sum + score.value, 0);
    const totalMaxValue = scores.reduce((sum, score) => sum + score.maxValue, 0);
    return totalMaxValue > 0 ? (totalValue / totalMaxValue) * 100 : 0;
  }, []);

  const getScoreBreakdown = useCallback((answers: Record<string, Score>): Record<string, number> => {
    return calculateScore(answers).breakdown;
  }, [calculateScore]);

  const isScoreValid = useCallback((score: CalculatedScore): boolean => {
    return (
      typeof score.value === 'number' &&
      typeof score.maxValue === 'number' &&
      typeof score.percentage === 'number' &&
      !isNaN(score.value) &&
      !isNaN(score.maxValue) &&
      !isNaN(score.percentage) &&
      score.value >= 0 &&
      score.maxValue >= 0 &&
      score.percentage >= 0 &&
      score.percentage <= 100
    );
  }, []);

  return {
    calculateScore,
    calculateTotalScore,
    getScoreBreakdown,
    isScoreValid
  };
};
