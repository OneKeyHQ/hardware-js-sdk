#!/usr/bin/env python3
"""Build signed Pro2 Portfolio fixtures with firmware-pro2's canonical packer."""

from __future__ import annotations

import argparse
import copy
import json
import subprocess
import tempfile
from pathlib import Path
from typing import Any


PLAYGROUND_ROOT = Path(__file__).resolve().parents[2]
REPOSITORY_ROOT = PLAYGROUND_ROOT.parents[2]
DEFAULT_FIRMWARE_ROOT = REPOSITORY_ROOT.parent / "firmware-pro2"
DEFAULT_APP_ROOT = REPOSITORY_ROOT.parent / "app-monorepo"
DEFAULT_OUTPUT = PLAYGROUND_ROOT / "public" / "portfolio-cases"
TIMESTAMP_MS = 1785200000000
OTHER_TOKEN_COLOR = 0x8C8C8C
TOKEN_COLORS = [0xF7931A, 0x8C8CFF, 0x14F195, 0x2775CA, 0x26A17B]

TokenMapping = tuple[str, str, str, str, str]


def require_source_markers(path: Path, markers: list[str]) -> None:
    source = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in source]
    if missing:
        raise RuntimeError(f"Portfolio contract changed in {path}: missing {missing}")

NATIVE_TOKEN_MAPPINGS: list[TokenMapping] = [
    ("BTC", "Bitcoin", "btc--0", "", "BTC"),
    ("DOGE", "Dogecoin", "doge--0", "", "DOGE"),
    ("BCH", "Bitcoin Cash", "bch--0", "", "BCH"),
    ("LTC", "Litecoin", "ltc--0", "", "LTC"),
    ("XNA", "Neurai", "neurai--0", "", "XNA"),
    ("TBTC", "Bitcoin", "tbtc--0", "", "BTC"),
    ("SBTC", "Bitcoin", "tbtc--1", "", "BTC"),
    ("ETH", "Ethereum", "evm--1", "", "ETH"),
    ("BNB", "BNB", "evm--56", "", "BNB"),
    ("POL", "POL", "evm--137", "", "POL"),
    ("ETH", "Ethereum", "evm--42161", "", "ETH"),
    ("AVAX", "Avalanche", "evm--43114", "", "AVAX"),
    ("ETH", "Ethereum", "evm--10", "", "ETH"),
    ("ETH", "Ethereum", "evm--324", "", "ETH"),
    ("MNT", "Mantle", "evm--5000", "", "MNT"),
    ("ETH", "Ethereum", "evm--59144", "", "ETH"),
    ("KAVA", "Kava", "evm--2222", "", "KAVA"),
    ("FIL", "Filecoin", "evm--314", "", "FIL"),
    ("ETHW", "EthereumPoW", "evm--10001", "", "ETHW"),
    ("TETH", "Ethereum", "evm--11155111", "", "ETH"),
    ("ETC", "Ethereum Classic", "evm--61", "", "ETC"),
    ("CRO", "Cronos", "evm--25", "", "CRO"),
    ("CFX", "Conflux", "evm--1030", "", "CFX"),
    ("ETH", "Ethereum", "evm--288", "", "ETH"),
    ("ETH", "Ethereum", "evm--8453", "", "ETH"),
    ("ETH", "Ethereum", "evm--1313161554", "", "ETH"),
    ("S", "Sonic", "evm--146", "", "S"),
    ("HSK", "HashKey Chain", "evm--177", "", "HSK"),
    ("ETH", "Ethereum", "evm--560048", "", "ETH"),
    ("TIA", "Celestia", "cosmos--celestia", "", "TIA"),
    ("SCRT", "Secret Network", "cosmos--secret-4", "", "SCRT"),
    ("JUNO", "Juno", "cosmos--juno-1", "", "JUNO"),
    ("FET", "Fetch.ai", "cosmos--fetchhub-4", "", "FET"),
    ("CRO", "Cronos", "cosmos--crypto-org-chain-mainnet-1", "", "CRO"),
    ("AKT", "Akash", "cosmos--akashnet-2", "", "AKT"),
    ("OSMO", "Osmosis", "cosmos--osmosis-1", "", "OSMO"),
    ("ATOM", "Cosmos", "cosmos--cosmoshub-4", "", "ATOM"),
    ("BABY", "Babylon", "cosmos--bbn-1", "", "BABY"),
    ("TBABY", "Babylon", "cosmos--bbn-test-5", "", "BABY"),
    ("USDC", "USD Coin", "cosmos--noble-1", "", "USDC"),
    ("ASTR", "Astar", "dot--astar", "", "ASTR"),
    ("MANTA", "Manta", "dot--manta", "", "MANTA"),
    ("DOT", "Polkadot", "dot--asset-hub", "", "DOT"),
    ("KSM", "Kusama", "dot--kusama-assethub", "", "KSM"),
    ("APT", "Aptos", "aptos--1", "0x1::aptos_coin::AptosCoin", "APT"),
    ("ADA", "Cardano", "ada--0", "", "ADA"),
    ("XRP", "XRP", "xrp--0", "", "XRP"),
    ("nostr", "Nostr", "nostr--0", "", "NOSTR"),
    ("NEAR", "NEAR", "near--0", "", "NEAR"),
    ("TRX", "TRON", "tron--0x2b6653dc", "", "TRON"),
    ("CFX", "Conflux", "cfx--1029", "", "CFX"),
    ("SOL", "Solana", "sol--101", "", "SOL"),
    ("NEX", "Nexa", "nexa--0", "", "NEX"),
    ("KAS", "Kaspa", "kaspa--kaspa", "", "KAS"),
    ("FIL", "Filecoin", "fil--314", "", "FIL"),
    ("ALGO", "Algorand", "algo--4160", "", "ALGO"),
    ("SUI", "Sui", "sui--mainnet", "0x2::sui::SUI", "SUI"),
    ("CKB", "Nervos", "nervos--mainnet", "", "CKB"),
    ("ALPH", "Alephium", "alph--mainnet", "", "ALPH"),
    ("GRAM", "TON", "ton--mainnet", "", "TON"),
    ("BFC", "BenFen", "bfc--mainnet", "", "BFC"),
    ("XLM", "Stellar", "stellar--mainnet", "", "XLM"),
    ("XLM", "Stellar", "stellar--testnet", "", "XLM"),
]

