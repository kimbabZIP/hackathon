"""
installer.py
패키지 의존성 자동 설치 메커니즘.

importlib.metadata로 설치 여부를 먼저 확인하고,
누락된 패키지만 pip로 설치한다.
패키지 이름(pip)과 import 이름이 다른 경우를 명시적으로 매핑한다.
"""

from __future__ import annotations

import importlib
import importlib.metadata
import logging
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ── 패키지 정보 ─────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class PackageSpec:
    """pip 패키지 하나의 설치 명세."""

    # pip install 에 사용하는 이름 (버전 조건 포함 가능)
    install_name: str
    # python에서 import할 때 사용하는 모듈 이름
    import_name: str
    # importlib.metadata 에서 조회할 배포 패키지 이름 (보통 install_name 과 동일)
    dist_name: str = field(default="")
    # 선택적 의존성 여부 (False이면 설치 실패 시 RuntimeError 발생)
    optional: bool = False

    def __post_init__(self) -> None:
        # dist_name이 지정되지 않으면 install_name에서 버전 조건 제거해 사용
        if not self.dist_name:
            base = self.install_name.split(">=")[0].split("==")[0].split("!=")[0].strip()
            object.__setattr__(self, "dist_name", base)


# 프로젝트 필수/선택 패키지 목록
# install_name: requirements.txt 와 동일한 형식
# import_name: Python 코드에서 import 할 때 쓰는 이름
REQUIRED_PACKAGES: list[PackageSpec] = [
    PackageSpec(
        install_name="PyMuPDF>=1.23.0",
        import_name="fitz",
        dist_name="PyMuPDF",
    ),
    PackageSpec(
        install_name="google-generativeai>=0.1.0",
        import_name="google.generativeai",
        dist_name="google-generativeai",
    ),
    PackageSpec(
        install_name="openai>=1.0.0",
        import_name="openai",
        optional=True,
    ),
    PackageSpec(
        install_name="pydantic>=2.0.0",
        import_name="pydantic",
    ),
    PackageSpec(
        install_name="tenacity>=8.2.0",
        import_name="tenacity",
    ),
    PackageSpec(
        install_name="python-dotenv>=1.0.0",
        import_name="dotenv",
        dist_name="python-dotenv",
        optional=True,  # 없어도 파이프라인 동작에 지장 없음
    ),
    PackageSpec(
        install_name="Pillow>=10.0.0",
        import_name="PIL",
        dist_name="Pillow",
        optional=True,  # PyMuPDF 자체 렌더링을 쓰므로 선택적
    ),
]


# ── 핵심 함수 ────────────────────────────────────────────────────────────────


def _is_installed(spec: PackageSpec) -> bool:
    """
    패키지가 현재 Python 환경에 설치돼 있는지 확인한다.
    importlib.metadata 조회를 우선하고, 실패 시 직접 import를 시도한다.
    """
    # 1. 배포 메타데이터로 확인 (버전 정보 포함)
    try:
        importlib.metadata.version(spec.dist_name)
        return True
    except importlib.metadata.PackageNotFoundError:
        pass

    # 2. 실제 import 가능 여부로 폴백 확인
    try:
        importlib.import_module(spec.import_name)
        return True
    except ImportError:
        return False


def _install_package(spec: PackageSpec) -> bool:
    """
    pip를 통해 단일 패키지를 설치한다.
    SSL 인증서 오류 발생 시 --trusted-host 옵션으로 자동 재시도한다.

    Returns:
        설치 성공 여부.
    """
    logger.info("설치 중: %s", spec.install_name)

    # 1차 시도: 일반 설치
    base_cmd = [sys.executable, "-m", "pip", "install", spec.install_name, "--quiet"]
    success, stderr = _run_pip(base_cmd)
    if success:
        return True

    # SSL 오류 감지 시 trusted-host 옵션으로 재시도
    if "SSL" in stderr or "certificate" in stderr.lower():
        logger.warning(
            "SSL 인증서 오류 감지 → --trusted-host 옵션으로 재시도: %s",
            spec.install_name,
        )
        fallback_cmd = [
            sys.executable, "-m", "pip", "install", spec.install_name,
            "--quiet",
            "--trusted-host", "pypi.org",
            "--trusted-host", "pypi.python.org",
            "--trusted-host", "files.pythonhosted.org",
        ]
        success, stderr = _run_pip(fallback_cmd)
        if success:
            return True

    logger.error("설치 실패: %s\n  stderr: %s", spec.install_name, stderr.strip())
    return False


