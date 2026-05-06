#!/usr/bin/env python3
"""
One-time script to create an Apple Distribution certificate via App Store Connect API.
Run locally, then add the output as GitHub secrets.

Prerequisites:
  pip install cryptography pyjwt

Required environment variables (or prompted interactively):
  ASC_API_KEY_ID     — App Store Connect API Key ID
  ASC_API_ISSUER_ID  — App Store Connect API Issuer ID
  ASC_API_KEY_P8     — Contents of the .p8 private key file
"""

import base64
import datetime
import json
import os
import sys
import time
import getpass

try:
    import jwt
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.backends import default_backend
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives.serialization import pkcs12
except ImportError:
    print("Missing dependencies. Install with:")
    print("  pip install cryptography pyjwt")
    sys.exit(1)

try:
    import urllib.request
    import urllib.error
except ImportError:
    pass


def get_env_or_prompt(name, secret=False):
    val = os.environ.get(name)
    if val:
        return val
    prompt_fn = getpass.getpass if secret else input
    return prompt_fn(f"Enter {name}: ")


def create_jwt(key_id, issuer_id, p8_key):
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "iss": issuer_id,
        "iat": int(now.timestamp()),
        "exp": int((now + datetime.timedelta(minutes=15)).timestamp()),
        "aud": "appstoreconnect-v1",
    }
    return jwt.encode(payload, p8_key, algorithm="ES256", headers={"kid": key_id})


def api_request(method, path, token, body=None):
    url = f"https://api.appstoreconnect.apple.com/v1/{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"API error {e.code}: {error_body}")
        sys.exit(1)


def main():
    print("=== iOS Distribution Certificate Creator ===\n")

    key_id = get_env_or_prompt("ASC_API_KEY_ID")
    issuer_id = get_env_or_prompt("ASC_API_ISSUER_ID")
    p8_key = get_env_or_prompt("ASC_API_KEY_P8", secret=True)

    # Ensure the p8 key has proper PEM formatting
    if "BEGIN PRIVATE KEY" not in p8_key:
        p8_key = f"-----BEGIN PRIVATE KEY-----\n{p8_key}\n-----END PRIVATE KEY-----"

    token = create_jwt(key_id, issuer_id, p8_key)
    print("JWT created.")

    # Check existing certificates
    print("\nChecking existing distribution certificates...")
    existing = api_request("GET", "certificates?filter[certificateType]=DISTRIBUTION", token)
    certs = existing.get("data", [])
    print(f"Found {len(certs)} existing distribution certificate(s).")

    if len(certs) >= 2:
        print("\nWARNING: Apple allows max 2 distribution certificates.")
        print("Existing certificates:")
        for c in certs:
            attrs = c["attributes"]
            print(f"  - {attrs.get('name', 'N/A')} (expires: {attrs.get('expirationDate', 'N/A')})")
        print("\nYou may need to revoke one before creating a new one.")
        resp = input("Continue anyway? (y/N): ").strip().lower()
        if resp != "y":
            sys.exit(0)

    # Generate EC private key (P-256, which Apple requires for CSRs)
    print("\nGenerating EC P-256 private key...")
    private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())

    # Create CSR
    print("Creating Certificate Signing Request...")
    csr = (
        x509.CertificateSigningRequestBuilder()
        .subject_name(
            x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Memory Palace Distribution")])
        )
        .sign(private_key, hashes.SHA256(), default_backend())
    )
    csr_pem = csr.public_bytes(serialization.Encoding.PEM)
    csr_der = csr.public_bytes(serialization.Encoding.DER)
    csr_b64 = base64.b64encode(csr_der).decode()

    # Submit CSR to Apple
    print("Submitting CSR to App Store Connect API...")
    create_body = {
        "data": {
            "type": "certificates",
            "attributes": {
                "csrContent": csr_pem.decode(),
                "certificateType": "DISTRIBUTION",
            },
        }
    }
    result = api_request("POST", "certificates", token, create_body)
    cert_data = result["data"]["attributes"]["certificateContent"]
    cert_id = result["data"]["id"]
    print(f"Certificate created! ID: {cert_id}")

    # Decode the certificate
    cert_der = base64.b64decode(cert_data)
    cert = x509.load_der_x509_certificate(cert_der, default_backend())
    print(f"Certificate subject: {cert.subject}")
    print(f"Certificate expires: {cert.not_valid_after_utc}")

    # Create .p12 bundle
    p12_password = os.urandom(16).hex()
    print(f"\nP12 password: {p12_password}")

    p12_data = pkcs12.serialize_key_and_certificates(
        name=b"Apple Distribution",
        key=private_key,
        cert=cert,
        cas=None,
        encryption_algorithm=serialization.BestAvailableEncryption(p12_password.encode()),
    )

    # Save .p12 file locally
    p12_path = os.path.join(os.path.dirname(__file__), "dist-cert.p12")
    with open(p12_path, "wb") as f:
        f.write(p12_data)
    print(f"P12 saved to: {p12_path}")

    # Base64 encode for GitHub secrets
    p12_b64 = base64.b64encode(p12_data).decode()

    print("\n" + "=" * 60)
    print("ADD THESE AS GITHUB SECRETS:")
    print("=" * 60)
    print(f"\nDIST_CERT_P12_PASSWORD:\n{p12_password}")
    print(f"\nDIST_CERT_P12_BASE64 (first 80 chars shown):\n{p12_b64[:80]}...")
    print(f"\n(Full base64 is {len(p12_b64)} characters)")

    # Also save base64 to file for easy copy
    b64_path = os.path.join(os.path.dirname(__file__), "dist-cert-b64.txt")
    with open(b64_path, "w") as f:
        f.write(p12_b64)
    print(f"\nFull base64 saved to: {b64_path}")

    print("\nDone! Next steps:")
    print("1. Add DIST_CERT_P12_BASE64 and DIST_CERT_P12_PASSWORD as GitHub secrets")
    print("2. Trigger the iOS workflow")
    print(f"3. Delete {p12_path} and {b64_path} after adding secrets (don't commit them!)")


if __name__ == "__main__":
    main()
