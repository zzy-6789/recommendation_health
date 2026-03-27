import { useEffect, useMemo, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { request } from '../api';

const steps = [
  { key: 'title', label: '1. 标题' },
  { key: 'summary', label: '2. 摘要' },
  { key: 'problem_statement', label: '3. 问题定义' },
  { key: 'approach', label: '4. 解决方案' },
  { key: 'budget', label: '5. 预算' },
  { key: 'timeline', label: '6. 时间线' }
];

export default function ApplicantPage({ auth }) {
  const [proposals, setProposals] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('');

  const token = auth.token;

  const load = async () => {
    const list = await request('/proposals', { token });
    setProposals(list);
    if (!selected && list[0]) {
      setSelected(list[0]);
      setForm(list[0]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createProposal = async () => {
    const item = await request('/proposals', { method: 'POST', token });
    setSelected(item);
    setForm(item);
    await load();
  };

  const saveDraft = async () => {
    const updated = await request(`/proposals/${selected.id}`, {
      method: 'PUT',
      token,
      body: form
    });
    setSelected(updated);
    setForm(updated);
    setMessage('草稿已保存');
    await load();
  };

  const submitProposal = async () => {
    await saveDraft();
    const updated = await request(`/proposals/${selected.id}/submit`, { method: 'POST', token });
    setSelected(updated);
    setForm(updated);
    setMessage('proposal 已提交');
    await load();
  };

  const exportPdf = () => {
    const element = document.getElementById('proposal-export');
    html2pdf().from(element).save(`proposal-${selected.id}.pdf`);
  };

  const current = steps[step];
  const canEdit = selected && ['draft', 'changes_requested'].includes(selected.status);

  const selectedWithReviews = useMemo(
    () => proposals.find((item) => item.id === selected?.id) || selected,
    [proposals, selected]
  );

  return (
    <div className="grid">
      <section className="card">
        <div className="row between">
          <h2>我的 Proposal</h2>
          <button onClick={createProposal}>+ 新建</button>
        </div>
        <ul className="list">
          {proposals.map((item) => (
            <li
              key={item.id}
              className={selected?.id === item.id ? 'active' : ''}
              onClick={() => {
                setSelected(item);
                setForm(item);
              }}
            >
              <strong>{item.title || `未命名 #${item.id}`}</strong>
              <span>{item.status}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" id="proposal-export">
        {!selected ? (
          <p>请先新建 proposal。</p>
        ) : (
          <>
            <h2>分步骤填写</h2>
            <div className="stepper">
              {steps.map((item, idx) => (
                <button key={item.key} className={step === idx ? 'active' : ''} onClick={() => setStep(idx)}>
                  {item.label}
                </button>
              ))}
            </div>

            <label>{current.label}</label>
            <textarea
              rows={6}
              disabled={!canEdit}
              value={form[current.key] || ''}
              onChange={(e) => setForm({ ...form, [current.key]: e.target.value })}
            />

            <div className="row">
              <button disabled={!canEdit} onClick={saveDraft}>保存草稿</button>
              <button disabled={!canEdit} onClick={submitProposal}>提交</button>
              <button onClick={exportPdf}>导出 PDF</button>
            </div>

            <p>状态：<strong>{selectedWithReviews?.status}</strong></p>
            {selectedWithReviews?.admin_comment && <p>管理员反馈：{selectedWithReviews.admin_comment}</p>}
            {message && <p className="success">{message}</p>}
          </>
        )}
      </section>
    </div>
  );
}
