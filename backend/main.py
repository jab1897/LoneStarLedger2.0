import json
from fastapi import FastAPI, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/")
def root():
    return {"message": "Welcome to LoneStarLedger API"}

try:
    with open('../data/data.json', 'r') as file:
        data = json.load(file)
    districts = data["districts"]
    geojson_dist = data.get("geojson_districts", {"type": "FeatureCollection", "features": []})
    geojson_camp = data.get("geojson_campuses", {"type": "FeatureCollection", "features": []})
except FileNotFoundError:
    districts = []
    geojson_dist = {"type": "FeatureCollection", "features": []}
    geojson_camp = {"type": "FeatureCollection", "features": []}
    print("Warning: data.json not found - using empty data")

# Load or create newsletter.json
try:
    with open('../data/newsletter.json', 'r') as file:
        newsletters = json.load(file)
except FileNotFoundError:
    newsletters = {"emails": []}

class SchoolSummary(BaseModel):
    id: str
    name: str

@app.get("/schools")
def get_schools(q: str = Query(None), min_spend: float = Query(None), max_debt: float = Query(None)):
    filtered = districts
    if q:
        filtered = [d for d in filtered if q.lower() in d["name"].lower() or any(q.lower() in c["name"].lower() for c in d["campuses"])]
    if min_spend:
        filtered = [d for d in filtered if d["per_pupil_spending"] >= min_spend]
    if max_debt:
        filtered = [d for d in filtered if d["total_debt"] <= max_debt]
    return [{"id": d["id"], "name": d["name"]} for d in filtered]

@app.get("/school/{id}")
def get_school(id: str):
    for d in districts:
        if d["id"] == id:
            return d
        for c in d["campuses"]:
            if c["id"] == id:
                return c
    return {"error": "School not found"}

@app.get("/summary")
def get_summary():
    total_spending = sum(d["spending"]["instruction"] + d["spending"]["administration"] + 
                         d["spending"]["operations"] + d["spending"]["other"] for d in districts)
    avg_per_pupil = sum(d["per_pupil_spending"] for d in districts) / len(districts) if districts else 0
    return {"total_spending": total_spending, "avg_per_pupil": avg_per_pupil, "district_count": len(districts)}

@app.get("/geojson_districts")
def get_geojson_dist():
    return geojson_dist

@app.get("/geojson_campuses")
def get_geojson_camp():
    return geojson_camp

@app.post("/newsletter")
def signup_newsletter(email: dict = Body(...)):
    newsletters["emails"].append(email["email"])
    with open('../data/newsletter.json', 'w') as f:
        json.dump(newsletters, f)
    return {"message": "Subscribed successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
