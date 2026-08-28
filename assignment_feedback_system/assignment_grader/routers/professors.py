from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException, status

from assignment_grader.auth import get_current_user
from assignment_grader.professor_store import professor_store
from assignment_grader.schemas import AuthUser, ProfessorProfileRecord, ProfessorProfileUpsert

router = APIRouter(prefix="/professors", tags=["professors"])


@router.get("", response_model=list[ProfessorProfileRecord])
async def list_professors(user: AuthUser = Depends(get_current_user)) -> list[ProfessorProfileRecord]:
    return await asyncio.to_thread(professor_store.list_for_user, user.id)


@router.post("", response_model=ProfessorProfileRecord)
async def save_professor(
    payload: ProfessorProfileUpsert,
    user: AuthUser = Depends(get_current_user),
) -> ProfessorProfileRecord:
    return await asyncio.to_thread(professor_store.upsert, user.id, payload)


@router.post("/{professor_id}/select", response_model=ProfessorProfileRecord)
async def select_professor(
    professor_id: str,
    user: AuthUser = Depends(get_current_user),
) -> ProfessorProfileRecord:
    professor = await asyncio.to_thread(professor_store.select, user.id, professor_id)
    if professor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="교수 프로필을 찾을 수 없습니다.")
    return professor
