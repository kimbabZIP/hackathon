"""
parser.py
GPT-4o Vision 기반 PDF 파서.

텍스트 기반 PDF는 PyMuPDF로 직접 추출하고,
이미지 기반(스캔/슬라이드 이미지) PDF는 페이지를 PNG로 렌더링한 뒤
GPT-4o Vision API로 OCR + 구조 분석을 수행한다.

흐름:
  1. PyMuPDF로 텍스트 추출 시도
  2. 텍스트가 없으면 → 페이지를 이미지로 렌더링 → base64 인코딩
  3. GPT-4o vision으로 제목/본문 구조화 텍스트 추출
  4. SlideData 반환
"""

from __future__ import annotations

import asyncio
import base64
import logging
from typing import Union

import httpx
import pymupdf as fitz
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from .config import settings
from .schemas import SlideData

logger = logging.getLogger(__name__)

cnt = 0

# ── Vision 프롬프트 ─────────────────────────────────────────────────────────

_VISION_SYSTEM_PROMPT = """\
You are an expert OCR engine and academic content extractor.
Analyze the lecture slide image and extract all text content with structural awareness.

OUTPUT FORMAT (strict):
TITLE: <the main title or heading of the slide, empty string if none>
BODY:
<all remaining text content, preserving bullet points, numbering, and hierarchy>
<include formulas, code snippets, labels, captions exactly as they appear>

RULES:
- Extract ALL visible text, including small labels, axis titles, legend text, and footnotes.
- Preserve Korean characters exactly as written.
- If the slide is blank or contains only decorative images, output: TITLE: \nBODY: (empty slide)
- Do NOT add any commentary or explanation outside the format.
"""

_VISION_USER_PROMPT = "Extract all text from this lecture slide following the system instructions."


