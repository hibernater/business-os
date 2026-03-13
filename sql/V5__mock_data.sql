-- V5: Mock 数据 — 让产品看起来完整
-- 企业：义乌张氏家居（收纳用品工厂）
-- 所有数据有逻辑关系：资产 → Skill → 任务 → 数字孪生

-- ============================
-- 0. 更新企业信息（更真实）
-- ============================
UPDATE enterprise SET
    name = '张氏家居（义乌）',
    industry = '家居收纳',
    scale = '年营收1500万',
    platforms = ARRAY['1688', '淘天', '拼多多', '抖音']
WHERE id = 'ent_default';

UPDATE "user" SET display_name = '张伟' WHERE id = 'user_default';

-- ============================
-- 1. 企业资产（product / customer / supplier / document / preference）
-- ============================

-- 商品资产（5个 SKU，对应不同生命周期）
INSERT INTO enterprise_asset (id, enterprise_id, asset_type, name, content, source, created_at) VALUES
('asset_p1', 'ent_default', 'product', '旋转调味料收纳盒', '{"sku":"ZS-TW001","price":38.5,"cost":12.8,"monthly_sales":5200,"status":"爆款","category":"厨房收纳","platforms":["1688","淘天"],"margin_rate":"66.8%","rating":4.8,"launch_date":"2025-09"}', 'user_upload', NOW() - INTERVAL '30 days'),
('asset_p2', 'ent_default', 'product', '壁挂折叠垃圾桶', '{"sku":"ZS-LJ002","price":25.9,"cost":8.5,"monthly_sales":3800,"status":"稳定","category":"卫浴收纳","platforms":["1688","拼多多"],"margin_rate":"67.2%","rating":4.6,"launch_date":"2025-06"}', 'user_upload', NOW() - INTERVAL '25 days'),
('asset_p3', 'ent_default', 'product', '多层旋转置物架', '{"sku":"ZS-ZW003","price":68.0,"cost":28.0,"monthly_sales":1200,"status":"增长中","category":"厨房收纳","platforms":["淘天","抖音"],"margin_rate":"58.8%","rating":4.7,"launch_date":"2025-11"}', 'user_upload', NOW() - INTERVAL '20 days'),
('asset_p4', 'ent_default', 'product', '冰箱侧挂置物架', '{"sku":"ZS-BX004","price":19.9,"cost":6.2,"monthly_sales":6500,"status":"爆款","category":"厨房收纳","platforms":["拼多多","1688"],"margin_rate":"68.8%","rating":4.5,"launch_date":"2025-03"}', 'user_upload', NOW() - INTERVAL '15 days'),
('asset_p5', 'ent_default', 'product', '莫兰迪色系收纳箱（新品）', '{"sku":"ZS-SN005","price":45.0,"cost":18.0,"monthly_sales":0,"status":"打样中","category":"衣物收纳","platforms":[],"margin_rate":"60%","rating":null,"launch_date":null}', 'skill_execution', NOW() - INTERVAL '3 days');

-- 客户资产（4个核心客户）
INSERT INTO enterprise_asset (id, enterprise_id, asset_type, name, content, source, created_at) VALUES
('asset_c1', 'ent_default', 'customer', '深圳百纳优品（大客户）', '{"level":"A","type":"经销商","monthly_order":"15万","products":["ZS-TW001","ZS-BX004"],"contact":"李经理","last_order":"2026-03-08","cooperation_months":18,"trend":"稳定"}', 'user_upload', NOW() - INTERVAL '60 days'),
('asset_c2', 'ent_default', 'customer', '杭州绿洁家居', '{"level":"A","type":"品牌客户","monthly_order":"8万","products":["ZS-LJ002","ZS-ZW003"],"contact":"王总","last_order":"2026-03-05","cooperation_months":12,"trend":"增长"}', 'user_upload', NOW() - INTERVAL '45 days'),
('asset_c3', 'ent_default', 'customer', '拼多多旗舰店（自营）', '{"level":"B","type":"自营","monthly_order":"6万","products":["ZS-BX004","ZS-TW001"],"contact":"运营小刘","last_order":"2026-03-10","cooperation_months":8,"trend":"增长"}', 'user_upload', NOW() - INTERVAL '30 days'),
('asset_c4', 'ent_default', 'customer', '成都新居优选（流失预警）', '{"level":"B","type":"经销商","monthly_order":"2万→0.5万","products":["ZS-LJ002"],"contact":"赵经理","last_order":"2026-02-15","cooperation_months":6,"trend":"下滑","risk":"连续2月下降，可能流失"}', 'skill_execution', NOW() - INTERVAL '5 days');

