import React, { useMemo } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement);

export default function AnalyticsDashboard({ historyData }) {
  // Compute Stats
  const stats = useMemo(() => {
    if (!historyData || historyData.length === 0) return { totalMeals: 0, avgCalories: 0, gradeDistribution: {}, mostFrequentGrade: 'N/A' };
    
    let totalCalories = 0;
    let grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    
    historyData.forEach(entry => {
      totalCalories += (entry.calories || 0);
      if (entry.health_grade) {
        const gradeLetter = entry.health_grade.charAt(0).toUpperCase();
        if (grades[gradeLetter] !== undefined) {
           grades[gradeLetter]++;
        }
      }
    });

    let maxGrade = 'N/A';
    let maxCount = -1;
    for (const [grade, count] of Object.entries(grades)) {
       if (count > maxCount && count > 0) {
          maxCount = count;
          maxGrade = grade;
       }
    }

    return {
       totalMeals: historyData.length,
       avgCalories: Math.round(totalCalories / historyData.length),
       gradeDistribution: grades,
       mostFrequentGrade: maxGrade
    };
  }, [historyData]);

  // Chart Data
  const lineChartData = useMemo(() => {
    // Reverse for chronological order (oldest to newest)
    const sortedData = [...(historyData || [])].reverse();
    return {
      labels: sortedData.map(entry => entry.date),
      datasets: [{
        label: 'Calories (kcal)',
        data: sortedData.map(entry => entry.calories || 0),
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        fill: true,
        tension: 0.4
      }]
    };
  }, [historyData]);

  const doughnutData = useMemo(() => {
    const data = [
      stats.gradeDistribution.A,
      stats.gradeDistribution.B,
      stats.gradeDistribution.C,
      stats.gradeDistribution.D,
      stats.gradeDistribution.F
    ];
    return {
      labels: ['A (Excellent)', 'B (Good)', 'C (Average)', 'D (Poor)', 'F (Fail)'],
      datasets: [{
        data: data,
        backgroundColor: ['#2ecc71', '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6'],
        borderWidth: 0
      }]
    };
  }, [stats]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#888' } }
    },
    scales: {
      x: { ticks: { color: '#888' }, grid: { color: 'rgba(150, 150, 150, 0.1)' } },
      y: { ticks: { color: '#888' }, grid: { color: 'rgba(150, 150, 150, 0.1)' } }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#888', padding: 10, boxWidth: 20 } }
    },
    cutout: '70%'
  };

  if (!historyData || historyData.length === 0) {
     return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No activity history found to build dashboard.</div>;
  }

  const hasGrades = Object.values(stats.gradeDistribution).some(v => v > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', marginTop: '20px' }}>
      
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-main)', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Meals</h4>
          <p style={{ margin: 0, fontSize: '2.5em', fontWeight: 'bold', color: '#3498db' }}>{stats.totalMeals}</p>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-main)', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px' }}>Avg Calories</h4>
          <p style={{ margin: 0, fontSize: '2.5em', fontWeight: 'bold', color: '#e67e22' }}>{stats.avgCalories}</p>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-main)', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px' }}>Top Grade</h4>
          <p style={{ margin: 0, fontSize: '2.5em', fontWeight: 'bold', color: '#2ecc71' }}>{stats.mostFrequentGrade}</p>
        </div>
      </div>

      {/* Charts Layout */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* Line Chart */}
        <div style={{ flex: '2 1 400px', minWidth: '0', background: 'var(--bg-card)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-main)' }}>
           <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-main)', fontSize: '1.2em' }}>Caloric Trend</h3>
           <div style={{ height: '350px', width: '100%' }}>
             <Line data={lineChartData} options={chartOptions} />
           </div>
        </div>

        {/* Doughnut Chart */}
        <div style={{ flex: '1 1 300px', minWidth: '0', background: 'var(--bg-card)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-main)' }}>
           <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-main)', fontSize: '1.2em', textAlign: 'center' }}>Diet Health Grades</h3>
           <div style={{ height: '350px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
             {hasGrades ? (
               <Doughnut data={doughnutData} options={doughnutOptions} />
             ) : (
               <p style={{ color: 'var(--text-muted)' }}>Log a meal to see your grade distribution.</p>
             )}
           </div>
        </div>

      </div>
    </div>
  );
}
