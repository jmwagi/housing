import os
import sys
import json
import subprocess

PAT = os.getenv("SUPABASE_PAT") or sys.argv[1] if len(sys.argv) > 1 else None
REF = "abwrnzlzuaswcppmhggi"

if not PAT:
    print("Usage: SUPABASE_PAT=xxx python -m backend.seed")
    print("   or: python -m backend.seed <pat>")
    sys.exit(1)


def sql(query: str):
    payload = json.dumps({"query": query}).encode()
    result = subprocess.run(
        ["curl", "-s", "-X", "POST",
         f"https://api.supabase.com/v1/projects/{REF}/database/query",
         "-H", f"Authorization: Bearer {PAT}",
         "-H", "Content-Type: application/json",
         "-d", payload],
        capture_output=True, text=True, timeout=30,
    )
    return result.stdout


if __name__ == "__main__":
    force = "--force" in sys.argv
    if force:
        print("Clearing existing data...")
        sql("DELETE FROM favorites; DELETE FROM listings; DELETE FROM areas; DELETE FROM users;")

    print("Creating tables (if not exist)...")
    print("Done. Tables already exist via migration.")
    print("Run seed through Supabase dashboard SQL editor or use Management API.")