-- 供应商资产
INSERT INTO enterprise_asset (id, enterprise_id, asset_type, name, content, source, created_at) VALUES
('asset_s1', 'ent_default', 'supplier', '义乌鑫达注塑厂', '{"type":"注塑件","products":["外壳","底座","旋转轴"],"lead_time":"7天","moq":5000,"quality_score":92,"cooperation_years":3}', 'user_upload', NOW() - INTERVAL '90 days'),
('asset_s2', 'ent_default', 'supplier', '台州永佳五金', '{"type":"五金配件","products":["轴承","螺丝","弹簧"],"lead_time":"5天","moq":10000,"quality_score":88,"cooperation_years":2}', 'user_upload', NOW() - INTERVAL '80 days');

-- 偏好资产（由 Skill 执行沉淀）
INSERT INTO enterprise_asset (id, enterprise_id, asset_type, name, content, source, source_skill_id, created_at) VALUES
('asset_pref1', 'ent_default', 'preference', '选品偏好', '{"preferred_categories":["厨房收纳","卫浴收纳"],"price_range":"15-70元","style":"简约/莫兰迪","process":"仅注塑工艺","avoid":["电子元件","玻璃材质"]}', 'skill_execution', 'new_product_plan', NOW() - INTERVAL '10 days'),
('asset_pref2', 'ent_default', 'preference', '定价策略偏好', '{"target_margin":"60%以上","pricing_model":"成本加成+竞品参考","discount_policy":"大客户95折，首单9折","platform_diff":"拼多多低10%，1688批发价另算"}', 'skill_execution', 'pricing_strategy', NOW() - INTERVAL '7 days'),
('asset_pref3', 'ent_default', 'preference', '客户管理偏好', '{"vip_threshold":"月采购5万以上","follow_frequency":"A客户周联系，B客户双周","risk_alert":"连续2月下降即预警","preferred_channel":"微信沟通为主"}', 'skill_execution', 'customer_segmentation', NOW() - INTERVAL '5 days');

-- 执行记录资产（Skill 执行后自动保存的结果摘要）
INSERT INTO enterprise_asset (id, enterprise_id, asset_type, name, content, source, source_skill_id, created_at) VALUES
('asset_exec1', 'ent_default', 'execution_record', '爆款选品分析-3月报告', '{"skill":"new_product_plan","date":"2026-03-06","result":"推荐3个方向：莫兰迪收纳箱、可折叠沥水架、磁吸刀架","chosen":"莫兰迪收纳箱","reason":"符合注塑工艺，毛利60%+"}', 'skill_execution', 'new_product_plan', NOW() - INTERVAL '7 days'),
('asset_exec2', 'ent_default', 'execution_record', '退款分析-2月报告', '{"skill":"refund_analysis","date":"2026-03-03","result":"退款率2.1%，主要问题：壁挂垃圾桶吸盘脱落（占退款45%）","action":"联系供应商改进吸盘材质"}', 'skill_execution', 'refund_analysis', NOW() - INTERVAL '10 days'),
('asset_exec3', 'ent_default', 'execution_record', '客户分群-3月分析', '{"skill":"customer_segmentation","date":"2026-03-08","result":"A类客户2家（占营收65%），B类2家（占25%），C类若干","risk":"成都新居优选连续下滑，建议主动拜访"}', 'skill_execution', 'customer_segmentation', NOW() - INTERVAL '5 days'),
('asset_exec4', 'ent_default', 'execution_record', '经营复盘-3月12日', '{"skill":"inquiry_daily","date":"2026-03-12","result":"日营收4.2万，询盘23条，转化率18%，较上周+5%","highlight":"冰箱侧挂架抖音爆量，日出800单"}', 'skill_execution', 'inquiry_daily', NOW() - INTERVAL '1 day'),
('asset_exec5', 'ent_default', 'execution_record', '经营复盘-3月11日', '{"skill":"inquiry_daily","date":"2026-03-11","result":"日营收3.8万，询盘19条，转化率15%","highlight":"旋转调味盒1688大促备货订单"}', 'skill_execution', 'inquiry_daily', NOW() - INTERVAL '2 days'),
('asset_exec6', 'ent_default', 'execution_record', '定价策略-新品定价', '{"skill":"pricing_strategy","date":"2026-03-09","result":"莫兰迪收纳箱建议定价45元，1688批发价32元，毛利60%","benchmark":"竞品均价42-55元，我们走性价比路线"}', 'skill_execution', 'pricing_strategy', NOW() - INTERVAL '4 days');

