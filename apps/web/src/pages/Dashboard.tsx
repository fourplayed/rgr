import React from 'react';

function Dashboard() {
  return (
    <div className="page">
      <h2>Dashboard</h2>
      <p>Welcome to your dashboard! You're now logged in.</p>
      <div className="features">
        <div className="feature-card">
          <h3>Analytics</h3>
          <p>View your key metrics and insights</p>
        </div>
        <div className="feature-card">
          <h3>Inventory</h3>
          <p>Manage your product catalog</p>
        </div>
        <div className="feature-card">
          <h3>Reports</h3>
          <p>Generate comprehensive reports</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
