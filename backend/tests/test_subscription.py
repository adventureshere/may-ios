"""Subscription and payment endpoints"""
import pytest
import requests
from conftest import BASE_URL

class TestSubscription:
    """Subscription plans and checkout"""

    def test_get_subscription_plans(self, api_client):
        """Test GET /api/subscription/plans returns available plans"""
        response = api_client.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200, f"Get plans failed: {response.text}"
        
        data = response.json()
        assert "monthly" in data, "Response missing monthly plan"
        assert "yearly" in data, "Response missing yearly plan"
        assert data["monthly"]["amount"] == 6.99, "Monthly price should be $6.99"
        assert data["yearly"]["amount"] == 49.99, "Yearly price should be $49.99"
        print(f"✓ Subscription plans retrieved: monthly ${data['monthly']['amount']}, yearly ${data['yearly']['amount']}")

    def test_get_subscription_status(self, api_client, auth_headers):
        """Test GET /api/subscription/me returns user subscription"""
        response = api_client.get(f"{BASE_URL}/api/subscription/me", headers=auth_headers)
        assert response.status_code == 200, f"Get subscription status failed: {response.text}"
        
        data = response.json()
        assert "plan" in data, "Response missing plan"
        assert "active" in data, "Response missing active status"
        print(f"✓ Subscription status retrieved: plan={data['plan']}, active={data['active']}")

    def test_create_checkout_session(self, api_client, auth_headers):
        """Test POST /api/subscription/checkout creates Stripe session"""
        response = api_client.post(
            f"{BASE_URL}/api/subscription/checkout",
            headers=auth_headers,
            json={"plan_id": "monthly", "origin_url": BASE_URL}
        )
        assert response.status_code == 200, f"Create checkout failed: {response.text}"
        
        data = response.json()
        assert "url" in data, "Response missing checkout URL"
        assert "session_id" in data, "Response missing session_id"
        assert len(data["url"]) > 0, "Checkout URL should not be empty"
        print(f"✓ Checkout session created: {data['session_id'][:20]}...")
