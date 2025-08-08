// src/components/utils/ScoreDropdown.tsx 

import type { Score } from '../../types/types';

interface Props {
  value: Score;
  onChange: (val: Score) => void;
}

export default function ScoreDropdown({ value, onChange }: Props) {
  return (
    
    <select value={value} onChange={(e) => onChange(e.target.value as Score)} >
      <option value="n/a">n/a ไม่เกี่ยวข้อง</option>
      <option value="0">0-ไม่ให้คะแนน</option>
      <option value="1">1-บางส่วน</option>
      <option value="2">2-เต็มคะแนน</option>
    </select>
  );
}
