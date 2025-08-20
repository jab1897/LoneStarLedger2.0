import os
import sys
from fastapi.testclient import TestClient

# Ensure the backend module can be imported when tests are executed from repository root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
import backend.main as m


def test_max_debt_zero_filters_properly():
    m.districts = [
        {"id": "1", "name": "District 1", "campuses": [], "per_pupil_spending": 100, "total_debt": 0},
        {"id": "2", "name": "District 2", "campuses": [], "per_pupil_spending": 100, "total_debt": 50},
    ]
    client = TestClient(m.app)
    response = client.get("/schools", params={"max_debt": 0})
    assert response.status_code == 200
    # Only the district with zero debt should be returned
    assert response.json() == [{"id": "1", "name": "District 1"}]
