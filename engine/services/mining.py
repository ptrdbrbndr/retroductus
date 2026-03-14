import pandas as pd
import pm4py
from pm4py.objects.log.util import dataframe_utils
from pm4py.objects.conversion.log import converter as log_converter
from pm4py.algo.discovery.dfg import algorithm as dfg_discovery
from pm4py.statistics.start_activities.log import get as start_activities_get
from pm4py.statistics.end_activities.log import get as end_activities_get


def dataframe_to_event_log(df: pd.DataFrame):
    """Converteer pandas DataFrame naar PM4Py EventLog."""
    df = df.rename(columns={
        "case_id": "case:concept:name",
        "activity": "concept:name",
        "timestamp": "time:timestamp",
        "resource": "org:resource",
    })
    df = dataframe_utils.convert_timestamp_columns_in_df(df)
    return log_converter.apply(df, variant=log_converter.Variants.TO_EVENT_LOG)


def run_discovery(df: pd.DataFrame) -> dict:
    """
    Voer process discovery uit en geef DFG-resultaat terug als JSON-serialiseerbaar dict.
    """
    log = dataframe_to_event_log(df)

    dfg, start_activities, end_activities = pm4py.discover_dfg(log)

    # Activiteiten + gemiddelde duur
    nodes = []
    activity_groups = df.groupby("activity")
    for activity, group in activity_groups:
        count = len(group)
        avg_dur = group["duration_ms"].mean() / 1000 if "duration_ms" in group.columns else None
        nodes.append({
            "activity": str(activity),
            "count": int(count),
            "avg_duration_sec": round(float(avg_dur), 1) if avg_dur is not None else None,
        })

    # Edges (paden tussen activiteiten)
    edges = [
        {"from": str(src), "to": str(tgt), "count": int(cnt)}
        for (src, tgt), cnt in dfg.items()
    ]
    edges.sort(key=lambda e: e["count"], reverse=True)

    return {
        "dfg_nodes": nodes,
        "dfg_edges": edges[:50],  # top 50 paden
        "start_activities": {str(k): int(v) for k, v in start_activities.items()},
        "end_activities": {str(k): int(v) for k, v in end_activities.items()},
        "performance": [
            {
                "activity": n["activity"],
                "avg_duration_sec": n["avg_duration_sec"],
                "case_count": n["count"],
            }
            for n in nodes
            if n["avg_duration_sec"] is not None
        ],
    }
