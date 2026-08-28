from __future__ import annotations

import io
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree

MAX_FILE_BYTES = 12 * 1024 * 1024
MAX_TEXT_CHARS = 100_000
ALLOWED_SUFFIXES = {".txt", ".md", ".pdf", ".docx"}


class DocumentError(ValueError):
    pass


def extract_text(filename: str, data: bytes) -> str:
    suffix = Path(filename or "").suffix.casefold()
    if suffix not in ALLOWED_SUFFIXES:
        raise DocumentError("TXT, MD, PDF, DOCX 파일만 업로드할 수 있습니다.")
    if not data:
        raise DocumentError("빈 파일입니다.")
    if len(data) > MAX_FILE_BYTES:
        raise DocumentError("파일은 12MB 이하여야 합니다.")
    try:
        if suffix in {".txt", ".md"}:
            text = _decode_text(data)
        elif suffix == ".pdf":
            text = _extract_pdf(data)
        else:
            text = _extract_docx(data)
    except DocumentError:
        raise
    except Exception as exc:
        raise DocumentError(f"{suffix[1:].upper()} 파일을 읽지 못했습니다.") from exc
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{4,}", "\n\n\n", text).strip()
    if len(text) < 5:
        raise DocumentError("추출할 텍스트가 없습니다. 스캔 PDF라면 OCR 후 다시 업로드해 주세요.")
    return text[:MAX_TEXT_CHARS]


def _decode_text(data: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp949"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise DocumentError("텍스트 인코딩을 인식하지 못했습니다.")


def _extract_pdf(data: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise DocumentError("PDF 지원 패키지가 없습니다. requirements를 설치해 주세요.") from exc
    reader = PdfReader(io.BytesIO(data))
    if reader.is_encrypted:
        try:
            reader.decrypt("")
        except Exception as exc:
            raise DocumentError("암호화된 PDF는 읽을 수 없습니다.") from exc
    return "\n\n".join((page.extract_text() or "") for page in reader.pages)


def _extract_docx(data: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        xml = archive.read("word/document.xml")
    root = ElementTree.fromstring(xml)
    namespace = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    paragraphs: list[str] = []
    for paragraph in root.iter(namespace + "p"):
        parts = [node.text or "" for node in paragraph.iter(namespace + "t")]
        if parts:
            paragraphs.append("".join(parts))
    return "\n".join(paragraphs)
