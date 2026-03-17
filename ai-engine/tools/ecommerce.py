"""
电商平台数据对接：统一接口 + Mock 数据源（张氏家居 确定性数据）
与 V5/V6 mock 一致：收纳品类、1688/淘天/拼多多/抖音
"""

from __future__ import annotations
from datetime import datetime, timedelta
from tools.registry import register_tool


# 张氏家居 确定性 mock：与 SQL mock 数据对齐
_ENT_DATA = {
    "products": [
        ("旋转调味料收纳盒", 38.5, 5200, 4.8),
        ("壁挂折叠垃圾桶", 25.9, 3800, 4.6),
        ("多层旋转置物架", 68.0, 1200, 4.7),
        ("冰箱侧挂置物架", 19.9, 6500, 4.5),
        ("莫兰迪收纳箱", 45.0, 0, 0),
    ],
    "platforms": ["1688", "淘天", "拼多多", "抖音"],
    "daily_gmv_base": 42000,
    "refund_rate": 2.1,
    "conversion_rate": 18,
}


def _stable_seed(platform: str, days: int) -> int:
    """基于 platform+days 生成稳定种子，替代 random"""
    return hash(f"{platform}_{days}") % 10000


def _mock_orders(platform: str, days: int) -> str:
    base = _ENT_DATA["daily_gmv_base"]
    seed = _stable_seed(platform, days)
    total_orders = 180 + (seed % 80) * (days // 7 + 1)
    total_gmv = int(base * days * (0.9 + (seed % 20) / 100))
    avg_order = total_gmv // total_orders if total_orders > 0 else 80

    lines = [
        f"【模拟数据】{platform} 平台近 {days} 天订单概况：",
        f"- 总订单数: {total_orders}",
        f"- 总GMV: ¥{total_gmv:,}",
        f"- 客单价: ¥{avg_order}",
        f"- 退款率: {_ENT_DATA['refund_rate']}%",
        f"- 日均订单: {total_orders // max(1, days)}",
        "",
        "日期 | 订单数 | GMV | 客单价",
        "--- | --- | --- | ---",
    ]
    for i in range(min(days, 7)):
        d = (datetime.now() - timedelta(days=i)).strftime("%m-%d")
        daily_orders = 80 + (seed + i) % 60
        daily_gmv = daily_orders * (70 + (seed + i) % 40)
        lines.append(f"{d} | {daily_orders} | ¥{daily_gmv:,} | ¥{daily_gmv // daily_orders}")
    return "\n".join(lines)


def _mock_products(platform: str, sort_by: str) -> str:
    products = list(_ENT_DATA["products"])
    if sort_by == "price":
        products = sorted(products, key=lambda x: x[1], reverse=True)
    else:
        products = sorted(products, key=lambda x: x[2], reverse=True)

    lines = [
        f"【模拟数据】{platform} 平台商品数据（按{sort_by}排序）：",
        "",
        "商品 | 售价 | 月销量 | 评分",
        "--- | --- | --- | ---",
    ]
    for name, price, sales, rating in products:
        r = f"{rating}" if rating else "-"
        lines.append(f"{name} | ¥{price} | {sales} | {r}")
    return "\n".join(lines)


def _mock_traffic(platform: str, days: int) -> str:
    seed = _stable_seed(platform, days)
    lines = [
        f"【模拟数据】{platform} 平台近 {days} 天流量数据：",
        "",
        "日期 | UV | PV | 转化率 | 加购率",
        "--- | --- | --- | --- | ---",
    ]
    for i in range(min(days, 7)):
        d = (datetime.now() - timedelta(days=i)).strftime("%m-%d")
        uv = 1200 + (seed + i * 100) % 800
        pv = uv * (3 + (seed + i) % 2)
        cvr = _ENT_DATA["conversion_rate"] + (seed + i) % 4 - 2
        cart = 8 + (seed + i) % 5
        lines.append(f"{d} | {uv} | {pv} | {cvr}% | {cart}%")
    total_uv = 8500 + seed * 2
    lines.append(f"\n近{days}天汇总: UV {total_uv:,}, 平均转化率 {_ENT_DATA['conversion_rate']}%")
    return "\n".join(lines)


def _mock_refunds(platform: str, days: int) -> str:
    seed = _stable_seed(platform, days)
    total_refunds = 35 + (seed % 25) * (days // 7 + 1)
    reasons = [
        ("吸盘/胶条脱落", 32),
        ("与描述不符", 22),
        ("不想要了/拍错", 18),
        ("物流问题", 12),
        ("尺寸不合适", 10),
        ("包装破损", 4),
        ("其他", 2),
    ]
    lines = [
        f"【模拟数据】{platform} 平台近 {days} 天退款数据：",
        f"- 退款总数: {total_refunds} 单",
        f"- 退款金额: ¥{total_refunds * 45:,}",
        f"- 退款率: {_ENT_DATA['refund_rate']}%",
        "",
        "退款原因 | 占比 | 数量",
        "--- | --- | ---",
    ]
    for reason, pct in reasons:
        count = int(total_refunds * pct / 100)
        lines.append(f"{reason} | {pct}% | {count}")
    return "\n".join(lines)


def _mock_competitor(keyword: str, platform: str) -> str:
    kw = keyword or "收纳"
    competitors = [
        ("收纳生活馆", f"{kw}款式A", 42, 3800, 4.7, 1250),
        ("居家好物", f"{kw}款式B", 55, 2100, 4.8, 890),
        ("简约家居", f"{kw}款式C", 38, 5200, 4.6, 2100),
        ("品质收纳", f"{kw}款式D", 48, 2800, 4.9, 750),
        ("实用主义", f"{kw}款式E", 35, 4500, 4.5, 1800),
    ]
    lines = [
        f"【模拟数据】{platform} 搜索「{kw}」竞品分析：",
        "",
        "店铺 | 产品 | 售价 | 月销 | 评分 | 评价数",
        "--- | --- | --- | --- | --- | ---",
    ]
    for shop, prod, price, sales, rating, reviews in competitors:
        lines.append(f"{shop} | {prod} | ¥{price} | {sales} | {rating} | {reviews}")
    return "\n".join(lines)


# ========== 统一数据接口 ==========

async def query_orders(params: dict) -> str:
    platform = params.get("platform", "all")
    days = int(params.get("days", 7))
    return _mock_orders(platform, days)


async def query_products(params: dict) -> str:
    platform = params.get("platform", "all")
    sort_by = params.get("sort_by", "sales")
    return _mock_products(platform, sort_by)


async def query_traffic(params: dict) -> str:
    platform = params.get("platform", "all")
    days = int(params.get("days", 7))
    return _mock_traffic(platform, days)


async def query_refunds(params: dict) -> str:
    platform = params.get("platform", "all")
    days = int(params.get("days", 30))
    return _mock_refunds(platform, days)


async def query_competitor(params: dict) -> str:
    keyword = params.get("keyword", "")
    platform = params.get("platform", "taobao")
    return _mock_competitor(keyword, platform)


def register_ecommerce_tools():
    register_tool(
        name="query_orders",
        description="查询电商平台订单数据（支持淘天/拼多多/1688/抖音）",
        func=query_orders,
        category="ecommerce",
        param_schema={"platform": "平台(all/taobao/pdd/1688/douyin)", "days": "天数"},
    )
    register_tool(
        name="query_products",
        description="查询商品数据（销量/价格排序）",
        func=query_products,
        category="ecommerce",
        param_schema={"platform": "平台", "sort_by": "排序(sales/price)"},
    )
    register_tool(
        name="query_traffic",
        description="查询店铺流量数据（UV/PV/转化率）",
        func=query_traffic,
        category="ecommerce",
        param_schema={"platform": "平台", "days": "天数"},
    )
    register_tool(
        name="query_refunds",
        description="查询退款退货数据",
        func=query_refunds,
        category="ecommerce",
        param_schema={"platform": "平台", "days": "天数"},
    )
    register_tool(
        name="query_competitor",
        description="查询竞品数据（价格/销量/评价）",
        func=query_competitor,
        category="ecommerce",
        param_schema={"keyword": "搜索关键词", "platform": "平台"},
    )
