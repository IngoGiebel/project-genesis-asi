"""
py/firestore_utils.py
Small helper to obtain an authenticated Firestore client once.
"""

import json
import os
from functools import lru_cache
from google.cloud import firestore
from google.oauth2 import service_account


@lru_cache(maxsize=1)
def client():
  """
  Returns a singleton `firestore.Client`, reading credentials from the FIREBASE_SERVICE_ACCOUNT_JSON env-var.
  Raises a RuntimeError if not set.
  """
  raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
  if not raw:
    raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON not set")

  creds_info = json.loads(raw)
  creds = service_account.Credentials.from_service_account_info(creds_info)
  return firestore.Client(credentials=creds, project=creds.project_id)
