from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import os
import logging
import bcrypt
import jwt
import json
import re
import uuid

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'may_habit_trainer')]

app = FastAPI(title="May - Habit Trainer API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SUBSCRIPTION_PLANS = {
    "monthly": {"name": "May Premium Monthly", "amount": 6.99, "currency": "usd", "period": "month", "days": 30},
    "yearly": {"name": "May Premium Yearly", "amount": 49.99, "currency": "usd", "period": "year", "days": 365},
}

# ============= HELPERS =============

def serialize_doc(doc):
    if doc is None:
        return None
    result = {k: v for k, v in doc.items() if k != "_id"}
    result["id"] = str(doc["_id"])
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            result[key] = str(value)
    return result

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(days=30), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        sub = user.get("subscription", {"plan": "free", "active": False})
        return {
            "id": str(user["_id"]), "email": user["email"], "name": user.get("name", ""),
            "role": user.get("role", "user"), "subscription": sub,
            "created_at": user["created_at"].isoformat() if isinstance(user.get("created_at"), datetime) else "",
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# ============= AI HELPERS =============

async def generate_plan(title: str, description: str, category: str, duration_days: int) -> list:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY, session_id=f"plan-{uuid.uuid4()}",
            system_message="You are May, an AI habit coach. Generate a day-by-day plan. Return ONLY a valid JSON array. Each element: {\"day\": <number>, \"title\": \"<title>\", \"tasks\": [\"<task1>\", \"<task2>\"]}. 2-4 tasks per day. Gradually increase difficulty."
        ).with_model("gemini", "gemini-3-flash-preview")
        response = await chat.send_message(UserMessage(text=f"Create a {duration_days}-day plan for: \"{title}\" (Category: {category}). Details: {description or 'None'}. Return exactly {duration_days} days as JSON array."))
        try:
            plan = json.loads(response)
        except json.JSONDecodeError:
            match = re.search(r'\[[\s\S]*\]', response)
            plan = json.loads(match.group()) if match else None
        if not plan:
            raise ValueError("Parse failed")
        validated = []
        for item in plan[:duration_days]:
            validated.append({"day": item.get("day", len(validated)+1), "title": str(item.get("title", f"Day {len(validated)+1}")), "tasks": [str(t) for t in item.get("tasks", ["Work on your goal"])][:4]})
        while len(validated) < duration_days:
            d = len(validated) + 1
            validated.append({"day": d, "title": f"Day {d}", "tasks": [f"Continue working on {title}"]})
        return validated
    except Exception as e:
        logger.error(f"AI plan generation failed: {e}")
        return [{"day": i+1, "title": f"Day {i+1}", "tasks": [f"Work on {title} - session {i+1}"]} for i in range(duration_days)]

async def generate_ai_response(goal, history_text: str, user_message: str) -> str:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    try:
        current_day = 0
        if goal.get("started_at"):
            delta = datetime.now(timezone.utc) - goal["started_at"]
            current_day = min(delta.days + 1, goal["duration_days"])
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY, session_id=f"chat-{uuid.uuid4()}",
            system_message=f"You are May, a warm encouraging AI habit coach. Goal: {goal['title']} | Category: {goal['category']} | Day {current_day}/{goal['duration_days']} | Streak: {goal.get('streak', 0)}\n{f'Recent conversation:{chr(10)}{history_text}' if history_text else ''}\nKeep responses concise (2-3 sentences). Be warm, specific, actionable."
        ).with_model("gemini", "gemini-3-flash-preview")
        return await chat.send_message(UserMessage(text=user_message))
    except Exception as e:
        logger.error(f"AI chat failed: {e}")
        return "I'm having a little trouble right now, but I'm still here for you! Keep pushing toward your goal - you've got this! 💪"

# ============= MODELS =============

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class GoalCreateRequest(BaseModel):
    title: str
    description: str = ""
    category: str = "other"
    duration_days: int = 30

class ChatMessageRequest(BaseModel):
    message: str

class CheckoutRequest(BaseModel):
    plan_id: str = "monthly"
    origin_url: str = ""

# ============= AUTH ROUTES =============

@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    email = req.email.lower().strip()
    if not email or not req.password or len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Invalid email or password (min 6 chars)")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {"name": req.name.strip(), "email": email, "password_hash": hash_password(req.password),
                "role": "user", "created_at": datetime.now(timezone.utc), "subscription": {"plan": "free", "active": False}}
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    return {"token": create_token(user_id, email), "user": {"id": user_id, "name": req.name.strip(), "email": email, "role": "user", "subscription": {"plan": "free", "active": False}}}

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    sub = user.get("subscription", {"plan": "free", "active": False})
    return {"token": create_token(user_id, email), "user": {"id": user_id, "name": user.get("name", ""), "email": email, "role": user.get("role", "user"), "subscription": sub}}