-- ============================
-- 2. Skill 定义（注册到 DB，与预装 YAML 对应）
-- ============================
INSERT INTO skill (id, enterprise_id, name, description, skill_type, status, run_mode, version, tags, execution_count, last_executed_at, created_at) VALUES
('new_product_plan', 'ent_default', '爆款选品分析', '基于市场趋势和竞品分析，结合企业工艺能力和偏好，找出潜力爆款方向', 'preset', 'active', 'manual', 1, ARRAY['选品','市场分析','竞品'], 8, NOW() - INTERVAL '7 days', NOW() - INTERVAL '60 days'),
('inquiry_daily', 'ent_default', '每日经营复盘', '每日自动汇总营收、询盘、转化等核心指标，发现异常并给出改进建议', 'preset', 'active', 'scheduled', 1, ARRAY['日报','经营','数据复盘'], 35, NOW() - INTERVAL '1 day', NOW() - INTERVAL '60 days'),
('refund_analysis', 'ent_default', '退款退货分析', '分析退款退货数据，定位问题商品和原因，给出改善方案', 'preset', 'active', 'scheduled', 1, ARRAY['退款','售后','品质'], 12, NOW() - INTERVAL '10 days', NOW() - INTERVAL '45 days'),
('customer_segmentation', 'ent_default', '客户分群运营', '基于RFM模型对客户分群，识别高价值客户和流失风险，制定运营策略', 'preset', 'active', 'manual', 1, ARRAY['客户','分群','RFM','运营'], 6, NOW() - INTERVAL '5 days', NOW() - INTERVAL '40 days'),
('pricing_strategy', 'ent_default', '智能定价策略', '综合成本结构、竞品定价和市场定位，给出最优定价方案', 'preset', 'active', 'manual', 1, ARRAY['定价','利润','竞品'], 5, NOW() - INTERVAL '4 days', NOW() - INTERVAL '35 days')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    run_mode = EXCLUDED.run_mode,
    tags = EXCLUDED.tags,
    execution_count = EXCLUDED.execution_count,
    last_executed_at = EXCLUDED.last_executed_at;

-- ============================
-- 3. 任务记录（10条，覆盖各种状态和触发类型）
-- ============================

-- 先清理可能的旧数据（跳过有外键依赖的）
DELETE FROM skill_execution WHERE enterprise_id = 'ent_default' AND id LIKE 'task_%';

-- 放宽外键
ALTER TABLE skill_execution DROP CONSTRAINT IF EXISTS skill_execution_skill_id_fkey;
ALTER TABLE skill_execution DROP CONSTRAINT IF EXISTS skill_execution_user_id_fkey;
ALTER TABLE skill_execution DROP CONSTRAINT IF EXISTS skill_execution_conversation_id_fkey;

