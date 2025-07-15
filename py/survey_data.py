import pandas as pd
import re
from firestore_utils import client
from typing import Sequence


def load_submissions(
    tag_filter: str | None,
    color_domain: Sequence[str],
    age_bins: Sequence[int] = (0, 18, 30, 45, 60, 120),
    age_labels: Sequence[str] = ("≤18", "19–30", "31–45", "46–60", "60+"),
) -> pd.DataFrame:
    """
    Download survey submissions (optionally filtered by FIREBASE client.tag)
    and return (cleaned_dataframe, n_total).

    • Adds `age_band` and `ai_can_be_conscious_order` helper columns.
    • All column names are converted camelCase ➜ snake_case.
    """

    survey_submissions = []
    for snap in client().collection("surveySubmissions").stream():
        rec = snap.to_dict()
        tag = rec.get("client", {}).get("tag")
        if (not tag_filter and not tag) or (tag_filter and tag == tag_filter):
            survey_submissions.append(rec)

    survey_submissions_df = pd.json_normalize(survey_submissions)
    if survey_submissions_df.empty:
        raise ValueError("No records found (TAG filter?)")

    def camel_to_snake(name: str) -> str:
        s1 = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
        return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s1).lower()

    survey_submissions_df.rename(
        columns={c: camel_to_snake(c) for c in survey_submissions_df.columns},
        inplace=True)
 
    survey_submissions_df["server.date"] = pd.to_datetime(
        survey_submissions_df["server.date"],
        errors="coerce")

    survey_submissions_df["age_band"] = pd.cut(
        survey_submissions_df["age"],
        bins=age_bins,
        labels=age_labels,
        right=False)

    order_map = {val: i for i, val in enumerate(color_domain)}
    survey_submissions_df["ai_can_be_conscious_order"] = survey_submissions_df["ai_can_be_conscious"].map(order_map)

    return survey_submissions_df
