import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

function App() {
  const [summary, setSummary] = useState(null);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [geoDist, setGeoDist] = useState(null);
  const [geoCamp, setGeoCamp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [minSpend, setMinSpend] = useState('');
  const [maxDebt, setMaxDebt] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetchSummary();
    fetchGeoDist();
    fetchGeoCamp();
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

  const fetchGeoDist = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/geojson_districts`);
      const data = await res.json();
      setGeoDist(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGeoCamp = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/geojson_campuses`);
      const data = await res.json();
      setGeoCamp(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSchools = async (inputValue) => {
    let url = `${BACKEND_URL}/schools?q=${inputValue}`;
    if (minSpend) url += `&min_spend=${minSpend}`;
    if (maxDebt) url += `&max_debt=${maxDebt}`;
    try {
      const res = await fetch(url);
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

  const handleSignup = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/newsletter`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email })
      });
      if (res.ok) alert('Subscribed!');
      setEmail('');
    } catch (err) {
      console.error(err);
    }
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
          <div className="filters">
            <input type="number" placeholder="Min Per Pupil Spend" value={minSpend} onChange={e => setMinSpend(e.target.value)} />
            <input type="number" placeholder="Max Total Debt" value={maxDebt} onChange={e => setMaxDebt(e.target.value)} />
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
            <MapContainer center={[31.9686, -99.9018]} zoom=6 style={{ height: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {geoDist && <GeoJSON data={geoDist} onEachFeature={(feature, layer) => {
                layer.on({ click: () => onMapClick(feature) });
              }} />}
              {geoCamp && <GeoJSON data={geoCamp} style={{color: '#FFD700'}} />}
            </MapContainer>
          </div>
          <div className={`drawer ${drawerOpen ? 'open' : ''}`}>
            <button onClick={() => setDrawerOpen(false)}>Close</button>
            {selectedSchool && (
              <>
                <h2>{selectedSchool.name}</h2>
                <p>Per Pupil Spending: ${selectedSchool.per_pupil_spending}</p>
                <p>Total Debt: ${selectedSchool.total_debt}</p>
                <p>Avg Teacher Salary: ${selectedSchool.avg_teacher_salary}</p>
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
                <h3>Campuses</h3>
                <ul>
                  {selectedSchool.campuses.map(c => (
                    <li key={c.id}>{c.name} - Reading: {c.reading_on_grade}%, Math: {c.math_on_grade}%</li>
                  ))}
                </ul>
                <div className="signup">
                  <input type="email" placeholder="Email for newsletter" value={email} onChange={e => setEmail(e.target.value)} />
                  <button onClick={handleSignup}>Subscribe</button>
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