-- 已完成 - 每日经营复盘（今天，定时触发）
INSERT INTO skill_execution (id, enterprise_id, skill_id, skill_name, user_id, trigger_type, status, current_step, total_steps, started_at, completed_at, duration_ms, output_summary, updated_at) VALUES
('task_001', 'ent_default', 'inquiry_daily', '每日经营复盘', NULL, 'scheduled', 'completed', 3, 3,
 NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '135 seconds', 135000,
 '日营收4.2万（↑10%），询盘23条，转化率18%。冰箱侧挂架抖音爆量日出800单。建议加大抖音投放预算。',
 NOW() - INTERVAL '2 hours');

-- 已完成 - 每日经营复盘（昨天，定时触发）
INSERT INTO skill_execution (id, enterprise_id, skill_id, skill_name, user_id, trigger_type, status, current_step, total_steps, started_at, completed_at, duration_ms, output_summary, updated_at) VALUES
('task_002', 'ent_default', 'inquiry_daily', '每日经营复盘', NULL, 'scheduled', 'completed', 3, 3,
 NOW() - INTERVAL '1 day' - INTERVAL '2 hours', NOW() - INTERVAL '1 day' - INTERVAL '2 hours' + INTERVAL '128 seconds', 128000,
 '日营收3.8万，询盘19条，转化率15%。旋转调味盒1688大促备货订单到账12万。',
 NOW() - INTERVAL '1 day');

-- 已完成 - 客户分群运营（手动触发，5天前）
INSERT INTO skill_execution (id, enterprise_id, skill_id, skill_name, user_id, trigger_type, status, current_step, total_steps, started_at, completed_at, duration_ms, output_summary, updated_at) VALUES
('task_003', 'ent_default', 'customer_segmentation', '客户分群运营', 'user_default', 'manual', 'completed', 3, 3,
 NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '180 seconds', 180000,
 'A类客户2家（深圳百纳、杭州绿洁），占营收65%。预警：成都新居优选连续2月下滑，建议本周主动联系。',
 NOW() - INTERVAL '5 days');

-- 已完成 - 爆款选品分析（手动触发，7天前）
INSERT INTO skill_execution (id, enterprise_id, skill_id, skill_name, user_id, trigger_type, status, current_step, total_steps, started_at, completed_at, duration_ms, output_summary, updated_at) VALUES
('task_004', 'ent_default', 'new_product_plan', '爆款选品分析', 'user_default', 'manual', 'completed', 3, 3,
 NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '210 seconds', 210000,
 '推荐3个新品方向：①莫兰迪收纳箱（注塑工艺，毛利60%） ②可折叠沥水架（市场缺口大） ③磁吸刀架（高客单价）。最终选择方向①进入打样。',
 NOW() - INTERVAL '7 days');

-- 已完成 - 智能定价策略（手动触发，4天前）
INSERT INTO skill_execution (id, enterprise_id, skill_id, skill_name, user_id, trigger_type, status, current_step, total_steps, started_at, completed_at, duration_ms, output_summary, updated_at) VALUES
('task_005', 'ent_default', 'pricing_strategy', '智能定价策略', 'user_default', 'manual', 'completed', 3, 3,
 NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '155 seconds', 155000,
 '莫兰迪收纳箱定价方案：零售价45元（毛利60%），1688批发价32元（毛利43.8%），拼多多39.9元（毛利55%）。竞品均价42-55元，性价比优势明显。',
 NOW() - INTERVAL '4 days');

-- 已完成 - 退款分析（定时触发，10天前）
INSERT INTO skill_execution (id, enterprise_id, skill_id, skill_name, user_id, trigger_type, status, current_step, total_steps, started_at, completed_at, duration_ms, output_summary, updated_at) VALUES
('task_006', 'ent_default', 'refund_analysis', '退款退货分析', NULL, 'scheduled', 'completed', 3, 3,
 NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '165 seconds', 165000,
 '2月退款率2.1%（行业均值3.5%）。壁挂垃圾桶吸盘脱落占退款45%，建议更换3M胶材质。冰箱侧挂架零退款。',
 NOW() - INTERVAL '10 days');

