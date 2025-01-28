import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';
import inquirer from 'inquirer';
import { log } from 'console';
dotenv.config();

const apiKey = process.env.GUPY_API_KEY;
const BEARER_TOKEN = apiKey
const TEMPLATES_API_URL = 'https://api.gupy.io/api/v1/';

async function fetchTemplatesData(templatesToRetrieve: string): Promise<any[]> {
  const myHeaders = new Headers();
  myHeaders.append("Authorization", `Bearer ${BEARER_TOKEN}`);

  const requestOptions: RequestInit = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow'
  };

  let templates: any[] = [];
  let currentPage = 1;
  let totalPages = 1;
  let fields = templatesToRetrieve === 'job-templates' ? 'fields=all&' : '' 

  // Pagination loop:
  do {
    const TEMPLATES_URL = `${TEMPLATES_API_URL}${templatesToRetrieve}?${fields}page=${currentPage}`;
    console.log(TEMPLATES_URL);
    
    try {
      const response = await fetch(TEMPLATES_URL, requestOptions);
      const data: any = await response.json();

      // Add jobs from current page to allJobs
      if (data) {
        templates = templates.concat(data.results);
      }
      totalPages = data.totalPages;
      currentPage++;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error fetching data from ${templatesToRetrieve} Templates API, page ${currentPage}:`, errorMessage);
      throw error;
    }
  } while (currentPage <= totalPages);
  
  return templates;
}

async function main() {

  const { templateType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'templateType',
      message: 'Which templates would you like to retrieve?',
      choices: ['Jobs', 'Emails'],
    },
  ]);

  const templatesToRetrieve = 
    templateType === 'Jobs' ? 'job-templates' : 'email-templates' 

  try {

    console.log(`Retrieving ${templateType} Templates...`);
    console.time('Total Requests Time');
    
    const templatesData = await fetchTemplatesData(templatesToRetrieve);
    
    console.log(`Finished retrieving ${templateType} Templates.`);
    console.timeEnd('Total Requests Time');
    
    await saveDataToFile(`gupy-${templatesToRetrieve}.json`, templatesData);

  } catch (error: any) {
    console.error('An error occurred:', error.message);
  }
  process.exit(0)
}

async function saveDataToFile(filename: string, data: any): Promise<void> {
  try {
    await fs.writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filename}`);
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
    console.error('Error saving data to file:', errorMessage);
    throw error;
  }
}

main();
