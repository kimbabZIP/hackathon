from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from assignment_grader import auth as auth_module
from assignment_grader.schemas import AuthResponse, AuthUser, UserLoginRequest, UserRegisterRequest

router = APIRouter(prefix="/auth", tags=["auth"])


def _request_metadata(request: Request) -> tuple[str | None, str | None]:
    ip_address = request.client.host if request.client else None
    return ip_address, request.headers.get("user-agent")


async def _start_session(response: Response, request: Request, user: AuthUser) -> None:
    ip_address, user_agent = _request_metadata(request)
    token = await asyncio.to_thread(
        auth_module.auth_store.create_session,
        user.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    auth_module.set_session_cookie(response, token)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserRegisterRequest,
    request: Request,
    response: Response,
) -> AuthResponse:
    try:
        user = await asyncio.to_thread(auth_module.auth_store.register, payload)
    except auth_module.AuthConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    await _start_session(response, request, user)
    return AuthResponse(user=user)


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: UserLoginRequest,
    request: Request,
    response: Response,
) -> AuthResponse:
    ip_address, user_agent = _request_metadata(request)
    user = await asyncio.to_thread(
        auth_module.auth_store.authenticate,
        payload,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
        )
    await _start_session(response, request, user)
    return AuthResponse(user=user)


@router.post("/logout")
async def logout(request: Request, response: Response) -> dict[str, bool]:
    token = request.cookies.get(auth_module.SESSION_COOKIE_NAME)
    if token:
        await asyncio.to_thread(auth_module.auth_store.revoke_session, token)
    auth_module.clear_session_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=AuthResponse)
async def me(user: AuthUser = Depends(auth_module.get_current_user)) -> AuthResponse:
    return AuthResponse(user=user)