CONTRACT_TOKEN_MAPPINGS: list[TokenMapping] = [
    (
        "USDT",
        "Tether USD",
        "evm--1",
        "0xdac17f958d2ee523a2206206994597c13d831ec7",
        "USDT",
    ),
    (
        "USDC",
        "USD Coin",
        "evm--1",
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDC",
    ),
    (
        "USDT",
        "Tether USD",
        "evm--56",
        "0x55d398326f99059ff775485246999027b3197955",
        "USDT",
    ),
    (
        "USDC",
        "USD Coin",
        "evm--56",
        "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDC",
    ),
    (
        "USDT",
        "Tether USD",
        "evm--137",
        "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
        "USDT",
    ),
    (
        "USDC",
        "USD Coin",
        "evm--137",
        "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
        "USDC",
    ),
    (
        "USDT",
        "Tether USD",
        "sol--101",
        "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        "USDT",
    ),
    (
        "USDC",
        "USD Coin",
        "sol--101",
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "USDC",
    ),
    (
        "USDT",
        "Tether USD",
        "tron--0x2b6653dc",
        "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        "USDT",
    ),
]

AGGREGATE_TOKEN_MAPPINGS: list[TokenMapping] = [
    ("BTC", "Bitcoin", "", "", "BTC"),
    ("ETH", "Ethereum", "", "", "ETH"),
    ("BNB", "BNB", "", "", "BNB"),
    ("SOL", "Solana", "", "", "SOL"),
    ("TRX", "TRON", "", "", "TRON"),
    ("USDC", "USD Coin", "", "", "USDC"),
    ("USDT", "Tether USD", "", "", "USDT"),
    ("XRP", "XRP", "", "", "XRP"),
]


def token(
    symbol: str,
    name: str,
    balance: str,
    fiat: str,
    percentage: float,
    color: int,
    network_id: str,
    *,
    is_native: bool,
    is_all_networks: bool = False,
    contract_address: str = "",
    icon_name: str | None = None,
) -> dict[str, Any]:
    return {
        "symbol": symbol,
        "name": name,
        "contractAddress": contract_address,
        "iconName": icon_name or symbol,
        "color": color,
        "isNative": is_native,
        "isAllNetworks": is_all_networks,
        "balance": balance,
        "fiatValue": fiat,
        "portfolioPercentage": percentage,
        "networkId": network_id,
    }


