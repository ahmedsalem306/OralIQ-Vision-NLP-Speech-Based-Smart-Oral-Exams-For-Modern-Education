"""Bound the actual request stream before multipart parsing/spooling, including chunked uploads."""
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse

MAX_BODY_SIZE = 50 * 1024 * 1024


class RequestSizeLimitMiddleware:
    def __init__(self, app, max_bytes=MAX_BODY_SIZE):
        self.app, self.max_bytes = app, max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        if b"content-length" in headers:
            try:
                length = int(headers[b"content-length"])
                if length < 0:
                    raise ValueError()
            except ValueError:
                return await JSONResponse({"detail": "Invalid Content-Length header."}, status_code=400)(scope, receive, send)
            if length > self.max_bytes:
                return await JSONResponse({"detail": "Request body too large."}, status_code=413)(scope, receive, send)
        consumed = 0
        started = False

        async def limited_receive():
            nonlocal consumed
            message = await receive()
            if message["type"] == "http.request":
                consumed += len(message.get("body", b""))
                if consumed > self.max_bytes:
                    raise HTTPException(status_code=413, detail="Request body too large.")
            return message

        async def tracked_send(message):
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, limited_receive, tracked_send)
        except HTTPException as error:
            if error.status_code != 413 or started:
                raise
            await JSONResponse({"detail": error.detail}, status_code=413)(scope, receive, send)