@api_router.post("/auth/guest")
async def guest_login():
    guest_id = uuid.uuid4().hex[:6]
    user_doc = {"name": f"Guest", "email": f"guest_{guest_id}@may.local", "password_hash": "",
                "role": "guest", "created_at": datetime.now(timezone.utc), "subscription": {"plan": "free", "active": False}}
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    return {"token": create_token(user_id, user_doc["email"]), "user": {"id": user_id, "name": "Guest", "email": user_doc["email"], "role": "guest", "subscription": {"plan": "free", "active": False}}}

@api_router.post("/auth/upgrade")
async def upgrade_guest(req: RegisterRequest, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "guest":
        raise HTTPException(status_code=400, detail="Only guest accounts can be upgraded")
    email = req.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"name": req.name.strip(), "email": email, "password_hash": hash_password(req.password), "role": "user"}})
    return {"token": create_token(user["id"], email), "user": {"id": user["id"], "name": req.name.strip(), "email": email, "role": "user", "subscription": user.get("subscription", {"plan": "free", "active": False})}}

@api_router.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request)

# ============= DASHBOARD =============

@api_router.get("/dashboard")
async def get_dashboard(request: Request):
    user = await get_current_user(request)
    goals = []
    async for g in db.goals.find({"user_id": user["id"]}, {"plan": 0}):
        goal = serialize_doc(g)
        if goal["status"] == "active" and g.get("started_at"):
            delta = datetime.now(timezone.utc) - g["started_at"]
            goal["current_day"] = min(delta.days + 1, goal["duration_days"])
        goals.append(goal)

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_tasks = []
    for goal in goals:
        if goal["status"] != "active":
            continue
        progress = await db.daily_progress.find_one({"goal_id": goal["id"], "user_id": user["id"], "date": date_str}, {"_id": 0})
        if progress:
            for idx, task in enumerate(progress.get("tasks", [])):
                today_tasks.append({"goal_id": goal["id"], "goal_title": goal["title"], "goal_category": goal.get("category", "other"), "title": task["title"], "completed": task["completed"], "task_index": idx})

    total_streak = sum(g.get("streak", 0) for g in goals if g["status"] == "active")
    return {"user": user, "goals": goals, "today_tasks": today_tasks, "total_streak": total_streak, "best_streak": max((g.get("best_streak", 0) for g in goals), default=0), "total_goals": len(goals), "active_goals": sum(1 for g in goals if g["status"] == "active")}

# ============= GOAL ROUTES =============

@api_router.post("/goals")
async def create_goal(req: GoalCreateRequest, request: Request):
    user = await get_current_user(request)
    duration = max(1, min(req.duration_days, 90))
    # Check goal limits
    user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    role = user_doc.get("role", "user")
    sub = user_doc.get("subscription", {})
    active_count = await db.goals.count_documents({"user_id": user["id"], "status": {"$in": ["active", "planning"]}})
    max_goals = 1 if role == "guest" else (999 if sub.get("active") else 2)
    if active_count >= max_goals:
        msg = "Guest accounts are limited to 1 goal. Create an account to unlock more!" if role == "guest" else "Free accounts are limited to 2 goals. Upgrade to May Premium for unlimited goals!"
        raise HTTPException(status_code=403, detail=msg)

    plan = await generate_plan(req.title, req.description, req.category, duration)
    total_tasks = sum(len(d.get("tasks", [])) for d in plan)
    goal_doc = {"user_id": user["id"], "title": req.title, "description": req.description, "category": req.category, "duration_days": duration, "plan": plan, "status": "planning", "created_at": datetime.now(timezone.utc), "started_at": None, "streak": 0, "best_streak": 0, "total_completed": 0, "total_tasks": total_tasks}
    result = await db.goals.insert_one(goal_doc)
    return serialize_doc({**goal_doc, "_id": result.inserted_id})

@api_router.get("/goals")
async def list_goals(request: Request):
    user = await get_current_user(request)
    goals = []
    async for g in db.goals.find({"user_id": user["id"]}, {"plan": 0}).sort("created_at", -1):
        goal = serialize_doc(g)
        if goal["status"] == "active" and g.get("started_at"):
            delta = datetime.now(timezone.utc) - g["started_at"]
            goal["current_day"] = min(delta.days + 1, goal["duration_days"])
        goals.append(goal)
    return goals

