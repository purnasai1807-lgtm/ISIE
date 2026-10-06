"""Firebase Admin ID-token verification using application-default credentials."""

from __future__ import annotations

import os
from typing import Any


class FirebaseAdminAuthVerifier:
    def __init__(self, auth_module: Any, app: Any) -> None:
        self._auth = auth_module
        self._app = app

    @classmethod
    def from_environment(cls) -> "FirebaseAdminAuthVerifier":
        project_id = os.environ.get("FIREBASE_PROJECT_ID")
        if not project_id:
            raise RuntimeError("FIREBASE_PROJECT_ID is required for Firebase token verification")

        try:
            import firebase_admin
            from firebase_admin import auth
        except ImportError as error:
            raise RuntimeError(
                "Firebase Admin SDK is unavailable; install backend/requirements.txt"
            ) from error

        try:
            app = firebase_admin.get_app()
        except ValueError:
            app = firebase_admin.initialize_app(options={"projectId": project_id})

        if app.project_id != project_id:
            raise RuntimeError("Firebase Admin app project does not match FIREBASE_PROJECT_ID")
        return cls(auth, app)

    def verify_bearer_token(self, token: str) -> dict[str, Any]:
        claims = self._auth.verify_id_token(token, check_revoked=True, app=self._app)
        uid = claims.get("uid")
        role = claims.get("role")
        if not isinstance(uid, str) or not uid or role not in {
            "ADMIN",
            "OPERATOR",
            "ANALYST",
            "VIEWER",
        }:
            raise ValueError("token must contain a uid and recognized trusted role claim")
        return {"uid": uid, "role": role}
