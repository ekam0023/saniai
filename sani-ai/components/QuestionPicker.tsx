'use client';
import { useState } from 'react';

/** Shows detected question(s), lets the student edit and choose which to answer. */
export default function QuestionPicker({ questions, hasDiagram, onAnswer, onCancel }: { questions: string[]; hasDiagram: boolean; onAnswer: (qs: string[]) => void; onCancel: () => void }) {
  const [items, setItems] = useState(questions);
  const [sel, setSel] = useState<boolean[]>(questions.map((_, i) => i === 0));
  const multi = items.length > 1;
  const chosen = items.filter((_, i) => sel[i]).map((q) => q.trim()).filter(Boolean);
  return (
    <section className="card space-y-3" aria-label="Detected questions">
      <h3 className="text-sm font-semibold">{multi ? 'We found several questions. Choose which to answer.' : 'Detected question (you can edit it)'}</h3>
      {hasDiagram && <p className="text-xs text-amber-700 dark:text-amber-300">This question seems to include a diagram. Sani answers from the text; check that nothing is missing.</p>}
      {items.map((q, i) => (
        <div key={i} className="flex items-start gap-2">
          {multi && <input type="checkbox" className="mt-3 h-5 w-5" checked={sel[i]} onChange={(e) => setSel(sel.map((v, j) => (j === i ? e.target.checked : v)))} aria-label={`Select question ${i + 1}`} />}
          <div className="flex-1">
            {multi && <span className="label">Question {i + 1}</span>}
            <textarea className="field" rows={2} value={q} aria-label={`Question ${i + 1}`} onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))} />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={!chosen.length} onClick={() => onAnswer(chosen)}>Generate Answer{chosen.length > 1 ? 's' : ''}</button>
        {multi && <button className="btn-ghost" onClick={() => setSel(items.map(() => true))}>Select all</button>}
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}