@api_router.get("/goals/{goal_id}")
async def get_goal(goal_id: str, request: Request):
    user = await get_current_user(request)
    goal = await db.goals.find_one({"_id": ObjectId(goal_id), "user_id": user["id"]})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    result = serialize_doc(goal)
    if result["status"] == "active" and goal.get("started_at"):
        delta = datetime.now(timezone.utc) - goal["started_at"]
        result["current_day"] = min(delta.days + 1, result["duration_days"])
    return result

@api_router.put("/goals/{goal_id}/accept")
async def accept_goal(goal_id: str, request: Request):
    user = await get_current_user(request)
    goal = await db.goals.find_one({"_id": ObjectId(goal_id), "user_id": user["id"]})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal["status"] != "planning":
        raise HTTPException(status_code=400, detail="Goal is not in planning status")
    now = datetime.now(timezone.utc)
    await db.goals.update_one({"_id": ObjectId(goal_id)}, {"$set": {"status": "active", "started_at": now}})
    date_str = now.strftime("%Y-%m-%d")
    day_plan = next((d for d in goal["plan"] if d["day"] == 1), None)
    if day_plan:
        await db.daily_progress.insert_one({"goal_id": goal_id, "user_id": user["id"], "day_number": 1, "date": date_str, "tasks": [{"title": t, "completed": False} for t in day_plan["tasks"]], "all_completed": False})
    return {"status": "active", "started_at": now.isoformat()}

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.goals.delete_one({"_id": ObjectId(goal_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.daily_progress.delete_many({"goal_id": goal_id})
    await db.chat_messages.delete_many({"goal_id": goal_id})
    await db.daily_messages.delete_many({"goal_id": goal_id})
    return {"deleted": True}

# ============= TASK ROUTES =============

@api_router.get("/goals/{goal_id}/tasks/today")
async def get_today_tasks(goal_id: str, request: Request):
    user = await get_current_user(request)
    goal = await db.goals.find_one({"_id": ObjectId(goal_id), "user_id": user["id"]})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal["status"] != "active":
        return {"tasks": [], "day_number": 0, "all_completed": False}
    delta = datetime.now(timezone.utc) - goal["started_at"]
    current_day = min(delta.days + 1, goal["duration_days"])
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    progress = await db.daily_progress.find_one({"goal_id": goal_id, "user_id": user["id"], "date": date_str})
    if not progress:
        day_plan = next((d for d in goal["plan"] if d["day"] == current_day), None)
        if not day_plan:
            return {"tasks": [], "day_number": current_day, "all_completed": False, "day_title": "Rest Day", "total_days": goal["duration_days"]}
        tasks = [{"title": t, "completed": False} for t in day_plan["tasks"]]
        progress = {"goal_id": goal_id, "user_id": user["id"], "day_number": current_day, "date": date_str, "tasks": tasks, "all_completed": False}
        await db.daily_progress.insert_one(progress)
    day_plan = next((d for d in goal["plan"] if d["day"] == current_day), {})
    return {"tasks": progress["tasks"], "day_number": current_day, "day_title": day_plan.get("title", f"Day {current_day}"), "all_completed": progress.get("all_completed", False), "total_days": goal["duration_days"]}

@api_router.post("/goals/{goal_id}/tasks/{task_index}/toggle")
async def toggle_task(goal_id: str, task_index: int, request: Request):
    user = await get_current_user(request)
    goal = await db.goals.find_one({"_id": ObjectId(goal_id), "user_id": user["id"]})
    if not goal or goal["status"] != "active":
        raise HTTPException(status_code=400, detail="Goal not found or not active")
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    progress = await db.daily_progress.find_one({"goal_id": goal_id, "user_id": user["id"], "date": date_str})
    if not progress:
        raise HTTPException(status_code=400, detail="No tasks for today")
    if task_index < 0 or task_index >= len(progress["tasks"]):
        raise HTTPException(status_code=400, detail="Invalid task index")

    was_completed = progress["tasks"][task_index]["completed"]
    progress["tasks"][task_index]["completed"] = not was_completed
    all_done = all(t["completed"] for t in progress["tasks"])
    await db.daily_progress.update_one({"_id": progress["_id"]}, {"$set": {"tasks": progress["tasks"], "all_completed": all_done}})

    inc_val = -1 if was_completed else 1
    update_ops = {"$inc": {"total_completed": inc_val}}
    if all_done and not was_completed:
        new_streak = goal.get("streak", 0) + 1
        update_ops["$set"] = {"streak": new_streak, "best_streak": max(goal.get("best_streak", 0), new_streak)}
    await db.goals.update_one({"_id": ObjectId(goal_id)}, update_ops)

    if all_done:
        delta = datetime.now(timezone.utc) - goal["started_at"]
        if min(delta.days + 1, goal["duration_days"]) >= goal["duration_days"]:
            await db.goals.update_one({"_id": ObjectId(goal_id)}, {"$set": {"status": "completed"}})
    return {"task_index": task_index, "completed": not was_completed, "all_completed": all_done}

# ============= RESCHEDULE =============

@api_router.post("/goals/{goal_id}/reschedule")
async def reschedule_goal(goal_id: str, request: Request):
    user = await get_current_user(request)
    goal = await db.goals.find_one({"_id": ObjectId(goal_id), "user_id": user["id"]})
    if not goal or goal["status"] != "active":
        raise HTTPException(status_code=400, detail="Goal not found or not active")
    delta = datetime.now(timezone.utc) - goal["started_at"]
    current_day = min(delta.days + 1, goal["duration_days"])
    incomplete = []
    for day_num in range(1, current_day):
        d = (goal["started_at"] + timedelta(days=day_num - 1)).strftime("%Y-%m-%d")
        prog = await db.daily_progress.find_one({"goal_id": goal_id, "user_id": user["id"], "date": d})
        if prog and not prog.get("all_completed", False):
            for t in prog["tasks"]:
                if not t["completed"]:
                    incomplete.append(t["title"])
    if not incomplete:
        return {"message": "No tasks to reschedule!", "rescheduled": False}

    from emergentintegrations.llm.chat import LlmChat, UserMessage
    try:
        remaining = [d for d in goal["plan"] if d["day"] >= current_day]
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"reschedule-{uuid.uuid4()}",
            system_message="Redistribute missed tasks. Return ONLY JSON array: [{\"day\": N, \"title\": \"...\", \"tasks\": [\"...\"]}]"
        ).with_model("gemini", "gemini-3-flash-preview")
        response = await chat.send_message(UserMessage(text=f"Goal: {goal['title']}. Missed: {json.dumps(incomplete)}. Remaining: {json.dumps(remaining)}. Redistribute days {current_day}-{goal['duration_days']}."))
        try:
            new_plan = json.loads(response)
        except:
            match = re.search(r'\[[\s\S]*\]', response)
            new_plan = json.loads(match.group()) if match else None
        if new_plan:
            existing = [d for d in goal["plan"] if d["day"] < current_day]
            updated = existing + new_plan
            await db.goals.update_one({"_id": ObjectId(goal_id)}, {"$set": {"plan": updated, "total_tasks": sum(len(d.get("tasks", [])) for d in updated)}})
            return {"message": f"Rescheduled {len(incomplete)} missed tasks!", "rescheduled": True}
    except Exception as e:
        logger.error(f"Reschedule failed: {e}")
    return {"message": "Could not reschedule. Please try again.", "rescheduled": False}

# ============= CHAT ROUTES =============

@api_router.post("/goals/{goal_id}/chat")
async def send_chat(goal_id: str, req: ChatMessageRequest, request: Request):
    user = await get_current_user(request)
    goal = await db.goals.find_one({"_id": ObjectId(goal_id), "user_id": user["id"]})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    now = datetime.now(timezone.utc)
    await db.chat_messages.insert_one({"goal_id": goal_id, "user_id": user["id"], "role": "user", "content": req.message, "created_at": now})
    history = await db.chat_messages.find({"goal_id": goal_id, "user_id": user["id"]}).sort("created_at", -1).limit(20).to_list(20)
    history.reverse()
    history_text = "\n".join([f"{'User' if m['role'] == 'user' else 'May'}: {m['content']}" for m in history[:-1]])
    ai_text = await generate_ai_response(goal, history_text, req.message)
    ai_time = datetime.now(timezone.utc)
    await db.chat_messages.insert_one({"goal_id": goal_id, "user_id": user["id"], "role": "assistant", "content": ai_text, "created_at": ai_time})
    return {"user_message": {"role": "user", "content": req.message, "created_at": now.isoformat()}, "ai_message": {"role": "assistant", "content": ai_text, "created_at": ai_time.isoformat()}}

@api_router.get("/goals/{goal_id}/chat")
async def get_chat_history(goal_id: str, request: Request):
    user = await get_current_user(request)
    messages = await db.chat_messages.find({"goal_id": goal_id, "user_id": user["id"]}, {"_id": 0, "user_id": 0}).sort("created_at", 1).to_list(100)
    for m in messages:
        if isinstance(m.get("created_at"), datetime):
            m["created_at"] = m["created_at"].isoformat()
    return messages

# ============= GENERAL CHAT WITH MAY =============

@api_router.post("/chat/general")
async def send_general_chat(req: ChatMessageRequest, request: Request):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    await db.chat_messages.insert_one({"goal_id": "general", "user_id": user["id"], "role": "user", "content": req.message, "created_at": now})
    history = await db.chat_messages.find({"goal_id": "general", "user_id": user["id"]}).sort("created_at", -1).limit(20).to_list(20)
    history.reverse()
    history_text = "\n".join([f"{'User' if m['role'] == 'user' else 'May'}: {m['content']}" for m in history[:-1]])
    goals = await db.goals.find({"user_id": user["id"], "status": "active"}).to_list(10)
    goals_ctx = ", ".join([f"{g['title']} ({g['category']})" for g in goals]) or "None yet"
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"general-{uuid.uuid4()}",
            system_message=f"You are May, a warm friendly AI habit coach and life companion. Chat about goals, motivation, wellness, or anything. Be warm, encouraging, personal. Use emojis occasionally. Keep responses 2-4 sentences.\nUser's active goals: {goals_ctx}\n{f'Recent conversation:{chr(10)}{history_text}' if history_text else ''}"
        ).with_model("gemini", "gemini-3-flash-preview")
        ai_text = await chat.send_message(UserMessage(text=req.message))
    except Exception as e:
        logger.error(f"General chat failed: {e}")
        ai_text = "Hey! I'm having a little moment, but I'm still here for you! What's on your mind? 💜"
    ai_time = datetime.now(timezone.utc)
    await db.chat_messages.insert_one({"goal_id": "general", "user_id": user["id"], "role": "assistant", "content": ai_text, "created_at": ai_time})
    return {"user_message": {"role": "user", "content": req.message, "created_at": now.isoformat()}, "ai_message": {"role": "assistant", "content": ai_text, "created_at": ai_time.isoformat()}}

@api_router.get("/chat/general")
async def get_general_chat_history(request: Request):
    user = await get_current_user(request)
    messages = await db.chat_messages.find({"goal_id": "general", "user_id": user["id"]}, {"_id": 0, "user_id": 0}).sort("created_at", 1).to_list(100)
    for m in messages:
        if isinstance(m.get("created_at"), datetime):
            m["created_at"] = m["created_at"].isoformat()
    return messages

# ============= DAILY MESSAGE =============

@api_router.get("/goals/{goal_id}/daily-message")
async def get_daily_message(goal_id: str, request: Request):
    user = await get_current_user(request)
    goal = await db.goals.find_one({"_id": ObjectId(goal_id), "user_id": user["id"]})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.daily_messages.find_one({"goal_id": goal_id, "user_id": user["id"], "date": date_str}, {"_id": 0})
    if existing:
        if isinstance(existing.get("created_at"), datetime):
            existing["created_at"] = existing["created_at"].isoformat()
        return existing
    current_day = 0
    if goal.get("started_at"):
        delta = datetime.now(timezone.utc) - goal["started_at"]
        current_day = min(delta.days + 1, goal["duration_days"])
    day_plan = next((d for d in goal.get("plan", []) if d["day"] == current_day), None)
    tasks_str = ", ".join(day_plan["tasks"]) if day_plan else "Review your progress"
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"daily-{uuid.uuid4()}",
            system_message="You are May, a warm AI habit coach. Write a brief motivating daily message (2-3 sentences). Be specific."
        ).with_model("gemini", "gemini-3-flash-preview")
        msg_text = await chat.send_message(UserMessage(text=f"Goal: {goal['title']}, Day {current_day}/{goal['duration_days']}, Streak: {goal.get('streak', 0)}, Today: {tasks_str}"))
    except Exception as e:
        logger.error(f"Daily message failed: {e}")
        msg_text = f"Day {current_day} of your {goal['title']} journey! Focus on today's tasks and keep the momentum going. You've got this! 🌟"
    now = datetime.now(timezone.utc)
    msg_doc = {"goal_id": goal_id, "user_id": user["id"], "message": msg_text, "date": date_str, "read": False, "created_at": now}
    await db.daily_messages.insert_one(msg_doc)
    msg_doc.pop("_id", None)
    msg_doc["created_at"] = now.isoformat()
    return msg_doc

