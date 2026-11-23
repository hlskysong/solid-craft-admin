import { createMemo, createSignal, onMount, type JSX } from 'solid-js';
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Table,
  Tag,
  useForm,
  type FormInstance,
  type FormValues,
  type TableChange,
  type TableColumn,
} from 'solid-craft';

type PlanStatus = 'draft' | 'approved' | 'locked';

interface Plan {
  id: string;
  name: string;
  department: string;
  amount: number;
  status: PlanStatus;
}

const STATUS_META: Record<PlanStatus, { text: string; color: 'neutral' | 'success' | 'danger' }> = {
  draft: { text: '草稿', color: 'neutral' },
  approved: { text: '已审批', color: 'success' },
  locked: { text: '已锁定', color: 'danger' },
};

const DEPARTMENTS = [
  { value: '研发部', label: '研发部' },
  { value: '设备部', label: '设备部' },
  { value: '财务部', label: '财务部' },
];

const INITIAL: Plan[] = [
  { id: 'PLAN-01', name: '主井提升机变频改造', department: '设备部', amount: 86.5, status: 'approved' },
  { id: 'PLAN-02', name: '综采工作面液压支架检修', department: '设备部', amount: 124, status: 'draft' },
  { id: 'PLAN-03', name: '矿井通风在线监测系统', department: '研发部', amount: 58.2, status: 'approved' },
  { id: 'PLAN-04', name: '选煤厂皮带机驱动更换', department: '设备部', amount: 39.8, status: 'locked' },
  { id: 'PLAN-05', name: '井下人员定位基站扩容', department: '研发部', amount: 72.6, status: 'draft' },
  { id: 'PLAN-06', name: '地面变电所继电保护改造', department: '财务部', amount: 45.3, status: 'approved' },
  { id: 'PLAN-07', name: '矿区视频监控存储扩容', department: '研发部', amount: 28.9, status: 'draft' },
  { id: 'PLAN-08', name: '压风机余热回收装置', department: '设备部', amount: 66.1, status: 'locked' },
];

const asText = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback);

/** Modal 内容走 Portal，onMount 时字段已注册，才能可靠回填编辑值。 */
function FillOnMount(props: { form: FormInstance; row: Plan | null }): JSX.Element {
  onMount(() => {
    if (props.row === null) {
      props.form.resetFields();
      return;
    }
    props.form.setFieldsValue({
      name: props.row.name,
      department: props.row.department,
      amount: props.row.amount,
    });
  });
  return null;
}

export default function Plans() {
  const [plans, setPlans] = createSignal<Plan[]>(INITIAL);
  const [query, setQuery] = createSignal('');
  const [log, setLog] = createSignal('等待操作');
  const [open, setOpen] = createSignal(false);
  const [editing, setEditing] = createSignal<Plan | null>(null);
  const [seq, setSeq] = createSignal(9);

  const [queryForm] = useForm<FormValues>({ keyword: '' });
  const [planForm] = useForm<FormValues>({ name: '', department: '设备部', amount: 10 });

  const visible = createMemo(() => {
    const key = query().trim();
    return key === '' ? plans() : plans().filter((row) => row.name.includes(key));
  });

  const submitForm = (): Promise<void> =>
    planForm.validateFields().then((result) => {
      if (!result.valid) {
        void message.error('请先补全计划信息');
        throw new Error('表单校验未通过');
      }
      const name = asText(result.values.name, '');
      const department = asText(result.values.department, '设备部');
      const amount = Number(result.values.amount ?? 0);
      const row = editing();
      if (row === null) {
        const id = `PLAN-${String(seq()).padStart(2, '0')}`;
        setSeq(seq() + 1);
        setPlans((list) => [...list, { id, name, department, amount, status: 'draft' }]);
        setLog(`新增 ${id}`);
        void message.success('计划已新增');
      } else {
        setPlans((list) => list.map((item) => (item.id === row.id ? { ...item, name, department, amount } : item)));
        setLog(`编辑 ${row.id}`);
        void message.success('计划已更新');
      }
      setOpen(false);
    });

  const columns: TableColumn<Plan>[] = [
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
        const meta = STATUS_META[String(value) as PlanStatus];
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_value, row) => (
        <div class="row-actions">
          <Button
            variant="text"
            color="primary"
            onClick={() => {
              setEditing(row);
              setOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该计划？"
            description="删除后不可恢复。"
            okText="确认删除"
            onOk={() => {
              setPlans((list) => list.filter((item) => item.id !== row.id));
              setLog(`删除 ${row.id}`);
              void message.success('计划已删除');
            }}
          >
            删除
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <div class="pro-page-heading">
        <div>
          <h2>采购计划管理</h2>
          <p>查询、新增、编辑、删除全链路演示 —— 组件能力来自 solid-craft，数据仅存于前端内存。</p>
        </div>
        <span class="pro-page-date">共 {plans().length} 条计划</span>
      </div>

      <div class="pro-panel">
        <div class="pro-query">
          <Form
            form={queryForm}
            layout="inline"
            aria-label="计划查询"
            onFinish={(values) => {
              setQuery(asText(values.keyword, ''));
              void message.info('列表已刷新');
            }}
          >
            <Form.Item name="keyword" label="计划名称">
              <Input placeholder="按名称关键字查询" />
            </Form.Item>
            <div class="pro-query-actions">
              <Button htmlType="submit">查询</Button>
              <Button
                variant="outline"
                color="neutral"
                onClick={() => {
                  queryForm.resetFields();
                  setQuery('');
                }}
              >
                重置
              </Button>
            </div>
          </Form>
        </div>

        <div class="pro-toolbar">
          <div class="pro-toolbar-actions">
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              ＋ 新增计划
            </Button>
          </div>
          <span class="pro-toolbar-meta">当前 {visible().length} 条 · 最近操作：{log()}</span>
        </div>

        <Table
          columns={columns}
          data={visible()}
          rowKey="id"
          bordered
          pagination={{
            defaultPageSize: 5,
            pageSizeOptions: [5, 10],
            showSizeChanger: true,
            showTotal: (total) => <span>共 {total} 条计划</span>,
          }}
          onChange={(change: TableChange) =>
            setLog(`第 ${change.pagination?.current ?? 1} 页 / 每页 ${change.pagination?.pageSize ?? 5} 条`)
          }
          aria-label="采购计划列表"
        />
      </div>

      <Modal
        title={editing() === null ? '新增采购计划' : '编辑采购计划'}
        open={open()}
        onOpenChange={setOpen}
        onOk={submitForm}
        okText="保存计划"
        cancelText="取消"
      >
        <Form form={planForm} layout="vertical" aria-label="计划表单">
          <Form.Item name="name" label="计划名称" rules={[{ required: true, message: '请输入计划名称' }]}>
            <Input placeholder="请输入计划名称" />
          </Form.Item>
          <Form.Item name="department" label="申报单位">
            <Select options={DEPARTMENTS} placeholder="请选择申报单位" />
          </Form.Item>
          <Form.Item name="amount" label="本次采购金额（万元）" rules={[{ min: 1, message: '金额不得低于 1 万元' }]}>
            <InputNumber min={1} step={1} />
          </Form.Item>
          <FillOnMount form={planForm} row={editing()} />
        </Form>
      </Modal>
    </>
  );
}
