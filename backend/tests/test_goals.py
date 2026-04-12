"""Goals CRUD, tasks, chat endpoints"""
import pytest
import requests
import time
from conftest import BASE_URL

class TestGoals:
    """Goal creation, retrieval, and management"""

    def test_create_goal_with_ai_plan(self, api_client, auth_headers):
        """Test POST /api/goals creates goal with AI-generated plan"""
        response = api_client.post(
            f"{BASE_URL}/api/goals",
            headers=auth_headers,
            json={
                "title": "TEST_Learn Python",
                "description": "Master Python programming",
                "category": "learning",
                "duration_days": 7
            }
        )
        assert response.status_code == 200, f"Goal creation failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing id"
        assert data["title"] == "TEST_Learn Python", "Title mismatch"
        assert data["status"] == "planning", "Initial status should be planning"
        assert "plan" in data, "Response missing plan"
        assert len(data["plan"]) == 7, f"Plan should have 7 days, got {len(data['plan'])}"
        assert data["duration_days"] == 7, "Duration mismatch"
        print(f"✓ Goal created with AI plan: {data['id']} ({len(data['plan'])} days)")
        return data["id"]

    def test_get_goals_list(self, api_client, auth_headers):
        """Test GET /api/goals returns user's goals"""
        response = api_client.get(f"{BASE_URL}/api/goals", headers=auth_headers)
        assert response.status_code == 200, f"Get goals failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Goals list retrieved: {len(data)} goals")

    def test_get_goal_detail(self, api_client, auth_headers):
        """Test GET /api/goals/{id} returns goal with plan"""
        # Create a goal first
        create_response = api_client.post(
            f"{BASE_URL}/api/goals",
            headers=auth_headers,
            json={"title": "TEST_Goal Detail", "category": "fitness", "duration_days": 7}
        )
        assert create_response.status_code == 200
        goal_id = create_response.json()["id"]
        
        # Get goal detail
        response = api_client.get(f"{BASE_URL}/api/goals/{goal_id}", headers=auth_headers)
        assert response.status_code == 200, f"Get goal detail failed: {response.text}"
        
        data = response.json()
        assert data["id"] == goal_id, "Goal ID mismatch"
        assert "plan" in data, "Response missing plan"
        assert data["status"] == "planning", "Status should be planning"
        print(f"✓ Goal detail retrieved: {data['title']}")

    def test_accept_goal_activates_it(self, api_client, auth_headers):
        """Test PUT /api/goals/{id}/accept activates goal"""
        # Create goal
        create_response = api_client.post(
            f"{BASE_URL}/api/goals",
            headers=auth_headers,
            json={"title": "TEST_Accept Goal", "category": "health", "duration_days": 7}
        )
        goal_id = create_response.json()["id"]
        
        # Accept goal
        response = api_client.put(f"{BASE_URL}/api/goals/{goal_id}/accept", headers=auth_headers)
        assert response.status_code == 200, f"Accept goal failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "active", "Status should be active after accepting"
        assert "started_at" in data, "Response missing started_at"
        print(f"✓ Goal accepted and activated")
        
        # Verify goal is active
        get_response = api_client.get(f"{BASE_URL}/api/goals/{goal_id}", headers=auth_headers)
        assert get_response.json()["status"] == "active", "Goal should be active in database"
        print(f"✓ Goal status persisted as active")

    def test_delete_goal(self, api_client, auth_headers):
        """Test DELETE /api/goals/{id} removes goal"""
        # Create goal
        create_response = api_client.post(
            f"{BASE_URL}/api/goals",
            headers=auth_headers,
            json={"title": "TEST_Delete Me", "category": "other", "duration_days": 7}
        )
        goal_id = create_response.json()["id"]
        
        # Delete goal
        response = api_client.delete(f"{BASE_URL}/api/goals/{goal_id}", headers=auth_headers)
        assert response.status_code == 200, f"Delete goal failed: {response.text}"
        
        data = response.json()
        assert data["deleted"] == True, "Response should confirm deletion"
        print(f"✓ Goal deleted successfully")
        
        # Verify goal is gone
        get_response = api_client.get(f"{BASE_URL}/api/goals/{goal_id}", headers=auth_headers)
        assert get_response.status_code == 404, "Deleted goal should return 404"
        print(f"✓ Deleted goal returns 404")

