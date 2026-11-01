from fastapi import APIRouter,Depends,HTTPException
from app.core.auth import get_current_user_id
from app.core.database import get_supabase
router=APIRouter(prefix="/candidates",tags=["Candidates"])
def rpc(name,args):
    try:return get_supabase().rpc(name,args).execute()
    except Exception as exc:
        msg=str(exc)
        if "insufficient_privilege" in msg:raise HTTPException(403,msg)
        if "check_violation" in msg:raise HTTPException(400,msg)
        raise HTTPException(500,"Candidate operation failed.") from exc
@router.get("/post/{post_id}")
def list_candidates(post_id:int,only_passed:bool=False,status:str|None=None,user_id:int=Depends(get_current_user_id)):
    return {"items":rpc("get_candidates_for_post",{"p_lost_post_id":post_id,"p_only_passed":only_passed,"p_status":status}).data or []}
@router.post("/{candidate_id}/contact")
def contact(candidate_id:int,user_id:int=Depends(get_current_user_id)):
    rows=rpc("contact_candidate",{"p_requester_id":user_id,"p_candidate_id":candidate_id}).data or []
    if not rows:raise HTTPException(404,"Candidate contact information not available.")
    return rows[0]
@router.post("/{candidate_id}/reject")
def reject(candidate_id:int,user_id:int=Depends(get_current_user_id)):
    rpc("reject_candidate",{"p_requester_id":user_id,"p_candidate_id":candidate_id}); return {"status":"REJECTED"}