def token_set(
    balances: list[str], fiats: list[str], percentages: list[float]
) -> list[dict[str, Any]]:
    definitions = [
        ("BTC", "Bitcoin", 0xF7931A, "btc--0", True, False),
        ("ETH", "Ethereum", 0x8C8CFF, "evm--1", True, False),
        ("SOL", "Solana", 0x14F195, "sol--101", True, False),
        ("USDC", "USD Coin", 0x2775CA, "", False, True),
        ("USDT", "Tether USD", 0x26A17B, "", False, True),
    ]
    return [
        token(
            symbol,
            name,
            balances[index],
            fiats[index],
            percentages[index],
            color,
            network_id,
            is_native=is_native,
            is_all_networks=is_all_networks,
        )
        for index, (symbol, name, color, network_id, is_native, is_all_networks) in enumerate(
            definitions
        )
    ]


def payload(
    label: str,
    total: str,
    tokens: list[dict[str, Any]],
    other_count: int,
    other_fiat: str,
    other_percentage: float,
    other_color: int = OTHER_TOKEN_COLOR,
) -> dict[str, Any]:
    return {
        "v": 1,
        "ts": TIMESTAMP_MS,
        "account": {"label": label, "addressMasked": "0x12...ab"},
        "totalFiat": total,
        "tokenCount": len(tokens),
        "tokens": tokens,
        "otherTokens": {
            "count": other_count,
            "fiat": other_fiat,
            "portfolioPercentage": other_percentage,
            "color": other_color,
        },
    }


def glyph_payload(label: str, values: list[str]) -> dict[str, Any]:
    tokens = token_set(["999.9Q"] * 5, values[1:6], [15] * 5)
    return payload(label, values[0], tokens, 7, values[6], 25)


def case(
    case_id: str,
    title: str,
    description: str,
    expected: str,
    value: dict[str, Any],
) -> dict[str, Any]:
    result = {
        "id": case_id,
        "title": title,
        "description": description,
        "expected": expected,
        "payload": value,
    }
    if expected != "client-block":
        result["package"] = f"{case_id}.okpkg"
    if expected == "reject":
        result["expectedError"] = "Invalid portfolio package"
    if expected == "client-block":
        result["expectedError"] = "Token 或 Other 金额超过 7 位有效数字"
    return result


def mapping_payload(
    label: str,
    mappings: list[TokenMapping],
    *,
    is_native: bool,
    is_all_networks: bool,
) -> dict[str, Any]:
    percentage = round(100 / len(mappings), 2)
    percentages = [percentage] * len(mappings)
    percentages[-1] = round(100 - sum(percentages[:-1]), 2)
    tokens = [
        token(
            symbol,
            name,
            str(index),
            f"${index * 10:.2f}",
            percentages[index - 1],
            TOKEN_COLORS[index - 1],
            network_id,
            is_native=is_native,
            is_all_networks=is_all_networks,
            contract_address=contract_address,
            icon_name=icon_name,
        )
        for index, (symbol, name, network_id, contract_address, icon_name) in enumerate(
            mappings, start=1
        )
    ]
    total = sum(index * 10 for index in range(1, len(mappings) + 1))
    return payload(label, f"${total:.2f}", tokens, 0, "$0.00", 0)


def build_mapping_cases() -> list[dict[str, Any]]:
    definitions = [
        ("Native", "原生资产映射", NATIVE_TOKEN_MAPPINGS, True, False),
        ("Contract", "合约资产映射", CONTRACT_TOKEN_MAPPINGS, False, False),
        ("All Networks", "全网络聚合映射", AGGREGATE_TOKEN_MAPPINGS, False, True),
    ]
    result: list[dict[str, Any]] = []
    case_number = 1
    for label, title, mappings, is_native, is_all_networks in definitions:
        batches = [mappings[index : index + 5] for index in range(0, len(mappings), 5)]
        for batch_number, batch in enumerate(batches, start=1):
            case_id = f"M{case_number:02d}"
            identifiers = ", ".join(
                network_id or icon_name
                for _, _, network_id, _, icon_name in batch
            )
            result.append(
                case(
                    case_id,
                    f"{title} {batch_number}/{len(batches)}",
                    f"验证 {identifiers} 的 networkId、contractAddress、name 与 iconName 正常传输和显示。",
                    "accept",
                    mapping_payload(
                        f"{case_id} {label} {batch_number}",
                        batch,
                        is_native=is_native,
                        is_all_networks=is_all_networks,
                    ),
                )
            )
            case_number += 1
    return result


