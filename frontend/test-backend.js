// Quick test to check backend connectivity
const testBackend = async () => {
  const apiUrl = 'https://bungomastudents.vercel.app';
  
  console.log('Testing backend connectivity...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${apiUrl}/api/health`);
    console.log('Health check status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Health data:', healthData);
    } else {
      const errorText = await healthResponse.text();
      console.log('Health error:', errorText);
    }
    
    // Test debug endpoint
    const debugResponse = await fetch(`${apiUrl}/api/debug`);
    console.log('Debug check status:', debugResponse.status);
    
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('Debug data:', debugData);
    }
    
  } catch (error) {
    console.error('Connection error:', error.message);
  }
};

testBackend();