import { For } from 'solid-js';
import { Card, Tag, Table, Title } from 'solid-craft';
import type { TableColumn } from 'solid-craft';

interface RecentItem {
  id: string;
  name: string;
  department: string;
  status: 'approved' | 'draft' | 'locked';
  amount: number;
}

const RECENT: RecentItem[] = [
  { id: 'PLAN-01', name: '主井提升机变频改造', department: '设备部', status: 'approved', amount: 86.5 },
  { id: 'PLAN-02', name: '综采工作面液压支架检修', department: '设备部', status: 'draft', amount: 124 },
  { id: 'PLAN-03', name: '矿井通风在线监测系统', department: '研发部', status: 'approved', amount: 58.2 },
  { id: 'PLAN-04', name: '选煤厂皮带机驱动更换', department: '设备部', status: 'locked', amount: 39.8 },
];

interface Stat {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'flat';
  tone: 'blue' | 'green' | 'amber' | 'red';
  icon: string;
  spark: number[];
}

const STATS: Stat[] = [
  { label: '设备台账总数', value: '1,284', delta: '本月 +32', trend: 'up', tone: 'blue', icon: '▦', spark: [4, 6, 5, 8, 7, 9, 10] },
  { label: '待审批计划', value: '17', delta: '较昨日 -4', trend: 'down', tone: 'green', icon: '▤', spark: [9, 8, 8, 6, 7, 5, 4] },
  { label: '本月维检完成率', value: '92.6%', delta: '目标 90%', trend: 'up', tone: 'amber', icon: '◉', spark: [5, 6, 6, 7, 8, 8, 9] },
  { label: '异常告警', value: '3', delta: '需关注', trend: 'flat', tone: 'red', icon: '⚠', spark: [3, 2, 4, 3, 5, 4, 3] },
];

const STATUS_META = {
  approved: { text: '已审批', color: 'success' },
  draft: { text: '草稿', color: 'neutral' },
  locked: { text: '已锁定', color: 'danger' },
} as const;

const columns: TableColumn<RecentItem>[] = [
  { title: '计划编号', dataIndex: 'id', width: 110 },
  { title: '计划名称', dataIndex: 'name' },
  { title: '申报单位', dataIndex: 'department', width: 110 },
  {
    title: '本次采购金额（万元）',
    dataIndex: 'amount',
    width: 180,
    align: 'right',
    render: (value) => <span>{Number(value ?? 0).toFixed(1)}</span>,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (value) => {
      const meta = STATUS_META[String(value) as RecentItem['status']];
      return <Tag color={meta.color}>{meta.text}</Tag>;
    },
  },
];

export default function Dashboard() {
  return (
    <>
      <div class="pro-page-heading">
        <div>
          <h2>工作台</h2>
          <p>欢迎回来，这是设备维检与采购计划的最新概览。</p>
        </div>
        <span class="pro-page-date">2026 年 11 月 20 日 · 星期五</span>
      </div>

      <div class="pro-stat-grid">
        <For each={STATS}>
          {(stat) => (
            <Card class="pro-stat-card">
              <div class="pro-stat-top">
                <span class={`pro-stat-icon tone-${stat.tone}`} aria-hidden="true">{stat.icon}</span>
                <span class={`pro-stat-delta trend-${stat.trend}`}>{stat.delta}</span>
              </div>
              <div class="pro-stat-value">{stat.value}</div>
              <div class="pro-stat-label">{stat.label}</div>
              <div class="pro-spark" aria-hidden="true">
                <For each={stat.spark}>
                  {(height) => <span class={`pro-spark-bar tone-${stat.tone}`} style={{ height: `${height * 10}%` }} />}
                </For>
              </div>
            </Card>
          )}
        </For>
      </div>

      <div class="pro-panel">
        <div class="pro-panel-head">
          <Title level={4}>最近采购计划</Title>
          <button type="button" class="pro-link">查看全部 →</button>
        </div>
        <Table
          columns={columns}
          data={RECENT}
          rowKey="id"
          bordered
          pagination={false}
          aria-label="最近采购计划"
        />
      </div>

      <div class="pro-alert">
        <span aria-hidden="true">ℹ</span>
        <span>本页为 solid-craft admin 模板的纯前端演示：统计卡 / 标签 / 表格均来自 solid-craft 组件，数据为静态示例，未接入后端。</span>
      </div>
    </>
  );
}