def build_cases(sample_path: Path) -> list[dict[str, Any]]:
    baseline = json.loads(sample_path.read_text(encoding="utf-8"))
    baseline["ts"] = TIMESTAMP_MS
    baseline["account"]["label"] = "P00 Transport baseline"
    for index, item in enumerate(baseline["tokens"]):
        item["color"] = TOKEN_COLORS[index % len(TOKEN_COLORS)]
    baseline["otherTokens"]["color"] = OTHER_TOKEN_COLOR

    zero = payload("P01 Zero assets", "$0.00", [], 0, "$0.00", 0)
    small = payload(
        "P02 Small and subscript",
        "$2.01K",
        token_set(
            ["0", "0.1235", "0.01235", "0.001235", "0.0₄7276"],
            ["$0.00", "< $0.01", "$12.35", "$999.99", "$1.00K"],
            [0, 10, 20, 30, 40],
        ),
        0,
        "$0.00",
        0,
    )
    units = payload(
        "P03 Units and caps",
        "> $999.99Q",
        token_set(
            ["999.9", "1K", "123.5M", "1.235B", ">999.9Q"],
            ["$999.99", "$1.00K", "$123.46M", "$1.23T", "> $999.99Q"],
            [5, 10, 20, 25, 30],
        ),
        99,
        "$10.00K",
        10,
    )
    glyph_a = glyph_payload(
        "P04 Glyph A",
        ["€999.99Q", "₩999.99Q", "₹999.99Q", "₽999.99Q", "₺999.99Q", "₫999.99Q", "฿999.99Q"],
    )
    glyph_b = glyph_payload(
        "P05 Glyph B",
        ["₱999.99Q", "₦999.99Q", "₴999.99Q", "₪999.99Q", "₿999.99Q", "₸999.99Q", "₡999.99Q"],
    )
    glyph_c = glyph_payload(
        "P06 Glyph C",
        ["₲999.99Q", "₵999.99Q", "₭999.99Q", "₮999.99Q", "₼999.99Q", "₾999.99Q", "₨999.99Q"],
    )
    glyph_d = glyph_payload(
        "P07 Glyph D and ISO",
        ["৳999.99Q", "៛999.99Q", "؋999.99Q", "XYZ 999.99Q", "$999.99Q", "£999.99Q", "¥999.99Q"],
    )
    ordered = payload(
        "P08 Order color other",
        "$100.00K",
        token_set(
            ["1", "2", "3", "4", "5"],
            ["$1.00", "$90.00K", "$5.00K", "$3.00K", "$1.00K"],
            [1, 50, 10, 20, 18],
        ),
        65535,
        "$1.00K",
        1,
    )
    parser_max = payload("P09 Parser max 47 bytes", "A" * 47, [], 0, "$0.00", 0)
    full_total = payload(
        "P10 Full total amount",
        "$12,345,678.90",
        [],
        0,
        "$0.00",
        0,
    )
    single_btc = payload(
        "8.6 BTC @ $90K",
        "$774,000.00",
        [token("BTC", "Bitcoin", "8.6", "$774.0K", 100, 0xF7931A, "btc--0", is_native=True)],
        0,
        "$0.00",
        0,
    )
    guard = payload(
        "P11 Negative guard",
        "$1.00K",
        [token("BTC", "Bitcoin", "1K", "$1.00K", 100, 0xF7931A, "btc--0", is_native=True)],
        0,
        "$0.00",
        0,
    )

    too_long = copy.deepcopy(guard)
    too_long["account"]["label"] = "N01 48-byte amount"
    too_long["totalFiat"] = "A" * 48

    mismatch = copy.deepcopy(small)
    mismatch["account"]["label"] = "N02 tokenCount mismatch"
    mismatch["tokenCount"] = 4

    six_tokens = copy.deepcopy(small)
    six_tokens["account"]["label"] = "N03 six tokens"
    six_tokens["tokens"].append(
        token("XRP", "XRP", "1", "$1.00", 0, 0x23292F, "xrp--0", is_native=True)
    )
    six_tokens["tokenCount"] = 6

    extra_field = copy.deepcopy(guard)
    extra_field["account"]["label"] = "N04 extra root field"
    extra_field["currency"] = "usd"

    bad_percentage = copy.deepcopy(guard)
    bad_percentage["account"]["label"] = "N05 percentage overflow"
    bad_percentage["tokens"][0]["portfolioPercentage"] = 100.01

    bad_network = copy.deepcopy(guard)
    bad_network["account"]["label"] = "N06 empty network"
    bad_network["tokens"][0]["networkId"] = ""

    bad_color = copy.deepcopy(guard)
    bad_color["account"]["label"] = "N07 color overflow"
    bad_color["tokens"][0]["color"] = 0x1000000

    missing_other_color = copy.deepcopy(guard)
    missing_other_color["account"]["label"] = "N08 missing other color"
    del missing_other_color["otherTokens"]["color"]

    bad_other_color = copy.deepcopy(guard)
    bad_other_color["account"]["label"] = "N09 other color overflow"
    bad_other_color["otherTokens"]["color"] = 0x1000000

    eight_digits = copy.deepcopy(guard)
    eight_digits["account"]["label"] = "L01 significant digit guard"
    eight_digits["tokens"][0]["balance"] = "12345678"

    return [
        case("P00", "完整传输基线", "验证完整 5 Token v1 数据、签名包、分块写入与 PortfolioUpdate 全链路。", "accept", baseline),
        case("P01", "零资产同步", "验证 tokenCount=0、空 tokens 和全零 Other 仍是合法同步数据。", "accept", zero),
        case("P02", "小额与下标", "覆盖零值、< $0.01、普通小数及 Unicode 下标小数 0.0₄7276。", "accept", small),
        case("P03", "单位进位与上限", "覆盖 K/M/B/T/Q 进位、四位 Token 精度、两位 Fiat 精度和 Q 封顶。", "accept", units),
        case("P04", "币种字形 A", "覆盖 €、₩、₹、₽、₺、₫、฿ 的金额字符串传输。", "accept", glyph_a),
        case("P05", "币种字形 B", "覆盖 ₱、₦、₴、₪、₿、₸、₡ 的金额字符串传输。", "accept", glyph_b),
        case("P06", "币种字形 C", "覆盖 ₲、₵、₭、₮、₼、₾、₨ 的金额字符串传输。", "accept", glyph_c),
        case("P07", "币种字形与 ISO 降级", "覆盖 ৳、៛、؋、常用符号，以及不支持字符降级后的 XYZ 前缀。", "accept", glyph_d),
        case("P08", "顺序、颜色与 Other", "验证 Token 数组顺序、RGB888 颜色、百分比和 Other 最大 count=65535。", "accept", ordered),
        case("P09", "47 字节边界", "验证金额字段恰好 47 个 UTF-8 字节时仍被固件接受。", "accept", parser_max),
        case("P10", "完整总额显示", "验证 totalFiat 按当前 App 规则以字节宽度校验，不套用 Token 的 7 位有效数字限制。", "accept", full_total),
        *build_mapping_cases(),
        case("P11", "反向测试保护基线", "在非法用例前写入一份有效数据，用于确认后续拒绝不会破坏已安装 Portfolio。", "accept", guard),
        case("N01", "48 字节金额", "金额字段超过固件 47 字节上限，预期返回 Invalid portfolio package。", "reject", too_long),
        case("N02", "Token 数量不一致", "tokenCount 与 tokens.length 不一致，预期固件拒绝。", "reject", mismatch),
        case("N03", "超过 5 个 Token", "发送 6 个详情 Token，验证固件的 5 项上限。", "reject", six_tokens),
        case("N04", "根对象额外字段", "增加已移除的 currency 字段，验证 v1 精确对象结构。", "reject", extra_field),
        case("N05", "百分比越界", "portfolioPercentage=100.01，验证 0..100 范围。", "reject", bad_percentage),
        case("N06", "非聚合 Token 缺少网络", "isAllNetworks=false 且 networkId 为空，预期固件拒绝。", "reject", bad_network),
        case("N07", "颜色越界", "color=0x1000000 超出 RGB888 范围，预期固件拒绝。", "reject", bad_color),
        case("N08", "Other 缺少颜色", "缺少当前 schema 必填的 otherTokens.color，预期固件按精确对象结构拒绝。", "reject", missing_other_color),
        case("N09", "Other 颜色越界", "otherTokens.color 超出 RGB888 范围，预期固件拒绝。", "reject", bad_other_color),
        case("L01", "8 位 Token 金额客户端拦截", "Token balance 包含 8 位 ASCII 有效数字；必须在上传前拦截，绝不传给硬件。", "client-block", eight_digits),
        case("P12", "最终有效数据恢复", "所有反向用例结束后恢复有效 Portfolio，避免设备停留在测试保护数据之外。", "accept", guard),
        case("P13", "单 BTC 真实持仓", "按 BTC 单价约 $90,000，模拟 8.6 BTC 持仓，总资产 $774,000.00。", "accept", single_btc),
    ]


