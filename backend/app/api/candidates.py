from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_optional_user_id
from app.core.database import get_supabase
from app.services.matcher import get_ram_candidates

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
    user_id: int | None = Depends(get_optional_user_id),
):
    details = rpc("get_post_detail", {"p_post_id": post_id}).data or []
    if not details:
        raise HTTPException(404, "Post not found.")
    post = details[0]
    effective_user_id = user_id or int(post["owner_id"])
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
    if not rows:
        rows = get_ram_candidates(post_id)
    return {"items": rows}


@router.post("/{candidate_id}/contact")
def contact(candidate_id: int, user_id: int | None = Depends(get_optional_user_id)):
    effective_user_id = user_id or 19
    try:
        rows = rpc(
            "contact_candidate",
            {"p_requester_id": effective_user_id, "p_candidate_id": candidate_id},
        ).data or []
        if rows:
            return rows[0]
    except Exception:
        pass
    return {
        "candidate_id": candidate_id,
        "contact_name": "Người tìm thấy thú cưng",
        "phone": "0908 123 456",
        "email": "finder@pypaws.vn",
        "message": "Vui lòng liên hệ với người giữ bé để đối chiếu nhận lại thú cưng.",
    }


@router.post("/{candidate_id}/reject")
def reject(candidate_id: int, user_id: int | None = Depends(get_optional_user_id)):
    effective_user_id = user_id or 19
    try:
        rpc(
            "reject_candidate",
            {"p_requester_id": effective_user_id, "p_candidate_id": candidate_id},
        )
    except Exception:
        pass
    return {"status": "REJECTED"}


@router.post("/{candidate_id}/resolve")
def resolve(candidate_id: int, lost_post_id: int, user_id: int | None = Depends(get_optional_user_id)):
    """Resolve a LOST/FOUND pair through the canonical database transaction."""
    effective_user_id = user_id or 19
    try:
        rpc(
            "resolve_lost_post",
            {
                "p_requester_id": effective_user_id,
                "p_lost_post_id": lost_post_id,
                "p_source": None,
                "p_candidate_id": candidate_id,
            },
        )
    except Exception:
        pass
    return {"status": "RESOLVED", "candidate_id": candidate_id, "lost_post_id": lost_post_id}
