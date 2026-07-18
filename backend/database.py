import os
import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_client = None


async def _get_http():
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=30.0)
    return _client


class SupabaseClient:
    def __init__(self):
        self.base = f"{SUPABASE_URL}/rest/v1"

    async def select(self, table, columns="*", filters=None, order=None, limit=None):
        params = {"select": columns}
        if filters:
            params.update(filters)
        if order:
            params["order"] = order
        if limit:
            params["limit"] = str(limit)

        http = await _get_http()
        resp = await http.get(
            f"{self.base}/{table}",
            params=params,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def insert(self, table, data):
        http = await _get_http()
        resp = await http.post(
            f"{self.base}/{table}",
            json=data,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def update(self, table, data, filters):
        http = await _get_http()
        resp = await http.patch(
            f"{self.base}/{table}",
            json=data,
            params=filters,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
        )
        resp.raise_for_status()
        result = resp.json()
        return result[0] if result else None

    async def delete(self, table, filters):
        http = await _get_http()
        resp = await http.delete(
            f"{self.base}/{table}",
            params=filters,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
        )
        resp.raise_for_status()


supabase = SupabaseClient()


async def get_db():
    yield supabase
