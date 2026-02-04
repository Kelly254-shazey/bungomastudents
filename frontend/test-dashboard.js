// Test dashboard API with authentication
const testDashboard = async () => {
  const apiUrl = 'https://bungomastudents.vercel.app';
  
  console.log('Testing dashboard API...');
  
  try {
    // First test login
    const loginResponse = await fetch(`${apiUrl}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin', // Replace with actual username
        password: 'admin123' // Replace with actual password
      }),
    });
    
    console.log('Login status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('Login successful, token received');
      
      // Test dashboard with token
      const dashboardResponse = await fetch(`${apiUrl}/api/admin/dashboard`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
      });
      
      console.log('Dashboard status:', dashboardResponse.status);
      
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        console.log('Dashboard data:', dashboardData);
      } else {
        const errorText = await dashboardResponse.text();
        console.log('Dashboard error:', errorText);
      }
    } else {
      const errorText = await loginResponse.text();
      console.log('Login error:', errorText);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
};

testDashboard();