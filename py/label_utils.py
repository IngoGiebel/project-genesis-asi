import re
from typing import Dict


def parse_label_expr(expr: str) -> Dict[str, str]:
    """
    Convert a Vega-Lite labelExpr such as "datum.value == 'yes_already' ? 'Yes, already' : …"
    to  {"yes_already": "Yes, already", …}
    """
    return {
        k: v
        for k, v in re.findall(
            r"datum\.value\s*==\s*'([^']+)'\s*\?\s*'([^']+)'",
            expr,
        )
    }
