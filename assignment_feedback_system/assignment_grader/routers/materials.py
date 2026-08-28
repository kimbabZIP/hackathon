from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from assignment_grader.auth import get_optional_user
from assignment_grader.lecture_materials import summarize_pdf
from assignment_grader.material_store import material_store
from assignment_grader.professor_store import professor_store
from assignment_grader.schemas import AuthUser, LectureMaterialRecord

router = APIRouter(prefix="/materials", tags=["materials"])

MAX_PDF_BYTES = 25 * 1024 * 1024


@router.get("", response_model=list[LectureMaterialRecord])
async def list_materials(
    professor_id: str,
    user: AuthUser | None = Depends(get_optional_user),
) -> list[LectureMaterialRecord]:
    if user and professor_store.get_owned(user.id, professor_id) is None:
        raise HTTPException(status_code=404, detail="교수 프로필을 찾을 수 없습니다.")
    return material_store.list_for_professor(
        professor_id,
        owner_user_id=user.id if user else None,
    )


@router.post("/summarize", response_model=LectureMaterialRecord)
async def summarize_material(
    professor_id: str = Form(..., min_length=1, max_length=200),
    title: str = Form(..., min_length=1, max_length=200),
    file: UploadFile = File(...),
    user: AuthUser | None = Depends(get_optional_user),
) -> LectureMaterialRecord:
    if user and professor_store.get_owned(user.id, professor_id) is None:
        raise HTTPException(status_code=404, detail="교수 프로필을 찾을 수 없습니다.")
    file_name = file.filename or "lecture.pdf"
    if not file_name.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="PDF 파일만 업로드할 수 있습니다.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=422, detail="빈 PDF 파일은 처리할 수 없습니다.")
    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF 파일은 최대 25MB까지 업로드할 수 있습니다.")
    if not pdf_bytes.startswith(b"%PDF-"):
        raise HTTPException(status_code=422, detail="올바른 PDF 파일이 아닙니다.")

    content_sha256 = hashlib.sha256(pdf_bytes).hexdigest()
    cached = material_store.find_cached(
        owner_user_id=user.id if user else None,
        professor_id=professor_id,
        content_sha256=content_sha256,
        file_name=file_name,
        file_size=len(pdf_bytes),
    )
    if cached is not None:
        return cached

    try:
        result = await summarize_pdf(pdf_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"PDF 요약에 실패했습니다: {exc}") from exc

    record = LectureMaterialRecord(
        id=f"mat-{uuid4().hex}",
        owner_user_id=user.id if user else None,
        professor_id=professor_id,
        content_sha256=content_sha256,
        title=title.strip(),
        file_name=file_name,
        file_size=len(pdf_bytes),
        total_pages=result.total_pages,
        processed_chunks=result.processed_chunks,
        summary=result.final_summary,
        engine="pdf_pipeline · Parse/Clean/Chunk/Map/Reduce",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    return material_store.save(record)
