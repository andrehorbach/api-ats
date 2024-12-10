import axios from 'axios';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

type Application = Object

async function fetchCandidates(apiUrl: string, apiKey: string): Promise<Application[]> {
    let applications: Application[] = [];
    let page = 1;

    while (true) {
        try {
            const response = await axios.get(apiUrl, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    page: page
                }
            });
            console.log(`starting page ${page}...`);

            if (response.data.length === 0) {
                break;
            }

            applications = applications.concat(response.data);
            page++;
        } catch (error) {
            console.error('Error retrieving candidates:', error);
            break;
        }
    }

    return applications;
}

async function saveToFile(data: Application[], filename: string) {
    try {
        await fs.promises.writeFile(filename, JSON.stringify(data, null, 2));
        console.log(`Data successfully saved to ${filename}`);
    } catch (error) {
        console.error('Error saving data to file:', error);
    }
}

async function main() {
    const apiUrl = 'https://harvest.greenhouse.io/v1/applications';
    const outputFile = 'greenhouse_applicants.json'; 
    const apiKey = process.env.GREENHOUSE_API_KEY ?? "";
    const applications = await fetchCandidates(apiUrl, apiKey);

    await saveToFile(applications, outputFile);
    console.log(`Total candidates: ${applications.length}`);
}

main();
