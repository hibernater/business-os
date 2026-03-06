"""
电商平台数据对接：统一接口 + Mock 数据源。
后续替换为真实平台 API（淘天/拼多多/1688/抖音）只需实现相同接口。
"""

from __future__ import annotations
import random
from datetime import datetime, timedelta
from tools.registry import register_tool


# ========== 统一数据接口 ==========

async def query_orders(params: dict) -> str:
    """查询订单数据"""
    platform = params.get("platform", "all")
    days = int(params.get("days", 7))
    return _mock_orders(platform, days)


async def query_products(params: dict) -> str:
    """查询商品数据"""
    platform = params.get("platform", "all")
    sort_by = params.get("sort_by", "sales")
    return _mock_products(platform, sort_by)


async def query_traffic(params: dict) -> str:
    """查询流量数据"""
    platform = params.get("platform", "all")
    days = int(params.get("days", 7))
    return _mock_traffic(platform, days)


async def query_refunds(params: dict) -> str:
    """查询退款数据"""
    platform = params.get("platform", "all")
    days = int(params.get("days", 30))
    return _mock_refunds(platform, days)


async def query_competitor(params: dict) -> str:
    """查询竞品数据"""
    keyword = params.get("keyword", "")
    platform = params.get("platform", "taobao")
    return _mock_competitor(keyword, platform)


# ========== Mock 数据生成 ==========

def _mock_orders(platform: str, days: int) -> str:
    total_orders = random.randint(50, 300) * days
    total_gmv = total_orders * random.randint(30, 150)
    avg_order = total_gmv / total_orders if total_orders > 0 else 0
    refund_rate = round(random.uniform(2, 8), 1)

    lines = [
        f"【模拟数据】{platform} 平台近 {days} 天订单概况：",
        f"- 总订单数: {total_orders}",
        f"- 总GMV: ¥{total_gmv:,.0f}",
        f"- 客单价: ¥{avg_order:.0f}",
        f"- 退款率: {refund_rate}%",
        f"- 日均订单: {total_orders // days}",
        "",
        "日期 | 订单数 | GMV | 客单价",
        "--- | --- | --- | ---",
    ]
    for i in range(min(days, 7)):
        d = (datetime.now() - timedelta(days=i)).strftime("%m-%d")
        daily_orders = random.randint(30, 200)
        daily_gmv = daily_orders * random.randint(30, 150)
        lines.append(f"{d} | {daily_orders} | ¥{daily_gmv:,} | ¥{daily_gmv // daily_orders}")

    return "\n".join(lines)


def _mock_products(platform: str, sort_by: str) -> str:
    products = [
        ("收纳箱大号", 89, 1520, 4.8),
        ("折叠收纳袋", 29, 3200, 4.7),
        ("桌面收纳盒", 49, 2100, 4.9),
        ("衣物收纳箱", 69, 980, 4.6),
        ("鞋子收纳盒", 35, 1800, 4.8),
        ("化妆品收纳", 59, 1350, 4.7),
        ("厨房收纳架", 129, 650, 4.5),
        ("书桌收纳", 79, 890, 4.8),
    ]

    if sort_by == "price":
        products.sort(key=lambda x: x[1], reverse=True)
    else:
        products.sort(key=lambda x: x[2], reverse=True)

    lines = [
        f"【模拟数据】{platform} 平台商品数据（按{sort_by}排序）：",
        "",
        "商品 | 售价 | 月销量 | 评分",
        "--- | --- | --- | ---",
    ]
    for name, price, sales, rating in products:
        lines.append(f"{name} | ¥{price} | {sales} | {rating}")

    return "\n".join(lines)


def _mock_traffic(platform: str, days: int) -> str:
    lines = [
        f"【模拟数据】{platform} 平台近 {days} 天流量数据：",
        "",
        "日期 | UV | PV | 转化率 | 加购率",
        "--- | --- | --- | --- | ---",
    ]
    for i in range(min(days, 7)):
        d = (datetime.now() - timedelta(days=i)).strftime("%m-%d")
        uv = random.randint(500, 3000)
        pv = uv * random.randint(2, 5)
        cvr = round(random.uniform(1.5, 5.0), 1)
        cart = round(random.uniform(5, 15), 1)
        lines.append(f"{d} | {uv} | {pv} | {cvr}% | {cart}%")

    total_uv = random.randint(5000, 20000)
    lines.append(f"\n近{days}天汇总: UV {total_uv:,}, 平均转化率 {round(random.uniform(2, 4), 1)}%")
    return "\n".join(lines)


def _mock_refunds(platform: str, days: int) -> str:
    reasons = [
        ("质量问题", 28),
        ("与描述不符", 22),
        ("不想要了/拍错了", 18),
        ("物流问题", 12),
        ("尺寸不合适", 10),
        ("包装破损", 6),
        ("其他", 4),
    ]
    total_refunds = random.randint(20, 100) * (days // 7 + 1)
    lines = [
        f"【模拟数据】{platform} 平台近 {days} 天退款数据：",
        f"- 退款总数: {total_refunds} 单",
        f"- 退款金额: ¥{total_refunds * random.randint(30, 80):,}",
        f"- 退款率: {round(random.uniform(3, 8), 1)}%",
        "",
        "退款原因 | 占比 | 数量",
        "--- | --- | ---",
    ]
    for reason, pct in reasons:
        count = int(total_refunds * pct / 100)
        lines.append(f"{reason} | {pct}% | {count}")

    return "\n".join(lines)


def _mock_competitor(keyword: str, platform: str) -> str:
    competitors = []
    for i in range(5):
        competitors.append({
            "shop": f"竞品店铺{chr(65 + i)}",
            "product": f"{keyword or '同类'} 款式{i + 1}",
            "price": random.randint(20, 200),
            "monthly_sales": random.randint(500, 5000),
            "rating": round(random.uniform(4.3, 4.9), 1),
            "reviews": random.randint(100, 3000),
        })

    lines = [
        f"【模拟数据】{platform} 搜索「{keyword or '关键词'}」竞品分析：",
        "",
        "店铺 | 产品 | 售价 | 月销 | 评分 | 评价数",
        "--- | --- | --- | --- | --- | ---",
    ]
    for c in competitors:
        lines.append(
            f"{c['shop']} | {c['product']} | ¥{c['price']} | {c['monthly_sales']} | {c['rating']} | {c['reviews']}"
        )

    return "\n".join(lines)


def register_ecommerce_tools():
    """注册电商平台 Tool"""
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
