import os
import random
import tempfile
import numpy as np
import pandas as pd
import pm4py
from pm4py.objects.log.util import dataframe_utils
from pm4py.objects.conversion.log import converter as log_converter


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


def _fmt(val) -> float | None:
    try:
        return round(float(val), 1)
    except Exception:
        return None


def _dur_label(sec: float) -> str:
    if sec < 60:
        return f"{int(sec)}s"
    if sec < 3600:
        return f"{int(sec // 60)}min"
    if sec < 86400:
        return f"{sec / 3600:.1f}u"
    return f"{sec / 86400:.1f}d"


def _export_bpmn_xml(bpmn_graph) -> str | None:
    """Exporteer BPMN-model naar XML-string via tijdelijk bestand."""
    try:
        from pm4py.objects.bpmn.exporter import exporter as bpmn_exporter
        with tempfile.NamedTemporaryFile(suffix=".bpmn", delete=False) as f:
            tmp_path = f.name
        bpmn_exporter.apply(bpmn_graph, tmp_path)
        with open(tmp_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return None
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def _case_durations_sec(df: pd.DataFrame) -> pd.Series | None:
    """Bereken doorlooptijd per case in seconden."""
    try:
        if "timestamp" in df.columns:
            df_ts = df.copy()
            df_ts["timestamp"] = pd.to_datetime(df_ts["timestamp"], utc=True, errors="coerce")
            df_ts = df_ts.dropna(subset=["timestamp"])
            times = df_ts.groupby("case_id")["timestamp"].agg(["min", "max"])
            durations = (times["max"] - times["min"]).dt.total_seconds()
            return durations[durations >= 0]
        if "duration_ms" in df.columns:
            return df.groupby("case_id")["duration_ms"].sum() / 1000
    except Exception:
        pass
    return None


def _compute_trace_variants(log, df: pd.DataFrame) -> list:
    """Top-20 procesvarianten met case-aantallen, percentages en gemiddelde doorlooptijden."""
    try:
        from pm4py.statistics.variants.log import get as variants_get
        variants = variants_get.get_variants(log)

        case_dur = _case_durations_sec(df)

        total_cases = sum(len(v) for v in variants.values())
        result = []

        for i, (variant_tuple, traces) in enumerate(
            sorted(variants.items(), key=lambda x: len(x[1]), reverse=True)[:20]
        ):
            activities = list(variant_tuple)
            case_count = len(traces)

            avg_dur = None
            if case_dur is not None:
                try:
                    case_ids = [str(t.attributes.get("concept:name", "")) for t in traces]
                    durations = case_dur.loc[case_dur.index.astype(str).isin(case_ids)]
                    if len(durations) > 0:
                        avg_dur = _fmt(durations.mean())
                except Exception:
                    pass

            result.append({
                "variant_id": i,
                "activities": activities,
                "case_count": case_count,
                "percentage": round(case_count / total_cases * 100, 1) if total_cases > 0 else 0,
                "avg_duration_sec": avg_dur,
            })

        return result
    except Exception:
        return []


def _compute_case_duration_stats(df: pd.DataFrame) -> dict:
    """Case-duration histogram + percentielstatistieken."""
    try:
        durations = _case_durations_sec(df)
        if durations is None or len(durations) == 0:
            return {}

        d = durations.values

        max_h = max(float(d.max()) / 3600, 0.001)
        if max_h <= 1:
            bucket_h = 0.25
        elif max_h <= 8:
            bucket_h = 1.0
        elif max_h <= 48:
            bucket_h = 4.0
        elif max_h <= 336:
            bucket_h = 24.0
        else:
            bucket_h = 24.0 * 7

        bucket_sec = bucket_h * 3600
        n_buckets = min(int(d.max() / bucket_sec) + 1, 20)

        buckets = []
        for i in range(n_buckets):
            lo, hi = i * bucket_sec, (i + 1) * bucket_sec
            count = int(((d >= lo) & (d < hi)).sum())
            if bucket_h >= 1:
                label = f"{i * bucket_h:.0f}–{(i + 1) * bucket_h:.0f}u"
            else:
                label = f"{i * bucket_h * 60:.0f}–{(i + 1) * bucket_h * 60:.0f}min"
            buckets.append({"bucket_label": label, "count": count})

        return {
            "histogram": buckets,
            "avg_sec": _fmt(float(d.mean())),
            "p25_sec": _fmt(float(np.percentile(d, 25))),
            "p50_sec": _fmt(float(np.percentile(d, 50))),
            "p75_sec": _fmt(float(np.percentile(d, 75))),
            "p95_sec": _fmt(float(np.percentile(d, 95))),
            "min_sec": _fmt(float(d.min())),
            "max_sec": _fmt(float(d.max())),
            "case_count": int(len(d)),
        }
    except Exception:
        return {}


def _compute_activity_heatmap(df: pd.DataFrame) -> list:
    """Events per uur van de dag per activiteit — voor heatmap-weergave."""
    try:
        if "timestamp" not in df.columns:
            return []
        df_ts = df.copy()
        df_ts["timestamp"] = pd.to_datetime(df_ts["timestamp"], utc=True, errors="coerce")
        df_ts = df_ts.dropna(subset=["timestamp"])
        df_ts["hour"] = df_ts["timestamp"].dt.hour

        grouped = df_ts.groupby(["activity", "hour"]).size().reset_index(name="count")
        return [
            {"activity": str(r["activity"]), "hour": int(r["hour"]), "count": int(r["count"])}
            for _, r in grouped.iterrows()
        ]
    except Exception:
        return []


def _compute_dotted_chart(df: pd.DataFrame) -> list:
    """Events per case op tijdlijn — maximaal 100 cases, 1000 events."""
    try:
        if "timestamp" not in df.columns:
            return []
        df_ts = df.copy()
        df_ts["timestamp"] = pd.to_datetime(df_ts["timestamp"], utc=True, errors="coerce")
        df_ts = df_ts.dropna(subset=["timestamp"])

        top_cases = df_ts.groupby("case_id").size().nlargest(100).index
        df_sample = df_ts[df_ts["case_id"].isin(top_cases)]

        if len(df_sample) > 1000:
            df_sample = df_sample.sample(1000, random_state=42)

        return [
            {
                "case_id": str(row.get("case_id", "")),
                "activity": str(row.get("activity", "")),
                "timestamp": row["timestamp"].isoformat(),
            }
            for _, row in df_sample.iterrows()
        ]
    except Exception:
        return []


def _run_simulation(start_activities: dict, end_activities: dict, dfg: dict, perf_dfg: dict) -> dict:
    """
    Monte Carlo simulatie op basis van DFG-overgangskansen en historische doorlooptijden.
    Voert 300 gesimuleerde cases uit en geeft statistieken + histogram terug.
    """
    try:
        if not dfg or not start_activities:
            return {}

        # Bouw uitgaande kansen per activiteit
        out_edges: dict[str, list[tuple[str, float]]] = {}
        for (src, tgt), cnt in dfg.items():
            out_edges.setdefault(str(src), []).append((str(tgt), int(cnt)))

        out_probs: dict[str, list[tuple[str, float]]] = {}
        for src, edges in out_edges.items():
            total = sum(c for _, c in edges)
            out_probs[src] = [(tgt, c / total) for tgt, c in edges]

        starts = list(start_activities.keys())
        start_weights = [start_activities[a] for a in starts]
        end_set = set(str(k) for k in end_activities.keys())

        N = 300
        sim_durations = []

        for _ in range(N):
            current = random.choices(starts, weights=start_weights)[0]
            duration = 0.0

            for _step in range(60):
                is_end = current in end_set
                exits = out_probs.get(current, [])

                if is_end and (not exits or random.random() < 0.4):
                    break
                if not exits:
                    break

                nexts = [a for a, _ in exits]
                weights = [p for _, p in exits]
                next_act = random.choices(nexts, weights=weights)[0]

                key = (current, next_act)
                mean_dur = perf_dfg.get(key)
                if mean_dur and isinstance(mean_dur, (int, float)) and mean_dur > 0:
                    std_dur = mean_dur * 0.3
                    duration += max(0.0, random.gauss(float(mean_dur), std_dur))

                current = next_act

            sim_durations.append(duration)

        if not sim_durations:
            return {}

        d = np.array(sim_durations)
        max_h = max(float(d.max()) / 3600, 0.001)
        bucket_h = max(0.5, max_h / 10)
        bucket_sec = bucket_h * 3600

        buckets = []
        for i in range(12):
            lo, hi = i * bucket_sec, (i + 1) * bucket_sec
            count = int(((d >= lo) & (d < hi)).sum())
            if count > 0:
                label = f"{i * bucket_h:.1f}–{(i + 1) * bucket_h:.1f}u" if bucket_h < 1 else f"{i * bucket_h:.0f}–{(i + 1) * bucket_h:.0f}u"
                buckets.append({"bucket_label": label, "count": count})

        return {
            "n_simulations": N,
            "avg_duration_sec": _fmt(float(d.mean())),
            "p25_duration_sec": _fmt(float(np.percentile(d, 25))),
            "p50_duration_sec": _fmt(float(np.percentile(d, 50))),
            "p75_duration_sec": _fmt(float(np.percentile(d, 75))),
            "p95_duration_sec": _fmt(float(np.percentile(d, 95))),
            "histogram": buckets,
        }
    except Exception:
        return {}


def run_discovery(df: pd.DataFrame) -> dict:
    """
    Voer volledige process discovery uit:
    - DFG (frequentie + doorlooptijd per edge)
    - Trace varianten
    - Case duration histogram
    - Activity heatmap
    - Dotted chart
    - BPMN via Inductive Miner
    - Monte Carlo simulatie
    """
    log = dataframe_to_event_log(df)

    # === KERN: Frequency DFG ===
    dfg, start_activities, end_activities = pm4py.discover_dfg(log)

    # === Performance DFG (gem. duur per overgang) ===
    perf_dfg: dict = {}
    try:
        perf_dfg, _, _ = pm4py.discover_performance_dfg(log)
    except Exception:
        pass

    # === Nodes: activiteiten met count + gem. duur ===
    nodes = []
    for activity, group in df.groupby("activity"):
        count = len(group)
        avg_dur = group["duration_ms"].mean() / 1000 if "duration_ms" in group.columns else None
        nodes.append({
            "activity": str(activity),
            "count": int(count),
            "avg_duration_sec": _fmt(avg_dur),
        })

    # === Edges: frequentie + doorlooptijd ===
    edges = []
    for (src, tgt), cnt in dfg.items():
        perf_val = perf_dfg.get((src, tgt))
        avg_dur_sec = _fmt(float(perf_val)) if isinstance(perf_val, (int, float)) else None
        edges.append({
            "from": str(src),
            "to": str(tgt),
            "count": int(cnt),
            "avg_duration_sec": avg_dur_sec,
        })
    edges.sort(key=lambda e: e["count"], reverse=True)

    # === Inductive Miner → Petri net → BPMN ===
    bpmn_xml = None
    try:
        net, im, fm = pm4py.discover_petri_net_inductive(log)
        bpmn_graph = pm4py.convert_to_bpmn(net, im, fm)
        bpmn_xml = _export_bpmn_xml(bpmn_graph)
    except Exception:
        pass

    # === Uitgebreide analyses ===
    trace_variants = _compute_trace_variants(log, df)
    case_durations = _compute_case_duration_stats(df)
    activity_heatmap = _compute_activity_heatmap(df)
    dotted_chart = _compute_dotted_chart(df)
    simulation = _run_simulation(
        {str(k): int(v) for k, v in start_activities.items()},
        {str(k): int(v) for k, v in end_activities.items()},
        {(str(k[0]), str(k[1])): int(v) for k, v in dfg.items()},
        {(str(k[0]), str(k[1])): v for k, v in perf_dfg.items()} if perf_dfg else {},
    )

    return {
        "dfg_nodes": nodes,
        "dfg_edges": edges[:50],
        "start_activities": {str(k): int(v) for k, v in start_activities.items()},
        "end_activities": {str(k): int(v) for k, v in end_activities.items()},
        "performance": [
            {"activity": n["activity"], "avg_duration_sec": n["avg_duration_sec"], "case_count": n["count"]}
            for n in nodes
            if n["avg_duration_sec"] is not None
        ],
        "trace_variants": trace_variants,
        "case_durations": case_durations,
        "activity_heatmap": activity_heatmap,
        "dotted_chart": dotted_chart,
        "bpmn_xml": bpmn_xml,
        "simulation": simulation,
    }
