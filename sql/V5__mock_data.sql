-- V5: Mock 数据 — 张氏家居（义乌）收纳用品工厂
-- 统一企业画像，资产↔Skill↔任务↔数字孪生 逻辑自洽

-- ============================
-- 0. 企业 & 用户
-- ============================
UPDATE enterprise SET
    name = '张氏家居（义乌）',
    industry = '家居收纳',
    scale = '年营收1500万',
    platforms = ARRAY['1688', '淘天', '拼多多', '抖音']
WHERE id = 'ent_default';

UPDATE "user" SET display_name = '张伟' WHERE id = 'user_default';

-- ============================
-- 1. 企业资产
-- ============================
DELETE FROM enterprise_asset WHERE enterprise_id = 'ent_default';

INSERT INTO enterprise_asset (id, enterprise_id, asset_type, name, content, source, created_at) VALUES
('asset_p1', 'ent_default', 'product', '旋转调味料收纳盒', '{"sku":"ZS-TW001","price":38.5,"cost":12.8,"monthly_sales":5200,"status":"爆款","category":"厨房收纳","platforms":["1688","淘天"],"margin_rate":"66.8%","rating":4.8}', 'user_upload', NOW() - INTERVAL '30 days'),
('asset_p2', 'ent_default', 'product', '壁挂折叠垃圾桶', '{"sku":"ZS-LJ002","price":25.9,"cost":8.5,"monthly_sales":3800,"status":"稳定","category":"卫浴收纳","platforms":["1688","拼多多"],"margin_rate":"67.2%","rating":4.6}', 'user_upload', NOW() - INTERVAL '25 days'),
('asset_p3', 'ent_default', 'product', '多层旋转置物架', '{"sku":"ZS-ZW003","price":68.0,"cost":28.0,"monthly_sales":1200,"status":"增长中","category":"厨房收纳","platforms":["淘天","抖音"],"margin_rate":"58.8%","rating":4.7}', 'user_upload', NOW() - INTERVAL '20 days'),
('asset_p4', 'ent_default', 'product', '冰箱侧挂置物架', '{"sku":"ZS-BX004","price":19.9,"cost":6.2,"monthly_sales":6500,"status":"爆款","category":"厨房收纳","platforms":["拼多多","1688"],"margin_rate":"68.8%","rating":4.5}', 'user_upload', NOW() - INTERVAL '15 days'),
('asset_p5', 'ent_default', 'product', '莫兰迪色系收纳箱（新品）', '{"sku":"ZS-SN005","price":45.0,"cost":18.0,"monthly_sales":0,"status":"打样中","category":"衣物收纳","platforms":[]}', 'skill_execution', NOW() - INTERVAL '3 days');

INSERT INTO enterprise_asset (id, enterprise_id, asset_type, name, content, source, created_at) VALUES
('asset_c1', 'ent_default', 'customer', '深圳百纳优品', '{"level":"A","monthly_order":"15万","products":["ZS-TW001","ZS-BX004"],"contact":"李经理","last_order":"2026-03-08","trend":"稳定"}', 'user_upload', NOW() - INTERVAL '60 days'),
('asset_c2', 'ent_default', 'customer', '杭州绿洁家居', '{"level":"A","monthly_order":"8万","products":["ZS-LJ002","ZS-ZW003"],"contact":"王总","last_order":"2026-03-05","trend":"增长"}', 'user_upload', NOW() - INTERVAL '45 days'),
('asset_c3', 'ent_default', 'customer', '拼多多旗舰店（自营）', '{"level":"B","monthly_order":"6万","products":["ZS-BX004","ZS-TW001"],"contact":"运营小刘","trend":"增长"}', 'user_upload', NOW() - INTERVAL '30 days'),
('asset_c4', 'ent_default', 'customer', '成都新居优选（流失预警）', '{"level":"B","monthly_order":"0.5万","products":["ZS-LJ002"],"contact":"赵经理","last_order":"2026-02-15","trend":"下滑","risk":"连续2月下降"}', 'skill_execution', NOW() - INTERVAL '5 days');

INSERT INTO enterprise_asset (id, enterprise_id, asset_type, name, content, source, created_at) VALUES
('asset_s1', 'ent_default', 'supplier', '义乌鑫达注塑厂', '{"type":"注塑件","lead_time":"7天","moq":5000,"quality_score":92}', 'user_upload', NOW() - INTERVAL '90 days'),
('asset_s2', 'ent_default', 'supplier', '台州永佳五金', '{"type":"五金配件","lead_time":"5天","moq":10000,"quality_score":88}', 'user_upload', NOW() - INTERVAL '80 days');

