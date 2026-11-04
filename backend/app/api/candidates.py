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

    # Keep the existing authorization/status flow, then enrich the same contact
    # with email. Return both naming conventions so the current frontend can
    # consume the response without changing any matching logic.
    contact = rows[0]
    contact_name = contact.get("contact_name") or contact.get("name")
    contact_phone = contact.get("contact_phone") or contact.get("phone")
    contact_email = contact.get("contact_email") or contact.get("email")

    try:
        email_rows = get_supabase().rpc(
            "get_contact_info_with_email",
            {"p_requester_id": user_id, "p_candidate_id": candidate_id},
        ).execute().data or []
        if email_rows:
            enriched = email_rows[0]
            contact_name = enriched.get("contact_name") or contact_name
            contact_phone = enriched.get("contact_phone") or contact_phone
            contact_email = enriched.get("contact_email") or contact_email
    except Exception:
        # Email is optional; preserve the existing name/phone contact flow.
        pass

    return {
        "contact_name": contact_name,
        "contact_phone": contact_phone,
        "contact_email": contact_email,
        "name": contact_name,
        "phone": contact_phone,
        "email": contact_email,
    }

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

@router.post("/resolve-report")
def resolve_report(lost_post_id: int, source: str, user_id: int = Depends(get_current_user_id)):
    """Resolve a LOST post when the owner found the pet outside PyPaws."""
    rpc(
        "resolve_lost_post",
        {
            "p_requester_id": user_id,
            "p_lost_post_id": lost_post_id,
            "p_source": source,
            "p_candidate_id": None,
        },
    )
    return {"status": "RESOLVED", "lost_post_id": lost_post_id, "source": source}