-- 运行中 - 退款分析（定时触发，当前正在执行）
INSERT INTO skill_execution (id, enterprise_id, skill_id, skill_name, user_id, trigger_type, status, current_step, total_steps, started_at, output_summary, updated_at) VALUES
('task_007', 'ent_default', 'refund_analysis', '退款退货分析', NULL, 'scheduled', 'running', 2, 3,
 NOW() - INTERVAL '3 minutes',
 '正在分析3月退款数据...',
 NOW() - INTERVAL '30 seconds');

-- 运行中 - 每日经营复盘（定时触发，刚开始）
INSERT INTO skill_execution (id, enterprise_id, skill_id, skill_name, user_id, trigger_type, status, current_step, total_steps, started_at, updated_at) VALUES
('task_008', 'ent_default', 'inquiry_daily', '每日经营复盘', NULL, 'scheduled', 'running', 1, 3,
 NOW() - INTERVAL '45 seconds',
 NOW() - INTERVAL '10 seconds');

-- 失败 - 客户分群（手动，2天前，因数据不足失败）
INSERT INTO skill_execution (id, enterprise_id, skill_id, skill_name, user_id, trigger_type, status, current_step, total_steps, started_at, completed_at, duration_ms, error_message, updated_at) VALUES
('task_009', 'ent_default', 'customer_segmentation', '客户分群运营', 'user_default', 'manual', 'failed', 1, 3,
 NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '45 seconds', 45000,
 'LLM 调用超时：通义千问 API 响应超时（30s），可能是网络波动导致。建议稍后重试。',
 NOW() - INTERVAL '2 days');

-- 待执行 - 爆款选品分析（手动，刚创建）
INSERT INTO skill_execution (id, enterprise_id, skill_id, skill_name, user_id, trigger_type, status, current_step, total_steps, started_at, updated_at) VALUES
('task_010', 'ent_default', 'new_product_plan', '爆款选品分析', 'user_default', 'manual', 'pending', 0, 3,
 NOW(),
 NOW());

-- ============================
-- 4. 数字孪生状态（由 Skill 执行结果汇聚而成）
-- ============================

-- 先删除旧记录（如果有）
DELETE FROM enterprise_state WHERE enterprise_id = 'ent_default';

INSERT INTO enterprise_state (id, enterprise_id, product_state, customer_state, operation_state, team_state, financial_state, updated_at) VALUES
('state_default', 'ent_default',
-- 商品维度：来自选品分析 + 退款分析
'{"active_products":4,"pipeline_products":1,"total_skus":5,"top_seller":"冰箱侧挂置物架(月销6500)","category_breakdown":{"厨房收纳":3,"卫浴收纳":1,"衣物收纳":1},"new_product_direction":"莫兰迪色系收纳箱","refund_rate":"2.1%","quality_issue":"壁挂垃圾桶吸盘脱落(已跟进供应商)","last_skill_run":"爆款选品分析","last_run_at":"2026-03-06","recommendation_count":"3"}',
-- 客户维度：来自客户分群
'{"total_customers":4,"vip_customers":2,"vip_names":"深圳百纳优品, 杭州绿洁家居","vip_revenue_share":"65%","at_risk_customer":"成都新居优选（连续2月下滑）","new_inquiries_weekly":23,"customer_growth":"本月新增询盘87条","repeat_purchase_rate":"42%","last_skill_run":"客户分群运营","last_run_at":"2026-03-08"}',
-- 运营维度：来自每日复盘
'{"daily_revenue":"4.2万","weekly_revenue":"25.6万","monthly_revenue":"87万","inquiry_count":23,"conversion_rate":"18%","platform_breakdown":{"1688":"35%","淘天":"28%","拼多多":"22%","抖音":"15%"},"highlight":"冰箱侧挂架抖音爆量日出800单","week_trend":"+12%","last_skill_run":"每日经营复盘","last_run_at":"2026-03-12","execution_count":"35"}',
-- 团队维度：基础数据
'{"team_size":8,"roles":{"运营":2,"客服":3,"仓储":2,"管理":1},"cs_response_rate":"94%","cs_satisfaction":"4.2/5.0","task_completion_rate":"89%"}',
-- 财务维度：来自定价策略
'{"overall_margin":"63.5%","best_margin_product":"冰箱侧挂架(68.8%)","worst_margin_product":"多层旋转置物架(58.8%)","monthly_cost":"32万","pricing_model":"成本加成+竞品参考","new_product_price":"莫兰迪收纳箱 零售45元/批发32元","last_skill_run":"智能定价策略","last_run_at":"2026-03-09"}',
NOW() - INTERVAL '1 hour');

