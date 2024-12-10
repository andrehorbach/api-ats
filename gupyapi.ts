import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GUPY_API_KEY;
const BEARER_TOKEN = apiKey
const API1_URL = 'https://api.gupy.io/api/v1/jobs';
const API2_BASE_URL = 'https://api.gupy.io/api/v1/jobs';

interface ApiResponse {
  results: any[]; // Adjust this based on the actual structure
}

async function fetchDataFromAPI1(): Promise<any[]> {
  const myHeaders = new Headers();
  myHeaders.append("Authorization", `Bearer ${BEARER_TOKEN}`);

  const requestOptions: RequestInit = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow'
  };

  try {
    const response = await fetch(API1_URL, requestOptions);
    const data = await response.json() as ApiResponse; // Type assertion here
    return data.results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching data from API1:', errorMessage);
    throw error;
  }
}

async function fetchDataFromAPI2(jobId: number): Promise<any[]> {
  const API2_URL = `${API2_BASE_URL}/${jobId}/applications`;

  const myHeaders = new Headers();
  myHeaders.append("Authorization", `Bearer ${BEARER_TOKEN}`);

  const requestOptions: RequestInit = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow'
  };

  try {
    const response = await fetch(API2_URL, requestOptions);
    const data = await response.json() as any[]; // Type assertion here
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error fetching data from API2 for jobId ${jobId}:`, errorMessage);
    throw error;
  }
}

async function main() {
  try {
    // Fetch data from API1
    const jobsData = await fetchDataFromAPI1();

    // Process data for each job
    const applicationsData: Array<{ job: any; applications: any }> = await Promise.all(
      jobsData.map(async (job) => {
        const applications = await fetchDataFromAPI2(job.id);
        return { job, applications };
      })
    );
    await saveDataToFile('output.json', applicationsData);
    console.log('Data saved to output.json');

  } catch (error: any) {
    console.error('An error occurred:', error.message);
  }
}
async function saveDataToFile(filename: string, data: any): Promise<void> {
  try {
    await fs.writeFile(filename, JSON.stringify(data, null, 2));
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
    console.error('Error saving data to file:', errorMessage);
    throw error;
  }
}
// Run the main function
main();