# ============= SUBSCRIPTION ROUTES =============

@api_router.get("/subscription/plans")
async def get_plans():
    return SUBSCRIPTION_PLANS

@api_router.post("/subscription/checkout")
async def create_checkout(req: CheckoutRequest, request: Request):
    user = await get_current_user(request)
    if req.plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    plan = SUBSCRIPTION_PLANS[req.plan_id]
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    origin = req.origin_url or host_url
    success_url = f"{origin}/subscription?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/subscription"

    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    checkout_req = CheckoutSessionRequest(amount=float(plan["amount"]), currency=plan["currency"], success_url=success_url, cancel_url=cancel_url, metadata={"user_id": user["id"], "plan_id": req.plan_id, "plan_name": plan["name"]})
    session = await stripe_checkout.create_checkout_session(checkout_req)
    await db.payment_transactions.insert_one({"user_id": user["id"], "session_id": session.session_id, "amount": plan["amount"], "currency": plan["currency"], "plan_id": req.plan_id, "metadata": {"plan_name": plan["name"]}, "payment_status": "pending", "created_at": datetime.now(timezone.utc)})
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/subscription/status/{session_id}")
async def check_payment_status(session_id: str, request: Request):
    user = await get_current_user(request)
    tx = await db.payment_transactions.find_one({"session_id": session_id, "user_id": user["id"]})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    host_url = str(request.base_url).rstrip("/")
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{host_url}/api/webhook/stripe")
    status = await stripe_checkout.get_checkout_status(session_id)
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"payment_status": status.payment_status, "status": status.status}})
    if status.payment_status == "paid" and tx.get("payment_status") != "paid":
        plan = SUBSCRIPTION_PLANS.get(tx.get("plan_id", "monthly"), SUBSCRIPTION_PLANS["monthly"])
        expires_at = datetime.now(timezone.utc) + timedelta(days=plan["days"])
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"subscription": {"plan": tx.get("plan_id", "monthly"), "active": True, "started_at": datetime.now(timezone.utc).isoformat(), "expires_at": expires_at.isoformat()}, "role": "premium"}})
    return {"status": status.status, "payment_status": status.payment_status, "amount_total": status.amount_total, "currency": status.currency}

