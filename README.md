# PeopleCompass 月度人员异动原型

Vue 3 + TypeScript + Vite + ECharts。当前仅实现月度人员异动页面，数据源为项目根目录的 `每月人员异动表202610.xlsx`。

项目负责人和 AI 如何确认方向、分配决策权、验收改动，见[《我和 AI 的协作约定》](./AGENTS.md)。

## 启动

```bash
npm install
npm run dev
```

开发服务器默认只监听本机 `127.0.0.1`。运行 `npm run dev` 时会先重新解析工作簿并生成清洗后的匿名化页面数据；名称和具体日期不会写入页面数据。原始工作簿保留在项目根目录，并由 Vite 文件访问规则禁止通过开发服务器下载。

## 校验

更新根目录的同名 Excel 后，在启动页面前执行：

```bash
npm run verify:data
```

命令重新读取 Excel，逐项输出预期值和实际值。通过后更新页面数据和清洗日志。失败时退出码为 1，保留上一次生成的文件，请先核对差异。

`data/verification-baseline.json` 保存截至 2026-10 已确认的对账数字。每类的两个数依次是历史总数、2025-11 至 2026-10 的总数。追加新月份时保留这组历史基准，新记录参加全量校验，包括月份、类别、记录数以及部门调入调出守恒。需要验收新月份的具体业务数量或更正历史时，请先独立核对 Excel，再维护基准文件。

```bash
npm run typecheck
npm run build
```

清洗规则及校验汇总见 `data/cleaning-log.json`。原始 Excel 不会被修改。
