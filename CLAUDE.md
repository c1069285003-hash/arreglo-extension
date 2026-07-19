# arreglo-extension — Claude Code 说明

## 项目背景
这是信远移民服务（XY Consulting）的 Chrome Extension，
用于自动填充 USCIS my.uscis.gov 上的 I-589 在线表单。

## 数据来源
申请人数据存储在 xingyuan-immigration-cms（Cloudflare KV）。
Extension 通过 API 读取指定 case 的申请人信息。

## 核心目标
1. content script 注入 my.uscis.gov/I-589 表单页面
2. 从 CRM API 拉取申请人数据（按 case ID）
3. 字段映射：CRM 字段 → I-589 表单 DOM input
4. 支持中文姓名拼音转换（pinyin-pro）
5. 填充后高亮标记，供律师/顾问人工校验

## CRM repo 位置
../xingyuan-immigration-cms

## 不要做的事
- 不要自动提交表单
- 不要存储任何申请人 PII 在 extension 本地