def _run_pip(cmd: list[str]) -> tuple[bool, str]:
    """pip 명령을 실행하고 (성공 여부, stderr) 를 반환한다."""
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        if result.stdout.strip():
            logger.debug("pip stdout: %s", result.stdout.strip())
        return True, ""
    except subprocess.CalledProcessError as exc:
        return False, exc.stderr or ""


def ensure_dependencies(
    packages: Optional[list[PackageSpec]] = None,
    *,
    quiet: bool = False,
) -> dict[str, bool]:
    """
    누락된 패키지를 자동으로 설치한다.

    Args:
        packages: 확인할 PackageSpec 리스트. None이면 REQUIRED_PACKAGES 사용.
        quiet: True이면 이미 설치된 패키지에 대한 로그를 생략한다.

    Returns:
        ``{패키지명: 설치 성공 여부}`` 딕셔너리.
        이미 설치돼 있던 패키지는 True로 포함된다.

    Raises:
        RuntimeError: 필수(optional=False) 패키지 설치에 실패했을 때.
    """
    targets = packages or REQUIRED_PACKAGES
    results: dict[str, bool] = {}
    failed_required: list[str] = []

    for spec in targets:
        if _is_installed(spec):
            if not quiet:
                logger.debug("이미 설치됨: %s", spec.dist_name)
            results[spec.dist_name] = True
            continue

        logger.info("누락된 패키지 발견: %s → 설치 시작", spec.install_name)
        success = _install_package(spec)
        results[spec.dist_name] = success

        if success:
            logger.info("설치 완료: %s", spec.dist_name)
        elif not spec.optional:
            failed_required.append(spec.install_name)

    if failed_required:
        raise RuntimeError(
            "다음 필수 패키지 설치에 실패했습니다:\n"
            + "\n".join(f"  - {p}" for p in failed_required)
            + "\n수동으로 설치해주세요: pip install "
            + " ".join(failed_required)
        )

    return results


def ensure_from_requirements(
    requirements_path: Optional[str | Path] = None,
    *,
    quiet: bool = False,
) -> None:
    """
    requirements.txt 파일을 직접 읽어 pip install -r 로 일괄 설치한다.
    이미 모두 설치돼 있으면 pip를 호출하지 않는다.

    Args:
        requirements_path: requirements.txt 경로. None이면 이 파일 기준 상위 디렉토리에서 탐색.
        quiet: True이면 이미 설치 완료 메시지를 생략한다.
    """
    if requirements_path is None:
        # installer.py 위치에서 상위 디렉토리(프로젝트 루트) 탐색
        req_file = Path(__file__).parent.parent / "requirements.txt"
    else:
        req_file = Path(requirements_path)

    if not req_file.exists():
        logger.warning("requirements.txt 를 찾을 수 없습니다: %s", req_file)
        return

    # 먼저 REQUIRED_PACKAGES 기준으로 모두 설치돼 있는지 빠르게 확인
    all_installed = all(_is_installed(spec) for spec in REQUIRED_PACKAGES)
    if all_installed:
        if not quiet:
            logger.debug("모든 의존성이 이미 설치돼 있습니다.")
        return

    logger.info("requirements.txt 기반 일괄 설치 시작: %s", req_file)
    base_cmd = [sys.executable, "-m", "pip", "install", "-r", str(req_file), "--quiet"]

    success, stderr = _run_pip(base_cmd)
    if not success:
        # SSL 오류 시 trusted-host 옵션으로 재시도
        if "SSL" in stderr or "certificate" in stderr.lower():
            logger.warning("SSL 인증서 오류 감지 → --trusted-host 옵션으로 재시도")
            fallback_cmd = base_cmd + [
                "--trusted-host", "pypi.org",
                "--trusted-host", "pypi.python.org",
                "--trusted-host", "files.pythonhosted.org",
            ]
            success, stderr = _run_pip(fallback_cmd)

        if not success:
            raise RuntimeError(
                f"requirements.txt 설치 실패:\n{stderr.strip()}\n"
                "수동으로 실행해주세요: pip install -r requirements.txt"
            )

    logger.info("일괄 설치 완료")
