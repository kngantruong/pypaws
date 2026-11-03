from fastapi import APIRouter, Depends
from app.core.auth import get_current_user_id
from app.core.database import get_supabase, get_supabase_admin

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def list_notifications(
    unread_only: bool = True,
    limit: int = 50,
    user_id: int = Depends(get_current_user_id),
):
    rows = (
        get_supabase()
        .rpc(
            "get_notifications",
            {
                "p_user_id": user_id,
                "p_unread_only": unread_only,
                "p_limit": min(max(limit, 1), 100),
            },
        )
        .execute()
        .data
        or []
    )

    # The DB notification stores related_candidate_id, while the web needs
    # the LOST post id to open the matching-results page.
    if rows:
        admin = get_supabase_admin()
        candidate_ids = [int(row["related_candidate_id"]) for row in rows if row.get("related_candidate_id") is not None]
        if candidate_ids:
            try:
                candidate_rows = (
                    admin.table("candidates")
                    .select("candidate_id,query_post_id")
                    .in_("candidate_id", candidate_ids)
                    .execute()
                    .data
                    or []
                )
                post_by_candidate = {
                    int(row["candidate_id"]): int(row["query_post_id"])
                    for row in candidate_rows
                }
                for row in rows:
                    cid = row.get("related_candidate_id")
                    row["post_id"] = post_by_candidate.get(int(cid)) if cid is not None else None
            except Exception:
                # Notification delivery itself must not fail because enrichment
                # is unavailable; the raw notification remains usable.
                pass

    return {"items": rows}


@router.post("/{notification_id}/read")
def mark_read(notification_id: int, user_id: int = Depends(get_current_user_id)):
    get_supabase().rpc(
        "mark_notification_read",
        {"p_notification_id": notification_id, "p_user_id": user_id},
    ).execute()
    return {"status": "READ"}
