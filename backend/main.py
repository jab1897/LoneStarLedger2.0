import json
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Enable CORS for all origins (update later for production)
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
# Load sample data
with open('../data/sample_data.json', 'r') as file:
    data = json.load(file)
districts = data["districts"]
geojson = data["geojson"]

class SchoolSummary(BaseModel):
    id: str
    name: str

@app.get("/schools")
def get_schools(q: str = Query(None, description="Search query for school name")):
    # Simple search/filter for autofill-like (case-insensitive partial match)
    if q:
        filtered = [d for d in districts if q.lower() in d["name"].lower()]
    else:
        filtered = districts
    # Return list of summaries (id, name) for search results
    return [{"id": d["id"], "name": d["name"]} for d in filtered]

@app.get("/school/{id}")
def get_school(id: str):
    # Find district or campus by id (for now, assuming id is district; expand later for campuses)
    for d in districts:
        if d["id"] == id:
            return d
        for c in d["campuses"]:
            if c["id"] == id:
                return c
    return {"error": "School not found"}

@app.get("/summary")
def get_summary():
    # Aggregate stats example
    total_spending = sum(d["spending"]["instruction"] + d["spending"]["administration"] + 
                         d["spending"]["operations"] + d["spending"]["other"] for d in districts)
    avg_per_pupil = sum(d["per_pupil_spending"] for d in districts) / len(districts) if districts else 0
    return {"total_spending": total_spending, "avg_per_pupil": avg_per_pupil, "district_count": len(districts)}

@app.get("/geojson")
def get_geojson():
    return geojson

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
