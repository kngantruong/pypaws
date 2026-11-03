from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user_id
from app.core.database import get_supabase, get_supabase_admin

router = APIRouter(prefix="/candidates", tags=["Candidates"])
post_candidates_router = APIRouter(prefix="/posts", tags=["Candidates"])


def rpc(name, args):
    try:
        return get_supabase().rpc(name, args).execute()
    except Exception as exc:
        msg = str(exc)
        if "insufficient_privilege" in msg:
            raise HTTPException(403, msg)
        if "check_violation" in msg:
            raise HTTPException(400, msg)
        raise HTTPException(500, "Candidate operation failed.") from exc


@post_candidates_router.get("/{post_id}/candidates")
def list_candidates(
    post_id: int,
    only_passed: bool = False,
    status: str | None = None,
    user_id: int = Depends(get_current_user_id),
):
    details = rpc("get_post_detail", {"p_post_id": post_id}).data or []
    if not details:
        raise HTTPException(404, "Post not found.")
    post = details[0]
    effective_user_id = user_id
    if int(post["owner_id"]) != effective_user_id:
        raise HTTPException(403, "Only the post owner can view candidates.")
    if post["post_type"] != "LOST":
        raise HTTPException(422, "Candidates can only be listed for a LOST post.")

    rows = rpc(
        "get_candidates_for_post",
        {
            "p_lost_post_id": post_id,
            "p_only_passed": only_passed,
            "p_status": status,
        },
    ).data or []
    return {"items": rows}


@router.post("/{candidate_id}/contact")
def contact(candidate_id: int, user_id: int = Depends(get_current_user_id)):
    rows = rpc(
        "contact_candidate",
        {"p_requester_id": user_id, "p_candidate_id": candidate_id},
    ).data or []
    if not rows:
        raise HTTPException(404, "Contact information is not available.")

    # The contact RPC also updates the candidate status. Read the owner's
    # current profile directly afterwards so name/phone/email are not lost
    # when an older database function only returns name and phone.
    contact = rows[0]
    try:
        admin = get_supabase_admin()
        candidate_row = (
            admin.table("candidates")
            .select("candidate_post_id")
            .eq("candidate_id", candidate_id)
            .limit(1)
            .execute()
        )
        candidate_data = candidate_row.data or []
        if candidate_data:
            found_post_id = int(candidate_data[0]["candidate_post_id"])
            post_row = (
                admin.table("posts")
                .select("user_id")
                .eq("post_id", found_post_id)
                .limit(1)
                .execute()
            )
            post_data = post_row.data or []
            if post_data:
                owner_id = int(post_data[0]["user_id"])
                user_row = (
                    admin.table("users")
                    .select("full_name, phone, email")
                    .eq("user_id", owner_id)
                    .limit(1)
                    .execute()
                )
                user_data = user_row.data or []
                if user_data:
                    owner = user_data[0]
                    contact = {
                        "contact_name": owner.get("full_name"),
                        "contact_phone": owner.get("phone"),
                        "contact_email": owner.get("email"),
                    }
    except Exception:
        # Keep the existing RPC response if the profile lookup is unavailable.
        pass

    return contact


@router.post("/{candidate_id}/reject")
def reject(candidate_id: int, user_id: int = Depends(get_current_user_id)):
    rpc(
        "reject_candidate",
        {"p_requester_id": user_id, "p_candidate_id": candidate_id},
    )
    return {"status": "REJECTED"}
@router.post("/{candidate_id}/resolve")
def resolve(candidate_id: int, lost_post_id: int, user_id: int = Depends(get_current_user_id)):
    """Resolve a LOST/FOUND pair through the canonical database transaction."""
    rpc(
        "resolve_lost_post",
        {
            "p_requester_id": user_id,
            "p_lost_post_id": lost_post_id,
            "p_source": None,
            "p_candidate_id": candidate_id,
        },
    )
    return {"status": "RESOLVED", "candidate_id": candidate_id, "lost_post_id": lost_post_id}
