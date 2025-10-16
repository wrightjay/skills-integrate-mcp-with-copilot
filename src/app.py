"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import json
from pathlib import Path
from typing import Optional

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Load activities from JSON file
def load_activities():
    activities_path = os.path.join(current_dir, "activities.json")
    with open(activities_path, "r") as f:
        return json.load(f)

# Load teachers from JSON file
def load_teachers():
    teachers_path = os.path.join(current_dir, "teachers.json")
    with open(teachers_path, "r") as f:
        return json.load(f)

# Save activities to JSON file
def save_activities(activities_data):
    activities_path = os.path.join(current_dir, "activities.json")
    with open(activities_path, "w") as f:
        json.dump(activities_data, f, indent=2)

# Initialize activities from file
activities = load_activities()
teachers_data = load_teachers()

# Verify teacher credentials
def verify_teacher(email: str, password: str) -> bool:
    return teachers_data.get("teachers", {}).get(email) == password


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities(category: Optional[str] = None, search: Optional[str] = None):
    """Get all activities with optional filtering"""
    filtered_activities = activities.copy()
    
    # Filter by category if provided
    if category:
        filtered_activities = {
            name: details for name, details in filtered_activities.items()
            if details.get("category") == category
        }
    
    # Filter by search term if provided
    if search:
        search_lower = search.lower()
        filtered_activities = {
            name: details for name, details in filtered_activities.items()
            if search_lower in name.lower() or search_lower in details.get("description", "").lower()
        }
    
    return filtered_activities


@app.post("/login")
def login(email: str, password: str):
    """Login endpoint for teachers"""
    if verify_teacher(email, password):
        return {"authenticated": True, "message": "Login successful"}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str, teacher_email: Optional[str] = None, teacher_password: Optional[str] = None):
    """Sign up a student for an activity - requires teacher authentication"""
    # Verify teacher authentication
    if not teacher_email or not teacher_password:
        raise HTTPException(status_code=401, detail="Teacher authentication required")
    
    if not verify_teacher(teacher_email, teacher_password):
        raise HTTPException(status_code=401, detail="Invalid teacher credentials")
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(email)
    save_activities(activities)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str, teacher_email: Optional[str] = None, teacher_password: Optional[str] = None):
    """Unregister a student from an activity - requires teacher authentication"""
    # Verify teacher authentication
    if not teacher_email or not teacher_password:
        raise HTTPException(status_code=401, detail="Teacher authentication required")
    
    if not verify_teacher(teacher_email, teacher_password):
        raise HTTPException(status_code=401, detail="Invalid teacher credentials")
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    save_activities(activities)
    return {"message": f"Unregistered {email} from {activity_name}"}
