# Web 智能 Proposal 提交与评审系统 MVP

React + Node.js + SQLite 的三角色（申请者/评审者/管理员）最小可用系统。

## 功能

- 申请者：注册登录、分步骤填写 proposal、保存草稿、提交、导出 PDF。
- 管理员：查看 proposal、分配评审者、退回修改、通过或拒绝。
- 评审者：查看分配的 proposal，按简易评分表提交评审。
- 基础 RBAC 权限与状态流转：`draft -> submitted -> under_review -> changes_requested/approved/rejected`。

## 启动

### 1) 后端

```bash
cd backend
npm install
npm run start
```

后端默认地址：`http://localhost:4000`

默认账号（由初始化脚本自动创建）：
- 管理员：`admin@demo.com / Admin123!`
- 评审者：`reviewer@demo.com / Reviewer123!`

### 2) 前端

```bash
cd frontend
npm install
npm run dev
```

前端默认地址：`http://localhost:5173`

## 数据库

- SQLite 文件：`backend/proposal_system.db`
- 首次运行会自动建表并插入默认管理员、评审账号。