@api_router.get("/subscription/me")
async def get_subscription(request: Request):
    user = await get_current_user(request)
    user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    return user_doc.get("subscription", {"plan": "free", "active": False})

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url).rstrip("/")
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{host_url}/api/webhook/stripe")
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        if webhook_response.payment_status == "paid":
            tx = await db.payment_transactions.find_one({"session_id": webhook_response.session_id})
            if tx and tx.get("payment_status") != "paid":
                await db.payment_transactions.update_one({"session_id": webhook_response.session_id}, {"$set": {"payment_status": "paid"}})
                plan = SUBSCRIPTION_PLANS.get(tx.get("plan_id", "monthly"), SUBSCRIPTION_PLANS["monthly"])
                expires_at = datetime.now(timezone.utc) + timedelta(days=plan["days"])
                await db.users.update_one({"_id": ObjectId(tx["user_id"])}, {"$set": {"subscription": {"plan": tx.get("plan_id", "monthly"), "active": True, "started_at": datetime.now(timezone.utc).isoformat(), "expires_at": expires_at.isoformat()}, "role": "premium"}})
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ============= STARTUP =============

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.goals.create_index("user_id")
    await db.daily_progress.create_index([("goal_id", 1), ("user_id", 1), ("date", 1)])
    await db.chat_messages.create_index([("goal_id", 1), ("user_id", 1)])
    await db.daily_messages.create_index([("goal_id", 1), ("user_id", 1), ("date", 1)])
    await db.payment_transactions.create_index("session_id")
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@may.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({"name": "Admin", "email": admin_email, "password_hash": hash_password(admin_password), "role": "admin", "created_at": datetime.now(timezone.utc), "subscription": {"plan": "free", "active": False}})
        logger.info(f"Admin seeded: {admin_email}")
    Path("/app/memory").mkdir(exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n\n## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- POST /api/auth/guest\n- GET /api/auth/me\n")
    logger.info("May Habit Trainer API started!")

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
