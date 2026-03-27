import { useEffect, useState } from 'react';
import { request } from '../api';

export default function AdminPage({ auth }) {
  const [proposals, setProposals] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [comment, setComment] = useState('');

  const load = async () => {
    const [proposalData, reviewerData] = await Promise.all([
      request('/proposals', { token: auth.token }),
      request('/admin/reviewers', { token: auth.token })
    ]);
    setProposals(proposalData);
    setReviewers(reviewerData);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assign = async (proposalId, reviewerId) => {
    await request(`/admin/proposals/${proposalId}/assign`, {
      method: 'POST',
      token: auth.token,
      body: { reviewerId: Number(reviewerId) }
    });
    await load();
  };

  const changeStatus = async (proposalId, status) => {
    await request(`/admin/proposals/${proposalId}/status`, {
      method: 'POST',
      token: auth.token,
      body: { status, adminComment: comment }
    });
    await load();
  };

  return (
    <section className="card">
      <h2>管理员审批台</h2>
      <textarea
        rows={3}
        placeholder="全局操作备注（用于退回/通过/拒绝）"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>申请者</th>
            <th>状态</th>
            <th>评审者</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {proposals.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.title || '未命名'}</td>
              <td>{item.applicant_name}</td>
              <td>{item.status}</td>
              <td>
                <select
                  defaultValue={item.assigned_reviewer_id || ''}
                  onChange={(e) => assign(item.id, e.target.value)}
                >
                  <option value="">未分配</option>
                  {reviewers.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </td>
              <td className="row">
                <button onClick={() => changeStatus(item.id, 'changes_requested')}>退回</button>
                <button onClick={() => changeStatus(item.id, 'approved')}>通过</button>
                <button onClick={() => changeStatus(item.id, 'rejected')}>拒绝</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
