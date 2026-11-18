#!/usr/bin/env python3
"""Tigris (S3-compatible object storage) helper for publishing finished shorts.

Credentials come only from the environment and are never printed:
  TIGRIS_STORAGE_ACCESS_KEY_ID, TIGRIS_STORAGE_SECRET_ACCESS_KEY, TIGRIS_STORAGE_ENDPOINT
Optional: TIGRIS_PUBLIC_DOMAIN (default t3.tigrisblob.io), the domain anonymous readers (Buffer) must use.

usage:
  tigris.py check                          env vars present? which buckets can the key reach?
  tigris.py ls <bucket> [prefix]           list objects
  tigris.py upload <file> <bucket> <key>   upload public-read, verify checksum + public URL, print the URL
  tigris.py url <bucket> <key>             print the public URL
  tigris.py delete <bucket> <key>          delete, then verify the object and its public URL are gone

Needs boto3:  python3 -m venv ~/.venvs/tigris && ~/.venvs/tigris/bin/pip install boto3
"""
import hashlib, mimetypes, os, subprocess, sys

VARS = ["TIGRIS_STORAGE_ACCESS_KEY_ID", "TIGRIS_STORAGE_SECRET_ACCESS_KEY", "TIGRIS_STORAGE_ENDPOINT"]
PUBLIC_DOMAIN = os.environ.get("TIGRIS_PUBLIC_DOMAIN", "t3.tigrisblob.io")


def die(msg, code=1):
    print(msg, file=sys.stderr)
    sys.exit(code)


def env_report():
    missing = [v for v in VARS if not os.environ.get(v)]
    for v in VARS:
        print(f"  {v}: {'set' if os.environ.get(v) else 'MISSING'}")
    return missing


def client():
    missing = [v for v in VARS if not os.environ.get(v)]
    if missing:
        die("Missing env: " + ", ".join(missing) + "\nAdd them as environment variables (cloud environment settings, or "
            "export them in your shell). Never paste keys into chat or commit them.")
    try:
        import boto3
    except ImportError:
        die("boto3 is not installed: python3 -m venv ~/.venvs/tigris && ~/.venvs/tigris/bin/pip install boto3, "
            "then run this script with ~/.venvs/tigris/bin/python")
    return boto3.client(
        "s3",
        endpoint_url=os.environ["TIGRIS_STORAGE_ENDPOINT"],
        aws_access_key_id=os.environ["TIGRIS_STORAGE_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["TIGRIS_STORAGE_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


def public_url(bucket, key):
    return f"https://{bucket}.{PUBLIC_DOMAIN}/{key}"


def probe(url):
    """(status, content_type, content_length) of an anonymous request, via curl (honours the proxy and its CA)."""
    out = subprocess.run(
        ["curl", "-sS", "-o", "/dev/null", "-r", "0-1023", "-w", "%{http_code} %{content_type}", url],
        capture_output=True, text=True, timeout=60,
    ).stdout.split(" ", 1)
    head = subprocess.run(["curl", "-sSI", url], capture_output=True, text=True, timeout=60).stdout
    length = next((l.split(":", 1)[1].strip() for l in head.splitlines() if l.lower().startswith("content-length:")), "?")
    return out[0], (out[1] if len(out) > 1 else ""), length


def md5(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main(argv):
    if len(argv) < 2 or argv[1] in ("-h", "--help"):
        die(__doc__, 0)
    cmd = argv[1]

    if cmd == "check":
        missing = env_report()
        if missing:
            die("Not ready: add the missing variables first.")
        s3 = client()
        buckets = [b["Name"] for b in s3.list_buckets().get("Buckets", [])]
        print("buckets:", ", ".join(buckets) if buckets else "(none visible to this key)")
        return

    if cmd == "ls" and len(argv) >= 3:
        s3 = client()
        kw = {"Bucket": argv[2]}
        if len(argv) > 3:
            kw["Prefix"] = argv[3]
        for page in s3.get_paginator("list_objects_v2").paginate(**kw):
            for o in page.get("Contents", []):
                print(f"{o['Size']:>12}  {o['LastModified']:%Y-%m-%d %H:%M}  {o['Key']}")
        return

    if cmd == "url" and len(argv) == 4:
        print(public_url(argv[2], argv[3]))
        return

    if cmd == "upload" and len(argv) == 5:
        path, bucket, key = argv[2], argv[3], argv[4]
        if not os.path.isfile(path):
            die(f"No such file: {path}")
        from boto3.s3.transfer import TransferConfig
        s3 = client()
        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
        # single-part upload (files up to 4.5 GB) so the ETag is the MD5 we can check against
        s3.upload_file(path, bucket, key, ExtraArgs={"ContentType": ctype, "ACL": "public-read"},
                       Config=TransferConfig(multipart_threshold=4_500_000_000))
        etag = s3.head_object(Bucket=bucket, Key=key)["ETag"].strip('"')
        local = md5(path)
        if etag != local:
            die(f"Checksum mismatch after upload: local {local}, remote {etag}")
        url = public_url(bucket, key)
        status, rtype, length = probe(url)
        size = os.path.getsize(path)
        print(f"uploaded {path} -> {bucket}/{key} ({size} bytes, {ctype}, md5 {local})")
        print(f"public check: HTTP {status}, {rtype}, length {length}")
        if status not in ("200", "206") or length != str(size):
            die(f"Public URL is not serving the file correctly: {url}")
        print(url)
        return

    if cmd == "delete" and len(argv) == 4:
        bucket, key = argv[2], argv[3]
        s3 = client()
        s3.delete_object(Bucket=bucket, Key=key)
        try:
            s3.head_object(Bucket=bucket, Key=key)
            die(f"Still there after delete: {bucket}/{key}")
        except s3.exceptions.ClientError as e:
            print(f"deleted {bucket}/{key} (head -> {e.response['Error']['Code']})")
        status, _, _ = probe(public_url(bucket, key))
        print(f"public URL now -> HTTP {status}")
        if status in ("200", "206"):
            die("Public URL still serves the file (CDN cache?). Check again in a few minutes.")
        return

    die(__doc__)


if __name__ == "__main__":
    main(sys.argv)
