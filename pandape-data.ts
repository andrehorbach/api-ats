import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const clientId = process.env.PANDAPE_CLIENT_ID ?? "";
const clientSecret = process.env.PANDAPE_CLIENT_SECRET ?? "";
const tokenUrl = 'https://login.pandape.com.br/connect/token';
const vacanciesUrl = 'https://api.pandape.com.br/v2/vacancies';
const matchesUrl = 'https://api.pandape.com.br/v2/matches';

interface Vacancy {
  idVacancy: string;
  [key: string]: any;
}

interface Match {
  IdVacancy: string;
  [key: string]: any;
}

async function getAccessToken(): Promise<string> {
  const response = await axios.post(tokenUrl, new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  }));
  return response.data.access_token;
}

async function fetchVacancies(accessToken: string): Promise<Vacancy[]> {
  let page = 1;
  const pageSize = 2;
  let allVacancies: Vacancy[] = [];

  while (page < 3) {
    const response = await axios.get(vacanciesUrl, {
      params: { Page: page, PageSize: pageSize },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = response.data;
    const vacancies = data.items;
    if (vacancies.length === 0) break;

    allVacancies = allVacancies.concat(vacancies);
    page++;
  }

  return allVacancies;
}

async function fetchMatchesForVacancy(accessToken: string, vacancyId: string, writeStream: fs.WriteStream): Promise<void> {
  let matchPage = 1;
  const matchPageSize = 10;

  while (true) {
    try {
      console.log(`Accessing Vacancy ${vacancyId}, Page ${matchPage}...`);
      const response = await axios.get(matchesUrl, {
        params: { IdVacancy: vacancyId, Page: matchPage, PageSize: matchPageSize },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const matches = response.data.items;
      if (!Array.isArray(matches) || matches.length === 0) break;

      for (const match of matches) {
        if (!match.idMatch) {
          console.error('Error: idMatch is undefined for match:', match);
          continue;
        }
        // Write each match to the file
        writeStream.write(JSON.stringify(match) + ',\n');
      }

      matchPage++;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response && error.response.data) {
        console.error('Error fetching matches:', error.response.data);
        break;
      } else {
        console.error('Unexpected error:', error);
        break;
      }
    }
  }
}

async function main() {
  try {
    const accessToken = await getAccessToken();

    // Fetch all vacancies
    const vacancies = await fetchVacancies(accessToken);
    fs.writeFileSync('pandape-jobs.json', JSON.stringify(vacancies, null, 2));
    
    const filePath = path.join(__dirname, 'pandape-applications.json');
    const tempFilePath = path.join(__dirname, 'pandape-applications-temp.json');

    // Initialize the JSON file with an empty array
    fs.writeFileSync(tempFilePath, '[\n', 'utf8');

    // Create a writable stream for pandape-applications-temp.json
    const writeStream = fs.createWriteStream(tempFilePath, { flags: 'a' }); // 'a' for append mode

    for (const vacancy of vacancies) {
      console.log(`Processing vacancy: ${vacancy.idVacancy}`);
      await fetchMatchesForVacancy(accessToken, vacancy.idVacancy, writeStream);
    }

    writeStream.end(']'); // Close the JSON array and the write stream

    writeStream.on('finish', () => {
      // Rename temp file to final file
      fs.renameSync(tempFilePath, filePath);
      console.log('Data saved successfully.');
    });

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error:', error.response ? error.response.data : error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

main();