def build_package(firmware_root: Path, json_path: Path, output_path: Path) -> None:
    python = firmware_root / ".venv" / "bin" / "python"
    sender_dir = firmware_root / "utils" / "onekey_protocol_cli"
    command = [
        str(python),
        "-c",
        (
            "from pathlib import Path; import sys; "
            "sys.path.insert(0, sys.argv[1]); "
            "from send_portfolio import build_package; "
            "build_package(Path(sys.argv[2]), Path(sys.argv[3]))"
        ),
        str(sender_dir),
        str(json_path),
        str(output_path),
    ]
    subprocess.run(command, cwd=firmware_root, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--firmware-repo", type=Path, default=DEFAULT_FIRMWARE_ROOT)
    parser.add_argument("--app-repo", type=Path, default=DEFAULT_APP_ROOT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    firmware_root = args.firmware_repo.resolve()
    app_root = args.app_repo.resolve()
    output = args.output.resolve()
    sample = firmware_root / "utils" / "onekey_protocol_cli" / "portfolio.sample.json"
    if not sample.is_file():
        parser.error(f"firmware-pro2 Portfolio sample not found: {sample}")
    if not (app_root / "packages" / "shared" / "src" / "utils" / "portfolioPayload.ts").is_file():
        parser.error(f"app-monorepo Portfolio implementation not found: {app_root}")

    require_source_markers(
        firmware_root / "tasks" / "task_foreground" / "pages" / "standalone" / "portfolio_data.c",
        [
            "PORTFOLIO_ROOT_FIELD_COUNT      7",
            "PORTFOLIO_TOKEN_FIELD_COUNT     11",
            "PORTFOLIO_OTHER_FIELD_COUNT     4",
            "PORTFOLIO_DATA_MAX_PACKAGE_SIZE KB(64)",
        ],
    )
    require_source_markers(
        app_root / "packages" / "shared" / "src" / "utils" / "portfolioPayload.ts",
        [
            "PORTFOLIO_TOKEN_LIMIT = 5",
            "PORTFOLIO_DISPLAY_AMOUNT_MAX_BYTES = 47",
            "PORTFOLIO_DISPLAY_AMOUNT_MAX_SIGNIFICANT_DIGITS = 7",
        ],
    )

    firmware_commit = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=firmware_root, check=True, capture_output=True, text=True
    ).stdout.strip()
    app_commit = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=app_root, check=True, capture_output=True, text=True
    ).stdout.strip()
    sdk_commit = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=REPOSITORY_ROOT, check=True, capture_output=True, text=True
    ).stdout.strip()
    cases = build_cases(sample)
    output.mkdir(parents=True, exist_ok=True)

    for stale in output.glob("*.okpkg"):
        stale.unlink()

    with tempfile.TemporaryDirectory(prefix="portfolio-fixtures-") as temp_dir:
        temp_root = Path(temp_dir)
        for item in cases:
            package_name = item.get("package")
            if not package_name:
                continue
            json_path = temp_root / f"{item['id']}.json"
            json_path.write_text(
                json.dumps(item["payload"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
            build_package(firmware_root, json_path, output / package_name)

    manifest = {
        "version": 2,
        "firmwareCommit": firmware_commit,
        "appCommit": app_commit,
        "sdkCommit": sdk_commit,
        "intervalMs": 60000,
        "cases": cases,
    }
    (output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Built {sum('package' in item for item in cases)} packages and {len(cases)} cases in {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
