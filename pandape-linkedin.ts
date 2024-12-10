import axios from 'axios';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const clientId = process.env.PANDAPE_CLIENT_ID ?? "";
const clientSecret = process.env.PANDAPE_CLIENT_SECRET ?? "";
const tokenUrl = 'https://login.pandape.com.br/connect/token';
const vacanciesUrl = 'https://api.pandape.com.br/v2/vacancies';
const matchesUrl = 'https://api.pandape.com.br/v2/matches';

let vacancyCount = 1;

interface Vacancy {
  idVacancy: string;
  [key: string]: any;
}

interface Match {
  socialNetworks: { idSocialNetwork: number; url: string }[];
  idMatch: number;
  idCandidate: number;
  idVacancy: number;
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
  const pageSize = 1000;
  let allVacancies: Vacancy[] = [];

  while (true) {
    console.log(`Processing vacancy ${vacancyCount}...`)
    const response = await axios.get(vacanciesUrl, {
      params: { Page: page, PageSize: pageSize },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = response.data;
    const vacancies = data.items;
    if (vacancies.length === 0) break;

    allVacancies = allVacancies.concat(vacancies);
    page++;
    vacancyCount++;
  }

  return allVacancies;
}

async function fetchMatchesForVacancy(accessToken: string, vacancyId: string): Promise<Match[]> {
  let matchPage = 1;
  const matchPageSize = 1000;
  let allMatches: Match[] = [];

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
        // Extract only required fields
        const filteredMatch = {
          socialNetworks: match.socialNetworks,
          idMatch: match.idMatch,
          idCandidate: match.idCandidate,
          idVacancy: match.idVacancy,
        };
        // Only add the match if socialNetworks is not empty
        if (filteredMatch.socialNetworks && filteredMatch.socialNetworks.length > 0) {
          allMatches.push(filteredMatch);
        }
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

  return allMatches;
}

async function main() {
  try {
    const accessToken = await getAccessToken();

    // Fetch all vacancies
    const vacancies = await fetchVacancies(accessToken);
    //fs.writeFileSync('pandape-jobs.json', JSON.stringify(vacancies, null, 2));

    // Initialize array to store all matches
    let allMatches: Match[] = [];

    for (const vacancy of vacancies) {
     // console.log(`Processing vacancy: ${vacancy.idVacancy}`);
      const matches = await fetchMatchesForVacancy(accessToken, vacancy.idVacancy);
      allMatches = allMatches.concat(matches);
    }

    // Write all matches to pandape-applications.json file
    fs.writeFileSync('pandape-linkedins.json', JSON.stringify(allMatches, null, 2));
    console.log('Data saved successfully.');

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error:', error.response ? error.response.data : error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

main();