class TestTasks:
    """Task management for active goals"""

    def test_get_today_tasks_for_active_goal(self, api_client, auth_headers):
        """Test GET /api/goals/{id}/tasks/today returns today's tasks"""
        # Create and accept goal
        create_response = api_client.post(
            f"{BASE_URL}/api/goals",
            headers=auth_headers,
            json={"title": "TEST_Tasks Goal", "category": "productivity", "duration_days": 7}
        )
        goal_id = create_response.json()["id"]
        api_client.put(f"{BASE_URL}/api/goals/{goal_id}/accept", headers=auth_headers)
        
        # Get today's tasks
        response = api_client.get(f"{BASE_URL}/api/goals/{goal_id}/tasks/today", headers=auth_headers)
        assert response.status_code == 200, f"Get today tasks failed: {response.text}"
        
        data = response.json()
        assert "tasks" in data, "Response missing tasks"
        assert "day_number" in data, "Response missing day_number"
        assert data["day_number"] == 1, "Should be day 1 for newly accepted goal"
        assert isinstance(data["tasks"], list), "Tasks should be a list"
        print(f"✓ Today's tasks retrieved: {len(data['tasks'])} tasks for day {data['day_number']}")

    def test_toggle_task_completion(self, api_client, auth_headers):
        """Test POST /api/goals/{id}/tasks/{idx}/toggle toggles task"""
        # Create and accept goal
        create_response = api_client.post(
            f"{BASE_URL}/api/goals",
            headers=auth_headers,
            json={"title": "TEST_Toggle Task", "category": "fitness", "duration_days": 7}
        )
        goal_id = create_response.json()["id"]
        api_client.put(f"{BASE_URL}/api/goals/{goal_id}/accept", headers=auth_headers)
        
        # Get tasks
        tasks_response = api_client.get(f"{BASE_URL}/api/goals/{goal_id}/tasks/today", headers=auth_headers)
        tasks = tasks_response.json()["tasks"]
        assert len(tasks) > 0, "Should have at least one task"
        
        # Toggle first task
        response = api_client.post(f"{BASE_URL}/api/goals/{goal_id}/tasks/0/toggle", headers=auth_headers)
        assert response.status_code == 200, f"Toggle task failed: {response.text}"
        
        data = response.json()
        assert "completed" in data, "Response missing completed status"
        assert data["completed"] == True, "Task should be completed after first toggle"
        print(f"✓ Task toggled to completed")
        
        # Toggle again
        response2 = api_client.post(f"{BASE_URL}/api/goals/{goal_id}/tasks/0/toggle", headers=auth_headers)
        assert response2.json()["completed"] == False, "Task should be uncompleted after second toggle"
        print(f"✓ Task toggled back to incomplete")

class TestChat:
    """Chat with May AI coach"""

    def test_send_chat_message(self, api_client, auth_headers):
        """Test POST /api/goals/{id}/chat sends message and gets AI response"""
        # Create and accept goal
        create_response = api_client.post(
            f"{BASE_URL}/api/goals",
            headers=auth_headers,
            json={"title": "TEST_Chat Goal", "category": "learning", "duration_days": 7}
        )
        goal_id = create_response.json()["id"]
        api_client.put(f"{BASE_URL}/api/goals/{goal_id}/accept", headers=auth_headers)
        
        # Send chat message
        response = api_client.post(
            f"{BASE_URL}/api/goals/{goal_id}/chat",
            headers=auth_headers,
            json={"message": "How should I start?"}
        )
        assert response.status_code == 200, f"Send chat failed: {response.text}"
        
        data = response.json()
        assert "user_message" in data, "Response missing user_message"
        assert "ai_message" in data, "Response missing ai_message"
        assert data["ai_message"]["role"] == "assistant", "AI message role should be assistant"
        assert len(data["ai_message"]["content"]) > 0, "AI response should not be empty"
        print(f"✓ Chat message sent and AI responded: {data['ai_message']['content'][:50]}...")

    def test_get_chat_history(self, api_client, auth_headers):
        """Test GET /api/goals/{id}/chat returns chat history"""
        # Create goal and send a message
        create_response = api_client.post(
            f"{BASE_URL}/api/goals",
            headers=auth_headers,
            json={"title": "TEST_Chat History", "category": "mindfulness", "duration_days": 7}
        )
        goal_id = create_response.json()["id"]
        api_client.put(f"{BASE_URL}/api/goals/{goal_id}/accept", headers=auth_headers)
        api_client.post(
            f"{BASE_URL}/api/goals/{goal_id}/chat",
            headers=auth_headers,
            json={"message": "Test message"}
        )
        
        # Get chat history
        response = api_client.get(f"{BASE_URL}/api/goals/{goal_id}/chat", headers=auth_headers)
        assert response.status_code == 200, f"Get chat history failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Chat history should be a list"
        assert len(data) >= 2, "Should have at least user message and AI response"
        print(f"✓ Chat history retrieved: {len(data)} messages")

class TestDashboard:
    """Dashboard endpoint"""

    def test_get_dashboard(self, api_client, auth_headers):
        """Test GET /api/dashboard returns dashboard data"""
        response = api_client.get(f"{BASE_URL}/api/dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Get dashboard failed: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response missing user"
        assert "goals" in data, "Response missing goals"
        assert "today_tasks" in data, "Response missing today_tasks"
        assert "total_streak" in data, "Response missing total_streak"
        assert "total_goals" in data, "Response missing total_goals"
        print(f"✓ Dashboard retrieved: {data['total_goals']} goals, {len(data['today_tasks'])} tasks today")
