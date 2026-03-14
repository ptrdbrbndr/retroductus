import os
import pandas as pd
import psycopg2


def extract_event_log(flowable_tenant_id: str, db_url: str | None = None) -> pd.DataFrame:
    """
    Haal event log op uit Flowable historische tabellen.
    Geeft een DataFrame terug in XES-formaat (case_id, activity, timestamp, resource).

    Als db_url meegegeven is, wordt die gebruikt; anders FLOWABLE_DB_URL env var.
    """
    if not db_url:
        db_url = os.getenv("FLOWABLE_DB_URL")
    if not db_url:
        raise RuntimeError("FLOWABLE_DB_URL is niet geconfigureerd")

    conn = psycopg2.connect(db_url)
    try:
        query = """
            SELECT
                proc_inst_id_  AS case_id,
                act_name_      AS activity,
                start_time_    AS timestamp,
                end_time_      AS complete_time,
                assignee_      AS resource,
                duration_      AS duration_ms
            FROM act_hi_actinst
            WHERE tenant_id_ = %s
              AND act_name_ IS NOT NULL
            ORDER BY start_time_
        """
        df = pd.read_sql(query, conn, params=(flowable_tenant_id,))
    finally:
        conn.close()

    return df
