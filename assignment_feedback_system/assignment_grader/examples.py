from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class Example:
    id: str
    label: str
    description: str
    lecture_summary: str
    assignment_prompt: str
    student_submission: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


SUMMARY = """# Git 버전 관리 핵심
## 버전 비교
- 커밋은 각 버전의 변경 사항을 포함하는 단위다.
- History에서 커밋과 변경 파일을 확인하고, 두 버전을 Ctrl+클릭해 차이를 비교할 수 있다.
## 작업 되돌리기
- revert는 기존 이력을 보존하면서 반대 변경을 담은 새 커밋을 만든다.
- reset은 브랜치 포인터를 과거로 이동한다.
- soft는 인덱스와 작업 내용을 보존하고, mixed는 작업 내용만 보존하며, hard는 둘 다 폐기한다.
## 스태시
- stash는 추적 중인 파일의 미완성 변경을 임시 저장하고 작업 디렉터리를 깨끗하게 만든다.
- stash 적용 후 목록을 유지하거나 삭제할 수 있다.
- 일반적으로 추적하지 않는 신규 파일은 기본 stash 대상이 아니다.
"""

EXAMPLES = [
    Example(
        id="strong",
        label="예제 1 · 우수 답안",
        description="요구사항과 개념을 모두 충족한 답안",
        lecture_summary=SUMMARY,
        assignment_prompt="revert와 reset의 차이를 설명하고, 협업 브랜치에서 잘못된 커밋을 되돌리는 방법을 300자 이상 논하시오. hard reset의 위험도 포함하시오.",
        student_submission="""revert는 특정 커밋의 변경을 반대로 적용한 새 커밋을 생성하므로 기존 이력이 남는다. 반면 reset은 현재 브랜치 포인터를 과거 커밋으로 이동한다. 협업 브랜치에 이미 push한 커밋이라면 다른 구성원이 그 이력을 바탕으로 작업할 수 있으므로 revert를 선택하는 것이 안전하다. reset 후 강제 push하면 동료의 이력과 충돌할 수 있기 때문이다. 특히 hard reset은 인덱스뿐 아니라 작업 디렉터리의 수정 내용도 폐기하므로 복구가 어려울 수 있다. 아직 공유하지 않은 로컬 커밋을 정리할 때는 목적에 따라 soft 또는 mixed reset을 사용할 수 있다. 따라서 공유 여부와 보존해야 할 변경 내용을 먼저 확인한 뒤 방법을 선택해야 한다.""",
    ),
    Example(
        id="misconception",
        label="예제 2 · 오개념 답안",
        description="핵심 용어는 있지만 revert/reset을 반대로 이해한 답안",
        lecture_summary=SUMMARY,
        assignment_prompt="revert와 reset의 차이를 설명하고, 협업 브랜치에서 잘못된 커밋을 되돌리는 방법을 300자 이상 논하시오. hard reset의 위험도 포함하시오.",
        student_submission="""revert는 과거 커밋으로 완전히 돌아가서 이후 기록을 지우는 명령이다. reset은 잘못된 작업을 취소한 새 커밋을 만들어 기록을 안전하게 남긴다. 따라서 협업 브랜치에서는 reset을 쓰는 것이 가장 안전하다. hard reset도 커밋 기록만 지우고 실제 파일은 그대로 보존하므로 언제든 사용해도 된다. 두 방식은 결국 같은 결과이므로 편한 것을 고르면 된다.""",
    ),
    Example(
        id="incomplete",
        label="예제 3 · 미완성 답안",
        description="분량과 근거가 부족한 답안",
        lecture_summary=SUMMARY,
        assignment_prompt="stash의 목적, 적용 대상, 생성·복원 절차를 설명하고 실제 활용 상황을 하나 제시하시오.",
        student_submission="stash는 작업을 잠깐 저장하는 기능이다. 버튼을 누르면 저장되고 나중에 다시 쓸 수 있어서 편리하다.",
    ),
]


def get_example(example_id: str) -> Example | None:
    return next((item for item in EXAMPLES if item.id == example_id), None)