class PDFParser:
    """
    PDF를 페이지 단위로 파싱해 SlideData 리스트를 반환한다.

    텍스트 PDF: PyMuPDF 직접 추출 (빠름, 무료)
    이미지 PDF: Gemini Vision OCR (정확함, 무료 티어 활용)
    """

    def __init__(
        self,
        title_font_size_threshold: float | None = None,
        concurrency_limit: int | None = None,
    ) -> None:
        self._threshold = title_font_size_threshold or settings.title_font_size_threshold
        self._semaphore = asyncio.Semaphore(
            concurrency_limit or settings.concurrency_limit
        )
        self._effective_model = settings.vision_model

    async def _ensure_valid_model(self) -> None:
        list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={settings.gemini_api_key}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(list_url)
                if r.status_code == 200:
                    data = r.json()
                    available = [
                        m["name"].replace("models/", "")
                        for m in data.get("models", [])
                        if "generateContent" in m.get("supportedGenerationMethods", [])
                    ]
                    logger.info("계정에서 사용 가능한 Gemini 모델 목록: %s", available)
                    if self._effective_model not in available:
                        for pref in ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.7-flash", "gemini-flash-lite-latest", "gemini-flash-latest"]:
                            if pref in available:
                                self._effective_model = pref
                                break
                        else:
                            if available:
                                self._effective_model = available[0]
                    settings.vision_model = self._effective_model
                    settings.map_model = self._effective_model
                    settings.reduce_model = self._effective_model
                else:
                    logger.error("모델 목록 조회 실패 [%d]: %s", r.status_code, r.text)
        except Exception as e:
            logger.warning("모델 목록 자동 조회 오류: %s", e)

    # ── public ──────────────────────────────────────────────────────────────

    def parse(self, pdf_source: Union[str, bytes]) -> list[SlideData]:
        """
        PDF를 파싱해 SlideData 리스트를 반환한다 (동기 래퍼).
        비동기 환경에서는 parse_async()를 직접 호출하는 것을 권장합니다.
        """
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, self.parse_async(pdf_source)).result()
        return asyncio.run(self.parse_async(pdf_source))

    async def parse_async(self, pdf_source: Union[str, bytes]) -> list[SlideData]:
        """비동기 파싱 메인 메서드."""
        doc = self._open_document(pdf_source)
        total = len(doc)
        logger.info("PDF 열기 완료: 총 %d 페이지", total)

        # 1단계: 모든 페이지에서 텍스트 추출 시도
        text_results: list[SlideData | None] = []
        image_page_indices: list[int] = []

        for i in range(total):
            slide = self._try_text_extract(doc[i], page_number=i + 1)
            if slide is not None:
                text_results.append(slide)
            else:
                # 이미지 페이지 → Vision 처리 대기
                text_results.append(None)
                image_page_indices.append(i)

        if image_page_indices:
            # 사용 가능한 모델 자동 확인
            await self._ensure_valid_model()
            total_img = len(image_page_indices)
            est_seconds = int(total_img * 1.2 / settings.concurrency_limit) + 5
            logger.info(
                "이미지 기반 페이지 %d개 발견 → Gemini Vision OCR 시작 (%s, 예상 소요 시간: 약 %d초, 동시 %d개)",
                total_img,
                self._effective_model,
                est_seconds,
                settings.concurrency_limit,
            )

            completed = 0
            lock = asyncio.Lock()

            # 2단계: 이미지 페이지를 병렬(세마포어 제한)로 Vision OCR 처리
            async def _bounded_vision(page_idx: int) -> SlideData:
                nonlocal completed
                page_num = page_idx + 1
                async with self._semaphore:
                    slide_res = await self._vision_extract(doc[page_idx], page_number=page_num)
                async with lock:
                    completed += 1
                    pct = (completed / total_img) * 100
                    title_preview = f" ('{slide_res.title[:20]}...')" if slide_res.title else ""
                    logger.info(
                        "      [%2d/%d (%.0f%%)] 페이지 %d Vision OCR 완료%s",
                        completed,
                        total_img,
                        pct,
                        page_num,
                        title_preview,
                    )
                return slide_res

            vision_tasks = [
                _bounded_vision(i)
                for i in image_page_indices
            ]
            vision_results = await asyncio.gather(*vision_tasks, return_exceptions=True)

            for idx, result in zip(image_page_indices, vision_results):
                if isinstance(result, Exception):
                    logger.error("페이지 %d Vision OCR 실패: %s", idx + 1, result)
                    text_results[idx] = SlideData(
                        page_number=idx + 1,
                        raw_text="",
                        is_empty_or_noise=True,
                    )
                else:
                    text_results[idx] = result

        doc.close()

        slides = [s for s in text_results if s is not None]
        logger.info("PDF 파싱 완료: 총 %d 페이지 (Vision OCR: %d페이지)", total, len(image_page_indices))
        return slides

    # ── 텍스트 추출 (PyMuPDF) ────────────────────────────────────────────────

    @staticmethod
    def _open_document(pdf_source: Union[str, bytes]) -> fitz.Document:
        try:
            if isinstance(pdf_source, bytes):
                return fitz.open(stream=pdf_source, filetype="pdf")
            return fitz.open(pdf_source)
        except Exception as exc:
            raise RuntimeError(f"PDF 열기 실패: {exc}") from exc

    def _try_text_extract(self, page: fitz.Page, page_number: int) -> SlideData | None:
        """
        PyMuPDF로 텍스트 추출을 시도한다.
        텍스트가 충분히 있으면 SlideData 반환, 없거나 비어있으면 None 반환(Vision 대상).
        """
        try:
            # 빠른 텍스트 확인
            plain_text = page.get_text().strip()
            if not plain_text or len(plain_text) < 15:
                return None  # 텍스트가 거의 없음 → Vision OCR 대상

            blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]
        except Exception:
            return None

        text_blocks = [b for b in blocks if b.get("type") == 0]
        if not text_blocks:
            return None

        max_font_size = self._get_max_font_size(text_blocks)
        effective_threshold = (
            min(self._threshold, max_font_size) if max_font_size > 0 else self._threshold
        )

        title_parts: list[str] = []
        body_parts: list[str] = []
        raw_lines: list[str] = []

        for block in text_blocks:
            for line in block.get("lines", []):
                line_text_parts: list[str] = []
                line_max_size: float = 0.0
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    size = span.get("size", 0.0)
                    if text:
                        line_text_parts.append(text)
                        line_max_size = max(line_max_size, size)

                line_text = " ".join(line_text_parts).strip()
                if not line_text:
                    continue
                raw_lines.append(line_text)
                if line_max_size >= effective_threshold:
                    title_parts.append(line_text)
                else:
                    body_parts.append(line_text)

        raw_text = "\n".join(raw_lines)
        if not raw_text.strip():
            return None

        return SlideData(
            page_number=page_number,
            title=" | ".join(title_parts) if title_parts else None,
            body="\n".join(body_parts),
            raw_text=raw_text,
        )

    @staticmethod
    def _get_max_font_size(text_blocks: list[dict]) -> float:
        max_size = 0.0
        for block in text_blocks:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    size = span.get("size", 0.0)
                    if size > max_size:
                        max_size = size
        return max_size

    # ── Vision OCR (Gemini REST API) ─────────────────────────────────────────

    @retry(
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(settings.retry_attempts),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        reraise=True,
    )
    async def _vision_extract(self, page: fitz.Page, page_number: int) -> SlideData:
        """Gemini REST API로 단일 페이지를 OCR해 SlideData를 반환한다."""
        logger.debug("Vision OCR 시작: 페이지 %d", page_number)

        mat = fitz.Matrix(settings.render_dpi / 72, settings.render_dpi / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("png")
        b64_image = base64.b64encode(img_bytes).decode("utf-8")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.vision_model}:generateContent?key={settings.gemini_api_key}"
        headers = {
            "Content-Type": "application/json",
        }

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{_VISION_SYSTEM_PROMPT}\n\n{_VISION_USER_PROMPT}"},
                        {
                            "inlineData": {
                                "mimeType": "image/png",
                                "data": b64_image,
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "maxOutputTokens": settings.max_tokens_vision,
            },
        }

        async with httpx.AsyncClient(timeout=45.0) as http_client:
            for attempt in range(5):
                resp = await http_client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    global cnt
                    cnt += 1
                    print(f"data count = {cnt}")
                    # 무료 티어 RPM 보호를 위한 짧은 간격
                    await asyncio.sleep(1.5)
                    break
                elif resp.status_code == 429:
                    logger.warning(
                        "페이지 %d [429 Rate Limit 감지] 무료 티어 분당 제한으로 25초 대기 후 자동 재개합니다... (시도 %d/5)",
                        page_number,
                        attempt + 1,
                    )
                    await asyncio.sleep(25.0)
                else:
                    logger.error("Gemini API 호출 실패 [%d]: %s", resp.status_code, resp.text)
                    raise RuntimeError(f"Gemini API 오류 ({resp.status_code}): {resp.text}")
            else:
                raise RuntimeError(f"페이지 {page_number} 429 Rate Limit 최대 재시도 초과")

        try:
            raw_output = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raw_output = ""

        logger.debug("Vision OCR 완료: 페이지 %d (%d자)", page_number, len(raw_output))
        return self._parse_vision_output(raw_output, page_number)

    @staticmethod
    def _parse_vision_output(raw: str, page_number: int) -> SlideData:
        """Vision API 출력을 파싱해 SlideData로 변환한다."""
        title: str | None = None
        body_lines: list[str] = []
        in_body = False

        for line in raw.splitlines():
            stripped = line.strip()
            if stripped.upper().startswith("TITLE:"):
                title_val = stripped[len("TITLE:"):].strip()
                title = title_val if title_val else None
                in_body = False
            elif stripped.upper().startswith("BODY:"):
                in_body = True
                remainder = stripped[len("BODY:"):].strip()
                if remainder:
                    body_lines.append(remainder)
            elif in_body:
                body_lines.append(line.rstrip())

        body = "\n".join(body_lines).strip()
        raw_text = f"{title or ''}\n{body}".strip()

        return SlideData(
            page_number=page_number,
            title=title,
            body=body,
            raw_text=raw_text,
        )
