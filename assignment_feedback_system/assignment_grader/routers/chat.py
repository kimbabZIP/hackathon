from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from assignment_grader.auth import get_optional_user
from assignment_grader.material_store import material_store
from assignment_grader.professor_chat import chat_with_fallback
from assignment_grader.professor_store import professor_store
from assignment_grader.schemas import AuthUser, ProfessorChatRequest, ProfessorChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])
legacy_router = APIRouter(tags=["legacy"], include_in_schema=False)


async def _chat(request: ProfessorChatRequest, user: AuthUser | None = None) -> ProfessorChatResponse:
    lecture_context = ""
    context_sources = []
    if request.professor_id:
        if user and professor_store.get_owned(user.id, request.professor_id) is None:
            raise HTTPException(status_code=404, detail="교수 프로필을 찾을 수 없습니다.")
        lecture_context, context_sources = material_store.build_chat_context(
            request.professor_id,
            owner_user_id=user.id if user else None,
        )
    return await chat_with_fallback(request, lecture_context, context_sources)


@router.post("", response_model=ProfessorChatResponse)
async def professor_chat(
    request: ProfessorChatRequest,
    user: AuthUser | None = Depends(get_optional_user),
) -> ProfessorChatResponse:
    return await _chat(request, user)


@legacy_router.post("/professor-chat", response_model=ProfessorChatResponse)
async def legacy_professor_chat(
    request: ProfessorChatRequest,
    user: AuthUser | None = Depends(get_optional_user),
) -> ProfessorChatResponse:
    return await _chat(request, user)
