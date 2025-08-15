import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTable } from '@tanstack/react-table';  // Note: We'll use basic table for summaries; expand later

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

function App() {
  const [summary, setSummary] = useState(null);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
    fetchGeoJSON();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/summary`);
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeoJSON = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/geojson`);
      const data = await res.json();
      setGeoData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSchools = async (inputValue) => {
    try {
      const res = await fetch(`${BACKEND_URL}/schools?q=${inputValue}`);
      const data = await res.json();
      setSchools(data.map(s => ({ value: s.id, label: s.name })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelect = async (option) => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/school/${option.value}`);
      const data = await res.json();
      setSelectedSchool(data);
      setDrawerOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onMapClick = (feature) => {
    handleSelect({ value: feature.properties.id, label: feature.properties.name });
  };

  const spendingData = selectedSchool ? [
    { name: 'Instruction', value: selectedSchool.spending.instruction },
    { name: 'Administration', value: selectedSchool.spending.administration },
    { name: 'Operations', value: selectedSchool.spending.operations },
    { name: 'Other', value: selectedSchool.spending.other }
  ] : [];

  return (
    <div className="app">
      <header><h1>LoneStarLedger</h1></header>
      {loading ? <p>Loading...</p> : (
        <>
          <div className="summary">
            <h2>Summary Stats</h2>
            <table>
              <thead><tr><th>Metric</th><th>Value</th></tr></thead>
              <tbody>
                <tr><td>Total Spending</td><td>${summary.total_spending}</td></tr>
                <tr><td>Avg Per Pupil</td><td>${summary.avg_per_pupil}</td></tr>
                <tr><td>District Count</td><td>{summary.district_count}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="search-bar">
            <Select
              isSearchable
              options={schools}
              onInputChange={fetchSchools}
              onChange={handleSelect}
              placeholder="Search for a school..."
            />
          </div>
          <div className="map-container">
            <MapContainer center={[31.9686, -99.9018]} zoom={6} style={{ height: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {geoData && <GeoJSON data={geoData} onEachFeature={(feature, layer) => {
                layer.on({ click: () => onMapClick(feature) });
              }} />}
            </MapContainer>
          </div>
          <div className={`drawer ${drawerOpen ? 'open' : ''}`}>
            <button onClick={() => setDrawerOpen(false)}>Close</button>
            {selectedSchool && (
              <>
                <h2>{selectedSchool.name}</h2>
                <p>Per Pupil Spending: ${selectedSchool.per_pupil_spending}</p>
                <p>Total Debt: ${selectedSchool.total_debt}</p>
                <div className="chart-container">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={spendingData} dataKey="value" nameKey="name" fill="#003366" />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <ResponsiveContainer>
                    <BarChart data={spendingData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Bar dataKey="value" fill="#FFD700" />
                      <Tooltip />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;