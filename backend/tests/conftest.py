import pytest
import requests
import os

# Use public URL for testing
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL not set in environment")

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def admin_token(api_client):
    """Get admin token for authenticated requests"""
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@may.com", "password": "admin123"}
    )
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Admin login failed - skipping authenticated tests")

@pytest.fixture
def guest_token(api_client):
    """Get guest token"""
    response = api_client.post(f"{BASE_URL}/api/auth/guest")
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Guest login failed")

@pytest.fixture
def auth_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
