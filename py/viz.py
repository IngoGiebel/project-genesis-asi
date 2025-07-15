import altair as alt
import pandas as pd
from typing import Sequence


def bar_chart_by(
    df: pd.DataFrame,
    x_title: str,
    y_field: str,
    y_sort: Sequence[str] | None,
    y_label_expr: str | None,
    y_title: str,
    color_field: str,
    color_domain: Sequence[str],
    color_range: Sequence[str],
    color_label_expr: str | None = None,
    color_title: str | None = None,
    legend: bool = True,
):
    """
    Generic stacked bar-chart builder used for the bar plots.
    Returns an Altair Chart object.
    """
    n_total = len(df)

    y_encoding = alt.Y(
        f"{y_field}:N",
        title=y_title,
        axis=alt.Axis(labelExpr=y_label_expr) if y_label_expr else alt.Axis(),
        sort=y_sort if y_sort is not None else alt.Undefined,
    )

    if legend:
        legend_kwargs = {"orient": "right"}
        if color_label_expr:
            legend_kwargs["labelExpr"] = color_label_expr
        color_legend = alt.Legend(**legend_kwargs)
    else:
        color_legend = None

    color_encoding = alt.Color(
        f"{color_field}:N",
        scale=alt.Scale(domain=color_domain, range=color_range),
        title=color_title if color_title is not None else alt.Undefined,
        legend=color_legend,
    )

    return (
        alt.Chart(df)
        .mark_bar()
        .encode(
            x=alt.X("count():Q")
            .scale(domain=[0, n_total])
            .axis(tickCount=n_total + 1, format="d")
            .title(x_title),
            y=y_encoding,
            color=color_encoding,
            order=alt.Order("ai_can_be_conscious_order:O"),
        )
        .properties(width="container", padding=20)
    )
