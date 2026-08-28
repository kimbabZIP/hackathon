"""
normalizer.py
학생의 1:N 답변/버전 데이터 정규화 및 교육 자료(강의 슬라이드/교안) 정규화 모듈.
"""

from __future__ import annotations

import difflib
import re
from typing import Any, Dict, List, Optional

from .schemas import (
    ItemResponse,
    NormalizedKnowledgeRule,
    NormalizedLectureKnowledge,
    NormalizedSubmission,
    SentenceDiff,
    SubmissionVersion,
)


class SubmissionNormalizer:
    """학생 제출본 및 1:N 다중 답변 데이터를 문장 단위 Diff로 정규화하는 엔진"""

    @staticmethod
    def split_sentences(text: str) -> List[str]:
        """한국어 및 기술 문서 텍스트를 문장 단위로 분절하고 정규화한다."""
        if not text:
            return []
        
        # 줄바꿈 정규화
        cleaned = re.sub(r"\r\n", "\n", text)
        cleaned = re.sub(r"\n{2,}", "\n", cleaned)
        
        raw_lines = cleaned.split("\n")
        sentences: List[str] = []

        for line in raw_lines:
            line_str = line.strip()
            if not line_str:
                continue
            # 문장 분절 정규식 (마침표, 물음표, 느낌표 뒤 또는 번호 매김)
            parts = re.split(r"(?<=[.?!])\s+", line_str)
            for p in parts:
                p_clean = p.strip()
                if p_clean:
                    sentences.append(p_clean)

        return sentences

    @classmethod
    def normalize_versions(
        cls,
        base_version: SubmissionVersion,
        target_version: SubmissionVersion,
    ) -> NormalizedSubmission:
        """
        이전 버전(v1)과 대상 버전(v2)을 비교하여 문장 단위의 Myers diff와
        학생의 1:N 개별 응답을 통합 정규화한다.
        """
        s_before = cls.split_sentences(base_version.content)
        s_after = cls.split_sentences(target_version.content)

        matcher = difflib.SequenceMatcher(None, s_before, s_after)
        diff_items: List[SentenceDiff] = []
        sent_idx = 1

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal":
                for idx in range(i1, i2):
                    diff_items.append(
                        SentenceDiff(
                            diff_type="UNCHANGED",
                            sentence_index=sent_idx,
                            before_text=s_before[idx],
                            after_text=s_before[idx],
                        )
                    )
                    sent_idx += 1
            elif tag == "replace":
                for b_text, a_text in zip(s_before[i1:i2], s_after[j1:j2]):
                    diff_items.append(
                        SentenceDiff(
                            diff_type="MODIFIED",
                            sentence_index=sent_idx,
                            before_text=b_text,
                            after_text=a_text,
                        )
                    )
                    sent_idx += 1
                # 남은 문장 처리
                if (i2 - i1) > (j2 - j1):
                    for b_text in s_before[i1 + (j2 - j1):i2]:
                        diff_items.append(
                            SentenceDiff(
                                diff_type="DELETED",
                                sentence_index=sent_idx,
                                before_text=b_text,
                                after_text=None,
                            )
                        )
                        sent_idx += 1
                elif (j2 - j1) > (i2 - i1):
                    for a_text in s_after[j1 + (i2 - i1):j2]:
                        diff_items.append(
                            SentenceDiff(
                                diff_type="ADDED",
                                sentence_index=sent_idx,
                                before_text=None,
                                after_text=a_text,
                            )
                        )
                        sent_idx += 1
            elif tag == "delete":
                for idx in range(i1, i2):
                    diff_items.append(
                        SentenceDiff(
                            diff_type="DELETED",
                            sentence_index=sent_idx,
                            before_text=s_before[idx],
                            after_text=None,
                        )
                    )
                    sent_idx += 1
            elif tag == "insert":
                for idx in range(j1, j2):
                    diff_items.append(
                        SentenceDiff(
                            diff_type="ADDED",
                            sentence_index=sent_idx,
                            before_text=None,
                            after_text=s_after[idx],
                        )
                    )
                    sent_idx += 1

        return NormalizedSubmission(
            base_version_no=base_version.version_no,
            target_version_no=target_version.version_no,
            sentences_count_before=len(s_before),
            sentences_count_after=len(s_after),
            diff_items=diff_items,
            item_responses=target_version.item_responses,
        )


class KnowledgeNormalizer:
    """강의 슬라이드 교안 및 지식 청크를 정규화된 규칙 노드로 변환하는 엔진"""

    @staticmethod
    def normalize_lecture_chunks(
        chunks: List[Dict[str, Any]],
        course_name: str = "오픈소스 소프트웨어 개론",
    ) -> NormalizedLectureKnowledge:
        """
        파싱된 강의 청크 데이터로부터 정규화된 지식 규칙 목록을 추출/생성한다.
        """
        rules: List[NormalizedKnowledgeRule] = []

        for idx, ch in enumerate(chunks, 1):
            chunk_id = ch.get("chunkId", f"chunk_{idx}")
            title = ch.get("title", f"섹션 {idx}")
            content = ch.get("content", "")
            page = ch.get("page", ch.get("page_no", 1))
            doc_name = ch.get("document_name", "강의교안.pdf")

            # 청크 내 문장별 규칙 정규화
            sentences = SubmissionNormalizer.split_sentences(content)
            for s_idx, sent in enumerate(sentences, 1):
                rule_type = "BEST_PRACTICE"
                if any(kw in sent for kw in ["금지", "안 된다", "하면 안", "위험", "불가"]):
                    rule_type = "PROHIBITED_ACTION"
                elif any(kw in sent for kw in ["반드시", "해야 한다", "필수", "원칙", "규칙"]):
                    rule_type = "MANDATORY_RULE"
                elif any(kw in sent for kw in ["이란", "정의", "개념", "뜻"]):
                    rule_type = "CONCEPT_DEFINITION"

                rules.append(
                    NormalizedKnowledgeRule(
                        rule_id=f"rule_{chunk_id}_{s_idx}",
                        topic=title,
                        rule_type=rule_type,
                        statement=sent,
                        document_source=doc_name,
                        page_or_slide=page,
                        chunk_id=chunk_id,
                    )
                )

        return NormalizedLectureKnowledge(
            course_name=course_name,
            rules=rules,
        )
