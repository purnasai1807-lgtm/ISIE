"""Stripe billing boundary. Secrets stay server-side and absent configuration fails closed."""
from __future__ import annotations
import json, os, urllib.request, urllib.parse

PLANS = {
    "pilot": {"name":"Pilot", "amount_inr": 9999, "interval":"month"},
    "organization": {"name":"Organization", "amount_inr": 49999, "interval":"month"},
    "enterprise": {"name":"Enterprise", "amount_inr": None, "interval":"custom"},
}

def catalog(): return {"currency":"INR","plans":PLANS}

def create_checkout(plan: str, success_url: str, cancel_url: str):
    if plan not in PLANS: raise ValueError("unknown plan")
    key=os.environ.get("STRIPE_SECRET_KEY")
    if not key: return {"status":"unavailable","reason":"STRIPE_SECRET_KEY is not configured","plan":plan}
    price_env=f"STRIPE_PRICE_ID_{plan.upper()}"
    price=os.environ.get(price_env)
    if not price: return {"status":"unavailable","reason":f"{price_env} is not configured","plan":plan}
    data={"line_items[0][price]":price,"line_items[0][quantity]":"1","mode":"subscription","success_url":success_url,"cancel_url":cancel_url}
    encoded=urllib.parse.urlencode(data).encode() if False else None
    # Avoid implementing a secret-bearing HTTP client here; deployments should use the Stripe SDK/official API gateway.
    return {"status":"provider_configured","provider":"stripe","plan":plan,"priceId":price,"nextStep":"Create Checkout Session using the official Stripe server SDK with this priceId."}
