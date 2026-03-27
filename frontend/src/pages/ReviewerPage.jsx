import { useEffect, useState } from 'react';
import { request } from '../api';

export default function ReviewerPage({ auth }) {
  const [proposals, setProposals] = useState([]);
  const [scores, setScores] = useState({});

  const load = async () => {
    const data = await request('/proposals', { token: auth.token });
    setProposals(data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (id, key, value) => {
    setScores({
      ...scores,
      [id]: {
        scoreClarity: 3,
        scoreFeasibility: 3,
        scoreImpact: 3,
        comments: '',
        ...scores[id],
        [key]: value
      }
    });
  };

  const submitReview = async (id) => {
    await request(`/reviewer/proposals/${id}/review`, {
      method: 'POST',
      token: auth.token,
      body: scores[id]
    });
    alert('评分已提交');
  };

  return (
    <section className="card">
      <h2>评审工作台</h2>
      {proposals.map((p) => (
        <article className="review-card" key={p.id}>
          <h3>{p.title || `Proposal #${p.id}`}</h3>
          <p><strong>摘要：</strong>{p.summary || '-'}</p>
          <div className="row">
            <label>清晰度
              <input type="number" min="1" max="5" value={scores[p.id]?.scoreClarity || 3} onChange={(e) => setField(p.id, 'scoreClarity', Number(e.target.value))} />
            </label>
            <label>可行性
              <input type="number" min="1" max="5" value={scores[p.id]?.scoreFeasibility || 3} onChange={(e) => setField(p.id, 'scoreFeasibility', Number(e.target.value))} />
            </label>
            <label>影响力
              <input type="number" min="1" max="5" value={scores[p.id]?.scoreImpact || 3} onChange={(e) => setField(p.id, 'scoreImpact', Number(e.target.value))} />
            </label>
          </div>
          <textarea
            rows={3}
            placeholder="评审意见"
            value={scores[p.id]?.comments || ''}
            onChange={(e) => setField(p.id, 'comments', e.target.value)}
          />
          <button onClick={() => submitReview(p.id)}>提交评分</button>
        </article>
      ))}
    </section>
  );
}