-- ============================
-- 5. 决策记忆（3条核心决策，与任务/资产关联）
-- ============================
DELETE FROM decision_record WHERE enterprise_id = 'ent_default' AND id LIKE 'dec_%';

INSERT INTO decision_record (id, enterprise_id, skill_id, execution_id, decision_type, context, recommendation, user_choice, outcome, learning, created_at) VALUES
-- 选品决策
('dec_001', 'ent_default', 'new_product_plan', 'task_004', 'product_selection',
 '{"trigger":"Q1新品规划","market_data":"收纳品类增速15%","constraint":"仅注塑工艺"}',
 '{"options":["莫兰迪收纳箱(毛利60%)","可折叠沥水架(市场缺口大)","磁吸刀架(高客单价)"]}',
 '{"chosen":"莫兰迪收纳箱","reason":"符合注塑工艺，莫兰迪风格是目前趋势，毛利率满足60%以上要求"}',
 '{"status":"打样中","expected_launch":"2026-04","sample_cost":"2800元"}',
 '简约设计+注塑工艺的组合是我们的核心能力区，新品应优先在这个范围内寻找机会',
 NOW() - INTERVAL '7 days'),
-- 定价决策
('dec_002', 'ent_default', 'pricing_strategy', 'task_005', 'pricing',
 '{"product":"莫兰迪收纳箱","cost":18,"competitor_range":"42-55元"}',
 '{"retail_price":45,"wholesale_price":32,"pdd_price":39.9,"margin":"60%/43.8%/55%"}',
 '{"accepted":"全部采纳","note":"走性价比路线，先以低价快速起量"}',
 NULL,
 '新品定价低于竞品均价但高于成本2倍以上是安全区间，可以快速验证市场',
 NOW() - INTERVAL '4 days'),
-- 客户管理决策
('dec_003', 'ent_default', 'customer_segmentation', 'task_003', 'customer_mgmt',
 '{"trigger":"月度客户review","data":"4个核心客户RFM数据"}',
 '{"action":"成都新居优选列入流失预警，建议本周主动联系了解原因"}',
 '{"accepted":"同意","plan":"周五电话+微信发新品样品图"}',
 '{"status":"已联系","feedback":"对方反馈竞品价格更低，需要调整报价"}',
 '客户流失预警要在连续2月下降时就介入，等到3个月就来不及了',
 NOW() - INTERVAL '5 days');

-- ============================
-- 完成
-- ============================
-- 数据关系总结：
-- 企业资产(17条) → 5个商品 + 4个客户 + 2个供应商 + 3个偏好 + 6个执行记录
-- Skill(5个) → 对应5个预装Skill，引用企业资产执行分析
-- 任务(10条) → 6完成 + 2运行中 + 1失败 + 1待执行，来自Skill执行
-- 数字孪生 → 五维状态由任务执行结果汇聚：
--   商品 ← 选品分析 + 退款分析
--   客户 ← 客户分群
--   运营 ← 每日复盘
--   财务 ← 定价策略
--   团队 ← 基础配置
-- 决策记忆(3条) → 选品/定价/客户管理决策，关联对应任务