INSERT INTO enterprise_asset (id, enterprise_id, asset_type, name, content, source, source_skill_id, created_at) VALUES
('asset_pref1', 'ent_default', 'preference', '选品偏好', '{"categories":["厨房收纳","卫浴收纳"],"price_range":"15-70元","style":"简约/莫兰迪","process":"仅注塑工艺"}', 'skill_execution', 'product_selection', NOW() - INTERVAL '10 days'),
('asset_pref2', 'ent_default', 'preference', '定价偏好', '{"target_margin":"60%以上","platform_diff":"拼多多低10%，1688批发价另算"}', 'skill_execution', 'pricing_strategy', NOW() - INTERVAL '7 days');

INSERT INTO enterprise_asset (id, enterprise_id, asset_type, name, content, source, source_skill_id, created_at) VALUES
('asset_exec1', 'ent_default', 'execution_record', '爆款选品-3月', '{"skill":"product_selection","result":"推荐莫兰迪收纳箱、可折叠沥水架、磁吸刀架","chosen":"莫兰迪收纳箱"}', 'skill_execution', 'product_selection', NOW() - INTERVAL '7 days'),
('asset_exec2', 'ent_default', 'execution_record', '退款分析-2月', '{"skill":"refund_analysis","result":"退款率2.1%，壁挂垃圾桶吸盘脱落占45%","action":"改进吸盘材质"}', 'skill_execution', 'refund_analysis', NOW() - INTERVAL '10 days'),
('asset_exec3', 'ent_default', 'execution_record', '客户分群-3月', '{"skill":"customer_segmentation","result":"A类2家占65%，B类2家占25%","risk":"成都新居优选下滑"}', 'skill_execution', 'customer_segmentation', NOW() - INTERVAL '5 days'),
('asset_exec4', 'ent_default', 'execution_record', '每日经营-今日', '{"skill":"inquiry_daily","result":"日营收4.2万，询盘23条，转化18%","highlight":"冰箱侧挂架抖音日出800单"}', 'skill_execution', 'inquiry_daily', NOW() - INTERVAL '2 hours'),
('asset_exec5', 'ent_default', 'execution_record', '定价策略-新品', '{"skill":"pricing_strategy","result":"莫兰迪收纳箱零售45/批发32元，毛利60%"}', 'skill_execution', 'pricing_strategy', NOW() - INTERVAL '4 days');

