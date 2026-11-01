from fastapi import APIRouter,Depends
from app.core.auth import get_current_user_id
from app.core.database import get_supabase
router=APIRouter(prefix="/notifications",tags=["Notifications"])
@router.get("")
def list_notifications(unread_only:bool=True,limit:int=50,user_id:int=Depends(get_current_user_id)):
    rows=get_supabase().rpc("get_notifications",{"p_user_id":user_id,"p_unread_only":unread_only,"p_limit":min(max(limit,1),100)}).execute().data or []
    return {"items":rows}
@router.post("/{notification_id}/read")
def mark_read(notification_id:int,user_id:int=Depends(get_current_user_id)):
    get_supabase().rpc("mark_notification_read",{"p_notification_id":notification_id,"p_user_id":user_id}).execute()
    return {"status":"READ"}
