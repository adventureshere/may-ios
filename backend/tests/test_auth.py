"""Auth endpoints: register, login, guest, /me"""
import pytest
import requests
from conftest import BASE_URL

class TestAuth:
    """Authentication endpoint tests"""

    def test_guest_login(self, api_client):
        """Test POST /api/auth/guest returns token and user"""
        response = api_client.post(f"{BASE_URL}/api/auth/guest")
        assert response.status_code == 200, f"Guest login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response missing token"
        assert "user" in data, "Response missing user"
        assert data["user"]["role"] == "guest", "User role should be guest"
        assert "id" in data["user"], "User missing id"
        assert "email" in data["user"], "User missing email"
        print(f"✓ Guest login successful: {data['user']['email']}")

    def test_admin_login(self, api_client):
        """Test POST /api/auth/login with admin credentials"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@may.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response missing token"
        assert "user" in data, "Response missing user"
        assert data["user"]["email"] == "admin@may.com", "Email mismatch"
        assert data["user"]["role"] == "admin", "Role should be admin"
        print(f"✓ Admin login successful: {data['user']['name']}")

    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials returns 401"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@may.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401, "Should return 401 for invalid credentials"
        print("✓ Invalid login correctly rejected")

    def test_register_new_user(self, api_client):
        """Test POST /api/auth/register creates new user"""
        import uuid
        test_email = f"TEST_user_{uuid.uuid4().hex[:8]}@may.test"
        
        response = api_client.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "name": "Test User",
                "email": test_email,
                "password": "testpass123"
            }
        )
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response missing token"
        assert "user" in data, "Response missing user"
        assert data["user"]["email"] == test_email, "Email mismatch"
        assert data["user"]["role"] == "user", "Role should be user"
        print(f"✓ User registration successful: {test_email}")
        
        # Verify can login with new credentials
        login_response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_email, "password": "testpass123"}
        )
        assert login_response.status_code == 200, "Should be able to login with new credentials"
        print(f"✓ New user can login successfully")

    def test_register_duplicate_email(self, api_client):
        """Test registering with existing email returns 400"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "name": "Duplicate",
                "email": "admin@may.com",
                "password": "testpass123"
            }
        )
        assert response.status_code == 400, "Should return 400 for duplicate email"
        print("✓ Duplicate email correctly rejected")

    def test_get_me_authenticated(self, api_client, admin_token):
        """Test GET /api/auth/me returns authenticated user"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"/me failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing id"
        assert "email" in data, "Response missing email"
        assert data["email"] == "admin@may.com", "Email mismatch"
        print(f"✓ /me endpoint working: {data['name']}")

    def test_get_me_unauthenticated(self, api_client):
        """Test GET /api/auth/me without token returns 401"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, "Should return 401 without token"
        print("✓ Unauthenticated /me correctly rejected")