-- ============================
-- 2. Skill 定义（与预装 YAML 对应）
-- ============================
INSERT INTO skill (id, enterprise_id, name, description, skill_type, status, run_mode, version, tags, execution_count, last_executed_at, created_at) VALUES
('inquiry_daily', 'ent_default', '每日经营看板', '汇总今日经营数据，生成经营日报', 'preset', 'active', 'scheduled', 1, ARRAY['日报','经营','看板'], 35, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '60 days'),
('weekly_report', 'ent_default', '经营周报', '汇总一周经营数据生成周报', 'preset', 'active', 'scheduled', 1, ARRAY['周报','经营'], 8, NOW() - INTERVAL '3 days', NOW() - INTERVAL '45 days'),
('product_selection', 'ent_default', '爆款选品分析', '分析市场趋势筛选高潜力商品', 'preset', 'active', 'manual', 1, ARRAY['选品','爆款'], 8, NOW() - INTERVAL '7 days', NOW() - INTERVAL '60 days'),
('refund_analysis', 'ent_default', '退款退货分析', '分析退款原因和问题商品', 'preset', 'active', 'scheduled', 1, ARRAY['退款','售后'], 12, NOW() - INTERVAL '10 days', NOW() - INTERVAL '45 days'),
('customer_segmentation', 'ent_default', '客户分群运营', '基于RFM做客户分群和运营策略', 'preset', 'active', 'manual', 1, ARRAY['客户','分群','RFM'], 6, NOW() - INTERVAL '5 days', NOW() - INTERVAL '40 days'),
('pricing_strategy', 'ent_default', '智能定价策略', '综合成本竞品给出定价方案', 'preset', 'active', 'manual', 1, ARRAY['定价','利润'], 5, NOW() - INTERVAL '4 days', NOW() - INTERVAL '35 days'),
('anomaly_alert', 'ent_default', '异常检测与告警', '检测销量评价退款等指标异常', 'preset', 'active', 'scheduled', 1, ARRAY['异常','告警'], 4, NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 days'),
('order_fulfillment_check', 'ent_default', '订单履约检查', '检查待发货超时订单', 'preset', 'active', 'scheduled', 1, ARRAY['履约','订单'], 21, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '30 days'),
('generate_summary', 'ent_default', '智能汇总报告', '汇总分析结果生成报告', 'preset', 'active', 'manual', 1, ARRAY['报告','汇总'], 15, NOW() - INTERVAL '2 days', NOW() - INTERVAL '50 days'),
('fetch_platform_data', 'ent_default', '平台数据同步', '从电商平台拉取经营数据', 'preset', 'active', 'scheduled', 1, ARRAY['数据','同步'], 42, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '60 days'),
('competitor_monitor', 'ent_default', '竞品监控分析', '追踪竞品价格新品营销动态', 'preset', 'active', 'scheduled', 1, ARRAY['竞品','监控'], 6, NOW() - INTERVAL '2 days', NOW() - INTERVAL '30 days'),
('retention_campaign', 'ent_default', '流失挽回活动策划', '策划老客召回活动', 'preset', 'active', 'manual', 1, ARRAY['流失','召回'], 2, NOW() - INTERVAL '5 days', NOW() - INTERVAL '20 days')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    run_mode = EXCLUDED.run_mode,
    tags = EXCLUDED.tags,
    execution_count = EXCLUDED.execution_count,
    last_executed_at = EXCLUDED.last_executed_at;

-- ============================
-- 3. 独立任务（skill_execution，无 workflow_execution_id）
-- ============================
DELETE FROM skill_execution WHERE enterprise_id = 'ent_default' AND id LIKE 'task_%';
ALTER TABLE skill_execution DROP CONSTRAINT IF EXISTS skill_execution_skill_id_fkey;
ALTER TABLE skill_execution DROP CONSTRAINT IF EXISTS skill_execution_user_id_fkey;
ALTER TABLE skill_execution DROP CONSTRAINT IF EXISTS skill_execution_conversation_id_fkey;

INSERT INTO skill_execution (id, enterprise_id, skill_id, skill_name, user_id, trigger_type, status, current_step, total_steps, started_at, completed_at, duration_ms, output_summary, updated_at) VALUES
('task_001', 'ent_default', 'inquiry_daily', '每日经营看板', NULL, 'scheduled', 'completed', 3, 3,
 NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '135 seconds', 135000,
 '日营收4.2万↑10%，询盘23条，转化18%。冰箱侧挂架抖音日出800单。建议加大抖音投放。', NOW() - INTERVAL '2 hours'),
('task_002', 'ent_default', 'inquiry_daily', '每日经营看板', NULL, 'scheduled', 'completed', 3, 3,
 NOW() - INTERVAL '1 day' - INTERVAL '2 hours', NOW() - INTERVAL '1 day' - INTERVAL '2 hours' + INTERVAL '128 seconds', 128000,
 '日营收3.8万，询盘19条，转化15%。旋转调味盒1688大促备货12万。', NOW() - INTERVAL '1 day'),
('task_003', 'ent_default', 'customer_segmentation', '客户分群运营', 'user_default', 'manual', 'completed', 3, 3,
 NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '180 seconds', 180000,
 'A类2家（深圳百纳、杭州绿洁）占65%。预警：成都新居优选连续2月下滑。', NOW() - INTERVAL '5 days'),
('task_004', 'ent_default', 'product_selection', '爆款选品分析', 'user_default', 'manual', 'completed', 3, 3,
 NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '210 seconds', 210000,
 '推荐①莫兰迪收纳箱 ②可折叠沥水架 ③磁吸刀架。选择①进入打样。', NOW() - INTERVAL '7 days'),
('task_005', 'ent_default', 'pricing_strategy', '智能定价策略', 'user_default', 'manual', 'completed', 3, 3,
 NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '155 seconds', 155000,
 '莫兰迪收纳箱：零售45/批发32/拼多多39.9元，毛利60%。竞品42-55元。', NOW() - INTERVAL '4 days'),
('task_006', 'ent_default', 'refund_analysis', '退款退货分析', NULL, 'scheduled', 'completed', 3, 3,
 NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '165 seconds', 165000,
 '2月退款率2.1%。壁挂垃圾桶吸盘脱落占45%，建议更换3M胶。', NOW() - INTERVAL '10 days'),
('task_007', 'ent_default', 'order_fulfillment_check', '订单履约检查', NULL, 'scheduled', 'running', 2, 3,
 NOW() - INTERVAL '3 minutes', NULL, NULL, '正在检查待发货订单...', NOW() - INTERVAL '30 seconds'),
('task_008', 'ent_default', 'anomaly_alert', '异常检测与告警', NULL, 'scheduled', 'running', 1, 2,
 NOW() - INTERVAL '45 seconds', NULL, NULL, NULL, NOW() - INTERVAL '10 seconds'),
('task_009', 'ent_default', 'customer_segmentation', '客户分群运营', 'user_default', 'manual', 'failed', 1, 3,
 NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '45 seconds', 45000,
 'LLM 调用超时，建议稍后重试。', NOW() - INTERVAL '2 days'),
('task_010', 'ent_default', 'weekly_report', '经营周报', 'user_default', 'manual', 'pending', 0, 2,
 NOW(), NULL, NULL, NULL, NOW());

-- ============================
-- 4. 数字孪生状态
-- ============================
DELETE FROM enterprise_state WHERE enterprise_id = 'ent_default';

INSERT INTO enterprise_state (id, enterprise_id, product_state, customer_state, operation_state, team_state, financial_state, updated_at) VALUES
('state_default', 'ent_default',
'{"active_products":4,"pipeline_products":1,"total_skus":5,"top_seller":"冰箱侧挂置物架(月销6500)","category_breakdown":{"厨房收纳":3,"卫浴收纳":1,"衣物收纳":1},"new_product":"莫兰迪收纳箱","refund_rate":"2.1%","quality_issue":"壁挂垃圾桶吸盘脱落"}',
'{"total_customers":4,"vip_customers":2,"vip_names":"深圳百纳优品, 杭州绿洁家居","vip_revenue_share":"65%","at_risk":"成都新居优选","new_inquiries_weekly":23,"repeat_rate":"42%"}',
'{"daily_revenue":"4.2万","weekly_revenue":"25.6万","monthly_revenue":"87万","inquiry_count":23,"conversion_rate":"18%","platforms":{"1688":"35%","淘天":"28%","拼多多":"22%","抖音":"15%"},"highlight":"冰箱侧挂架抖音日出800单","week_trend":"+12%"}',
'{"team_size":8,"roles":{"运营":2,"客服":3,"仓储":2,"管理":1},"cs_response":"94%","cs_satisfaction":"4.2"}',
'{"overall_margin":"63.5%","best_product":"冰箱侧挂架68.8%","worst_product":"多层置物架58.8%","monthly_cost":"32万","new_product_price":"莫兰迪收纳箱45/32元"}',
NOW() - INTERVAL '1 hour');

-- ============================
-- 5. 决策记忆
-- ============================
DELETE FROM decision_record WHERE enterprise_id = 'ent_default' AND id LIKE 'dec_%';

INSERT INTO decision_record (id, enterprise_id, skill_id, execution_id, decision_type, context, recommendation, user_choice, outcome, learning, created_at) VALUES
('dec_001', 'ent_default', 'product_selection', 'task_004', 'product_selection',
 '{"trigger":"Q1新品规划","market_data":"收纳品类增速15%"}',
 '{"options":["莫兰迪收纳箱","可折叠沥水架","磁吸刀架"]}',
 '{"chosen":"莫兰迪收纳箱","reason":"符合注塑工艺，毛利60%+"}',
 '{"status":"打样中","expected_launch":"2026-04"}',
 '简约+注塑是我们的核心能力区',
 NOW() - INTERVAL '7 days'),
('dec_002', 'ent_default', 'pricing_strategy', 'task_005', 'pricing',
 '{"product":"莫兰迪收纳箱","cost":18,"competitor":"42-55元"}',
 '{"retail":45,"wholesale":32,"pdd":39.9}',
 '{"accepted":"全部采纳","note":"性价比路线快速起量"}',
 NULL, '新品定价低于竞品但高于成本2倍是安全区间', NOW() - INTERVAL '4 days'),
('dec_003', 'ent_default', 'customer_segmentation', 'task_003', 'customer_mgmt',
 '{"trigger":"月度review"}',
 '{"action":"成都新居优选列入预警，本周主动联系"}',
 '{"accepted":"同意","plan":"周五电话+发新品样品图"}',
 '{"status":"已联系","feedback":"竞品价格更低需调整报价"}',
 '流失预警要连续2月下降时就介入', NOW() - INTERVAL '5 days');
