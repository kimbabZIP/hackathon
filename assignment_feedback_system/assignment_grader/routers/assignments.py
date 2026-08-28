from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from assignment_grader.documents import DocumentError, extract_text
from assignment_grader.engine import AIGradingUnavailableError, grade_with_fallback
from assignment_grader.examples import EXAMPLES, get_example
from assignment_grader.schemas import FeedbackReport, GradeRequest

router = APIRouter(prefix="/assignments", tags=["assignments"])
legacy_router = APIRouter(tags=["legacy"], include_in_schema=False)


async def _examples() -> list[dict[str, str]]:
    return [item.to_dict() for item in EXAMPLES]


async def _example(example_id: str) -> dict[str, str]:
    item = get_example(example_id)
    if item is None:
        raise HTTPException(status_code=404, detail="예제를 찾을 수 없습니다.")
    return item.to_dict()


async def _grade(request: GradeRequest, *, require_ai: bool = False) -> FeedbackReport:
    try:
        return await grade_with_fallback(request, require_ai=require_ai)
    except AIGradingUnavailableError as exc:
        raise HTTPException(
            status_code=503 if exc.unavailable else 502,
            detail=str(exc),
        ) from exc


async def _grade_files(
    lecture_file: UploadFile | None,
    assignment_file: UploadFile | None,
    submission_file: UploadFile | None,
    lecture_text: str,
    assignment_text: str,
    submission_text: str,
    require_ai: bool = False,
) -> FeedbackReport:
    async def value(upload: UploadFile | None, pasted: str, label: str) -> str:
        if pasted.strip():
            return pasted.strip()
        if upload is None or not upload.filename:
            raise HTTPException(status_code=422, detail=f"{label}을 입력해 주세요.")
        try:
            return extract_text(upload.filename, await upload.read())
        except DocumentError as exc:
            raise HTTPException(status_code=422, detail=f"{upload.filename}: {exc}") from exc

    request = GradeRequest(
        lecture_summary=await value(lecture_file, lecture_text, "강의 요약본"),
        assignment_prompt=await value(assignment_file, assignment_text, "교수 과제 내용"),
        student_submission=await value(submission_file, submission_text, "학생 제출 과제"),
    )
    return await _grade(request, require_ai=require_ai)


@router.get("/examples")
async def examples() -> list[dict[str, str]]:
    return await _examples()


@router.get("/examples/{example_id}")
async def example(example_id: str) -> dict[str, str]:
    return await _example(example_id)


@router.post("/grade", response_model=FeedbackReport)
async def grade(request: GradeRequest, require_ai: bool = False) -> FeedbackReport:
    return await _grade(request, require_ai=require_ai)


@router.post("/grade-files", response_model=FeedbackReport)
async def grade_files(
    lecture_file: UploadFile | None = File(None),
    assignment_file: UploadFile | None = File(None),
    submission_file: UploadFile | None = File(None),
    lecture_text: str = Form(""),
    assignment_text: str = Form(""),
    submission_text: str = Form(""),
    require_ai: bool = False,
) -> FeedbackReport:
    return await _grade_files(
        lecture_file,
        assignment_file,
        submission_file,
        lecture_text,
        assignment_text,
        submission_text,
        require_ai,
    )


@legacy_router.get("/examples")
async def legacy_examples() -> list[dict[str, str]]:
    return await _examples()


@legacy_router.get("/examples/{example_id}")
async def legacy_example(example_id: str) -> dict[str, str]:
    return await _example(example_id)


@legacy_router.post("/grade", response_model=FeedbackReport)
async def legacy_grade(request: GradeRequest, require_ai: bool = False) -> FeedbackReport:
    return await _grade(request, require_ai=require_ai)


@legacy_router.post("/grade-files", response_model=FeedbackReport)
async def legacy_grade_files(
    lecture_file: UploadFile | None = File(None),
    assignment_file: UploadFile | None = File(None),
    submission_file: UploadFile | None = File(None),
    lecture_text: str = Form(""),
    assignment_text: str = Form(""),
    submission_text: str = Form(""),
    require_ai: bool = False,
) -> FeedbackReport:
    return await _grade_files(
        lecture_file,
        assignment_file,
        submission_file,
        lecture_text,
        assignment_text,
        submission_text,
        require_ai,
    )
