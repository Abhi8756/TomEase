from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from .auth import get_current_user
from .database import database as db

router = APIRouter(prefix="/community", tags=["community"])

class CreatePostRequest(BaseModel):
    title: str
    content: str
    scan_id: Optional[str] = None

class CreateCommentRequest(BaseModel):
    content: str

@router.get("/posts")
async def get_posts(limit: int = 50, current_user: dict = Depends(get_current_user)):
    """Get global community posts"""
    return await db.get_community_posts(current_user["id"], limit)

@router.post("/posts")
async def create_post(req: CreatePostRequest, current_user: dict = Depends(get_current_user)):
    """Create a new community post"""
    if not req.title.strip() or not req.content.strip():
        raise HTTPException(400, "Title and content cannot be empty")
        
    post_id = await db.create_community_post(
        user_id=current_user["id"],
        title=req.title.strip(),
        content=req.content.strip(),
        scan_id=req.scan_id
    )
    return {"status": "success", "post_id": post_id}

@router.post("/posts/{post_id}/upvote")
async def toggle_upvote(post_id: int, current_user: dict = Depends(get_current_user)):
    """Toggle an upvote on a community post"""
    result = await db.toggle_upvote(post_id, current_user["id"])
    if not result:
        raise HTTPException(400, "Post not found")
    return result

@router.get("/posts/{post_id}/comments")
async def get_comments(post_id: int):
    """Get comments for a post"""
    return await db.get_post_comments(post_id)

@router.post("/posts/{post_id}/comments")
async def create_comment(post_id: int, req: CreateCommentRequest, current_user: dict = Depends(get_current_user)):
    """Create a comment on a post"""
    if not req.content.strip():
        raise HTTPException(400, "Content cannot be empty")
        
    comment_id = await db.create_comment(
        post_id=post_id,
        user_id=current_user["id"],
        content=req.content.strip()
    )
    return {"status": "success", "comment_id": comment_id}
